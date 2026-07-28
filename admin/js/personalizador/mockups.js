import { supabase } from "/js/supabase-config.js";

let produtoId = null;

let mockups = [];

export function init(id) {

    produtoId = id;

}

export async function carregar() {

    if (!produtoId) return [];

    const { data, error } = await supabase

        .from("product_mockups")

        .select("*")

        .eq("product_id", produtoId)

        .eq("ativo", true)

        .order("sort_order");

    if (error) {

        console.error(error);

        return [];

    }

    mockups = data || [];

    return mockups;

}

export function listar() {

    return mockups;

}

export async function salvar(mockup) {

    const { error } = await supabase

        .from("product_mockups")

        .upsert(mockup);

    if (error)

        throw error;

}

export async function remover(id) {

    await supabase

        .from("product_mockups")

        .delete()

        .eq("id", id);

}

export default {

    init,

    carregar,

    listar,

    salvar,

    remover

};
