const HomeState = {

    products: [],

    featured: [],

    personalizable: [],

    kits: [],

    events: [],

    selectedProduct: null,

    uploadedFile: null

};

document.addEventListener("DOMContentLoaded", initHome);

async function initHome(){

    try{

        await loadProducts();

        loadFeaturedProducts();

        loadPersonalizerProducts();

        loadKits();

        loadEvents();

        bindEvents();

    }catch(error){

        console.error(error);

    }

}

async function loadProducts(){

    const { data, error } = await supabase

        .from("products")

        .select(`
            *,
            product_images(*),
            product_variants(*)
        `)

        .eq("active",true);

    if(error){

        console.error(error);

        return;

    }

    HomeState.products=data||[];

    HomeState.featured=

        HomeState.products.filter(p=>p.show_home);

    HomeState.personalizable=

        HomeState.products.filter(p=>p.personalizable);

    HomeState.kits=

        HomeState.products.filter(p=>p.show_kits);

    HomeState.events=

        HomeState.products.filter(p=>p.show_events);

}

function money(value){

    return Number(value||0)

        .toLocaleString(

            "pt-BR",

            {

                style:"currency",

                currency:"BRL"

            }

        );

}

function productCard(product){

    const image=

        product.product_images?.[0]?.image_url ||

        "assets/no-image.png";

    return `

        <div

            class="personalizer-product"

            data-id="${product.id}"

        >

            <div class="personalizer-product-image">

                <img

                    src="${image}"

                    alt="${product.name}"

                >

            </div>

            <div class="personalizer-info">

                <h4>

                    ${product.name}

                </h4>

                <p>

                    ${product.short_description||""}

                </p>

                <div class="personalizer-price">

                    ${money(product.price)}

                </div>

                <button

                    class="personalizer-select"

                    onclick="selectProduct('${product.id}')"

                >

                    Selecionar

                </button>

            </div>

        </div>

    `;

}

