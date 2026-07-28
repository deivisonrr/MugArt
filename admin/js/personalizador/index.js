import Mockups from "./mockups.js";

let produtoAtual = null;

async function init(produtoId) {

    produtoAtual = produtoId;

    Mockups.init(produtoId);

    await Mockups.carregar();

}

async function salvar() {

}

function listarMockups() {

    return Mockups.listar();

}

async function atualizar() {

    await Mockups.carregar();

}

export default {

    init,

    salvar,

    atualizar,

    listarMockups

};
