/* ==========================================================
   MugArt Loja + Supabase
   Arquivo: js/loja.js
========================================================== */

var MUGART_CONFIG = {
  whatsapp: "5511988849236",
  currency: "BRL",
  locale: "pt-BR",
  productsPerPage: 8,
  storageKeys: {
    cart: "mugart_cart",
    favorites: "mugart_favorites",
    customer: "mugart_customer"
  }
};

var StoreState = {
  products: [],
  cart: [],
  favorites: [],
  currentPage: 1,
  filters: {
    search: "",
    category: "todos",
    color: "todos",
    sort: "featured",
    maxPrice: 9999
  },
  selectedProduct: null
};

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.prototype.slice.call(document.querySelectorAll(selector));
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

document.addEventListener("DOMContentLoaded", async function() {
  restoreState();
  createBaseUIIfMissing();
  bindHeader();
  bindFilters();
  bindCartActions();

  await loadProductsFromSupabase();

  configureMaxPriceFilter();
  renderCategories();
  renderColors();
  renderFeaturedProducts();
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

async function loadProductsFromSupabase() {
  if (!window.mugartSupabase) {
    showToast("Supabase não carregou na loja. Verifique js/supabase-config.js.", "error");
    StoreState.products = [];
    return;
  }

  var result = await mugartSupabase
    .from("products")
    .select(`
      id,
      name,
      sku,
      description,
      color,
      price,
      old_price,
      stock,
      image_url,
      active,
      featured,
      created_at,
      categories (
        id,
        name,
        slug
      )
    `)
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (result.error) {
    console.error(result.error);
    showToast("Erro ao carregar produtos da loja.", "error");
    StoreState.products = [];
    return;
  }

  StoreState.products = (result.data || []).map(function(product) {
    return {
      id: product.id,
      sku: product.sku || product.id,
      name: product.name || "Produto sem nome",
      category: product.categories ? product.categories.name : "Sem categoria",
      categoryId: product.categories ? product.categories.id : null,
      color: product.color || "Não informado",
      price: Number(product.price || 0),
      oldPrice: Number(product.old_price || 0),
      stock: Number(product.stock || 0),
      image: product.image_url || "assets/hero-caneca.png",
      description: product.description || "Produto MugArt pronta entrega.",
      active: product.active,
      featured: product.featured,
      specs: {
        capacidade: "325ml",
        material: "Cerâmica",
        acabamento: "Brilhante",
        personalizacao: "Sublimação"
      },
      tags: [
        product.name || "",
        product.color || "",
        product.categories ? product.categories.name : ""
      ]
    };
  });
}

function configureMaxPriceFilter() {
  var priceMax = $("#priceMaxFilter");
  var label = $("#priceMaxLabel");

  if (!priceMax) return;

  var highestPrice = StoreState.products.reduce(function(max, product) {
    return Math.max(max, Number(product.price || 0));
  }, 80);

  var roundedMax = Math.max(80, Math.ceil(highestPrice / 10) * 10);

  priceMax.max = String(roundedMax);
  priceMax.value = String(roundedMax);
  StoreState.filters.maxPrice = roundedMax;

  if (label) label.textContent = formatMoney(roundedMax);
}

  if (!$(".product-modal")) {
    document.body.appendChild(createElementFromHTML(
      '<div class="product-modal" id="productModal" aria-hidden="true">' +
        '<div class="product-modal-card">' +
          '<button class="modal-close" id="modalClose" type="button">×</button>' +
          '<div id="modalContent"></div>' +
        '</div>' +
      '</div>'
    ));ChatGPT





Texto colado.txt
Documento
monta o datalayer nesse html



Texto colado(1).txt
Documento


Texto colado(2).txt
Documento


Texto colado(3).txt
Documento

Texto colado (2).txt
Documento
const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("nav");
const cards = [...document.querySelectorAll(".model-card")];
const colors = [...document.querySelectorAll(".color")];
const selectedModelText = document.getElementById("selectedModelText");
const selectedArtText = document.getElementById("selectedArtText");
const artInput = document.getElementById("artInput");
const artPreview = document.getElementById("artPreview");
const placeholderText = document.getElementById("placeholderText");
const clearArt = document.getElementById("clearArt");
const sendWhatsapp = document.getElementById("sendWhatsapp");
const modelsTrack = document.getElementById("modelsTrack");

let selectedModel = "Caneca Branca";
let selectedColor = "branca";
let selectedFileName = "";
let selectedFileType = "";
let selectedFileExtension = "";
let selectedFileSizeKb = 0;
let hasArt = false;

menuToggle?.addEventListener("click", () => nav.classList.toggle("open"));

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => nav.classList.remove("open"));
});

function selectCard(card) {
  cards.forEach((item) => item.classList.remove("active"));
  card.classList.add("active");

  selectedModel =
    card.dataset.modelo ||
    card.querySelector("h3")?.innerText ||
    "Caneca Branca";

  selectedColor = card.dataset.cor || "";

  selectedModelText.textContent = selectedModel;

  colors.forEach((color) => {
    color.classList.toggle(
      "selected",
      color.dataset.target === selectedModel
    );
  });
}

cards.forEach((card) => {
  card.addEventListener("click", () => selectCard(card));
});

colors.forEach((color) => {
  color.addEventListener("click", () => {
    colors.forEach((item) => item.classList.remove("selected"));
    color.classList.add("selected");

    const index = color.dataset.card;

    if (index !== undefined && cards[index]) {
      selectCard(cards[index]);

      cards[index].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  });
});

document.querySelector(".arrow.left")?.addEventListener("click", () => {
  modelsTrack.scrollBy({
    left: -260,
    behavior: "smooth",
  });
});

document.querySelector(".arrow.right")?.addEventListener("click", () => {
  modelsTrack.scrollBy({
    left: 260,
    behavior: "smooth",
  });
});

artInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];

  if (!file) return;

  selectedFileName = file.name;
  selectedFileType = file.type;
  selectedFileExtension = file.name.split(".").pop().toLowerCase();
  selectedFileSizeKb = Math.round(file.size / 1024);
  hasArt = true;

  selectedArtText.textContent = file.name;

  const reader = new FileReader();

  reader.onload = (e) => {
    if (artPreview) {
      artPreview.src = e.target.result;
      artPreview.style.display = "block";
    }

    if (placeholderText) {
      placeholderText.style.display = "none";
    }
  };

  reader.readAsDataURL(file);
});

clearArt.addEventListener("click", () => {
  artInput.value = "";
  hasArt = false;
  selectedFileName = "";
  selectedFileType = "";
  selectedFileExtension = "";
  selectedFileSizeKb = 0;

  selectedArtText.textContent = "Nenhuma";

  if (artPreview) {
    artPreview.removeAttribute("src");
    artPreview.style.display = "none";
  }

  if (placeholderText) {
    placeholderText.style.display = "block";
  }
});

sendWhatsapp.addEventListener("click", () => {
  const name =
    document.getElementById("customerName").value.trim() ||
    "Não informado";

  const note =
    document.getElementById("customerNote").value.trim() ||
    "Sem observações";

  window.dataLayer = window.dataLayer || [];

  window.dataLayer.push({
    event: "pedido_whatsapp",

    mug_model: selectedModel,
    mug_color: selectedColor,

    artwork_uploaded: hasArt,
    artwork_name: hasArt ? selectedFileName : "",
    artwork_type: hasArt ? selectedFileType : "",
    artwork_extension: hasArt ? selectedFileExtension : "",
    artwork_size_kb: hasArt ? selectedFileSizeKb : 0,

    customer_name_filled: name !== "Não informado",
    customer_note_filled: note !== "Sem observações",

    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname
  });

  const message = Olá, vim pelo site da MugArt e gostaria de solicitar um orçamento.

Resumo do pedido:
Nome: ${name}
Modelo escolhido: ${selectedModel}
Cor da caneca: ${selectedColor}
Arte enviada pelo site: ${hasArt ? "Sim - " + selectedFileName : "Não"}
Observações: ${note}

Gostaria de continuar o atendimento pelo WhatsApp.;

  window.open(
    https://wa.me/5511988849236?text=${encodeURIComponent(message)},
    "_blank"
  );
});




Texto colado(4).txt
Documento


Texto colado(5).txt
Documento
ta correto?


Texto colado(6).txt
Documento
esta correto?


Texto colado(7).txt
Documento


Texto colado(8).txt
Documento
veja se esta correto


MugArtSite.zip
Arquivo zip


Texto colado(9).txt
Documento


checkout(3).js
JavaScript


Texto colado(10).txt
Documento

Achei exatamente o problema. 


O arquivo loja.js ainda é o da versão antiga da loja. Ele tem aproximadamente 1.000 linhas e possui:

o modal de checkout antigo;

o envio para WhatsApp;

a criação do pedido antiga;

a lógica antiga de finalizar compra.

Não é seguro eu mandar um "arquivo completo" aqui porque ele ultrapassa em muito o limite de caracteres do chat. A resposta seria cortada no meio e você ficaria com um loja.js inválido.

O que eu proponho
Vou fazer uma refatoração completa desse arquivo para a versão Loja 2.0, removendo definitivamente o checkout antigo.

Ela ficará assim:

✅ Carrinho moderno.

✅ Ao clicar em Finalizar compra, apenas faz:

window.location.href = "checkout.html";
✅ Remove todo o modal antigo.

✅ Remove toda a lógica de WhatsApp do checkout (mantendo apenas o botão "Tirar dúvida pelo WhatsApp").

✅ Mantém GA4/DataLayer.

✅ Mantém favoritos.

✅ Mantém filtros.

✅ Mantém paginação.

✅ Mantém catálogo.

✅ Mantém Supabase.

✅ Código mais limpo (cerca de 30% menor).

Como esse arquivo continua muito grande para o limite do chat, vou entregá-lo em partes, mas já como uma versão nova e definitiva, sem ficar fazendo remendos.

Essa é a melhor opção, porque elimina todo o legado do checkout antigo e evita novos conflitos com o checkout.html que já está funcionando.



Texto colado(12).txt
Documento

Revisa o codigoe me manda atualizado

Vou corrigir esse loja.js removendo o checkout antigo que ainda abre WhatsApp/modal, mantendo o botão de dúvida por WhatsApp e fazendo o botão Finalizar compra ir para checkout.html.

Encontrei dois problemas no arquivo: sobrou um pedaço solto do openCheckout() antigo e ainda existe o handleCheckoutSubmit() antigo que mandava para WhatsApp. Vou gerar o arquivo limpo agora.

Pensou por 1m 20s
Pronto.

Baixar loja.js atualizado

Substitua o arquivo atual em:

js/loja.js
Ele foi corrigido para o botão Finalizar compra ir para checkout.html, sem abrir o checkout antigo nem mandar para WhatsApp. 


Pensou por alguns segundos
Esse erro significa que ficou faltando uma chave } no final do loja.js.

Faça assim: vá no final do arquivo e cole isso:

function ga4Item(product) {
  return {
    item_id: product.sku,
    item_name: product.name,
    item_category: product.category,
    item_variant: product.color,
    price: product.price
  };
}
Se essa função já existir, então provavelmente só falta uma chave. Nesse caso, cole apenas no final:

}
Depois salve e teste:

https://mugart.com.br/loja.html?v=21
Se continuar, me mande as últimas 80 linhas do loja.js que eu aponto exatamente onde faltou fechar.


function closeCheckout() {
  // Checkout antigo removido.
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

Esse trecho está correto. A função está fechada corretamente.

Então o erro não está aí.

Como o navegador está dizendo:

Unexpected end of input
significa que alguma chave { ou parêntese ( ficou aberto em outro ponto do arquivo. Esse tipo de erro é praticamente impossível localizar olhando apenas pequenos trechos.

O jeito mais rápido de resolver
Me envie o arquivo loja.js inteiro (não colado na conversa, mas como anexo, igual você fez antes).

Eu vou:

corrigir todos os erros de sintaxe;

remover definitivamente o checkout antigo;

manter apenas o novo checkout.html;

devolver o arquivo 100% funcionando.

É muito mais rápido do que ficar procurando uma chave perdida em quase 1000 linhas de código.


ok

Perfeito. Anexe o arquivo js/loja.js completo.

Vou fazer uma revisão completa e devolver um arquivo já corrigido com:

✅ Sem erros de sintaxe.

✅ Sem Unexpected end of input.

✅ Sem o checkout antigo.

✅ Sem redirecionamento para WhatsApp ao finalizar a compra.

✅ Botão Finalizar compra abrindo checkout.html.

✅ Produtos carregando normalmente do Supabase.

✅ Carrinho funcionando.

✅ GA4/DataLayer preservado.

✅ Código limpo, sem trechos duplicados.

Desta vez vou revisar o arquivo inteiro antes de devolver para garantir que ele esteja consistente.



Texto colado(13).txt
Documento

Pensou por 4s
Achei o erro: faltou fechar a função createBaseUIIfMissing() antes de começar bindHeader(). 


No seu arquivo, procure este trecho:

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
   
function bindHeader() {
Troque por:

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
}

function bindHeader() {
Faltava só esse } antes do function bindHeader().

Depois teste:

https://mugart.com.br/loja.html?v=30

/* ==========================================================
MugArt Loja + Supabase
Arquivo: js/loja.js
========================================================== */

var MUGART_CONFIG = {
whatsapp: "5511988849236",
currency: "BRL",
locale: "pt-BR",
productsPerPage: 8,
storageKeys: {
cart: "mugart_cart",
favorites: "mugart_favorites",
customer: "mugart_customer"
}
};

var StoreState = {
products: [],
cart: [],
favorites: [],
currentPage: 1,
filters: {
search: "",
category: "todos",
color: "todos",
sort: "featured",
maxPrice: 9999
},
selectedProduct: null
};

function $(selector) {
return document.querySelector(selector);
}

function $all(selector) {
return Array.prototype.slice.call(document.querySelectorAll(selector));
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

document.addEventListener("DOMContentLoaded", async function() {
restoreState();
createBaseUIIfMissing();
bindHeader();
bindFilters();
bindCartActions();

await loadProductsFromSupabase();

configureMaxPriceFilter();
renderCategories();
renderColors();
renderFeaturedProducts();
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

async function loadProductsFromSupabase() {
if (!window.mugartSupabase) {
showToast("Supabase não carregou na loja. Verifique js/supabase-config.js.", "error");
StoreState.products = [];
return;
}

var result = await mugartSupabase
.from("products")
.select( id, name, sku, description, color, price, old_price, stock, image_url, active, featured, created_at, categories ( id, name, slug ) )
.eq("active", true)
.order("featured", { ascending: false })
.order("created_at", { ascending: false });

if (result.error) {
console.error(result.error);
showToast("Erro ao carregar produtos da loja.", "error");
StoreState.products = [];
return;
}

StoreState.products = (result.data || []).map(function(product) {
return {
id: product.id,
sku: product.sku || product.id,
name: product.name || "Produto sem nome",
category: product.categories ? product.categories.name : "Sem categoria",
categoryId: product.categories ? product.categories.id : null,
color: product.color || "Não informado",
price: Number(product.price || 0),
oldPrice: Number(product.old_price || 0),
stock: Number(product.stock || 0),
image: product.image_url || "assets/hero-caneca.png",
description: product.description || "Produto MugArt pronta entrega.",
active: product.active,
featured: product.featured,
specs: {
capacidade: "325ml",
material: "Cerâmica",
acabamento: "Brilhante",
personalizacao: "Sublimação"
},
tags: [
product.name || "",
product.color || "",
product.categories ? product.categories.name : ""
]
};
});
}

function configureMaxPriceFilter() {
var priceMax = $("#priceMaxFilter");
var label = $("#priceMaxLabel");

if (!priceMax) return;

var highestPrice = StoreState.products.reduce(function(max, product) {
return Math.max(max, Number(product.price || 0));
}, 80);

var roundedMax = Math.max(80, Math.ceil(highestPrice / 10) * 10);

priceMax.max = String(roundedMax);
priceMax.value = String(roundedMax);
StoreState.filters.maxPrice = roundedMax;

if (label) label.textContent = formatMoney(roundedMax);
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
}

function bindHeader() {

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
var priceMax = $("#priceMaxFilter");
var clearFilters = $("#clearFilters");

if (searchInput) {
searchInput.addEventListener("input", function(event) {
StoreState.filters.search = event.target.value;
StoreState.currentPage = 1;
renderProducts();
pushDataLayer({ event: "store_search", search_term: event.target.value });
});
}

if (categorySelect) {
categorySelect.addEventListener("change", function(event) {
StoreState.filters.category = event.target.value;
StoreState.currentPage = 1;
renderProducts();
});
}

if (colorSelect) {
colorSelect.addEventListener("change", function(event) {
StoreState.filters.color = event.target.value;
StoreState.currentPage = 1;
renderProducts();
});
}

if (sortSelect) {
sortSelect.addEventListener("change", function(event) {
StoreState.filters.sort = event.target.value;
StoreState.currentPage = 1;
renderProducts();
});
}

if (priceMax) {
priceMax.addEventListener("input", function(event) {
StoreState.filters.maxPrice = Number(event.target.value);
StoreState.currentPage = 1;
updatePriceLabel();
renderProducts();
});
}

if (clearFilters) {
clearFilters.addEventListener("click", function() {
StoreState.filters.search = "";
StoreState.filters.category = "todos";
StoreState.filters.color = "todos";
StoreState.filters.sort = "featured";

  if (searchInput) searchInput.value = "";
  if (categorySelect) categorySelect.value = "todos";
  if (colorSelect) colorSelect.value = "todos";
  if (sortSelect) sortSelect.value = "featured";
  if (priceMax) {
    priceMax.value = priceMax.max;
    StoreState.filters.maxPrice = Number(priceMax.max);
  }

  StoreState.currentPage = 1;
  updatePriceLabel();
  renderCategories();
  renderProducts();
});
}
}

function updatePriceLabel() {
var label = $("#priceMaxLabel");
if (label) label.textContent = formatMoney(StoreState.filters.maxPrice);
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
    StoreState.currentPage = 1;
    if ($("#categoryFilter")) $("#categoryFilter").value = StoreState.filters.category;
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
var maxPrice = StoreState.filters.maxPrice;
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
var matchesPrice = product.price <= maxPrice;

return matchesSearch && matchesCategory && matchesColor && matchesPrice;
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

function getPagedProducts(products) {
var start = (StoreState.currentPage - 1) * MUGART_CONFIG.productsPerPage;
return products.slice(start, start + MUGART_CONFIG.productsPerPage);
}

function renderProducts() {
var grid = $("#productsGrid") || $("#storeProducts") || $(".products-grid");
var count = $("#productsCount");

if (!grid) return;

var products = getFilteredProducts();
var paged = getPagedProducts(products);

if (count) count.textContent = products.length + " produto" + (products.length === 1 ? "" : "s");

if (!products.length) {
grid.innerHTML = '<div class="empty-products"><h3>Nenhuma caneca encontrada</h3><p>Cadastre produtos ativos no painel administrativo ou limpe os filtros.</p></div>';
renderPagination(products.length);
return;
}

grid.innerHTML = paged.map(productCardTemplate).join("");
bindProductCards();
renderPagination(products.length);
}

function renderFeaturedProducts() {
var container = $("#featuredProducts");
if (!container) return;

var featured = StoreState.products.filter(function(product) {
return product.featured;
}).slice(0, 4);

if (!featured.length) {
container.innerHTML = '<div class="empty-products"><p>Nenhum produto em destaque ainda.</p></div>';
return;
}

container.innerHTML = featured.map(productCardTemplate).join("");
bindProductCards();
}

function renderPagination(totalProducts) {
var pagination = $("#pagination");
if (!pagination) return;

var pages = Math.ceil(totalProducts / MUGART_CONFIG.productsPerPage);

if (pages <= 1) {
pagination.innerHTML = "";
return;
}

var html = "";
for (var i = 1; i <= pages; i++) {
html += '<button type="button" class="' + (i === StoreState.currentPage ? "active" : "") + '" data-page="' + i + '">' + i + '</button>';
}

pagination.innerHTML = html;

$all("#pagination button").forEach(function(button) {
button.addEventListener("click", function() {
StoreState.currentPage = Number(button.dataset.page);
renderProducts();
document.getElementById("produtos").scrollIntoView({ behavior: "smooth" });
});
});
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
'<div class="product-meta"><span>' + product.color + '</span><span class="' + (product.stock <= 4 ? "stock-low" : "") + '">' + (product.stock > 0 ? product.stock + " em estoque" : "Esgotado") + '</span></div>' +
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
renderFeaturedProducts();
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
return { productId: item.productId, quantity: item.quantity, product: product, subtotal: product.price * item.quantity };
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
var sendCartWhatsapp = $("#sendCartWhatsapp");

if (checkoutBtn) {
checkoutBtn.addEventListener("click", openCheckout);
}

if (sendCartWhatsapp) {
sendCartWhatsapp.addEventListener("click", sendCartToWhatsapp);
}
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

window.location.href = "checkout.html";
}

function closeCheckout() {
// Checkout antigo removido.
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


Fechar

  }
   
function bindHeader() {
   
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
  var priceMax = $("#priceMaxFilter");
  var clearFilters = $("#clearFilters");

  if (searchInput) {
    searchInput.addEventListener("input", function(event) {
      StoreState.filters.search = event.target.value;
      StoreState.currentPage = 1;
      renderProducts();
      pushDataLayer({ event: "store_search", search_term: event.target.value });
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", function(event) {
      StoreState.filters.category = event.target.value;
      StoreState.currentPage = 1;
      renderProducts();
    });
  }

  if (colorSelect) {
    colorSelect.addEventListener("change", function(event) {
      StoreState.filters.color = event.target.value;
      StoreState.currentPage = 1;
      renderProducts();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", function(event) {
      StoreState.filters.sort = event.target.value;
      StoreState.currentPage = 1;
      renderProducts();
    });
  }

  if (priceMax) {
    priceMax.addEventListener("input", function(event) {
      StoreState.filters.maxPrice = Number(event.target.value);
      StoreState.currentPage = 1;
      updatePriceLabel();
      renderProducts();
    });
  }

  if (clearFilters) {
    clearFilters.addEventListener("click", function() {
      StoreState.filters.search = "";
      StoreState.filters.category = "todos";
      StoreState.filters.color = "todos";
      StoreState.filters.sort = "featured";

      if (searchInput) searchInput.value = "";
      if (categorySelect) categorySelect.value = "todos";
      if (colorSelect) colorSelect.value = "todos";
      if (sortSelect) sortSelect.value = "featured";
      if (priceMax) {
        priceMax.value = priceMax.max;
        StoreState.filters.maxPrice = Number(priceMax.max);
      }

      StoreState.currentPage = 1;
      updatePriceLabel();
      renderCategories();
      renderProducts();
    });
  }
}

function updatePriceLabel() {
  var label = $("#priceMaxLabel");
  if (label) label.textContent = formatMoney(StoreState.filters.maxPrice);
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
        StoreState.currentPage = 1;
        if ($("#categoryFilter")) $("#categoryFilter").value = StoreState.filters.category;
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
  var maxPrice = StoreState.filters.maxPrice;
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
    var matchesPrice = product.price <= maxPrice;

    return matchesSearch && matchesCategory && matchesColor && matchesPrice;
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

function getPagedProducts(products) {
  var start = (StoreState.currentPage - 1) * MUGART_CONFIG.productsPerPage;
  return products.slice(start, start + MUGART_CONFIG.productsPerPage);
}

function renderProducts() {
  var grid = $("#productsGrid") || $("#storeProducts") || $(".products-grid");
  var count = $("#productsCount");

  if (!grid) return;

  var products = getFilteredProducts();
  var paged = getPagedProducts(products);

  if (count) count.textContent = products.length + " produto" + (products.length === 1 ? "" : "s");

  if (!products.length) {
    grid.innerHTML = '<div class="empty-products"><h3>Nenhuma caneca encontrada</h3><p>Cadastre produtos ativos no painel administrativo ou limpe os filtros.</p></div>';
    renderPagination(products.length);
    return;
  }

  grid.innerHTML = paged.map(productCardTemplate).join("");
  bindProductCards();
  renderPagination(products.length);
}

function renderFeaturedProducts() {
  var container = $("#featuredProducts");
  if (!container) return;

  var featured = StoreState.products.filter(function(product) {
    return product.featured;
  }).slice(0, 4);

  if (!featured.length) {
    container.innerHTML = '<div class="empty-products"><p>Nenhum produto em destaque ainda.</p></div>';
    return;
  }

  container.innerHTML = featured.map(productCardTemplate).join("");
  bindProductCards();
}

function renderPagination(totalProducts) {
  var pagination = $("#pagination");
  if (!pagination) return;

  var pages = Math.ceil(totalProducts / MUGART_CONFIG.productsPerPage);

  if (pages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  var html = "";
  for (var i = 1; i <= pages; i++) {
    html += '<button type="button" class="' + (i === StoreState.currentPage ? "active" : "") + '" data-page="' + i + '">' + i + '</button>';
  }

  pagination.innerHTML = html;

  $all("#pagination button").forEach(function(button) {
    button.addEventListener("click", function() {
      StoreState.currentPage = Number(button.dataset.page);
      renderProducts();
      document.getElementById("produtos").scrollIntoView({ behavior: "smooth" });
    });
  });
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
        '<div class="product-meta"><span>' + product.color + '</span><span class="' + (product.stock <= 4 ? "stock-low" : "") + '">' + (product.stock > 0 ? product.stock + " em estoque" : "Esgotado") + '</span></div>' +
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
  renderFeaturedProducts();
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
    return { productId: item.productId, quantity: item.quantity, product: product, subtotal: product.price * item.quantity };
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
  var sendCartWhatsapp = $("#sendCartWhatsapp");

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", openCheckout);
  }

  if (sendCartWhatsapp) {
    sendCartWhatsapp.addEventListener("click", sendCartToWhatsapp);
  }
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

  window.location.href = "checkout.html";
}

function closeCheckout() {
  // Checkout antigo removido.
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
