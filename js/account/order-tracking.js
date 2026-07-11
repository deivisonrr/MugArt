(() => {
  "use strict";

  const elements = {};
  let client = null;

  document.addEventListener("DOMContentLoaded", initializeTracking);

  async function initializeTracking() {
    cacheElements();

    try {
      client = getSupabaseClient();

      const orderId = getOrderIdFromUrl();

      if (!orderId) {
        throw new Error("Pedido não informado.");
      }

      const session = await getSession();

      if (!session?.user) {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?redirect=${returnUrl}`;
        return;
      }

      const customer = await getCustomer(session.user);
      const order = await getOrder(orderId, customer.id);
      const history = await getOrderHistory(order.id);

      renderOrder(order, history);
    } catch (error) {
      console.error("Erro no rastreamento:", error);
      showError(
        error?.message ||
        "Não foi possível carregar o acompanhamento deste pedido."
      );
    } finally {
      hideLoading();
    }
  }

  function cacheElements() {
    elements.loading = document.getElementById("tracking-loading");
    elements.error = document.getElementById("tracking-error");
    elements.content = document.getElementById("tracking-content");

    elements.number = document.getElementById("tracking-order-number");
    elements.date = document.getElementById("tracking-order-date");
    elements.total = document.getElementById("tracking-order-total");
    elements.currentStatus = document.getElementById("tracking-current-status");

    elements.timeline = document.getElementById("tracking-timeline");
    elements.history = document.getElementById("tracking-history");

    elements.carrier = document.getElementById("tracking-carrier");
    elements.service = document.getElementById("tracking-service");
    elements.deliveryTime = document.getElementById("tracking-delivery-time");
    elements.code = document.getElementById("tracking-code");
    elements.externalLink = document.getElementById("tracking-external-link");
  }

  function getSupabaseClient() {
    if (window.mugartSupabase?.from) {
      return window.mugartSupabase;
    }

    if (window.supabaseClient?.from) {
      return window.supabaseClient;
    }

    if (window.sb?.from) {
      return window.sb;
    }

    throw new Error("Cliente Supabase não encontrado.");
  }

  function getOrderIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || params.get("order_id");
  }

  async function getSession() {
    const { data, error } = await client.auth.getSession();

    if (error) {
      throw error;
    }

    return data.session;
  }

  async function getCustomer(user) {
    const { data, error } = await client
      .from("customers")
      .select("id, auth_user_id, email")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao localizar cliente: ${error.message}`);
    }

    if (data) {
      return data;
    }

    const { data: byEmail, error: emailError } = await client
      .from("customers")
      .select("id, auth_user_id, email")
      .eq("email", user.email)
      .maybeSingle();

    if (emailError) {
      throw new Error(`Erro ao localizar cliente: ${emailError.message}`);
    }

    if (!byEmail) {
      throw new Error("Cadastro de cliente não encontrado.");
    }

    return byEmail;
  }

  async function getOrder(orderId, customerId) {
    const { data, error } = await client
      .from("orders")
      .select(`
        id,
        order_number,
        customer_id,
        status,
        payment_status,
        production_status,
        shipping_status,
        total,
        created_at,
        updated_at,
        carrier,
        shipping_company,
        shipping_service,
        shipping_delivery_time,
        tracking_code,
        shipping_tracking_code
      `)
      .eq("id", orderId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao carregar pedido: ${error.message}`);
    }

    if (!data) {
      throw new Error("Pedido não encontrado ou sem permissão de acesso.");
    }

    return data;
  }

  async function getOrderHistory(orderId) {
    const { data, error } = await client
      .from("order_history")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Histórico indisponível:", error.message);
      return [];
    }

    return data || [];
  }

  function renderOrder(order, history) {
    elements.number.textContent =
      order.order_number || shortId(order.id);

    elements.date.textContent = formatDateTime(order.created_at);
    elements.total.textContent = formatCurrency(order.total);

    const currentStatus = getCurrentStatus(order);
    elements.currentStatus.textContent = currentStatus.label;
    elements.currentStatus.className =
      `tracking-status-badge ${currentStatus.className}`;

    renderTimeline(order, history);
    renderShipping(order);
    renderHistory(order, history);

    elements.content.classList.remove("hidden");
  }

  function renderTimeline(order, history) {
    const stepDates = resolveStepDates(order, history);
    const currentIndex = resolveCurrentStepIndex(order);

    const steps = [
      {
        key: "received",
        title: "Pedido recebido",
        description: "Recebemos seu pedido e ele já está registrado.",
        date: stepDates.received
      },
      {
        key: "approved",
        title: "Pagamento aprovado",
        description: "O pagamento foi confirmado.",
        date: stepDates.approved
      },
      {
        key: "production",
        title: "Em produção",
        description: "Seu pedido está sendo preparado pela MugArt.",
        date: stepDates.production
      },
      {
        key: "ready",
        title: "Produção concluída",
        description: "Seu pedido ficou pronto para envio.",
        date: stepDates.ready
      },
      {
        key: "shipped",
        title: "Enviado",
        description: "O pedido foi entregue à transportadora.",
        date: stepDates.shipped
      },
      {
        key: "delivered",
        title: "Entregue",
        description: "O pedido foi entregue no endereço informado.",
        date: stepDates.delivered
      }
    ];

    elements.timeline.innerHTML = steps
      .map((step, index) => {
        const completed = index < currentIndex;
        const current = index === currentIndex;

        const classNames = [
          "tracking-step",
          completed ? "completed" : "",
          current ? "current" : ""
        ].filter(Boolean).join(" ");

        const marker = completed ? "✓" : index + 1;

        return `
          <div class="${classNames}">
            <div class="tracking-step-marker">${marker}</div>

            <div class="tracking-step-content">
              <strong>${escapeHTML(step.title)}</strong>
              <p>${escapeHTML(step.description)}</p>
              ${
                step.date
                  ? `<time>${formatDateTime(step.date)}</time>`
                  : ""
              }
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderShipping(order) {
    const carrier =
      order.shipping_company ||
      order.carrier ||
      "Ainda não informada";

    const service =
      order.shipping_service ||
      "Ainda não informado";

    const deliveryTime = order.shipping_delivery_time
      ? `${order.shipping_delivery_time} dia(s) útil(eis)`
      : "Ainda não informado";

    const trackingCode =
      order.shipping_tracking_code ||
      order.tracking_code ||
      "";

    elements.carrier.textContent = carrier;
    elements.service.textContent = service;
    elements.deliveryTime.textContent = deliveryTime;
    elements.code.textContent = trackingCode || "Ainda não disponível";

    const trackingUrl = buildTrackingUrl(carrier, trackingCode);

    if (trackingUrl) {
      elements.externalLink.href = trackingUrl;
      elements.externalLink.classList.remove("hidden");
    } else {
      elements.externalLink.classList.add("hidden");
    }
  }

  function renderHistory(order, history) {
    const normalizedHistory = history
      .map(normalizeHistoryItem)
      .filter(Boolean);

    if (!normalizedHistory.length) {
      elements.history.innerHTML = `
        <div class="tracking-empty">
          O histórico detalhado aparecerá aqui conforme o pedido avançar.
        </div>
      `;
      return;
    }

    elements.history.innerHTML = normalizedHistory
      .slice()
      .reverse()
      .map(
        (item) => `
          <article class="tracking-history-item">
            <time>${formatDateTime(item.createdAt)}</time>

            <div>
              <strong>${escapeHTML(item.title)}</strong>
              ${
                item.description
                  ? `<p>${escapeHTML(item.description)}</p>`
                  : ""
              }
            </div>
          </article>
        `
      )
      .join("");
  }

  function normalizeHistoryItem(item) {
    const status =
      item.status ||
      item.new_status ||
      item.event_type ||
      item.action ||
      "";

    const description =
      item.description ||
      item.message ||
      item.notes ||
      item.details ||
      "";

    const createdAt =
      item.created_at ||
      item.updated_at ||
      item.date ||
      null;

    if (!status && !description) {
      return null;
    }

    return {
      title: formatStatus(status || "Atualização"),
      description,
      createdAt
    };
  }

  function resolveCurrentStepIndex(order) {
    const shippingStatus = normalize(order.shipping_status);
    const productionStatus = normalize(order.production_status);
    const paymentStatus = normalize(order.payment_status);
    const orderStatus = normalize(order.status);

    if (["delivered", "entregue"].includes(shippingStatus)) {
      return 5;
    }

    if (
      ["shipped", "posted", "enviado", "despachado"].includes(shippingStatus)
    ) {
      return 4;
    }

    if (
      ["completed", "ready", "finished", "concluido", "pronto"].includes(
        productionStatus
      )
    ) {
      return 3;
    }

    if (
      ["in_production", "production", "started", "em_producao", "producing"].includes(
        productionStatus
      )
    ) {
      return 2;
    }

    if (
      ["approved", "paid", "pago", "aprovado"].includes(paymentStatus) ||
      ["approved", "paid", "pago", "aprovado"].includes(orderStatus)
    ) {
      return 1;
    }

    return 0;
  }

  function resolveStepDates(order, history) {
    const dates = {
      received: order.created_at,
      approved: null,
      production: null,
      ready: null,
      shipped: null,
      delivered: null
    };

    history.forEach((item) => {
      const status = normalize(
        item.status ||
        item.new_status ||
        item.event_type ||
        item.action ||
        item.description
      );

      const date =
        item.created_at ||
        item.updated_at ||
        item.date ||
        null;

      if (!date) return;

      if (
        !dates.approved &&
        ["approved", "paid", "pago", "aprovado"].some((term) =>
          status.includes(term)
        )
      ) {
        dates.approved = date;
      }

      if (
        !dates.production &&
        ["production", "producao", "producing", "started"].some((term) =>
          status.includes(term)
        )
      ) {
        dates.production = date;
      }

      if (
        !dates.ready &&
        ["ready", "finished", "completed", "pronto", "concluido"].some((term) =>
          status.includes(term)
        )
      ) {
        dates.ready = date;
      }

      if (
        !dates.shipped &&
        ["shipped", "posted", "enviado", "despachado"].some((term) =>
          status.includes(term)
        )
      ) {
        dates.shipped = date;
      }

      if (
        !dates.delivered &&
        ["delivered", "entregue"].some((term) =>
          status.includes(term)
        )
      ) {
        dates.delivered = date;
      }
    });

    if (
      !dates.approved &&
      ["approved", "paid", "pago", "aprovado"].includes(
        normalize(order.payment_status)
      )
    ) {
      dates.approved = order.updated_at || order.created_at;
    }

    return dates;
  }

  function getCurrentStatus(order) {
    const index = resolveCurrentStepIndex(order);

    const statuses = [
      { label: "Pedido recebido", className: "status-received" },
      { label: "Pagamento aprovado", className: "status-approved" },
      { label: "Em produção", className: "status-production" },
      { label: "Produção concluída", className: "status-ready" },
      { label: "Enviado", className: "status-shipped" },
      { label: "Entregue", className: "status-delivered" }
    ];

    return statuses[index] || statuses[0];
  }

  function buildTrackingUrl(carrier, code) {
    if (!code) return "";

    const normalizedCarrier = normalize(carrier);

    if (normalizedCarrier.includes("correios")) {
      return `https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(code)}`;
    }

    if (normalizedCarrier.includes("jadlog")) {
      return `https://www.jadlog.com.br/siteInstitucional/tracking.jad?cte=${encodeURIComponent(code)}`;
    }

    if (normalizedCarrier.includes("loggi")) {
      return `https://www.loggi.com/rastreador/${encodeURIComponent(code)}`;
    }

    return `https://www.google.com/search?q=${encodeURIComponent(
      `${carrier || "transportadora"} rastrear ${code}`
    )}`;
  }

  function showError(message) {
    elements.error.textContent = message;
    elements.error.classList.remove("hidden");
  }

  function hideLoading() {
    elements.loading?.classList.add("hidden");
  }

  function shortId(id) {
    return String(id || "")
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase();
  }

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");
  }

  function formatStatus(value) {
    return String(value || "Atualização")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value) || 0);
  }

  function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
