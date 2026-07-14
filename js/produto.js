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
    toastTimer: null
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

    const productSelect = `
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
      categories (
        id,
        name,
        slug
      )
    `;

    /*
     * Busca primeiro pelo slug exato.
     * Não usamos .or(), pois caracteres especiais no slug podem
     * quebrar a sintaxe do filtro PostgREST.
     */
    var productResult = await window.mugartSupabase
      .from("products")
      .select(productSelect)
      .eq("active", true)
      .eq("slug", slug)
      .maybeSingle();

    /*
     * Compatibilidade: se a URL recebeu um UUID antigo em vez
     * de slug, tenta buscar pelo ID.
     */
    if (
      !productResult.error &&
      !productResult.data &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug)
    ) {
      productResult = await window.mugartSupabase
        .from("products")
        .select(productSelect)
        .eq("active", true)
        .eq("id", slug)
        .maybeSingle();
    }

    if (productResult.error) {
      console.error(
        "[Produto] Erro ao buscar produto:",
        productResult.error
      );

      showError();
      return;
    }

    if (!productResult.data) {
      console.warn(
        "[Produto] Nenhum produto ativo encontrado para o slug:",
        slug
      );

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
      return {
        id: variant.id,
        productId: product.id,
        color:
          variant.color || "Variação",
        sku:
          variant.sku || variant.id,
        price:
          Number(variant.price || 0),
        oldPrice:
          Number(variant.old_price || 0),
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
        Number(product.price || 0),
      oldPrice:
        Number(product.old_price || 0),
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
        Number(product.price || 0),
      oldPrice:
        Number(product.old_price || 0),
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

    renderVariants();
    renderPriceStock();
    renderMedia();
    renderRelatedProducts();
    renderCart();
  }

  function getProductOptions() {
    return [{
      id: null,
      color: state.product.color,
      image: state.product.image,
      price: state.product.price,
      oldPrice: state.product.oldPrice,
      stock: state.product.stock,
      sku: state.product.sku,
      isMainProduct: true
    }].concat(
      state.product.variants
    );
  }

  function renderVariants() {
    var options =
      getProductOptions();

    $("#productVariants").innerHTML =
      options.map(function (
        option,
        index
      ) {
        var active =
          state.selectedOption &&
          String(
            state.selectedOption.id || ""
          ) ===
          String(option.id || "")
            ? "active"
            : "";

        var soldOut =
          option.stock <= 0
            ? "sold-out"
            : "";

        return (
          '<button class="product-variant-button ' +
            active +
            " " +
            soldOut +
          '" type="button" data-option-index="' +
            index +
          '">' +
            '<img src="' +
              escapeHtml(option.image) +
            '" alt="' +
              escapeHtml(
                state.product.name +
                " " +
                option.color
              ) +
            '">' +
            '<span>' +
              escapeHtml(option.color) +
              "<br>" +
              money(option.price) +
            "</span>" +
          "</button>"
        );
      }).join("");

    document
      .querySelectorAll(
        "[data-option-index]"
      )
      .forEach(function (button) {
        button.addEventListener(
          "click",
          function () {
            var index = Number(
              button.dataset.optionIndex
            );

            state.selectedOption =
              options[index];

            state.selectedMediaIndex = 0;

            renderVariants();
            renderPriceStock();
            renderMedia();
            trackVariantSelection();
          }
        );
      });
  }

  function renderPriceStock() {
    var option =
      state.selectedOption;

    $("#productPrice").textContent =
      money(option.price);

    $("#productOldPrice").textContent =
      option.oldPrice &&
      option.oldPrice > option.price
        ? money(option.oldPrice)
        : "";

    var stock =
      $("#productStock");

    stock.classList.remove(
      "low",
      "out"
    );

    if (option.stock <= 0) {
      stock.textContent =
        "Produto esgotado";

      stock.classList.add("out");
    } else {
      stock.textContent =
        option.stock +
        " unidade(s) disponível(is)";

      if (option.stock <= 3) {
        stock.classList.add("low");
      }
    }

    $("#productQuantity").max =
      String(
        Math.max(1, option.stock)
      );

    $("#addProductToCart").disabled =
      option.stock <= 0;
  }

  function renderMedia() {
    var media = currentMedia();
    var selected =
      currentMediaItem();

    var main =
      $("#productMainMedia");

    main.innerHTML =
      selected.mediaType === "video"
        ? '<video src="' +
          escapeHtml(selected.url) +
          '" controls muted playsinline preload="metadata"></video>'
        : '<img id="productMainImage" src="' +
          escapeHtml(selected.url) +
          '" alt="' +
          escapeHtml(
            state.product.imageAlt
          ) +
          '">';

    $("#productMediaPosition").textContent =
      media.length > 1
        ? (
          state.selectedMediaIndex + 1
        ) +
        " de " +
        media.length
        : "";

    $("#previousMedia").classList.toggle(
      "hidden",
      media.length <= 1
    );

    $("#nextMedia").classList.toggle(
      "hidden",
      media.length <= 1
    );

    $("#productMediaThumbnails")
      .innerHTML =
      media.length > 1
        ? media.map(function (
            item,
            index
          ) {
            return (
              '<button class="product-media-thumb ' +
                (
                  index ===
                  state.selectedMediaIndex
                    ? "active "
                    : ""
                ) +
                (
                  item.mediaType === "video"
                    ? "video"
                    : ""
                ) +
              '" type="button" data-media-index="' +
                index +
              '">' +
                (
                  item.mediaType === "video"
                    ? '<i class="fa-solid fa-play"></i>'
                    : '<img src="' +
                      escapeHtml(item.url) +
                      '" alt="' +
                      escapeHtml(
                        state.product.imageAlt
                      ) +
                      '">'
                ) +
              "</button>"
            );
          }).join("")
        : "";

    document
      .querySelectorAll(
        "[data-media-index]"
      )
      .forEach(function (button) {
        button.addEventListener(
          "click",
          function () {
            state.selectedMediaIndex =
              Number(
                button.dataset.mediaIndex
              );

            renderMedia();
          }
        );
      });

    bindImageZoom();
  }

  function bindImageZoom() {
    var main =
      $("#productMainMedia");

    var image =
      $("#productMainImage");

    if (!main || !image) return;

    main.addEventListener(
      "mousemove",
      function (event) {
        if (
          window.innerWidth <= 850
        ) {
          return;
        }

        var rect =
          main.getBoundingClientRect();

        var x =
          (
            (event.clientX - rect.left) /
            rect.width
          ) * 100;

        var y =
          (
            (event.clientY - rect.top) /
            rect.height
          ) * 100;

        image.style.setProperty(
          "--zoom-x",
          x + "%"
        );

        image.style.setProperty(
          "--zoom-y",
          y + "%"
        );

        image.classList.add("zoomed");
      }
    );

    main.addEventListener(
      "mouseleave",
      function () {
        image.classList.remove(
          "zoomed"
        );
      }
    );
  }

  function changeMedia(direction) {
    var media = currentMedia();

    if (media.length <= 1) return;

    state.selectedMediaIndex =
      (
        state.selectedMediaIndex +
        direction +
        media.length
      ) % media.length;

    renderMedia();

    if (
      $("#mediaLightbox")
        .classList
        .contains("open")
    ) {
      renderLightbox();
    }
  }

  function renderLightbox() {
    var selected =
      currentMediaItem();

    $("#mediaLightboxContent").innerHTML =
      selected.mediaType === "video"
        ? '<video src="' +
          escapeHtml(selected.url) +
          '" controls autoplay muted playsinline></video>'
        : '<img src="' +
          escapeHtml(selected.url) +
          '" alt="' +
          escapeHtml(
            state.product.imageAlt
          ) +
          '">';
  }

  function openLightbox() {
    renderLightbox();

    $("#mediaLightbox")
      .classList
      .add("open");

    $("#mediaLightbox")
      .setAttribute(
        "aria-hidden",
        "false"
      );

    document.body.classList.add(
      "no-scroll"
    );
  }

  function closeLightbox() {
    $("#mediaLightbox")
      .classList
      .remove("open");

    $("#mediaLightbox")
      .setAttribute(
        "aria-hidden",
        "true"
      );

    $("#mediaLightboxContent")
      .innerHTML = "";

    document.body.classList.remove(
      "no-scroll"
    );
  }

  function renderRelatedProducts() {
    var container =
      $("#relatedProducts");

    if (
      !state.relatedProducts.length
    ) {
      container.innerHTML =
        "<p>Nenhum produto relacionado encontrado.</p>";

      return;
    }

    container.innerHTML =
      state.relatedProducts.map(
        function (product) {
          var url =
            "produto.html?slug=" +
            encodeURIComponent(
              product.slug ||
              product.id
            );

          return (
            '<a class="related-product-card" href="' +
              url +
            '">' +
              '<img src="' +
                escapeHtml(
                  product.image_url ||
                  "assets/hero-caneca.png"
                ) +
              '" alt="' +
                escapeHtml(
                  product.image_alt ||
                  product.name
                ) +
              '">' +
              '<div class="related-product-card-content">' +
                "<span>" +
                  escapeHtml(
                    product.categories
                      ? product.categories.name
                      : "Canecas"
                  ) +
                "</span>" +
                "<h3>" +
                  escapeHtml(
                    product.name
                  ) +
                "</h3>" +
                "<strong>" +
                  money(product.price) +
                "</strong>" +
              "</div>" +
            "</a>"
          );
        }
      ).join("");
  }

  function addToCart() {
    var product =
      state.product;

    var option =
      state.selectedOption;

    var quantity =
      Math.max(
        1,
        Number(
          $("#productQuantity").value ||
          1
        )
      );

    if (quantity > option.stock) {
      showToast(
        "Quantidade maior que o estoque disponível."
      );

      return;
    }

    var variationId =
      option.isMainProduct
        ? null
        : option.id;

    var existing =
      state.cart.find(function (item) {
        return (
          String(item.productId) ===
          String(product.id) &&
          String(
            item.variationId || ""
          ) ===
          String(variationId || "")
        );
      });

    if (existing) {
      var newQuantity =
        Number(
          existing.quantity || 0
        ) + quantity;

      if (
        newQuantity >
        option.stock
      ) {
        showToast(
          "Quantidade maior que o estoque disponível."
        );

        return;
      }

      existing.quantity =
        newQuantity;

      existing.unitPrice =
        option.price;

      existing.image =
        option.image;
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

    showToast(
      "Produto adicionado ao carrinho."
    );

    window.dataLayer =
      window.dataLayer || [];

    window.dataLayer.push({
      event: "add_to_cart",
      ecommerce: {
        currency: "BRL",
        value:
          option.price *
          quantity,
        items: [{
          item_id: option.sku,
          item_name: product.name,
          item_category:
            product.category,
          item_variant:
            option.color,
          price:
            option.price,
          quantity:
            quantity
        }]
      }
    });
  }

  function renderCart() {
    var totalQuantity =
      state.cart.reduce(
        function (total, item) {
          return (
            total +
            Number(
              item.quantity || 0
            )
          );
        },
        0
      );

    $("#productCartCount").textContent =
      String(totalQuantity);

    var detailed =
      state.cart.map(
        function (item) {
          return {
            item: item,
            subtotal:
              Number(
                item.unitPrice || 0
              ) *
              Number(
                item.quantity || 0
              )
          };
        }
      );

    $("#productCartSubtotal")
      .textContent =
      money(
        detailed.reduce(
          function (sum, row) {
            return (
              sum +
              row.subtotal
            );
          },
          0
        )
      );

    $("#productCartItems").innerHTML =
      detailed.length
        ? detailed.map(
            function (row) {
              return (
                '<div class="product-cart-item">' +
                  '<img src="' +
                    escapeHtml(
                      row.item.image
                    ) +
                  '" alt="Produto">' +
                  "<div>" +
                    "<strong>" +
                      escapeHtml(
                        row.item.variationSku ||
                        "Produto MugArt"
                      ) +
                    "</strong><br>" +
                    "<small>" +
                      escapeHtml(
                        row.item.variationColor ||
                        ""
                      ) +
                      " · " +
                      row.item.quantity +
                      "x" +
                    "</small>" +
                  "</div>" +
                  "<strong>" +
                    money(row.subtotal) +
                  "</strong>" +
                "</div>"
              );
            }
          ).join("")
        : "<p>Seu carrinho está vazio.</p>";
  }

  function openCart() {
    $("#productCartDrawer")
      .classList
      .add("open");

    $("#productCartOverlay")
      .classList
      .add("open");
  }

  function closeCart() {
    $("#productCartDrawer")
      .classList
      .remove("open");

    $("#productCartOverlay")
      .classList
      .remove("open");
  }

  function applySeo() {
    var product =
      state.product;

    var title =
      product.seoTitle ||
      product.name +
      " | MugArt";

    var description =
      product.seoDescription ||
      product.description
        .slice(0, 165) ||
      "Caneca personalizada MugArt.";

    var canonical =
      product.canonicalUrl ||
      "https://mugart.com.br/produto.html?slug=" +
      encodeURIComponent(
        product.slug ||
        product.id
      );

    document.title = title;

    $("#metaDescription").content =
      description;

    $("#metaRobots").content =
      product.noindex
        ? "noindex,nofollow"
        : "index,follow";

    $("#canonicalLink").href =
      canonical;

    $("#ogTitle").content =
      title;

    $("#ogDescription").content =
      description;

    $("#ogImage").content =
      product.image;

    $("#ogUrl").content =
      canonical;

    $("#twitterTitle").content =
      title;

    $("#twitterDescription").content =
      description;

    $("#twitterImage").content =
      product.image;

    var options =
      getProductOptions();

    var offers =
      options.map(function (option) {
        return {
          "@type": "Offer",
          "url":
            canonical +
            (
              option.isMainProduct
                ? ""
                : "#variant-" +
                  option.id
            ),
          "priceCurrency": "BRL",
          "price":
            Number(
              option.price || 0
            ).toFixed(2),
          "availability":
            option.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          "sku": option.sku,
          "itemCondition":
            "https://schema.org/NewCondition",
          "seller": {
            "@type":
              "Organization",
            "name": "MugArt"
          },
          "shippingDetails": {
            "@type":
              "OfferShippingDetails",
            "shippingDestination": {
              "@type":
                "DefinedRegion",
              "addressCountry":
                "BR"
            }
          }
        };
      });

    var productImages =
      product.gallery
        .filter(function (item) {
          return (
            item.mediaType ===
            "image"
          );
        })
        .map(function (item) {
          return item.url;
        });

    var schema = {
      "@context":
        "https://schema.org",
      "@graph": [
        {
          "@type":
            "BreadcrumbList",
          "@id":
            canonical +
            "#breadcrumb",
          "itemListElement": [
            {
              "@type":
                "ListItem",
              "position": 1,
              "name": "Início",
              "item":
                "https://mugart.com.br/"
            },
            {
              "@type":
                "ListItem",
              "position": 2,
              "name": "Loja",
              "item":
                "https://mugart.com.br/loja.html"
            },
            {
              "@type":
                "ListItem",
              "position": 3,
              "name":
                product.category
            },
            {
              "@type":
                "ListItem",
              "position": 4,
              "name":
                product.name,
              "item":
                canonical
            }
          ]
        },
        {
          "@type":
            product.variants.length
              ? "ProductGroup"
              : "Product",
          "@id":
            canonical +
            "#product",
          "url": canonical,
          "name":
            product.name,
          "description":
            description,
          "image":
            productImages,
          "sku":
            product.sku,
          "brand": {
            "@type":
              "Brand",
            "name": "MugArt"
          },
          "category":
            product.category,
          "material":
            "Cerâmica",
          "variesBy":
            product.variants.length
              ? [
                  "https://schema.org/color"
                ]
              : undefined,
          "offers":
            product.variants.length
              ? undefined
              : offers,
          "hasVariant":
            product.variants.length
              ? options.map(
                  function (option) {
                    return {
                      "@type":
                        "Product",
                      "name":
                        product.name +
                        " - " +
                        option.color,
                      "sku":
                        option.sku,
                      "color":
                        option.color,
                      "image":
                        option.image,
                      "offers":
                        offers.find(
                          function (offer) {
                            return (
                              offer.sku ===
                              option.sku
                            );
                          }
                        )
                    };
                  }
                )
              : undefined
        },
        {
          "@type":
            "FAQPage",
          "@id":
            canonical +
            "#faq",
          "mainEntity": [
            {
              "@type":
                "Question",
              "name":
                "Como funciona o prazo de produção?",
              "acceptedAnswer": {
                "@type":
                  "Answer",
                "text":
                  "O prazo de produção começa após a confirmação do pagamento e da aprovação da arte."
              }
            },
            {
              "@type":
                "Question",
              "name":
                "Posso enviar minha própria arte?",
              "acceptedAnswer": {
                "@type":
                  "Answer",
                "text":
                  "Sim. A arte pode ser enviada pelo site ou durante o atendimento pelo WhatsApp."
              }
            },
            {
              "@type":
                "Question",
              "name":
                "Como devo cuidar da caneca?",
              "acceptedAnswer": {
                "@type":
                  "Answer",
                "text":
                  "Evite produtos abrasivos e impactos. Para preservar a estampa, use esponja macia."
              }
            }
          ]
        }
      ]
    };

    $("#productStructuredData")
      .textContent =
      JSON.stringify(
        schema,
        function (
          key,
          value
        ) {
          return (
            value === undefined
              ? undefined
              : value
          );
        }
      );
  }

  function trackViewItem() {
    var product =
      state.product;

    var option =
      state.selectedOption;

    window.dataLayer =
      window.dataLayer || [];

    window.dataLayer.push({
      event: "view_item",
      ecommerce: {
        currency: "BRL",
        value:
          option.price,
        items: [{
          item_id:
            option.sku,
          item_name:
            product.name,
          item_category:
            product.category,
          item_variant:
            option.color,
          price:
            option.price
        }]
      }
    });
  }

  function trackVariantSelection() {
    var product =
      state.product;

    var option =
      state.selectedOption;

    window.dataLayer =
      window.dataLayer || [];

    window.dataLayer.push({
      event:
        "select_item_variant",
      item_variant:
        option.color,
      item_id:
        option.sku,
      product_id:
        product.id,
      variation_id:
        option.isMainProduct
          ? null
          : option.id,
      price:
        option.price,
      ecommerce: {
        currency: "BRL",
        value:
          option.price,
        items: [{
          item_id:
            option.sku,
          item_name:
            product.name,
          item_category:
            product.category,
          item_variant:
            option.color,
          price:
            option.price
        }]
      }
    });
  }

  function sendWhatsapp() {
    var product =
      state.product;

    var option =
      state.selectedOption;

    var message = [
      "Olá! Gostaria de saber mais sobre este produto da MugArt:",
      "",
      "Produto: " +
        product.name,
      "Opção: " +
        option.color,
      "SKU: " +
        option.sku,
      "Preço: " +
        money(option.price),
      "",
      window.location.href
    ].join("\n");

    window.open(
      "https://wa.me/" +
        WHATSAPP +
        "?text=" +
        encodeURIComponent(
          message
        ),
      "_blank"
    );
  }

  function shareProduct(
    network
  ) {
    var url =
      state.product.canonicalUrl ||
      window.location.href;

    var title =
      state.product.seoTitle ||
      state.product.name;

    var description =
      state.product.seoDescription ||
      state.product.description;

    var shareUrl = "";

    if (
      network === "whatsapp"
    ) {
      shareUrl =
        "https://wa.me/?text=" +
        encodeURIComponent(
          title +
          "\n" +
          url
        );
    }

    if (
      network === "facebook"
    ) {
      shareUrl =
        "https://www.facebook.com/sharer/sharer.php?u=" +
        encodeURIComponent(url);
    }

    if (
      network === "pinterest"
    ) {
      shareUrl =
        "https://pinterest.com/pin/create/button/?url=" +
        encodeURIComponent(url) +
        "&media=" +
        encodeURIComponent(
          state.product.image
        ) +
        "&description=" +
        encodeURIComponent(
          description
        );
    }

    if (shareUrl) {
      window.open(
        shareUrl,
        "_blank",
        "noopener,noreferrer"
      );
    }
  }

  async function copyProductLink() {
    var url =
      state.product.canonicalUrl ||
      window.location.href;

    try {
      await navigator.clipboard.writeText(
        url
      );

      $("#copyProductLinkStatus")
        .textContent =
        "Link copiado.";

      showToast(
        "Link copiado."
      );
    } catch {
      $("#copyProductLinkStatus")
        .textContent =
        "Não foi possível copiar.";

      showToast(
        "Não foi possível copiar o link."
      );
    }
  }

  function showError() {
    $("#productLoading")
      .classList
      .add("hidden");

    $("#productError")
      .classList
      .remove("hidden");
  }

  function bindSwipe() {
    var main =
      $("#productMainMedia");

    main.addEventListener(
      "touchstart",
      function (event) {
        state.touchStartX =
          event.changedTouches[0]
            .screenX;
      },
      {
        passive: true
      }
    );

    main.addEventListener(
      "touchend",
      function (event) {
        var touchEndX =
          event.changedTouches[0]
            .screenX;

        var distance =
          state.touchStartX -
          touchEndX;

        if (
          Math.abs(distance) <
          45
        ) {
          return;
        }

        changeMedia(
          distance > 0
            ? 1
            : -1
        );
      },
      {
        passive: true
      }
    );
  }

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      loadCart();
      renderCart();

      $("#addProductToCart")
        .addEventListener(
          "click",
          addToCart
        );

      $("#productWhatsapp")
        .addEventListener(
          "click",
          sendWhatsapp
        );

      $("#productCartButton")
        .addEventListener(
          "click",
          openCart
        );

      $("#closeProductCart")
        .addEventListener(
          "click",
          closeCart
        );

      $("#productCartOverlay")
        .addEventListener(
          "click",
          closeCart
        );

      $("#previousMedia")
        .addEventListener(
          "click",
          function () {
            changeMedia(-1);
          }
        );

      $("#nextMedia")
        .addEventListener(
          "click",
          function () {
            changeMedia(1);
          }
        );

      $("#openMediaLightbox")
        .addEventListener(
          "click",
          openLightbox
        );

      $("#productMainMedia")
        .addEventListener(
          "click",
          function (event) {
            if (
              event.target.tagName !==
              "VIDEO"
            ) {
              openLightbox();
            }
          }
        );

      $("#closeMediaLightbox")
        .addEventListener(
          "click",
          closeLightbox
        );

      $("#mediaLightbox")
        .addEventListener(
          "click",
          function (event) {
            if (
              event.target.id ===
              "mediaLightbox"
            ) {
              closeLightbox();
            }
          }
        );

      $("#lightboxPrevious")
        .addEventListener(
          "click",
          function () {
            changeMedia(-1);
          }
        );

      $("#lightboxNext")
        .addEventListener(
          "click",
          function () {
            changeMedia(1);
          }
        );

      $("#shareWhatsapp")
        .addEventListener(
          "click",
          function () {
            shareProduct(
              "whatsapp"
            );
          }
        );

      $("#shareFacebook")
        .addEventListener(
          "click",
          function () {
            shareProduct(
              "facebook"
            );
          }
        );

      $("#sharePinterest")
        .addEventListener(
          "click",
          function () {
            shareProduct(
              "pinterest"
            );
          }
        );

      $("#copyProductLink")
        .addEventListener(
          "click",
          copyProductLink
        );

      document.addEventListener(
        "keydown",
        function (event) {
          if (
            event.key === "Escape"
          ) {
            closeLightbox();
            closeCart();
          }

          if (
            $("#mediaLightbox")
              .classList
              .contains("open")
          ) {
            if (
              event.key ===
              "ArrowLeft"
            ) {
              changeMedia(-1);
            }

            if (
              event.key ===
              "ArrowRight"
            ) {
              changeMedia(1);
            }
          }
        }
      );

      bindSwipe();
      loadProduct();
    }
  );
})();
