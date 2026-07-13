/* ==========================================================
   MugArt Admin - Variações de Produtos
   Tabela: product_variants
========================================================== */

const ProductVariantsState = {
  productId: null,
  variants: [],
  editingId: null,
  loading: false
};

function pv(selector) {
  return document.querySelector(selector);
}

function pvEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function pvMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function pvMessage(message) {
  alert(message);
}

document.addEventListener("DOMContentLoaded", () => {
  pv("#saveVariantButton")?.addEventListener("click", saveProductVariant);
  pv("#newVariantButton")?.addEventListener("click", () => {
    resetVariantForm();
    pv("#variantColor")?.focus();
  });
  pv("#cancelVariantEdit")?.addEventListener("click", resetVariantForm);
  pv("#variantImageUrl")?.addEventListener("input", updateVariantPreview);
  resetVariantForm();
});

window.initializeProductVariants = async function(productId) {
  ProductVariantsState.productId = productId ? String(productId) : null;
  pv("#variantProductId").value = ProductVariantsState.productId || "";

  const noProduct = pv("#variantNoProduct");
  const manager = pv("#variantManager");

  if (!ProductVariantsState.productId) {
    ProductVariantsState.variants = [];
    noProduct?.classList.remove("hidden");
    manager?.classList.add("hidden");
    resetVariantForm();
    renderProductVariants();
    return;
  }

  noProduct?.classList.add("hidden");
  manager?.classList.remove("hidden");
  resetVariantForm();
  await loadProductVariants();
};

async function loadProductVariants() {
  if (!ProductVariantsState.productId) return;

  setVariantsLoading(true);

  const result = await window.mugartSupabase
    .from("product_variants")
    .select("id, product_id, color, sku, price, old_price, stock, image_url, active, created_at")
    .eq("product_id", ProductVariantsState.productId)
    .order("active", { ascending: false })
    .order("created_at", { ascending: true });

  setVariantsLoading(false);

  if (result.error) {
    console.error(result.error);
    pvMessage("Erro ao carregar variações: " + result.error.message);
    return;
  }

  ProductVariantsState.variants = result.data || [];
  renderProductVariants();
}

function setVariantsLoading(loading) {
  ProductVariantsState.loading = loading;
  pv("#variantsLoading")?.classList.toggle("hidden", !loading);
  pv("#variantsList")?.classList.toggle("hidden", loading);
}

function renderProductVariants() {
  const list = pv("#variantsList");
  const empty = pv("#variantsEmpty");
  const count = pv("#variantsCount");
  if (!list) return;

  const variants = ProductVariantsState.variants;
  count.textContent = `${variants.length} variaç${variants.length === 1 ? "ão" : "ões"}`;

  if (!variants.length) {
    list.innerHTML = "";
    empty?.classList.remove("hidden");
    return;
  }

  empty?.classList.add("hidden");

  list.innerHTML = variants.map((variant) => {
    const active = variant.active !== false;
    const oldPrice = variant.old_price && Number(variant.old_price) > Number(variant.price)
      ? `<small>${pvMoney(variant.old_price)}</small>`
      : "";

    return `
      <article class="variant-card ${active ? "" : "variant-card-inactive"}">
        <div class="variant-card-image">
          ${
            variant.image_url
              ? `<img src="${pvEscape(variant.image_url)}" alt="${pvEscape(variant.color)}">`
              : `<span>Sem imagem</span>`
          }
          <em class="${active ? "active" : "inactive"}">${active ? "Ativa" : "Inativa"}</em>
        </div>

        <div class="variant-card-content">
          <div class="variant-card-title">
            <div>
              <h4>${pvEscape(variant.color || "Sem nome")}</h4>
              <span>SKU: ${pvEscape(variant.sku || "-")}</span>
            </div>

            <div class="variant-card-price">
              <strong>${pvMoney(variant.price)}</strong>
              ${oldPrice}
            </div>
          </div>

          <p>${Number(variant.stock || 0)} em estoque</p>

          <div class="variant-card-actions">
            <button type="button" data-pv-action="edit" data-id="${variant.id}">Editar</button>
            <button type="button" data-pv-action="toggle" data-id="${variant.id}">
              ${active ? "Desativar" : "Reativar"}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  list.querySelectorAll("[data-pv-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.pvAction;
      const id = button.dataset.id;

      if (action === "edit") startVariantEdit(id);
      if (action === "toggle") toggleVariantStatus(id);
    });
  });
}

function startVariantEdit(id) {
  const variant = ProductVariantsState.variants.find((item) => String(item.id) === String(id));
  if (!variant) return;

  ProductVariantsState.editingId = variant.id;

  pv("#variantId").value = variant.id;
  pv("#variantColor").value = variant.color || "";
  pv("#variantSku").value = variant.sku || "";
  pv("#variantPrice").value = variant.price ?? "";
  pv("#variantOldPrice").value = variant.old_price ?? "";
  pv("#variantStock").value = variant.stock ?? 0;
  pv("#variantActive").value = String(variant.active !== false);
  pv("#variantImageUrl").value = variant.image_url || "";

  pv("#variantFormTitle").textContent = "Editar variação";
  pv("#variantFormSubtitle").textContent = "Altere os dados e salve.";
  pv("#saveVariantButtonText").textContent = "Salvar alterações";
  pv("#cancelVariantEdit").classList.remove("hidden");
  pv("#variantForm").classList.add("editing");

  updateVariantPreview();
  pv("#variantForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetVariantForm() {
  ProductVariantsState.editingId = null;

  if (pv("#variantId")) pv("#variantId").value = "";
  if (pv("#variantColor")) pv("#variantColor").value = "";
  if (pv("#variantSku")) pv("#variantSku").value = "";
  if (pv("#variantPrice")) pv("#variantPrice").value = "";
  if (pv("#variantOldPrice")) pv("#variantOldPrice").value = "";
  if (pv("#variantStock")) pv("#variantStock").value = "0";
  if (pv("#variantActive")) pv("#variantActive").value = "true";
  if (pv("#variantImageUrl")) pv("#variantImageUrl").value = "";

  if (pv("#variantFormTitle")) pv("#variantFormTitle").textContent = "Adicionar variação";
  if (pv("#variantFormSubtitle")) pv("#variantFormSubtitle").textContent = "Cadastre uma nova opção para este produto.";
  if (pv("#saveVariantButtonText")) pv("#saveVariantButtonText").textContent = "Adicionar variação";
  pv("#cancelVariantEdit")?.classList.add("hidden");
  pv("#variantForm")?.classList.remove("editing");

  updateVariantPreview();
}

function variantPayload() {
  return {
    product_id: ProductVariantsState.productId,
    color: pv("#variantColor").value.trim(),
    sku: pv("#variantSku").value.trim(),
    price: Number(pv("#variantPrice").value || 0),
    old_price: pv("#variantOldPrice").value ? Number(pv("#variantOldPrice").value) : null,
    stock: Number(pv("#variantStock").value || 0),
    image_url: pv("#variantImageUrl").value.trim() || null,
    active: pv("#variantActive").value === "true"
  };
}

async function saveProductVariant() {
  if (!ProductVariantsState.productId) {
    pvMessage("Salve o produto primeiro.");
    return;
  }

  const data = variantPayload();

  if (!data.color) {
    pvMessage("Informe a cor ou nome da variação.");
    return;
  }

  if (!data.sku) {
    pvMessage("Informe o SKU da variação.");
    return;
  }

  if (data.price < 0 || data.stock < 0) {
    pvMessage("Preço e estoque não podem ser negativos.");
    return;
  }

  let result;

  if (ProductVariantsState.editingId) {
    result = await window.mugartSupabase
      .from("product_variants")
      .update({
        color: data.color,
        sku: data.sku,
        price: data.price,
        old_price: data.old_price,
        stock: data.stock,
        image_url: data.image_url,
        active: data.active
      })
      .eq("id", ProductVariantsState.editingId)
      .eq("product_id", ProductVariantsState.productId);
  } else {
    result = await window.mugartSupabase
      .from("product_variants")
      .insert(data);
  }

  if (result.error) {
    console.error(result.error);
    pvMessage("Erro ao salvar variação: " + result.error.message);
    return;
  }

  pvMessage(ProductVariantsState.editingId ? "Variação atualizada." : "Variação adicionada.");
  resetVariantForm();
  await loadProductVariants();
}

async function toggleVariantStatus(id) {
  const variant = ProductVariantsState.variants.find((item) => String(item.id) === String(id));
  if (!variant) return;

  const newStatus = variant.active === false;
  const text = newStatus ? "reativar" : "desativar";

  if (!confirm(`Deseja ${text} esta variação?`)) return;

  const result = await window.mugartSupabase
    .from("product_variants")
    .update({ active: newStatus })
    .eq("id", id)
    .eq("product_id", ProductVariantsState.productId);

  if (result.error) {
    pvMessage("Erro ao alterar status: " + result.error.message);
    return;
  }

  resetVariantForm();
  await loadProductVariants();
}

function updateVariantPreview() {
  const url = pv("#variantImageUrl")?.value.trim();
  const image = pv("#variantImagePreview");
  const placeholder = pv("#variantImagePlaceholder");

  if (!image || !placeholder) return;

  if (!url) {
    image.classList.add("hidden");
    image.removeAttribute("src");
    placeholder.classList.remove("hidden");
    return;
  }

  image.onload = () => {
    image.classList.remove("hidden");
    placeholder.classList.add("hidden");
  };

  image.onerror = () => {
    image.classList.add("hidden");
    placeholder.classList.remove("hidden");
  };

  image.src = url;
}
