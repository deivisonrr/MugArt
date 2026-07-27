
/* ==========================================================
   MUGART
   PERSONALIZADOR
   ÁREAS DE IMPRESSÃO
========================================================== */

import {

    toast,

    confirmar,

    limparObjeto

} from "./utils.js";

export async function carregarAreas() {

    if (!this.modeloAtual)
        return;

    const { data, error } = await this.db

        .from("customization_print_areas")

        .select("*")

        .eq(

            "model_id",

            this.modeloAtual.id

        )

        .order(

            "display_order"

        );

    if (error) {

        console.error(error);

        return;

    }

    this.areas = data || [];

    this.renderizarAreas();

}

export function renderizarAreas() {

    const lista =

        document.getElementById(

            "admin3PrintAreas"

        );

    if (!lista)
        return;

    if (!this.areas.length) {

        lista.innerHTML = `

            <div class="admin3-empty">

                Nenhuma área cadastrada.

            </div>

        `;

        return;

    }

    lista.innerHTML =

        this.areas

            .map(

                area =>

                    this.cardArea(area)

            )

            .join("");

}

export function cardArea(area) {

    return `

    <article class="print-area-card">

        <strong>

            ${area.name}

        </strong>

        <small>

            ${area.width} × ${area.height}px

        </small>

        <div class="admin3-card-actions">

            <button

                onclick="Personalizador.editarArea('${area.id}')">

                Editar

            </button>

            <button

                class="delete"

                onclick="Personalizador.excluirArea('${area.id}')">

                Excluir

            </button>

        </div>

    </article>

    `;

}

export function novaArea() {

    this.areaAtual = null;

    document.getElementById("printAreaId").value = "";

    document.getElementById("printAreaName").value = "";

    document.getElementById("printAreaX").value = 0;

    document.getElementById("printAreaY").value = 0;

    document.getElementById("printAreaWidth").value = 500;

    document.getElementById("printAreaHeight").value = 500;

    document.getElementById("printAreaRotation").value = 0;

    document.getElementById("printAreaActive").checked = true;

    document

        .getElementById(

            "admin3PrintDrawer"

        )

        .classList.add("open");

}

export function editarArea(id) {

    const area =

        this.areas.find(

            a => a.id == id

        );

    if (!area)
        return;

    this.areaAtual = area;

    document.getElementById("printAreaId").value = area.id;

    document.getElementById("printAreaName").value = area.name;

    document.getElementById("printAreaX").value = area.x;

    document.getElementById("printAreaY").value = area.y;

    document.getElementById("printAreaWidth").value = area.width;

    document.getElementById("printAreaHeight").value = area.height;

    document.getElementById("printAreaRotation").value = area.rotation || 0;

    document.getElementById("printAreaActive").checked = area.active;

    if (this.carregarAreaNoEditor) {

        this.carregarAreaNoEditor(area);

    }

    document

        .getElementById(

            "admin3PrintDrawer"

        )

        .classList.add("open");

}

export async function salvarArea() {

    let area = {

        model_id:

            this.modeloAtual.id,

        name:

            document.getElementById("printAreaName").value,

        x:

            Number(document.getElementById("printAreaX").value),

        y:

            Number(document.getElementById("printAreaY").value),

        width:

            Number(document.getElementById("printAreaWidth").value),

        height:

            Number(document.getElementById("printAreaHeight").value),

        rotation:

            Number(document.getElementById("printAreaRotation").value),

        active:

            document.getElementById("printAreaActive").checked

    };

    area = limparObjeto(area);

    let erro;

    if (this.areaAtual) {

        ({ error: erro } = await this.db

            .from("customization_print_areas")

            .update(area)

            .eq("id", this.areaAtual.id));

    } else {

        ({ error: erro } = await this.db

            .from("customization_print_areas")

            .insert(area));

    }

    if (erro) {

        toast(erro.message, "error");

        return;

    }

    toast("Área salva.");

    await this.carregarAreas();

}

export async function excluirArea(id) {

    if (!confirmar("Excluir área?"))
        return;

    const { error } = await this.db

        .from("customization_print_areas")

        .delete()

        .eq("id", id);

    if (error) {

        toast(error.message, "error");

        return;

    }

    toast("Área removida.");

    await this.carregarAreas();

}

