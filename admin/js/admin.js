/* ==========================================================
   MugArt Admin Front-end
   LocalStorage agora. Supabase depois.
========================================================== */

const ADMIN_KEYS = {
  auth: "mugart_admin_auth",
  products: "mugart_admin_products",
  categories: "mugart_admin_categories",
  orders: "mugart_admin_orders"
};

const DEFAULT_CATEGORIES = [
  "Caneca Comum",
  "Caneca Coração",
  "Caneca Mágica"
];

const DEFAULT_PRODUCTS = [
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
    description: "Caneca branca pronta entrega, ideal para presentes personalizados, lembranças e uso diário.",
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
    description: "Caneca mágica preta que revela a arte ao entrar em contato com líquido quente.",
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
    description: "Caneca com alça em formato de coração, perfeita para datas românticas.",
    active: true,
    featured: true
  }
];

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function getData(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedData() {
  if (!localStorage.getItem(ADMIN_KEYS.categories)) {
    setData(ADMIN_KEYS.categories, DEFAULT_CATEGORIES);
  }

  if (!localStorage.getItem(ADMIN_KEYS.products)) {
    setData(ADMIN_KEYS.products, DEFAULT_PRODUCTS);
  }

  if (!localStorage.getItem(ADMIN_KEYS.orders)) {
    setData(ADMIN_KEYS.orders, []);
  }
}

function isLoginPage() {
  return location.pathname.includes("index.html") || location.pathname.endsWith("/admin/") || location.pathname.endsWith("/admin");
}

function requireAuth() {
  if (isLoginPage()) return;

  const auth = localStorage.getItem(ADMIN_KEYS.auth);

  if (auth !== "true") {
    location.href = "index.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  seedData();
  requireAuth();

  bindLogin();
  bindLogout();

  if ($("#metricProducts")) renderDashboard();
  if ($("#productForm")) initProductsPage();
  if ($("#categoryForm")) initCategoriesPage();
  if ($("#ordersTable")) initOrdersPage();
});

function bindLogin() {
  const form = $("#loginForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value.trim();

    if (email === "admin@mugart.com.br" && password === "123456") {
      localStorage.setItem(ADMIN_KEYS.auth, "true");
      location.href = "dashboard.html";
    } else {
      alert("Login inválido. Use admin@mugart.com.br / 123456 para teste.");
    }
  });
}

function bindLogout() {
  const btn = $("#logoutBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    localStorage.removeItem(ADMIN_KEYS.auth);
    location.href = "index.html";
  });
}

function getProducts() {
  return getData(ADMIN_KEYS.products, []);
}

function saveProducts(products) {
  setData(ADMIN_KEYS.products, products);
}

function getCategories() {
  return getData(ADMIN_KEYS.categories, []);
}

function saveCategories(categories) {
  setData(ADMIN_KEYS.categories, categories);
}

function getOrders() {
  return getData(ADMIN_KEYS.orders, []);
}

function saveOrders(orders) {
  setData(ADMIN_KEYS.orders, orders);
}

/* Dashboard */

function renderDashboard() {
  const products = getProducts();
  const orders = getOrders();

  const activeProducts = products.filter((p) => p.active);
  const totalStock = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  const revenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  $("#metricProducts").textContent = activeProducts.length;
  $("#metricStock").textContent = totalStock;
  $("#metricOrders").textContent = orders.length;
  $("#metricRevenue").textContent = formatMoney(revenue);

  const lowStock = products.filter((p) => Number(p.stock || 0) <= 5);

  $("#lowStockTable").innerHTML = lowStock.length
    ? lowStock.map((p) => `
      <tr>
        <td>
          <div class="product-mini">
            <img src="../${p.image}" alt="${p.name}">
            <strong>${p.name}</strong>
          </div>
        </td>
        <td>${p.category}</td>
        <td>${p.color}</td>
        <td>${p.stock}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="4">Nenhum produto com estoque baixo.</td></tr>`;
}

/* Produtos */

function initProductsPage() {
  populateCategorySelect();
  renderProductsTable();

  $("#productForm").addEventListener("submit", saveProductFromForm);
  $("#clearProductForm").addEventListener("click", clearProductForm);
  $("#newProductBtn")?.addEventListener("click", clearProductForm);

  $("#productSearch").addEventListener("input", renderProductsTable);
}

function populateCategorySelect() {
  const select = $("#productCategory");
  if (!select) return;

  const categories = getCategories();

  select.innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");
}

function saveProductFromForm(event) {
  event.preventDefault();

  const products = getProducts();
  const currentId = $("#productId").value;

  const product = {
    id: currentId || `${slugify($("#productName").value)}-${Date.now()}`,
    sku: $("#productSku").value.trim(),
    name: $("#productName").value.trim(),
    category: $("#productCategory").value,
    color: $("#productColor").value.trim(),
    price: Number($("#productPrice").value || 0),
    oldPrice: Number($("#productOldPrice").value || 0),
    stock: Number($("#productStock").value || 0),
    image: $("#productImage").value.trim(),
    description: $("#productDescription").value.trim(),
    active: $("#productActive").value === "true",
    featured: $("#productFeatured").value === "true"
  };

  const index = products.findIndex((p) => p.id === product.id);

  if (index >= 0) {
    products[index] = product;
  } else {
    products.push(product);
  }

  saveProducts(products);
  clearProductForm();
  renderProductsTable();

  alert("Produto salvo com sucesso.");
}

function clearProductForm() {
  $("#productForm").reset();
  $("#productId").value = "";
  $("#productFormTitle").textContent = "Novo produto";
}

function renderProductsTable() {
  const tbody = $("#productsTable");
  if (!tbody) return;

  const search = ($("#productSearch")?.value || "").toLowerCase();
  const products = getProducts().filter((product) => {
    return (
      product.name.toLowerCase().includes(search) ||
      product.category.toLowerCase().includes(search) ||
      product.color.toLowerCase().includes(search) ||
      product.sku.toLowerCase().includes(search)
    );
  });

  tbody.innerHTML = products.length
    ? products.map((p) => `
      <tr>
        <td>
          <div class="product-mini">
            <img src="../${p.image}" alt="${p.name}">
            <div>
              <strong>${p.name}</strong><br>
              <small>${p.sku}</small>
            </div>
          </div>
        </td>
        <td>${p.category}</td>
        <td>${formatMoney(p.price)}</td>
        <td>${p.stock}</td>
        <td><span class="status ${p.active ? "active" : "inactive"}">${p.active ? "Ativo" : "Inativo"}</span></td>
        <td>
          <div class="row-actions">
            <button class="edit" type="button" onclick="editProduct('${p.id}')">Editar</button>
            <button class="delete" type="button" onclick="deleteProduct('${p.id}')">Excluir</button>
          </div>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="6">Nenhum produto encontrado.</td></tr>`;
}

window.editProduct = function(id) {
  const product = getProducts().find((p) => p.id === id);
  if (!product) return;

  $("#productId").value = product.id;
  $("#productName").value = product.name;
  $("#productSku").value = product.sku;
  $("#productCategory").value = product.category;
  $("#productColor").value = product.color;
  $("#productPrice").value = product.price;
  $("#productOldPrice").value = product.oldPrice;
  $("#productStock").value = product.stock;
  $("#productImage").value = product.image;
  $("#productDescription").value = product.description;
  $("#productActive").value = String(product.active);
  $("#productFeatured").value = String(product.featured);
  $("#productFormTitle").textContent = "Editar produto";

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteProduct = function(id) {
  if (!confirm("Deseja excluir este produto?")) return;

  const products = getProducts().filter((p) => p.id !== id);
  saveProducts(products);
  renderProductsTable();
};

/* Categorias */

function initCategoriesPage() {
  renderCategoriesList();

  $("#categoryForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const name = $("#categoryName").value.trim();
    if (!name) return;

    const categories = getCategories();

    if (!categories.includes(name)) {
      categories.push(name);
      saveCategories(categories);
    }

    $("#categoryName").value = "";
    renderCategoriesList();
  });
}

function renderCategoriesList() {
  const list = $("#categoriesList");
  if (!list) return;

  const categories = getCategories();

  list.innerHTML = categories.map((category) => `
    <span class="category-chip-admin">
      ${category}
      <button type="button" onclick="deleteCategory('${category}')">x</button>
    </span>
  `).join("");
}

window.deleteCategory = function(category) {
  if (!confirm("Deseja excluir esta categoria?")) return;

  const categories = getCategories().filter((item) => item !== category);
  saveCategories(categories);
  renderCategoriesList();
};

/* Pedidos */

function initOrdersPage() {
  $("#createFakeOrder")?.addEventListener("click", createFakeOrder);
  renderOrdersTable();
}

function createFakeOrder() {
  const orders = getOrders();

  orders.unshift({
    id: `MUG-${Date.now()}`,
    customer: "Cliente Teste",
    payment: "Pix",
    status: "pendente",
    total: 79.80,
    createdAt: new Date().toLocaleString("pt-BR")
  });

  saveOrders(orders);
  renderOrdersTable();
}

function renderOrdersTable() {
  const tbody = $("#ordersTable");
  if (!tbody) return;

  const orders = getOrders();

  tbody.innerHTML = orders.length
    ? orders.map((order) => `
      <tr>
        <td><strong>${order.id}</strong></td>
        <td>${order.customer}</td>
        <td>${order.payment}</td>
        <td>
          <select onchange="updateOrderStatus('${order.id}', this.value)">
            ${["pendente", "pago", "producao", "concluido", "cancelado"].map((status) => `
              <option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>
            `).join("")}
          </select>
        </td>
        <td>${formatMoney(order.total)}</td>
        <td>${order.createdAt}</td>
        <td>
          <div class="row-actions">
            <button class="delete" type="button" onclick="deleteOrder('${order.id}')">Excluir</button>
          </div>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="7">Nenhum pedido encontrado.</td></tr>`;
}

window.updateOrderStatus = function(id, status) {
  const orders = getOrders();
  const order = orders.find((item) => item.id === id);

  if (order) {
    order.status = status;
    saveOrders(orders);
  }
};

window.deleteOrder = function(id) {
  if (!confirm("Deseja excluir este pedido?")) return;

  const orders = getOrders().filter((item) => item.id !== id);
  saveOrders(orders);
  renderOrdersTable();
};

/* Supabase futuro

Depois, vamos trocar localStorage por:

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

Tabelas:
- products
- categories
- orders
- order_items
- customers

Storage:
- product-images

*/
