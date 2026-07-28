
/* ==========================================================
   MUGART
   PERSONALIZADOR
   GALERIA
========================================================== */

import {

    toast,

    confirmar

} from "./utils.js";

const BUCKET = "product-images";

/* ==========================================================
   CARREGAR
========================================================== */

export async function carregarGaleria() {

    if (!this.modeloAtual)
        return;

    const { data, error } =

        await this.db

            .from("customization_gallery")

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

    this.galeria = data || [];

    this.renderizarGaleria();

}

/* ==========================================================
   RENDER
========================================================== */

export function renderizarGaleria() {

    const lista =

        document.getElementById(

            "admin3Gallery"

        );

    if (!lista)
        return;

    if (!this.galeria.length) {

        lista.innerHTML = `

            <div class="admin3-empty">

                Nenhuma imagem.

            </div>

        `;

        return;

    }

    lista.innerHTML =

        this.galeria

            .map(

                img =>

                    this.cardImagem(img)

            )

            .join("");

}

export function cardImagem(imagem) {

    return `

    <article class="gallery-card">

        <img

            src="${imagem.image_url}"

        >

        <div class="gallery-actions">

            <button

                onclick="Personalizador.definirPrincipal('${imagem.id}')">

                Principal

            </button>

            <button

                class="delete"

                onclick="Personalizador.excluirImagem('${imagem.id}')">

                Excluir

            </button>

        </div>

    </article>

    `;

}

export async function uploadImagem() {

    if (!this.modeloAtual)
        return;

    const input =

        document.getElementById(

            "galleryUpload"

        );

    if (!input.files.length)
        return;

    const arquivo =

        input.files[0];

    const nome =

        `${this.modeloAtual.id}/${Date.now()}-${arquivo.name}`;

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

    await this.db

        .from(

            "customization_gallery"

        )

        .insert({

            model_id:

                this.modeloAtual.id,

            image_url:

                data.publicUrl,

            is_main:false

        });

    toast(

        "Imagem enviada."

    );

    await this.carregarGaleria();

}

export async function excluirImagem(id) {

    if (

        !confirmar(

            "Excluir imagem?"

        )

    )

        return;

    const { error } =

        await this.db

            .from(

                "customization_gallery"

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

        "Imagem removida."

    );

    await this.carregarGaleria();

}

export async function definirPrincipal(id) {

    await this.db

        .from(

            "customization_gallery"

        )

        .update({

            is_main:false

        })

        .eq(

            "model_id",

            this.modeloAtual.id

        );

    const { data } =

        await this.db

            .from(

                "customization_gallery"

            )

            .update({

                is_main:true

            })

            .eq(

                "id",

                id

            )

            .select()

            .single();

    await this.db

        .from(

            "customization_models"

        )

        .update({

            image_url:

                data.image_url

        })

        .eq(

            "id",

            this.modeloAtual.id

        );

    await this.carregarGaleria();

    await this.carregarModelos();

}

