(() => {
  "use strict";

  const productsGrid = document.getElementById("errorProductsGrid");
  const searchForm = document.getElementById("errorSearchForm");
  const searchInput = document.getElementById("errorSearchInput");

  document.addEventListener("DOMContentLoaded", initializeErrorPage);

  async function initializeErrorPage() {
    configureSearch();
    await loadFeaturedProducts();
  }

  function configureSearch() {
    searchForm?.addEventListener("submit", (event) => {
      event.preventDefault();

      const query = String(searchInput?.value || "").trim();

      if (!query) {
        window.location.href = "/loja.html";
        return;
      }

      window.location.href =
        `/loja.html?busca=${encodeURIComponent(query)}`;
    });
  }

  function getSupabaseClient() {
    if (window.mugartSupabase?.from) {
      return window.mugartSupabase;
    }

    if (window.supabaseClient?.from) {
      return window.supabaseClient;
    }

    if (window.sb?.from) {
      return window.sb;
    }

    return null;
  }

  async function loadFeaturedProducts() {
    if (!productsGrid) return;

    const client = getSupabaseClient();

    if (!client) {
      renderFallbackProducts();
      return;
    }

    const { data, error } = await client
      .from("products")
      .select(`
        id,
        name,
        slug,
        price,
        image_url,
        featured,
        active
      `)
      .eq("active", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(4);

    if (error) {
      console.error("Erro ao carregar produtos da página 404:", error);
      renderFallbackProducts();
      return;
    }

    renderProducts(data || []);
  }

  function renderProducts(products) {
    if (!products.length) {
      productsGrid.innerHTML = `
        <div class="error-products-empty">
          Nenhum produto disponível no momento.
        </div>
      `;

      return;
    }

    productsGrid.innerHTML = products
      .map((product) => {
        const productUrl = 
          `/loja.html?busca=${encodeURIComponent(product.name || "")}`;

        return `
          <a
            href="${productUrl}"
            class="error-product-card"
          >
            <div class="error-product-image">
              <img
                src="${escapeAttribute(
                  normalizeImageUrl(product.image_url)
                )}"
                alt="${escapeAttribute(product.name || "Produto MugArt")}"
                loading="lazy"
                onerror="this.src='/assets/hero-caneca.png'"
              >
            </div>

            <div class="error-product-content">
              <small>
                ${product.featured ? "Destaque" : "MugArt"}
              </small>

              <h3>
                ${escapeHTML(product.name || "Produto MugArt")}
              </h3>

              <strong>
                ${formatCurrency(product.price)}
              </strong>
            </div>
          </a>
        `;
      })
      .join("");
  }

  function renderFallbackProducts() {
    productsGrid.innerHTML = `
      <div class="error-products-empty">
        <div>
          <p>
            Não foi possível carregar os produtos agora.
          </p>

          <a
            href="/loja.html"
            class="error-primary-button"
          >
            Acessar a loja
          </a>
        </div>
      </div>
    `;
  }

  function normalizeImageUrl(value) {
    const image = String(value || "").trim();

    if (!image) {
      return "/assets/hero-caneca.png";
    }

    if (
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("/")
    ) {
      return image;
    }

    return `/assets/${image}`;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value) || 0);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHTML(value);
  }
})();
