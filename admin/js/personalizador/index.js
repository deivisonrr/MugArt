import * as Modelos from "./modelos.js";
import * as Variacoes from "./variacoes.js";
import * as Galeria from "./galeria.js";

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

    Variacoes

);

window.Personalizador = Personalizador;

document.addEventListener(

    "DOMContentLoaded",

    () => Personalizador.init()

);
