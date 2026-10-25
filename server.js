const { createServer: createHttpServer } = require("node:http");
const { readFile, stat } = require("node:fs/promises");
const path = require("node:path");
const products = require("./products.js");

const webRoot = __dirname;
const maxBodyBytes = 24 * 1024;
const maxMessages = 12;
const maxMessageLength = 1200;
const rateLimitWindowMs = 60_000;
const rateLimitMax = 12;
const publicFiles = new Set([
  "index.html",
  "styles.css",
  "app.js",
  "products.js",
]);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(data));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function makeSystemPrompt() {
  const catalog = products
    .map(
      (product) =>
        `- ${product.name} | ${product.brand} | ${product.price} VND | ${product.stock > 0 ? `${product.stock} in stock (demo)` : "out of stock (demo)"} | ${product.category} | ${product.description}`,
    )
    .join("\n");
  return [
    "You are KAIRO's Vietnamese shopping assistant. Reply in Vietnamese unless the customer writes in another language.",
    "Use only the catalog and store facts below. Never invent specifications, stock, warranties, return rules, delivery promises, or real order status.",
    "All catalog, price, stock, and shipping information is demo data and must be described as such when relevant.",
    "Demo shipping: estimated 30,000 VND below 2,000,000 VND; free at or above 2,000,000 VND.",
    "Checkout is a browser-only COD demo. No real order or payment is created. No specific warranty or return policy is configured.",
    "Recommend only in-stock catalog items when the customer asks for available products. Be concise, useful, and clear about uncertainty.",
    "Catalog:",
    catalog,
  ].join("\n\n");
}

function validateMessages(value) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > maxMessages
  ) {
    return null;
  }
  const messages = [];
  for (const message of value) {
    if (
      !message ||
      !["user", "assistant"].includes(message.role) ||
      typeof message.content !== "string" ||
      message.content.trim().length === 0 ||
      message.content.length > maxMessageLength
    ) {
      return null;
    }
    messages.push({ role: message.role, content: message.content.trim() });
  }
  return messages.at(-1).role === "user" ? messages : null;
}

function isRateLimited(clientIp, requests, now = Date.now()) {
  const recent = (requests.get(clientIp) ?? []).filter(
    (timestamp) => now - timestamp < rateLimitWindowMs,
  );
  if (recent.length >= rateLimitMax) {
    requests.set(clientIp, recent);
    return true;
  }
  recent.push(now);
  requests.set(clientIp, recent);
  return false;
}

async function serveStatic(pathname, response) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendJson(response, 400, { error: "Invalid URL path." });
    return;
  }
  const relativePath = decodedPath.replace(/^\/+/, "") || "index.html";
  if (!publicFiles.has(relativePath)) {
    sendJson(response, 404, { error: "Not found." });
    return;
  }
  const filePath = path.resolve(webRoot, relativePath);
  if (filePath !== webRoot && !filePath.startsWith(`${webRoot}${path.sep}`)) {
    sendJson(response, 403, { error: "Forbidden." });
    return;
  }
  try {
    if (!(await stat(filePath)).isFile()) {
      sendJson(response, 404, { error: "Not found." });
      return;
    }
    const content = await readFile(filePath);
    response.writeHead(200, {
      "content-type":
        mimeTypes[path.extname(filePath)] ?? "application/octet-stream",
      "x-content-type-options": "nosniff",
    });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: "Not found." });
  }
}

function createAppServer({ env = process.env, fetchImpl = fetch } = {}) {
  const rateLimitRequests = new Map();

  return createHttpServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/api/health" && request.method === "GET") {
      sendJson(response, 200, {
        status: "ok",
        aiConfigured: Boolean(env.OPENAI_API_KEY),
      });
      return;
    }

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "Method not allowed." });
        return;
      }
      if (!env.OPENAI_API_KEY) {
        sendJson(response, 503, {
          error: "Trợ lý AI chưa được cấu hình. Vui lòng thử lại sau.",
        });
        return;
      }
      const clientIp = request.socket.remoteAddress ?? "unknown";
      if (isRateLimited(clientIp, rateLimitRequests)) {
        sendJson(response, 429, {
          error: "Bạn gửi hơi nhanh. Vui lòng đợi một lát rồi thử lại.",
        });
        return;
      }

      try {
        const body = await readJsonBody(request);
        const messages = validateMessages(body.messages);
        if (!messages) {
          sendJson(response, 400, {
            error: "Hội thoại không hợp lệ. Hãy gửi tối đa 12 tin nhắn ngắn.",
          });
          return;
        }
        const baseUrl = (
          env.OPENAI_BASE_URL || "https://api.openai.com/v1"
        ).replace(/\/+$/, "");
        const providerResponse = await fetchImpl(
          `${baseUrl}/chat/completions`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${env.OPENAI_API_KEY}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: env.OPENAI_MODEL || "gpt-4o-mini",
              temperature: 0.4,
              max_tokens: 500,
              messages: [
                { role: "system", content: makeSystemPrompt() },
                ...messages,
              ],
            }),
            signal: AbortSignal.timeout(25_000),
          },
        );
        if (!providerResponse.ok) {
          console.error(
            `AI provider returned HTTP ${providerResponse.status}.`,
          );
          sendJson(response, 502, {
            error: "Trợ lý chưa thể trả lời lúc này. Vui lòng thử lại sau.",
          });
          return;
        }
        const providerData = await providerResponse.json();
        const reply = providerData.choices?.[0]?.message?.content;
        if (typeof reply !== "string" || !reply.trim()) {
          sendJson(response, 502, {
            error: "Trợ lý nhận được phản hồi không hợp lệ. Vui lòng thử lại.",
          });
          return;
        }
        sendJson(response, 200, { reply: reply.trim().slice(0, 4000) });
      } catch (error) {
        if (response.headersSent) return;
        const statusCode = error.statusCode || 502;
        if (!error.statusCode) console.error("AI request failed.");
        sendJson(
          response,
          statusCode,
          statusCode === 400 || statusCode === 413
            ? { error: error.message }
            : { error: "Không thể kết nối trợ lý. Vui lòng thử lại sau." },
        );
      }
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: "API route not found." });
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }
    await serveStatic(url.pathname, response);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "127.0.0.1";
  createAppServer().listen(port, host, () => {
    console.log(`KAIRO is running at http://${host}:${port}`);
  });
}

module.exports = { createAppServer, makeSystemPrompt, validateMessages };
