(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  let supabase = null;
  let categories = [];
  let editingId = null;
  let editingLevel = null;

  /*
   * Guarda quais tipos e categorias estão expandidos.
   *
   * expandedTypes:
   *   guarda os IDs dos tipos abertos.
   *
   * expandedCategories:
   *   guarda os IDs das categorias abertas.
   */
  const expandedTypes = new Set();
  const expandedCategories = new Set();

  const els = {
    typeName: $("typeName"),
    categoryTypeSelect: $("categoryTypeSelect"),
    categoryName: $("categoryName"),
    subcategoryTypeSelect: $("subcategoryTypeSelect"),
    subcategoryCategorySelect: $("subcategoryCategorySelect"),
    subcategoryName: $("subcategoryName"),
    saveTypeBtn: $("saveTypeBtn"),
    saveCategoryBtn: $("saveCategoryBtn"),
    saveSubcategoryBtn: $("saveSubcategoryBtn"),
    newBtn: $("newBtn"),
    deleteBtn: $("deleteBtn"),
    status: $("status"),
    tree: $("tree"),
    search: $("search"),
    formTitle: $("formTitle"),
    modeText: $("modeText")
  };


  function getClient() {
    return window.mugartSupabase ||
           window.supabaseClient ||
           window.supabase ||
           null;
  }


  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }


  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function setStatus(message, type = "") {
    els.status.textContent = message;
    els.status.className = "status" + (type ? " " + type : "");
  }


  function roots() {
    return categories.filter(c => !c.parent_id);
  }


  function childrenOf(parentId) {
    return categories.filter(
      c => String(c.parent_id) === String(parentId)
    );
  }


  function findCategory(id) {
    return categories.find(
      c => String(c.id) === String(id)
    ) || null;
  }


  function populateTypeSelect(select, selected = "") {
    const list = roots().sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR")
    );

    select.innerHTML =
      '<option value="">Selecione o tipo</option>' +
      list.map(c =>
        `<option value="${esc(c.id)}">${esc(c.name)}</option>`
      ).join("");

    select.value = selected ? String(selected) : "";
  }


  function populateCategorySelect(selected = "") {
    const typeId = els.subcategoryTypeSelect.value;

    const list = typeId
      ? childrenOf(typeId).sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR")
        )
      : [];

    els.subcategoryCategorySelect.innerHTML =
      '<option value="">Selecione a categoria</option>' +
      list.map(c =>
        `<option value="${esc(c.id)}">${esc(c.name)}</option>`
      ).join("");

    els.subcategoryCategorySelect.disabled = !typeId;
    els.subcategoryName.disabled = !typeId;
    els.saveSubcategoryBtn.disabled = !typeId;

    if (selected) {
      els.subcategoryCategorySelect.value = String(selected);
    }
  }


  function updateCategoryForm(selectedType = "") {
    populateTypeSelect(
      els.categoryTypeSelect,
      selectedType
    );

    const enabled = !!els.categoryTypeSelect.value;

    els.categoryName.disabled = !enabled;
    els.saveCategoryBtn.disabled = !enabled;
  }


  function resetForm() {
    editingId = null;
    editingLevel = null;

    els.formTitle.textContent = "Cadastrar estrutura";
    els.modeText.textContent = "Novo cadastro";
    els.deleteBtn.disabled = true;

    els.typeName.value = "";
    els.categoryName.value = "";
    els.subcategoryName.value = "";

    populateTypeSelect(
      els.categoryTypeSelect
    );

    populateTypeSelect(
      els.subcategoryTypeSelect
    );

    els.categoryName.disabled = true;
    els.saveCategoryBtn.disabled = true;

    els.subcategoryCategorySelect.innerHTML =
      '<option value="">Selecione a categoria</option>';

    els.subcategoryCategorySelect.disabled = true;
    els.subcategoryName.disabled = true;
    els.saveSubcategoryBtn.disabled = true;

    els.saveTypeBtn.textContent = "Adicionar tipo";
    els.saveCategoryBtn.textContent = "Adicionar categoria";
    els.saveSubcategoryBtn.textContent = "Adicionar subcategoria";
  }


  async function loadCategories() {
    setStatus("Carregando estrutura...");

    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,parent_id")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);

      setStatus(
        "Erro ao carregar categorias: " + error.message,
        "error"
      );

      return;
    }

    categories = data || [];

    resetForm();

    renderTree();

    setStatus(
      `${categories.length} item(ns) cadastrado(s).`,
      "ok"
    );
  }


  async function saveType() {
    const name = els.typeName.value.trim();

    if (!name) {
      return setStatus(
        "Informe o nome do tipo de produto.",
        "error"
      );
    }

    if (editingId && editingLevel === 1) {
      await updateItem(
        editingId,
        {
          name,
          slug: slugify(name),
          parent_id: null
        },
        "tipo"
      );

      return;
    }

    const duplicate = categories.find(
      c =>
        !c.parent_id &&
        c.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      return setStatus(
        "Esse tipo de produto já existe.",
        "error"
      );
    }

    const { error } = await supabase
      .from("categories")
      .insert({
        name,
        slug: slugify(name),
        parent_id: null
      });

    if (error) {
      return setStatus(
        "Erro ao adicionar tipo: " + error.message,
        "error"
      );
    }

    await loadCategories();

    setStatus(
      `Tipo "${name}" adicionado com sucesso.`,
      "ok"
    );
  }


  async function saveCategory() {
    const parentId = els.categoryTypeSelect.value;
    const name = els.categoryName.value.trim();

    if (!parentId) {
      return setStatus(
        "Selecione o tipo de produto.",
        "error"
      );
    }

    if (!name) {
      return setStatus(
        "Informe o nome da categoria.",
        "error"
      );
    }

    if (editingId && editingLevel === 2) {
      await updateItem(
        editingId,
        {
          name,
          slug: slugify(name),
          parent_id: parentId
        },
        "categoria"
      );

      return;
    }

    const duplicate = categories.find(
      c =>
        String(c.parent_id) === String(parentId) &&
        c.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      return setStatus(
        "Essa categoria já existe dentro desse tipo.",
        "error"
      );
    }

    const { error } = await supabase
      .from("categories")
      .insert({
        name,
        slug: slugify(name),
        parent_id: parentId
      });

    if (error) {
      return setStatus(
        "Erro ao adicionar categoria: " + error.message,
        "error"
      );
    }

    await loadCategories();

    setStatus(
      `Categoria "${name}" adicionada com sucesso.`,
      "ok"
    );
  }


  async function saveSubcategory() {
    const parentId = els.subcategoryCategorySelect.value;
    const name = els.subcategoryName.value.trim();

    if (!els.subcategoryTypeSelect.value) {
      return setStatus(
        "Selecione o tipo de produto.",
        "error"
      );
    }

    if (!parentId) {
      return setStatus(
        "Selecione a categoria.",
        "error"
      );
    }

    if (!name) {
      return setStatus(
        "Informe o nome da subcategoria.",
        "error"
      );
    }

    if (editingId && editingLevel === 3) {
      await updateItem(
        editingId,
        {
          name,
          slug: slugify(name),
          parent_id: parentId
        },
        "subcategoria"
      );

      return;
    }

    const duplicate = categories.find(
      c =>
        String(c.parent_id) === String(parentId) &&
        c.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      return setStatus(
        "Essa subcategoria já existe dentro dessa categoria.",
        "error"
      );
    }

    const { error } = await supabase
      .from("categories")
      .insert({
        name,
        slug: slugify(name),
        parent_id: parentId
      });

    if (error) {
      return setStatus(
        "Erro ao adicionar subcategoria: " + error.message,
        "error"
      );
    }

    await loadCategories();

    setStatus(
      `Subcategoria "${name}" adicionada com sucesso.`,
      "ok"
    );
  }


  async function updateItem(id, payload, label) {
    setStatus("Salvando alteração...");

    const { error } = await supabase
      .from("categories")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error(error);

      setStatus(
        `Erro ao atualizar ${label}: ${error.message}`,
        "error"
      );

      return;
    }

    await loadCategories();

    setStatus(
      `${label.charAt(0).toUpperCase() + label.slice(1)} atualizado com sucesso.`,
      "ok"
    );
  }


  async function editCategory(id) {
    const item = findCategory(id);

    if (!item) return;

    editingId = item.id;

    editingLevel =
      !item.parent_id
        ? 1
        : (
            findCategory(item.parent_id)?.parent_id
              ? 3
              : 2
          );

    const parent = item.parent_id
      ? findCategory(item.parent_id)
      : null;

    const grandparent = parent?.parent_id
      ? findCategory(parent.parent_id)
      : null;

    els.formTitle.textContent =
      `Editando: ${item.name}`;

    els.modeText.textContent =
      `Editar ${
        editingLevel === 1
          ? "tipo"
          : editingLevel === 2
            ? "categoria"
            : "subcategoria"
      }`;

    els.deleteBtn.disabled = false;

    if (editingLevel === 1) {

      els.typeName.value = item.name;

      els.saveTypeBtn.textContent =
        "Atualizar tipo";

    } else if (editingLevel === 2) {

      updateCategoryForm(parent.id);

      els.categoryName.value =
        item.name;

      els.saveCategoryBtn.textContent =
        "Atualizar categoria";

    } else {

      populateTypeSelect(
        els.subcategoryTypeSelect,
        grandparent.id
      );

      populateCategorySelect(
        parent.id
      );

      els.subcategoryName.value =
        item.name;

      els.saveSubcategoryBtn.textContent =
        "Atualizar subcategoria";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }


  async function deleteSelected() {
    if (!editingId) return;

    const item = findCategory(editingId);

    if (!item) return;

    const children =
      childrenOf(item.id).length;

    if (children) {
      return setStatus(
        "Não é possível excluir: este item possui itens abaixo dele.",
        "error"
      );
    }

    const {
      count,
      error: productError
    } = await supabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true
      })
      .eq("category_id", item.id);

    if (productError) {
      return setStatus(
        "Não foi possível verificar produtos vinculados: " +
        productError.message,
        "error"
      );
    }

    if ((count || 0) > 0) {
      return setStatus(
        "Não é possível excluir: existem produtos vinculados a este item.",
        "error"
      );
    }

    if (!confirm(`Excluir "${item.name}"?`)) {
      return;
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", item.id);

    if (error) {
      return setStatus(
        "Erro ao excluir: " + error.message,
        "error"
      );
    }

    /*
     * Se o item excluído estava aberto,
     * removemos do controle de expansão.
     */
    expandedTypes.delete(String(item.id));
    expandedCategories.delete(String(item.id));

    await loadCategories();

    setStatus(
      "Item excluído com sucesso.",
      "ok"
    );
  }


  /*
   * ============================================================
   * ÁRVORE EXPANSÍVEL
   * ============================================================
   *
   * Nível 1:
   *   Tipo
   *
   * Nível 2:
   *   Categoria
   *
   * Nível 3:
   *   Subcategoria
   *
   * O usuário pode abrir e fechar cada nível
   * independentemente.
   */
  function renderTree() {

    const term =
      els.search.value.trim().toLowerCase();

    const html = [];

    const sortedTypes =
      roots().sort((a, b) =>
        a.name.localeCompare(
          b.name,
          "pt-BR"
        )
      );


    for (const type of sortedTypes) {

      const cats =
        childrenOf(type.id).sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "pt-BR"
          )
        );


      /*
       * Verifica se o próprio tipo
       * corresponde à pesquisa.
       */
      let typeMatch =
        !term ||
        type.name
          .toLowerCase()
          .includes(term);


      /*
       * Guardamos somente as categorias
       * que possuem algum resultado.
       */
      const visibleCategories = [];


      for (const cat of cats) {

        const subs =
          childrenOf(cat.id).sort((a, b) =>
            a.name.localeCompare(
              b.name,
              "pt-BR"
            )
          );


        const catPath =
          `${type.name} / ${cat.name}`;


        const catMatches =
          !term ||
          catPath
            .toLowerCase()
            .includes(term);


        const visibleSubs =
          subs.filter(sub => {

            const path =
              `${type.name} / ${cat.name} / ${sub.name}`;

            return (
              !term ||
              path
                .toLowerCase()
                .includes(term)
            );
          });


        if (
          catMatches ||
          visibleSubs.length > 0
        ) {

          visibleCategories.push({
            cat,
            subs,
            visibleSubs,
            catMatches
          });

          typeMatch = true;
        }
      }


      /*
       * Se não houver nenhum resultado,
       * não mostra este tipo.
       */
      if (!typeMatch) {
        continue;
      }


      const hasChildren =
        cats.length > 0;


      /*
       * Durante uma pesquisa, expandimos
       * automaticamente os níveis que
       * possuem resultados.
       *
       * Sem pesquisa, respeitamos o
       * estado escolhido pelo usuário.
       */
      const typeExpanded =
        term
          ? visibleCategories.length > 0
          : expandedTypes.has(
              String(type.id)
            );


      /*
       * --------------------------------------------------------
       * TIPO
       * --------------------------------------------------------
       */
      html.push(`
        <div class="tree-row level1 ${typeExpanded ? "expanded" : ""}">

          <div class="row-main">

            <div
              class="tree-label"
              data-toggle-type="${esc(type.id)}"
            >

              ${
                hasChildren
                  ? `
                    <span class="tree-arrow">
                      ${typeExpanded ? "▼" : "▶"}
                    </span>
                  `
                  : `
                    <span class="tree-arrow empty-arrow">
                      •
                    </span>
                  `
              }

              <span class="badge">
                TIPO
              </span>

              <span class="path-name">
                ${esc(type.name)}
              </span>

            </div>


            <div class="row-actions">

              <button
                class="secondary"
                data-edit="${esc(type.id)}"
              >
                Editar
              </button>

            </div>

          </div>

        </div>
      `);


      /*
       * Se estiver fechado,
       * não renderizamos as categorias.
       */
      if (!typeExpanded) {
        continue;
      }


      /*
       * --------------------------------------------------------
       * CATEGORIAS
       * --------------------------------------------------------
       */
      for (const item of visibleCategories) {

        const cat =
          item.cat;

        const subs =
          item.subs;

        const visibleSubs =
          item.visibleSubs;


        const hasSubcategories =
          subs.length > 0;


        const catExpanded =
          term
            ? visibleSubs.length > 0
            : expandedCategories.has(
                String(cat.id)
              );


        html.push(`
          <div class="tree-row level2 ${catExpanded ? "expanded" : ""}">

            <div class="row-main">

              <div
                class="tree-label"
                data-toggle-category="${esc(cat.id)}"
              >

                ${
                  hasSubcategories
                    ? `
                      <span class="tree-arrow">
                        ${catExpanded ? "▼" : "▶"}
                      </span>
                    `
                    : `
                      <span class="tree-arrow empty-arrow">
                        •
                      </span>
                    `
                }

                <span class="badge">
                  CAT
                </span>

                <span class="path-name">
                  ${esc(cat.name)}
                </span>

              </div>


              <div class="row-actions">

                <button
                  class="secondary"
                  data-edit="${esc(cat.id)}"
                >
                  Editar
                </button>

              </div>

            </div>

          </div>
        `);


        /*
         * Se a categoria estiver fechada,
         * não mostra as subcategorias.
         */
        if (!catExpanded) {
          continue;
        }


        /*
         * Durante pesquisa mostramos
         * somente as subcategorias
         * correspondentes.
         */
        const subsToShow =
          term
            ? visibleSubs
            : subs;


        /*
         * ------------------------------------------------------
         * SUBCATEGORIAS
         * ------------------------------------------------------
         */
        for (const sub of subsToShow) {

          html.push(`
            <div class="tree-row level3">

              <div class="row-main">

                <div class="tree-label no-toggle">

                  <span class="tree-arrow empty-arrow">
                    •
                  </span>

                  <span class="badge">
                    SUB
                  </span>

                  <span class="path-name">
                    ${esc(sub.name)}
                  </span>

                </div>


                <div class="row-actions">

                  <button
                    class="secondary"
                    data-edit="${esc(sub.id)}"
                  >
                    Editar
                  </button>

                </div>

              </div>

            </div>
          `);
        }
      }
    }


    /*
     * Se não houver resultados.
     */
    els.tree.innerHTML =
      html.length
        ? html.join("")
        : '<div class="empty">Nenhum item encontrado.</div>';


    /*
     * ----------------------------------------------------------
     * BOTÕES EDITAR
     * ----------------------------------------------------------
     */
    els.tree
      .querySelectorAll("[data-edit]")
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => editCategory(
            btn.dataset.edit
          )
        );

      });


    /*
     * ----------------------------------------------------------
     * EXPANDIR / RECOLHER TIPO
     * ----------------------------------------------------------
     */
    els.tree
      .querySelectorAll("[data-toggle-type]")
      .forEach(el => {

        el.addEventListener(
          "click",
          () => {

            const id =
              String(
                el.dataset.toggleType
              );


            if (
              expandedTypes.has(id)
            ) {

              /*
               * Recolhe o tipo.
               */
              expandedTypes.delete(id);


              /*
               * Também recolhe todas
               * as categorias dele.
               */
              const cats =
                childrenOf(id);

              cats.forEach(cat => {

                expandedCategories.delete(
                  String(cat.id)
                );

              });

            } else {

              /*
               * Abre o tipo.
               */
              expandedTypes.add(id);

            }


            renderTree();

          }
        );

      });


    /*
     * ----------------------------------------------------------
     * EXPANDIR / RECOLHER CATEGORIA
     * ----------------------------------------------------------
     */
    els.tree
      .querySelectorAll("[data-toggle-category]")
      .forEach(el => {

        el.addEventListener(
          "click",
          () => {

            const id =
              String(
                el.dataset.toggleCategory
              );


            if (
              expandedCategories.has(id)
            ) {

              expandedCategories.delete(id);

            } else {

              expandedCategories.add(id);

            }


            renderTree();

          }
        );

      });

  }


  /*
   * ============================================================
   * EVENTOS DOS FORMULÁRIOS
   * ============================================================
   */

  els.categoryTypeSelect.addEventListener(
    "change",
    () => {

      const enabled =
        !!els.categoryTypeSelect.value;

      els.categoryName.disabled =
        !enabled;

      els.saveCategoryBtn.disabled =
        !enabled;
    }
  );


  els.subcategoryTypeSelect.addEventListener(
    "change",
    () => {

      populateCategorySelect();

      if (!editingId) {
        els.subcategoryName.value = "";
      }
    }
  );


  els.subcategoryCategorySelect.addEventListener(
    "change",
    () => {

      const enabled =
        !!els.subcategoryCategorySelect.value;

      els.subcategoryName.disabled =
        !enabled;

      els.saveSubcategoryBtn.disabled =
        !enabled;
    }
  );


  /*
   * Botões
   */
  els.saveTypeBtn.addEventListener(
    "click",
    saveType
  );

  els.saveCategoryBtn.addEventListener(
    "click",
    saveCategory
  );

  els.saveSubcategoryBtn.addEventListener(
    "click",
    saveSubcategory
  );

  els.newBtn.addEventListener(
    "click",
    resetForm
  );

  els.deleteBtn.addEventListener(
    "click",
    deleteSelected
  );


  /*
   * Pesquisa
   */
  els.search.addEventListener(
    "input",
    renderTree
  );


  /*
   * ============================================================
   * INICIALIZAÇÃO
   * ============================================================
   */
  async function init() {

    supabase = getClient();


    if (!supabase) {

      setStatus(
        "Supabase não foi inicializado. Verifique /js/supabase-config.js.",
        "error"
      );

      return;
    }


    await loadCategories();
  }


  init();

})();
