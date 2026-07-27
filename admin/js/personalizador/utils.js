
/* ==========================================================
   MUGART
   PERSONALIZADOR
   UTILS
========================================================== */

export function toast(mensagem, tipo = "success") {

    if (window.showToast) {

        showToast(mensagem, tipo);

        return;

    }

    console.log(`[${tipo}] ${mensagem}`);

}

export function moeda(valor) {

    return new Intl.NumberFormat(

        "pt-BR",

        {

            style: "currency",

            currency: "BRL"

        }

    ).format(Number(valor || 0));

}

export function numero(valor) {

    return Number(valor || 0);

}

export function uuid() {

    return crypto.randomUUID();

}

export function confirmar(texto) {

    return confirm(texto);

}

export function formatarData(data) {

    if (!data)

        return "";

    return new Date(data)

        .toLocaleString("pt-BR");

}

export function limparObjeto(obj) {

    Object.keys(obj).forEach(chave => {

        if (

            obj[chave] === "" ||

            obj[chave] === null ||

            obj[chave] === undefined

        ) {

            delete obj[chave];

        }

    });

    return obj;

}

export function slug(texto) {

    return texto

        .normalize("NFD")

        .replace(/[\u0300-\u036f]/g, "")

        .replace(/[^a-zA-Z0-9]/g, "-")

        .replace(/-+/g, "-")

        .replace(/^-|-$/g, "")

        .toLowerCase();

}
