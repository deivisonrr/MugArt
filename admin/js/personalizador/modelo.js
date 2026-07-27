
/* ==========================================================
   MUGART
   PERSONALIZADOR
   MODELOS
========================================================== */

import {

    toast,

    confirmar,

    limparObjeto,

    moeda

} from "./utils.js";

export async function init() {

    this.mapearElementos();

    this.registrarEventos();

    await this.carregarModelos();

}

/* ==========================================================
   ELEMENTOS
========================================================== */

export function mapearElementos() {

    this.elementos = {

        lista:

            document.getElementById("admin3Products"),

        drawer:

            document.getElementById("admin3Drawer"),

        overlay:

            document.getElementById("admin3Overlay"),

        form:

            document.getElementById("admin3ProductForm"),

        btnNovo:

            document.getElementById("openProductDrawer"),

        btnCancelar:

            document.getElementById("admin3Cancel"),

        btnFechar:

            document.getElementById("closeProductDrawer"),

        titulo:

            document.getElementById("admin3DrawerTitle"),

        id:

            document.getElementById("admin3ProductId"),

        nome:

            document.getElementById("admin3Name"),

        descricao:

            document.getElementById("admin3Description"),

        preco:

            document.getElementById("admin3OldPrice"),

        imagem:

            document.getElementById("admin3ImageUrl"),

        ativo:

            document.getElementById("admin3Active"),

        permitirVariacoes:

            document.getElementById("admin3AllowVariations"),

        busca:

            document.getElementById("admin3Search")

    };

}
