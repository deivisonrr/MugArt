/* ==========================================================
   MugArt - Página individual do produto PRO
========================================================== */

(function () {
  "use strict";

  var CART_KEY = "mugart_cart";
  var WHATSAPP = "5511988849236";

  var state = {
    product: null,
    selectedOption: null,
    selectedMediaIndex: 0,
    cart: [],
    relatedProducts: [],
    touchStartX: 0,
    toastTimer: null,
    countdownTimer: null,
    favorite: false
  };

  function $(selector) {
    return document.querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function money(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value || 0));
  }


  function promotionActive(startsAt, endsAt) {
    var now = Date.now();
    var starts = startsAt ? new Date(startsAt).getTime() : null;
    var ends = endsAt ? new Date(endsAt).getTime() : null;

    if (starts && now < starts) return false;
    if (ends && now > ends) return false;
    return true;
  }

  function resolvePrices(price, oldPrice, startsAt, endsAt) {
    var promotional = Number(price || 0);
    var normal = Number(oldPrice || 0);

    if (
      normal > promotional &&
      promotionActive(startsAt, endsAt)
    ) {
      return {
        price: promotional,
        oldPrice: normal
      };
    }

    return {
      price: normal > 0 ? normal : promotional,
      oldPrice: 0
    };
  }

  function loadCart() {
    try {
      state.cart = JSON.parse(
        localStorage.getItem(CART_KEY) || "[]"
      );
    } catch {
      state.cart = [];
    }
  }

  function saveCart() {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify(state.cart)
    );
  }

  function getSlug() {
    return new URL(window.location.href)
      .searchParams
      .get("slug") || "";
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(String(value || "").trim());
  }

  function showToast(message) {
    var toast = $("#productToast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(state.toastTimer);

    state.toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2600);
  }

  async function loadProduct() {
    var slug = getSlug();

    if (!slug || !window.mugartSupabase) {
      showError();
      return;
    }

    var productSelect = `
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
      badge_text,
      badge_type,
      offer_starts_at,
      offer_ends_at,
      installments_max,
      pix_discount_percent,
      categories (
        id,
        name,
        slug
      )
    `;

    var productResult = await window.mugartSupabase
      .from("products")
      .select(productSelect)
      .eq("active", true)
      .eq("slug", slug)
      .maybeSingle();

    if (
      !productResult.data &&
      !productResult.error &&
      isUuid(slug)
    ) {
      productResult = await window.mugartSupabase
        .from("products")
        .select(productSelect)
        .eq("active", true)
        .eq("id", slug)
        .maybeSingle();
    }

    if (
      productResult.error ||
      !productResult.data
    ) {
      console.error(productResult.error);
      showError();
      return;
    }

    var product = productResult.data;

    var results = await Promise.all([
      window.mugartSupabase
        .from("product_variants")
        .select(`
          id,
          product_id,
          color,
          sku,
          price,
          old_price,
          offer_starts_at,
          offer_ends_at,
          stock,
          image_url,
          active,
          created_at
        `)
        .eq("product_id", product.id)
        .eq("active", true)
        .order("created_at", {
          ascending: true
        }),

      window.mugartSupabase
        .from("product_images")
        .select(`
          id,
          product_id,
          image_url,
          sort_order,
          is_main,
          media_type,
          thumbnail_url
        `)
        .eq("product_id", product.id)
        .order("is_main", {
          ascending: false
        })
        .order("sort_order", {
          ascending: true
        }),

      window.mugartSupabase
        .from("products")
        .select(`
          id,
          name,
          slug,
          price,
          stock,
          image_url,
          image_alt,
          category_id,
          categories (
            id,
            name
          )
        `)
        .eq("active", true)
        .eq(
          "category_id",
          product.categories
            ? product.categories.id
            : null
        )
        .neq("id", product.id)
        .order("featured", {
          ascending: false
        })
        .limit(4)
    ]);

    var variantsResult = results[0];
    var mediaResult = results[1];
    var relatedResult = results[2];

    var variants = (
      variantsResult.data || []
    ).map(function (variant) {
      var resolvedVariantPrice = resolvePrices(
        variant.price,
        variant.old_price,
        variant.offer_starts_at,
        variant.offer_ends_at
      );

      return {
        id: variant.id,
        productId: product.id,
        color:
          variant.color || "Variação",
        sku:
          variant.sku || variant.id,
        price:
          resolvedVariantPrice.price,
        oldPrice:
          resolvedVariantPrice.oldPrice,
        offerStartsAt:
          variant.offer_starts_at || null,
        offerEndsAt:
          variant.offer_ends_at || null,
        stock:
          Number(variant.stock || 0),
        image:
          variant.image_url ||
          product.image_url,
        isMainProduct: false
      };
    });

    var gallery = (
      mediaResult.data || []
    ).map(function (media) {
      return {
        id: media.id,
        url: media.image_url,
        mediaType:
          media.media_type || "image",
        thumbnailUrl:
          media.thumbnail_url || null,
        isMain:
          media.is_main === true
      };
    });

    if (!gallery.some(function (item) {
      return item.url === product.image_url;
    })) {
      gallery.unshift({
        id: "main-" + product.id,
        url: product.image_url,
        mediaType: "image",
        thumbnailUrl: null,
        isMain: true
      });
    }

    var resolvedProductPrice = resolvePrices(
      product.price,
      product.old_price,
      product.offer_starts_at,
      product.offer_ends_at
    );

    state.product = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description:
        product.description || "",
      category:
        product.categories
          ? product.categories.name
          : "Canecas",
      categoryId:
        product.categories
          ? product.categories.id
          : null,
      categorySlug:
        product.categories
          ? product.categories.slug
          : "",
      color:
        product.color ||
        "Modelo principal",
      price:
        resolvedProductPrice.price,
      oldPrice:
        resolvedProductPrice.oldPrice,
      stock:
        Number(product.stock || 0),
      image:
        product.image_url,
      imageAlt:
        product.image_alt ||
        product.name,
      slug:
        product.slug,
      seoTitle:
        product.seo_title,
      seoDescription:
        product.seo_description,
      canonicalUrl:
        product.canonical_url,
      noindex:
        product.noindex === true,
      badgeText:
        product.badge_text || "",
      badgeType:
        product.badge_type || "promo",
      offerStartsAt:
        product.offer_starts_at || null,
      offerEndsAt:
        product.offer_ends_at || null,
      installmentsMax:
        Number(product.installments_max || 12),
      pixDiscountPercent:
        Number(product.pix_discount_percent || 0),
      variants: variants,
      gallery: gallery
    };

    state.selectedOption = {
      id: null,
      productId: product.id,
      color:
        product.color ||
        "Modelo principal",
      sku: product.sku,
      price:
        resolvedProductPrice.price,
      oldPrice:
        resolvedProductPrice.oldPrice,
      stock:
        Number(product.stock || 0),
      image:
        product.image_url,
      isMainProduct: true
    };

    state.relatedProducts =
      relatedResult.data || [];

    applySeo();
    renderPage();
    trackViewItem();

    $("#productLoading")
      .classList
      .add("hidden");

    $("#productPage")
      .classList
      .remove("hidden");
  }

  function currentMedia() {
    if (
      state.selectedOption &&
      !state.selectedOption.isMainProduct
    ) {
      return [{
        id: state.selectedOption.id,
        url: state.selectedOption.image,
        mediaType: "image",
        thumbnailUrl: null
      }];
    }

    return state.product.gallery;
  }

  function currentMediaItem() {
    var media = currentMedia();

    if (!media.length) {
      return {
        url: state.product.image,
        mediaType: "image"
      };
    }

    if (
      state.selectedMediaIndex < 0
    ) {
      state.selectedMediaIndex =
        media.length - 1;
    }

    if (
      state.selectedMediaIndex >=
      media.length
    ) {
      state.selectedMediaIndex = 0;
    }

    return media[
      state.selectedMediaIndex
    ];
  }

  function renderPage() {
    var product = state.product;

    $("#breadcrumbCategory").textContent =
      product.category;

    $("#breadcrumbProduct").textContent =
      product.name;

    $("#productCategory").textContent =
      product.category;

    $("#productName").textContent =
      product.name;

    $("#productDescription").textContent =
      product.description;

    renderBadge();
    renderVariants();
    renderPriceStock();
    renderMedia();
    renderRelatedProducts();
    renderCart();
    initializeCountdown();
    initializeFavorite();
  }


  function renderBadge() {
    var badge = $("#productBadge");

    if (!badge) return;

    if (!state.product.badgeText) {
      badge.classList.add("hidden");
      badge.textContent = "";
      return;
    }

    badge.textContent =
      state.product.badgeText;

    badge.className =
      "product-badge " +
      (
        state.product.badgeType ||
        "promo"
      );
  }

  function renderCommercialConditions() {
    var option =
      state.selectedOption;

    var installments =
      Math.max(
        1,
        Number(
          state.product.installmentsMax ||
          12
        )
      );

    var installmentValue =
      Number(option.price || 0) /
      installments;

    $("#productInstallments").innerHTML =
      "ou em até <strong>" +
      installments +
      "x de " +
      money(installmentValue) +
      "</strong>";

    var pixDiscount =
      Math.max(
        0,
        Number(
          state.product.pixDiscountPercent ||
          0
        )
      );

    if (pixDiscount > 0) {
      var pixPrice =
        Number(option.price || 0) *
        (
          1 -
          pixDiscount / 100
        );

      $("#productPixDiscount").textContent =
        money(pixPrice) +
        " no Pix com " +
        pixDiscount +
        "% de desconto";
    } else {
      $("#productPixDiscount").textContent =
        "";
    }
  }

  function initializeCountdown() {
    clearInterval(
      state.countdownTimer
    );

    var container =
      $("#productCountdown");

    var value =
      $("#productCountdownValue");

    if (
      !container ||
      !value ||
      !state.product.offerEndsAt ||
      !promotionActive(
        state.product.offerStartsAt,
        state.product.offerEndsAt
      ) ||
      !state.product.oldPrice
    ) {
      container?.classList.add(
        "hidden"
      );

      return;
    }

    var endTime =
      new Date(
        state.product.offerEndsAt
      ).getTime();

    if (
      !Number.isFinite(endTime)
    ) {
      container.classList.add(
        "hidden"
      );

      return;
    }

    function updateCountdown() {
      var remaining =
        endTime - Date.now();

      if (remaining <= 0) {
        clearInterval(
          state.countdownTimer
        );

        container.classList.add(
          "hidden"
        );

        return;
      }

      var days =
        Math.floor(
          remaining /
          86400000
        );

      var hours =
        Math.floor(
          (
            remaining %
            86400000
          ) /
          3600000
        );

      var minutes =
        Math.floor(
          (
            remaining %
            3600000
          ) /
          60000
        );

      var seconds =
        Math.floor(
          (
            remaining %
            60000
          ) /
          1000
        );

      value.textContent =
        String(days).padStart(2, "0") +
        "d " +
        String(hours).padStart(2, "0") +
        "h " +
        String(minutes).padStart(2, "0") +
        "m " +
        String(seconds).padStart(2, "0") +
        "s";

      container.classList.remove(
        "hidden"
      );
    }

    updateCountdown();

    state.countdownTimer =
      setInterval(
        updateCountdown,
        1000
      );
  }

  async function initializeFavorite() {
    var button =
      $("#favoriteProductButton");

    if (!button) return;

    var localKey =
      "mugart_favorites";

    var localFavorites = [];

    try {
      localFavorites =
        JSON.parse(
          localStorage.getItem(
            localKey
          ) || "[]"
        );
    } catch {
      localFavorites = [];
    }

    state.favorite =
      localFavorites.includes(
        state.product.id
      );

    renderFavoriteButton();

    var sessionResult =
      await window.mugartSupabase
        .auth
        .getSession();

    var user =
      sessionResult
        .data
        .session
        ?.user;

    if (!user) {
      return;
    }

    var result =
      await window.mugartSupabase
        .from(
          "customer_favorites"
        )
        .select("id")
        .eq("user_id", user.id)
        .eq(
          "product_id",
          state.product.id
        )
        .maybeSingle();

    if (!result.error) {
      state.favorite =
        Boolean(result.data);

      renderFavoriteButton();
    }
  }

  function renderFavoriteButton() {
    var button =
      $("#favoriteProductButton");

    if (!button) return;

    button.classList.toggle(
      "active",
      state.favorite
    );

    button.setAttribute(
      "aria-pressed",
      String(state.favorite)
    );

    button.setAttribute(
      "aria-label",
      state.favorite
        ? "Remover dos favoritos"
        : "Adicionar aos favoritos"
    );

    button.innerHTML =
      state.favorite
        ? '<i class="fa-solid fa-heart"></i>'
        : '<i class="fa-regular fa-heart"></i>';
  }

  async function toggleFavorite() {
    state.favorite =
      !state.favorite;

    renderFavoriteButton();

    var localKey =
      "mugart_favorites";

    var localFavorites = [];

    try {
      localFavorites =
        JSON.parse(
          localStorage.getItem(
            localKey
          ) || "[]"
        );
    } catch {
      localFavorites = [];
    }

    localFavorites =
      state.favorite
        ? Array.from(
            new Set(
              localFavorites.concat(
                state.product.id
              )
            )
          )
        : localFavorites.filter(
            function (id) {
              return (
                String(id) !==
                String(
                  state.product.id
                )
              );
            }
          );

    localStorage.setItem(
      localKey,
      JSON.stringify(
        localFavorites
      )
    );

    var sessionResult =
      await window.mugartSupabase
        .auth
        .getSession();

    var user =
      sessionResult
        .data
        .session
        ?.user;

    if (user) {
      if (state.favorite) {
        var insertResult =
          await window.mugartSupabase
            .from(
              "customer_favorites"
            )
            .upsert(
              {
                user_id: user.id,
                product_id:
                  state.product.id
              },
              {
                onConflict:
                  "user_id,product_id"
              }
            );

        if (insertResult.error) {
          console.error(
            insertResult.error
          );
        }
      } else {
        var deleteResult =
          await window.mugartSupabase
            .from(
              "customer_favorites"
            )
            .delete()
            .eq("user_id", user.id)
            .eq(
              "product_id",
              state.product.id
            );

        if (deleteResult.error) {
          console.error(
            deleteResult.error
          );
        }
      }
    }

    showToast(
      state.favorite
        ? "Produto adicionado aos favoritos."
        : "Produto removido dos favoritos."
    );
  }

  function normalizePostalCode(value) {
    return String(value || "")
      .replace(/\D/g, "")
      .slice(0, 8);
  }

  function formatPostalCode(value) {
    var digits =
      normalizePostalCode(value);

    return digits.length > 5
      ? digits.slice(0, 5) +
        "-" +
        digits.slice(5)
      : digits;
  }

  async function calculateShipping() {
    var input =
      $("#shippingPostalCode");

    var postalCode =
      normalizePostalCode(
        input.value
      );

    var errorBox =
      $("#productShippingError");

    var loading =
      $("#productShippingLoading");

    var options =
      $("#productShippingOptions");

    errorBox.classList.add(
      "hidden"
    );

    options.innerHTML = "";

    if (postalCode.length !== 8) {
      errorBox.textContent =
        "Digite um CEP válido com 8 números.";

      errorBox.classList.remove(
        "hidden"
      );

      return;
    }

    input.value =
      formatPostalCode(
        postalCode
      );

    loading.classList.remove(
      "hidden"
    );

    var option =
      state.selectedOption;

    try {
      var response = await fetch(
        "https://qtchckrcwnsmcsbehjkq.supabase.co/functions/v1/calculate-shipping",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            "apikey":
              window.SUPABASE_ANON_KEY ||
              ""
          },
          body: JSON.stringify({
            to_zip: postalCode,
            cep: postalCode,
            postal_code: postalCode,
            destination_postal_code:
              postalCode,
            quantity: Number(
              $("#productQuantity").value ||
              1
            ),
            product_id:
              state.product.id,
            variation_id:
              option.isMainProduct
                ? null
                : option.id,
            items: [{
              product_id:
                state.product.id,
              variation_id:
                option.isMainProduct
                  ? null
                  : option.id,
              quantity: Number(
                $("#productQuantity").value ||
                1
              ),
              unit_price:
                option.price
            }]
          })
        }
      );
