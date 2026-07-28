import Mockups from "./mockups.js";
import Areas from "./areas.js";
import Editor from "./editor.js";
import Arquivos from "./arquivos.js";

let produtoAtual = null;

async function init(produtoId) {

    produtoAtual = produtoId;

    Mockups.init(produtoId);
    Areas.init(produtoId);
    Arquivos.init(produtoId);

    await Mockups.carregar();
    await Areas.carregar();

}

async function salvar() {

    await Mockups.salvarTudo();
    await Areas.salvarTudo();

}

function listarMockups() {

    return Mockups.listar();

}

function abrirMockups() {

    Mockups.abrir();

}

function abrirAreas(mockupId) {

    Areas.abrir(mockupId);

}

function abrirEditor(mockupId) {

    Editor.abrir(mockupId);

}

async function atualizar() {

    await Mockups.carregar();
    await Areas.carregar();

}

export default {

    init,

    salvar,

    atualizar,

    listarMockups,

    abrirMockups,

    abrirAreas,

    abrirEditor

};
