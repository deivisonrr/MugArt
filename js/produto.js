/* MugArt - Página individual do produto e SEO */

(function () {
  "use strict";

  var CART_KEY = "mugart_cart";
  var WHATSAPP = "5511988849236";

  var state = {
    product: null,
    selectedOption: null,
    selectedMediaIndex: 0,
    cart: []
  };

  function $(selector) {
    return document.querySelector(selector);
  }

  function money(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value || 0));
  }

  function loadCart() {
    try {
      state.cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch {
      state.cart = [];
    }
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
  }

  function getSlug() {
    return new URL(window.location.href).searchParams.get("slug") || "";
  }

  async function loadProduct() {
    var slug = getSlug();

    if (!slug || !window.mugartSupabase) {
      showError();
      return;
    }

    var productResult = await window.mugartSupabase
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
        slug,
        seo_title,
        seo_description,
        image_alt,
        canonical_url,
        noindex,
        categories (
          id,
          name,
          slug
        )
      `)
      .eq("active", true)
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .maybeSingle();

    if (productResult.error || !productResult.data) {
      console.error(productResult.error);
      showError();
      return;
    }

    var product = productResult.data;

    var [variantsResult, mediaResult] = await Promise.all([
      window.mugartSupabase
        .from("product_variants")
        .select("id, product_id, color, sku, price, old_price, stock, image_url, active")
        .eq("product_id", product.id)
        .eq("active", true)
        .order("created_at", { ascending: true }),

      window.mugartSupabase
        .from("product_images")
        .select("id, product_id, image_url, sort_order, is_main, media_type, thumbnail_url")
        .eq("product_id", product.id)
        .order("is_main", { ascending: false })
        .order("sort_order", { ascending: true })
    ]);

    var variants = (variantsResult.data || []).map(function (variant) {
      return {
        id: variant.id,
        productId: product.id,
        color: variant.color || "Variação",
        sku: variant.sku || variant.id,
        price: Number(variant.price || 0),
        oldPrice: Number(variant.old_price || 0),
        stock: Number(variant.stock || 0),
        image: variant.image_url || product.image_url,
        isMainProduct: false
      };
    });

    var gallery = (mediaResult.data || []).map(function (media) {
      return {
        id: media.id,
        url: media.image_url,
        mediaType: media.media_type || "image",
        thumbnailUrl: media.thumbnail_url || null,
        isMain: media.is_main === true
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

    state.product = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description || "",
      category: product.categories ? product.categories.name : "Canecas",
      color: product.color || "Modelo principal",
      price: Number(product.price || 0),
      oldPrice: Number(product.old_price || 0),
      stock: Number(product.stock || 0),
      image: product.image_url,
      imageAlt: product.image_alt || product.name,
      slug: product.slug,
      seoTitle: product.seo_title,
      seoDescription: product.seo_description,
      canonicalUrl: product.canonical_url,
      noindex: product.noindex === true,
      variants: variants,
      gallery: gallery
    };

    state.selectedOption = {
      id: null,
      productId: product.id,
      color: product.color || "Modelo principal",
      sku: product.sku,
      price: Number(product.price || 0),
      oldPrice: Number(product.old_price || 0),
      stock: Number(product.stock || 0),
      image: product.image_url,
      isMainProduct: true
    };

    applySeo();
    renderPage();
    trackViewItem();

    $("#productLoading").classList.add("hidden");
    $("#productPage").classList.remove("hidden");
  }

  function currentMedia() {
    if (state.selectedOption && !state.selectedOption.isMainProduct) {
      return [{
        id: state.selectedOption.id,
        url: state.selectedOption.image,
        mediaType: "image",
        thumbnailUrl: null
      }];
    }

    return state.product.gallery;
  }

  function renderPage() {
    var product = state.product;

    $("#breadcrumbProduct").textContent = product.name;
    $("#productCategory").textContent = product.category;
    $("#productName").textContent = product.name;
    $("#productDescription").textContent = product.description;

    renderVariants();
    renderPriceStock();
    renderMedia();
    renderCart();
  }

  function renderVariants() {
    var options = [{
      id: null,
      color: state.product.color,
      image: state.product.image,
      price: state.product.price,
      oldPrice: state.product.oldPrice,
      stock: state.product.stock,
      sku: state.product.sku,
      isMainProduct: true
    }].concat(state.product.variants);

    $("#productVariants").innerHTML = options.map(function (option, index) {
      var active =
        state.selectedOption &&
        String(state.selectedOption.id || "") === String(option.id || "")
          ? "active"
          : "";

      return (
        '<button class="product-variant-button ' + active + '" ' +
          'type="button" data-option-index="' + index + '">' +
          '<img src="' + option.image + '" alt="' +
            state.product.name + " " + option.color + '">' +
          '<span>' + option.color + "<br>" + money(option.price) + "</span>" +
        "</button>"
      );
    }).join("");

    document.querySelectorAll("[data-option-index]").forEach(function (button) {
      button.addEventListener("click", function () {
        var index = Number(button.dataset.optionIndex);
        state.selectedOption = options[index];
        state.selectedMediaIndex = 0;
        renderVariants();
        renderPriceStock();
        renderMedia();
        trackVariantSelection();
      });
    });
  }

  function renderPriceStock() {
    var option = state.selectedOption;

    $("#productPrice").textContent = money(option.price);
    $("#productOldPrice").textContent =
      option.oldPrice && option.oldPrice > option.price
        ? money(option.oldPrice)
        : "";

    var stock = $("#productStock");
    stock.textContent =
      option.stock > 0
        ? option.stock + " unidade(s) disponível(is)"
        : "Produto esgotado";
    stock.classList.toggle("low", option.stock > 0 && option.stock <= 3);

    $("#productQuantity").max = String(Math.max(1, option.stock));
    $("#addProductToCart").disabled = option.stock <= 0;
  }

  function renderMedia() {
    var media = currentMedia();

    if (state.selectedMediaIndex >= media.length) {
      state.selectedMediaIndex = 0;
    }

    var selected = media[state.selectedMediaIndex] || {
      url: state.product.image,
      mediaType: "image"
    };

    $("#productMainMedia").innerHTML =
      selected.mediaType === "video"
        ? '<video src="' + selected.url +
          '" controls muted playsinline preload="metadata"></video>'
        : '<img src="' + selected.url + '" alt="' +
          state.product.imageAlt + '">';

    $("#productMediaThumbnails").innerHTML =
      media.length > 1
        ? media.map(function (item, index) {
            return (
              '<button class="product-media-thumb ' +
                (index === state.selectedMediaIndex ? "active " : "") +
                (item.mediaType === "video" ? "video" : "") +
                '" type="button" data-media-index="' + index + '">' +
                (item.mediaType === "video"
                  ? '<i class="fa-solid fa-play"></i>'
                  : '<img src="' + item.url + '" alt="' +
                    state.product.imageAlt + '">') +
              "</button>"
            );
          }).join("")
        : "";

    document.querySelectorAll("[data-media-index]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.selectedMediaIndex = Number(button.dataset.mediaIndex);
        renderMedia();
      });
    });
  }

  function addToCart() {
    var product = state.product;
    var option = state.selectedOption;
    var quantity = Math.max(1, Number($("#productQuantity").value || 1));

    if (quantity > option.stock) {
      alert("Quantidade maior que o estoque disponível.");
      return;
    }

    var variationId = option.isMainProduct ? null : option.id;

    var existing = state.cart.find(function (item) {
      return (
        String(item.productId) === String(product.id) &&
        String(item.variationId || "") === String(variationId || "")
      );
    });

    if (existing) {
      if (Number(existing.quantity || 0) + quantity > option.stock) {
        alert("Quantidade maior que o estoque disponível.");
        return;
      }
      existing.quantity += quantity;
    } else {
      state.cart.push({
        productId: product.id,
        variationId: variationId,
        variationColor: option.color,
        variationSku: option.sku,
        unitPrice: option.price,
        image: option.image,
        quantity: quantity
      });
    }

    saveCart();
    renderCart();
    openCart();

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "add_to_cart",
      ecommerce: {
        currency: "BRL",
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

  function renderCart() {
    $("#productCartCount").textContent = String(
      state.cart.reduce(function (total, item) {
        return total + Number(item.quantity || 0);
      }, 0)
    );

    var detailed = state.cart.map(function (item) {
      return {
        item: item,
        subtotal: Number(item.unitPrice || 0) * Number(item.quantity || 0)
      };
    });

    $("#productCartSubtotal").textContent = money(
      detailed.reduce(function (sum, row) {
        return sum + row.subtotal;
      }, 0)
    );

    $("#productCartItems").innerHTML = detailed.length
      ? detailed.map(function (row) {
          return (
            '<div class="product-cart-item">' +
              '<img src="' + row.item.image + '" alt="Produto">' +
              '<div><strong>' + state.product.name + '</strong><br>' +
                '<small>' + row.item.variationColor + ' · ' +
                row.item.quantity + 'x</small></div>' +
              '<strong>' + money(row.subtotal) + '</strong>' +
            '</div>'
          );
        }).join("")
      : "<p>Seu carrinho está vazio.</p>";
  }

  function openCart() {
    $("#productCartDrawer").classList.add("open");
    $("#productCartOverlay").classList.add("open");
  }

  function closeCart() {
    $("#productCartDrawer").classList.remove("open");
    $("#productCartOverlay").classList.remove("open");
  }

  function applySeo() {
    var product = state.product;
    var title = product.seoTitle || product.name + " | MugArt";
    var description =
      product.seoDescription ||
      product.description.slice(0, 165) ||
      "Caneca personalizada MugArt.";
    var canonical =
      product.canonicalUrl ||
      "https://mugart.com.br/produto.html?slug=" +
        encodeURIComponent(product.slug || product.id);

    document.title = title;
    $("#metaDescription").content = description;
    $("#metaRobots").content =
      product.noindex ? "noindex,nofollow" : "index,follow";
    $("#canonicalLink").href = canonical;

    $("#ogTitle").content = title;
    $("#ogDescription").content = description;
    $("#ogImage").content = product.image;
    $("#ogUrl").content = canonical;

    $("#twitterTitle").content = title;
    $("#twitterDescription").content = description;
    $("#twitterImage").content = product.image;

    var offers = [{
      "@type": "Offer",
      "url": canonical,
      "priceCurrency": "BRL",
      "price": product.price.toFixed(2),
      "availability":
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      "sku": product.sku
    }].concat(product.variants.map(function (variant) {
      return {
        "@type": "Offer",
        "url": canonical + "#variant-" + variant.id,
        "priceCurrency": "BRL",
        "price": variant.price.toFixed(2),
        "availability":
          variant.stock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        "sku": variant.sku
      };
    }));

    var schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": description,
      "image": product.gallery
        .filter(function (item) { return item.mediaType === "image"; })
        .map(function (item) { return item.url; }),
      "sku": product.sku,
      "brand": {
        "@type": "Brand",
        "name": "MugArt"
      },
      "category": product.category,
      "offers": offers
    };

    $("#productStructuredData").textContent =
      JSON.stringify(schema);
  }

  function trackViewItem() {
    var product = state.product;
    var option = state.selectedOption;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "view_item",
      ecommerce: {
        currency: "BRL",
        value: option.price,
        items: [{
          item_id: option.sku,
          item_name: product.name,
          item_category: product.category,
          item_variant: option.color,
          price: option.price
        }]
      }
    });
  }

  function trackVariantSelection() {
    var product = state.product;
    var option = state.selectedOption;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "select_item_variant",
      item_variant: option.color,
      item_id: option.sku,
      product_id: product.id,
      variation_id: option.isMainProduct ? null : option.id,
      price: option.price,
      ecommerce: {
        currency: "BRL",
        value: option.price,
        items: [{
          item_id: option.sku,
          item_name: product.name,
          item_category: product.category,
          item_variant: option.color,
          price: option.price
        }]
      }
    });
  }

  function sendWhatsapp() {
    var product = state.product;
    var option = state.selectedOption;

    var message = [
      "Olá! Gostaria de saber mais sobre este produto da MugArt:",
      "",
      "Produto: " + product.name,
      "Opção: " + option.color,
      "SKU: " + option.sku,
      "Preço: " + money(option.price),
      "",
      window.location.href
    ].join("\n");

    window.open(
      "https://wa.me/" + WHATSAPP +
        "?text=" + encodeURIComponent(message),
      "_blank"
    );
  }

  function showError() {
    $("#productLoading").classList.add("hidden");
    $("#productError").classList.remove("hidden");
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadCart();
    renderCart();

    $("#addProductToCart").addEventListener("click", addToCart);
    $("#productWhatsapp").addEventListener("click", sendWhatsapp);
    $("#productCartButton").addEventListener("click", openCart);
    $("#closeProductCart").addEventListener("click", closeCart);
    $("#productCartOverlay").addEventListener("click", closeCart);

    loadProduct();
  });
})();
