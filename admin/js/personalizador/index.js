
/* ==========================================================
   MUGART
   PERSONALIZADOR
========================================================== */

import * as Modelos from "./modelos.js";

const Personalizador = {

    db: window.mugartSupabase,

    modelos: [],

    modeloAtual: null,

    elementos: {},

    ...Modelos

};

window.Personalizador = Personalizador;

document.addEventListener(

    "DOMContentLoaded",

    () => {

        Personalizador.init();

    }

);
