/* ==========================================================
   MUGART
   PERSONALIZADOR
   HISTÓRICO
========================================================== */

import {

    toast,

    formatarData

} from "./utils.js";


export async function carregarHistorico() {

    if (!this.modeloAtual)
        return;

    const { data, error } =

        await this.db

            .from("customization_history")

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

    this.historico = data || [];

    this.renderizarHistorico();

}

export async function registrarHistorico(acao) {

    if (!this.modeloAtual)
        return;

    await this.db

        .from(

            "customization_history"

        )

        .insert({

            model_id:

                this.modeloAtual.id,

            action:

                acao

        });

}

export function renderizarHistorico() {

    const lista =

        document.getElementById(

            "admin3History"

        );

    if (!lista)
        return;

    if (!this.historico.length) {

        lista.innerHTML = `

            <div class="admin3-empty">

                Nenhum histórico.

            </div>

        `;

        return;

    }

    lista.innerHTML =

        this.historico

            .map(

                item =>

                    this.cardHistorico(item)

            )

            .join("");

}

export function cardHistorico(item) {

    return `

    <article class="history-card">

        <strong>

            ${item.action}

        </strong>

        <small>

            ${formatarData(

                item.created_at

            )}

        </small>

    </article>

    `;

}

export function atualizarResumo() {

    document.getElementById(

        "summaryModels"

    )?.textContent =

        this.modelos.length;

    document.getElementById(

        "summaryGallery"

    )?.textContent =

        this.galeria.length;

    document.getElementById(

        "summaryVariants"

    )?.textContent =

        this.variacoes.length;

    document.getElementById(

        "summaryAreas"

    )?.textContent =

        this.areas.length;

    document.getElementById(

        "summaryFiles"

    )?.textContent =

        this.arquivos.length;

}

export async function duplicarModeloCompleto() {

    if (!this.modeloAtual)
        return;

    toast(

        "Duplicação completa será implementada na próxima versão.",

        "info"

    );

}

