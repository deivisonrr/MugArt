(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  let supabase = null;
  let categories = [];
  let editingId = null;
  let editingLevel = null;

  const els = {
    typeSelect: $("typeSelect"),
    typeName: $("typeName"),
    categorySelect: $("categorySelect"),
    categoryName: $("categoryName"),
    subcategorySelect: $("subcategorySelect"),
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

  function setStatus(message, type = "") {
    els.status.textContent = message;
    els.status.className = "status" + (type ? " " + type : "");
  }

  function roots() {
    return categories.filter(c => !c.parent_id);
  }

  function childrenOf(parentId) {
    return categories.filter(c => String(c.parent_id) === String(parentId));
  }

  function findCategory(id) {
    return categories.find(c => String(c.id) === String(id)) || null;
  }

  function resetForm() {
    editingId = null;
    editingLevel = null;

    els.formTitle.textContent = "Cadastrar estrutura";
    els.modeText.textContent = "Novo cadastro";
    els.deleteBtn.disabled = true;

    els.typeSelect.value = "";
    els.typeName.value = "";

    els.categorySelect.innerHTML = '<option value="">+ Nova categoria</option>';
    els.categorySelect.disabled = true;
    els.categoryName.value = "";
    els.categoryName.disabled = true;
    els.saveCategoryBtn.disabled = true;

    els.subcategorySelect.innerHTML = '<option value="">+ Nova subcategoria</option>';
    els.subcategorySelect.disabled = true;
    els.subcategoryName.value = "";
    els.subcategoryName.disabled = true;
    els.saveSubcategoryBtn.disabled = true;

    els.saveTypeBtn.textContent = "Salvar tipo";
    els.saveCategoryBtn.textContent = "Salvar categoria";
    els.saveSubcategoryBtn.textContent = "Salvar subcategoria";

    populateTypes();
  }

  function populateTypes(selectedId = "") {
    const list = roots().sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));
    els.typeSelect.innerHTML =
      '<option value="">+ Novo tipo</option>' +
      list.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");

    els.typeSelect.value = selectedId ? String(selectedId) : "";
    updateCategoryLevel();
  }

  function updateCategoryLevel(selectedId = "") {
    const typeId = els.typeSelect.value;
    const list = typeId ? childrenOf(typeId).sort((a,b) => a.name.localeCompare(b.name, "pt-BR")) : [];

    els.categorySelect.innerHTML =
      '<option value="">+ Nova categoria</option>' +
      list.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");

    els.categorySelect.disabled = !typeId;
    els.categoryName.disabled = !typeId;
    els.saveCategoryBtn.disabled = !typeId;

    if (selectedId) {
      els.categorySelect.value = String(selectedId);
    } else {
      els.categorySelect.value = "";
      els.categoryName.value = "";
    }

    updateSubcategoryLevel();
  }

  function updateSubcategoryLevel(selectedId = "") {
    const categoryId = els.categorySelect.value;
    const list = categoryId ? childrenOf(categoryId).sort((a,b) => a.name.localeCompare(b.name, "pt-BR")) : [];

    els.subcategorySelect.innerHTML =
      '<option value="">+ Nova subcategoria</option>' +
      list.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");

    els.subcategorySelect.disabled = !categoryId;
    els.subcategoryName.disabled = !categoryId;
    els.saveSubcategoryBtn.disabled = !categoryId;

    if (selectedId) {
      els.subcategorySelect.value = String(selectedId);
    } else {
      els.subcategorySelect.value = "";
      els.subcategoryName.value = "";
    }
  }

  function loadSelectedNames() {
    const type = findCategory(els.typeSelect.value);
    const category = findCategory(els.categorySelect.value);
    const subcategory = findCategory(els.subcategorySelect.value);

    if (type && !editingId) els.typeName.value = type.name;
    if (category && !editingId) els.categoryName.value = category.name;
    if (subcategory && !editingId) els.subcategoryName.value = subcategory.name;

    if (editingId) {
      if (editingLevel === 1 && type) els.typeName.value = type.name;
      if (editingLevel === 2 && category) els.categoryName.value = category.name;
      if (editingLevel === 3 && subcategory) els.subcategoryName.value = subcategory.name;
    }
  }

  function editCategory(id) {
    const item = findCategory(id);
    if (!item) return;

    editingId = item.id;
    editingLevel = !item.parent_id ? 1 : (findCategory(item.parent_id)?.parent_id ? 3 : 2);

    const parent = item.parent_id ? findCategory(item.parent_id) : null;
    const grandparent = parent?.parent_id ? findCategory(parent.parent_id) : null;

    els.formTitle.textContent = `Editando: ${item.name}`;
    els.modeText.textContent = `Editar ${editingLevel === 1 ? "tipo" : editingLevel === 2 ? "categoria" : "subcategoria"}`;
    els.deleteBtn.disabled = false;

    if (editingLevel === 1) {
      els.typeSelect.value = String(item.id);
      els.typeName.value = item.name;
      updateCategoryLevel();
      els.saveTypeBtn.textContent = "Atualizar tipo";
      els.categoryName.value = "";
      els.subcategoryName.value = "";
    } else if (editingLevel === 2) {
      els.typeSelect.value = String(parent.id);
      updateCategoryLevel(item.id);
      els.categoryName.value = item.name;
      els.saveCategoryBtn.textContent = "Atualizar categoria";
      els.subcategoryName.value = "";
    } else {
      els.typeSelect.value = String(grandparent.id);
      updateCategoryLevel(parent.id);
      updateSubcategoryLevel(item.id);
      els.subcategoryName.value = item.name;
      els.saveSubcategoryBtn.textContent = "Atualizar subcategoria";
    }

    window.scrollTo({top: 0, behavior: "smooth"});
  }

  async function loadCategories() {
    setStatus("Carregando categorias...");
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,parent_id")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      setStatus("Erro ao carregar categorias: " + error.message, "error");
      return;
    }

    categories = data || [];
    resetForm();
    renderTree();
    setStatus(`${categories.length} item(ns) encontrado(s).`, "ok");
  }

  async function saveItem(level) {
    let name = "";
    let parentId = null;
    let input = null;
    let label = "";

    if (level === 1) {
      name = els.typeName.value.trim();
      label = "tipo";
    } else if (level === 2) {
      parentId = els.typeSelect.value || null;
      name = els.categoryName.value.trim();
      input = els.categoryName;
      label = "categoria";
      if (!parentId) return setStatus("Selecione um tipo de produto para a categoria.", "error");
    } else {
      parentId = els.categorySelect.value || null;
      name = els.subcategoryName.value.trim();
      input = els.subcategoryName;
      label = "subcategoria";
      if (!parentId) return setStatus("Selecione uma categoria para a subcategoria.", "error");
    }

    if (!name) {
      setStatus(`Informe o nome do ${label}.`, "error");
      (input || (level === 1 ? els.typeName : els.subcategoryName)).focus();
      return;
    }

    const slug = slugify(name);

    // Evita duplicação dentro do mesmo pai.
    const duplicate = categories.find(c =>
      String(c.parent_id || "") === String(parentId || "") &&
      c.name.trim().toLowerCase() === name.toLowerCase() &&
      String(c.id) !== String(editingId || "")
    );

    if (duplicate) {
      setStatus(`Já existe um ${label} com esse nome nesse nível.`, "error");
      return;
    }

    const payload = { name, slug, parent_id: parentId };

    setStatus("Salvando...");

    let result;
    if (editingId && editingLevel === level) {
      result = await supabase
        .from("categories")
        .update(payload)
        .eq("id", editingId);
    } else {
      result = await supabase
        .from("categories")
        .insert(payload);
    }

    if (result.error) {
      console.error(result.error);
      setStatus(`Erro ao salvar ${label}: ${result.error.message}`, "error");
      return;
    }

    setStatus(`${label.charAt(0).toUpperCase() + label.slice(1)} salvo com sucesso.`, "ok");
    await loadCategories();
  }

  async function deleteSelected() {
    if (!editingId) return;

    const item = findCategory(editingId);
    if (!item) return;

    const childCount = categories.filter(c => String(c.parent_id) === String(item.id)).length;
    if (childCount > 0) {
      setStatus("Não é possível excluir: este item possui itens abaixo dele.", "error");
      return;
    }

    const { count, error: productError } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", item.id);

    if (productError) {
      console.error(productError);
      setStatus("Não foi possível verificar produtos vinculados: " + productError.message, "error");
      return;
    }

    if ((count || 0) > 0) {
      setStatus("Não é possível excluir: existem produtos vinculados a esta categoria.", "error");
      return;
    }

    if (!confirm(`Excluir "${item.name}"?`)) return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", item.id);

    if (error) {
      console.error(error);
      setStatus("Erro ao excluir: " + error.message, "error");
      return;
    }

    await loadCategories();
    setStatus("Item excluído com sucesso.", "ok");
  }

  function renderTree() {
    const term = els.search.value.trim().toLowerCase();
    const rootsList = roots().sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));
    const html = [];

    for (const type of rootsList) {
      const cats = childrenOf(type.id).sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));

      for (const cat of cats) {
        const subs = childrenOf(cat.id).sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));

        for (const sub of subs) {
          const path = `${type.name} / ${cat.name} / ${sub.name}`;
          if (term && !path.toLowerCase().includes(term)) continue;

          html.push(`
            <div class="tree-row level3">
              <div class="row-main">
                <div class="path"><span class="badge">SUB</span>${escapeHtml(path)}</div>
                <div class="row-actions">
                  <button class="secondary" data-edit="${escapeHtml(sub.id)}">Editar</button>
                </div>
              </div>
            </div>
          `);
        }

        const catPath = `${type.name} / ${cat.name}`;
        if (!term || catPath.toLowerCase().includes(term) || subs.some(s => `${type.name} / ${cat.name} / ${s.name}`.toLowerCase().includes(term))) {
          html.push(`
            <div class="tree-row level2">
              <div class="row-main">
                <div class="path"><span class="badge">CAT</span>${escapeHtml(catPath)}</div>
                <div class="row-actions">
                  <button class="secondary" data-edit="${escapeHtml(cat.id)}">Editar</button>
                </div>
              </div>
            </div>
          `);
        }
      }

      if (!term || type.name.toLowerCase().includes(term) || cats.some(c => {
        if (c.name.toLowerCase().includes(term)) return true;
        return childrenOf(c.id).some(s => s.name.toLowerCase().includes(term));
      })) {
        html.push(`
          <div class="tree-row level1">
            <div class="row-main">
              <div class="path"><span class="badge">TIPO</span>${escapeHtml(type.name)}</div>
              <div class="row-actions">
                <button class="secondary" data-edit="${escapeHtml(type.id)}">Editar</button>
              </div>
            </div>
          </div>
        `);
      }
    }

    els.tree.innerHTML = html.length ? html.join("") : '<div class="empty">Nenhum item encontrado.</div>';

    els.tree.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => editCategory(btn.dataset.edit));
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  els.typeSelect.addEventListener("change", () => {
    // Ao escolher um tipo existente, ele serve como pai para os próximos níveis.
    if (!editingId) {
      els.typeName.value = findCategory(els.typeSelect.value)?.name || "";
    }
    updateCategoryLevel();
  });

  els.categorySelect.addEventListener("change", () => {
    if (!editingId) {
      els.categoryName.value = findCategory(els.categorySelect.value)?.name || "";
    }
    updateSubcategoryLevel();
  });

  els.subcategorySelect.addEventListener("change", () => {
    if (!editingId) {
      els.subcategoryName.value = findCategory(els.subcategorySelect.value)?.name || "";
    }
  });

  els.saveTypeBtn.addEventListener("click", () => saveItem(1));
  els.saveCategoryBtn.addEventListener("click", () => saveItem(2));
  els.saveSubcategoryBtn.addEventListener("click", () => saveItem(3));
  els.newBtn.addEventListener("click", resetForm);
  els.deleteBtn.addEventListener("click", deleteSelected);
  els.search.addEventListener("input", renderTree);

  async function init() {
    supabase = getClient();

    if (!supabase) {
      setStatus("Supabase não foi inicializado. Verifique /js/supabase-config.js.", "error");
      return;
    }

    await loadCategories();
  }

  init();
})();
