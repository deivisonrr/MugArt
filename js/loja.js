/* ==========================================================
   MugArt Loja + Supabase
   Arquivo: js/loja.js
========================================================== */

var MUGART_CONFIG = {
  whatsapp: "5511988849236",
  currency: "BRL",
  locale: "pt-BR",
  productsPerPage: 8,
  storageKeys: {
    cart: "mugart_cart",
    favorites: "mugart_favorites",
    customer: "mugart_customer"
  }
};

var StoreState = {
  products: [],
  cart: [],
  favorites: [],
  currentPage: 1,
  filters: {
    search: "",
    category: "todos",
    color: "todos",
    sort: "featured",
    maxPrice: 9999
  },
  selectedProduct: null,
  selectedVariation: null,
  selectedVariationIndex: 0,
  selectedImageIndex: 0,
  addingLock: false
};

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.prototype.slice.call(document.querySelectorAll(selector));
}

function formatMoney(value) {
  return new Intl.NumberFormat(MUGART_CONFIG.locale, {
    style: "currency",
    currency: MUGART_CONFIG.currency
  }).format(value || 0);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadFromStorage(key, fallback) {
  try {
    var saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.warn("Erro ao ler localStorage:", error);
    return fallback;
  }
}

function pushDataLayer(payload) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

function showToast(message, type) {
  var toast = $(".mugart-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "mugart-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.dataset.type = type || "success";
  toast.classList.add("show");

  setTimeout(function() {
    toast.classList.remove("show");
  }, 2800);
}

function createElementFromHTML(html) {
  var template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

document.addEventListener("DOMContentLoaded", async function() {
  restoreState();
  createBaseUIIfMissing();
  bindHeader();
  bindFilters();
  bindCartActions();

  await loadProductsFromSupabase();
  await synchronizeFavoritesWithAccount();

  configureMaxPriceFilter();
  renderCategories();
  renderColors();
  renderFeaturedProducts();
  renderProducts();
  renderCart();
  updateCounters();

  pushDataLayer({
    event: "view_store",
    page_title: document.title,
    page_location: window.location.href,
    products_count: StoreState.products.length
  });
});

function restoreState() {
  StoreState.cart = loadFromStorage(MUGART_CONFIG.storageKeys.cart, []);
  StoreState.favorites = loadFromStorage(MUGART_CONFIG.storageKeys.favorites, []);
}

async function loadProductsFromSupabase() {
  if (!window.mugartSupabase) {
    showToast("Supabase não carregou na loja. Verifique js/supabase-config.js.", "error");
    StoreState.products = [];
    return;
  }

  try {
    var productsResult = await window.mugartSupabase
      .from("products")
      .select(`
        id,
        name,
        sku,
        description,
        color,
        price,
        old_price,
        stock,
        image_url,
        active,
        featured,
        slug,
        seo_title,
        seo_description,
        image_alt,
        canonical_url,
        noindex,
        created_at,
        categories (
          id,
          name,
          slug
        )
      `)
      .eq("active", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (productsResult.error) {
      console.error("Erro ao carregar produtos:", productsResult.error);
      showToast("Erro ao carregar produtos da loja.", "error");
      StoreState.products = [];
      return;
    }

    var variations = [];

    var variationsResult = await window.mugartSupabase
      .from("product_variants")
      .select(`
        id,
        product_id,
        color,
        sku,
        price,
        old_price,
        stock,
        image_url,
        active,
        created_at
      `)
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (variationsResult.error) {
      console.warn("As variações não puderam ser carregadas:", variationsResult.error);
    } else {
      variations = variationsResult.data || [];
    }

    var productImages = [];

    var productImagesResult = await window.mugartSupabase
      .from("product_images")
      .select("id, product_id, image_url, sort_order, is_main, media_type, thumbnail_url, created_at")
      .order("is_main", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (productImagesResult.error) {
      console.warn("As imagens adicionais não puderam ser carregadas:", productImagesResult.error);
    } else {
      productImages = productImagesResult.data || [];
    }

    StoreState.products = (productsResult.data || []).map(function(product) {
      var productVariations = variations
        .filter(function(variation) {
          return String(variation.product_id) === String(product.id);
        })
        .map(function(variation) {
          return {
            id: variation.id,
            productId: variation.product_id,
            color: variation.color || "Variação",
            name: variation.color || "Variação",
            sku: variation.sku || product.sku || variation.id,
            price: Number(
              variation.price !== null && variation.price !== undefined
                ? variation.price
                : product.price || 0
            ),
            oldPrice: Number(variation.old_price || 0),
            stock: Number(variation.stock || 0),
            image: variation.image_url || product.image_url || "assets/hero-caneca.png",
            active: variation.active
          };
        });

      var galleryImages = productImages
        .filter(function(image) {
          return String(image.product_id) === String(product.id);
        })
        .map(function(image) {
          return {
            id: image.id,
            url: image.image_url,
            sortOrder: Number(image.sort_order || 0),
            isMain: image.is_main === true,
            mediaType: image.media_type || "image",
            thumbnailUrl: image.thumbnail_url || null
          };
        });

      var hasMainProductImage = galleryImages.some(function(image) {
        return image.url === product.image_url;
      });

      if (product.image_url && !hasMainProductImage) {
        galleryImages.unshift({
          id: "main-" + product.id,
          url: product.image_url,
          sortOrder: 0,
          isMain: galleryImages.length === 0,
          mediaType: "image",
          thumbnailUrl: null
        });
      }

      galleryImages.sort(function(a, b) {
        if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
        return a.sortOrder - b.sortOrder;
      });

      var displayPrice = Number(product.price || 0);
      var displayStock = Number(product.stock || 0);

      return {
        id: product.id,
        sku: product.sku || product.id,
        name: product.name || "Produto sem nome",
        category: product.categories ? product.categories.name : "Sem categoria",
        categoryId: product.categories ? product.categories.id : null,
        color: product.color || "Não informado",
        price: displayPrice,
        oldPrice: Number(product.old_price || 0),
        stock: displayStock,
        image: product.image_url || "assets/hero-caneca.png",
        description: product.description || "Produto MugArt pronta entrega.",
        active: product.active,
        featured: product.featured,
        slug: product.slug || "",
        seoTitle: product.seo_title || "",
        seoDescription: product.seo_description || "",
        imageAlt: product.image_alt || product.name || "Produto MugArt",
        canonicalUrl: product.canonical_url || "",
        noindex: product.noindex === true,
        gallery: galleryImages,
          variations: [
              {
                id: null,
                productId: product.id,
                color: product.color || "Modelo principal",
                name: "Modelo principal",
                sku: product.sku || product.id,
                price: Number(product.price || 0),
                oldPrice: Number(product.old_price || 0),
                stock: Number(product.stock || 0),
                image: product.image_url || "assets/hero-caneca.png",
                active: true,
                isMainProduct: true
              }
            ].concat(productVariations),
         
          specs: {
          capacidade: "325ml",
          material: "Cerâmica",
          acabamento: "Brilhante",
          personalizacao: "Sublimação"
        },
        tags: [
          product.name || "",
          product.color || "",
          product.categories ? product.categories.name : ""
        ].concat(
          productVariations.map(function(variation) {
            return variation.color;
          })
        )
      };
    });

    console.log("Produtos carregados:", StoreState.products.length);
    console.log("Variações carregadas:", variations.length);
  } catch (error) {
    console.error("Erro inesperado ao carregar a loja:", error);
    StoreState.products = [];
    showToast("Erro inesperado ao carregar a loja.", "error");
  }
}


async function synchronizeFavoritesWithAccount() {
  if (!window.mugartSupabase) return;

  try {
    var sessionResult =
      await window.mugartSupabase.auth.getSession();

    var user =
      sessionResult.data.session &&
      sessionResult.data.session.user;

    if (!user) {
      return;
    }

    var localFavorites = Array.from(
      new Set(
        StoreState.favorites.map(String)
      )
    );

    if (localFavorites.length) {
      var rows =
        localFavorites.map(function(productId) {
          return {
            user_id: user.id,
            product_id: productId
          };
        });

      var migrateResult =
        await window.mugartSupabase
          .from("customer_favorites")
          .upsert(rows, {
            onConflict: "user_id,product_id",
            ignoreDuplicates: true
          });

      if (migrateResult.error) {
        console.warn(
          "Não foi possível migrar favoritos locais:",
          migrateResult.error
        );
      }
    }

    var favoritesResult =
      await window.mugartSupabase
        .from("customer_favorites")
        .select("product_id")
        .eq("user_id", user.id);

    if (favoritesResult.error) {
      console.warn(
        "Não foi possível sincronizar favoritos:",
        favoritesResult.error
      );
      return;
    }

    StoreState.favorites =
      (favoritesResult.data || [])
        .map(function(row) {
          return String(row.product_id);
        });

    saveToStorage(
      MUGART_CONFIG.storageKeys.favorites,
      StoreState.favorites
    );

  } catch (error) {
    console.warn(
      "Erro ao sincronizar favoritos:",
      error
    );
  }
}

async function persistFavoriteForCurrentUser(
  productId,
  shouldFavorite
) {
  if (!window.mugartSupabase) return;

  try {
    var sessionResult =
      await window.mugartSupabase.auth.getSession();

    var user =
      sessionResult.data.session &&
      sessionResult.data.session.user;

    if (!user) return;

    if (shouldFavorite) {
      var insertResult =
        await window.mugartSupabase
          .from("customer_favorites")
          .upsert(
            {
              user_id: user.id,
              product_id: productId
            },
            {
              onConflict: "user_id,product_id"
            }
          );

      if (insertResult.error) {
        throw insertResult.error;
      }

      return;
    }

    var deleteResult =
      await window.mugartSupabase
        .from("customer_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

    if (deleteResult.error) {
      throw deleteResult.error;
    }

  } catch (error) {
    console.error(
      "Erro ao salvar favorito na conta:",
      error
    );
  }
}

function configureMaxPriceFilter() {
  var priceMax = $("#priceMaxFilter");
  var label = $("#priceMaxLabel");

  if (!priceMax) return;

  var highestPrice = StoreState.products.reduce(function(max, product) {
    return Math.max(max, Number(product.price || 0));
  }, 80);

  var roundedMax = Math.max(80, Math.ceil(highestPrice / 10) * 10);

  priceMax.max = String(roundedMax);
  priceMax.value = String(roundedMax);
  StoreState.filters.maxPrice = roundedMax;

  if (label) label.textContent = formatMoney(roundedMax);
}

function createBaseUIIfMissing() {
  if (!$(".cart-drawer")) {
    document.body.appendChild(createElementFromHTML(
      '<aside class="cart-drawer" id="cartDrawer">' +
        '<div class="cart-header">' +
          '<div><span class="cart-label">Seu carrinho</span><h3>Produtos selecionados</h3></div>' +
          '<button class="cart-close" id="cartClose" type="button">×</button>' +
        '</div>' +
        '<div class="cart-items" id="cartItems"></div>' +
        '<div class="cart-footer">' +
          '<div class="cart-summary-line"><span>Subtotal</span><strong id="cartSubtotal">R$ 0,00</strong></div>' +
          '<div class="cart-summary-line"><span>Frete</span><strong>A calcular</strong></div>' +
          '<button class="checkout-btn" id="checkoutBtn" type="button">Finalizar compra</button>' +
          '<button class="whatsapp-cart-btn" id="sendCartWhatsapp" type="button">Tirar dúvida pelo WhatsApp</button>' +
        '</div>' +
      '</aside>'
    ));
  }

  if (!$(".drawer-overlay")) {
    document.body.appendChild(createElementFromHTML(
      '<div class="drawer-overlay" id="drawerOverlay"></div>'
    ));
  }

  if (!$(".product-modal")) {
    document.body.appendChild(createElementFromHTML(
      '<div class="product-modal" id="productModal" aria-hidden="true">' +
        '<div class="product-modal-card">' +
          '<button class="modal-close" id="modalClose" type="button">×</button>' +
          '<div id="modalContent"></div>' +
        '</div>' +
      '</div>'
    ));
  }
}

function bindHeader() {
  var menuToggle = $("#menuToggle");
  var nav = $("#nav");

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", function() {
      nav.classList.toggle("open");
    });
  }

  $all("[data-open-cart], #openCart, .open-cart").forEach(function(button) {
    button.addEventListener("click", openCart);
  });

  var cartClose = $("#cartClose");
  var overlay = $("#drawerOverlay");

  if (cartClose) cartClose.addEventListener("click", closeCart);

  if (overlay) {
    overlay.addEventListener("click", function() {
      closeCart();
      closeProductModal();
      closeCheckout();
    });
  }
}

function bindFilters() {
  var searchInput = $("#storeSearch");
  var categorySelect = $("#categoryFilter");
  var colorSelect = $("#colorFilter");
  var sortSelect = $("#sortFilter");
  var priceMax = $("#priceMaxFilter");
  var clearFilters = $("#clearFilters");

  if (searchInput) {
    searchInput.addEventListener("input", function(event) {
      StoreState.filters.search = event.target.value;
      StoreState.currentPage = 1;
      renderProducts();

      pushDataLayer({
        event: "store_search",
        search_term: event.target.value
      });
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", function(event) {
      StoreState.filters.category = event.target.value;
      StoreState.currentPage = 1;
      renderProducts();
    });
  }

  if (colorSelect) {
    colorSelect.addEventListener("change", function(event) {
      StoreState.filters.color = event.target.value;
      StoreState.currentPage = 1;
      renderProducts();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", function(event) {
      StoreState.filters.sort = event.target.value;
      StoreState.currentPage = 1;
      renderProducts();
    });
  }

  if (priceMax) {
    priceMax.addEventListener("input", function(event) {
      StoreState.filters.maxPrice = Number(event.target.value);
      StoreState.currentPage = 1;
      updatePriceLabel();
      renderProducts();
    });
  }

  if (clearFilters) {
    clearFilters.addEventListener("click", function() {
      StoreState.filters.search = "";
      StoreState.filters.category = "todos";
      StoreState.filters.color = "todos";
      StoreState.filters.sort = "featured";

      if (searchInput) searchInput.value = "";
      if (categorySelect) categorySelect.value = "todos";
      if (colorSelect) colorSelect.value = "todos";
      if (sortSelect) sortSelect.value = "featured";

      if (priceMax) {
        priceMax.value = priceMax.max;
        StoreState.filters.maxPrice = Number(priceMax.max);
      }

      StoreState.currentPage = 1;
      updatePriceLabel();
      renderCategories();
      renderProducts();
    });
  }
}

function updatePriceLabel() {
  var label = $("#priceMaxLabel");

  if (label) {
    label.textContent = formatMoney(StoreState.filters.maxPrice);
  }
}

function renderCategories() {
  var categorySelect = $("#categoryFilter");
  var categoryList = $("#categoryList");
  var map = {};
  var categories = ["todos"];

  StoreState.products.forEach(function(product) {
    map[product.category] = true;
  });

  Object.keys(map).forEach(function(category) {
    categories.push(category);
  });

  if (categorySelect) {
    categorySelect.innerHTML = categories.map(function(category) {
      var label = category === "todos" ? "Todas as categorias" : category;
      return '<option value="' + category + '">' + label + '</option>';
    }).join("");

    categorySelect.value = StoreState.filters.category;
  }

  if (categoryList) {
    categoryList.innerHTML = categories.map(function(category) {
      var label = category === "todos" ? "Todas" : category;
      var active = category === StoreState.filters.category ? "active" : "";

      return '<button class="category-chip ' + active + '" type="button" data-category="' + category + '">' + label + '</button>';
    }).join("");

    $all(".category-chip").forEach(function(button) {
      button.addEventListener("click", function() {
        StoreState.filters.category = button.dataset.category;
        StoreState.currentPage = 1;

        if ($("#categoryFilter")) {
          $("#categoryFilter").value = StoreState.filters.category;
        }

        renderCategories();
        renderProducts();
      });
    });
  }
}

function renderColors() {
  var colorSelect = $("#colorFilter");
  var map = {};
  var colors = ["todos"];

  StoreState.products.forEach(function(product) {
    map[product.color] = true;
  });

  Object.keys(map).forEach(function(color) {
    colors.push(color);
  });

  if (colorSelect) {
    colorSelect.innerHTML = colors.map(function(color) {
      var label = color === "todos" ? "Todas as cores" : color;
      return '<option value="' + color + '">' + label + '</option>';
    }).join("");
  }
}

function getFilteredProducts() {
  var search = StoreState.filters.search;
  var category = StoreState.filters.category;
  var color = StoreState.filters.color;
  var sort = StoreState.filters.sort;
  var maxPrice = StoreState.filters.maxPrice;
  var searchTerm = normalizeText(search);

  var products = StoreState.products.filter(function(product) {
    var matchesSearch =
      !searchTerm ||
      normalizeText(product.name).indexOf(searchTerm) >= 0 ||
      normalizeText(product.description).indexOf(searchTerm) >= 0 ||
      normalizeText(product.category).indexOf(searchTerm) >= 0 ||
      normalizeText(product.color).indexOf(searchTerm) >= 0 ||
      product.tags.some(function(tag) {
        return normalizeText(tag).indexOf(searchTerm) >= 0;
      });

    var matchesCategory = category === "todos" || product.category === category;
    var matchesColor = color === "todos" || product.color === color;
    var matchesPrice = product.price <= maxPrice;

    return matchesSearch && matchesCategory && matchesColor && matchesPrice;
  });

  products.sort(function(a, b) {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "name_asc") return a.name.localeCompare(b.name);
    if (sort === "stock_desc") return b.stock - a.stock;

    return Number(b.featured) - Number(a.featured);
  });

  return products;
}

function getPagedProducts(products) {
  var start = (StoreState.currentPage - 1) * MUGART_CONFIG.productsPerPage;

  return products.slice(start, start + MUGART_CONFIG.productsPerPage);
}

function renderProducts() {
  var grid = $("#productsGrid") || $("#storeProducts") || $(".products-grid");
  var count = $("#productsCount");

  if (!grid) return;

  var products = getFilteredProducts();
  var paged = getPagedProducts(products);

  if (count) {
    count.textContent = products.length + " produto" + (products.length === 1 ? "" : "s");
  }

  if (!products.length) {
    grid.innerHTML =
      '<div class="empty-products">' +
        '<h3>Nenhuma caneca encontrada</h3>' +
        '<p>Cadastre produtos ativos no painel administrativo ou limpe os filtros.</p>' +
      '</div>';

    renderPagination(products.length);
    return;
  }

  grid.innerHTML = paged.map(productCardTemplate).join("");

  bindProductCards();
  renderPagination(products.length);
}

function renderFeaturedProducts() {
  var container = $("#featuredProducts");

  if (!container) return;

  var featured = StoreState.products.filter(function(product) {
    return product.featured;
  }).slice(0, 4);

  if (!featured.length) {
    container.innerHTML =
      '<div class="empty-products">' +
        '<p>Nenhum produto em destaque ainda.</p>' +
      '</div>';

    return;
  }

  container.innerHTML = featured.map(productCardTemplate).join("");

  bindProductCards();
}

function renderPagination(totalProducts) {
  var pagination = $("#pagination");

  if (!pagination) return;

  var pages = Math.ceil(totalProducts / MUGART_CONFIG.productsPerPage);

  if (pages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  var html = "";

  for (var i = 1; i <= pages; i++) {
    html +=
      '<button type="button" class="' + (i === StoreState.currentPage ? "active" : "") + '" data-page="' + i + '">' +
        i +
      '</button>';
  }

  pagination.innerHTML = html;

  $all("#pagination button").forEach(function(button) {
    button.addEventListener("click", function() {
      StoreState.currentPage = Number(button.dataset.page);

      renderProducts();

      var produtos = document.getElementById("produtos");

      if (produtos) {
        produtos.scrollIntoView({
          behavior: "smooth"
        });
      }
    });
  });
}

function productCardTemplate(product) {
  var isFavorite = StoreState.favorites.indexOf(product.id) >= 0;

  var discount = product.oldPrice && product.oldPrice > product.price
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return "" +
    '<article class="store-product-card" data-product-id="' + product.id + '">' +
      '<button class="favorite-btn ' + (isFavorite ? "active" : "") + '" type="button" data-action="favorite" aria-label="' +
        (isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos") + '">' +
        '<i class="' + (isFavorite ? "fa-solid" : "fa-regular") + ' fa-heart"></i>' +
      '</button>' +

      (discount ? '<span class="discount-badge">-' + discount + "%</span>" : "") +

      '<button class="product-image-btn" type="button" data-action="view">' +
        '<img src="' + product.image + '" alt="' + (product.imageAlt || product.name) + '" loading="lazy" />' +
      '</button>' +

      '<div class="product-info">' +
        '<span class="product-category">' + product.category + "</span>" +
        "<h3>" + product.name + "</h3>" +
        "<p>" + product.description + "</p>" +

        '<div class="product-meta">' +
          "<span>" + product.color + "</span>" +
          '<span class="' + (product.stock <= 4 ? "stock-low" : "") + '">' +
            (product.stock > 0 ? product.stock + " em estoque" : "Esgotado") +
          "</span>" +
        "</div>" +

        '<div class="product-price">' +
          "<strong>" + formatMoney(product.price) + "</strong>" +
          (product.oldPrice ? "<small>" + formatMoney(product.oldPrice) + "</small>" : "") +
        "</div>" +

        '<div class="product-actions">' +
          '<button class="details-btn" type="button" data-action="page">Ver produto</button>' +
          '<button class="add-cart-btn" type="button" data-action="add" ' + (product.stock <= 0 ? "disabled" : "") + ">" +
            (product.stock > 0 ? "Adicionar" : "Esgotado") +
          "</button>" +
        "</div>" +
      "</div>" +
    "</article>";
}

function bindProductCards() {
  $all(".store-product-card").forEach(function(card) {
    var productId = card.dataset.productId;

    if (card.dataset.bound === "true") return;
    card.dataset.bound = "true";

    card.querySelectorAll("[data-action]").forEach(function(button) {
      button.addEventListener("click", function(event) {
        event.preventDefault();
        event.stopPropagation();

        var action = button.dataset.action;

        if (action === "add") {
          var product = getProductById(productId);

          if (productHasVariations(product)) {
            openProductModal(productId);
          } else {
            addToCart(productId);
          }

          return;
        }

        if (action === "view") {
          openProductModal(productId);
          return;
        }

        if (action === "page") {
          var selectedProduct = getProductById(productId);
          var productSlug = selectedProduct && selectedProduct.slug
            ? selectedProduct.slug
            : productId;

          window.location.href =
            "produto.html?slug=" + encodeURIComponent(productSlug);
          return;
        }

        if (action === "favorite") {
          toggleFavorite(productId);
        }
      });
    });

    card.addEventListener("click", function() {
      openProductModal(productId);
    });
  });
}

function getProductById(productId) {
  return StoreState.products.find(function(product) {
    return product.id === productId;
  });
}


function getProductVariation(product, variationId) {
  if (
    !product ||
    !Array.isArray(product.variations) ||
    !variationId
  ) {
    return null;
  }

  return product.variations.find(function(variation) {
    return (
      !variation.isMainProduct &&
      String(variation.id) === String(variationId)
    );
  }) || null;
}

function productHasVariations(product) {
  return Boolean(
    product &&
    Array.isArray(product.variations) &&
    product.variations.length
  );
}

function getActiveProductOption(product) {
  if (StoreState.selectedVariation) {
    return StoreState.selectedVariation;
  }

  return {
    id: null,
    productId: product.id,
    color: product.color,
    name: product.color,
    sku: product.sku,
    price: product.price,
    oldPrice: product.oldPrice,
    stock: product.stock,
    image: product.image
  };
}

function getSelectedOptionMedia(product) {
  var option = getActiveProductOption(product);

  if (
    option &&
    option.isMainProduct &&
    Array.isArray(product.gallery) &&
    product.gallery.length
  ) {
    return product.gallery;
  }

  return [{
    id: option.id || "option-" + product.id,
    url: option.image || product.image,
    mediaType: "image",
    thumbnailUrl: null,
    isMain: true,
    sortOrder: 0
  }];
}

function getCurrentSelectedMedia(product) {
  var media = getSelectedOptionMedia(product);

  if (!media.length) {
    return {
      url: product.image,
      mediaType: "image",
      thumbnailUrl: null
    };
  }

  if (StoreState.selectedImageIndex < 0) {
    StoreState.selectedImageIndex = media.length - 1;
  }

  if (StoreState.selectedImageIndex >= media.length) {
    StoreState.selectedImageIndex = 0;
  }

  return media[StoreState.selectedImageIndex];
}

function openProductModal(productId) {
  var product = getProductById(productId);
  var modal = $("#productModal");

  if (!product || !modal) return;

  StoreState.selectedProduct = product;
  StoreState.selectedVariationIndex = 0;
  StoreState.selectedImageIndex = 0;
  StoreState.selectedVariation = productHasVariations(product)
    ? product.variations[0]
    : null;

  renderProductModal();

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  pushDataLayer({
    event: "view_item",
    ecommerce: {
      currency: MUGART_CONFIG.currency,
      value: getActiveProductOption(product).price,
      items: [ga4Item(product, StoreState.selectedVariation)]
    }
  });
}


function renderProductModal() {
  var product = StoreState.selectedProduct;
  var content = $("#modalContent");

  if (!product || !content) return;

  var option = getActiveProductOption(product);
  var hasVariations = productHasVariations(product);
  var selectedMedia = getSelectedOptionMedia(product);
  var currentMedia = getCurrentSelectedMedia(product);
  var hasMultipleImages = selectedMedia.length > 1;

  var galleryThumbnailsHtml = "";

  if (hasMultipleImages) {
    galleryThumbnailsHtml =
      '<div class="product-gallery-thumbnails">' +
        selectedMedia.map(function(mediaItem, imageIndex) {
          var thumbUrl =
            mediaItem.thumbnailUrl ||
            (mediaItem.mediaType === "image" ? mediaItem.url : "");

          return (
            '<button class="product-gallery-thumbnail ' +
              (imageIndex === StoreState.selectedImageIndex ? "active" : "") +
            '" type="button" data-gallery-index="' + imageIndex + '">' +
              (mediaItem.mediaType === "video"
                ? '<span class="product-gallery-video-thumb">' +
                    (thumbUrl
                      ? '<img src="' + thumbUrl + '" alt="Vídeo de ' + product.name + '">'
                      : '<i class="fa-solid fa-play"></i>') +
                  '</span>'
                : '<img src="' + mediaItem.url + '" alt="' + product.name + '">') +
            '</button>'
          );
        }).join("") +
      '</div>';
  }

  var thumbnailsHtml = "";

  if (hasVariations) {
    thumbnailsHtml =
      '<div class="variation-thumbnails">' +
        product.variations.map(function(variation, index) {
          var active = StoreState.selectedVariation &&
            String(variation.id) === String(StoreState.selectedVariation.id)
              ? "active"
              : "";

          var soldOut = variation.stock <= 0 ? "sold-out" : "";

          return (
            '<button class="variation-thumbnail ' + active + " " + soldOut + '" ' +
              'type="button" data-variation-index="' + index + '" ' +
              'aria-label="Selecionar variação ' + variation.color + '">' +
              '<img src="' + variation.image + '" alt="' + product.name + " " + variation.color + '">' +
              '<span>' + variation.color + '</span>' +
              (variation.stock <= 0 ? '<small>Esgotada</small>' : '') +
            '</button>'
          );
        }).join("") +
      '</div>';
  }

  content.innerHTML =
    '<div class="modal-product">' +
      '<div class="product-carousel">' +
        '<div class="modal-product-image">' +
          (hasMultipleImages
            ? '<button class="carousel-arrow carousel-prev" id="variationPrev" type="button" aria-label="Variação anterior">' +
                '<i class="fa-solid fa-chevron-left"></i>' +
              '</button>'
            : '') +
          '<div class="carousel-image-wrapper" id="carouselImageWrapper">' +
            (currentMedia.mediaType === "video"
              ? '<video id="modalVariationVideo" src="' + currentMedia.url + '" controls muted playsinline preload="metadata"></video>'
              : '<img id="modalVariationImage" src="' + currentMedia.url + '" alt="' + product.name + " " + option.color + '">') +
          '</div>' +
          (hasMultipleImages
            ? '<button class="carousel-arrow carousel-next" id="variationNext" type="button" aria-label="Próxima variação">' +
                '<i class="fa-solid fa-chevron-right"></i>' +
              '</button>'
            : '') +
        '</div>' +
        (hasMultipleImages
          ? '<div class="carousel-position">' +
              '<strong>' + (StoreState.selectedImageIndex + 1) + '</strong>' +
              '<span>/</span>' +
              '<span>' + selectedMedia.length + '</span>' +
            '</div>'
          : '') +
        galleryThumbnailsHtml +
        thumbnailsHtml +
      '</div>' +

      '<div class="modal-product-info">' +
        '<span class="product-category">' + product.category + '</span>' +
        '<h2>' + product.name + '</h2>' +
        '<p>' + product.description + '</p>' +

        (hasVariations
          ? '<div class="selected-variation-box">' +
              '<small>Variação selecionada</small>' +
              '<strong>' + option.color + '</strong>' +
              '<span>SKU: ' + option.sku + '</span>' +
            '</div>'
          : '') +

        '<div class="modal-price">' +
          '<strong>' + formatMoney(option.price) + '</strong>' +
          (option.oldPrice && option.oldPrice > option.price
            ? '<small>' + formatMoney(option.oldPrice) + '</small>'
            : '') +
        '</div>' +

        '<div class="modal-stock ' + (option.stock <= 3 ? "low" : "") + '">' +
          (option.stock > 0
            ? option.stock + ' unidade(s) disponível(is)'
            : 'Variação esgotada') +
        '</div>' +

        '<div class="modal-specs">' +
          Object.keys(product.specs).map(function(key) {
            return '<div><span>' + key + '</span><strong>' + product.specs[key] + '</strong></div>';
          }).join("") +
        '</div>' +

        '<div class="modal-actions">' +
          '<button class="add-cart-btn" id="modalAddCart" type="button" ' +
            (option.stock <= 0 ? 'disabled' : '') + '>' +
            (option.stock > 0 ? 'Adicionar ao carrinho' : 'Variação esgotada') +
          '</button>' +
          '<button class="whatsapp-product-btn" id="modalWhatsapp" type="button">Consultar no WhatsApp</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  bindProductModalActions();
  bindVariationCarousel();
}

function bindProductModalActions() {
  var product = StoreState.selectedProduct;
  var option = getActiveProductOption(product);
  var modalClose = $("#modalClose");
  var modalAddCart = $("#modalAddCart");
  var modalWhatsapp = $("#modalWhatsapp");

  if (modalClose) {
    modalClose.onclick = closeProductModal;
  }

  if (modalAddCart) {
    modalAddCart.onclick = function(event) {
      event.preventDefault();
      event.stopPropagation();

      addToCart(
        product.id,
        1,
        StoreState.selectedVariation &&
        !StoreState.selectedVariation.isMainProduct
          ? StoreState.selectedVariation.id
          : null
      );
    };
  }

  if (modalWhatsapp) {
    modalWhatsapp.onclick = function(event) {
      event.preventDefault();
      event.stopPropagation();

      sendProductToWhatsapp(
        product.id,
        option && !option.isMainProduct ? option.id : null
      );
    };
  }
}

function bindVariationCarousel() {
  var product = StoreState.selectedProduct;

  if (!productHasVariations(product)) return;

  var previousButton = $("#variationPrev");
  var nextButton = $("#variationNext");
  var imageWrapper = $("#carouselImageWrapper");

  if (previousButton) {
    previousButton.onclick = function(event) {
      event.preventDefault();
      event.stopPropagation();
      selectPreviousImage();
    };
  }

  if (nextButton) {
    nextButton.onclick = function(event) {
      event.preventDefault();
      event.stopPropagation();
      selectNextImage();
    };
  }

  $all("[data-gallery-index]").forEach(function(button) {
    button.addEventListener("click", function(event) {
      event.preventDefault();
      event.stopPropagation();

      StoreState.selectedImageIndex =
        Number(button.dataset.galleryIndex || 0);

      renderProductModal();
    });
  });

  $all("[data-variation-index]").forEach(function(button) {
    button.addEventListener("click", function(event) {
      event.preventDefault();
      event.stopPropagation();
      selectVariationByIndex(Number(button.dataset.variationIndex));
    });
  });

  if (imageWrapper) {
    var touchStartX = 0;

    imageWrapper.addEventListener("touchstart", function(event) {
      touchStartX = event.changedTouches[0].screenX;
    }, { passive: true });

    imageWrapper.addEventListener("touchend", function(event) {
      var touchEndX = event.changedTouches[0].screenX;
      var distance = touchStartX - touchEndX;

      if (Math.abs(distance) < 45) return;

      if (distance > 0) {
        selectNextImage();
      } else {
        selectPreviousImage();
      }
    }, { passive: true });
  }
}

function selectVariationByIndex(index) {
  var product = StoreState.selectedProduct;

  if (!productHasVariations(product)) return;

  if (index < 0) index = product.variations.length - 1;
  if (index >= product.variations.length) index = 0;

  StoreState.selectedVariationIndex = index;
  StoreState.selectedVariation = product.variations[index];
  StoreState.selectedImageIndex = 0;

  renderProductModal();
}

function selectNextImage() {
  var product = StoreState.selectedProduct;
  var images = getSelectedOptionMedia(product);

  if (!images.length) return;

  StoreState.selectedImageIndex =
    (StoreState.selectedImageIndex + 1) % images.length;

  renderProductModal();
}

function selectPreviousImage() {
  var product = StoreState.selectedProduct;
  var images = getSelectedOptionMedia(product);

  if (!images.length) return;

  StoreState.selectedImageIndex =
    (StoreState.selectedImageIndex - 1 + images.length) % images.length;

  renderProductModal();
}

function selectNextVariation() {
  selectVariationByIndex(StoreState.selectedVariationIndex + 1);
}

function selectPreviousVariation() {
  selectVariationByIndex(StoreState.selectedVariationIndex - 1);
}

function closeProductModal() {
  var modal = $("#productModal");

  if (!modal) return;

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

async function toggleFavorite(productId) {
  var product = getProductById(productId);

  if (!product) return;

  var exists = StoreState.favorites.indexOf(productId) >= 0;

  if (exists) {
    StoreState.favorites = StoreState.favorites.filter(function(id) {
      return id !== productId;
    });

    showToast("Produto removido dos favoritos.", "info");
  } else {
    StoreState.favorites.push(productId);

    showToast("Produto adicionado aos favoritos.");
  }

  saveToStorage(
    MUGART_CONFIG.storageKeys.favorites,
    StoreState.favorites
  );

  await persistFavoriteForCurrentUser(
    productId,
    !exists
  );

  renderProducts();
  renderFeaturedProducts();
  updateCounters();

  pushDataLayer({
    event: exists ? "remove_from_wishlist" : "add_to_wishlist",
    ecommerce: {
      currency: MUGART_CONFIG.currency,
      value: product.price,
      items: [ga4Item(product)]
    }
  });
}

function addToCart(productId, quantity, variationId) {
  if (StoreState.addingLock) return;

  StoreState.addingLock = true;

  setTimeout(function() {
    StoreState.addingLock = false;
  }, 350);

  var product = getProductById(productId);

  if (!product) return;

  var variation = variationId
    ? getProductVariation(product, variationId)
    : null;

  var selectedMainProduct =
    StoreState.selectedVariation &&
    StoreState.selectedVariation.isMainProduct
      ? StoreState.selectedVariation
      : null;

  if (
    productHasVariations(product) &&
    !variation &&
    !selectedMainProduct
  ) {
    openProductModal(productId);
    showToast("Escolha uma opção antes de adicionar.", "info");
    return;
  }

  var option = variation || selectedMainProduct || {
    id: null,
    sku: product.sku,
    color: product.color,
    name: product.color,
    price: product.price,
    oldPrice: product.oldPrice,
    stock: product.stock,
    image: product.image,
    isMainProduct: true
  };

  quantity = Number(quantity || 1);

  if (option.stock <= 0) {
    showToast("Esta opção está esgotada.", "error");
    return;
  }

  var cartVariationId =
    option.isMainProduct ? null : option.id;

  var existing = StoreState.cart.find(function(item) {
    return (
      String(item.productId) === String(productId) &&
      String(item.variationId || "") ===
        String(cartVariationId || "")
    );
  });

  if (existing) {
    var newQty =
      Number(existing.quantity || 1) + quantity;

    if (newQty > option.stock) {
      showToast(
        "Quantidade maior que o estoque disponível.",
        "error"
      );
      return;
    }

    existing.quantity = newQty;
    existing.unitPrice = option.price;
    existing.variationColor = option.color;
    existing.variationSku = option.sku;
    existing.image = option.image;
  } else {
    StoreState.cart.push({
      productId: productId,
      variationId: cartVariationId,
      variationColor: option.color,
      variationSku: option.sku,
      unitPrice: option.price,
      image: option.image,
      quantity: quantity
    });
  }

  persistCart();
  renderCart();
  updateCounters();
  closeProductModal();
  openCart();

  showToast(
    option.isMainProduct
      ? "Produto principal adicionado ao carrinho."
      : "Variação " +
          option.color +
          " adicionada ao carrinho."
  );

  pushDataLayer({
    event: "add_to_cart",
    ecommerce: {
      currency: MUGART_CONFIG.currency,
      value: option.price * quantity,
      items: [{
        item_id: option.sku,
        item_name: product.name,
        item_category: product.category,
        item_variant: option.color,
        price: option.price,
        quantity: quantity
      }]
    }
  });
}

function removeFromCart(productId) {
  var product = getProductById(productId);

  StoreState.cart = StoreState.cart.filter(function(item) {
    return item.productId !== productId;
  });

  persistCart();
  renderCart();
  updateCounters();

  showToast("Produto removido do carrinho.", "info");

  if (product) {
    pushDataLayer({
      event: "remove_from_cart",
      ecommerce: {
        currency: MUGART_CONFIG.currency,
        value: product.price,
        items: [ga4Item(product)]
      }
    });
  }
}

function changeCartQuantity(productId, quantity) {
  var product = getProductById(productId);

  var item = StoreState.cart.find(function(cartItem) {
    return cartItem.productId === productId;
  });

  if (!product || !item) return;

  var newQuantity = Number(quantity);

  if (newQuantity <= 0) {
    removeFromCart(productId);
    return;
  }

  if (newQuantity > product.stock) {
    showToast("Quantidade maior que o estoque disponível.", "error");
    return;
  }

  item.quantity = newQuantity;

  persistCart();
  renderCart();
  updateCounters();
}

function persistCart() {
  saveToStorage(MUGART_CONFIG.storageKeys.cart, StoreState.cart);
}

function getCartItemsDetailed() {
  return StoreState.cart.map(function(item) {
    var product = getProductById(item.productId);

    if (!product) return null;

    var variation = item.variationId
      ? getProductVariation(product, item.variationId)
      : null;

    var option = variation || {
      id: null,
      color: item.variationColor || product.color,
      sku: item.variationSku || product.sku,
      price: Number(item.unitPrice !== undefined ? item.unitPrice : product.price),
      stock: product.stock,
      image: item.image || product.image
    };

    return {
      productId: item.productId,
      variationId: item.variationId || null,
      quantity: Number(item.quantity || 1),
      product: product,
      variation: variation,
      option: option,
      subtotal: Number(option.price || 0) * Number(item.quantity || 1)
    };
  }).filter(Boolean);
}

function getCartSubtotal() {
  return getCartItemsDetailed().reduce(function(total, item) {
    return total + item.subtotal;
  }, 0);
}

function getCartQuantity() {
  return StoreState.cart.reduce(function(total, item) {
    return total + Number(item.quantity || 0);
  }, 0);
}

function renderCart() {
  var container = $("#cartItems");
  var subtotalEl = $("#cartSubtotal");
  var checkoutTotal = $("#checkoutTotal");

  if (!container) return;

  var items = getCartItemsDetailed();
  var subtotal = getCartSubtotal();

  if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
  if (checkoutTotal) checkoutTotal.textContent = formatMoney(subtotal);

  if (!items.length) {
    container.innerHTML =
      '<div class="empty-cart">' +
        '<h4>Seu carrinho está vazio</h4>' +
        '<p>Adicione canecas pronta entrega para continuar.</p>' +
      '</div>';
    return;
  }

  container.innerHTML = items.map(function(item) {
    var cartKey = item.productId + "::" + (item.variationId || "principal");

    return "" +
      '<div class="cart-item" data-cart-key="' + cartKey + '">' +
        '<img src="' + item.option.image + '" alt="' + item.product.name + '" />' +
        '<div class="cart-item-info">' +
          '<h4>' + item.product.name + '</h4>' +
          '<span>' + item.option.color + " • " + formatMoney(item.option.price) + '</span>' +
          (item.variation
            ? '<small class="cart-variation-sku">SKU: ' + item.option.sku + '</small>'
            : '') +
          '<div class="cart-item-controls">' +
            '<button type="button" data-cart-action="decrease">−</button>' +
            '<input type="number" min="1" max="' + item.option.stock + '" value="' + item.quantity + '" data-cart-action="quantity" />' +
            '<button type="button" data-cart-action="increase">+</button>' +
          '</div>' +
        '</div>' +
        '<div class="cart-item-total">' +
          '<strong>' + formatMoney(item.subtotal) + '</strong>' +
          '<button type="button" data-cart-action="remove">Remover</button>' +
        '</div>' +
      '</div>';
  }).join("");

  bindCartItemButtons();
}

function bindCartItemButtons() {
  $all(".cart-item").forEach(function(itemEl) {
    var cartKey = itemEl.dataset.cartKey;

    var item = StoreState.cart.find(function(cartItem) {
      var itemKey = cartItem.productId + "::" + (cartItem.variationId || "principal");
      return itemKey === cartKey;
    });

    if (!item) return;

    itemEl.querySelectorAll("[data-cart-action]").forEach(function(control) {
      if (control.dataset.bound === "true") return;
      control.dataset.bound = "true";

      control.addEventListener("click", function(event) {
        event.preventDefault();
        event.stopPropagation();

        var action = control.dataset.cartAction;

        if (action === "increase") {
          changeCartItemQuantity(
            item.productId,
            item.variationId,
            Number(item.quantity || 1) + 1
          );
        }

        if (action === "decrease") {
          changeCartItemQuantity(
            item.productId,
            item.variationId,
            Number(item.quantity || 1) - 1
          );
        }

        if (action === "remove") {
          removeCartItem(item.productId, item.variationId);
        }
      });

      if (control.dataset.cartAction === "quantity") {
        control.addEventListener("change", function(event) {
          changeCartItemQuantity(
            item.productId,
            item.variationId,
            event.target.value
          );
        });
      }
    });
  });
}


function removeCartItem(productId, variationId) {
  StoreState.cart = StoreState.cart.filter(function(item) {
    return !(
      String(item.productId) === String(productId) &&
      String(item.variationId || "") === String(variationId || "")
    );
  });

  persistCart();
  renderCart();
  updateCounters();
  showToast("Produto removido do carrinho.", "info");
}

function changeCartItemQuantity(productId, variationId, quantity) {
  var product = getProductById(productId);

  if (!product) return;

  var variation = variationId
    ? getProductVariation(product, variationId)
    : null;

  var stock = variation ? variation.stock : product.stock;

  var item = StoreState.cart.find(function(cartItem) {
    return (
      String(cartItem.productId) === String(productId) &&
      String(cartItem.variationId || "") === String(variationId || "")
    );
  });

  if (!item) return;

  var newQuantity = Number(quantity);

  if (newQuantity <= 0) {
    removeCartItem(productId, variationId);
    return;
  }

  if (newQuantity > stock) {
    showToast("Quantidade maior que o estoque disponível.", "error");
    renderCart();
    return;
  }

  item.quantity = newQuantity;

  persistCart();
  renderCart();
  updateCounters();
}

function bindCartActions() {
  var checkoutBtn = $("#checkoutBtn");
  var sendCartWhatsapp = $("#sendCartWhatsapp");

  if (checkoutBtn) {
    checkoutBtn.onclick = openCheckout;
  }

  if (sendCartWhatsapp) {
    sendCartWhatsapp.onclick = sendCartToWhatsapp;
  }
}

function openCart() {
  var cartDrawer = $("#cartDrawer");
  var overlay = $("#drawerOverlay");

  if (cartDrawer) cartDrawer.classList.add("open");
  if (overlay) overlay.classList.add("open");

  pushDataLayer({
    event: "view_cart",
    ecommerce: {
      currency: MUGART_CONFIG.currency,
      value: getCartSubtotal(),
      items: getCartItemsDetailed().map(function(item) {
        return Object.assign({}, ga4Item(item.product, item.variation), {
          quantity: item.quantity
        });
      })
    }
  });
}

function closeCart() {
  var cartDrawer = $("#cartDrawer");
  var overlay = $("#drawerOverlay");

  if (cartDrawer) cartDrawer.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
}

function updateCounters() {
  var cartQuantity = getCartQuantity();
  var favoriteQuantity = StoreState.favorites.length;

  $all("[data-cart-count], #cartCount, .cart-count").forEach(function(el) {
    el.textContent = cartQuantity;
  });

  $all("[data-favorites-count], #favoritesCount, .favorites-count").forEach(function(el) {
    el.textContent = favoriteQuantity;
  });
}

function openCheckout() {
  if (!StoreState.cart.length) {
    showToast("Adicione um produto ao carrinho antes de finalizar.", "error");
    return;
  }

  closeCart();

  pushDataLayer({
    event: "begin_checkout",
    ecommerce: {
      currency: MUGART_CONFIG.currency,
      value: getCartSubtotal(),
      items: getCartItemsDetailed().map(function(item) {
        return Object.assign({}, ga4Item(item.product, item.variation), {
          quantity: item.quantity
        });
      })
    }
  });

  window.location.href = "checkout.html";
}

function closeCheckout() {
  // Checkout antigo removido.
}

function sendProductToWhatsapp(productId, variationId) {
  var product = getProductById(productId);

  if (!product) return;

  var variation = variationId
    ? getProductVariation(product, variationId)
    : null;

  var option = variation || {
    sku: product.sku,
    color: product.color,
    price: product.price,
    stock: product.stock
  };

  var message =
    "Olá! Vim pela loja da MugArt e gostaria de saber mais sobre este produto:\n\n" +
    "Produto: " + product.name + "\n" +
    "Variação: " + option.color + "\n" +
    "SKU: " + option.sku + "\n" +
    "Preço: " + formatMoney(option.price) + "\n" +
    "Estoque: " + option.stock + "\n\n" +
    "Link da página: " + window.location.href;

  pushDataLayer({
    event: "click_whatsapp_product",
    product_id: product.id,
    variation_id: variation ? variation.id : null,
    product_name: product.name,
    item_variant: option.color,
    product_price: option.price
  });

  window.open(
    "https://wa.me/" + MUGART_CONFIG.whatsapp + "?text=" + encodeURIComponent(message),
    "_blank"
  );
}

function sendCartToWhatsapp() {
  if (!StoreState.cart.length) {
    showToast("Seu carrinho está vazio.", "error");
    return;
  }

  var message = buildCartWhatsappMessage();

  pushDataLayer({
    event: "click_whatsapp_cart",
    cart_value: getCartSubtotal(),
    cart_items: getCartQuantity()
  });

  window.open(
    "https://wa.me/" + MUGART_CONFIG.whatsapp + "?text=" + encodeURIComponent(message),
    "_blank"
  );
}

function buildCartWhatsappMessage() {
  var items = getCartItemsDetailed();

  var lines = items.map(function(item) {
    return "- " +
      item.quantity +
      "x " +
      item.product.name +
      " (" +
      item.option.color +
      ") - " +
      formatMoney(item.subtotal);
  }).join("\n");

  return "Olá! Vim pela loja da MugArt e gostaria de finalizar este pedido:\n\n" +
    lines +
    "\n\n" +
    "Total: " +
    formatMoney(getCartSubtotal()) +
    "\n\n" +
    "Gostaria de continuar pelo WhatsApp.";
}

function ga4Item(product, variation) {
  var option = variation || {
    sku: product.sku,
    color: product.color,
    price: product.price
  };

  return {
    item_id: option.sku,
    item_name: product.name,
    item_category: product.category,
    item_variant: option.color,
    price: option.price
  };
}