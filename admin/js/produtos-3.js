/* ==========================================================
   MugArt Produtos 3.0
   Arquivo: admin/js/produtos-3.js
========================================================== */

const ADMIN3_BUCKET = "product-images";

const Admin3State = {
  products: [],
  categories: [],
  currentProductId: null,
  currentVariantId: null,
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


function admin3PromotionStatus(product) {
  const normal = Number(product.old_price || 0);
  const promo = Number(product.price || 0);

  if (!normal || !promo || promo >= normal) {
    return { key: "none", label: "Sem promoção" };
  }

  const now = Date.now();
  const starts = product.offer_starts_at ? new Date(product.offer_starts_at).getTime() : null;
  const ends = product.offer_ends_at ? new Date(product.offer_ends_at).getTime() : null;

  if (starts && now < starts) return { key: "scheduled", label: "Agendada" };
  if (ends && now > ends) return { key: "ended", label: "Encerrada" };
  return { key: "active", label: "Ativa" };
}

function updateAdmin3PromotionStatus() {
  const status = admin3PromotionStatus({
    old_price: Number(a3("#admin3OldPrice")?.value || 0),
    price: Number(a3("#admin3Price")?.value || 0),
    offer_starts_at: a3ToIso(a3("#admin3OfferStartsAt")?.value),
    offer_ends_at: a3ToIso(a3("#admin3OfferEndsAt")?.value)
  });

  if (a3("#admin3PromotionStatus")) {
    a3("#admin3PromotionStatus").textContent = status.label;
  }
}

window.duplicateAdmin3Product = async function(id) {
  const source = Admin3State.products.find((item) => item.id === id);
  if (!source) return;

  try {
    const sku = await generateNextProductSku();

    const payload = {
      name: `${source.name} - Cópia`,
      sku,
      category_id: source.category_id,
      color: source.color,
      price: source.price,
      old_price: source.old_price,
      offer_starts_at: source.offer_starts_at,
      offer_ends_at: source.offer_ends_at,
      stock: 0,
      active: false,
      featured: false,
      description: source.description,
      image_url: source.image_url,
      slug: `${a3Slugify(source.slug || source.name)}-copia-${Date.now().toString().slice(-4)}`,
      seo_title: source.seo_title,
      seo_description: source.seo_description,
      image_alt: source.image_alt || null,
      noindex: true,
      weight_kg: source.weight_kg || null,
      width_cm: source.width_cm || null,
      height_cm: source.height_cm || null,
      length_cm: source.length_cm || null
    };

    const result = await mugartSupabase
      .from("products")
      .insert(payload)
      .select()
      .single();

    if (result.error) throw result.error;

    const variantsResult = await mugartSupabase
      .from("product_variants")
      .select("*")
      .eq("product_id", id)
      .order("created_at", { ascending: true });

    if (!variantsResult.error && variantsResult.data?.length) {
      const variants = variantsResult.data.map((variant, index) => ({
        product_id: result.data.id,
        color: variant.color,
        sku: `${sku}-V${String(index + 1).padStart(2, "0")}`,
        price: variant.price,
        old_price: variant.old_price,
        offer_starts_at: variant.offer_starts_at,
        offer_ends_at: variant.offer_ends_at,
        stock: 0,
        image_url: variant.image_url,
        active: false
      }));

      const insertVariants = await mugartSupabase
        .from("product_variants")
        .insert(variants);

      if (insertVariants.error) throw insertVariants.error;
    }

    await loadAdmin3Data();
    renderAdmin3();
    alert("Produto duplicado como inativo.");
  } catch (error) {
    console.error(error);
    alert("Erro ao duplicar produto: " + (error.message || error));
  }
};

function exportAdmin3Csv() {
  const headers = [
    "name","sku","category_id","color","price","old_price","offer_starts_at",
    "offer_ends_at","stock","active","featured","description","image_url","slug",
    "seo_title","seo_description","ean","brand","supplier","product_type","min_stock","weight_kg","width_cm","height_cm","length_cm","focus_keyword","image_alt","noindex"
  ];

  const escapeCsv = (value) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const rows = Admin3State.products.map((product) =>
    headers.map((key) => escapeCsv(product[key])).join(";")
  );

  const csv = [headers.join(";"), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `mugart-produtos-${new Date().toISOString().slice(0,10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

async function importAdmin3Csv(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);

    if (lines.length < 2) {
      throw new Error("CSV vazio.");
    }

    const parseLine = (line) => {
      const result = [];
      let current = "";
      let quoted = false;

      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"') {
          if (quoted && line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else {
            quoted = !quoted;
          }
        } else if (char === ";" && !quoted) {
          result.push(current);
          current = "";
        } else {
          current += char;
        }
      }

      result.push(current);
      return result;
    };

    const headers = parseLine(lines[0]);
    const payload = lines.slice(1).map((line) => {
      const values = parseLine(line);
      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? null;
      });

      ["price","old_price","stock"].forEach((key) => {
        row[key] = row[key] === "" || row[key] == null ? null : Number(row[key]);
      });

      ["active","featured"].forEach((key) => {
        row[key] = String(row[key]).toLowerCase() === "true";
      });

      return row;
    });

    const result = await mugartSupabase.from("products").upsert(payload, {
      onConflict: "sku"
    });

    if (result.error) throw result.error;

    await loadAdmin3Data();
    renderAdmin3();
    alert("CSV importado com sucesso.");
  } catch (error) {
    console.error(error);
    alert("Erro ao importar CSV: " + (error.message || error));
  } finally {
    event.target.value = "";
  }
}


function bindProductSelectionEvents() {
  a3all(".admin3-product-select").forEach((checkbox) => checkbox.addEventListener("change", updateBulkBar));
  updateBulkBar();
}
function selectedProductIds(){ return a3all(".admin3-product-select:checked").map((item)=>item.value); }
function updateBulkBar(){ const ids=selectedProductIds(); const bar=a3("#admin3BulkBar"); if(bar) bar.style.display=ids.length?"flex":"none"; if(a3("#admin3SelectedCount")) a3("#admin3SelectedCount").textContent=ids.length; }
async function bulkUpdateProducts(changes,message){ const ids=selectedProductIds(); if(!ids.length)return; const r=await mugartSupabase.from("products").update(changes).in("id",ids); if(r.error){alert("Erro na ação em massa: "+r.error.message);return;} await loadAdmin3Data(); renderAdmin3(); alert(message); }
async function bulkDeleteProducts(){ const ids=selectedProductIds(); if(!ids.length||!confirm(`Excluir ${ids.length} produto(s)?`))return; const r=await mugartSupabase.from("products").delete().in("id",ids); if(r.error){alert("Erro ao excluir produtos: "+r.error.message);return;} await loadAdmin3Data(); renderAdmin3(); alert("Produtos excluídos."); }
function validateEan(value){ const d=String(value||"").replace(/\D/g,""); return !d || [8,12,13,14].includes(d.length); }


function a3PublicationLabel(status, publishAt) {
  if (status === "scheduled") {
    if (publishAt && new Date(publishAt).getTime() <= Date.now()) {
      return "Pronto para publicar";
    }
    return "Agendado";
  }
  if (status === "published") return "Publicado";
  return "Rascunho";
}

function updatePublicationPreview() {
  const status = a3("#admin3PublicationStatus")?.value || "draft";
  const publishAt = a3("#admin3PublishAt")?.value || null;
  const label = a3PublicationLabel(status, publishAt);
  if (a3("#admin3PublicationPreview")) {
    a3("#admin3PublicationPreview").textContent = label;
  }
}

async function saveProductHistory(productId, action, beforeData, afterData) {
  if (!productId) return;

  const session = await mugartSupabase.auth.getSession();
  const user = session.data.session?.user;

  const result = await mugartSupabase
    .from("product_history")
    .insert({
      product_id: productId,
      action,
      changed_by: user?.email || "admin",
      before_data: beforeData || null,
      after_data: afterData || null
    });

  if (result.error) {
    console.warn("Histórico não salvo:", result.error.message);
  }
}

async function renderProductHistory(productId) {
  const container = a3("#admin3HistoryList");
  if (!container) return;

  if (!productId) {
    container.innerHTML = '<p style="color:rgba(255,255,255,.65)">Salve ou edite um produto para visualizar o histórico.</p>';
    return;
  }

  const result = await mugartSupabase
    .from("product_history")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (result.error) {
    container.innerHTML = `<p>Não foi possível carregar o histórico: ${result.error.message}</p>`;
    return;
  }

  const rows = result.data || [];
  container.innerHTML = rows.length
    ? rows.map((row) => `
      <article class="admin3-variant-card">
        <header>
          <div>
            <h4>${row.action || "Alteração"}</h4>
            <small>${new Date(row.created_at).toLocaleString("pt-BR")} · ${row.changed_by || "admin"}</small>
          </div>
        </header>
        <div class="admin3-variant-meta">
          <span>${row.after_data?.name || row.before_data?.name || "Produto"}</span>
          ${row.after_data?.sku ? `<span>SKU: ${row.after_data.sku}</span>` : ""}
        </div>
      </article>
    `).join("")
    : '<p style="color:rgba(255,255,255,.65)">Nenhuma alteração registrada.</p>';
}

function exportProductsJson() {
  const payload = {
    exported_at: new Date().toISOString(),
    products: Admin3State.products
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mugart-produtos-backup-${new Date().toISOString().slice(0,10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function publishScheduledProducts() {
  const now = new Date().toISOString();
  const result = await mugartSupabase
    .from("products")
    .update({ publication_status: "published", active: true })
    .eq("publication_status", "scheduled")
    .lte("publish_at", now);

  if (result.error) {
    console.warn("Publicação agendada:", result.error.message);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.mugartSupabase) {
    alert("Supabase não carregou.");
    return;
  }

  bindAdmin3Events();
  await publishScheduledProducts();
  await loadAdmin3Data();
  renderAdmin3();
});

function bindAdmin3Events() {
  a3("#openProductDrawer")?.addEventListener("click", () => openDrawer());
  a3("#admin3NormalizeSkus")?.addEventListener("click", normalizeExistingSkus);
  a3("#admin3ExportCsv")?.addEventListener("click", exportAdmin3Csv);
  a3("#admin3ImportCsv")?.addEventListener("change", importAdmin3Csv);
  a3("#admin3RefreshHistory")?.addEventListener("click", () => renderProductHistory(a3("#admin3ProductId")?.value));
  a3("#admin3ExportJson")?.addEventListener("click", exportProductsJson);
  a3("#admin3PublicationStatus")?.addEventListener("change", updatePublicationPreview);
  a3("#admin3PublishAt")?.addEventListener("change", updatePublicationPreview);
  a3("#admin3BulkActivate")?.addEventListener("click", () => bulkUpdateProducts({ active: true }, "Produtos ativados."));
  a3("#admin3BulkDeactivate")?.addEventListener("click", () => bulkUpdateProducts({ active: false }, "Produtos desativados."));
  a3("#admin3BulkFeatured")?.addEventListener("click", () => bulkUpdateProducts({ featured: true }, "Produtos destacados."));
  a3("#admin3BulkUnfeatured")?.addEventListener("click", () => bulkUpdateProducts({ featured: false }, "Destaque removido."));
  a3("#admin3BulkDelete")?.addEventListener("click", bulkDeleteProducts);
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

  ["#admin3OldPrice", "#admin3Price", "#admin3OfferStartsAt", "#admin3OfferEndsAt"].forEach((selector) => {
    a3(selector)?.addEventListener("input", updateAdmin3PromotionStatus);
    a3(selector)?.addEventListener("change", updateAdmin3PromotionStatus);
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
  const low = products.filter((p) => Number(p.stock || 0) <= Number(p.min_stock ?? 5)).length;
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
    if (status === "baixo") matchesStatus = Number(product.stock || 0) <= Number(product.min_stock ?? 5);
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
    return Admin3State.filters.view === "cards" ? productCardTemplate(product) : productRowTemplate(product);
  }).join("");
  bindProductSelectionEvents();
}

function productCardTemplate(product) {
  return `
    <article class="admin3-product-card">
      <label style="position:absolute;z-index:2;margin:10px"><input type="checkbox" class="admin3-product-select" value="${product.id}"></label>
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
        <span class="admin3-badge ${Number(product.stock || 0) <= Number(product.min_stock ?? 5) ? "red" : ""}">Estoque: ${product.stock || 0}</span>
        ${product.featured ? `<span class="admin3-badge yellow">Destaque</span>` : ""}
        ${admin3PromotionStatus(product).key !== "none" ? `<span class="admin3-badge">${admin3PromotionStatus(product).label}</span>` : ""}
        ${product.product_type === "digital" ? `<span class="admin3-badge">Digital</span>` : ""}
        <span class="admin3-badge">${a3PublicationLabel(product.publication_status || (product.active ? "published" : "draft"), product.publish_at)}</span>
        ${product.badge_text ? `<span class="admin3-badge yellow">${product.badge_text}</span>` : ""}
        <span class="admin3-badge">${product.active ? "Ativo" : "Inativo"}</span>
      </div>

      <div class="admin3-price">
        ${a3Money(a3EffectivePrice(product.old_price || product.price, product.price, product.offer_starts_at, product.offer_ends_at))}
        ${product.old_price ? `<small style="display:block;text-decoration:line-through;opacity:.65">${a3Money(product.old_price)}</small>` : ""}
      </div>

      <div class="admin3-card-actions">
        <button type="button" class="edit" onclick="editAdmin3Product('${product.id}')">Editar</button>
        <button type="button" onclick="duplicateAdmin3Product('${product.id}')">Duplicar</button>
        <button type="button" class="delete" onclick="deleteAdmin3Product('${product.id}')">Excluir</button>
      </div>
    </article>
  `;
}

function productRowTemplate(product) {
  return `
    <article class="admin3-product-row">
      <label><input type="checkbox" class="admin3-product-select" value="${product.id}"></label>
      <img src="${product.image_url || "../assets/hero-caneca.png"}" alt="${product.name}">

      <div>
        <h3>${product.name}</h3>
        <small>${product.sku || "-"}</small>
      </div>

      <div class="admin3-badges">
        <span class="admin3-badge">${product.categories ? product.categories.name : "Sem categoria"}</span>
        <span class="admin3-badge">${product.color || "Sem cor"}</span>
        <span class="admin3-badge ${Number(product.stock || 0) <= Number(product.min_stock ?? 5) ? "red" : ""}">Estoque: ${product.stock || 0}</span>
      </div>

      <div class="admin3-price">
        ${a3Money(a3EffectivePrice(product.old_price || product.price, product.price, product.offer_starts_at, product.offer_ends_at))}
        ${product.old_price ? `<small style="display:block;text-decoration:line-through;opacity:.65">${a3Money(product.old_price)}</small>` : ""}
      </div>

      <div class="admin3-card-actions">
        <button type="button" class="edit" onclick="editAdmin3Product('${product.id}')">Editar</button>
        <button type="button" onclick="duplicateAdmin3Product('${product.id}')">Duplicar</button>
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
  Admin3State.currentVariantId = null;
  a3("#admin3ProductForm").reset();
  a3("#admin3ProductId").value = "";
  a3("#admin3Gallery").innerHTML = "";
  a3("#admin3Variants").innerHTML = "";
  if (a3("#admin3OfferStartsAt")) a3("#admin3OfferStartsAt").value = "";
  if (a3("#admin3OfferEndsAt")) a3("#admin3OfferEndsAt").value = "";
  if (a3("#admin3VariantOfferStartsAt")) a3("#admin3VariantOfferStartsAt").value = "";
  if (a3("#admin3VariantOfferEndsAt")) a3("#admin3VariantOfferEndsAt").value = "";
  if (a3("#admin3PublicationStatus")) a3("#admin3PublicationStatus").value = "published";
  if (a3("#admin3Active")) a3("#admin3Active").value = "true";
  if (a3("#admin3FeaturedField")) a3("#admin3FeaturedField").value = "false";
  if (a3("#admin3Noindex")) a3("#admin3Noindex").value = "false";
  if (a3("#admin3PublishAt")) a3("#admin3PublishAt").value = "";
  if (a3("#admin3BadgeText")) a3("#admin3BadgeText").value = "";
  if (a3("#admin3BadgeType")) a3("#admin3BadgeType").value = "promo";
  if (a3("#admin3InternalNotes")) a3("#admin3InternalNotes").value = "";
  updateImagePreview();
  updateSeoPreview();
  if (typeof updateAdmin3PromotionStatus === "function") updateAdmin3PromotionStatus();
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
  if (a3("#admin3Ean")) a3("#admin3Ean").value = product.ean || "";
  if (a3("#admin3Brand")) a3("#admin3Brand").value = product.brand || "MugArt";
  if (a3("#admin3Supplier")) a3("#admin3Supplier").value = product.supplier || "";
  if (a3("#admin3ProductType")) a3("#admin3ProductType").value = product.product_type || "physical";
  a3("#admin3OldPrice").value = product.old_price || product.price || "";
  a3("#admin3Price").value =
    product.old_price && Number(product.price) < Number(product.old_price)
      ? product.price
      : "";
  a3("#admin3OfferStartsAt").value = a3ToLocalInput(product.offer_starts_at);
  a3("#admin3OfferEndsAt").value = a3ToLocalInput(product.offer_ends_at);
  a3("#admin3Stock").value = product.stock || "";
  if (a3("#admin3MinStock")) a3("#admin3MinStock").value = product.min_stock ?? 5;
  a3("#admin3Active").value = String(product.active);
  a3("#admin3FeaturedField").value = String(product.featured);
  a3("#admin3Description").value = product.description || "";
  if (a3("#admin3Weight")) a3("#admin3Weight").value = product.weight_kg || "";
  if (a3("#admin3Width")) a3("#admin3Width").value = product.width_cm || "";
  if (a3("#admin3Height")) a3("#admin3Height").value = product.height_cm || "";
  if (a3("#admin3Length")) a3("#admin3Length").value = product.length_cm || "";
  a3("#admin3ImageUrl").value = product.image_url || "";
  a3("#admin3Slug").value = product.slug || "";
  a3("#admin3SeoTitle").value = product.seo_title || "";
  a3("#admin3SeoDescription").value = product.seo_description || "";
  if (a3("#admin3PublicationStatus")) a3("#admin3PublicationStatus").value = product.publication_status || (product.active ? "published" : "draft");
  if (a3("#admin3PublishAt")) a3("#admin3PublishAt").value = a3ToLocalInput(product.publish_at);
  if (a3("#admin3BadgeText")) a3("#admin3BadgeText").value = product.badge_text || "";
  if (a3("#admin3BadgeType")) a3("#admin3BadgeType").value = product.badge_type || "promo";
  if (a3("#admin3InternalNotes")) a3("#admin3InternalNotes").value = product.internal_notes || "";
  if (a3("#admin3FocusKeyword")) a3("#admin3FocusKeyword").value = product.focus_keyword || "";
  if (a3("#admin3ImageAlt")) a3("#admin3ImageAlt").value = product.image_alt || "";
  if (a3("#admin3Noindex")) a3("#admin3Noindex").value = String(product.noindex === true);

  updateImagePreview();
  updateSeoPreview();
  updateAdmin3PromotionStatus();
  updatePublicationPreview();

  await renderGallery(id);
  await renderVariants(id);
  await renderProductHistory(id);

  const nextVariantSku = await generateNextVariantSku(product.sku || "");
  if (a3("#admin3VariantSku")) a3("#admin3VariantSku").value = nextVariantSku;
};

window.deleteAdmin3Product = async function(id) {
  if (!confirm("Deseja excluir este produto?")) return;

  const beforeData = Admin3State.products.find((item) => item.id === id) || null;
  await saveProductHistory(id, "Produto excluído", beforeData, null);

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

  let beforeData = null;
  if (currentId) {
    beforeData = Admin3State.products.find((item) => item.id === currentId) || null;
  }

  if (!a3("#admin3Category").value) {
    alert("Cadastre uma categoria primeiro.");
    return;
  }

  let sku = a3("#admin3Sku").value.trim();

  if (!sku) {
    sku = await generateNextProductSku();
    a3("#admin3Sku").value = sku;
  }

  if (!validateEan(a3("#admin3Ean")?.value)) { alert("O EAN/GTIN deve ter 8, 12, 13 ou 14 números."); return; }
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

  const publicationStatus = a3("#admin3PublicationStatus")?.value || "published";
  const publishAt = a3ToIso(a3("#admin3PublishAt")?.value);

  if (publicationStatus === "scheduled" && !publishAt) {
    alert("Informe a data e a hora da publicação agendada.");
    return;
  }

  const storedPrice = promotionalPrice !== null ? promotionalPrice : normalPrice;

  // Se o produto foi marcado como ativo, ele deve ficar publicado.
  // Isso evita que o status editorial "Rascunho" force active=false.
  const activeValue = a3("#admin3Active").value === "true";
  const finalPublicationStatus = activeValue ? "published" : publicationStatus;

  const product = {
    name: a3("#admin3Name").value.trim(),
    sku,
    category_id: a3("#admin3Category").value,
    color: a3("#admin3Color").value.trim(),
    ean: a3("#admin3Ean")?.value.replace(/\D/g, "") || null,
    brand: a3("#admin3Brand")?.value.trim() || "MugArt",
    supplier: a3("#admin3Supplier")?.value.trim() || null,
    product_type: a3("#admin3ProductType")?.value || "physical",
    price: storedPrice,
    old_price: promotionalPrice !== null ? normalPrice : null,
    offer_starts_at: promotionalPrice !== null ? offerStartsAt : null,
    offer_ends_at: promotionalPrice !== null ? offerEndsAt : null,
    stock: Number(a3("#admin3Stock").value || 0),
    min_stock: Number(a3("#admin3MinStock")?.value || 5),
    active: activeValue,
    featured: a3("#admin3FeaturedField").value === "true",
    description: a3("#admin3Description").value.trim(),
    image_url: a3("#admin3ImageUrl").value.trim(),
    slug: a3("#admin3Slug").value.trim() || a3Slugify(a3("#admin3Name").value),
    seo_title: a3("#admin3SeoTitle").value.trim(),
    seo_description: a3("#admin3SeoDescription").value.trim(),
    focus_keyword: a3("#admin3FocusKeyword")?.value.trim() || null,
    image_alt: a3("#admin3ImageAlt")?.value.trim() || null,
    noindex: a3("#admin3Noindex")?.value === "true",
    publication_status: finalPublicationStatus,
    publish_at:
      finalPublicationStatus === "scheduled"
        ? a3ToIso(a3("#admin3PublishAt")?.value)
        : null,
    badge_text: a3("#admin3BadgeText")?.value || null,
    badge_type: a3("#admin3BadgeType")?.value || "promo",
    internal_notes: a3("#admin3InternalNotes")?.value.trim() || null,
    weight_kg: a3("#admin3Weight")?.value ? Number(a3("#admin3Weight").value) : null,
    width_cm: a3("#admin3Width")?.value ? Number(a3("#admin3Width").value) : null,
    height_cm: a3("#admin3Height")?.value ? Number(a3("#admin3Height").value) : null,
    length_cm: a3("#admin3Length")?.value ? Number(a3("#admin3Length").value) : null
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

  const savedId = result.data?.id || currentId || Admin3State.currentProductId;
  await saveProductHistory(
    savedId,
    currentId ? "Produto atualizado" : "Produto criado",
    beforeData,
    result.data || product
  );

  await loadAdmin3Data();
  renderAdmin3();
  await renderProductHistory(savedId);

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

function clearVariantForm(generateNextSku = true) {
  Admin3State.currentVariantId = null;

  if (a3("#admin3VariantColor")) a3("#admin3VariantColor").value = "";
  if (a3("#admin3VariantPrice")) a3("#admin3VariantPrice").value = "";
  if (a3("#admin3VariantOldPrice")) a3("#admin3VariantOldPrice").value = "";
  if (a3("#admin3VariantOfferStartsAt")) a3("#admin3VariantOfferStartsAt").value = "";
  if (a3("#admin3VariantOfferEndsAt")) a3("#admin3VariantOfferEndsAt").value = "";
  if (a3("#admin3VariantStock")) a3("#admin3VariantStock").value = "";
  if (a3("#admin3VariantImageUrl")) a3("#admin3VariantImageUrl").value = "";

  const button = a3("#admin3AddVariantBtn");
  if (button) button.textContent = "Adicionar variação";

  if (generateNextSku && a3("#admin3VariantSku")) {
    const productSku = a3("#admin3Sku")?.value.trim();
    a3("#admin3VariantSku").value = "";

    if (productSku) {
      generateNextVariantSku(productSku).then((sku) => {
        if (!Admin3State.currentVariantId && a3("#admin3VariantSku")) {
          a3("#admin3VariantSku").value = sku;
        }
      });
    }
  }
}

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

  if (offerStartsAt && offerEndsAt && new Date(offerEndsAt).getTime() <= new Date(offerStartsAt).getTime()) {
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

  const editingId = Admin3State.currentVariantId;
  let result;

  if (editingId) {
    result = await mugartSupabase
      .from("product_variants")
      .update(variant)
      .eq("id", editingId)
      .eq("product_id", productId);
  } else {
    result = await mugartSupabase
      .from("product_variants")
      .insert(variant);
  }

  if (result.error) {
    alert(`Erro ao ${editingId ? "editar" : "adicionar"} variação: ` + result.error.message);
    return;
  }

  clearVariantForm(false);
  await renderVariants(productId);

  const nextSku = await generateNextVariantSku(productSku);
  if (a3("#admin3VariantSku")) a3("#admin3VariantSku").value = nextSku;

  alert(editingId ? "Variação atualizada com sucesso." : "Variação adicionada com sucesso.");
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
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="edit" onclick="editAdmin3Variant('${productId}', '${variant.id}')">Editar</button>
            <button type="button" onclick="deleteAdmin3Variant('${productId}', '${variant.id}')">Remover</button>
          </div>
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

window.editAdmin3Variant = async function(productId, variantId) {
  const result = await mugartSupabase
    .from("product_variants")
    .select("*")
    .eq("id", variantId)
    .eq("product_id", productId)
    .single();

  if (result.error || !result.data) {
    alert("Erro ao carregar variação: " + (result.error?.message || "Variação não encontrada."));
    return;
  }

  const variant = result.data;
  Admin3State.currentVariantId = variant.id;

  a3("#admin3VariantColor").value = variant.color || "";
  a3("#admin3VariantSku").value = variant.sku || "";
  a3("#admin3VariantOldPrice").value = variant.old_price || variant.price || "";
  a3("#admin3VariantPrice").value = variant.old_price && Number(variant.price) < Number(variant.old_price)
    ? variant.price
    : "";
  a3("#admin3VariantOfferStartsAt").value = a3ToLocalInput(variant.offer_starts_at);
  a3("#admin3VariantOfferEndsAt").value = a3ToLocalInput(variant.offer_ends_at);
  a3("#admin3VariantStock").value = variant.stock ?? 0;
  a3("#admin3VariantImageUrl").value = variant.image_url || "";

  const button = a3("#admin3AddVariantBtn");
  if (button) button.textContent = "Salvar alteração";

  a3("#admin3VariantColor")?.focus();
};

window.deleteAdmin3Variant = async function(productId, variantId) {
  if (!confirm("Remover variação?")) return;

  const result = await mugartSupabase
    .from("product_variants")
    .delete()
    .eq("id", variantId)
    .eq("product_id", productId);

  if (result.error) {
    alert("Erro ao remover variação: " + result.error.message);
    return;
  }

  if (Admin3State.currentVariantId === variantId) {
    clearVariantForm();
  }

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