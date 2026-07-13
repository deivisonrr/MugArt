async function loadProductsFromSupabase() {
  if (!window.mugartSupabase) {
    showToast(
      "Supabase não carregou na loja. Verifique js/supabase-config.js.",
      "error"
    );

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
      console.error(
        "Erro ao carregar produtos:",
        productsResult.error
      );

      showToast(
        "Erro ao carregar produtos da loja.",
        "error"
      );

      StoreState.products = [];
      return;
    }

    var variations = [];

    var variationsResult = await window.mugartSupabase
      .from("product_variations")
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
      console.warn(
        "Não foi possível carregar as variações:",
        variationsResult.error
      );
    } else {
      variations = variationsResult.data || [];
    }

    StoreState.products = (productsResult.data || []).map(
      function(product) {
        var productVariations = variations
          .filter(function(variation) {
            return String(variation.product_id) ===
              String(product.id);
          })
          .map(function(variation) {
            return {
              id: variation.id,
              productId: variation.product_id,
              color: variation.color || "Variação",
              name: variation.color || "Variação",
              sku:
                variation.sku ||
                product.sku ||
                variation.id,
              price: Number(
                variation.price !== null &&
                variation.price !== undefined
                  ? variation.price
                  : product.price || 0
              ),
              oldPrice: Number(
                variation.old_price || 0
              ),
              stock: Number(
                variation.stock || 0
              ),
              image:
                variation.image_url ||
                product.image_url ||
                "assets/hero-caneca.png",
              active: variation.active
            };
          });

        var displayPrice = Number(
          product.price || 0
        );

        if (productVariations.length) {
          displayPrice = Math.min.apply(
            null,
            productVariations.map(function(variation) {
              return variation.price;
            })
          );
        }

        var displayStock = Number(
          product.stock || 0
        );

        if (productVariations.length) {
          displayStock = productVariations.reduce(
            function(total, variation) {
              return total + variation.stock;
            },
            0
          );
        }

        return {
          id: product.id,
          sku: product.sku || product.id,
          name:
            product.name ||
            "Produto sem nome",
          category: product.categories
            ? product.categories.name
            : "Sem categoria",
          categoryId: product.categories
            ? product.categories.id
            : null,
          color:
            product.color ||
            "Não informado",
          price: displayPrice,
          oldPrice: Number(
            product.old_price || 0
          ),
          stock: displayStock,
          image:
            product.image_url ||
            "assets/hero-caneca.png",
          description:
            product.description ||
            "Produto MugArt pronta entrega.",
          active: product.active,
          featured: product.featured,
          variations: productVariations,
          specs: {
            capacidade: "325ml",
            material: "Cerâmica",
            acabamento: "Brilhante",
            personalizacao: "Sublimação"
          },
          tags: [
            product.name || "",
            product.color || "",
            product.categories
              ? product.categories.name
              : ""
          ].concat(
            productVariations.map(
              function(variation) {
                return variation.color;
              }
            )
          )
        };
      }
    );

    console.log(
      "Produtos carregados:",
      StoreState.products
    );

    console.log(
      "Variações carregadas:",
      variations
    );
  } catch (error) {
    console.error(
      "Erro inesperado ao carregar a loja:",
      error
    );

    StoreState.products = [];

    showToast(
      "Erro inesperado ao carregar a loja.",
      "error"
    );
  }
}
