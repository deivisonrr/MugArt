/* ==========================================================
   MugArt ERP
   Personalizador
   Arquivo: admin/js/personalizador.js
========================================================== */

const CUSTOMIZATION_BUCKET = "product-images";

const Personalizador = {

    db: null,

    modelos: [],

    modeloAtual: null,

    variacaoAtual: null,

    areaAtual: null,

    arquivoAtual: null,

    elementos: {},

    filtros: {

        busca: "",

        status: "todos",

        categoria: "todos",

        visualizacao: "cards"

    },

    async init() {

        if (!window.mugartSupabase) {

            console.error("Supabase não carregado.");

            return;

        }

        this.db = window.mugartSupabase;

        this.mapearElementos();

        this.registrarEventos();

        await this.carregarModelos();

    },

    mapearElementos() {

        this.elementos = {

            lista:

                document.getElementById("admin3Products"),

            drawer:

                document.getElementById("admin3Drawer"),

            overlay:

                document.getElementById("admin3Overlay"),

            form:

                document.getElementById("admin3ProductForm"),

            tituloDrawer:

                document.getElementById("admin3DrawerTitle"),

            btnNovo:

                document.getElementById("openProductDrawer"),

            btnCancelar:

                document.getElementById("admin3Cancel"),

            btnFechar:

                document.getElementById("closeProductDrawer"),

            busca:

                document.getElementById("admin3Search"),

            filtroStatus:

                document.getElementById("admin3StatusFilter"),

            modoVisualizacao:

                document.getElementById("admin3ViewMode"),

            id:

                document.getElementById("admin3ProductId"),

            nome:

                document.getElementById("admin3Name"),

            descricao:

                document.getElementById("admin3Description"),

            categoria:

                document.getElementById("admin3Category"),

            preco:

                document.getElementById("admin3OldPrice"),

            imagem:

                document.getElementById("admin3ImageUrl"),

            ativo:

                document.getElementById("admin3Active"),

            permitirVariacoes:

                document.getElementById("admin3AllowVariations")

        };

    },

    registrarEventos() {

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

            (e) => {

                this.filtros.busca = e.target.value;

                this.renderizarModelos();

            }

        );

        this.elementos.filtroStatus?.addEventListener(

            "change",

            (e) => {

                this.filtros.status = e.target.value;

                this.renderizarModelos();

            }

        );

        this.elementos.modoVisualizacao?.addEventListener(

            "change",

            (e) => {

                this.filtros.visualizacao = e.target.value;

                this.renderizarModelos();

            }

        );

        document

            .querySelectorAll(".admin3-tab")

            .forEach(botao => {

                botao.addEventListener(

                    "click",

                    () => {

                        document

                            .querySelectorAll(".admin3-tab")

                            .forEach(tab =>

                                tab.classList.remove("active")

                            );

                        document

                            .querySelectorAll(".admin3-tab-panel")

                            .forEach(painel =>

                                painel.classList.remove("active")

                            );

                        botao.classList.add("active");

                        document

                            .getElementById(

                                "admin3-tab-" +

                                botao.dataset.tab

                            )

                            ?.classList.add("active");

                    }

                );

            });

    },

       async carregarModelos() {

        try {

            const { data, error } = await this.db
                .from("customization_models")
                .select("*")
                .order("display_order", { ascending: true })
                .order("name", { ascending: true });

            if (error) throw error;

            this.modelos = data || [];

            this.renderizarIndicadores();

            this.renderizarModelos();

        } catch (erro) {

            console.error("Erro ao carregar modelos:", erro);

            if (this.elementos.lista) {

                this.elementos.lista.innerHTML = `
                    <div class="admin3-empty">

                        <h3>Erro ao carregar modelos</h3>

                        <p>${erro.message}</p>

                    </div>
                `;

            }

        }

    },

    renderizarIndicadores() {

        const total = this.modelos.length;

        const ativos =
            this.modelos.filter(m => m.active).length;

        const variacoes =
            this.modelos.filter(m => m.allow_variations).length;

        const inativos = total - ativos;

        const elAtivos =
            document.getElementById("admin3ActiveProducts");

        const elTotal =
            document.getElementById("admin3TotalStock");

        const elVariacoes =
            document.getElementById("admin3LowStock");

        const elInativos =
            document.getElementById("admin3Featured");

        if (elAtivos)
            elAtivos.textContent = ativos;

        if (elTotal)
            elTotal.textContent = total;

        if (elVariacoes)
            elVariacoes.textContent = variacoes;

        if (elInativos)
            elInativos.textContent = inativos;

    },

    getModelosFiltrados() {

        let lista = [...this.modelos];

        const busca =
            this.filtros.busca
                .toLowerCase()
                .trim();

        if (busca) {

            lista = lista.filter(modelo => {

                return (

                    (modelo.name || "")
                        .toLowerCase()
                        .includes(busca)

                    ||

                    (modelo.description || "")
                        .toLowerCase()
                        .includes(busca)

                );

            });

        }

        if (this.filtros.status === "ativo") {

            lista =
                lista.filter(m => m.active);

        }

        if (this.filtros.status === "inativo") {

            lista =
                lista.filter(m => !m.active);

        }

        return lista;

    },

       renderizarModelos() {

        if (!this.elementos.lista) return;

        const modelos = this.getModelosFiltrados();

        this.elementos.lista.className =
            "admin3-products " + this.filtros.visualizacao;

        if (!modelos.length) {

            this.elementos.lista.innerHTML = `

                <div class="admin3-empty">

                    <h3>Nenhum modelo encontrado</h3>

                    <p>

                        Clique em <strong>Novo Modelo</strong>
                        para cadastrar o primeiro.

                    </p>

                </div>

            `;

            return;

        }

        this.elementos.lista.innerHTML = modelos
            .map(modelo => {

                if (this.filtros.visualizacao === "lista") {

                    return this.linhaModelo(modelo);

                }

                return this.cardModelo(modelo);

            })
            .join("");

    },

    cardModelo(modelo) {

        return `

        <article class="admin3-product-card">

            <div class="photo">

                <img

                    src="${modelo.image_url || "../assets/hero-caneca.png"}"

                    alt="${modelo.name}"

                    onerror="this.src='../assets/hero-caneca.png'"

                >

            </div>

            <div>

                <h3>${modelo.name}</h3>

            </div>

            <div class="admin3-badges">

                ${modelo.allow_variations
                    ? `<span class="admin3-badge yellow">
                            Possui variações
                       </span>`
                    : ""}

                <span class="admin3-badge">

                    ${modelo.active
                        ? "Ativo"
                        : "Inativo"}

                </span>

            </div>

            <div class="admin3-price">

                ${new Intl.NumberFormat(

                    "pt-BR",

                    {

                        style: "currency",

                        currency: "BRL"

                    }

                ).format(modelo.base_price || 0)}

            </div>

            <div class="admin3-card-actions">

                <button

                    class="edit"

                    type="button"

                    onclick="Personalizador.editarModelo('${modelo.id}')">

                    Editar

                </button>

                <button

                    type="button"

                    onclick="Personalizador.duplicarModelo('${modelo.id}')">

                    Duplicar

                </button>

                <button

                    class="delete"

                    type="button"

                    onclick="Personalizador.excluirModelo('${modelo.id}')">

                    Excluir

                </button>

            </div>

        </article>

        `;

    },

    linhaModelo(modelo) {

        return `

        <article class="admin3-product-row">

            <img

                src="${modelo.image_url || "../assets/hero-caneca.png"}"

                alt="${modelo.name}"

            >

            <div>

                <h3>${modelo.name}</h3>

                <small>

                    ${modelo.description || ""}

                </small>

            </div>

            <div class="admin3-badges">

                <span class="admin3-badge">

                    ${modelo.allow_variations
                        ? "Com variações"
                        : "Modelo único"}

                </span>

            </div>

            <div class="admin3-price">

                ${new Intl.NumberFormat(

                    "pt-BR",

                    {

                        style: "currency",

                        currency: "BRL"

                    }

                ).format(modelo.base_price || 0)}

            </div>

            <div class="admin3-card-actions">

                <button

                    class="edit"

                    onclick="Personalizador.editarModelo('${modelo.id}')">

                    Editar

                </button>

                <button

                    onclick="Personalizador.duplicarModelo('${modelo.id}')">

                    Duplicar

                </button>

                <button

                    class="delete"

                    onclick="Personalizador.excluirModelo('${modelo.id}')">

                    Excluir

                </button>

            </div>

        </article>

        `;

    },

       novoModelo() {

        this.modeloAtual = null;

        this.limparFormulario();

        this.elementos.tituloDrawer.textContent =
            "Novo Modelo";

        this.abrirDrawer();

    },

    abrirDrawer() {

        this.elementos.drawer?.classList.add("open");

        this.elementos.overlay?.classList.add("open");

    },

    fecharDrawer() {

        this.elementos.drawer?.classList.remove("open");

        this.elementos.overlay?.classList.remove("open");

    },

    limparFormulario() {

        this.elementos.form?.reset();

        if (this.elementos.id)
            this.elementos.id.value = "";

        if (this.elementos.imagem)
            this.elementos.imagem.value = "";

        if (this.elementos.ativo)
            this.elementos.ativo.value = "true";

        if (this.elementos.permitirVariacoes)
            this.elementos.permitirVariacoes.checked = false;

    },

    preencherFormulario(modelo) {

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

        if (this.elementos.categoria)
            this.elementos.categoria.value =
                modelo.category || "";

        if (this.elementos.ativo)
            this.elementos.ativo.value =
                modelo.active ? "true" : "false";

        if (this.elementos.permitirVariacoes)
            this.elementos.permitirVariacoes.checked =
                !!modelo.allow_variations;

        this.elementos.tituloDrawer.textContent =
            "Editar Modelo";

        this.abrirDrawer();

    },

    editarModelo(id) {

        const modelo = this.modelos.find(

            item => item.id === id

        );

        if (!modelo) {

            alert("Modelo não encontrado.");

            return;

        }

        this.preencherFormulario(modelo);

    },

    async duplicarModelo(id) {

        const modelo = this.modelos.find(

            item => item.id === id

        );

        if (!modelo)
            return;

        const novoModelo = {

            name: modelo.name + " - Cópia",

            description: modelo.description,

            base_price: modelo.base_price,

            image_url: modelo.image_url,

            allow_variations:
                modelo.allow_variations,

            active: false,

            display_order:
                modelo.display_order

        };

        try {

            const { error } =
                await this.db

                    .from("customization_models")

                    .insert(novoModelo);

            if (error)
                throw error;

            await this.carregarModelos();

            alert("Modelo duplicado.");

        } catch (erro) {

            console.error(erro);

            alert(
                "Erro ao duplicar modelo."
            );

        }

    },

       async salvarModelo() {

        try {

            const modelo = {

                name:
                    this.elementos.nome.value.trim(),

                description:
                    this.elementos.descricao.value.trim(),

                base_price:
                    Number(this.elementos.preco.value || 0),

                image_url:
                    this.elementos.imagem.value.trim(),

                allow_variations:
                    this.elementos.permitirVariacoes
                        ? this.elementos.permitirVariacoes.checked
                        : false,

                active:
                    this.elementos.ativo
                        ? this.elementos.ativo.value === "true"
                        : true

            };

            if (!modelo.name) {

                alert("Informe o nome do modelo.");

                this.elementos.nome.focus();

                return;

            }

            let resultado;

            if (this.modeloAtual) {

                resultado = await this.db

                    .from("customization_models")

                    .update(modelo)

                    .eq("id", this.modeloAtual.id);

            } else {

                resultado = await this.db

                    .from("customization_models")

                    .insert(modelo);

            }

            if (resultado.error)
                throw resultado.error;

            await this.carregarModelos();

            this.fecharDrawer();

            alert("Modelo salvo com sucesso.");

        }

        catch (erro) {

            console.error(erro);

            alert(
                "Erro ao salvar modelo.\n\n" +
                erro.message
            );

        }

    },

    async excluirModelo(id) {

        if (!confirm(
            "Deseja realmente excluir este modelo?"
        ))
            return;

        try {

            const { error } = await this.db

                .from("customization_models")

                .delete()

                .eq("id", id);

            if (error)
                throw error;

            await this.carregarModelos();

            alert("Modelo excluído.");

        }

        catch (erro) {

            console.error(erro);

            alert(
                "Erro ao excluir.\n\n" +
                erro.message
            );

        }

    },

    atualizarPreviewImagem() {

        const preview =
            document.getElementById(
                "admin3ImagePreview"
            );

        const placeholder =
            document.getElementById(
                "admin3ImagePlaceholder"
            );

        if (!preview)
            return;

        const url =
            this.elementos.imagem.value.trim();

        if (!url) {

            preview.removeAttribute("src");

            preview.style.display = "none";

            if (placeholder)
                placeholder.style.display = "flex";

            return;

        }

        preview.src = url;

        preview.style.display = "block";

        if (placeholder)
            placeholder.style.display = "none";

    },

    async uploadImagem() {

        const arquivo =
            document.getElementById(
                "admin3ImageFile"
            )?.files?.[0];

        if (!arquivo) {

            alert("Escolha uma imagem.");

            return;

        }

        const extensao =
            arquivo.name
                .split(".")
                .pop()
                .toLowerCase();

        const nomeArquivo =

            "personalizador/" +

            Date.now() +

            "." +

            extensao;

        const upload = await this.db.storage

            .from(CUSTOMIZATION_BUCKET)

            .upload(

                nomeArquivo,

                arquivo,

                {

                    upsert: true

                }

            );

        if (upload.error) {

            alert(upload.error.message);

            return;

        }

        const url = this.db.storage

            .from(CUSTOMIZATION_BUCKET)

            .getPublicUrl(nomeArquivo);

        this.elementos.imagem.value =
            url.data.publicUrl;

        this.atualizarPreviewImagem();

        alert("Imagem enviada.");

    }

};

document.addEventListener(

    "DOMContentLoaded",

    () => {

        Personalizador.init();

    }

);

    /* ==========================================================
       VARIAÇÕES
    ========================================================== */

    async carregarVariacoes(modeloId) {

        try {

            const { data, error } = await this.db

                .from("customization_variants")

                .select("*")

                .eq("model_id", modeloId)

                .order("display_order",{ascending:true})

                .order("name",{ascending:true});

            if(error) throw error;

            this.renderizarVariacoes(data || []);

        }

        catch(erro){

            console.error(erro);

        }

    },

    renderizarVariacoes(lista){

        const container =
            document.getElementById("admin3Variants");

        if(!container) return;

        if(!lista.length){

            container.innerHTML=`

                <div class="admin3-empty">

                    Nenhuma variação cadastrada.

                </div>

            `;

            return;

        }

        container.innerHTML = lista.map(item=>`

            <article class="admin3-variant-card">

                <header>

                    <div>

                        <h4>${item.name}</h4>

                        <small>

                            ${item.active ? "Ativa" : "Inativa"}

                        </small>

                    </div>

                    <div>

                        <button
                            class="edit"
                            onclick="Personalizador.editarVariacao('${item.id}')">

                            Editar

                        </button>

                        <button
                            class="delete"
                            onclick="Personalizador.excluirVariacao('${item.id}')">

                            Excluir

                        </button>

                    </div>

                </header>

                <div class="admin3-variant-meta">

                    <span>

                        Acréscimo:

                        ${new Intl.NumberFormat(

                            "pt-BR",

                            {

                                style:"currency",

                                currency:"BRL"

                            }

                        ).format(item.price_adjustment||0)}

                    </span>

                </div>

            </article>

        `).join("");

    },

    async salvarVariacao(dados){

        try{

            let result;

            if(dados.id){

                result =
                    await this.db

                    .from("customization_variants")

                    .update(dados)

                    .eq("id",dados.id);

            }

            else{

                result =
                    await this.db

                    .from("customization_variants")

                    .insert(dados);

            }

            if(result.error)
                throw result.error;

            await this.carregarVariacoes(
                this.modeloAtual.id
            );

        }

        catch(erro){

            console.error(erro);

            alert("Erro ao salvar variação.");

        }

    },

    async excluirVariacao(id){

        if(!confirm("Excluir variação?"))
            return;

        const {error} =
            await this.db

            .from("customization_variants")

            .delete()

            .eq("id",id);

        if(error){

            alert(error.message);

            return;

        }

        await this.carregarVariacoes(
            this.modeloAtual.id
        );

    },

    async editarVariacao(id){

        const {data,error} =
            await this.db

            .from("customization_variants")

            .select("*")

            .eq("id",id)

            .single();

        if(error){

            alert(error.message);

            return;

        }

        this.variacaoAtual=data;

        /*
            próxima parte:
            abrir drawer da variação
        */

    },

    /* ==========================================================
       GALERIA
    ========================================================== */

    async uploadImagemPrincipal() {

        const file =
            document.getElementById("admin3ImageFile")?.files?.[0];

        if (!file) {

            alert("Selecione uma imagem.");

            return;

        }

        if (!this.modeloAtual) {

            alert("Salve o modelo antes de enviar imagens.");

            return;

        }

        const extensao =
            file.name.split(".").pop().toLowerCase();

        const caminho =

            "customization/" +

            this.modeloAtual.id +

            "/" +

            Date.now() +

            "." +

            extensao;

        const upload = await this.db.storage

            .from(CUSTOMIZATION_BUCKET)

            .upload(caminho,file,{upsert:true});

        if(upload.error){

            alert(upload.error.message);

            return;

        }

        const url = this.db.storage

            .from(CUSTOMIZATION_BUCKET)

            .getPublicUrl(caminho);

        const imagem = url.data.publicUrl;

        await this.db

            .from("customization_models")

            .update({

                image_url:imagem,

                thumbnail_url:imagem

            })

            .eq("id",this.modeloAtual.id);

        this.elementos.imagem.value = imagem;

        this.atualizarPreviewImagem();

        await this.adicionarImagemGaleria(imagem,true);

        await this.carregarModelos();

    },

    async adicionarImagemGaleria(url,isMain=false){

        if(!this.modeloAtual) return;

        const {error} = await this.db

            .from("customization_gallery")

            .insert({

                model_id:this.modeloAtual.id,

                image_url:url,

                is_main:isMain

            });

        if(error){

            console.error(error);

            return;

        }

        await this.carregarGaleria();

    },

    async carregarGaleria(){

        if(!this.modeloAtual) return;

        const {data,error} = await this.db

            .from("customization_gallery")

            .select("*")

            .eq("model_id",this.modeloAtual.id)

            .order("display_order");

        if(error){

            console.error(error);

            return;

        }

        this.renderizarGaleria(data||[]);

    },

    renderizarGaleria(imagens){

        const galeria =
            document.getElementById("admin3Gallery");

        if(!galeria) return;

        if(!imagens.length){

            galeria.innerHTML=`

                <div class="admin3-empty">

                    Nenhuma imagem cadastrada.

                </div>

            `;

            return;

        }

        galeria.innerHTML = imagens.map(img=>`

            <article class="admin3-gallery-card">

                <img src="${img.image_url}">

                <div class="admin3-card-actions">

                    <button
                        onclick="Personalizador.definirImagemPrincipal('${img.id}')">

                        Principal

                    </button>

                    <button
                        class="delete"
                        onclick="Personalizador.excluirImagem('${img.id}')">

                        Excluir

                    </button>

                </div>

            </article>

        `).join("");

    },

    async definirImagemPrincipal(id){

        if(!this.modeloAtual) return;

        await this.db

            .from("customization_gallery")

            .update({

                is_main:false

            })

            .eq("model_id",this.modeloAtual.id);

        await this.db

            .from("customization_gallery")

            .update({

                is_main:true

            })

            .eq("id",id);

        const {data} = await this.db

            .from("customization_gallery")

            .select()

            .eq("id",id)

            .single();

        if(data){

            await this.db

                .from("customization_models")

                .update({

                    image_url:data.image_url,

                    thumbnail_url:data.image_url

                })

                .eq("id",this.modeloAtual.id);

        }

        await this.carregarGaleria();

        await this.carregarModelos();

    },

    async excluirImagem(id){

        if(!confirm("Excluir imagem?"))
            return;

        await this.db

            .from("customization_gallery")

            .delete()

            .eq("id",id);

        await this.carregarGaleria();

    },

    /* ==========================================================
       VARIAÇÕES
    ========================================================== */

    abrirDrawerVariacao() {

        document
            .getElementById("admin3VariantDrawer")
            ?.classList.add("open");

    },

    fecharDrawerVariacao() {

        document
            .getElementById("admin3VariantDrawer")
            ?.classList.remove("open");

        this.variacaoAtual = null;

    },

    limparFormularioVariacao() {

        document.getElementById("variantId").value = "";

        document.getElementById("variantName").value = "";

        document.getElementById("variantColor").value = "";

        document.getElementById("variantPrice").value = "0";

        document.getElementById("variantImage").value = "";

        document.getElementById("variantOrder").value = "0";

        document.getElementById("variantActive").checked = true;

    },

    novaVariacao() {

        this.variacaoAtual = null;

        this.limparFormularioVariacao();

        this.abrirDrawerVariacao();

    },

    preencherFormularioVariacao(variacao) {

        this.variacaoAtual = variacao;

        document.getElementById("variantId").value =
            variacao.id;

        document.getElementById("variantName").value =
            variacao.name;

        document.getElementById("variantColor").value =
            variacao.color || "";

        document.getElementById("variantPrice").value =
            variacao.price_adjustment || 0;

        document.getElementById("variantImage").value =
            variacao.image_url || "";

        document.getElementById("variantOrder").value =
            variacao.display_order || 0;

        document.getElementById("variantActive").checked =
            variacao.active;

        this.abrirDrawerVariacao();

    },

    async salvarVariacaoFormulario() {

        const dados = {

            model_id:
                this.modeloAtual.id,

            name:
                document.getElementById("variantName").value,

            color:
                document.getElementById("variantColor").value,

            image_url:
                document.getElementById("variantImage").value,

            price_adjustment:

                Number(

                    document.getElementById("variantPrice").value || 0

                ),

            display_order:

                Number(

                    document.getElementById("variantOrder").value || 0

                ),

            active:

                document.getElementById("variantActive").checked

        };

        if(this.variacaoAtual){

            const {error}=

                await this.db

                .from("customization_variants")

                .update(dados)

                .eq("id",this.variacaoAtual.id);

            if(error){

                alert(error.message);

                return;

            }

        }

        else{

            const {error}=

                await this.db

                .from("customization_variants")

                .insert(dados);

            if(error){

                alert(error.message);

                return;

            }

        }

        this.fecharDrawerVariacao();

        await this.carregarVariacoes(

            this.modeloAtual.id

        );

    },

    async uploadImagemVariacao() {

        const file =

            document

            .getElementById("variantImageFile")

            ?.files?.[0];

        if(!file){

            alert("Escolha uma imagem.");

            return;

        }

        const extensao =

            file.name

            .split(".")

            .pop()

            .toLowerCase();

        const caminho =

            "customization/variants/" +

            Date.now() +

            "." +

            extensao;

        const upload =

            await this.db.storage

            .from(CUSTOMIZATION_BUCKET)

            .upload(

                caminho,

                file,

                {

                    upsert:true

                }

            );

        if(upload.error){

            alert(upload.error.message);

            return;

        }

        const url =

            this.db.storage

            .from(CUSTOMIZATION_BUCKET)

            .getPublicUrl(caminho);

        document.getElementById("variantImage").value =

            url.data.publicUrl;

    },

    /* ==========================================================
       ÁREA DE IMPRESSÃO
    ========================================================== */

    areaSelecionada: null,

    areasImpressao: [],

    async carregarAreasImpressao() {

        if (!this.modeloAtual) return;

        const { data, error } = await this.db

            .from("customization_print_areas")

            .select("*")

            .eq("model_id", this.modeloAtual.id)

            .order("display_order", { ascending: true });

        if (error) {

            console.error(error);

            return;

        }

        this.areasImpressao = data || [];

        this.renderizarListaAreas();

    },

    renderizarListaAreas() {

        const lista = document.getElementById("admin3PrintAreas");

        if (!lista) return;

        if (!this.areasImpressao.length) {

            lista.innerHTML = `

                <div class="admin3-empty">

                    Nenhuma área cadastrada.

                </div>

            `;

            return;

        }

        lista.innerHTML = this.areasImpressao.map(area => `

            <article class="admin3-print-card">

                <strong>${area.name}</strong>

                <small>${area.side || ""}</small>

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

        `).join("");

    },

    novaAreaImpressao() {

        this.areaSelecionada = null;

        document.getElementById("printAreaId").value = "";

        document.getElementById("printAreaName").value = "";

        document.getElementById("printAreaSide").value = "front";

        document.getElementById("printAreaX").value = 0;

        document.getElementById("printAreaY").value = 0;

        document.getElementById("printAreaWidth").value = 200;

        document.getElementById("printAreaHeight").value = 200;

        document.getElementById("printAreaRotation").value = 0;

    },

    async salvarAreaImpressao() {

        const dados = {

            model_id: this.modeloAtual.id,

            name:
                document.getElementById("printAreaName").value,

            side:
                document.getElementById("printAreaSide").value,

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

            active: true

        };

        if (this.areaSelecionada) {

            await this.db

                .from("customization_print_areas")

                .update(dados)

                .eq("id", this.areaSelecionada.id);

        } else {

            await this.db

                .from("customization_print_areas")

                .insert(dados);

        }

        await this.carregarAreasImpressao();

    },

    async editarArea(id) {

        const { data } = await this.db

            .from("customization_print_areas")

            .select("*")

            .eq("id", id)

            .single();

        if (!data) return;

        this.areaSelecionada = data;

        document.getElementById("printAreaId").value = data.id;

        document.getElementById("printAreaName").value = data.name;

        document.getElementById("printAreaSide").value = data.side;

        document.getElementById("printAreaX").value = data.x;

        document.getElementById("printAreaY").value = data.y;

        document.getElementById("printAreaWidth").value = data.width;

        document.getElementById("printAreaHeight").value = data.height;

        document.getElementById("printAreaRotation").value = data.rotation;

    },

    async excluirArea(id) {

        if (!confirm("Excluir esta área de impressão?"))
            return;

        await this.db

            .from("customization_print_areas")

            .delete()

            .eq("id", id);

        await this.carregarAreasImpressao();

    },

/* ==========================================================
   EDITOR VISUAL
========================================================== */

editor: {

    canvas: null,

    imagem: null,

    area: null,

    dragging: false,

    resizing: false,

    offsetX: 0,

    offsetY: 0

},

inicializarEditor(){

    this.editor.canvas =
        document.getElementById("printEditor");

    this.editor.imagem =
        document.getElementById("printPreview");

    this.editor.area =
        document.getElementById("printSelection");

    if(!this.editor.canvas)
        return;

    this.editor.area.addEventListener(

        "mousedown",

        this.iniciarDrag.bind(this)

    );

    document.addEventListener(

        "mousemove",

        this.dragArea.bind(this)

    );

    document.addEventListener(

        "mouseup",

        this.finalizarDrag.bind(this)

    );

},

iniciarDrag(e){

    this.editor.dragging = true;

    const rect =
        this.editor.area.getBoundingClientRect();

    this.editor.offsetX =
        e.clientX - rect.left;

    this.editor.offsetY =
        e.clientY - rect.top;

},

dragArea(e){

    if(!this.editor.dragging)
        return;

    const canvas =
        this.editor.canvas.getBoundingClientRect();

    const x =
        e.clientX -

        canvas.left -

        this.editor.offsetX;

    const y =
        e.clientY -

        canvas.top -

        this.editor.offsetY;

    this.editor.area.style.left =
        x + "px";

    this.editor.area.style.top =
        y + "px";

},

finalizarDrag(){

    if(!this.editor.dragging)
        return;

    this.editor.dragging = false;

    document.getElementById("printAreaX").value =
        parseInt(this.editor.area.style.left);

    document.getElementById("printAreaY").value =
        parseInt(this.editor.area.style.top);

},

