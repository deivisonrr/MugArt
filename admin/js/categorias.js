(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let supabase = null;
  let categories = [];
  let editingId = null;
  let editingLevel = null;

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
    return window.mugartSupabase || window.supabaseClient || window.supabase || null;
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }

  function setStatus(message, type="") {
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

  function populateTypeSelect(select, selected="") {
    const list = roots().sort((a,b) => a.name.localeCompare(b.name,"pt-BR"));
    select.innerHTML =
      '<option value="">Selecione o tipo</option>' +
      list.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    select.value = selected ? String(selected) : "";
  }

  function populateCategorySelect(selected="") {
    const typeId = els.subcategoryTypeSelect.value;
    const list = typeId
      ? childrenOf(typeId).sort((a,b) => a.name.localeCompare(b.name,"pt-BR"))
      : [];

    els.subcategoryCategorySelect.innerHTML =
      '<option value="">Selecione a categoria</option>' +
      list.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");

    els.subcategoryCategorySelect.disabled = !typeId;
    els.subcategoryName.disabled = !typeId;
    els.saveSubcategoryBtn.disabled = !typeId;

    if (selected) els.subcategoryCategorySelect.value = String(selected);
  }

  function updateCategoryForm(selectedType="") {
    populateTypeSelect(els.categoryTypeSelect, selectedType);
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

    populateTypeSelect(els.categoryTypeSelect);
    populateTypeSelect(els.subcategoryTypeSelect);

    els.categoryName.disabled = true;
    els.saveCategoryBtn.disabled = true;

    els.subcategoryCategorySelect.innerHTML = '<option value="">Selecione a categoria</option>';
    els.subcategoryCategorySelect.disabled = true;
    els.subcategoryName.disabled = true;
    els.saveSubcategoryBtn.disabled = true;

    els.saveTypeBtn.textContent = "Adicionar tipo";
    els.saveCategoryBtn.textContent = "Adicionar categoria";
    els.saveSubcategoryBtn.textContent = "Adicionar subcategoria";
  }

  async function loadCategories() {
    setStatus("Carregando estrutura...");
    const {data,error} = await supabase
      .from("categories")
      .select("id,name,slug,parent_id")
      .order("name",{ascending:true});

    if(error){
      console.error(error);
      setStatus("Erro ao carregar categorias: " + error.message,"error");
      return;
    }

    categories = data || [];
    resetForm();
    renderTree();
    setStatus(`${categories.length} item(ns) cadastrado(s).`,"ok");
  }

  async function saveType() {
    const name = els.typeName.value.trim();
    if(!name) return setStatus("Informe o nome do tipo de produto.","error");

    if(editingId && editingLevel === 1) {
      await updateItem(editingId, {name,slug:slugify(name),parent_id:null}, "tipo");
      return;
    }

    const duplicate = categories.find(c => !c.parent_id && c.name.toLowerCase() === name.toLowerCase());
    if(duplicate) return setStatus("Esse tipo de produto já existe.","error");

    const {error} = await supabase.from("categories").insert({
      name, slug:slugify(name), parent_id:null
    });

    if(error) return setStatus("Erro ao adicionar tipo: " + error.message,"error");

    await loadCategories();
    setStatus(`Tipo "${name}" adicionado com sucesso.`,"ok");
  }

  async function saveCategory() {
    const parentId = els.categoryTypeSelect.value;
    const name = els.categoryName.value.trim();

    if(!parentId) return setStatus("Selecione o tipo de produto.","error");
    if(!name) return setStatus("Informe o nome da categoria.","error");

    if(editingId && editingLevel === 2) {
      await updateItem(editingId,{name,slug:slugify(name),parent_id:parentId},"categoria");
      return;
    }

    const duplicate = categories.find(c =>
      String(c.parent_id) === String(parentId) &&
      c.name.toLowerCase() === name.toLowerCase()
    );
    if(duplicate) return setStatus("Essa categoria já existe dentro desse tipo.","error");

    const {error} = await supabase.from("categories").insert({
      name, slug:slugify(name), parent_id:parentId
    });

    if(error) return setStatus("Erro ao adicionar categoria: " + error.message,"error");

    await loadCategories();
    setStatus(`Categoria "${name}" adicionada com sucesso.`,"ok");
  }

  async function saveSubcategory() {
    const parentId = els.subcategoryCategorySelect.value;
    const name = els.subcategoryName.value.trim();

    if(!els.subcategoryTypeSelect.value) return setStatus("Selecione o tipo de produto.","error");
    if(!parentId) return setStatus("Selecione a categoria.","error");
    if(!name) return setStatus("Informe o nome da subcategoria.","error");

    if(editingId && editingLevel === 3) {
      await updateItem(editingId,{name,slug:slugify(name),parent_id:parentId},"subcategoria");
      return;
    }

    const duplicate = categories.find(c =>
      String(c.parent_id) === String(parentId) &&
      c.name.toLowerCase() === name.toLowerCase()
    );
    if(duplicate) return setStatus("Essa subcategoria já existe dentro dessa categoria.","error");

    const {error} = await supabase.from("categories").insert({
      name, slug:slugify(name), parent_id:parentId
    });

    if(error) return setStatus("Erro ao adicionar subcategoria: " + error.message,"error");

    await loadCategories();
    setStatus(`Subcategoria "${name}" adicionada com sucesso.`,"ok");
  }

  async function updateItem(id,payload,label) {
    setStatus("Salvando alteração...");
    const {error} = await supabase.from("categories").update(payload).eq("id",id);

    if(error) {
      console.error(error);
      setStatus(`Erro ao atualizar ${label}: ${error.message}`,"error");
      return;
    }

    await loadCategories();
    setStatus(`${label.charAt(0).toUpperCase()+label.slice(1)} atualizado com sucesso.`,"ok");
  }

  async function editCategory(id) {
    const item = findCategory(id);
    if(!item) return;

    editingId = item.id;
    editingLevel = !item.parent_id ? 1 : (findCategory(item.parent_id)?.parent_id ? 3 : 2);

    const parent = item.parent_id ? findCategory(item.parent_id) : null;
    const grandparent = parent?.parent_id ? findCategory(parent.parent_id) : null;

    els.formTitle.textContent = `Editando: ${item.name}`;
    els.modeText.textContent = `Editar ${editingLevel===1?"tipo":editingLevel===2?"categoria":"subcategoria"}`;
    els.deleteBtn.disabled = false;

    if(editingLevel === 1) {
      els.typeName.value = item.name;
      els.saveTypeBtn.textContent = "Atualizar tipo";
    } else if(editingLevel === 2) {
      updateCategoryForm(parent.id);
      els.categoryName.value = item.name;
      els.saveCategoryBtn.textContent = "Atualizar categoria";
    } else {
      populateTypeSelect(els.subcategoryTypeSelect, grandparent.id);
      populateCategorySelect(parent.id);
      els.subcategoryName.value = item.name;
      els.saveSubcategoryBtn.textContent = "Atualizar subcategoria";
    }

    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function deleteSelected() {
    if(!editingId) return;

    const item = findCategory(editingId);
    if(!item) return;

    const children = childrenOf(item.id).length;
    if(children) return setStatus("Não é possível excluir: este item possui itens abaixo dele.","error");

    const {count,error:productError} = await supabase
      .from("products").select("id",{count:"exact",head:true}).eq("category_id",item.id);

    if(productError) return setStatus("Não foi possível verificar produtos vinculados: " + productError.message,"error");
    if((count||0)>0) return setStatus("Não é possível excluir: existem produtos vinculados a este item.","error");

    if(!confirm(`Excluir "${item.name}"?`)) return;

    const {error} = await supabase.from("categories").delete().eq("id",item.id);
    if(error) return setStatus("Erro ao excluir: " + error.message,"error");

    await loadCategories();
    setStatus("Item excluído com sucesso.","ok");
  }

  function renderTree() {
    const term = els.search.value.trim().toLowerCase();
    const html = [];

    for(const type of roots().sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"))) {
      const cats = childrenOf(type.id).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));

      let typeShown = false;

      for(const cat of cats) {
        const subs = childrenOf(cat.id).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
        const catPath = `${type.name} / ${cat.name}`;
        const catMatch = !term || catPath.toLowerCase().includes(term);

        if(catMatch) {
          html.push(`
            <div class="tree-row level2">
              <div class="row-main">
                <div class="path"><span class="badge">CAT</span>${esc(catPath)}</div>
                <div class="row-actions"><button class="secondary" data-edit="${esc(cat.id)}">Editar</button></div>
              </div>
            </div>`);
          typeShown = true;
        }

        for(const sub of subs) {
          const path = `${type.name} / ${cat.name} / ${sub.name}`;
          if(term && !path.toLowerCase().includes(term)) continue;

          html.push(`
            <div class="tree-row level3">
              <div class="row-main">
                <div class="path"><span class="badge">SUB</span>${esc(path)}</div>
                <div class="row-actions"><button class="secondary" data-edit="${esc(sub.id)}">Editar</button></div>
              </div>
            </div>`);
          typeShown = true;
        }
      }

      if(!term || type.name.toLowerCase().includes(term) || typeShown) {
        html.unshift(`
          <div class="tree-row level1">
            <div class="row-main">
              <div class="path"><span class="badge">TIPO</span>${esc(type.name)}</div>
              <div class="row-actions"><button class="secondary" data-edit="${esc(type.id)}">Editar</button></div>
            </div>
          </div>`);
      }
    }

    els.tree.innerHTML = html.length ? html.join("") : '<div class="empty">Nenhum item encontrado.</div>';

    els.tree.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => editCategory(btn.dataset.edit));
    });
  }

  els.categoryTypeSelect.addEventListener("change", () => {
    const enabled = !!els.categoryTypeSelect.value;
    els.categoryName.disabled = !enabled;
    els.saveCategoryBtn.disabled = !enabled;
  });

  els.subcategoryTypeSelect.addEventListener("change", () => {
    populateCategorySelect();
    if(!editingId) els.subcategoryName.value = "";
  });

  els.subcategoryCategorySelect.addEventListener("change", () => {
    const enabled = !!els.subcategoryCategorySelect.value;
    els.subcategoryName.disabled = !enabled;
    els.saveSubcategoryBtn.disabled = !enabled;
  });

  els.saveTypeBtn.addEventListener("click",saveType);
  els.saveCategoryBtn.addEventListener("click",saveCategory);
  els.saveSubcategoryBtn.addEventListener("click",saveSubcategory);
  els.newBtn.addEventListener("click",resetForm);
  els.deleteBtn.addEventListener("click",deleteSelected);
  els.search.addEventListener("input",renderTree);

  async function init() {
    supabase = getClient();

    if(!supabase) {
      setStatus("Supabase não foi inicializado. Verifique /js/supabase-config.js.","error");
      return;
    }

    await loadCategories();
  }

  init();
})();
