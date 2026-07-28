import { supabase } from "/js/supabase-config.js";

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

export default{

    init,

    carregar,

    render

};
