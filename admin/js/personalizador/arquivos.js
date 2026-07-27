/* ==========================================================
   MUGART
   PERSONALIZADOR
   ARQUIVOS
========================================================== */

import {

    toast,

    confirmar

} from "./utils.js";

const BUCKET = "product-images";


export async function carregarArquivos() {

    if (!this.modeloAtual)
        return;

    const { data, error } =

        await this.db

            .from("customization_files")

            .select("*")

            .eq(

                "model_id",

                this.modeloAtual.id

            )

            .order(

                "created_at",

                {

                    ascending:false

                }

            );

    if (error) {

        console.error(error);

        return;

    }

    this.arquivos = data || [];

    this.renderizarArquivos();

}

export function renderizarArquivos() {

    const lista =

        document.getElementById(

            "admin3Files"

        );

    if (!lista)
        return;

    if (!this.arquivos.length) {

        lista.innerHTML = `

            <div class="admin3-empty">

                Nenhum arquivo.

            </div>

        `;

        return;

    }

    lista.innerHTML =

        this.arquivos

            .map(

                arquivo =>

                    this.cardArquivo(arquivo)

            )

            .join("");

}

export function cardArquivo(item) {

    return `

    <article class="file-card">

        <div>

            <strong>

                ${item.file_name}

            </strong>

            <small>

                ${item.file_type}

            </small>

        </div>

        <div class="admin3-card-actions">

            <a

                href="${item.file_url}"

                target="_blank">

                Abrir

            </a>

            <button

                class="delete"

                onclick="Personalizador.excluirArquivo('${item.id}')">

                Excluir

            </button>

        </div>

    </article>

    `;

}

export async function uploadArquivo() {

    if (!this.modeloAtual)
        return;

    const input =

        document.getElementById(

            "fileUpload"

        );

    if (!input.files.length)
        return;

    const arquivo =

        input.files[0];

    const nome =

        `${this.modeloAtual.id}/files/${Date.now()}-${arquivo.name}`;

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

            "customization_files"

        )

        .insert({

            model_id:

                this.modeloAtual.id,

            file_name:

                arquivo.name,

            file_type:

                arquivo.name.split(".").pop(),

            file_url:

                data.publicUrl

        });

    toast(

        "Arquivo enviado."

    );

    await this.carregarArquivos();

}

export async function excluirArquivo(id) {

    if (

        !confirmar(

            "Excluir arquivo?"

        )

    )

        return;

    const { error } =

        await this.db

            .from(

                "customization_files"

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

        "Arquivo removido."

    );

    await this.carregarArquivos();

}

