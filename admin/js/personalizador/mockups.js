const supabase = window.mugartSupabase;

const TIPOS = [
    {
        tipo: "frente",
        nome: "☕ Frente"
    },
    {
        tipo: "verso",
        nome: "☕ Verso"
    },
    {
        tipo: "alca_esquerda",
        nome: "☕ Alça Esquerda"
    },
    {
        tipo: "alca_direita",
        nome: "☕ Alça Direita"
    },
    {
        tipo: "interior",
        nome: "☕ Interior"
    }
];

let produtoId = null;

let mockups = [];

export function init(id){

    produtoId = id;

}

export async function carregar(){

    if(!produtoId)
        return;

    const { data, error } = await supabase

        .from("product_mockups")

        .select("*")

        .eq("product_id", produtoId);

    if(error){

        console.error(error);

        return;

    }

    mockups = data || [];

    render();

}

function buscar(tipo){

    return mockups.find(m=>m.tipo===tipo);

}

export function render(){

    const container = document.querySelector("#mockupsContainer");

    if(!container)
        return;

    container.innerHTML = "";

    TIPOS.forEach(item=>{

        const registro = buscar(item.tipo);

        container.innerHTML += `

<div class="mockup-card">

    <div class="mockup-header">

        <h3>${item.nome}</h3>

    </div>

    <div class="mockup-preview">

        ${
            registro?.image_url
            ?

            `<img src="${registro.image_url}">`

            :

            `<div class="mockup-empty">

                Nenhuma imagem

            </div>`
        }

    </div>

    <div class="mockup-footer">

        <button
            class="secondary uploadMockup"

            data-tipo="${item.tipo}">

            Upload

        </button>

    </div>

</div>

`;

    });

}

document

.querySelectorAll(".uploadMockup")

.forEach(btn=>{

    btn.onclick=()=>{

        upload(btn.dataset.tipo);

    };

});

async function upload(tipo){

    const input = document.createElement("input");

    input.type = "file";

    input.accept = "image/png,image/jpeg,image/webp";

    input.onchange = async (e)=>{

        const file = e.target.files[0];

        if(!file)
            return;

        const extensao = file.name.split(".").pop();

        const nomeArquivo =
            `${produtoId}/${tipo}.${extensao}`;

        const { error: uploadError } = await supabase
            .storage
            .from("product-mockups")
            .upload(
                nomeArquivo,
                file,
                {
                    cacheControl:"3600",
                    upsert:true
                }
            );

        if(uploadError){

            console.error(uploadError);

            alert("Erro ao enviar imagem.");

            return;

        }

        const { data } = supabase
            .storage
            .from("product-mockups")
            .getPublicUrl(nomeArquivo);

        const existente = buscar(tipo);

        if(existente){

            await supabase

                .from("product_mockups")

                .update({

                    image_url:data.publicUrl

                })

                .eq("id",existente.id);

        }else{

            await supabase

                .from("product_mockups")

                .insert({

                    product_id:produtoId,

                    tipo,

                    nome:tipo,

                    image_url:data.publicUrl,

                    thumbnail_url:data.publicUrl,

                    sort_order:1,

                    ativo:true

                });

        }

        await carregar();

    };

    input.click();

}

export default{

    init,

    carregar,

    render,

    upload

};
