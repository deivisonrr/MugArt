/* ==========================================================
   MugArt Admin 2.0 v1
   Arquivo complementar: admin/js/admin-2.js

   Depende de:
   - supabase-js
   - js/supabase-config.js
   - admin.js
========================================================== */

function admin2$(selector) {
  return document.querySelector(selector);
}

function admin2All(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function admin2Money(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function admin2Slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

document.addEventListener("DOMContentLoaded", () => {
  if (admin2$("#productsTable")) {
    setupProductCardsView();
  }

  if (admin2$("#productForm")) {
    setupSeoAutoFill();
  }
});

/* ==========================
   Produtos em cards
========================== */

function setupProductCardsView() {
  const productsPanel = admin2$("#productsTable")?.closest(".admin-panel");
  const panelHead = productsPanel?.querySelector(".panel-head");

  if (!productsPanel || !panelHead || admin2$("#productCardsGrid")) return;

  const search = admin2$("#productSearch");

  const actions = document.createElement("div");
  actions.className = "products-panel-actions";
  actions.innerHTML = `
    <div class="products-view-toggle">
      <button type="button" class="active" id="tableViewBtn">Tabela</button>
      <button type="button" id="cardsViewBtn">Cards</button>
    </div>
  `;

  panelHead.appendChild(actions);

  const cardsGrid = document.createElement("div");
  cardsGrid.id = "productCardsGrid";
  cardsGrid.className = "product-cards-grid";
  cardsGrid.style.display = "none";

  productsPanel.appendChild(cardsGrid);

  admin2$("#tableViewBtn").addEventListener("click", () => {
    admin2$("#tableViewBtn").classList.add("active");
    admin2$("#cardsViewBtn").classList.remove("active");
    productsPanel.querySelector(".table-wrap").style.display = "block";
    cardsGrid.style.display = "none";
  });

  admin2$("#cardsViewBtn").addEventListener("click", async () => {
    admin2$("#cardsViewBtn").classList.add("active");
    admin2$("#tableViewBtn").classList.remove("active");
    productsPanel.querySelector(".table-wrap").style.display = "none";
    cardsGrid.style.display = "grid";
    await renderProductCards();
  });

  if (search) {
    search.addEventListener("input", () => {
      if (cardsGrid.style.display !== "none") {
        renderProductCards();
      }
    });
  }
}

async function renderProductCards() {
  const grid = admin2$("#productCardsGrid");
  if (!grid || !window.mugartSupabase) return;

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
    grid.innerHTML = `<p style="color:rgba(255,255,255,.7)">Erro ao carregar cards.</p>`;
    return;
  }

  const search = (admin2$("#productSearch")?.value || "").toLowerCase();

  const products = (result.data || []).filter((product) => {
    return (
      product.name.toLowerCase().includes(search) ||
      (product.sku || "").toLowerCase().includes(search) ||
      (product.color || "").toLowerCase().includes(search) ||
      (product.categories?.name || "").toLowerCase().includes(search)
    );
  });

  grid.innerHTML = products.length
    ? products.map((product) => `
      <article class="admin-product-card">
        <div class="product-photo">
          <img src="${product.image_url || "../assets/hero-caneca.png"}" alt="${product.name}">
        </div>

        <div>
          <h3>${product.name}</h3>
          <div class="sku">${product.sku || "-"}</div>
        </div>

        <div class="product-card-meta">
          <span>${product.categories ? product.categories.name : "Sem categoria"}</span>
          <span>${product.color || "Sem cor"}</span>
          <span>Estoque: ${product.stock || 0}</span>
          <span>${product.active ? "Ativo" : "Inativo"}</span>
        </div>

        <div class="price">${admin2Money(product.price)}</div>

        <div class="card-actions">
          <button type="button" class="edit" onclick="editProduct('${product.id}')">Editar</button>
          <button type="button" class="delete" onclick="deleteProduct('${product.id}')">Excluir</button>
        </div>
      </article>
    `).join("")
    : `<p style="color:rgba(255,255,255,.7)">Nenhum produto encontrado.</p>`;
}

/* ==========================
   SEO automático
========================== */

function setupSeoAutoFill() {
  const productName = admin2$("#productName");
  const productDescription = admin2$("#productDescription");

  if (!productName || admin2$("#seoAutoFillBlock")) return;

  const target = admin2$("#catalog-seo .form-grid");

  if (!target) return;

  target.insertAdjacentHTML("beforeend", `
    <div class="full" id="seoAutoFillBlock">
      <button type="button" id="generateSeoBtn">Gerar SEO automático</button>

      <div class="seo-preview-box">
        <span class="seo-url" id="seoPreviewUrl">mugart.com.br/produto/...</span>
        <span class="seo-title-preview" id="seoPreviewTitle">Título SEO</span>
        <span class="seo-desc-preview" id="seoPreviewDesc">Descrição SEO</span>
      </div>
    </div>
  `);

  admin2$("#generateSeoBtn").addEventListener("click", generateSeoFromProduct);

  ["input", "change"].forEach((eventName) => {
    productName.addEventListener(eventName, updateSeoPreview);
    productDescription.addEventListener(eventName, updateSeoPreview);
    admin2$("#productSlug")?.addEventListener(eventName, updateSeoPreview);
    admin2$("#productSeoTitle")?.addEventListener(eventName, updateSeoPreview);
    admin2$("#productSeoDescription")?.addEventListener(eventName, updateSeoPreview);
  });

  updateSeoPreview();
}

function generateSeoFromProduct() {
  const name = admin2$("#productName")?.value.trim();
  const desc = admin2$("#productDescription")?.value.trim();

  if (!name) {
    alert("Digite o nome do produto primeiro.");
    return;
  }

  const slug = admin2Slugify(name);
  const title = `${name} | MugArt`;
  const seoDesc = desc
    ? desc.slice(0, 155)
    : `${name} personalizada da MugArt. Caneca criativa, pronta para presentear e encantar.`;

  if (admin2$("#productSlug")) admin2$("#productSlug").value = slug;
  if (admin2$("#productSeoTitle")) admin2$("#productSeoTitle").value = title;
  if (admin2$("#productSeoDescription")) admin2$("#productSeoDescription").value = seoDesc;

  updateSeoPreview();
}

function updateSeoPreview() {
  const slug = admin2$("#productSlug")?.value || admin2Slugify(admin2$("#productName")?.value || "");
  const title = admin2$("#productSeoTitle")?.value || "Título SEO";
  const desc = admin2$("#productSeoDescription")?.value || "Descrição SEO";

  if (admin2$("#seoPreviewUrl")) {
    admin2$("#seoPreviewUrl").textContent = `mugart.com.br/produto/${slug || "..."}`;
  }

  if (admin2$("#seoPreviewTitle")) {
    admin2$("#seoPreviewTitle").textContent = title;
  }

  if (admin2$("#seoPreviewDesc")) {
    admin2$("#seoPreviewDesc").textContent = desc;
  }
}

/* Atualiza cards depois de editar/excluir se estiver na visualização de cards */
(function patchProductActionsForCards() {
  const interval = setInterval(() => {
    if (typeof window.deleteProduct === "function" && typeof window.editProduct === "function") {
      clearInterval(interval);

      const originalDelete = window.deleteProduct;

      window.deleteProduct = async function(id) {
        await originalDelete(id);

        const grid = admin2$("#productCardsGrid");
        if (grid && grid.style.display !== "none") {
          await renderProductCards();
        }
      };
    }
  }, 500);
})();
