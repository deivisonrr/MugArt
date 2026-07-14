/* ==========================================================
   MugArt Admin - Galeria de imagens do produto
   Tabela: product_images
   Bucket: product-images
========================================================== */

(function () {
  "use strict";

  var BUCKET = "product-images";
  var state = {
    productId: null,
    images: [],
    loading: false
  };

  function el(selector) {
    return document.querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function slugify(value) {
    return String(value || "produto")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function setLoading(value) {
    state.loading = value;
    el("#productImagesLoading")?.classList.toggle("hidden", !value);
    el("#productImagesList")?.classList.toggle("hidden", value);

    var button = el("#uploadProductImagesButton");
    if (button) {
      button.disabled = value;
      button.textContent = value ? "Enviando..." : "Enviar fotos";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    el("#uploadProductImagesButton")?.addEventListener("click", uploadSelectedImages);
  });

  window.initializeProductImages = async function (productId) {
    state.productId = productId ? String(productId) : null;

    var noProduct = el("#productImagesNoProduct");
    var manager = el("#productImagesManager");

    if (!state.productId) {
      state.images = [];
      noProduct?.classList.remove("hidden");
      manager?.classList.add("hidden");
      renderImages();
      return;
    }

    noProduct?.classList.add("hidden");
    manager?.classList.remove("hidden");
    await loadImages();
  };

  async function loadImages() {
    if (!state.productId || !window.mugartSupabase) return;

    setLoading(true);

    var result = await window.mugartSupabase
      .from("product_images")
      .select("id, product_id, image_url, sort_order, is_main, media_type, thumbnail_url, created_at")
      .eq("product_id", state.productId)
      .order("is_main", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    setLoading(false);

    if (result.error) {
      console.error(result.error);
      alert("Erro ao carregar imagens: " + result.error.message);
      return;
    }

    state.images = result.data || [];
    renderImages();
  }

  function renderImages() {
    var list = el("#productImagesList");
    var empty = el("#productImagesEmpty");
    var count = el("#productImagesCount");

    if (!list) return;

    if (count) {
      count.textContent =
        state.images.length +
        " mídia" +
        (state.images.length === 1 ? "" : "s");
    }

    if (!state.images.length) {
      list.innerHTML = "";
      empty?.classList.remove("hidden");
      return;
    }

    empty?.classList.add("hidden");

    list.innerHTML = state.images.map(function (image) {
      return (
        '<article class="product-image-card">' +
          '<div class="product-image-card-preview">' +
            (image.media_type === "video"
              ? '<video src="' + escapeHtml(image.image_url) + '" controls muted playsinline preload="metadata"></video>'
              : '<img src="' + escapeHtml(image.image_url) + '" alt="Imagem do produto">') +
            '<span class="product-media-type-badge">' +
              (image.media_type === "video" ? "Vídeo" : "Imagem") +
            '</span>' +
            (image.is_main
              ? '<span class="product-image-main-badge">Principal</span>'
              : '') +
          '</div>' +

          '<div class="product-image-card-info">' +
            '<label>Ordem' +
              '<input type="number" min="1" step="1" value="' +
                Number(image.sort_order || 1) +
              '" data-image-order="' + image.id + '">' +
            '</label>' +

            '<div class="product-image-card-actions">' +
              (!image.is_main
                ? '<button type="button" data-image-action="main" data-id="' +
                    image.id +
                  '">Definir principal</button>'
                : '') +

              '<button type="button" class="danger" data-image-action="delete" data-id="' +
                image.id +
              '">Excluir</button>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join("");

    list.querySelectorAll("[data-image-order]").forEach(function (input) {
      input.addEventListener("change", function () {
        updateImageOrder(input.dataset.imageOrder, input.value);
      });
    });

    list.querySelectorAll("[data-image-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        var action = button.dataset.imageAction;
        var id = button.dataset.id;

        if (action === "main") setMainImage(id);
        if (action === "delete") deleteImage(id);
      });
    });
  }

  async function uploadSelectedImages() {
    if (!state.productId) {
      alert("Salve o produto primeiro.");
      return;
    }

    var input = el("#productImagesFiles");
    var files = Array.from(input?.files || []);

    if (!files.length) {
      alert("Selecione pelo menos uma imagem.");
      return;
    }

    var allowed = ["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm"];
    var invalid = files.find(function (file) {
      var maxSize = file.type.startsWith("video/") ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
      return !allowed.includes(file.type) || file.size > maxSize;
    });

    if (invalid) {
      alert("Use PNG, JPG ou WEBP com até 5MB, ou MP4/WEBM com até 25MB.");
      return;
    }

    setLoading(true);

    try {
      var productName =
        document.querySelector("#productName")?.value.trim() ||
        "produto";

      var nextOrder = state.images.reduce(function (max, image) {
        return Math.max(max, Number(image.sort_order || 0));
      }, 0) + 1;

      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var extension = file.name.split(".").pop().toLowerCase();
        var fileName =
          slugify(productName) +
          "-" +
          Date.now() +
          "-" +
          i +
          "." +
          extension;

        var filePath =
          "galeria/" +
          state.productId +
          "/" +
          fileName;

        var upload = await window.mugartSupabase.storage
          .from(BUCKET)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false
          });

        if (upload.error) {
          throw upload.error;
        }

        var publicUrl = window.mugartSupabase.storage
          .from(BUCKET)
          .getPublicUrl(filePath).data.publicUrl;

        var insert = await window.mugartSupabase
          .from("product_images")
          .insert({
            product_id: state.productId,
            image_url: publicUrl,
            sort_order: nextOrder + i,
            is_main: state.images.length === 0 && i === 0,
            media_type: file.type.startsWith("video/") ? "video" : "image",
            thumbnail_url: null
          });

        if (insert.error) {
          throw insert.error;
        }
      }

      input.value = "";
      await loadImages();
      alert("Mídias enviadas com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar mídias: " + (error.message || "Erro desconhecido."));
    } finally {
      setLoading(false);
    }
  }

  async function setMainImage(id) {
    if (!confirm("Definir esta imagem como principal?")) return;

    var reset = await window.mugartSupabase
      .from("product_images")
      .update({ is_main: false })
      .eq("product_id", state.productId);

    if (reset.error) {
      alert("Erro ao atualizar imagem principal: " + reset.error.message);
      return;
    }

    var update = await window.mugartSupabase
      .from("product_images")
      .update({ is_main: true, sort_order: 1 })
      .eq("id", id)
      .eq("product_id", state.productId);

    if (update.error) {
      alert("Erro ao definir imagem principal: " + update.error.message);
      return;
    }

    await loadImages();
  }

  async function updateImageOrder(id, value) {
    var order = Math.max(1, Number(value || 1));

    var result = await window.mugartSupabase
      .from("product_images")
      .update({ sort_order: order })
      .eq("id", id)
      .eq("product_id", state.productId);

    if (result.error) {
      alert("Erro ao alterar ordem: " + result.error.message);
      return;
    }

    await loadImages();
  }

  async function deleteImage(id) {
    if (!confirm("Deseja excluir esta mídia da galeria?")) return;

    var result = await window.mugartSupabase
      .from("product_images")
      .delete()
      .eq("id", id)
      .eq("product_id", state.productId);

    if (result.error) {
      alert("Erro ao excluir mídia: " + result.error.message);
      return;
    }

    await loadImages();
  }
})();
