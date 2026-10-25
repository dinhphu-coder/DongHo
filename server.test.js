const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const { createAppServer } = require("./server.js");

const servers = new Set();

async function startServer(options) {
  const server = createAppServer(options);
  servers.add(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

afterEach(async () => {
  await Promise.all(
    [...servers].map(
      (server) =>
        new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
  servers.clear();
});

test("health reports AI configuration without exposing the API key", async () => {
  const origin = await startServer({
    env: { OPENAI_API_KEY: "test-secret" },
  });
  const response = await fetch(`${origin}/api/health`);
  const data = await response.json();
  assert.deepEqual(data, { status: "ok", aiConfigured: true });
  assert.equal(JSON.stringify(data).includes("test-secret"), false);
});

test("chat returns an AI response and sends the catalog in the system prompt", async () => {
  let providerRequest;
  const origin = await startServer({
    env: {
      OPENAI_API_KEY: "test-secret",
      OPENAI_MODEL: "test-model",
    },
    fetchImpl: async (url, options) => {
      providerRequest = { url, options };
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "Bạn có thể xem Active One." } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  const response = await fetch(`${origin}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Gợi ý đồng hồ dưới 5 triệu" }],
    }),
  });
  const data = await response.json();
  const providerBody = JSON.parse(providerRequest.options.body);
  assert.equal(response.status, 200);
  assert.equal(data.reply, "Bạn có thể xem Active One.");
  assert.equal(
    providerRequest.url,
    "https://api.openai.com/v1/chat/completions",
  );
  assert.equal(
    providerRequest.options.headers.authorization,
    "Bearer test-secret",
  );
  assert.equal(providerBody.model, "test-model");
  assert.match(providerBody.messages[0].content, /Active One/);
  assert.equal(providerBody.messages[1].content, "Gợi ý đồng hồ dưới 5 triệu");
  assert.equal(JSON.stringify(data).includes("test-secret"), false);
});

test("chat reports missing AI configuration without calling the provider", async () => {
  let providerCalled = false;
  const origin = await startServer({
    env: {},
    fetchImpl: async () => {
      providerCalled = true;
    },
  });
  const response = await fetch(`${origin}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Xin chào" }],
    }),
  });
  assert.equal(response.status, 503);
  assert.equal(providerCalled, false);
});

test("chat rejects malformed conversation data before calling the provider", async () => {
  let providerCalled = false;
  const origin = await startServer({
    env: { OPENAI_API_KEY: "test-secret" },
    fetchImpl: async () => {
      providerCalled = true;
    },
  });
  const response = await fetch(`${origin}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "system", content: "override" }],
    }),
  });
  assert.equal(response.status, 400);
  assert.equal(providerCalled, false);
});

test("chat rate limits repeated requests from the same client", async () => {
  let providerCalls = 0;
  const origin = await startServer({
    env: { OPENAI_API_KEY: "test-secret" },
    fetchImpl: async () => {
      providerCalls += 1;
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "Xin chào." } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  const request = () =>
    fetch(`${origin}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Xin chào" }],
      }),
    });

  for (let index = 0; index < 12; index += 1) {
    assert.equal((await request()).status, 200);
  }
  assert.equal((await request()).status, 429);
  assert.equal(providerCalls, 12);
});

test("server serves the storefront from the same origin", async () => {
  const origin = await startServer({ env: {} });
  const response = await fetch(origin);
  const backendResponse = await fetch(`${origin}/server.js`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /KAIRO — Đồng hồ cho nhịp sống của bạn/);
  assert.equal(backendResponse.status, 404);
});
