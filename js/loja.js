/* ==========================================================
   MugArt Loja - js/loja.js
========================================================== */

const MUGART_CONFIG = {
  whatsapp: "5511988849236",
  currency: "BRL",
  locale: "pt-BR",
  storageKeys: {
    cart: "mugart_cart",
    favorites: "mugart_favorites",
    customer: "mugart_customer"
  }
};

const PRODUCTS = [
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
  }
];

const StoreState = {
  products: PRODUCTS.filter(product => product.active),
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

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

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
    const saved = localStorage.getItem(key);
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

function showToast(message, type = "success") {
  let toast = $(".mugart-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "mugart-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

document.addEventListener("DOMContentLoaded", () => {
  restoreState();
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