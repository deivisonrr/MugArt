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

   var variationsResult = {
  data: [],
  error: null
};

/*
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
*/
