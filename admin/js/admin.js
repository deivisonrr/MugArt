const ADMIN_KEYS = {
  auth: "mugart_admin_auth"
};

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

function isLoginPage() {
  return (
    location.pathname.endsWith("/admin/") ||
    location.pathname.endsWith("/admin") ||
    location.pathname.includes("/admin/index.html")
  );
}

function requireAuth() {
  if (isLoginPage()) return;

  const auth = localStorage.getItem(ADMIN_KEYS.auth);

  if (auth !== "true") {
    location.href = "index.html";
  }
}

function requireSupabase() {
  if (!window.mugartSupabase) {
    alert("Supabase não carregou. Verifique se supabase-config.js foi adicionado antes do admin.js.");
    return false;
  }

  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  requireAuth();

  bindLogin();
  bindLogout();

  if (!isLoginPage() && !requireSupabase()) return;

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

async function getCategories() {
  const result = await mugartSupabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (result.error) {
    console.error(result.error);
    alert("Erro ao carregar categorias: " + result.error.message);
    return [];
  }

  return result.data || [];
}

async function getProducts() {
  const result = await mugartSupabase
    .from("products")
    .select(`
      *,
      categories (
        id,
        name,
        slug
      )
    `)
    .order("created_at", { ascending: false });

  if (result.error) {
    console.error(result.error);
    alert("Erro ao carregar produtos: " + result.error.message);
    return [];
  }

  return result.data || [];
}

async function getOrders() {
  const result = await mugartSupabase
    .from("orders")
    .select(`
      *,
      customers (
        id,
        name,
        email,
        phone
      )
    `)
    .order("created_at", { ascending: false });

  if (result.error) {
    console.error(result.error);
    alert("Erro ao carregar pedidos: " + result.error.message);
    return [];
  }

  return result.data || [];
}

async function renderDashboard() {
  const products = await getProducts();
  const orders = await getOrders();

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
            <img src="${p.image_url || "../assets/hero-caneca.png"}" alt="${p.name}">
            <strong>${p.name}</strong>
          </div>
        </td>
        <td>${p.categories ? p.categories.name : "-"}</td>
        <td>${p.color || "-"}</td>
        <td>${p.stock}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="4">Nenhum produto com estoque baixo.</td></tr>`;
}

async function initProductsPage() {
  await populateCategorySelect();
  await renderProductsTable();

  $("#productForm").addEventListener("submit", saveProductFromForm);
  $("#clearProductForm").addEventListener("click", clearProductForm);
  $("#newProductBtn")?.addEventListener("click", clearProductForm);
  $("#productSearch").addEventListener("input", renderProductsTable);
}

async function populateCategorySelect() {
  const select = $("#productCategory");
  if (!select) return;

  const categories = await getCategories();

  if (!categories.length) {
    select.innerHTML = `<option value="">Cadastre uma categoria primeiro</option>`;
    return;
  }

  select.innerHTML = categories
    .map((category) => `<option value="${category.id}">${category.name}</option>`)
    .join("");
}

async function saveProductFromForm(event) {
  event.preventDefault();

  const currentId = $("#productId").value;

  if (!$("#productCategory").value) {
    alert("Cadastre uma categoria antes de salvar o produto.");
    return;
  }

  const product = {
    name: $("#productName").value.trim(),
    sku: $("#productSku").value.trim(),
    category_id: $("#productCategory").value,
    color: $("#productColor").value.trim(),
    price: Number($("#productPrice").value || 0),
    old_price: $("#productOldPrice").value ? Number($("#productOldPrice").value) : null,
    stock: Number($("#productStock").value || 0),
    image_url: $("#productImage").value.trim(),
    description: $("#productDescription").value.trim(),
    active: $("#productActive").value === "true",
    featured: $("#productFeatured").value === "true"
  };

  let result;

  if (currentId) {
    result = await mugartSupabase
      .from("products")
      .update(product)
      .eq("id", currentId);
  } else {
    result = await mugartSupabase
      .from("products")
      .insert(product);
  }

  if (result.error) {
    console.error(result.error);
    alert("Erro ao salvar produto: " + result.error.message);
    return;
  }

  clearProductForm();
  await renderProductsTable();

  alert("Produto salvo com sucesso.");
}

function clearProductForm() {
  $("#productForm").reset();
  $("#productId").value = "";
  $("#productFormTitle").textContent = "Novo produto";
}

async function renderProductsTable() {
  const tbody = $("#productsTable");
  if (!tbody) return;

  const search = ($("#productSearch")?.value || "").toLowerCase();
  const products = await getProducts();

  const filtered = products.filter((product) => {
    return (
      product.name.toLowerCase().includes(search) ||
      (product.sku || "").toLowerCase().includes(search) ||
      (product.color || "").toLowerCase().includes(search) ||
      (product.categories?.name || "").toLowerCase().includes(search)
    );
  });

  tbody.innerHTML = filtered.length
    ? filtered.map((p) => `
      <tr>
        <td>
          <div class="product-mini">
            <img src="${p.image_url || "../assets/hero-caneca.png"}" alt="${p.name}">
            <div>
              <strong>${p.name}</strong><br>
              <small>${p.sku}</small>
            </div>
          </div>
        </td>
        <td>${p.categories ? p.categories.name : "-"}</td>
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

window.editProduct = async function(id) {
  const result = await mugartSupabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (result.error) {
    alert("Erro ao buscar produto: " + result.error.message);
    return;
  }

  const product = result.data;

  $("#productId").value = product.id;
  $("#productName").value = product.name;
  $("#productSku").value = product.sku;
  $("#productCategory").value = product.category_id || "";
  $("#productColor").value = product.color || "";
  $("#productPrice").value = product.price;
  $("#productOldPrice").value = product.old_price || "";
  $("#productStock").value = product.stock;
  $("#productImage").value = product.image_url || "";
  $("#productDescription").value = product.description || "";
  $("#productActive").value = String(product.active);
  $("#productFeatured").value = String(product.featured);
  $("#productFormTitle").textContent = "Editar produto";

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteProduct = async function(id) {
  if (!confirm("Deseja excluir este produto?")) return;

  const result = await mugartSupabase
    .from("products")
    .delete()
    .eq("id", id);

  if (result.error) {
    alert("Erro ao excluir produto: " + result.error.message);
    return;
  }

  await renderProductsTable();
};

async function initCategoriesPage() {
  await renderCategoriesList();

  $("#categoryForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = $("#categoryName").value.trim();
    if (!name) return;

    const result = await mugartSupabase
      .from("categories")
      .insert({
        name: name,
        slug: slugify(name),
        active: true
      });

    if (result.error) {
      alert("Erro ao salvar categoria: " + result.error.message);
      return;
    }

    $("#categoryName").value = "";
    await renderCategoriesList();
  });
}

async function renderCategoriesList() {
  const list = $("#categoriesList");
  if (!list) return;

  const categories = await getCategories();

  list.innerHTML = categories.length
    ? categories.map((category) => `
      <span class="category-chip-admin">
        ${category.name}
        <button type="button" onclick="deleteCategory('${category.id}')">x</button>
      </span>
    `).join("")
    : `<p>Nenhuma categoria cadastrada.</p>`;
}

window.deleteCategory = async function(id) {
  if (!confirm("Deseja excluir esta categoria?")) return;

  const result = await mugartSupabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (result.error) {
    alert("Erro ao excluir categoria. Verifique se existem produtos vinculados.");
    return;
  }

  await renderCategoriesList();
};

async function initOrdersPage() {
  $("#createFakeOrder")?.addEventListener("click", createFakeOrder);
  await renderOrdersTable();
}

async function createFakeOrder() {
  const customerResult = await mugartSupabase
    .from("customers")
    .insert({
      name: "Cliente Teste",
      email: "cliente@email.com",
      phone: "(11) 99999-9999"
    })
    .select()
    .single();

  if (customerResult.error) {
    alert("Erro ao criar cliente teste: " + customerResult.error.message);
    return;
  }

  const orderResult = await mugartSupabase
    .from("orders")
    .insert({
      order_number: `MUG-${Date.now()}`,
      customer_id: customerResult.data.id,
      payment_method: "pix",
      payment_status: "pending",
      status: "pending",
      total: 79.80
    });

  if (orderResult.error) {
    alert("Erro ao criar pedido teste: " + orderResult.error.message);
    return;
  }

  await renderOrdersTable();
}

async function renderOrdersTable() {
  const tbody = $("#ordersTable");
  if (!tbody) return;

  const orders = await getOrders();

  tbody.innerHTML = orders.length
    ? orders.map((order) => `
      <tr>
        <td><strong>${order.order_number}</strong></td>
        <td>${order.customers ? order.customers.name : "-"}</td>
        <td>${order.payment_method || "-"}</td>
        <td>
          <select onchange="updateOrderStatus('${order.id}', this.value)">
            ${["pending", "paid", "production", "completed", "cancelled"].map((status) => `
              <option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>
            `).join("")}
          </select>
        </td>
        <td>${formatMoney(order.total)}</td>
        <td>${new Date(order.created_at).toLocaleString("pt-BR")}</td>
        <td>
          <div class="row-actions">
            <button class="delete" type="button" onclick="deleteOrder('${order.id}')">Excluir</button>
          </div>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="7">Nenhum pedido encontrado.</td></tr>`;
}

window.updateOrderStatus = async function(id, status) {
  const result = await mugartSupabase
    .from("orders")
    .update({ status: status })
    .eq("id", id);

  if (result.error) {
    alert("Erro ao atualizar status: " + result.error.message);
  }
};

window.deleteOrder = async function(id) {
  if (!confirm("Deseja excluir este pedido?")) return;

  const result = await mugartSupabase
    .from("orders")
    .delete()
    .eq("id", id);

  if (result.error) {
    alert("Erro ao excluir pedido: " + result.error.message);
    return;
  }

  await renderOrdersTable();
};
