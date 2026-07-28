import { supabase } from "/js/supabase-config.js";

let produtoId = null;
let mockups = [];

export function init(id) {
    produtoId = id;
}

export async function carregar() {

    if (!produtoId) {
        mockups = [];
        return [];
    }

    const { data, error } = await supabase
        .from("product_mockups")
        .select("*")
        .eq("product_id", produtoId)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Erro ao carregar mockups:", error);
        mockups = [];
        return [];
    }

    mockups = data || [];

    render();

    return mockups;
}

export function listar() {
    return mockups;
}

export async function adicionar(tipo) {

    const novo = {
        product_id: produtoId,
        tipo,
        nome: tipo,
        image_url: "",
        thumbnail_url: "",
        sort_order: mockups.length + 1,
        ativo: true
    };

    const { data, error } = await supabase
        .from("product_mockups")
        .insert(novo)
        .select()
        .single();

    if (error)
        throw error;

    mockups.push(data);

    render();
}

export async function remover(id) {

    const { error } = await supabase
        .from("product_mockups")
        .delete()
        .eq("id", id);

    if (error)
        throw error;

    mockups = mockups.filter(x => x.id !== id);

    render();
}

export function render() {

    const container = document.querySelector("#mockupsContainer");

    if (!container)
        return;

    if (!mockups.length) {

        container.innerHTML = `
            <div class="mockups-empty">

                Nenhum mockup cadastrado.

            </div>
        `;

        return;
    }

    container.innerHTML = mockups.map(item => `

        <div class="mockup-card">

            <div class="mockup-preview">

                ${
                    item.image_url
                    ? `<img src="${item.image_url}">`
                    : `<div class="mockup-placeholder">Sem imagem</div>`
                }

            </div>

            <h3>${item.nome}</h3>

            <small>${item.tipo}</small>

            <div class="mockup-actions">

                <button
                    class="secondary"
                    data-upload="${item.id}">

                    Upload

                </button>

                <button
                    class="danger"
                    data-delete="${item.id}">

                    Excluir

                </button>

            </div>

        </div>

    `).join("");

}

export default {

    init,

    carregar,

    listar,

    adicionar,

    remover,

    render

};
