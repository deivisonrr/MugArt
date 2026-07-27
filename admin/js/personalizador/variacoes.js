/* ==========================================================
   MUGART
   PERSONALIZADOR
   VARIAÇÕES
========================================================== */

import {

    toast,

    confirmar,

    limparObjeto,

    moeda,

    slug

} from "./utils.js";

const BUCKET = "product-images";

export async function carregarVariacoes() {

    if (!this.modeloAtual)
        return;

    const { data, error } =

        await this.db

            .from("customization_variants")

            .select("*")

            .eq(

                "model_id",

                this.modeloAtual.id

            )

            .order("display_order")

            .order("name");

    if (error) {

        console.error(error);

        return;

    }

    this.variacoes = data || [];

    this.renderizarVariacoes();

}

export function renderizarVariacoes() {

    const lista =

        document.getElementById(

            "admin3Variants"

        );

    if (!lista)
        return;

    if (!this.variacoes.length) {

        lista.innerHTML = `

            <div class="admin3-empty">

                Nenhuma variação.

            </div>

        `;

        return;

    }

    lista.innerHTML =

        this.variacoes

            .map(

                item =>

                    this.cardVariacao(item)

            )

            .join("");

}

export function cardVariacao(item) {

    return `

    <article class="variant-card">

        <img

            src="${item.image_url || '../assets/hero-caneca.png'}"

        >

        <div>

            <strong>

                ${item.name}

            </strong>

            <small>

                ${item.sku || ""}

            </small>

        </div>

        <div>

            ${moeda(

                item.price_adjustment

            )}

        </div>

        <div>

            <button

                onclick="Personalizador.editarVariacao('${item.id}')">

                Editar

            </button>

            <button

                class="delete"

                onclick="Personalizador.excluirVariacao('${item.id}')">

                Excluir

            </button>

        </div>

    </article>

    `;

}

export function novaVariacao() {

    this.variacaoAtual = null;

    document.getElementById("variantId").value = "";

    document.getElementById("variantName").value = "";

    document.getElementById("variantSku").value = "";

    document.getElementById("variantColor").value = "#FFFFFF";

    document.getElementById("variantPrice").value = 0;

    document.getElementById("variantImage").value = "";

    document.getElementById("variantActive").checked = true;

    document

        .getElementById(

            "admin3VariantDrawer"

        )

        .classList.add("open");

}

export function editarVariacao(id) {

    const item =

        this.variacoes.find(

            x => x.id == id

        );

    if (!item)
        return;

    this.variacaoAtual = item;

    document.getElementById(

        "variantId"

    ).value = item.id;

    document.getElementById(

        "variantName"

    ).value = item.name;

    document.getElementById(

        "variantSku"

    ).value = item.sku;

    document.getElementById(

        "variantColor"

    ).value = item.color || "#FFFFFF";

    document.getElementById(

        "variantPrice"

    ).value =

        item.price_adjustment;

    document.getElementById(

        "variantImage"

    ).value =

        item.image_url || "";

    document.getElementById(

        "variantActive"

    ).checked =

        item.active;

    document

        .getElementById(

            "admin3VariantDrawer"

        )

        .classList.add("open");

}

export async function salvarVariacao() {

    let variacao = {

        model_id:

            this.modeloAtual.id,

        name:

            document

                .getElementById("variantName")

                .value

                .trim(),

        sku:

            document

                .getElementById("variantSku")

                .value ||

            slug(

                document

                    .getElementById("variantName")

                    .value

            ),

        color:

            document

                .getElementById("variantColor")

                .value,

        image_url:

            document

                .getElementById("variantImage")

                .value,

        price_adjustment:

            Number(

                document

                    .getElementById("variantPrice")

                    .value

            ),

        active:

            document

                .getElementById("variantActive")

                .checked

    };

    variacao = limparObjeto(

        variacao

    );

    let erro;

    if (this.variacaoAtual) {

        ({ error: erro } =

            await this.db

                .from(

                    "customization_variants"

                )

                .update(variacao)

                .eq(

                    "id",

                    this.variacaoAtual.id

                ));

    }

    else {

        ({ error: erro } =

            await this.db

                .from(

                    "customization_variants"

                )

                .insert(

                    variacao

                ));

    }

    if (erro) {

        toast(

            erro.message,

            "error"

        );

        return;

    }

    toast(

        "Variação salva."

    );

    await this.carregarVariacoes();

}

export async function excluirVariacao(id) {

    if (

        !confirmar(

            "Excluir variação?"

        )

    )

        return;

    const { error } =

        await this.db

            .from(

                "customization_variants"

            )

            .delete()

            .eq(

                "id",

                id

            );

    if (error) {

        toast(

            error.message,

            "error"

        );

        return;

    }

    toast(

        "Variação removida."

    );

    await this.carregarVariacoes();

}

export async function uploadImagemVariacao() {

    if (!this.modeloAtual)
        return;

    const input =

        document.getElementById(

            "variantUpload"

        );

    if (!input.files.length)
        return;

    const arquivo =

        input.files[0];

    const nome =

        `${this.modeloAtual.id}/variants/${Date.now()}-${arquivo.name}`;

    const { error } =

        await this.db

            .storage

            .from(BUCKET)

            .upload(

                nome,

                arquivo,

                {

                    upsert:true

                }

            );

    if (error) {

        toast(

            error.message,

            "error"

        );

        return;

    }

    const { data } =

        this.db

            .storage

            .from(BUCKET)

            .getPublicUrl(nome);

    document

        .getElementById(

            "variantImage"

        )

        .value =

        data.publicUrl;

}



