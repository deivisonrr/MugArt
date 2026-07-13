(function () {
  "use strict";

  var WHATSAPP_NUMBER = "5511988849236";
  var STORAGE_BUCKET = "customer-artworks";
  var MAX_FILE_SIZE = 10 * 1024 * 1024;

  var selectedArtworkFile = null;
  var uploadedArtworkUrl = "";
  var sending = false;

  function el(id) {
    return document.getElementById(id);
  }

  function safeFileName(value) {
    return String(value || "arte")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function selectedModel() {
    var text = el("selectedModelText");
    if (text && text.textContent.trim()) return text.textContent.trim();

    var card = document.querySelector(".model-card.active");
    if (!card) return "Não informado";

    return (
      card.dataset.modelo ||
      (card.querySelector("h3") ? card.querySelector("h3").textContent : "") ||
      "Não informado"
    ).trim();
  }

  function updateArtworkLabel(text) {
    var target = el("selectedArtText");
    if (target) target.textContent = text;
  }

  function validateFile(file) {
    if (!file) return "Selecione uma arte antes de enviar.";

    var allowed = ["image/png", "image/jpeg", "image/webp"];
    if (allowed.indexOf(file.type) < 0) {
      return "Use uma imagem PNG, JPG, JPEG ou WEBP.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "A imagem deve ter no máximo 10 MB.";
    }

    return "";
  }

  async function uploadArtwork(file) {
    if (!window.mugartSupabase) {
      throw new Error("Supabase não carregou na página.");
    }

    var extension = file.name.indexOf(".") >= 0
      ? file.name.split(".").pop().toLowerCase()
      : "png";

    var customerName = el("customerName") && el("customerName").value.trim()
      ? el("customerName").value.trim()
      : "cliente";

    var folder = new Date().toISOString().slice(0, 10);
    var fileName = safeFileName(customerName) + "-" + Date.now() + "." + extension;
    var path = folder + "/" + fileName;

    var uploadResult = await window.mugartSupabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadResult.error) throw uploadResult.error;

    var publicResult = window.mugartSupabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    var url = publicResult && publicResult.data
      ? publicResult.data.publicUrl
      : "";

    if (!url) throw new Error("Não foi possível gerar o link público da arte.");

    return url;
  }

  function buildMessage(url) {
    var name = el("customerName") && el("customerName").value.trim()
      ? el("customerName").value.trim()
      : "Não informado";

    var note = el("customerNote") && el("customerNote").value.trim()
      ? el("customerNote").value.trim()
      : "Nenhuma observação";

    return [
      "Olá! Vim pelo site da MugArt e gostaria de solicitar um orçamento.",
      "",
      "Nome: " + name,
      "Modelo: " + selectedModel(),
      "Observações: " + note,
      "",
      "Arte enviada:",
      url,
      "",
      "Gostaria de continuar o atendimento pelo WhatsApp."
    ].join("\n");
  }

  async function sendOrder(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (sending) return;

    var input = el("artInput");
    var file = selectedArtworkFile || (input && input.files ? input.files[0] : null);
    var errorMessage = validateFile(file);

    if (errorMessage) {
      window.alert(errorMessage);
      return;
    }

    sending = true;

    var button = el("sendWhatsapp");
    var oldText = button ? button.textContent : "";

    if (button) {
      button.disabled = true;
      button.textContent = "Enviando arte...";
    }

    try {
      if (!uploadedArtworkUrl) {
        uploadedArtworkUrl = await uploadArtwork(file);
      }

      updateArtworkLabel("Arte enviada");

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "pedido_whatsapp",
        mug_model: selectedModel(),
        artwork_uploaded: true,
        artwork_url: uploadedArtworkUrl
      });

      window.open(
        "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(buildMessage(uploadedArtworkUrl)),
        "_blank"
      );
    } catch (error) {
      console.error("[MugArt] Erro no upload da arte:", error);
      window.alert(
        "Não foi possível enviar a arte. " +
        (error && error.message ? error.message : "Tente novamente.")
      );
    } finally {
      sending = false;
      if (button) {
        button.disabled = false;
        button.textContent = oldText || "☘ Solicitar orçamento";
      }
    }
  }

  function fileChanged(event) {
    var file = event.target.files && event.target.files[0]
      ? event.target.files[0]
      : null;

    selectedArtworkFile = file;
    uploadedArtworkUrl = "";

    if (!file) {
      updateArtworkLabel("Nenhuma");
      return;
    }

    var errorMessage = validateFile(file);
    if (errorMessage) {
      event.target.value = "";
      selectedArtworkFile = null;
      updateArtworkLabel("Nenhuma");
      window.alert(errorMessage);
      return;
    }

    updateArtworkLabel(file.name);
  }

  function clearArtwork() {
    selectedArtworkFile = null;
    uploadedArtworkUrl = "";

    var input = el("artInput");
    if (input) input.value = "";

    updateArtworkLabel("Nenhuma");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var input = el("artInput");
    var sendButton = el("sendWhatsapp");
    var clearButton = el("clearArt");

    if (input) input.addEventListener("change", fileChanged);
    if (sendButton) sendButton.addEventListener("click", sendOrder, true);
    if (clearButton) clearButton.addEventListener("click", clearArtwork);
  });
})();
