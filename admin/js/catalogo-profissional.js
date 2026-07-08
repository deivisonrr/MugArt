/* ==========================================================
   MugArt Catálogo Profissional v1
   Arquivo complementar: admin/js/catalogo-profissional.js

   IMPORTANTE:
   Este arquivo depende de:
   - supabase-js
   - admin/js/supabase-config.js
   - admin/js/admin.js
========================================================== */

const CATALOG_BUCKET = "product-images";

function catalog$(selector) {
  return document.querySelector(selector);
}

function catalogAll(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function catalogSlugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function catalogMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

document.addEventListener("DOMContentLoaded", () => {
  if (!catalog$("#productForm")) return;
  injectProfessionalCatalogUI();
  bindProfessionalCatalogEvents();
});

function injectProfessionalCatalogUI() {
  const productForm = catalog$("#productForm");
  const existing = catalog$("#professionalCatalogPanel");

  if (!productForm || existing) return;

  productForm.insertAdjacentHTML("afterend", `
    <section class="admin-panel" id="professionalCatalogPanel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Catálogo Pro</p>
          <h2>Galeria, Variações e Tags</h2>
        </div>
      </div>

      <p style="color:rgba(255,255,255,.68);line-height:1.5;margin-bottom:18px;">
        Primeiro salve o produto. Depois clique em editar para adicionar imagens, variações e etiquetas.
      </p>

      <div class="catalog-tabs">
        <button type="button" class="catalog-tab active" data-tab="gallery">Galeria</button>
        <button type="button" class="catalog-tab" data-tab="variants">Variações</button>
        <button type="button" class="catalog-tab" data-tab="tags">Tags</button>
        <button type="button" class="catalog-tab" data-tab="seo">SEO</button>
      </div>

      <div class="catalog-section active" id="catalog-gallery">
        <div class="form-grid">
          <label class="full">
            Nova imagem da galeria
            <input id="galleryImageUrl" placeholder="URL será preenchida automaticamente após upload" />

            <div class="upload-box">
              <div class="image-preview-wrap">
                <img id="galleryImagePreview" src="" alt="Preview da galeria" />
                <span id="galleryImagePlaceholder">Nenhuma imagem selecionada</span>
              </div>

              <div class="upload-actions">
                <label class="upload-btn">
                  Escolher imagem
                  <input id="galleryImageFile" type="file" accept="image/png,image/jpeg,image/webp" />
                </label>

                <button id="uploadGalleryImageBtn" type="button" class="upload-send-btn">
                  Enviar imagem
                </button>

                <button id="addGalleryImageBtn" type="button">
                  Adicionar à galeria
                </button>
              </div>
            </div>
          </label>
        </div>

        <div class="gallery-grid" id="galleryGrid"></div>
      </div>

      <div class="catalog-section" id="catalog-variants">
        <div class="form-grid">
          <label>
            Cor da variação
            <input id="variantColor" placeholder="Vermelha" />
          </label>

          <label>
            SKU da variação
            <input id="variantSku" placeholder="MC-COR-VERM-001" />
          </label>

          <label>
            Preço
            <input id="variantPrice" type="number" step="0.01" min="0" placeholder="44.90" />
          </label>

          <label>
            Preço promocional
            <input id="variantOldPrice" type="number" step="0.01" min="0" placeholder="54.90" />
          </label>

          <label>
            Estoque
            <input id="variantStock" type="number" step="1" min="0" placeholder="10" />
          </label>

          <label>
            URL da imagem
            <input id="variantImageUrl" placeholder="Opcional" />
          </label>
        </div>

        <div class="form-actions">
          <button id="addVariantBtn" type="button">Adicionar variação</button>
        </div>

        <div class="variant-list" id="variantList"></div>
      </div>

      <div class="catalog-section" id="catalog-tags">
        <div class="form-grid">
          <label>
            Nova tag
            <select id="productTagSelect">
              <option value="promocao">Promoção</option>
              <option value="lancamento">Lançamento</option>
              <option value="mais-vendido">Mais vendido</option>
              <option value="frete-gratis">Frete grátis</option>
              <option value="novo">Novo</option>
            </select>
          </label>
        </div>

        <div class="form-actions">
          <button id="addProductTagBtn" type="button">Adicionar tag</button>
        </div>

        <div class="tag-list" id="tagList"></div>
      </div>

      <div class="catalog-section" id="catalog-seo">
        <div class="form-grid">
          <label>
            Slug
            <input id="productSlug" placeholder="caneca-coracao" />
          </label>

          <label>
            Título SEO
            <input id="productSeoTitle" placeholder="Caneca Coração Personalizada | MugArt" />
          </label>

          <label class="full">
            Descrição SEO
            <textarea id="productSeoDescription" rows="3" placeholder="Descrição para buscadores"></textarea>
          </label>
        </div>

        <div class="form-actions">
          <button id="saveSeoBtn" type="button">Salvar SEO</button>
        </div>
      </div>
    </section>
  `);
}

function bindProfessionalCatalogEvents() {
  catalogAll(".catalog-tab").forEach((button) => {
    button.addEventListener("click", () => {
      catalogAll(".catalog-tab").forEach((item) => item.classList.remove("active"));
      catalogAll(".catalog-section").forEach((item) => item.classList.remove("active"));

      button.classList.add("active");
      catalog$(`#catalog-${button.dataset.tab}`).classList.add("active");
    });
  });

  catalog$("#galleryImageFile")?.addEventListener("change", previewGalleryImage);
  catalog$("#uploadGalleryImageBtn")?.addEventListener("click", uploadGalleryImage);
  catalog$("#addGalleryImageBtn")?.addEventListener("click", addGalleryImage);
  catalog$("#addVariantBtn")?.addEventListener("click", addVariant);
  catalog$("#addProductTagBtn")?.addEventListener("click", addProductTag);
  catalog$("#saveSeoBtn")?.addEventListener("click", saveProductSeo);

  const originalEditProduct = window.editProduct;

  window.editProduct = async function(id) {
    if (typeof originalEditProduct === "function") {
      await originalEditProduct(id);
    }

    await loadProfessionalCatalogData(id);
  };
}

function getCurrentProductId() {
  const id = catalog$("#productId")?.value;
  if (!id) {
    alert("Primeiro salve o produto. Depois clique em Editar para adicionar galeria, variações e tags.");
    return null;
  }

  return id;
}

function previewGalleryImage(event) {
  const file = event.target.files?.[0];
  const preview = catalog$("#galleryImagePreview");
  const placeholder = catalog$("#galleryImagePlaceholder");

  if (!file || !preview) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.style.display = "block";
    if (placeholder) placeholder.style.display = "none";
  };

  reader.readAsDataURL(file);
}

async function uploadGalleryImage() {
  const productId = getCurrentProductId();
  if (!productId) return;

  const file = catalog$("#galleryImageFile")?.files?.[0];

  if (!file) {
    alert("Escolha uma imagem primeiro.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("A imagem deve ter no máximo 5MB.");
    return;
  }

  const extension = file.name.split(".").pop().toLowerCase();
  const fileName = `galeria-${productId}-${Date.now()}.${extension}`;
  const filePath = `produtos/${fileName}`;

  const btn = catalog$("#uploadGalleryImageBtn");
  const originalText = btn.textContent;
  btn.textContent = "Enviando...";
  btn.disabled = true;

  const uploadResult = await mugartSupabase.storage
    .from(CATALOG_BUCKET)
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
    .from(CATALOG_BUCKET)
    .getPublicUrl(filePath);

  catalog$("#galleryImageUrl").value = publicResult.data.publicUrl;

  alert("Imagem enviada. Agora clique em Adicionar à galeria.");
}

async function addGalleryImage() {
  const productId = getCurrentProductId();
  if (!productId) return;

  const imageUrl = catalog$("#galleryImageUrl").value.trim();

  if (!imageUrl) {
    alert("Envie ou cole a URL da imagem.");
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

  catalog$("#galleryImageUrl").value = "";
  catalog$("#galleryImageFile").value = "";
  catalog$("#galleryImagePreview").removeAttribute("src");
  catalog$("#galleryImagePreview").style.display = "none";
  catalog$("#galleryImagePlaceholder").style.display = "block";

  await renderGallery(productId);
}

async function renderGallery(productId) {
  const grid = catalog$("#galleryGrid");
  if (!grid) return;

  const result = await mugartSupabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (result.error) {
    alert("Erro ao carregar galeria: " + result.error.message);
    return;
  }

  const images = result.data || [];

  grid.innerHTML = images.length
    ? images.map((image) => `
      <article class="gallery-card">
        <img src="${image.image_url}" alt="Imagem do produto">
        <strong>${image.is_main ? "Principal" : "Galeria"}</strong>
        <button class="gallery-main-btn" type="button" onclick="setMainImage('${productId}', '${image.id}', '${image.image_url}')">
          Definir principal
        </button>
        <button type="button" onclick="deleteGalleryImage('${productId}', '${image.id}')">
          Remover
        </button>
      </article>
    `).join("")
    : `<p style="color:rgba(255,255,255,.65);">Nenhuma imagem na galeria.</p>`;
}

window.setMainImage = async function(productId, imageId, imageUrl) {
  await mugartSupabase
    .from("product_images")
    .update({ is_main: false })
    .eq("product_id", productId);

  const result = await mugartSupabase
    .from("product_images")
    .update({ is_main: true })
    .eq("id", imageId);

  if (result.error) {
    alert("Erro ao definir imagem principal.");
    return;
  }

  await mugartSupabase
    .from("products")
    .update({ image_url: imageUrl })
    .eq("id", productId);

  catalog$("#productImage").value = imageUrl;

  if (typeof updateImagePreviewFromUrl === "function") {
    updateImagePreviewFromUrl();
  }

  await renderGallery(productId);
};

window.deleteGalleryImage = async function(productId, imageId) {
  if (!confirm("Remover imagem da galeria?")) return;

  const result = await mugartSupabase
    .from("product_images")
    .delete()
    .eq("id", imageId);

  if (result.error) {
    alert("Erro ao remover imagem.");
    return;
  }

  await renderGallery(productId);
};

async function addVariant() {
  const productId = getCurrentProductId();
  if (!productId) return;

  const variant = {
    product_id: productId,
    color: catalog$("#variantColor").value.trim(),
    sku: catalog$("#variantSku").value.trim(),
    price: Number(catalog$("#variantPrice").value || 0),
    old_price: catalog$("#variantOldPrice").value ? Number(catalog$("#variantOldPrice").value) : null,
    stock: Number(catalog$("#variantStock").value || 0),
    image_url: catalog$("#variantImageUrl").value.trim() || null,
    active: true
  };

  if (!variant.color || !variant.sku || !variant.price) {
    alert("Preencha cor, SKU e preço da variação.");
    return;
  }

  const result = await mugartSupabase
    .from("product_variants")
    .insert(variant);

  if (result.error) {
    alert("Erro ao salvar variação: " + result.error.message);
    return;
  }

  catalog$("#variantColor").value = "";
  catalog$("#variantSku").value = "";
  catalog$("#variantPrice").value = "";
  catalog$("#variantOldPrice").value = "";
  catalog$("#variantStock").value = "";
  catalog$("#variantImageUrl").value = "";

  await renderVariants(productId);
}

async function renderVariants(productId) {
  const list = catalog$("#variantList");
  if (!list) return;

  const result = await mugartSupabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (result.error) {
    alert("Erro ao carregar variações.");
    return;
  }

  const variants = result.data || [];

  list.innerHTML = variants.length
    ? variants.map((variant) => `
      <article class="variant-card">
        <header>
          <div>
            <h4>${variant.color}</h4>
            <small>${variant.sku}</small>
          </div>
          <button type="button" onclick="deleteVariant('${productId}', '${variant.id}')">
            Remover
          </button>
        </header>

        <div class="variant-meta">
          <span>Preço: <strong>${catalogMoney(variant.price)}</strong></span>
          ${variant.old_price ? `<span>De: ${catalogMoney(variant.old_price)}</span>` : ""}
          <span>Estoque: ${variant.stock}</span>
        </div>
      </article>
    `).join("")
    : `<p style="color:rgba(255,255,255,.65);">Nenhuma variação cadastrada.</p>`;
}

window.deleteVariant = async function(productId, variantId) {
  if (!confirm("Remover variação?")) return;

  const result = await mugartSupabase
    .from("product_variants")
    .delete()
    .eq("id", variantId);

  if (result.error) {
    alert("Erro ao remover variação.");
    return;
  }

  await renderVariants(productId);
};

async function addProductTag() {
  const productId = getCurrentProductId();
  if (!productId) return;

  const tag = catalog$("#productTagSelect").value;

  const result = await mugartSupabase
    .from("product_tags")
    .insert({
      product_id: productId,
      tag: tag
    });

  if (result.error) {
    alert("Erro ao adicionar tag: " + result.error.message);
    return;
  }

  await renderTags(productId);
}

async function renderTags(productId) {
  const list = catalog$("#tagList");
  if (!list) return;

  const result = await mugartSupabase
    .from("product_tags")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (result.error) {
    alert("Erro ao carregar tags.");
    return;
  }

  const tags = result.data || [];

  list.innerHTML = tags.length
    ? tags.map((tag) => `
      <span class="tag-pill">
        ${tag.tag}
        <button type="button" onclick="deleteProductTag('${productId}', '${tag.id}')">x</button>
      </span>
    `).join("")
    : `<p style="color:rgba(255,255,255,.65);">Nenhuma tag cadastrada.</p>`;
}

window.deleteProductTag = async function(productId, tagId) {
  const result = await mugartSupabase
    .from("product_tags")
    .delete()
    .eq("id", tagId);

  if (result.error) {
    alert("Erro ao remover tag.");
    return;
  }

  await renderTags(productId);
};

async function saveProductSeo() {
  const productId = getCurrentProductId();
  if (!productId) return;

  const result = await mugartSupabase
    .from("products")
    .update({
      slug: catalog$("#productSlug").value.trim(),
      seo_title: catalog$("#productSeoTitle").value.trim(),
      seo_description: catalog$("#productSeoDescription").value.trim()
    })
    .eq("id", productId);

  if (result.error) {
    alert("Erro ao salvar SEO: " + result.error.message);
    return;
  }

  alert("SEO salvo com sucesso.");
}

async function loadProfessionalCatalogData(productId) {
  const productResult = await mugartSupabase
    .from("products")
    .select("slug, seo_title, seo_description")
    .eq("id", productId)
    .single();

  if (!productResult.error && productResult.data) {
    catalog$("#productSlug").value = productResult.data.slug || "";
    catalog$("#productSeoTitle").value = productResult.data.seo_title || "";
    catalog$("#productSeoDescription").value = productResult.data.seo_description || "";
  }

  await renderGallery(productId);
  await renderVariants(productId);
  await renderTags(productId);
}
