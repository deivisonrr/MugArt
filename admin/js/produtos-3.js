/* ==========================================================
   MugArt Produtos 3.0
   Arquivo: admin/js/produtos-3.js
========================================================== */

const ADMIN3_BUCKET = "product-images";

const Admin3State = {
  products: [],
  categories: [],
  currentProductId: null,
  filters: {
    search: "",
    category: "todos",
    status: "todos",
    view: "cards"
  }
};

function a3(selector) {
  return document.querySelector(selector);
}

function a3all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function a3Money(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}


function a3ToLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function a3ToIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function a3PromotionActive(start, end) {
  const now = Date.now();
  const starts = start ? new Date(start).getTime() : null;
  const ends = end ? new Date(end).getTime() : null;

  if (starts && now < starts) return false;
  if (ends && now > ends) return false;
  return true;
}

function a3EffectivePrice(normalPrice, promotionalPrice, startsAt, endsAt) {
  const normal = Number(normalPrice || 0);
  const promotional = Number(promotionalPrice || 0);

  if (
    promotional > 0 &&
    promotional < normal &&
    a3PromotionActive(startsAt, endsAt)
  ) {
    return promotional;
  }

  return normal || promotional;
}

async function generateNextProductSku() {
  let highest = 0;

  (Admin3State.products || []).forEach((row) => {
    const match = String(row.sku || "").match(/^MUG-(\d+)$/i);
    if (match) highest = Math.max(highest, Number(match[1]));
  });

  const result = await mugartSupabase
    .from("products")
    .select("sku")
    .ilike("sku", "MUG-%");

  if (!result.error) {
    (result.data || []).forEach((row) => {
      const match = String(row.sku || "").match(/^MUG-(\d+)$/i);
      if (match) highest = Math.max(highest, Number(match[1]));
    });
  }

  return `MUG-${String(highest + 1).padStart(6, "0")}`;
}

async function generateNextVariantSku(productSku) {
  const prefix = `${productSku}-V`;
  const result = await mugartSupabase
    .from("product_variants")
    .select("sku")
    .ilike("sku", `${prefix}%`);

  if (result.error) {
    console.error("Erro ao gerar SKU da variação:", result.error);
    return `${prefix}${Date.now().toString().slice(-3)}`;
  }

  let highest = 0;

  (result.data || []).forEach((row) => {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = String(row.sku || "").match(new RegExp(`^${escaped}(\\d+)$`, "i"));
    if (match) highest = Math.max(highest, Number(match[1]));
  });

  return `${prefix}${String(highest + 1).padStart(2, "0")}`;
}

function a3Slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}


async function normalizeExistingSkus() {
  const button = a3("#admin3NormalizeSkus");

  if (!Admin3State.products.length) {
    alert("Nenhum produto cadastrado.");
    return;
  }

  if (!confirm("Isso substituirá o SKU de todos os produtos e variações. Deseja continuar?")) {
    return;
  }

  const originalText = button?.textContent || "Padronizar SKUs";

  if (button) {
    button.disabled = true;
    button.textContent = "Padronizando...";
  }

  try {
    const orderedProducts = [...Admin3State.products].sort((a, b) => {
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });

    for (let index = 0; index < orderedProducts.length; index += 1) {
      const product = orderedProducts[index];
      const newSku = `MUG-${String(index + 1).padStart(6, "0")}`;

      const productResult = await mugartSupabase
        .from("products")
        .update({ sku: newSku })
        .eq("id", product.id);

      if (productResult.error) throw productResult.error;

      const variantsResult = await mugartSupabase
        .from("product_variants")
        .select("id, created_at")
        .eq("product_id", product.id)
        .order("created_at", { ascending: true });

      if (variantsResult.error) throw variantsResult.error;

      const variants = variantsResult.data || [];

      for (let variantIndex = 0; variantIndex < variants.length; variantIndex += 1) {
        const variantSku = `${newSku}-V${String(variantIndex + 1).padStart(2, "0")}`;

        const updateVariant = await mugartSupabase
          .from("product_variants")
          .update({ sku: variantSku })
          .eq("id", variants[variantIndex].id);

        if (updateVariant.error) throw updateVariant.error;
      }
    }

    await loadAdmin3Data();
    renderAdmin3();
    alert("SKUs atualizados com sucesso.");
  } catch (error) {
    console.error(error);
    alert("Erro ao padronizar SKUs: " + (error.message || error));
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.mugartSupabase) {
    alert("Supabase não carregou.");
    return;
  }

  bindAdmin3Events();
  await loadAdmin3Data();
  renderAdmin3();
});

function bindAdmin3Events() {
  a3("#openProductDrawer")?.addEventListener("click", () => openDrawer());
  a3("#admin3NormalizeSkus")?.addEventListener("click", normalizeExistingSkus);
  a3("#closeProductDrawer")?.addEventListener("click", closeDrawer);
  a3("#admin3Cancel")?.addEventListener("click", closeDrawer);
  a3("#admin3Overlay")?.addEventListener("click", closeDrawer);

  a3("#admin3Search")?.addEventListener("input", (event) => {
    Admin3State.filters.search = event.target.value;
    renderProducts();
  });

  a3("#admin3CategoryFilter")?.addEventListener("change", (event) => {
    Admin3State.filters.category = event.target.value;
    renderProducts();
  });

  a3("#admin3StatusFilter")?.addEventListener("change", (event) => {
    Admin3State.filters.status = event.target.value;
    renderProducts();
  });

  a3("#admin3ViewMode")?.addEventListener("change", (event) => {
    Admin3State.filters.view = event.target.value;
    renderProducts();
  });

  a3all(".admin3-tab").forEach((button) => {
    button.addEventListener("click", () => {
      a3all(".admin3-tab").forEach((item) => item.classList.remove("active"));
      a3all(".admin3-tab-panel").forEach((item) => item.classList.remove("active"));

      button.classList.add("active");
      a3(`#admin3-tab-${button.dataset.tab}`).classList.add("active");
    });
  });

  a3("#admin3ProductForm")?.addEventListener("submit", saveProduct);
  a3("#admin3ImageFile")?.addEventListener("change", previewImage);
  a3("#admin3UploadImageBtn")?.addEventListener("click", uploadImage);
  a3("#admin3AddGalleryBtn")?.addEventListener("click", addGalleryImage);
  a3("#admin3AddVariantBtn")?.addEventListener("click", addVariant);
  a3("#admin3GenerateSeoBtn")?.addEventListener("click", generateSeo);
  a3("#admin3ImageUrl")?.addEventListener("input", updateImagePreview);

  ["#admin3Name", "#admin3Slug", "#admin3SeoTitle", "#admin3SeoDescription"].forEach((selector) => {
    a3(selector)?.addEventListener("input", updateSeoPreview);
  });
}

async function loadAdmin3Data() {
  const categoriesResult = await mugartSupabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (categoriesResult.error) {
    alert("Erro ao carregar categorias: " + categoriesResult.error.message);
    return;
  }

  Admin3State.categories = categoriesResult.data || [];

  const productsResult = await mugartSupabase
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

  if (productsResult.error) {
    alert("Erro ao carregar produtos: " + productsResult.error.message);
    return;
  }

  Admin3State.products = productsResult.data || [];
}

function renderAdmin3() {
  renderCategoryOptions();
  renderMetrics();
  renderProducts();
}

function renderCategoryOptions() {
  const filter = a3("#admin3CategoryFilter");
  const field = a3("#admin3Category");

  if (filter) {
    filter.innerHTML = `<option value="todos">Todas</option>` + Admin3State.categories
      .map((category) => `<option value="${category.id}">${category.name}</option>`)
      .join("");
  }

  if (field) {
    field.innerHTML = Admin3State.categories.length
      ? Admin3State.categories.map((category) => `<option value="${category.id}">${category.name}</option>`).join("")
      : `<option value="">Cadastre uma categoria primeiro</option>`;
  }
}

function renderMetrics() {
  const products = Admin3State.products;

  const active = products.filter((p) => p.active).length;
  const stock = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  const low = products.filter((p) => Number(p.stock || 0) <= 5).length;
  const featured = products.filter((p) => p.featured).length;

  a3("#admin3ActiveProducts").textContent = active;
  a3("#admin3TotalStock").textContent = stock;
  a3("#admin3LowStock").textContent = low;
  a3("#admin3Featured").textContent = featured;
}

function getFilteredProducts() {
  const search = Admin3State.filters.search.toLowerCase();
  const category = Admin3State.filters.category;
  const status = Admin3State.filters.status;

  return Admin3State.products.filter((product) => {
    const matchesSearch =
      !search ||
      product.name.toLowerCase().includes(search) ||
      (product.sku || "").toLowerCase().includes(search) ||
      (product.color || "").toLowerCase().includes(search) ||
      (product.categories?.name || "").toLowerCase().includes(search);

    const matchesCategory = category === "todos" || product.category_id === category;

    let matchesStatus = true;

    if (status === "ativo") matchesStatus = product.active;
    if (status === "inativo") matchesStatus = !product.active;
    if (status === "baixo") matchesStatus = Number(product.stock || 0) <= 5;
    if (status === "destaque") matchesStatus = product.featured;

    return matchesSearch && matchesCategory && matchesStatus;
  });
}

function renderProducts() {
  const container = a3("#admin3Products");
  if (!container) return;

  const products = getFilteredProducts();
  container.className = "admin3-products " + Admin3State.filters.view;

  if (!products.length) {
    container.innerHTML = `<div class="admin3-empty">Nenhum produto encontrado.</div>`;
    return;
  }

  container.innerHTML = products.map((product) => {
    return Admin3State.filters.view === "cards"
      ? productCardTemplate(product)
      : productRowTemplate(product);
  }).join("");
}

function productCardTemplate(product) {
  return `
    <article class="admin3-product-card">
      <div class="photo">
        <img src="${product.image_url || "../assets/hero-caneca.png"}" alt="${product.name}">
      </div>

      <div>
        <h3>${product.name}</h3>
        <div class="sku">${product.sku || "-"}</div>
      </div>

      <div class="admin3-badges">
        <span class="admin3-badge">${product.categories ? product.categories.name : "Sem categoria"}</span>
        <span class="admin3-badge">${product.color || "Sem cor"}</span>
        <span class="admin3-badge ${Number(product.stock || 0) <= 5 ? "red" : ""}">Estoque: ${product.stock || 0}</span>
        ${product.featured ? `<span class="admin3-badge yellow">Destaque</span>` : ""}
        <span class="admin3-badge">${product.active ? "Ativo" : "Inativo"}</span>
      </div>

      <div class="admin3-price">
        ${a3Money(a3EffectivePrice(product.old_price || product.price, product.price, product.offer_starts_at, product.offer_ends_at))}
        ${product.old_price ? `<small style="display:block;text-decoration:line-through;opacity:.65">${a3Money(product.old_price)}</small>` : ""}
      </div>

      <div class="admin3-card-actions">
        <button type="button" class="edit" onclick="editAdmin3Product('${product.id}')">Editar</button>
        <button type="button" class="delete" onclick="deleteAdmin3Product('${product.id}')">Excluir</button>
      </div>
    </article>
  `;
}

function productRowTemplate(product) {
  return `
    <article class="admin3-product-row">
      <img src="${product.image_url || "../assets/hero-caneca.png"}" alt="${product.name}">

      <div>
        <h3>${product.name}</h3>
        <small>${product.sku || "-"}</small>
      </div>

      <div class="admin3-badges">
        <span class="admin3-badge">${product.categories ? product.categories.name : "Sem categoria"}</span>
        <span class="admin3-badge">${product.color || "Sem cor"}</span>
        <span class="admin3-badge ${Number(product.stock || 0) <= 5 ? "red" : ""}">Estoque: ${product.stock || 0}</span>
      </div>

      <div class="admin3-price">
        ${a3Money(a3EffectivePrice(product.old_price || product.price, product.price, product.offer_starts_at, product.offer_ends_at))}
        ${product.old_price ? `<small style="display:block;text-decoration:line-through;opacity:.65">${a3Money(product.old_price)}</small>` : ""}
      </div>

      <div class="admin3-card-actions">
        <button type="button" class="edit" onclick="editAdmin3Product('${product.id}')">Editar</button>
        <button type="button" class="delete" onclick="deleteAdmin3Product('${product.id}')">Excluir</button>
      </div>
    </article>
  `;
}

async function openDrawer(product) {
  a3("#admin3Drawer").classList.add("open");
  a3("#admin3Overlay").classList.add("open");

  if (!product) {
    resetForm();
    a3("#admin3DrawerTitle").textContent = "Novo produto";

    const sku = await generateNextProductSku();

    if (!Admin3State.currentProductId && a3("#admin3Sku")) {
      a3("#admin3Sku").value = sku;
    }
  }
}

function closeDrawer() {
  a3("#admin3Drawer").classList.remove("open");
  a3("#admin3Overlay").classList.remove("open");
}

function resetForm() {
  Admin3State.currentProductId = null;
  a3("#admin3ProductForm").reset();
  a3("#admin3ProductId").value = "";
  a3("#admin3Gallery").innerHTML = "";
  a3("#admin3Variants").innerHTML = "";
  if (a3("#admin3OfferStartsAt")) a3("#admin3OfferStartsAt").value = "";
  if (a3("#admin3OfferEndsAt")) a3("#admin3OfferEndsAt").value = "";
  if (a3("#admin3VariantOfferStartsAt")) a3("#admin3VariantOfferStartsAt").value = "";
  if (a3("#admin3VariantOfferEndsAt")) a3("#admin3VariantOfferEndsAt").value = "";
  updateImagePreview();
  updateSeoPreview();
}

window.editAdmin3Product = async function(id) {
  const product = Admin3State.products.find((item) => item.id === id);

  if (!product) return;

  Admin3State.currentProductId = id;
  openDrawer(product);

  a3("#admin3DrawerTitle").textContent = "Editar produto";
  a3("#admin3ProductId").value = product.id;
  a3("#admin3Name").value = product.name || "";
  a3("#admin3Sku").value = product.sku || "";
  a3("#admin3Category").value = product.category_id || "";
  a3("#admin3Color").value = product.color || "";
  a3("#admin3OldPrice").value = product.old_price || product.price || "";
  a3("#admin3Price").value =
    product.old_price && Number(product.price) < Number(product.old_price)
      ? product.price
      : "";
  a3("#admin3OfferStartsAt").value = a3ToLocalInput(product.offer_starts_at);
  a3("#admin3OfferEndsAt").value = a3ToLocalInput(product.offer_ends_at);
  a3("#admin3Stock").value = product.stock || "";
  a3("#admin3Active").value = String(product.active);
  a3("#admin3FeaturedField").value = String(product.featured);
  a3("#admin3Description").value = product.description || "";
  a3("#admin3ImageUrl").value = product.image_url || "";
  a3("#admin3Slug").value = product.slug || "";
  a3("#admin3SeoTitle").value = product.seo_title || "";
  a3("#admin3SeoDescription").value = product.seo_description || "";

  updateImagePreview();
  updateSeoPreview();

  await renderGallery(id);
  await renderVariants(id);

  const nextVariantSku = await generateNextVariantSku(product.sku || "");
  if (a3("#admin3VariantSku")) a3("#admin3VariantSku").value = nextVariantSku;
};

window.deleteAdmin3Product = async function(id) {
  if (!confirm("Deseja excluir este produto?")) return;

  const result = await mugartSupabase
    .from("products")
    .delete()
    .eq("id", id);

  if (result.error) {
    alert("Erro ao excluir produto: " + result.error.message);
    return;
  }

  await loadAdmin3Data();
  renderAdmin3();
};

async function saveProduct(event) {
  event.preventDefault();

  const currentId = a3("#admin3ProductId").value;

  if (!a3("#admin3Category").value) {
    alert("Cadastre uma categoria primeiro.");
    return;
  }

  let sku = a3("#admin3Sku").value.trim();

  if (!sku) {
    sku = await generateNextProductSku();
    a3("#admin3Sku").value = sku;
  }

  const normalPrice = Number(a3("#admin3OldPrice").value || 0);
  const promotionalPrice = a3("#admin3Price").value
    ? Number(a3("#admin3Price").value)
    : null;

  const offerStartsAt = a3ToIso(a3("#admin3OfferStartsAt").value);
  const offerEndsAt = a3ToIso(a3("#admin3OfferEndsAt").value);

  if (normalPrice <= 0) {
    alert("Informe um preço normal maior que zero.");
    return;
  }

  if (promotionalPrice !== null && promotionalPrice >= normalPrice) {
    alert("O preço promocional deve ser menor que o preço normal.");
    return;
  }

  if ((offerStartsAt || offerEndsAt) && promotionalPrice === null) {
    alert("Informe o preço promocional para usar o prazo da promoção.");
    return;
  }

  if (
    offerStartsAt &&
    offerEndsAt &&
    new Date(offerEndsAt).getTime() <= new Date(offerStartsAt).getTime()
  ) {
    alert("O fim da promoção deve ser posterior ao início.");
    return;
  }

  const storedPrice = promotionalPrice !== null ? promotionalPrice : normalPrice;

  const product = {
    name: a3("#admin3Name").value.trim(),
    sku,
    category_id: a3("#admin3Category").value,
    color: a3("#admin3Color").value.trim(),
    price: storedPrice,
    old_price: promotionalPrice !== null ? normalPrice : null,
    offer_starts_at: promotionalPrice !== null ? offerStartsAt : null,
    offer_ends_at: promotionalPrice !== null ? offerEndsAt : null,
    stock: Number(a3("#admin3Stock").value || 0),
    active: a3("#admin3Active").value === "true",
    featured: a3("#admin3FeaturedField").value === "true",
    description: a3("#admin3Description").value.trim(),
    image_url: a3("#admin3ImageUrl").value.trim(),
    slug: a3("#admin3Slug").value.trim() || a3Slugify(a3("#admin3Name").value),
    seo_title: a3("#admin3SeoTitle").value.trim(),
    seo_description: a3("#admin3SeoDescription").value.trim()
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
    alert("Erro ao salvar produto: " + result.error.message);
    return;
  }

  if (!currentId && result.data) {
    Admin3State.currentProductId = result.data.id;
    a3("#admin3ProductId").value = result.data.id;
  }

  await loadAdmin3Data();
  renderAdmin3();

  alert("Produto salvo com sucesso.");
}

function previewImage(event) {
  const file = event.target.files?.[0];
  const preview = a3("#admin3ImagePreview");
  const placeholder = a3("#admin3ImagePlaceholder");

  if (!file || !preview) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.style.display = "block";
    if (placeholder) placeholder.style.display = "none";
  };

  reader.readAsDataURL(file);
}

function updateImagePreview() {
  const url = a3("#admin3ImageUrl")?.value.trim();
  const preview = a3("#admin3ImagePreview");
  const placeholder = a3("#admin3ImagePlaceholder");

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

async function uploadImage() {
  const file = a3("#admin3ImageFile")?.files?.[0];

  if (!file) {
    alert("Escolha uma imagem primeiro.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("A imagem deve ter no máximo 5MB.");
    return;
  }

  const extension = file.name.split(".").pop().toLowerCase();
  const productName = a3("#admin3Name").value || "produto";
  const filePath = `produtos/${a3Slugify(productName)}-${Date.now()}.${extension}`;

  const btn = a3("#admin3UploadImageBtn");
  const originalText = btn.textContent;
  btn.textContent = "Enviando...";
  btn.disabled = true;

  const uploadResult = await mugartSupabase.storage
    .from(ADMIN3_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true
    });

  btn.textContent = originalText;
  btn.disabled = false;

  if (uploadResult.error) {
    alert("Erro ao enviar imagem: " + uploadResult.error.message);
    return;
  }

  const publicResult = mugartSupabase.storage
    .from(ADMIN3_BUCKET)
    .getPublicUrl(filePath);

  a3("#admin3ImageUrl").value = publicResult.data.publicUrl;
  updateImagePreview();

  alert("Imagem enviada com sucesso.");
}

async function addGalleryImage() {
  const productId = a3("#admin3ProductId").value;
  const imageUrl = a3("#admin3ImageUrl").value.trim();

  if (!productId) {
    alert("Salve o produto primeiro.");
    return;
  }

  if (!imageUrl) {
    alert("Envie ou informe uma imagem primeiro.");
    return;
  }

  const existing = await mugartSupabase
    .from("product_images")
    .select("id")
    .eq("product_id", productId);

  const isMain = !existing.data || existing.data.length === 0;

  const result = await mugartSupabase
    .from("product_images")
    .insert({
      product_id: productId,
      image_url: imageUrl,
      sort_order: existing.data ? existing.data.length + 1 : 1,
      is_main: isMain
    });

  if (result.error) {
    alert("Erro ao adicionar imagem: " + result.error.message);
    return;
  }

  await renderGallery(productId);
}

async function renderGallery(productId) {
  const result = await mugartSupabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  const container = a3("#admin3Gallery");

  if (result.error) {
    container.innerHTML = `<p>Erro ao carregar galeria.</p>`;
    return;
  }

  const images = result.data || [];

  container.innerHTML = images.length
    ? images.map((image) => `
      <article class="admin3-gallery-card">
        <img src="${image.image_url}" alt="Imagem">
        <button class="main" type="button" onclick="setAdmin3MainImage('${productId}', '${image.id}', '${image.image_url}')">
          Principal
        </button>
        <button type="button" onclick="deleteAdmin3Image('${productId}', '${image.id}')">Remover</button>
      </article>
    `).join("")
    : `<p style="color:rgba(255,255,255,.65)">Nenhuma imagem na galeria.</p>`;
}

window.setAdmin3MainImage = async function(productId, imageId, imageUrl) {
  await mugartSupabase
    .from("product_images")
    .update({ is_main: false })
    .eq("product_id", productId);

  await mugartSupabase
    .from("product_images")
    .update({ is_main: true })
    .eq("id", imageId);

  await mugartSupabase
    .from("products")
    .update({ image_url: imageUrl })
    .eq("id", productId);

  a3("#admin3ImageUrl").value = imageUrl;
  updateImagePreview();
  await renderGallery(productId);
  await loadAdmin3Data();
  renderAdmin3();
};

window.deleteAdmin3Image = async function(productId, imageId) {
  if (!confirm("Remover imagem?")) return;

  await mugartSupabase
    .from("product_images")
    .delete()
    .eq("id", imageId);

  await renderGallery(productId);
};

async function addVariant() {
  const productId = a3("#admin3ProductId").value;

  if (!productId) {
    alert("Salve o produto primeiro.");
    return;
  }

  const productSku = a3("#admin3Sku").value.trim();
  let variantSku = a3("#admin3VariantSku").value.trim();

  if (!variantSku) {
    variantSku = await generateNextVariantSku(productSku);
    a3("#admin3VariantSku").value = variantSku;
  }

  const normalPrice = Number(a3("#admin3VariantOldPrice").value || 0);
  const promotionalPrice = a3("#admin3VariantPrice").value
    ? Number(a3("#admin3VariantPrice").value)
    : null;

  const offerStartsAt = a3ToIso(a3("#admin3VariantOfferStartsAt").value);
  const offerEndsAt = a3ToIso(a3("#admin3VariantOfferEndsAt").value);

  if (!a3("#admin3VariantColor").value.trim()) {
    alert("Preencha a cor ou o nome da variação.");
    return;
  }

  if (normalPrice <= 0) {
    alert("Informe o preço normal da variação.");
    return;
  }

  if (promotionalPrice !== null && promotionalPrice >= normalPrice) {
    alert("O preço promocional da variação deve ser menor que o preço normal.");
    return;
  }

  if ((offerStartsAt || offerEndsAt) && promotionalPrice === null) {
    alert("Informe o preço promocional da variação para usar o prazo.");
    return;
  }

  if (
    offerStartsAt &&
    offerEndsAt &&
    new Date(offerEndsAt).getTime() <= new Date(offerStartsAt).getTime()
  ) {
    alert("O fim da promoção da variação deve ser posterior ao início.");
    return;
  }

  const variant = {
    product_id: productId,
    color: a3("#admin3VariantColor").value.trim(),
    sku: variantSku,
    price: promotionalPrice !== null ? promotionalPrice : normalPrice,
    old_price: promotionalPrice !== null ? normalPrice : null,
    offer_starts_at: promotionalPrice !== null ? offerStartsAt : null,
    offer_ends_at: promotionalPrice !== null ? offerEndsAt : null,
    stock: Number(a3("#admin3VariantStock").value || 0),
    image_url: a3("#admin3VariantImageUrl").value.trim() || null,
    active: true
  };

  const result = await mugartSupabase
    .from("product_variants")
    .insert(variant);

  if (result.error) {
    alert("Erro ao adicionar variação: " + result.error.message);
    return;
  }

  a3("#admin3VariantColor").value = "";
  a3("#admin3VariantSku").value = "";
  a3("#admin3VariantPrice").value = "";
  a3("#admin3VariantOldPrice").value = "";
  a3("#admin3VariantOfferStartsAt").value = "";
  a3("#admin3VariantOfferEndsAt").value = "";
  a3("#admin3VariantStock").value = "";
  a3("#admin3VariantImageUrl").value = "";

  await renderVariants(productId);

  const nextSku = await generateNextVariantSku(productSku);
  a3("#admin3VariantSku").value = nextSku;
}

async function renderVariants(productId) {
  const result = await mugartSupabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  const container = a3("#admin3Variants");

  if (result.error) {
    container.innerHTML = `<p>Erro ao carregar variações.</p>`;
    return;
  }

  const variants = result.data || [];

  container.innerHTML = variants.length
    ? variants.map((variant) => `
      <article class="admin3-variant-card">
        <header>
          <div>
            <h4>${variant.color}</h4>
            <small>${variant.sku}</small>
          </div>
          <button type="button" onclick="deleteAdmin3Variant('${productId}', '${variant.id}')">Remover</button>
        </header>
        <div class="admin3-variant-meta">
          <span>Preço atual: ${a3Money(a3EffectivePrice(variant.old_price || variant.price, variant.price, variant.offer_starts_at, variant.offer_ends_at))}</span>
          <span>Estoque: ${variant.stock}</span>
          ${variant.old_price ? `<span>Preço normal: ${a3Money(variant.old_price)}</span>` : ""}
          ${variant.offer_ends_at ? `<span>Promoção até: ${new Date(variant.offer_ends_at).toLocaleString("pt-BR")}</span>` : ""}
        </div>
      </article>
    `).join("")
    : `<p style="color:rgba(255,255,255,.65)">Nenhuma variação cadastrada.</p>`;
}

window.deleteAdmin3Variant = async function(productId, variantId) {
  if (!confirm("Remover variação?")) return;

  await mugartSupabase
    .from("product_variants")
    .delete()
    .eq("id", variantId);

  await renderVariants(productId);
};

function generateSeo() {
  const name = a3("#admin3Name").value.trim();
  const desc = a3("#admin3Description").value.trim();

  if (!name) {
    alert("Digite o nome do produto primeiro.");
    return;
  }

  a3("#admin3Slug").value = a3Slugify(name);
  a3("#admin3SeoTitle").value = `${name} | MugArt`;
  a3("#admin3SeoDescription").value = desc
    ? desc.slice(0, 155)
    : `${name} personalizada da MugArt. Caneca criativa, pronta para presentear e encantar.`;

  updateSeoPreview();
}

function updateSeoPreview() {
  const slug = a3("#admin3Slug")?.value || a3Slugify(a3("#admin3Name")?.value || "");
  const title = a3("#admin3SeoTitle")?.value || "Título SEO";
  const desc = a3("#admin3SeoDescription")?.value || "Descrição SEO";

  if (a3("#admin3SeoUrlPreview")) a3("#admin3SeoUrlPreview").textContent = `mugart.com.br/produto/${slug || "..."}`;
  if (a3("#admin3SeoTitlePreview")) a3("#admin3SeoTitlePreview").textContent = title;
  if (a3("#admin3SeoDescPreview")) a3("#admin3SeoDescPreview").textContent = desc;
}
