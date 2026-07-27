import * as Modelos from "./modelos.js";
import * as Variacoes from "./variacoes.js";

const Personalizador = {

    db: window.mugartSupabase,

    modelos: [],

    modeloAtual: null,

    elementos: {}

};

Object.assign(

    import * as Galeria from "./galeria.js";

    Personalizador,

    Modelos

);

window.Personalizador = Personalizador;

document.addEventListener(

    "DOMContentLoaded",

    () => Personalizador.init()

);
