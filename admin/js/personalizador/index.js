import * as Modelos from "./modelos.js";
import * as Variacoes from "./variacoes.js";
import * as Galeria from "./galeria.js";
import * as Areas from "./areas.js";
import * as Editor from "./editor.js";

const Personalizador = {

    db: window.mugartSupabase,

    modelos: [],

    modeloAtual: null,

    elementos: {}

};

Object.assign(

    Personalizador,

    Modelos

);

Object.assign(

    Personalizador,

    Editor

);

Object.assign(

    Personalizador,

    Areas

);

Object.assign(

    Personalizador,

    Variacoes

);

window.Personalizador = Personalizador;

document.addEventListener(

    "DOMContentLoaded",

    () => Personalizador.init()

);
