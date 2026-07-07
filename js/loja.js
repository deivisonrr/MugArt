/* ==========================================================
   MugArt Loja - Front-end
   Arquivo: js/loja.js
========================================================== */

var MUGART_CONFIG = {
  whatsapp: "5511988849236",
  currency: "BRL",
  locale: "pt-BR",
  storageKeys: {
    cart: "mugart_cart",
    favorites: "mugart_favorites",
    customer: "mugart_customer"
  }
};

var PRODUCTS = [
  {
    id: "caneca-comum-branca-001",
    sku: "MC-COM-BRANCA-001",
    name: "Caneca Branca Personalizada",
    category: "Caneca Comum",
    color: "Branca",
    price: 29.90,
    oldPrice: 39.90,
    stock: 12,
    image: "assets/caneca-branca.png",
    images: ["assets/caneca-branca.png"],
    description: "Caneca branca pronta entrega, ideal para presentes personalizados, lembranças e uso diário.",
    specs: {
      capacidade: "325ml",
      material: "Cerâmica",
      acabamento: "Brilhante",
      personalizacao: "Sublimação"
    },
    tags: ["pronta entrega", "branca", "presente"],
    active: true,
    featured: true
  },
  {
    id: "caneca-magica-001",
    sku: "MC-MAG-PRETA-001",
    name: "Caneca Mágica",
    category: "Caneca Mágica",
    color: "Preta",
    price: 49.90,
    oldPrice: 59.90,
    stock: 6,
    image: "assets/caneca_magica.png",
    images: ["assets/caneca_magica.png"],
    description: "Caneca mágica preta que revela a arte ao entrar em contato com líquido quente.",
    specs: {
      capacidade: "325ml",
      material: "Cerâmica",
      acabamento: "Termossensível",
      personalizacao: "Sublimação"
    },
    tags: ["mágica", "preta", "presente especial"],
    active: true,
    featured: true
  },
  {
    id: "caneca-coracao-vermelha-001",
    sku: "MC-COR-VERM-001",
    name: "Caneca Coração Vermelha",
    category: "Caneca Coração",
    color: "Vermelha",
    price: 44.90,
    oldPrice: 54.90,
    stock: 8,
    image: "assets/caneca_coracao_vermelho.jpeg",
    images: ["assets/caneca_coracao_vermelho.jpeg"],
    description: "Caneca com alça em formato de coração, perfeita para datas românticas e presentes especiais.",
    specs: {
      capacidade: "325ml",
      material: "Cerâmica",
      acabamento: "Brilhante",
      personalizacao: "Sublimação"
    },
    tags: ["coração", "vermelha", "romântica"],
    active: true,
    featured: true
  },
  {
    id: "caneca-coracao-azul-001",
    sku: "MC-COR-AZUL-001",
    name: "Caneca Coração Azul",
    category: "Caneca Coração",
    color: "Azul",
    price: 44.90,
    oldPrice: 54.90,
    stock: 5,
    image: "assets/caneca_coracao_azul.jpeg",
    images: ["assets/caneca_coracao_azul.jpeg"],
    description: "Modelo delicado com alça coração azul, pronto para personalização.",
    specs: {
      capacidade: "325ml",
      material: "Cerâmica",
      acabamento: "Brilhante",
      personalizacao: "Sublimação"
    },
    tags: ["coração", "azul", "presente"],
    active: true,
    featured: false
  },
  {
    id: "caneca-comum-roxa-001",
    sku: "MC-COM-ROXA-001",
    name: "Caneca Comum Roxa",
    category: "Caneca Comum",
    color: "Roxa",
    price: 34.90,
    oldPrice: 44.90,
    stock: 10,
    image: "assets/caneca_comum_roxo.png",
    images: ["assets/caneca_comum_roxo.png"],
    description: "Caneca comum com interior e alça roxa, moderna e criativa.",
    specs: {
      capacidade: "325ml",
      material: "Cerâmica",
      acabamento: "Brilhante",
      personalizacao: "Sublimação"
    },
    tags: ["roxa", "colorida", "pronta entrega"],
    active: true,
    featured: false
  },
  {
    id: "caneca-comum-verde-001",
    sku: "MC-COM-VERDE-001",
    name: "Caneca Comum Verde",
    category: "Caneca Comum",
    color: "Verde",
    price: 34.90,
    oldPrice: 44.90,
    stock: 9,
    image: "assets/caneca_comum_verde.png",
    images: ["assets/caneca_comum_verde.png"],
    description: "Caneca comum com interior e alça verde, pronta para personalizar.",
    specs: {
      capacidade: "325ml",
      material: "Cerâmica",
      acabamento: "Brilhante",
      personalizacao: "Sublimação"
    },
    tags: ["verde", "colorida", "pronta entrega"],
    active: true,
    featured: false
  },
  {
    id: "caneca-comum-laranja-001",
    sku: "MC-COM-LARANJA-001",
    name: "Caneca Comum Laranja",
    category: "Caneca Comum",
    color: "Laranja",
    price: 34.90,
    oldPrice: 44.90,
    stock: 7,
    image: "assets/caneca_comum_laranja.png",
    images: ["assets/caneca_comum_laranja.png"],
    description: "Caneca comum laranja, divertida, vibrante e perfeita para artes criativas.",
    specs: {
      capacidade: "325ml",
      material: "Cerâmica",
      acabamento: "Brilhante",
      personalizacao: "Sublimação"
    },
    tags: ["laranja", "colorida", "criativa"],
    active: true,
    featured: false
  },
  {
    id: "caneca-comum-amarela-001",
    sku: "MC-COM-AMARELA-001",
    name: "Caneca Comum Amarela",
    category: "Caneca Comum",
    color: "Amarela",
    price: 34.90,
    oldPrice: 44.90,
    stock: 11,
    image: "assets/caneca_comum_amarelo.png",
    images: ["assets/caneca_comum_amarelo.png"],
    description: "Caneca comum amarela, alegre e ideal para presentes personalizados.",
    specs: {
      capacidade: "325ml",
      material: "Cerâmica",
      acabamento: "Brilhante",
      personalizacao: "Sublimação"
    },
    tags: ["amarela", "colorida", "alegre"],
    active: true,
    featured: false
  },
  {
    id: "caneca-comum-vermelha-001",
    sku: "MC-COM-VERMELHA-001",
    name: "Caneca Comum Vermelha",
    category: "Caneca Comum",
    color: "Vermelha",
    price: 34.90,
    oldPrice: 44.90,
    stock: 4,
    image: "assets/caneca_comum_vermelho.png",
    images: ["assets/caneca_comum_vermelho.png"],
    description: "Caneca comum vermelha, marcante e perfeita para datas especiais.",
    specs: {
      capacidade: "325ml",
      material: "Cerâmica",
      acabamento: "Brilhante",
      personalizacao: "Sublimação"
    },
    tags: ["vermelha", "colorida", "presente"],
    active: true,
    featured: false
  }
];

var StoreState = {
  products: PRODUCTS.filter(function(product) { return product.active; }),
  cart: [],
  favorites: [],
  filters: {
    search: "",
    category: "todos",
    color: "todos",
    sort: "featured"
  },
  selectedProduct: null
};

function $(selector) { return document.querySelector(selector); }
function $all(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }

function formatMoney(value) {
  return new Intl.NumberFormat(MUGART_CONFIG.locale, {
    style: "currency",
    currency: MUGART_CONFIG.currency
  }).format(value || 0);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadFromStorage(key, fallback) {
  try {
    var saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.warn("Erro ao ler localStorage:", error);
    return fallback;
  }
}

function pushDataLayer(payload) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

function showToast(message, type) {
  var toast = $(".mugart-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "mugart-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.dataset.type = type || "success";
  toast.classList.add("show");

  setTimeout(function() {
    toast.classList.remove("show");
  }, 2800);
}

function createElementFromHTML(html) {
  var template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

document.addEventListener("DOMContentLoaded", function() {
  restoreState();
  createBaseUIIfMissing();
  bindHeader();
  bindFilters();
  bindCartActions();
  renderCategories();
  renderColors();
  renderProducts();
  renderCart();
  updateCounters();

  pushDataLayer({
    event: "view_store",
    page_title: document.title,
    page_location: window.location.href,
    products_count: StoreState.products.length
  });
});

function restoreState() {
  StoreState.cart = loadFromStorage(MUGART_CONFIG.storageKeys.cart, []);
  StoreState.favorites = loadFromStorage(MUGART_CONFIG.storageKeys.favorites, []);
}

function createBaseUIIfMissing() {
  if (!$(".cart-drawer")) {
    document.body.appendChild(createElementFromHTML(
      '<aside class="cart-drawer" id="cartDrawer">' +
        '<div class="cart-header">' +
          '<div><span class="cart-label">Seu carrinho</span><h3>Produtos selecionados</h3></div>' +
          '<button class="cart-close" id="cartClose" type="button">×</button>' +
        '</div>' +
        '<div class="cart-items" id="cartItems"></div>' +
        '<div class="cart-footer">' +
          '<div class="cart-summary-line"><span>Subtotal</span><strong id="cartSubtotal">R$ 0,00</strong></div>' +
          '<div class="cart-summary-line"><span>Frete</span><strong>A calcular</strong></div>' +
          '<button class="checkout-btn" id="checkoutBtn" type="button">Finalizar compra</button>' +
          '<button class="whatsapp-cart-btn" id="sendCartWhatsapp" type="button">Tirar dúvida pelo WhatsApp</button>' +
        '</div>' +
      '</aside>'
    ));
  }

  if (!$(".drawer-overlay")) {
    document.body.appendChild(createElementFromHTML('<div class="drawer-overlay" id="drawerOverlay"></div>'));
  }

  if (!$(".product-modal")) {
    document.body.appendChild(createElementFromHTML(
      '<div class="product-modal" id="productModal" aria-hidden="true">' +
        '<div class="product-modal-card">' +
          '<button class="modal-close" id="modalClose" type="button">×</button>' +
          '<div id="modalContent"></div>' +
        '</div>' +
      '</div>'
    ));
  }

  if (!$(".checkout-modal")) {
    document.body.appendChild(createElementFromHTML(
      '<div class="checkout-modal" id="checkoutModal" aria-hidden="true">' +
        '<div class="checkout-card">' +
          '<button class="modal-close" id="checkoutClose" type="button">×</button>' +
          '<h2>Finalizar compra</h2>' +
          '<p class="checkout-subtitle">Pagamento real será conectado no backend com Mercado Pago.</p>' +
          '<form id="checkoutForm" class="checkout-form">' +
            '<div class="checkout-grid">' +
              '<label>Nome completo<input name="name" required placeholder="Seu nome" /></label>' +
              '<label>WhatsApp<input name="phone" required placeholder="(11) 99999-9999" /></label>' +
              '<label>E-mail<input name="email" type="email" required placeholder="seuemail@email.com" /></label>' +
              '<label>CEP<input name="zip" required placeholder="00000-000" /></label>' +
              '<label class="full">Endereço<input name="address" required placeholder="Rua, número, complemento" /></label>' +
              '<label>Cidade<input name="city" required placeholder="São Paulo" /></label>' +
              '<label>Estado<input name="state" required placeholder="SP" /></label>' +
            '</div>' +
            '<div class="payment-options">' +
              '<label><input type="radio" name="payment" value="pix" checked /> Pix</label>' +
              '<label><input type="radio" name="payment" value="credit_card" /> Cartão de crédito</label>' +
              '<label><input type="radio" name="payment" value="debit_card" /> Cartão de débito</label>' +
            '</div>' +
            '<div class="checkout-total"><span>Total do pedido</span><strong id="checkoutTotal">R$ 0,00</strong></div>' +
            '<button class="checkout-submit" type="submit">Gerar pedido</button>' +
          '</form>' +
        '</div>' +
      '</div>'
    ));
  }
}

function bindHeader() {
  var menuToggle = $("#menuToggle");
  var nav = $("#nav");

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", function() {
      nav.classList.toggle("open");
    });
  }

  $all("[data-open-cart], #openCart, .open-cart").forEach(function(button) {
    button.addEventListener("click", openCart);
  });

  var cartClose = $("#cartClose");
  var overlay = $("#drawerOverlay");

  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (overlay) overlay.addEventListener("click", function() {
    closeCart();
    closeProductModal();
    closeCheckout();
  });
}

function bindFilters() {
  var searchInput = $("#storeSearch");
  var categorySelect = $("#categoryFilter");
  var colorSelect = $("#colorFilter");
  var sortSelect = $("#sortFilter");
  var clearFilters = $("#clearFilters");

  if (searchInput) {
    searchInput.addEventListener("input", function(event) {
      StoreState.filters.search = event.target.value;
      renderProducts();
      pushDataLayer({ event: "store_search", search_term: event.target.value });
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", function(event) {
      StoreState.filters.category = event.target.value;
      renderProducts();
    });
  }

  if (colorSelect) {
    colorSelect.addEventListener("change", function(event) {
      StoreState.filters.color = event.target.value;
      renderProducts();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", function(event) {
      StoreState.filters.sort = event.target.value;
      renderProducts();
    });
  }

  if (clearFilters) {
    clearFilters.addEventListener("click", function() {
      StoreState.filters = { search: "", category: "todos", color: "todos", sort: "featured" };
      if (searchInput) searchInput.value = "";
      if (categorySelect) categorySelect.value = "todos";
      if (colorSelect) colorSelect.value = "todos";
      if (sortSelect) sortSelect.value = "featured";
      renderCategories();
      renderProducts();
    });
  }
}

function renderCategories() {
  var categorySelect = $("#categoryFilter");
  var categoryList = $("#categoryList");
  var map = {};
  var categories = ["todos"];

  StoreState.products.forEach(function(product) {
    map[product.category] = true;
  });

  Object.keys(map).forEach(function(category) {
    categories.push(category);
  });

  if (categorySelect) {
    categorySelect.innerHTML = categories.map(function(category) {
      var label = category === "todos" ? "Todas as categorias" : category;
      return '<option value="' + category + '">' + label + '</option>';
    }).join("");
    categorySelect.value = StoreState.filters.category;
  }

  if (categoryList) {
    categoryList.innerHTML = categories.map(function(category) {
      var label = category === "todos" ? "Todas" : category;
      var active = category === StoreState.filters.category ? "active" : "";
      return '<button class="category-chip ' + active + '" type="button" data-category="' + category + '">' + label + '</button>';
    }).join("");

    $all(".category-chip").forEach(function(button) {
      button.addEventListener("click", function() {
        StoreState.filters.category = button.dataset.category;
        if (categorySelect) categorySelect.value = StoreState.filters.category;
        renderCategories();
        renderProducts();
      });
    });
  }
}

function renderColors() {
  var colorSelect = $("#colorFilter");
  var map = {};
  var colors = ["todos"];

  StoreState.products.forEach(function(product) {
    map[product.color] = true;
  });

  Object.keys(map).forEach(function(color) {
    colors.push(color);
  });

  if (colorSelect) {
    colorSelect.innerHTML = colors.map(function(color) {
      var label = color === "todos" ? "Todas as cores" : color;
      return '<option value="' + color + '">' + label + '</option>';
    }).join("");
  }
}

function getFilteredProducts() {
  var search = StoreState.filters.search;
  var category = StoreState.filters.category;
  var color = StoreState.filters.color;
  var sort = StoreState.filters.sort;
  var searchTerm = normalizeText(search);

  var products = StoreState.products.filter(function(product) {
    var matchesSearch =
      !searchTerm ||
      normalizeText(product.name).indexOf(searchTerm) >= 0 ||
      normalizeText(product.description).indexOf(searchTerm) >= 0 ||
      normalizeText(product.category).indexOf(searchTerm) >= 0 ||
      normalizeText(product.color).indexOf(searchTerm) >= 0 ||
      product.tags.some(function(tag) { return normalizeText(tag).indexOf(searchTerm) >= 0; });

    var matchesCategory = category === "todos" || product.category === category;
    var matchesColor = color === "todos" || product.color === color;

    return matchesSearch && matchesCategory && matchesColor;
  });

  products.sort(function(a, b) {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "name_asc") return a.name.localeCompare(b.name);
    if (sort === "stock_desc") return b.stock - a.stock;
    return Number(b.featured) - Number(a.featured);
  });

  return products;
}

function renderProducts() {
  var grid = $("#productsGrid") || $("#storeProducts") || $(".products-grid");
  var count = $("#productsCount");

  if (!grid) return;

  var products = getFilteredProducts();

  if (count) count.textContent = products.length + " produto" + (products.length === 1 ? "" : "s");

  if (!products.length) {
    grid.innerHTML = '<div class="empty-products"><h3>Nenhuma caneca encontrada</h3><p>Tente limpar os filtros ou buscar outro modelo.</p></div>';
    return;
  }

  grid.innerHTML = products.map(productCardTemplate).join("");
  bindProductCards();
}

function productCardTemplate(product) {
  var isFavorite = StoreState.favorites.indexOf(product.id) >= 0;
  var discount = product.oldPrice && product.oldPrice > product.price
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return '' +
    '<article class="store-product-card" data-product-id="' + product.id + '">' +
      '<button class="favorite-btn ' + (isFavorite ? "active" : "") + '" type="button" data-action="favorite" aria-label="Favoritar produto">' + (isFavorite ? "♥" : "♡") + '</button>' +
      (discount ? '<span class="discount-badge">-' + discount + '%</span>' : '') +
      '<button class="product-image-btn" type="button" data-action="view">' +
        '<img src="' + product.image + '" alt="' + product.name + '" loading="lazy" />' +
      '</button>' +
      '<div class="product-info">' +
        '<span class="product-category">' + product.category + '</span>' +
        '<h3>' + product.name + '</h3>' +
        '<p>' + product.description + '</p>' +
        '<div class="product-meta"><span>' + product.color + '</span><span>' + (product.stock > 0 ? product.stock + " em estoque" : "Esgotado") + '</span></div>' +
        '<div class="product-price"><strong>' + formatMoney(product.price) + '</strong>' + (product.oldPrice ? '<small>' + formatMoney(product.oldPrice) + '</small>' : '') + '</div>' +
        '<div class="product-actions">' +
          '<button class="details-btn" type="button" data-action="view">Detalhes</button>' +
          '<button class="add-cart-btn" type="button" data-action="add" ' + (product.stock <= 0 ? "disabled" : "") + '>' + (product.stock > 0 ? "Adicionar" : "Esgotado") + '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
}

function bindProductCards() {
  $all(".store-product-card").forEach(function(card) {
    var productId = card.dataset.productId;

    card.querySelectorAll("[data-action]").forEach(function(button) {
      button.addEventListener("click", function(event) {
        event.stopPropagation();
        var action = button.dataset.action;
        if (action === "add") addToCart(productId);
        if (action === "view") openProductModal(productId);
        if (action === "favorite") toggleFavorite(productId);
      });
    });

    card.addEventListener("click", function() {
      openProductModal(productId);
    });
  });
}

function getProductById(productId) {
  return StoreState.products.find(function(product) { return product.id === productId; });
}

function openProductModal(productId) {
  var product = getProductById(productId);
  var modal = $("#productModal");
  var content = $("#modalContent");

  if (!product || !modal || !content) return;

  StoreState.selectedProduct = product;

  content.innerHTML =
    '<div class="modal-product">' +
      '<div class="modal-product-image"><img src="' + product.image + '" alt="' + product.name + '" /></div>' +
      '<div class="modal-product-info">' +
        '<span class="product-category">' + product.category + '</span>' +
        '<h2>' + product.name + '</h2>' +
        '<p>' + product.description + '</p>' +
        '<div class="modal-price"><strong>' + formatMoney(product.price) + '</strong>' + (product.oldPrice ? '<small>' + formatMoney(product.oldPrice) + '</small>' : '') + '</div>' +
        '<div class="modal-stock ' + (product.stock <= 3 ? "low" : "") + '">' + (product.stock > 0 ? product.stock + " unidade(s) disponível(is)" : "Produto esgotado") + '</div>' +
        '<div class="modal-specs">' +
          Object.keys(product.specs).map(function(key) {
            return '<div><span>' + key + '</span><strong>' + product.specs[key] + '</strong></div>';
          }).join("") +
        '</div>' +
        '<div class="modal-actions">' +
          '<button class="add-cart-btn" id="modalAddCart" type="button" ' + (product.stock <= 0 ? "disabled" : "") + '>Adicionar ao carrinho</button>' +
          '<button class="whatsapp-product-btn" id="modalWhatsapp" type="button">Consultar no WhatsApp</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  $("#modalClose").addEventListener("click", closeProductModal);
  $("#modalAddCart").addEventListener("click", function() { addToCart(product.id); });
  $("#modalWhatsapp").addEventListener("click", function() { sendProductToWhatsapp(product.id); });

  pushDataLayer({
    event: "view_item",
    ecommerce: {
      currency: MUGART_CONFIG.currency,
      value: product.price,
      items: [ga4Item(product)]
    }
  });
}

function closeProductModal() {
  var modal = $("#productModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function toggleFavorite(productId) {
  var product = getProductById(productId);
  if (!product) return;

  var exists = StoreState.favorites.indexOf(productId) >= 0;

  if (exists) {
    StoreState.favorites = StoreState.favorites.filter(function(id) { return id !== productId; });
    showToast("Produto removido dos favoritos.", "info");
  } else {
    StoreState.favorites.push(productId);
    showToast("Produto adicionado aos favoritos.");
  }

  saveToStorage(MUGART_CONFIG.storageKeys.favorites, StoreState.favorites);
  renderProducts();
  updateCounters();

  pushDataLayer({
    event: exists ? "remove_from_wishlist" : "add_to_wishlist",
    ecommerce: {
      currency: MUGART_CONFIG.currency,
      value: product.price,
      items: [ga4Item(product)]
    }
  });
}

function addToCart(productId, quantity) {
  var product = getProductById(productId);
  quantity = quantity || 1;

  if (!product || product.stock <= 0) return;

  var existing = StoreState.cart.find(function(item) { return item.productId === productId; });

  if (existing) {
    var newQty = existing.quantity + quantity;
    if (newQty > product.stock) {
      showToast("Quantidade maior que o estoque disponível.", "error");
      return;
    }
    existing.quantity = newQty;
  } else {
    StoreState.cart.push({ productId: productId, quantity: quantity });
  }

  persistCart();
  renderCart();
  updateCounters();
  openCart();

  showToast("Produto adicionado ao carrinho.");

  pushDataLayer({
    event: "add_to_cart",
    ecommerce: {
      currency: MUGART_CONFIG.currency,
      value: product.price * quantity,
      items: [Object.assign({}, ga4Item(product), { quantity: quantity })]
    }
  });
}

function removeFromCart(productId) {
  var product = getProductById(productId);
  StoreState.cart = StoreState.cart.filter(function(item) { return item.productId !== productId; });
  persistCart();
  renderCart();
  updateCounters();
  showToast("Produto removido do carrinho.", "info");

  if (product) {
    pushDataLayer({
      event: "remove_from_cart",
      ecommerce: {
        currency: MUGART_CONFIG.currency,
        value: product.price,
        items: [ga4Item(product)]
      }
    });
  }
}

function changeCartQuantity(productId, quantity) {
  var product = getProductById(productId);
  var item = StoreState.cart.find(function(cartItem) { return cartItem.productId === productId; });

  if (!product || !item) return;

  var newQuantity = Number(quantity);

  if (newQuantity <= 0) {
    removeFromCart(productId);
    return;
  }

  if (newQuantity > product.stock) {
    showToast("Quantidade maior que o estoque disponível.", "error");
    return;
  }

  item.quantity = newQuantity;
  persistCart();
  renderCart();
  updateCounters();
}

function persistCart() {
  saveToStorage(MUGART_CONFIG.storageKeys.cart, StoreState.cart);
}

function getCartItemsDetailed() {
  return StoreState.cart.map(function(item) {
    var product = getProductById(item.productId);
    if (!product) return null;
    return {
      productId: item.productId,
      quantity: item.quantity,
      product: product,
      subtotal: product.price * item.quantity
    };
  }).filter(Boolean);
}

function getCartSubtotal() {
  return getCartItemsDetailed().reduce(function(total, item) {
    return total + item.subtotal;
  }, 0);
}

function getCartQuantity() {
  return StoreState.cart.reduce(function(total, item) {
    return total + item.quantity;
  }, 0);
}

function renderCart() {
  var container = $("#cartItems");
  var subtotalEl = $("#cartSubtotal");
  var checkoutTotal = $("#checkoutTotal");

  if (!container) return;

  var items = getCartItemsDetailed();
  var subtotal = getCartSubtotal();

  if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
  if (checkoutTotal) checkoutTotal.textContent = formatMoney(subtotal);

  if (!items.length) {
    container.innerHTML = '<div class="empty-cart"><h4>Seu carrinho está vazio</h4><p>Adicione canecas pronta entrega para continuar.</p></div>';
    return;
  }

  container.innerHTML = items.map(function(item) {
    return '' +
      '<div class="cart-item" data-product-id="' + item.product.id + '">' +
        '<img src="' + item.product.image + '" alt="' + item.product.name + '" />' +
        '<div class="cart-item-info">' +
          '<h4>' + item.product.name + '</h4>' +
          '<span>' + item.product.color + ' • ' + formatMoney(item.product.price) + '</span>' +
          '<div class="cart-item-controls">' +
            '<button type="button" data-cart-action="decrease">−</button>' +
            '<input type="number" min="1" max="' + item.product.stock + '" value="' + item.quantity + '" data-cart-action="quantity" />' +
            '<button type="button" data-cart-action="increase">+</button>' +
          '</div>' +
        '</div>' +
        '<div class="cart-item-total">' +
          '<strong>' + formatMoney(item.subtotal) + '</strong>' +
          '<button type="button" data-cart-action="remove">Remover</button>' +
        '</div>' +
      '</div>';
  }).join("");

  bindCartItemButtons();
}

function bindCartItemButtons() {
  $all(".cart-item").forEach(function(itemEl) {
    var productId = itemEl.dataset.productId;
    var item = StoreState.cart.find(function(cartItem) { return cartItem.productId === productId; });

    if (!item) return;

    itemEl.querySelectorAll("[data-cart-action]").forEach(function(control) {
      control.addEventListener("click", function() {
        var action = control.dataset.cartAction;
        if (action === "increase") changeCartQuantity(productId, item.quantity + 1);
        if (action === "decrease") changeCartQuantity(productId, item.quantity - 1);
        if (action === "remove") removeFromCart(productId);
      });

      if (control.dataset.cartAction === "quantity") {
        control.addEventListener("change", function(event) {
          changeCartQuantity(productId, event.target.value);
        });
      }
    });
  });
}

function bindCartActions() {
  var checkoutBtn = $("#checkoutBtn");
  var checkoutClose = $("#checkoutClose");
  var sendCartWhatsapp = $("#sendCartWhatsapp");
  var checkoutForm = $("#checkoutForm");

  if (checkoutBtn) checkoutBtn.addEventListener("click", openCheckout);
  if (checkoutClose) checkoutClose.addEventListener("click", closeCheckout);
  if (sendCartWhatsapp) sendCartWhatsapp.addEventListener("click", sendCartToWhatsapp);
  if (checkoutForm) checkoutForm.addEventListener("submit", handleCheckoutSubmit);
}

function openCart() {
  var cartDrawer = $("#cartDrawer");
  var overlay = $("#drawerOverlay");

  if (cartDrawer) cartDrawer.classList.add("open");
  if (overlay) overlay.classList.add("open");

  pushDataLayer({
    event: "view_cart",
    ecommerce: {
      currency: MUGART_CONFIG.currency,
      value: getCartSubtotal(),
      items: getCartItemsDetailed().map(function(item) {
        return Object.assign({}, ga4Item(item.product), { quantity: item.quantity });
      })
    }
  });
}

function closeCart() {
  var cartDrawer = $("#cartDrawer");
  var overlay = $("#drawerOverlay");

  if (cartDrawer) cartDrawer.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
}

function updateCounters() {
  var cartQuantity = getCartQuantity();
  var favoriteQuantity = StoreState.favorites.length;

  $all("[data-cart-count], #cartCount, .cart-count").forEach(function(el) {
    el.textContent = cartQuantity;
  });

  $all("[data-favorites-count], #favoritesCount, .favorites-count").forEach(function(el) {
    el.textContent = favoriteQuantity;
  });
}

function openCheckout() {
  if (!StoreState.cart.length) {
    showToast("Adicione um produto ao carrinho antes de finalizar.", "error");
    return;
  }

  closeCart();

  var modal = $("#checkoutModal");
  var total = $("#checkoutTotal");

  if (total) total.textContent = formatMoney(getCartSubtotal());

  if (modal) {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  pushDataLayer({
    event: "begin_checkout",
    ecommerce: {
      currency: MUGART_CONFIG.currency,
      value: getCartSubtotal(),
      items: getCartItemsDetailed().map(function(item) {
        return Object.assign({}, ga4Item(item.product), { quantity: item.quantity });
      })
    }
  });
}

function closeCheckout() {
  var modal = $("#checkoutModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function handleCheckoutSubmit(event) {
  event.preventDefault();

  var formData = new FormData(event.target);
  var customer = {};
  formData.forEach(function(value, key) {
    customer[key] = value;
  });

  saveToStorage(MUGART_CONFIG.storageKeys.customer, customer);

  var fakeOrderId = "MUG-" + Date.now();

  pushDataLayer({
    event: "generate_order_frontend",
    order_id: fakeOrderId,
    payment_method: customer.payment,
    ecommerce: {
      transaction_id: fakeOrderId,
      currency: MUGART_CONFIG.currency,
      value: getCartSubtotal(),
      items: getCartItemsDetailed().map(function(item) {
        return Object.assign({}, ga4Item(item.product), { quantity: item.quantity });
      })
    }
  });

  showToast("Pedido visual gerado. O pagamento real entra na próxima etapa.", "success");

  var message = buildCheckoutWhatsappMessage(fakeOrderId, customer);

  setTimeout(function() {
    window.open("https://wa.me/" + MUGART_CONFIG.whatsapp + "?text=" + encodeURIComponent(message), "_blank");
  }, 400);

  closeCheckout();
}

function sendProductToWhatsapp(productId) {
  var product = getProductById(productId);
  if (!product) return;

  var message = "Olá! Vim pela loja da MugArt e gostaria de saber mais sobre este produto:\n\n" +
    "Produto: " + product.name + "\n" +
    "SKU: " + product.sku + "\n" +
    "Cor: " + product.color + "\n" +
    "Preço: " + formatMoney(product.price) + "\n" +
    "Estoque: " + product.stock + "\n\n" +
    "Link da página: " + window.location.href;

  pushDataLayer({
    event: "click_whatsapp_product",
    product_id: product.id,
    product_name: product.name,
    product_price: product.price
  });

  window.open("https://wa.me/" + MUGART_CONFIG.whatsapp + "?text=" + encodeURIComponent(message), "_blank");
}

function sendCartToWhatsapp() {
  if (!StoreState.cart.length) {
    showToast("Seu carrinho está vazio.", "error");
    return;
  }

  var message = buildCartWhatsappMessage();

  pushDataLayer({
    event: "click_whatsapp_cart",
    cart_value: getCartSubtotal(),
    cart_items: getCartQuantity()
  });

  window.open("https://wa.me/" + MUGART_CONFIG.whatsapp + "?text=" + encodeURIComponent(message), "_blank");
}

function buildCartWhatsappMessage() {
  var items = getCartItemsDetailed();

  var lines = items.map(function(item) {
    return "- " + item.quantity + "x " + item.product.name + " (" + item.product.color + ") - " + formatMoney(item.subtotal);
  }).join("\n");

  return "Olá! Vim pela loja da MugArt e gostaria de finalizar este pedido:\n\n" +
    lines + "\n\n" +
    "Total: " + formatMoney(getCartSubtotal()) + "\n\n" +
    "Gostaria de continuar pelo WhatsApp.";
}

function buildCheckoutWhatsappMessage(orderId, customer) {
  var items = getCartItemsDetailed();

  var lines = items.map(function(item) {
    return "- " + item.quantity + "x " + item.product.name + " (" + item.product.color + ") - " + formatMoney(item.subtotal);
  }).join("\n");

  return "Olá! Pedido gerado pela loja da MugArt.\n\n" +
    "Pedido: " + orderId + "\n\n" +
    "Dados do cliente:\n" +
    "Nome: " + customer.name + "\n" +
    "WhatsApp: " + customer.phone + "\n" +
    "E-mail: " + customer.email + "\n" +
    "Endereço: " + customer.address + "\n" +
    "Cidade/UF: " + customer.city + " - " + customer.state + "\n" +
    "CEP: " + customer.zip + "\n" +
    "Pagamento escolhido: " + customer.payment + "\n\n" +
    "Itens:\n" + lines + "\n\n" +
    "Total: " + formatMoney(getCartSubtotal()) + "\n\n" +
    "Aguardando confirmação de pagamento.";
}

function ga4Item(product) {
  return {
    item_id: product.sku,
    item_name: product.name,
    item_category: product.category,
    item_variant: product.color,
    price: product.price
  };
}
