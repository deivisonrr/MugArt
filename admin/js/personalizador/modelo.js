
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

/* ==========================================================
   EVENTOS
========================================================== */

export function registrarEventos() {

    this.elementos.btnNovo?.addEventListener(

        "click",

        () => this.novoModelo()

    );

    this.elementos.btnCancelar?.addEventListener(

        "click",

        () => this.fecharDrawer()

    );

    this.elementos.btnFechar?.addEventListener(

        "click",

        () => this.fecharDrawer()

    );

    this.elementos.overlay?.addEventListener(

        "click",

        () => this.fecharDrawer()

    );

    this.elementos.form?.addEventListener(

        "submit",

        async (e) => {

            e.preventDefault();

            await this.salvarModelo();

        }

    );

    this.elementos.busca?.addEventListener(

        "input",

        () => this.renderizarModelos()

    );

}

/* ==========================================================
   DRAWER
========================================================== */

export function abrirDrawer() {

    this.elementos.drawer.classList.add("open");

    this.elementos.overlay.classList.add("open");

}

export function fecharDrawer() {

    this.elementos.drawer.classList.remove("open");

    this.elementos.overlay.classList.remove("open");

}

export function novoModelo() {

    this.modeloAtual = null;

    this.limparFormulario();

    this.elementos.titulo.textContent =

        "Novo Modelo";

    this.abrirDrawer();

}

export function limparFormulario() {

    this.elementos.form.reset();

    this.elementos.id.value = "";

}

export function preencherFormulario(modelo) {

    this.modeloAtual = modelo;

    this.elementos.id.value =

        modelo.id || "";

    this.elementos.nome.value =

        modelo.name || "";

    this.elementos.descricao.value =

        modelo.description || "";

    this.elementos.preco.value =

        modelo.base_price || 0;

    this.elementos.imagem.value =

        modelo.image_url || "";

    this.elementos.ativo.value =

        modelo.active

            ? "true"

            : "false";

    this.elementos.permitirVariacoes.checked =

        !!modelo.allow_variations;

    this.elementos.titulo.textContent =

        "Editar Modelo";

    this.abrirDrawer();

}

export async function editarModelo(id) {

    const modelo =

        this.modelos.find(

            item => item.id == id

        );

    if (!modelo)
        return;

    this.preencherFormulario(modelo);

    if (this.carregarGaleria)

        await this.carregarGaleria();

    if (this.carregarVariacoes)

        await this.carregarVariacoes();

    if (this.carregarAreas)

        await this.carregarAreas();

    if (this.carregarArquivos)

        await this.carregarArquivos();

    if (this.carregarHistorico)

        await this.carregarHistorico();

}

/* ==========================================================
   BANCO
========================================================== */

export async function carregarModelos() {

    const { data, error } =

        await this.db

            .from("customization_models")

            .select("*")

            .order("display_order")

            .order("name");

    if (error) {

        console.error(error);

        return;

    }

    this.modelos = data || [];

    this.renderizarModelos();

}

export async function salvarModelo() {

    let modelo = {

        name:

            this.elementos.nome.value.trim(),

        description:

            this.elementos.descricao.value.trim(),

        base_price:

            Number(

                this.elementos.preco.value || 0

            ),

        image_url:

            this.elementos.imagem.value,

        allow_variations:

            this.elementos.permitirVariacoes.checked,

        active:

            this.elementos.ativo.value == "true"

    };

    modelo = limparObjeto(modelo);

    let erro;

    if (this.modeloAtual) {

        ({ error: erro } =

            await this.db

                .from("customization_models")

                .update(modelo)

                .eq(

                    "id",

                    this.modeloAtual.id

                ));

    }

    else {

        ({ error: erro } =

            await this.db

                .from("customization_models")

                .insert(modelo));

    }

    if (erro) {

        toast(

            erro.message,

            "error"

        );

        return;

    }

    toast(

        "Modelo salvo."

    );

    this.fecharDrawer();

    await this.carregarModelos();

}

export async function excluirModelo(id) {

    if (

        !confirmar(

            "Excluir modelo?"

        )

    )

        return;

    const { error } =

        await this.db

            .from("customization_models")

            .delete()

            .eq("id", id);

    if (error) {

        toast(

            error.message,

            "error"

        );

        return;

    }

    toast(

        "Modelo excluído."

    );

    await this.carregarModelos();

}

export function renderizarModelos() {

    let lista =

        [...this.modelos];

    const busca =

        this.elementos.busca.value

            .trim()

            .toLowerCase();

    if (busca) {

        lista = lista.filter(item =>

            item.name

                .toLowerCase()

                .includes(busca)

        );

    }

    this.elementos.lista.innerHTML =

        lista

            .map(item => this.cardModelo(item))

            .join("");

}


export function cardModelo(modelo) {

    return `

    <article class="admin3-product-card">

        <img

            src="${modelo.image_url || "../assets/hero-caneca.png"}"

        >

        <h3>

            ${modelo.name}

        </h3>

        <div class="admin3-price">

            ${moeda(

                modelo.base_price

            )}

        </div>

        <div class="admin3-card-actions">

            <button

                onclick="Personalizador.editarModelo('${modelo.id}')">

                Editar

            </button>

            <button

                class="delete"

                onclick="Personalizador.excluirModelo('${modelo.id}')">

                Excluir

            </button>

        </div>

    </article>

    `;

}


