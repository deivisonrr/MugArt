document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const STORAGE_KEY = "mugart_marketing_history";
  const MAX_HISTORY_ITEMS = 100;

  let products = [];

  const generatedLinks = {
    utm: "",
    whatsapp: "",
    product: "",
    promotion: ""
  };

  function byId(id) {
    return document.getElementById(id);
  }

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

  function onlyNumbers(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function normalizeUrl(value) {
    let urlValue = String(value || "").trim();

    if (!urlValue) {
      throw new Error("Informe uma URL válida.");
    }

    if (!/^https?:\/\//i.test(urlValue)) {
      urlValue = `https://${urlValue}`;
    }

    try {
      return new URL(urlValue);
    } catch (error) {
      throw new Error("Informe uma URL válida.");
    }
  }

  function generateId() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function showFeedback(elementId, message, type = "success") {
    const element = byId(elementId);

    if (!element) {
      return;
    }

    element.textContent = message;
    element.style.color =
      type === "error" ? "#f87171" : "#4ade80";

    window.clearTimeout(element.feedbackTimeout);

    element.feedbackTimeout = window.setTimeout(() => {
      element.textContent = "";
    }, 3500);
  }

  function showResult(type, url) {
    generatedLinks[type] = url;

    byId(`${type}-result`).value = url;

    byId(`${type}-result-container`).classList.remove("hidden");
    byId(`${type}-empty-result`).classList.add("hidden");
  }

  function hideResult(type) {
    generatedLinks[type] = "";

    byId(`${type}-result`).value = "";

    byId(`${type}-result-container`).classList.add("hidden");
    byId(`${type}-empty-result`).classList.remove("hidden");
  }

  async function copyText(text) {
    const value = String(text || "").trim();

    if (!value) {
      throw new Error("Nenhum link disponível para copiar.");
    }

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement("textarea");

    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";

    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");

    document.body.removeChild(textarea);

    if (!copied) {
      throw new Error("Não foi possível copiar o link.");
    }
  }

  function openLink(url) {
    if (!url) {
      throw new Error("Nenhum link disponível para abrir.");
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);

      if (!data) {
        return [];
      }

      const parsed = JSON.parse(data);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      return [];
    }
  }

  function saveHistory(history) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS))
    );
  }

  function addHistory(type, name, url) {
    const history = getHistory();

    const existingIndex = history.findIndex(
      (item) => item.url === url
    );

    if (existingIndex >= 0) {
      history.splice(existingIndex, 1);
    }

    history.unshift({
      id: generateId(),
      type,
      name,
      url,
      createdAt: new Date().toISOString()
    });

    saveHistory(history);
    renderHistory();
  }

  function typeLabel(type) {
    const labels = {
      utm: "UTM",
      whatsapp: "WhatsApp",
      product: "Produto",
      promotion: "Promoção",
      kit: "Kit"
    };

    return labels[type] || type;
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

    const table = byId("marketing-history-table");
    const body = byId("marketing-history-body");
    const empty = byId("marketing-history-empty");

    body.innerHTML = "";

    if (!history.length) {
      table.classList.add("hidden");
      empty.classList.remove("hidden");
      return;
    }

    table.classList.remove("hidden");
    empty.classList.add("hidden");

    history.forEach((item) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>
          <span class="marketing-type-badge">
            ${escapeHtml(typeLabel(item.type))}
          </span>
        </td>

        <td>
          ${escapeHtml(item.name)}
        </td>

        <td>
          <span class="marketing-history-link">
            ${escapeHtml(item.url)}
          </span>
        </td>

        <td>
          ${escapeHtml(formatDate(item.createdAt))}
        </td>

        <td>
          <div class="marketing-history-actions">
            <button
              type="button"
              class="marketing-table-button"
              data-history-action="copy"
              data-history-id="${escapeHtml(item.id)}"
            >
              Copiar
            </button>

            <button
              type="button"
              class="marketing-table-button"
              data-history-action="open"
              data-history-id="${escapeHtml(item.id)}"
            >
              Abrir
            </button>

            <button
              type="button"
              class="marketing-table-button delete"
              data-history-action="delete"
              data-history-id="${escapeHtml(item.id)}"
            >
              Excluir
            </button>
          </div>
        </td>
      `;

      body.appendChild(row);
    });
  }

  // ABAS
  document.querySelectorAll("[data-marketing-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const selectedTab = button.dataset.marketingTab;

      document.querySelectorAll("[data-marketing-tab]").forEach((item) => {
        item.classList.toggle(
          "active",
          item.dataset.marketingTab === selectedTab
        );
      });

      document.querySelectorAll("[data-marketing-panel]").forEach((panel) => {
        panel.classList.toggle(
          "active",
          panel.dataset.marketingPanel === selectedTab
        );
      });
    });
  });

  // UTM
  document.querySelectorAll(".utm-preset").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".utm-preset").forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      byId("utm-source").value = button.dataset.source || "";
      byId("utm-medium").value = button.dataset.medium || "";
      byId("utm-campaign").focus();
    });
  });

  byId("utm-form").addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      const url = normalizeUrl(byId("utm-url").value);

      const source = normalizeValue(byId("utm-source").value);
      const medium = normalizeValue(byId("utm-medium").value);
      const campaign = normalizeValue(byId("utm-campaign").value);
      const content = normalizeValue(byId("utm-content").value);
      const term = normalizeValue(byId("utm-term").value);

      if (!source || !medium || !campaign) {
        throw new Error(
          "Preencha a origem, a mídia e o nome da campanha."
        );
      }

      url.searchParams.set("utm_source", source);
      url.searchParams.set("utm_medium", medium);
      url.searchParams.set("utm_campaign", campaign);

      if (content) {
        url.searchParams.set("utm_content", content);
      }

      if (term) {
        url.searchParams.set("utm_term", term);
      }

      const finalUrl = url.toString();

      showResult("utm", finalUrl);
      addHistory("utm", campaign, finalUrl);

      showFeedback(
        "utm-feedback",
        "Link UTM gerado com sucesso."
      );
    } catch (error) {
      showFeedback("utm-feedback", error.message, "error");
    }
  });

  byId("utm-clear-button").addEventListener("click", () => {
    byId("utm-form").reset();
    byId("utm-url").value = "https://mugart.com.br/";

    document.querySelectorAll(".utm-preset").forEach((button) => {
      button.classList.remove("active");
    });

    hideResult("utm");
  });

  // WHATSAPP
  document
    .querySelectorAll(".whatsapp-message-preset")
    .forEach((button) => {
      button.addEventListener("click", () => {
        byId("whatsapp-message").value =
          button.dataset.message || "";
      });
    });

  byId("whatsapp-form").addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      const countryCode = onlyNumbers(
        byId("whatsapp-country-code").value
      );

      const phone = onlyNumbers(
        byId("whatsapp-phone").value
      );

      const message = byId("whatsapp-message").value.trim();

      if (!countryCode || !phone) {
        throw new Error("Informe um telefone válido.");
      }

      if (!message) {
        throw new Error("Informe a mensagem automática.");
      }

      const finalUrl =
        `https://wa.me/${countryCode}${phone}` +
        `?text=${encodeURIComponent(message)}`;

      showResult("whatsapp", finalUrl);
      addHistory("whatsapp", "Atendimento pelo WhatsApp", finalUrl);

      showFeedback(
        "whatsapp-feedback",
        "Link do WhatsApp gerado com sucesso."
      );
    } catch (error) {
      showFeedback(
        "whatsapp-feedback",
        error.message,
        "error"
      );
    }
  });

  byId("whatsapp-clear-button").addEventListener("click", () => {
    byId("whatsapp-form").reset();
    byId("whatsapp-country-code").value = "55";
    byId("whatsapp-phone").value = "11988849236";
    hideResult("whatsapp");
  });

  // PRODUTOS
  async function loadProducts() {
    const selector = byId("product-selector");
    const productsList = byId("promotion-products-list");

    try {
      if (!window.supabaseClient) {
        throw new Error("Cliente Supabase não encontrado.");
      }

      const { data, error } = await window.supabaseClient
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

      products = Array.isArray(data) ? data : [];

      selector.innerHTML = `
        <option value="">
          Selecione um produto
        </option>
      `;

      productsList.innerHTML = "";

      if (!products.length) {
        selector.innerHTML = `
          <option value="">
            Nenhum produto encontrado
          </option>
        `;

        productsList.innerHTML = `
          <div class="marketing-loading">
            Nenhum produto cadastrado.
          </div>
        `;

        return;
      }

      products.forEach((product) => {
        const productName =
          product.name ||
          product.nome ||
          product.title ||
          "Produto sem nome";

        const option = document.createElement("option");

        option.value = String(product.id);
        option.textContent = productName;

        selector.appendChild(option);

        const productLabel = document.createElement("label");

        productLabel.className = "promotion-product-option";

        productLabel.innerHTML = `
          <input
            type="checkbox"
            name="promotion-product"
            value="${escapeHtml(product.id)}"
          >

          <span>${escapeHtml(productName)}</span>
        `;

        productsList.appendChild(productLabel);
      });
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);

      selector.innerHTML = `
        <option value="">
          Não foi possível carregar os produtos
        </option>
      `;

      productsList.innerHTML = `
        <div class="marketing-loading">
          Não foi possível carregar os produtos.
        </div>
      `;
    }
  }

  function buildProductUrl(product) {
    const explicitUrl =
      product.url ||
      product.product_url ||
      product.link ||
      product.permalink;

    if (explicitUrl) {
      return explicitUrl;
    }

    const slug =
      product.slug ||
      product.handle ||
      normalizeValue(
        product.name ||
        product.nome ||
        product.title ||
        product.id
      );

    return (
      "https://mugart.com.br/loja.html?produto=" +
      encodeURIComponent(slug)
    );
  }

  byId("product-selector").addEventListener("change", () => {
    const productId = byId("product-selector").value;

    const product = products.find(
      (item) => String(item.id) === String(productId)
    );

    if (!product) {
      byId("product-destination-url").value = "";
      return;
    }

    byId("product-destination-url").value =
      buildProductUrl(product);
  });

  byId("product-add-utm").addEventListener("change", () => {
    byId("product-utm-fields").classList.toggle(
      "hidden",
      !byId("product-add-utm").checked
    );
  });

  byId("product-link-form").addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      const url = normalizeUrl(
        byId("product-destination-url").value
      );

      const productId = byId("product-selector").value;

      const product = products.find(
        (item) => String(item.id) === String(productId)
      );

      const productName =
        product?.name ||
        product?.nome ||
        product?.title ||
        "Produto MugArt";

      if (byId("product-add-utm").checked) {
        const source = normalizeValue(
          byId("product-utm-source").value
        );

        const medium = normalizeValue(
          byId("product-utm-medium").value
        );

        const campaign = normalizeValue(
          byId("product-utm-campaign").value
        );

        const content = normalizeValue(
          byId("product-utm-content").value
        );

        if (!source || !medium || !campaign) {
          throw new Error(
            "Preencha origem, mídia e campanha da UTM."
          );
        }

        url.searchParams.set("utm_source", source);
        url.searchParams.set("utm_medium", medium);
        url.searchParams.set("utm_campaign", campaign);

        if (content) {
          url.searchParams.set("utm_content", content);
        }
      }

      const finalUrl = url.toString();

      showResult("product", finalUrl);
      addHistory("product", productName, finalUrl);

      showFeedback(
        "product-feedback",
        "Link do produto gerado com sucesso."
      );
    } catch (error) {
      showFeedback(
        "product-feedback",
        error.message,
        "error"
      );
    }
  });

  byId("product-clear-button").addEventListener("click", () => {
    byId("product-link-form").reset();
    byId("product-destination-url").value = "";
    byId("product-utm-fields").classList.add("hidden");
    hideResult("product");
  });

  // PROMOÇÕES E KITS
  byId("promotion-form").addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      const url = normalizeUrl(
        byId("promotion-base-url").value
      );

      const type = byId("promotion-type").value;

      const name = normalizeValue(
        byId("promotion-name").value
      );

      const coupon = String(
        byId("promotion-coupon").value || ""
      )
        .trim()
        .toUpperCase();

      const discount = byId("promotion-discount").value;
      const validUntil = byId("promotion-valid-until").value;

      const source = normalizeValue(
        byId("promotion-source").value
      );

      const medium = normalizeValue(
        byId("promotion-medium").value
      );

      const content = normalizeValue(
        byId("promotion-content").value
      );

      if (!name) {
        throw new Error("Informe o nome da campanha.");
      }

      const selectedProducts = Array.from(
        document.querySelectorAll(
          'input[name="promotion-product"]:checked'
        )
      ).map((checkbox) => checkbox.value);

      url.searchParams.set(
        type === "kit" ? "kit" : "promocao",
        name
      );

      if (selectedProducts.length) {
        url.searchParams.set(
          "produtos",
          selectedProducts.join(",")
        );
      }

      if (coupon) {
        url.searchParams.set("cupom", coupon);
      }

      if (discount) {
        url.searchParams.set("desconto", discount);
      }

      if (validUntil) {
        url.searchParams.set("validade", validUntil);
      }

      if (source && medium) {
        url.searchParams.set("utm_source", source);
        url.searchParams.set("utm_medium", medium);
        url.searchParams.set("utm_campaign", name);

        if (content) {
          url.searchParams.set("utm_content", content);
        }
      }

      const finalUrl = url.toString();

      showResult("promotion", finalUrl);
      addHistory(type, name, finalUrl);

      showFeedback(
        "promotion-feedback",
        type === "kit"
          ? "Link do kit gerado com sucesso."
          : "Link da promoção gerado com sucesso."
      );
    } catch (error) {
      showFeedback(
        "promotion-feedback",
        error.message,
        "error"
      );
    }
  });

  byId("promotion-clear-button").addEventListener("click", () => {
    byId("promotion-form").reset();

    byId("promotion-base-url").value =
      "https://mugart.com.br/loja.html";

    document
      .querySelectorAll(
        'input[name="promotion-product"]'
      )
      .forEach((checkbox) => {
        checkbox.checked = false;
      });

    hideResult("promotion");
  });

  // BOTÕES DOS RESULTADOS
  [
    "utm",
    "whatsapp",
    "product",
    "promotion"
  ].forEach((type) => {
    byId(`${type}-copy-button`).addEventListener(
      "click",
      async () => {
        try {
          await copyText(generatedLinks[type]);

          showFeedback(
            `${type}-feedback`,
            "Link copiado."
          );
        } catch (error) {
          showFeedback(
            `${type}-feedback`,
            error.message,
            "error"
          );
        }
      }
    );

    byId(`${type}-open-button`).addEventListener(
      "click",
      () => {
        try {
          openLink(generatedLinks[type]);
        } catch (error) {
          showFeedback(
            `${type}-feedback`,
            error.message,
            "error"
          );
        }
      }
    );
  });

  // HISTÓRICO
  byId("marketing-history-body").addEventListener(
    "click",
    async (event) => {
      const button = event.target.closest(
        "[data-history-action]"
      );

      if (!button) {
        return;
      }

      const history = getHistory();

      const item = history.find(
        (historyItem) =>
          historyItem.id === button.dataset.historyId
      );

      if (!item) {
        return;
      }

      const action = button.dataset.historyAction;

      if (action === "copy") {
        await copyText(item.url);
        return;
      }

      if (action === "open") {
        openLink(item.url);
        return;
      }

      if (action === "delete") {
        const confirmed = window.confirm(
          `Deseja excluir o link "${item.name}"?`
        );

        if (!confirmed) {
          return;
        }

        saveHistory(
          history.filter(
            (historyItem) => historyItem.id !== item.id
          )
        );

        renderHistory();
      }
    }
  );

  byId("marketing-clear-history-button").addEventListener(
    "click",
    () => {
      const confirmed = window.confirm(
        "Deseja apagar todo o histórico de links?"
      );

      if (!confirmed) {
        return;
      }

      localStorage.removeItem(STORAGE_KEY);
      renderHistory();
    }
  );

  renderHistory();
  await loadProducts();
});
