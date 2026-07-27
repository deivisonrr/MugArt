
/* ==========================================================
   MUGART
   PERSONALIZADOR
   EDITOR VISUAL
========================================================== */

import { toast } from "./utils.js";

export function iniciarEditor() {

    this.editor = {

        canvas:

            document.getElementById(

                "printEditor"

            ),

        area:

            document.getElementById(

                "printSelection"

            ),

        preview:

            document.getElementById(

                "printPreview"

            )

    };

    if (!this.editor.canvas)

        return;

    this.configurarInteract();

}

export function configurarInteract() {

    if (!this.editor.area)

        return;

    interact(this.editor.area)

        .draggable({

            listeners: {

                move: event => {

                    let x =

                        Number(

                            event.target.dataset.x || 0

                        ) + event.dx;

                    let y =

                        Number(

                            event.target.dataset.y || 0

                        ) + event.dy;

                    event.target.style.transform =

                        `translate(${x}px,${y}px)`;

                    event.target.dataset.x = x;

                    event.target.dataset.y = y;

                    this.sincronizarEditor();

                }

            }

        })

        .resizable({

            edges: {

                left: true,

                right: true,

                top: true,

                bottom: true

            },

            listeners: {

                move: event => {

                    const alvo =

                        event.target;

                    let x =

                        Number(

                            alvo.dataset.x || 0

                        );

                    let y =

                        Number(

                            alvo.dataset.y || 0

                        );

                    alvo.style.width =

                        event.rect.width + "px";

                    alvo.style.height =

                        event.rect.height + "px";

                    x += event.deltaRect.left;

                    y += event.deltaRect.top;

                    alvo.style.transform =

                        `translate(${x}px,${y}px)`;

                    alvo.dataset.x = x;

                    alvo.dataset.y = y;

                    this.sincronizarEditor();

                }

            }

        });

}

export function sincronizarEditor() {

    if (!this.editor.area)

        return;

    document.getElementById(

        "printAreaX"

    ).value =

        Math.round(

            Number(

                this.editor.area.dataset.x || 0

            )

        );

    document.getElementById(

        "printAreaY"

    ).value =

        Math.round(

            Number(

                this.editor.area.dataset.y || 0

            )

        );

    document.getElementById(

        "printAreaWidth"

    ).value =

        parseInt(

            this.editor.area.style.width

        ) || 0;

    document.getElementById(

        "printAreaHeight"

    ).value =

        parseInt(

            this.editor.area.style.height

        ) || 0;

}

export function carregarAreaNoEditor(area) {

    if (!this.editor.area)

        return;

    this.editor.area.dataset.x =

        area.x;

    this.editor.area.dataset.y =

        area.y;

    this.editor.area.style.width =

        area.width + "px";

    this.editor.area.style.height =

        area.height + "px";

    this.editor.area.style.transform =

        `translate(${area.x}px,${area.y}px)`;

}

export function limparEditor() {

    if (!this.editor.area)

        return;

    this.editor.area.dataset.x = 0;

    this.editor.area.dataset.y = 0;

    this.editor.area.style.width =

        "300px";

    this.editor.area.style.height =

        "300px";

    this.editor.area.style.transform =

        "translate(0,0)";

}

export function alterarZoom(valor) {

    this.zoom = valor;

    if (!this.editor.preview)

        return;

    this.editor.preview.style.transform =

        `scale(${valor})`;

}

export function zoomMais() {

    this.alterarZoom(

        (this.zoom || 1) + 0.1

    );

}

export function zoomMenos() {

    this.alterarZoom(

        Math.max(

            0.2,

            (this.zoom || 1) - 0.1

        )

    );

}

export function zoomReset() {

    this.alterarZoom(1);

}

export function centralizarArea() {

    if (!this.editor.area)

        return;

    const canvas =

        this.editor.canvas.getBoundingClientRect();

    const area =

        this.editor.area.getBoundingClientRect();

    const x =

        (canvas.width - area.width) / 2;

    const y =

        (canvas.height - area.height) / 2;

    this.editor.area.dataset.x = x;

    this.editor.area.dataset.y = y;

    this.editor.area.style.transform =

        `translate(${x}px,${y}px)`;

    this.sincronizarEditor();

}

export function atualizarPreview(url) {

    if (!this.editor.preview)

        return;

    this.editor.preview.src = url;

}

