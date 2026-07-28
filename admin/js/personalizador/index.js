import * as Modelo from "./modelo.js";
import * as Mockups from "./mockups.js";
import * as Areas from "./areas.js";
import * as Editor from "./editor.js";
import * as Arquivos from "./arquivos.js";

let produtoAtual = null;

async function init(produtoId) {

    produtoAtual = produtoId;

    await Modelo.carregar(produtoId);

    await Mockups.carregar(produtoId);

    await Areas.carregar(produtoId);

}

async function salvar() {

    await Modelo.salvar(produtoAtual);

    await Mockups.salvar(produtoAtual);

    await Areas.salvar(produtoAtual);

}

function abrirMockups() {

    Mockups.abrir();

}

function abrirAreas() {

    Areas.abrir();

}

function abrirEditor() {

    Editor.abrir();

}

function abrirArquivos() {

    Arquivos.abrir();

}

export default {

    init,

    salvar,

    abrirMockups,

    abrirAreas,

    abrirEditor,

    abrirArquivos

};
