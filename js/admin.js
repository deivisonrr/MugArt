/* ==========================================================
   MugArt Admin + Supabase + Upload de Imagens
   Arquivo: admin/js/admin.js

   Login temporário:
   admin@mugart.com.br
   123456
========================================================== */

const ADMIN_KEYS = {
  auth: "mugart_admin_auth"
};

const STORAGE_BUCKET = "product-images";

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

/* ==========================
   LOGIN TEMPORÁRIO
========================== */

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

/* ==========================
   SUPABASE QUERIES
========================== */

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

/* ==========================
   DASHBOARD
========================== */

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

/* ==========================
   PRODUTOS
========================== */

async function initProductsPage() {
  await populateCategorySelect();
  setupImageUploadUI();
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

function setupImageUploadUI() {
  const imageInput = $("#productImage");
  if (!imageInput) return;

  const oldLabel = imageInput.closest("label");
  if (!oldLabel || $("#productImageFile")) return;

  oldLabel.classList.add("full");

  oldLabel.insertAdjacentHTML("beforeend", `
    <div class="upload-box">
      <div class="image-preview-wrap">
        <img id="productImagePreview" src="" alt="Preview do produto" />
        <span id="productImagePlaceholder">Nenhuma imagem selecionada</span>
      </div>

      <div class="upload-actions">
        <label class="upload-btn">
          Escolher imagem
          <input id="productImageFile" type="file" accept="image/png,image/jpeg,image/webp" />
        </label>

        <button id="uploadProductImageBtn" type="button" class="upload-send-btn">
          Enviar imagem
        </button>
      </div>

      <small class="upload-help">
        A imagem será enviada para o Supabase Storage e a URL será preenchida automaticamente.
      </small>
    </div>
  `);

  imageInput.placeholder = "A URL será preenchida automaticamente após upload";

  $("#productImageFile").addEventListener("change", previewSelectedImage);
  $("#uploadProductImageBtn").addEventListener("click", uploadSelectedProductImage);

  imageInput.addEventListener("input", updateImagePreviewFromUrl);
}

function previewSelectedImage(event) {
  const file = event.target.files?.[0];
  const preview = $("#productImagePreview");
  const placeholder = $("#productImagePlaceholder");

  if (!file || !preview) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.style.display = "block";

    if (placeholder) {
      placeholder.style.display = "none";
    }
  };

  reader.readAsDataURL(file);
}

function updateImagePreviewFromUrl() {
  const url = $("#productImage")?.value.trim();
  const preview = $("#productImagePreview");
  const placeholder = $("#productImagePlaceholder");

  if (!preview || !placeholder) return;

  if (url) {
    preview.src = url;
    preview.style.display = "block";
    placeholder.style.display = "none";
  } else {
    preview.removeAttribute("src");
    preview.style.display = "none";
    placeholder.style.display = "block";
  }
}

async function uploadSelectedProductImage() {
  const fileInput = $("#productImageFile");
  const nameInput = $("#productName");
  const imageInput = $("#productImage");

  const file = fileInput?.files?.[0];

  if (!file) {
    alert("Escolha uma imagem primeiro.");
    return;
  }

  const maxSizeMb = 5;
  if (file.size > maxSizeMb * 1024 * 1024) {
    alert("A imagem deve ter no máximo 5MB.");
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    alert("Use imagens JPG, PNG ou WEBP.");
    return;
  }

  const productName = nameInput?.value.trim() || "produto";
  const extension = file.name.split(".").pop().toLowerCase();
  const fileName = `${slugify(productName)}-${Date.now()}.${extension}`;
  const filePath = `produtos/${fileName}`;

  const btn = $("#uploadProductImageBtn");
  const originalText = btn.textContent;
  btn.textContent = "Enviando...";
  btn.disabled = true;

  const uploadResult = await mugartSupabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true
    });

  btn.textContent = originalText;
  btn.disabled = false;

  if (uploadResult.error) {
    console.error(uploadResult.error);
    alert("Erro ao enviar imagem: " + uploadResult.error.message);
    return;
  }

  const publicResult = mugartSupabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  const publicUrl = publicResult.data.publicUrl;

  imageInput.value = publicUrl;
  updateImagePreviewFromUrl();

  alert("Imagem enviada com sucesso.");
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

  const preview = $("#productImagePreview");
  const placeholder = $("#productImagePlaceholder");

  if (preview) {
    preview.removeAttribute("src");
    preview.style.display = "none";
  }

  if (placeholder) {
    placeholder.style.display = "block";
  }
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

  updateImagePreviewFromUrl();

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

/* ==========================
   CATEGORIAS
========================== */

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

/* ==========================
   PEDIDOS
========================== */

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
