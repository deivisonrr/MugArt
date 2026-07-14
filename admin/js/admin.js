/* ==========================================================
   MugArt Admin
   Funcionalidades do painel
   A autenticação fica em admin-auth.js
========================================================== */

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

async function initializeAdminFeatures() {
  if (!window.mugartSupabase) {
    console.error("[Admin] Supabase não carregou.");
    return;
  }

  if ($("#metricProducts")) await renderDashboard();
  if ($("#productForm")) await initProductsPage();
  if ($("#categoryForm")) await initCategoriesPage();
  if ($("#ordersTable")) await initOrdersPage();
  if ($("#analyticsSettingsForm")) await initAnalyticsSettingsPage();
}

window.addEventListener(
  "mugart-admin-ready",
  initializeAdminFeatures,
  { once: true }
);

/* SUPABASE */


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

/* DASHBOARD */

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

/* PRODUTOS */

async function initProductsPage() {
  await populateCategorySelect();
  bindProductImageUpload();
  bindProductSeoFields();
  await renderProductsTable();

  $("#productForm").addEventListener("submit", saveProductFromForm);
  $("#clearProductForm").addEventListener("click", clearProductForm);
  $("#newProductBtn")?.addEventListener("click", clearProductForm);
  $("#productSearch").addEventListener("input", renderProductsTable);
}

function bindProductImageUpload() {
  const fileInput = $("#productImageFile");
  const uploadBtn = $("#uploadProductImageBtn");
  const urlInput = $("#productImage");

  if (fileInput) {
    fileInput.addEventListener("change", previewSelectedImage);
  }

  if (uploadBtn) {
    uploadBtn.addEventListener("click", uploadSelectedProductImage);
  }

  if (urlInput) {
    urlInput.addEventListener("input", updateImagePreviewFromUrl);
  }
}


function generateProductSlug(value) {
  return slugify(value).slice(0, 180);
}

function bindProductSeoFields() {
  const nameInput = $("#productName");
  const slugInput = $("#productSlug");
  const titleInput = $("#productSeoTitle");
  const descriptionInput = $("#productSeoDescription");

  nameInput?.addEventListener("input", () => {
    if (!slugInput.dataset.edited) {
      slugInput.value = generateProductSlug(nameInput.value);
    }

    if (!titleInput.dataset.edited) {
      titleInput.value = nameInput.value
        ? `${nameInput.value} | MugArt`
        : "";
    }

    updateProductSeoPreview();
  });

  slugInput?.addEventListener("input", () => {
    slugInput.dataset.edited = "true";
    slugInput.value = generateProductSlug(slugInput.value);
    updateProductSeoPreview();
  });

  titleInput?.addEventListener("input", () => {
    titleInput.dataset.edited = "true";
    updateProductSeoPreview();
  });

  descriptionInput?.addEventListener("input", updateProductSeoPreview);
  $("#productImageAlt")?.addEventListener("input", updateProductSeoPreview);
  $("#productCanonicalUrl")?.addEventListener("input", updateProductSeoPreview);
  $("#productNoindex")?.addEventListener("change", updateProductSeoPreview);

  updateProductSeoPreview();
}

function updateProductSeoPreview() {
  const productName = $("#productName")?.value.trim() || "Título do produto";
  const slug = $("#productSlug")?.value.trim() || "...";
  const title = $("#productSeoTitle")?.value.trim() || `${productName} | MugArt`;
  const description =
    $("#productSeoDescription")?.value.trim() ||
    "A descrição SEO aparecerá aqui.";

  const generatedUrl =
    `https://mugart.com.br/produto.html?slug=${encodeURIComponent(slug)}`;

  const previewUrl =
    "https://mugart.com.br/produto.html?slug=" + slug;

$("#seoPreviewUrl").textContent =
    $("#productCanonicalUrl").value.trim() || previewUrl;
  $("#seoTitleCount").textContent = String(
    $("#productSeoTitle")?.value.length || 0
  );
  $("#seoDescriptionCount").textContent = String(
    $("#productSeoDescription")?.value.length || 0
  );
  $("#seoPreviewTitle").textContent = title;
  $("#seoPreviewUrl").textContent =
    $("#productCanonicalUrl")?.value.trim() || generatedUrl;
  $("#seoPreviewDescription").textContent = description;

  const complete =
    Boolean($("#productSlug")?.value.trim()) &&
    Boolean($("#productSeoTitle")?.value.trim()) &&
    Boolean($("#productSeoDescription")?.value.trim()) &&
    Boolean($("#productImageAlt")?.value.trim());

  const completion = $("#seoCompletion");
  if (completion) {
    completion.textContent = complete ? "SEO completo" : "SEO incompleto";
    completion.classList.toggle("complete", complete);
  }
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
    featured: $("#productFeatured").value === "true",
    slug: $("#productSlug").value.trim() || generateProductSlug($("#productName").value),
    seo_title: $("#productSeoTitle").value.trim() || null,
    seo_description: $("#productSeoDescription").value.trim() || null,
    image_alt: $("#productImageAlt").value.trim() || null,
    canonical_url: $("#productCanonicalUrl").value.trim() || null,
    noindex: $("#productNoindex").value === "true"
  };

  let result;

  if (currentId) {
    result = await mugartSupabase
      .from("products")
      .update(product)
      .eq("id", currentId)
      .select()
      .single();
  } else {
    result = await mugartSupabase
      .from("products")
      .insert(product)
      .select()
      .single();
  }

  if (result.error) {
    console.error(result.error);
    alert("Erro ao salvar produto: " + result.error.message);
    return;
  }

  const savedProduct = result.data;

  $("#productId").value = savedProduct.id;
  $("#productFormTitle").textContent = "Editar produto";

  if (typeof window.initializeProductVariants === "function") {
    await window.initializeProductVariants(savedProduct.id);
  }

  if (typeof window.initializeProductImages === "function") {
    await window.initializeProductImages(savedProduct.id);
  }

  await renderProductsTable();

  alert("Produto salvo com sucesso. Agora você pode cadastrar ou editar as variações.");
}

function clearProductForm() {
  $("#productForm").reset();
  $("#productId").value = "";
  $("#productFormTitle").textContent = "Novo produto";

  if ($("#productSlug")) {
    $("#productSlug").dataset.edited = "";
  }

  if ($("#productSeoTitle")) {
    $("#productSeoTitle").dataset.edited = "";
  }

  updateProductSeoPreview();

  const preview = $("#productImagePreview");
  const placeholder = $("#productImagePlaceholder");

  if (preview) {
    preview.removeAttribute("src");
    preview.style.display = "none";
  }

  if (placeholder) {
    placeholder.style.display = "block";
  }

  if (typeof window.initializeProductVariants === "function") {
    window.initializeProductVariants(null);
  }

  if (typeof window.initializeProductImages === "function") {
    window.initializeProductImages(null);
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
  $("#productSlug").value = product.slug || generateProductSlug(product.name);
  $("#productSeoTitle").value = product.seo_title || "";
  $("#productSeoDescription").value = product.seo_description || "";
  $("#productImageAlt").value = product.image_alt || "";
  $("#productCanonicalUrl").value = product.canonical_url || "";
  $("#productNoindex").value = String(product.noindex === true);
  $("#productSlug").dataset.edited = product.slug ? "true" : "";
  $("#productSeoTitle").dataset.edited = product.seo_title ? "true" : "";
  $("#productFormTitle").textContent = "Editar produto";

  updateProductSeoPreview();

  updateImagePreviewFromUrl();

  if (typeof window.initializeProductVariants === "function") {
    await window.initializeProductVariants(product.id);
  }

  if (typeof window.initializeProductImages === "function") {
    await window.initializeProductImages(product.id);
  }

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

/* CATEGORIAS */

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

/* PEDIDOS */

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

/* ==========================
   CONFIGURAÇÕES DE ANALYTICS
========================== */

async function initAnalyticsSettingsPage() {
  await loadAnalyticsSettings();

  const form = $("#analyticsSettingsForm");

  if (!form) return;

  form.addEventListener("submit", saveAnalyticsSettings);
}

async function loadAnalyticsSettings() {
  const gtmIdInput = $("#googleTagManagerId");
  const ga4IdInput = $("#googleAnalyticsId");
  const gtmActiveInput = $("#googleTagManagerActive");
  const ga4ActiveInput = $("#googleAnalyticsActive");
  const statusElement = $("#analyticsSettingsStatus");

  if (
    !gtmIdInput ||
    !ga4IdInput ||
    !gtmActiveInput ||
    !ga4ActiveInput
  ) {
    return;
  }

  if (statusElement) {
    statusElement.textContent = "Carregando configurações...";
    statusElement.className = "settings-status loading";
  }

  const result = await mugartSupabase
    .from("site_settings")
    .select("setting_key, setting_value, is_active")
    .in("setting_key", [
      "google_tag_manager_id",
      "google_analytics_id"
    ]);

  if (result.error) {
    console.error(
      "Erro ao carregar configurações de Analytics:",
      result.error
    );

    if (statusElement) {
      statusElement.textContent =
        "Não foi possível carregar as configurações.";

      statusElement.className = "settings-status error";
    }

    return;
  }

  const settings = {};

  for (const item of result.data || []) {
    settings[item.setting_key] = item;
  }

  const gtmSetting = settings.google_tag_manager_id;
  const ga4Setting = settings.google_analytics_id;

  gtmIdInput.value = gtmSetting?.setting_value || "";
  ga4IdInput.value = ga4Setting?.setting_value || "";

  gtmActiveInput.checked = gtmSetting?.is_active === true;
  ga4ActiveInput.checked = ga4Setting?.is_active === true;

  updateAnalyticsStatusCards();

  if (statusElement) {
    statusElement.textContent = "Configurações carregadas.";
    statusElement.className = "settings-status success";
  }
}

async function saveAnalyticsSettings(event) {
  event.preventDefault();

  const gtmId = $("#googleTagManagerId")
    .value
    .trim()
    .toUpperCase();

  const ga4Id = $("#googleAnalyticsId")
    .value
    .trim()
    .toUpperCase();

  const gtmActive = $("#googleTagManagerActive").checked;
  const ga4Active = $("#googleAnalyticsActive").checked;

  const saveButton = $("#saveAnalyticsSettings");
  const statusElement = $("#analyticsSettingsStatus");

  if (gtmId && !validateGtmId(gtmId)) {
    alert(
      "O ID do Google Tag Manager deve seguir o formato GTM-XXXXXXX."
    );

    $("#googleTagManagerId").focus();
    return;
  }

  if (ga4Id && !validateGa4Id(ga4Id)) {
    alert(
      "O ID do Google Analytics deve seguir o formato G-XXXXXXXXXX."
    );

    $("#googleAnalyticsId").focus();
    return;
  }

  if (gtmActive && !gtmId) {
    alert(
      "Informe o ID do Google Tag Manager antes de ativá-lo."
    );

    $("#googleTagManagerId").focus();
    return;
  }

  if (ga4Active && !ga4Id) {
    alert(
      "Informe o ID do Google Analytics antes de ativá-lo."
    );

    $("#googleAnalyticsId").focus();
    return;
  }

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Salvando...";
  }

  if (statusElement) {
    statusElement.textContent = "Salvando configurações...";
    statusElement.className = "settings-status loading";
  }

  const settings = [
    {
      setting_key: "google_tag_manager_id",
      setting_value: gtmId,
      is_active: gtmActive,
      updated_at: new Date().toISOString()
    },
    {
      setting_key: "google_analytics_id",
      setting_value: ga4Id,
      is_active: ga4Active,
      updated_at: new Date().toISOString()
    }
  ];

  const result = await mugartSupabase
    .from("site_settings")
    .upsert(settings, {
      onConflict: "setting_key"
    });

  if (saveButton) {
    saveButton.disabled = false;
    saveButton.textContent = "Salvar configurações";
  }

  if (result.error) {
    console.error(
      "Erro ao salvar configurações de Analytics:",
      result.error
    );

    if (statusElement) {
      statusElement.textContent =
        "Erro ao salvar as configurações.";

      statusElement.className = "settings-status error";
    }

    alert(
      "Erro ao salvar configurações: " +
      result.error.message
    );

    return;
  }

  updateAnalyticsStatusCards();

  if (statusElement) {
    statusElement.textContent =
      "Configurações salvas com sucesso.";

    statusElement.className = "settings-status success";
  }

  alert(
    "Configurações de Google Tag Manager e Google Analytics salvas."
  );
}

function validateGtmId(value) {
  if (!value) return true;

  return /^GTM-[A-Z0-9]+$/i.test(value);
}

function validateGa4Id(value) {
  if (!value) return true;

  return /^G-[A-Z0-9]+$/i.test(value);
}

function updateAnalyticsStatusCards() {
  const gtmId = $("#googleTagManagerId")?.value.trim();
  const ga4Id = $("#googleAnalyticsId")?.value.trim();

  const gtmActive = $("#googleTagManagerActive")?.checked;
  const ga4Active = $("#googleAnalyticsActive")?.checked;

  updateIntegrationStatus(
    "#gtmIntegrationStatus",
    gtmActive,
    gtmId
  );

  updateIntegrationStatus(
    "#ga4IntegrationStatus",
    ga4Active,
    ga4Id
  );
}

function updateIntegrationStatus(
  selector,
  isActive,
  integrationId
) {
  const element = $(selector);

  if (!element) return;

  if (isActive && integrationId) {
    element.textContent = "Ativo";
    element.className = "integration-status active";
    return;
  }

  element.textContent = "Inativo";
  element.className = "integration-status inactive";
}

document.addEventListener("change", (event) => {
  if (
    event.target.matches("#googleTagManagerActive") ||
    event.target.matches("#googleAnalyticsActive")
  ) {
    updateAnalyticsStatusCards();
  }
});

document.addEventListener("input", (event) => {
  if (
    event.target.matches("#googleTagManagerId") ||
    event.target.matches("#googleAnalyticsId")
  ) {
    updateAnalyticsStatusCards();
  }
});
