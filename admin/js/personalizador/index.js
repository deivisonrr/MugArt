/* ==========================================================
   MUGART ERP
   PERSONALIZADOR
   INDEX
========================================================== */

import * as Modelos from "./modelos.js";
import * as Galeria from "./galeria.js";
import * as Variacoes from "./variacoes.js";
import * as Areas from "./areas.js";
import * as Editor from "./editor.js";
import * as Arquivos from "./arquivos.js";
import * as Historico from "./historico.js";

const Personalizador = {

    /* Banco */

    db: window.mugartSupabase,

    /* Estados */

    modelos: [],

    modeloAtual: null,

    galeria: [],

    variacoes: [],

    areas: [],

    arquivos: [],

    historico: [],

    elementos: {},

    editor: {},

    zoom: 1

};

/* Junta todos os módulos */

Object.assign(Personalizador, Modelos);
Object.assign(Personalizador, Galeria);
Object.assign(Personalizador, Variacoes);
Object.assign(Personalizador, Areas);
Object.assign(Personalizador, Editor);
Object.assign(Personalizador, Arquivos);
Object.assign(Personalizador, Historico);

/* Global */

window.Personalizador = Personalizador;

/* Inicialização */

document.addEventListener(

    "DOMContentLoaded",

    async () => {

        await Personalizador.init();

        if (Personalizador.iniciarEditor) {

            Personalizador.iniciarEditor();

        }

    }

);

