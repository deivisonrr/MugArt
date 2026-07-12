document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const STORAGE_KEY = "mugart_utm_history";
  const MAX_HISTORY_ITEMS = 50;

  const form = document.getElementById("utm-form");

  if (!form) {
    console.error("Formulário de UTM não encontrado.");
    return;
  }

  const urlInput = document.getElementById("utm-url");
  const sourceInput = document.getElementById("utm-source");
  const mediumInput = document.getElementById("utm-medium");
  const campaignInput = document.getElementById("utm-campaign");
  const contentInput = document.getElementById("utm-content");
  const termInput = document.getElementById("utm-term");

  const resultInput = document.getElementById("utm-result");
  const resultContainer = document.getElementById(
    "utm-result-container"
  );
  const emptyResult = document.getElementById("utm-empty-result");
  const feedback = document.getElementById("utm-feedback");

  const copyButton = document.getElementById("utm-copy-button");
  const openButton = document.getElementById("utm-open-button");
  const clearButton = document.getElementById("utm-clear-button");
  const clearHistoryButton = document.getElementById(
    "utm-clear-history-button"
  );

  const historyTable = document.getElementById("utm-history-table");
  const historyBody = document.getElementById("utm-history-body");
  const historyEmpty = document.getElementById("utm-history-empty");

  const presetButtons = document.querySelectorAll(".utm-preset");

  let currentGeneratedUrl = "";

  function normalizeValue(value) {
    return String(value || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_");
  }

  function normalizeBaseUrl(value) {
    let normalizedUrl = String(value || "").trim();

    if (!normalizedUrl) {
      throw new Error("Informe a URL de destino.");
    }

    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    let url;

    try {
      url = new URL(normalizedUrl);
    } catch (error) {
      throw new Error("Informe uma URL válida.");
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("A URL deve começar com http ou https.");
    }

    return url;
  }

  function removeInvalidState() {
    [
      urlInput,
      sourceInput,
      mediumInput,
      campaignInput
    ].forEach((input) => {
      input.classList.remove("is-invalid");
    });
  }

  function validateRequiredFields() {
    removeInvalidState();

    if (!urlInput.value.trim()) {
      urlInput.classList.add("is-invalid");
      urlInput.focus();
      throw new Error("Informe a URL de destino.");
    }

    if (!sourceInput.value.trim()) {
      sourceInput.classList.add("is-invalid");
      sourceInput.focus();
      throw new Error("Informe a origem da campanha.");
    }

    if (!mediumInput.value.trim()) {
      mediumInput.classList.add("is-invalid");
      mediumInput.focus();
      throw new Error("Informe a mídia da campanha.");
    }

    if (!campaignInput.value.trim()) {
      campaignInput.classList.add("is-invalid");
      campaignInput.focus();
      throw new Error("Informe o nome da campanha.");
    }
  }

  function generateUtmData() {
    validateRequiredFields();

    const url = normalizeBaseUrl(urlInput.value);

    const source = normalizeValue(sourceInput.value);
    const medium = normalizeValue(mediumInput.value);
    const campaign = normalizeValue(campaignInput.value);
    const content = normalizeValue(contentInput.value);
    const term = normalizeValue(termInput.value);

    if (!source || !medium || !campaign) {
      throw new Error(
        "Origem, mídia e campanha precisam conter valores válidos."
      );
    }

    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", medium);
    url.searchParams.set("utm_campaign", campaign);

    if (content) {
      url.searchParams.set("utm_content", content);
    } else {
      url.searchParams.delete("utm_content");
    }

    if (term) {
      url.searchParams.set("utm_term", term);
    } else {
      url.searchParams.delete("utm_term");
    }

    return {
      id: generateId(),
      url: url.toString(),
      destinationUrl: `${url.origin}${url.pathname}`,
      source,
      medium,
      campaign,
      content,
      term,
      createdAt: new Date().toISOString()
    };
  }

  function generateId() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;
  }

  function showResult(url) {
    currentGeneratedUrl = url;
    resultInput.value = url;

    resultContainer.classList.remove("hidden");
    emptyResult.classList.add("hidden");
  }

  function hideResult() {
    currentGeneratedUrl = "";
    resultInput.value = "";

    resultContainer.classList.add("hidden");
    emptyResult.classList.remove("hidden");
    feedback.textContent = "";
  }

  function showFeedback(message, type = "success") {
    feedback.textContent = message;

    feedback.style.color =
      type === "error"
        ? "#f87171"
        : "#4ade80";

    window.clearTimeout(showFeedback.timeoutId);

    showFeedback.timeoutId = window.setTimeout(() => {
      feedback.textContent = "";
    }, 3500);
  }

  function getHistory() {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);

      if (!savedHistory) {
        return [];
      }

      const parsedHistory = JSON.parse(savedHistory);

      return Array.isArray(parsedHistory)
        ? parsedHistory
        : [];
    } catch (error) {
      console.error(
        "Erro ao carregar histórico de UTM:",
        error
      );

      return [];
    }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(history)
      );
    } catch (error) {
      console.error(
        "Erro ao salvar histórico de UTM:",
        error
      );

      showFeedback(
        "Não foi possível salvar o histórico.",
        "error"
      );
    }
  }

  function addToHistory(data) {
    const history = getHistory();

    const duplicateIndex = history.findIndex(
      (item) => item.url === data.url
    );

    if (duplicateIndex >= 0) {
      history.splice(duplicateIndex, 1);
    }

    history.unshift(data);

    saveHistory(
      history.slice(0, MAX_HISTORY_ITEMS)
    );

    renderHistory();
  }

  function deleteHistoryItem(id) {
    const history = getHistory();

    const updatedHistory = history.filter(
      (item) => item.id !== id
    );

    saveHistory(updatedHistory);
    renderHistory();
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
      }).format(new Date(value));
    } catch (error) {
      return "-";
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderHistory() {
    const history = getHistory();

    historyBody.innerHTML = "";

    if (!history.length) {
      historyTable.classList.add("hidden");
      historyEmpty.classList.remove("hidden");
      return;
    }

    historyTable.classList.remove("hidden");
    historyEmpty.classList.add("hidden");

    history.forEach((item) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>
          ${escapeHtml(item.campaign)}
          <small class="utm-url-preview">
            ${escapeHtml(item.url)}
          </small>
        </td>

        <td>
          ${escapeHtml(item.source)}
        </td>

        <td>
          ${escapeHtml(item.medium)}
        </td>

        <td>
          ${escapeHtml(formatDate(item.createdAt))}
        </td>

        <td>
          <div class="utm-history-actions">
            <button
              type="button"
              class="utm-table-button"
              data-action="copy"
              data-id="${escapeHtml(item.id)}"
            >
              Copiar
            </button>

            <button
              type="button"
              class="utm-table-button"
              data-action="open"
              data-id="${escapeHtml(item.id)}"
            >
              Abrir
            </button>

            <button
              type="button"
              class="utm-table-button"
              data-action="reuse"
              data-id="${escapeHtml(item.id)}"
            >
              Reutilizar
            </button>

            <button
              type="button"
              class="utm-table-button delete"
              data-action="delete"
              data-id="${escapeHtml(item.id)}"
            >
              Excluir
            </button>
          </div>
        </td>
      `;

      historyBody.appendChild(row);
    });
  }

  async function copyText(text) {
    const value = String(text || "").trim();

    if (!value) {
      throw new Error(
        "Nenhum link disponível para copiar."
      );
    }

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement("textarea");

    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);

    textarea.select();
    textarea.setSelectionRange(
      0,
      textarea.value.length
    );

    const copied = document.execCommand("copy");

    document.body.removeChild(textarea);

    if (!copied) {
      throw new Error(
        "Não foi possível copiar o link."
      );
    }
  }

  function reuseHistoryItem(item) {
    const destinationUrl =
      item.destinationUrl ||
      removeUtmParameters(item.url);

    urlInput.value = destinationUrl;
    sourceInput.value = item.source || "";
    mediumInput.value = item.medium || "";
    campaignInput.value = item.campaign || "";
    contentInput.value = item.content || "";
    termInput.value = item.term || "";

    showResult(item.url);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    showFeedback(
      "Campanha carregada para reutilização."
    );
  }

  function removeUtmParameters(value) {
    try {
      const url = new URL(value);

      [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term"
      ].forEach((parameter) => {
        url.searchParams.delete(parameter);
      });

      return url.toString();
    } catch (error) {
      return value;
    }
  }

  function clearForm() {
    form.reset();

    urlInput.value =
      "https://mugart.com.br/";

    presetButtons.forEach((button) => {
      button.classList.remove("active");
    });

    removeInvalidState();
    hideResult();

    urlInput.focus();
  }

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      presetButtons.forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      sourceInput.value =
        button.dataset.source || "";

      mediumInput.value =
        button.dataset.medium || "";

      sourceInput.classList.remove("is-invalid");
      mediumInput.classList.remove("is-invalid");

      campaignInput.focus();
    });
  });

  [
    urlInput,
    sourceInput,
    mediumInput,
    campaignInput
  ].forEach((input) => {
    input.addEventListener("input", () => {
      input.classList.remove("is-invalid");
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      const data = generateUtmData();

      sourceInput.value = data.source;
      mediumInput.value = data.medium;
      campaignInput.value = data.campaign;
      contentInput.value = data.content;
      termInput.value = data.term;

      showResult(data.url);
      addToHistory(data);

      showFeedback(
        "Link UTM gerado com sucesso."
      );
    } catch (error) {
      console.error(error);

      showFeedback(
        error.message ||
          "Não foi possível gerar o link.",
        "error"
      );
    }
  });

  copyButton.addEventListener("click", async () => {
    try {
      await copyText(currentGeneratedUrl);

      showFeedback("Link copiado.");
    } catch (error) {
      showFeedback(error.message, "error");
    }
  });

  openButton.addEventListener("click", () => {
    if (!currentGeneratedUrl) {
      showFeedback(
        "Nenhum link disponível para abrir.",
        "error"
      );

      return;
    }

    window.open(
      currentGeneratedUrl,
      "_blank",
      "noopener,noreferrer"
    );
  });

  clearButton.addEventListener("click", () => {
    clearForm();
  });

  clearHistoryButton.addEventListener(
    "click",
    () => {
      const confirmed = window.confirm(
        "Deseja apagar todo o histórico de links UTM?"
      );

      if (!confirmed) {
        return;
      }

      localStorage.removeItem(STORAGE_KEY);
      renderHistory();

      showFeedback(
        "Histórico apagado com sucesso."
      );
    }
  );

  historyBody.addEventListener(
    "click",
    async (event) => {
      const button = event.target.closest(
        "[data-action]"
      );

      if (!button) {
        return;
      }

      const history = getHistory();

      const item = history.find(
        (historyItem) =>
          historyItem.id === button.dataset.id
      );

      if (!item) {
        showFeedback(
          "Link não encontrado no histórico.",
          "error"
        );

        return;
      }

      const action = button.dataset.action;

      if (action === "copy") {
        try {
          await copyText(item.url);

          showFeedback(
            "Link do histórico copiado."
          );
        } catch (error) {
          showFeedback(
            error.message,
            "error"
          );
        }

        return;
      }

      if (action === "open") {
        window.open(
          item.url,
          "_blank",
          "noopener,noreferrer"
        );

        return;
      }

      if (action === "reuse") {
        reuseHistoryItem(item);
        return;
      }

      if (action === "delete") {
        const confirmed = window.confirm(
          `Deseja excluir a campanha "${item.campaign}"?`
        );

        if (!confirmed) {
          return;
        }

        deleteHistoryItem(item.id);

        showFeedback(
          "Link removido do histórico."
        );
      }
    }
  );

  renderHistory();
});
