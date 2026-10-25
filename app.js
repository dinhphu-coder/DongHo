const products = window.PRODUCTS ?? [];
const cartKey = "kairo-demo-cart";
const priceRange = document.querySelector("#priceRange");
const priceStep = Number(priceRange.step);
const maxPrice =
  Math.ceil(
    Math.max(
      Number(priceRange.min),
      ...products.map((product) => product.price),
    ) / priceStep,
  ) * priceStep;
priceRange.max = String(maxPrice);
priceRange.value = String(maxPrice);
document.querySelector("#priceOutput").textContent =
  new Intl.NumberFormat("vi-VN").format(maxPrice) + "đ";
document.querySelector("#priceMaxLabel").textContent =
  new Intl.NumberFormat("vi-VN").format(maxPrice) + "đ";
const filters = {
  query: "",
  category: "all",
  brands: new Set(),
  maxPrice,
  inStock: false,
};
const grid = document.querySelector("#productGrid");
const toast = document.querySelector("#toast");
let cart = readCart();
let toastTimer;

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(cartKey) || "[]");
    return Array.isArray(value)
      ? value.filter(
          (line) =>
            products.some((product) => product.id === line.id) &&
            Number.isInteger(line.quantity) &&
            line.quantity > 0,
        )
      : [];
  } catch {
    return [];
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}

function visibleProducts() {
  const query = filters.query.trim().toLocaleLowerCase("vi");
  const result = products.filter((product) => {
    const matchesQuery =
      !query ||
      `${product.name} ${product.brand}`
        .toLocaleLowerCase("vi")
        .includes(query);
    return (
      matchesQuery &&
      (filters.category === "all" || product.category === filters.category) &&
      (!filters.brands.size || filters.brands.has(product.brand)) &&
      product.price <= filters.maxPrice &&
      (!filters.inStock || product.stock > 0)
    );
  });
  const sort = document.querySelector("#sortSelect").value;
  if (sort === "price-asc") result.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") result.sort((a, b) => b.price - a.price);
  if (sort === "newest")
    result.sort((a, b) => Number(b.isNew) - Number(a.isNew));
  if (sort === "popular") result.sort((a, b) => b.sold - a.sold);
  if (sort === "featured")
    result.sort((a, b) => Number(b.featured) - Number(a.featured));
  return result;
}

function renderProducts() {
  const visible = visibleProducts();
  document.querySelector("#resultCount").textContent =
    `${visible.length} sản phẩm`;
  document.querySelector("#emptyState").hidden = visible.length > 0;
  grid.innerHTML = visible
    .map(
      (product, index) => `
    <article class="product-card" style="--card-index:${index}">
      <button class="product-image-button" type="button" data-action="details" data-id="${product.id}" aria-label="Xem chi tiết ${escapeHtml(product.name)}">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)} của ${escapeHtml(product.brand)}, ảnh minh họa" loading="lazy" />
        ${product.isNew ? '<span class="product-tag">MỚI</span>' : ""}
        ${product.stock === 0 ? '<span class="sold-out-tag">HẾT HÀNG</span>' : ""}
        <span class="image-arrow" aria-hidden="true">↗</span>
      </button>
      <div class="product-meta"><span>${escapeHtml(product.brand)}</span><span class="rating">★ ${product.rating.toFixed(1)}</span></div>
      <button class="product-name" type="button" data-action="details" data-id="${product.id}">${escapeHtml(product.name)}</button>
      <div class="product-bottom"><div><strong>${formatPrice(product.price)}</strong><del>${formatPrice(product.originalPrice)}</del></div><button class="add-button" type="button" data-action="add" data-id="${product.id}" ${product.stock === 0 ? "disabled" : ""} aria-label="Thêm ${escapeHtml(product.name)} vào giỏ hàng">+</button></div>
    </article>`,
    )
    .join("");
}

function renderBrandFilters() {
  const brands = [...new Set(products.map((product) => product.brand))].sort();
  document.querySelector("#brandFilters").innerHTML = brands
    .map(
      (brand) =>
        `<label class="check-option"><input type="checkbox" value="${escapeHtml(brand)}" /><span>${escapeHtml(brand)}</span><small>${products.filter((product) => product.brand === brand).length}</small></label>`,
    )
    .join("");
}

function updateCartStorage() {
  localStorage.setItem(cartKey, JSON.stringify(cart));
  const count = cart.reduce((total, line) => total + line.quantity, 0);
  document.querySelector("#cartCount").textContent = count;
  document.querySelector("#cartHeadingCount").textContent = `(${count})`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function addToCart(id) {
  const product = products.find((item) => item.id === id);
  if (!product || product.stock < 1) return;
  const line = cart.find((item) => item.id === id);
  if (line && line.quantity >= product.stock)
    return showToast("Số lượng đã đạt mức tồn kho mẫu.");
  if (line) line.quantity += 1;
  else cart.push({ id, quantity: 1 });
  updateCartStorage();
  showToast(`Đã thêm ${product.name} vào giỏ hàng.`);
}

function renderDetails(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;
  document.querySelector("#detailContent").innerHTML =
    `<div class="detail-layout"><div class="detail-image"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}, ảnh minh họa" /></div><div class="detail-copy"><p class="eyebrow">${escapeHtml(product.brand)} · MÃ ${escapeHtml(product.id.toUpperCase())}</p><h2 id="detailTitle">${escapeHtml(product.name)}</h2><p class="detail-price">${formatPrice(product.price)} <del>${formatPrice(product.originalPrice)}</del></p><p class="detail-description">${escapeHtml(product.description)}</p><div class="detail-colors"><strong>Màu sắc minh họa</strong><p>${product.colors.map(escapeHtml).join(" · ")}</p></div><h3>Thông số tham khảo</h3><dl class="spec-list">${Object.entries(
      product.specifications,
    )
      .map(
        ([key, value]) =>
          `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`,
      )
      .join(
        "",
      )}</dl><p class="detail-disclaimer">Thông tin kỹ thuật, màu sắc và giá đều là dữ liệu minh họa, cần xác minh với nhà sản xuất trước khi bán.</p><button class="button button-dark detail-add" type="button" data-action="add" data-id="${product.id}" ${product.stock === 0 ? "disabled" : ""}>${product.stock ? "Thêm vào giỏ hàng" : "Hiện đã hết hàng"}<span aria-hidden="true">↗</span></button></div></div>`;
  document.querySelector("#detailDialog").showModal();
}

function renderCart() {
  const content = document.querySelector("#cartContent");
  if (!cart.length) {
    content.innerHTML =
      '<div class="cart-empty"><span>＋</span><h3>Giỏ hàng đang trống</h3><p>Chiếc đồng hồ tiếp theo của bạn có thể ở ngay đây.</p><button class="button button-outline" type="button" data-close="cartDialog">Tiếp tục khám phá</button></div>';
    return;
  }
  const subtotal = cart.reduce(
    (sum, line) =>
      sum +
      products.find((product) => product.id === line.id).price * line.quantity,
    0,
  );
  const shipping = subtotal >= 2000000 ? 0 : 30000;
  content.innerHTML = `<div class="cart-lines">${cart
    .map((line) => {
      const product = products.find((item) => item.id === line.id);
      return `<article class="cart-line"><img src="${escapeHtml(product.image)}" alt="" /><div class="cart-line-info"><span>${escapeHtml(product.brand)}</span><h3>${escapeHtml(product.name)}</h3><strong>${formatPrice(product.price)}</strong><div class="quantity-control"><button type="button" data-action="quantity" data-id="${product.id}" data-delta="-1" aria-label="Giảm số lượng">−</button><span>${line.quantity}</span><button type="button" data-action="quantity" data-id="${product.id}" data-delta="1" aria-label="Tăng số lượng" ${line.quantity >= product.stock ? "disabled" : ""}>+</button></div></div><button class="remove-line" type="button" data-action="remove" data-id="${product.id}">Xóa</button></article>`;
    })
    .join(
      "",
    )}</div><div class="cart-summary"><p><span>Tạm tính</span><strong>${formatPrice(subtotal)}</strong></p><p><span>Giao hàng <small>(ước tính)</small></span><strong>${shipping ? formatPrice(shipping) : "Miễn phí"}</strong></p><p class="cart-total"><span>Tổng thanh toán</span><strong>${formatPrice(subtotal + shipping)}</strong></p><button class="button button-dark checkout-button" type="button" id="startCheckout">Đặt hàng COD demo <span aria-hidden="true">↗</span></button><small class="demo-note">Đơn hàng chỉ được mô phỏng trên thiết bị này.</small></div>`;
}

function resetFilters() {
  filters.query = "";
  filters.category = "all";
  filters.brands.clear();
  filters.maxPrice = maxPrice;
  filters.inStock = false;
  document.querySelector("#searchInput").value = "";
  document.querySelector("#priceRange").value = String(maxPrice);
  document.querySelector("#inStockOnly").checked = false;
  document.querySelector("#sortSelect").value = "featured";
  document.querySelectorAll("#brandFilters input").forEach((input) => {
    input.checked = false;
  });
  document
    .querySelectorAll(".category-link")
    .forEach((button) =>
      button.classList.toggle("is-active", button.dataset.category === "all"),
    );
  document.querySelector("#priceOutput").textContent = formatPrice(maxPrice);
  renderProducts();
}

document.querySelector("#searchInput").addEventListener("input", (event) => {
  filters.query = event.target.value;
  renderProducts();
});
document
  .querySelector("#sortSelect")
  .addEventListener("change", renderProducts);
document.querySelector("#priceRange").addEventListener("input", (event) => {
  filters.maxPrice = Number(event.target.value);
  document.querySelector("#priceOutput").textContent = formatPrice(
    filters.maxPrice,
  );
  renderProducts();
});
document.querySelector("#inStockOnly").addEventListener("change", (event) => {
  filters.inStock = event.target.checked;
  renderProducts();
});
document.querySelector("#brandFilters").addEventListener("change", (event) => {
  if (event.target.matches("input")) {
    event.target.checked
      ? filters.brands.add(event.target.value)
      : filters.brands.delete(event.target.value);
    renderProducts();
  }
});
document.querySelectorAll(".category-link").forEach((button) =>
  button.addEventListener("click", () => {
    filters.category = button.dataset.category;
    document
      .querySelectorAll(".category-link")
      .forEach((item) => item.classList.toggle("is-active", item === button));
    renderProducts();
    document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
  }),
);
document.querySelector("#clearFilters").addEventListener("click", resetFilters);
document.querySelector("#emptyReset").addEventListener("click", resetFilters);
document.querySelector("#openCart").addEventListener("click", () => {
  renderCart();
  document.querySelector("#cartDialog").showModal();
});

document.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close]");
  if (closeButton)
    return document.querySelector(`#${closeButton.dataset.close}`).close();
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const { action, id } = actionButton.dataset;
  if (action === "details") renderDetails(id);
  if (action === "add") {
    addToCart(id);
    if (actionButton.closest("#detailDialog"))
      document.querySelector("#detailDialog").close();
  }
  if (action === "remove") {
    cart = cart.filter((line) => line.id !== id);
    updateCartStorage();
    renderCart();
  }
  if (action === "quantity") {
    const line = cart.find((item) => item.id === id);
    const product = products.find((item) => item.id === id);
    const quantity = line.quantity + Number(actionButton.dataset.delta);
    if (quantity < 1) cart = cart.filter((item) => item.id !== id);
    else if (quantity <= product.stock) line.quantity = quantity;
    else return;
    updateCartStorage();
    renderCart();
  }
  if (action === "checkout") startCheckout();
});

function startCheckout() {
  if (!cart.length) return;
  document.querySelector("#checkoutForm").hidden = false;
  document.querySelector("#orderSuccess").hidden = true;
  document.querySelector("#cartDialog").close();
  document.querySelector("#checkoutDialog").showModal();
}

document.addEventListener("click", (event) => {
  if (event.target.id === "startCheckout") startCheckout();
});
document.querySelector("#checkoutForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity() || !cart.length) return;
  const orderCode = `KR${Date.now().toString().slice(-7)}`;
  document.querySelector("#checkoutForm").hidden = true;
  const success = document.querySelector("#orderSuccess");
  success.innerHTML = `<span class="success-mark">✓</span><h3>Đã tạo đơn demo</h3><p>Mã đơn minh họa của bạn: <strong>${orderCode}</strong></p><p>Đây chỉ là trạng thái trên trình duyệt, chưa có đơn hàng thật được gửi đi.</p><button class="button button-dark" type="button" data-close="checkoutDialog">Hoàn tất</button>`;
  success.hidden = false;
  cart = [];
  updateCartStorage();
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "/" &&
    !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    event.preventDefault();
    document.querySelector("#searchInput").focus();
  }
});

const chatDialog = document.querySelector("#chatDialog");
const chatMessages = document.querySelector("#chatMessages");
const chatInput = document.querySelector("#chatInput");
const chatLauncher = document.querySelector("#openChat");
const chatStatus = document.querySelector("#chatStatus");
const chatHistory = [];
const chatSendButton = document.querySelector(
  "#chatForm button[type='submit']",
);
let chatAiAvailable = false;
let chatPending = false;

function normalizeChatText(value) {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function parseChatBudget(message) {
  const unitMatch = message.match(
    /(\d+(?:[.,]\d+)?)\s*(trieu|tr|m|nghin|ngan|k)\b/,
  );
  if (unitMatch) {
    const amount = Number(unitMatch[1].replace(",", "."));
    return amount * (/^(?:nghin|ngan|k)$/.test(unitMatch[2]) ? 1000 : 1000000);
  }
  const numericMatch = message.match(/\d[\d.,]*/);
  if (!numericMatch) return 0;
  const amount = Number(numericMatch[0].replace(/\D/g, ""));
  return amount >= 1000 ? amount : 0;
}

function addChatMessage(role, text, recommendedProducts = []) {
  const message = document.createElement("div");
  message.className = `chat-message ${role}`;
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  message.append(paragraph);

  if (recommendedProducts.length) {
    const productList = document.createElement("div");
    productList.className = "chat-products";
    recommendedProducts.forEach((product) => {
      const productButton = document.createElement("button");
      productButton.className = "chat-product-link";
      productButton.type = "button";
      productButton.dataset.chatProduct = product.id;
      const name = document.createElement("span");
      name.textContent = product.name;
      const price = document.createElement("span");
      price.textContent = formatPrice(product.price);
      productButton.append(name, price);
      productList.append(productButton);
    });
    message.append(productList);
  }

  chatMessages.append(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function answerChat(message) {
  const normalized = normalizeChatText(message);
  if (/giao hang|phi ship|van chuyen/.test(normalized)) {
    addChatMessage(
      "assistant",
      "Theo bản demo, đơn từ 2.000.000đ được miễn phí giao hàng; dưới mức này phí ước tính là 30.000đ. Thông tin cần xác nhận trước khi cửa hàng hoạt động.",
    );
    return;
  }
  if (/bao hanh|doi tra|hoan tien/.test(normalized)) {
    addChatMessage(
      "assistant",
      "Trang hiện chưa có chính sách bảo hành hoặc đổi trả cụ thể. Mình không muốn đoán thay cho cửa hàng; thông tin này cần được xác nhận trước khi mua.",
    );
    return;
  }
  if (/thanh toan|dat hang|don hang|cod/.test(normalized)) {
    addChatMessage(
      "assistant",
      "Trang hiện chỉ mô phỏng đặt hàng COD trên thiết bị này. Chưa có đơn hàng thật được gửi đi và chưa xử lý thanh toán.",
    );
    return;
  }

  const budget = parseChatBudget(normalized);
  if (budget) {
    const recommendations = products
      .filter((product) => product.stock > 0 && product.price <= budget)
      .sort((first, second) => second.price - first.price)
      .slice(0, 3);
    addChatMessage(
      "assistant",
      recommendations.length
        ? `Mình tìm được ${recommendations.length} lựa chọn còn hàng trong khoảng ${formatPrice(budget)}. Chạm vào sản phẩm để xem thông tin.`
        : `Mình chưa tìm thấy mẫu còn hàng trong khoảng ${formatPrice(budget)}. Bạn thử tăng ngân sách nhé.`,
      recommendations,
    );
    return;
  }

  const matchingProducts = products.filter((product) => {
    const productName = normalizeChatText(product.name);
    const brand = normalizeChatText(product.brand);
    return normalized.includes(productName) || normalized.includes(brand);
  });
  if (matchingProducts.length) {
    const recommendations = matchingProducts.slice(0, 3);
    const answer =
      matchingProducts.length === 1
        ? `${recommendations[0].name} có giá ${formatPrice(recommendations[0].price)}. ${recommendations[0].stock ? `Dữ liệu mẫu ghi nhận còn ${recommendations[0].stock} sản phẩm.` : "Dữ liệu mẫu ghi nhận hiện đã hết hàng."}`
        : `Mình tìm thấy ${matchingProducts.length} mẫu phù hợp. Chạm vào sản phẩm để xem giá và thông tin tồn kho.`;
    addChatMessage("assistant", answer, recommendations);
    return;
  }

  if (/con hang|ton kho|het hang/.test(normalized)) {
    const availableProducts = products
      .filter((product) => product.stock > 0)
      .slice(0, 3);
    addChatMessage(
      "assistant",
      "Tồn kho dưới đây chỉ là dữ liệu minh họa. Bạn có thể mở một mẫu để xem chi tiết:",
      availableProducts,
    );
    return;
  }

  addChatMessage(
    "assistant",
    "Mình có thể tra tên mẫu hoặc thương hiệu, giá và tồn kho, gợi ý theo ngân sách, cũng như thông tin giao hàng và đơn COD demo. Bạn muốn xem mục nào?",
  );
}

async function sendChatMessage(message) {
  const trimmedMessage = message.trim();
  if (!trimmedMessage || chatPending) return;
  document.querySelector("#chatSuggestions")?.remove();
  addChatMessage("user", trimmedMessage);
  if (!chatAiAvailable) {
    addChatMessage(
      "assistant",
      "AI chưa được cấu hình hoặc chưa kết nối. Mình sẽ tra cứu nhanh bằng dữ liệu có sẵn trên trang.",
    );
    answerChat(trimmedMessage);
    return;
  }
  const messages = [
    ...chatHistory.slice(-10),
    { role: "user", content: trimmedMessage },
  ];
  chatHistory.push({ role: "user", content: trimmedMessage });
  chatPending = true;
  chatInput.disabled = true;
  chatSendButton.disabled = true;
  chatStatus.textContent = "Đang chờ trợ lý AI...";
  const typingMessage = document.createElement("div");
  typingMessage.className = "chat-message assistant is-typing";
  typingMessage.textContent = "Đang soạn câu trả lời...";
  chatMessages.append(typingMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Trợ lý chưa thể trả lời.");
    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("Trợ lý nhận được phản hồi không hợp lệ.");
    }
    typingMessage.remove();
    addChatMessage("assistant", data.reply.trim());
    chatHistory.push({ role: "assistant", content: data.reply.trim() });
    chatStatus.textContent = "AI trực tuyến · dữ liệu catalog demo";
  } catch (error) {
    typingMessage.remove();
    chatHistory.length = 0;
    chatStatus.textContent = "AI chưa sẵn sàng · chế độ dự phòng";
    addChatMessage(
      "assistant",
      `${error.message} Mình sẽ thử tra cứu nhanh bằng dữ liệu có sẵn trên trang.`,
    );
    answerChat(trimmedMessage);
  } finally {
    chatPending = false;
    chatInput.disabled = false;
    chatSendButton.disabled = false;
    if (chatDialog.open) chatInput.focus();
  }
}

async function checkChatAvailability() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("Backend unavailable.");
    const data = await response.json();
    chatAiAvailable = Boolean(data.aiConfigured);
    chatStatus.textContent = data.aiConfigured
      ? "AI trực tuyến · dữ liệu catalog demo"
      : "Chưa cấu hình AI · chế độ demo";
  } catch {
    chatAiAvailable = false;
    chatStatus.textContent = "Chưa kết nối backend · chế độ demo";
  }
}

chatLauncher.addEventListener("click", () => {
  if (chatDialog.open) {
    chatDialog.close();
    return;
  }
  chatDialog.show();
  chatLauncher.setAttribute("aria-expanded", "true");
  chatInput.focus();
});
chatDialog.addEventListener("close", () => {
  chatLauncher.setAttribute("aria-expanded", "false");
});
document.querySelector("#closeChat").addEventListener("click", () => {
  chatDialog.close();
});
document.querySelector("#chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const message = chatInput.value;
  chatInput.value = "";
  sendChatMessage(message);
});
chatMessages.addEventListener("click", (event) => {
  const promptButton = event.target.closest("[data-chat-prompt]");
  if (promptButton) {
    sendChatMessage(promptButton.dataset.chatPrompt);
    return;
  }
  const productButton = event.target.closest("[data-chat-product]");
  if (productButton) renderDetails(productButton.dataset.chatProduct);
});

renderBrandFilters();
renderProducts();
updateCartStorage();
checkChatAvailability();
