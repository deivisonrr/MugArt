/* ==========================================================
   MUGART ERP
   PERSONALIZADOR
   ========================================================== */
console.log("PERSONALIZADOR CARREGADO");
const Personalizador = {

    modelos: [],
    modeloAtual: null,

    elementos: {},

    async init() {

        this.mapearElementos();

        this.registrarEventos();

        await this.carregarModelos();

    },

    mapearElementos() {

        this.elementos = {

            lista: document.getElementById("admin3Products"),

            drawer: document.getElementById("admin3Drawer"),

            overlay: document.getElementById("admin3Overlay"),

            form: document.getElementById("admin3ProductForm"),

            btnNovo: document.getElementById("openProductDrawer"),

            btnCancelar: document.getElementById("admin3Cancel"),

            btnFechar: document.getElementById("closeProductDrawer"),

            tituloDrawer: document.getElementById("admin3DrawerTitle"),

            id: document.getElementById("admin3ProductId"),

            nome: document.getElementById("admin3Name"),

            categoria: document.getElementById("admin3Category"),

            preco: document.getElementById("admin3OldPrice"),

            descricao: document.getElementById("admin3Description"),

            ativo: document.getElementById("admin3Active"),

            imagem: document.getElementById("admin3ImageUrl")

        };

    },

    registrarEventos() {

        this.elementos.btnNovo.addEventListener("click", () => {

            this.novoModelo();

        });

        this.elementos.btnCancelar.addEventListener("click", () => {

            this.fecharDrawer();

        });

        this.elementos.btnFechar.addEventListener("click", () => {

            this.fecharDrawer();

        });

        this.elementos.overlay.addEventListener("click", () => {

            this.fecharDrawer();

        });

        this.elementos.form.addEventListener("submit", async (e) => {

            e.preventDefault();

            await this.salvarModelo();

        });

    },

       async carregarModelos() {

        try {

            const { data, error } = await supabase
                .from("customization_models")
                .select("*")
                .order("name");

            if (error) throw error;

            this.modelos = data || [];

            this.renderizarModelos();

        } catch (erro) {

            console.error("Erro ao carregar modelos:", erro);

            this.elementos.lista.innerHTML = `
                <div class="admin3-empty">
                    <h3>Erro ao carregar os modelos</h3>
                    <p>${erro.message}</p>
                </div>
            `;

        }

    },

    renderizarModelos() {

        if (!this.elementos.lista) return;

        if (!this.modelos.length) {

            this.elementos.lista.innerHTML = `
                <div class="admin3-empty">
                    <h3>Nenhum modelo cadastrado</h3>
                    <p>Clique em <strong>Novo Modelo</strong> para criar o primeiro.</p>
                </div>
            `;

            return;

        }

        this.elementos.lista.innerHTML = this.modelos.map(modelo => `

            <article class="admin3-product-card">

                <div class="photo">

                    <img
                        src="${modelo.image_url || '../assets/sem-imagem.png'}"
                        alt="${modelo.name}"
                        onerror="this.src='../assets/sem-imagem.png'"
                    >

                </div>

                <h3>${modelo.name}</h3>

                <div class="admin3-badges">

                    <span class="admin3-badge">
                        ${modelo.category || "Sem categoria"}
                    </span>

                    ${modelo.allow_variations
                        ? `<span class="admin3-badge yellow">Variações</span>`
                        : ``}

                    ${modelo.active
                        ? `<span class="admin3-badge">Ativo</span>`
                        : `<span class="admin3-badge red">Inativo</span>`}

                </div>

                <div class="admin3-price">

                    ${(modelo.base_price || 0).toLocaleString(
                        "pt-BR",
                        {
                            style: "currency",
                            currency: "BRL"
                        }
                    )}

                </div>

                <div class="admin3-card-actions">

                    <button
                        class="edit"
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

        `).join("");

    },
   
    novoModelo() {

        this.modeloAtual = null;

        this.limparFormulario();

        this.elementos.tituloDrawer.textContent = "Novo Modelo";

        this.abrirDrawer();

    },

    abrirDrawer() {

        this.elementos.drawer.classList.add("open");

        this.elementos.overlay.classList.add("open");

    },

    fecharDrawer() {

        this.elementos.drawer.classList.remove("open");

        this.elementos.overlay.classList.remove("open");

    },

    limparFormulario() {

        this.elementos.form.reset();

        this.elementos.id.value = "";

        if (this.elementos.imagem) {

            this.elementos.imagem.value = "";

        }

    },

       preencherFormulario(modelo) {

        this.modeloAtual = modelo;

        this.elementos.id.value = modelo.id || "";

        this.elementos.nome.value = modelo.name || "";

        this.elementos.categoria.value = modelo.category || "";

        this.elementos.preco.value = modelo.base_price || 0;

        this.elementos.descricao.value =
            modelo.description || "";

        this.elementos.ativo.value =
            modelo.active ? "true" : "false";

        this.elementos.imagem.value =
            modelo.image_url || "";

        this.elementos.tituloDrawer.textContent =
            "Editar Modelo";

        this.abrirDrawer();

    },

    editarModelo(id) {

        const modelo =
            this.modelos.find(m => m.id == id);

        if (!modelo) return;

        this.preencherFormulario(modelo);

    },

       async salvarModelo() {

        try {

            const modelo = {

                name: this.elementos.nome.value.trim(),

                category: this.elementos.categoria.value,

                base_price: Number(this.elementos.preco.value || 0),

                description: this.elementos.descricao.value.trim(),

                image_url: this.elementos.imagem.value.trim(),

                active: this.elementos.ativo.value === "true"

            };

            let resultado;

            if (this.modeloAtual) {

                resultado = await supabase
                    .from("customization_models")
                    .update(modelo)
                    .eq("id", this.modeloAtual.id);

            } else {

                resultado = await supabase
                    .from("customization_models")
                    .insert(modelo);

            }

            if (resultado.error)
                throw resultado.error;

            await this.carregarModelos();

            this.fecharDrawer();

            alert("Modelo salvo com sucesso.");

        } catch (erro) {

            console.error(erro);

            alert("Erro ao salvar modelo.");

        }

    },

       async excluirModelo(id) {

        if (!confirm("Deseja realmente excluir este modelo?"))
            return;

        try {

            const { error } = await supabase

                .from("customization_models")

                .delete()

                .eq("id", id);

            if (error)
                throw error;

            await this.carregarModelos();

        } catch (erro) {

            console.error(erro);

            alert("Erro ao excluir.");

        }

    }

};

document.addEventListener("DOMContentLoaded", () => {

    Personalizador.init();

});

