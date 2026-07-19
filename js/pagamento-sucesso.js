const PURCHASE_MAX_ATTEMPTS = 15;
const PURCHASE_RETRY_MS = 2000;

function getUrlParam(...names) {
  const params = new URLSearchParams(
    window.location.search
  );

  for (const name of names) {
    const value = params.get(name);

    if (value) {
      return String(value).trim();
    }
  }

  return "";
}

function setPurchaseMessage(message, type = "") {
  const element =
    document.querySelector(
      "#paymentStatusMessage"
    );

  if (!element) return;

  element.textContent = message;
  element.className =
    `payment-status-message ${type}`.trim();
}

function sleep(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );
}

async function loadPurchaseData(
  orderId,
  paymentId
) {
  const { data, error } =
    await mugartSupabase.functions.invoke(
      "get-purchase-data",
      {
        body: {
          order_id: orderId,
          payment_id:
            paymentId || undefined,
        },
      }
    );

  if (error) {
    let message =
      error.message ||
      "Não foi possível consultar o pagamento.";

    try {
      const responseBody =
        await error.context?.json?.();

      if (responseBody?.error) {
        message =
          responseBody.error;
      }
    } catch {
      // Mantém a mensagem original.
    }

    throw new Error(message);
  }

  return data;
}

function pushPurchaseToDataLayer(
  purchase
) {
  if (
    !purchase?.transaction_id ||
    !purchase?.ecommerce
  ) {
    throw new Error(
      "Dados do evento purchase incompletos."
    );
  }

  const deduplicationKey =
    `mugart_purchase_${purchase.transaction_id}`;

  if (
    localStorage.getItem(
      deduplicationKey
    ) === "sent"
  ) {
    console.info(
      "[Purchase] Evento já enviado neste navegador:",
      purchase.transaction_id
    );

    return false;
  }

  window.dataLayer =
    window.dataLayer || [];

  /*
   * Limpa o objeto ecommerce anterior para
   * evitar mistura de dados no GTM/GA4.
   */
  window.dataLayer.push({
    ecommerce: null,
  });

  window.dataLayer.push({
    event: "purchase",

    event_id:
      `purchase_${purchase.transaction_id}`,

    transaction_id:
      purchase.transaction_id,

    payment_id:
      purchase.payment_id || undefined,

    payment_method:
      purchase.payment_method || undefined,

    payment_type:
      purchase.payment_type || undefined,

    payment_checkout_type:
      purchase.payment_checkout_type ||
      undefined,

    ecommerce:
      purchase.ecommerce,
  });

  localStorage.setItem(
    deduplicationKey,
    "sent"
  );

  console.info(
    "[Purchase] Evento enviado ao dataLayer:",
    purchase
  );

  return true;
}

async function initializePurchaseEvent() {
  const orderId = getUrlParam(
    "order_id",
    "external_reference"
  );

  const paymentId = getUrlParam(
    "payment_id",
    "collection_id"
  );

  if (!orderId) {
    setPurchaseMessage(
      "Pagamento recebido. Estamos confirmando os dados do seu pedido.",
      "warning"
    );

    console.warn(
      "[Purchase] order_id/external_reference ausente na URL."
    );

    return;
  }

  setPurchaseMessage(
    "Confirmando seu pagamento...",
    "loading"
  );

  for (
    let attempt = 1;
    attempt <= PURCHASE_MAX_ATTEMPTS;
    attempt++
  ) {
    try {
      const result =
        await loadPurchaseData(
          orderId,
          paymentId
        );

      if (
        result?.success &&
        result?.approved &&
        result?.purchase
      ) {
        pushPurchaseToDataLayer(
          result.purchase
        );

        setPurchaseMessage(
          "Pagamento aprovado! Seu pedido foi confirmado.",
          "success"
        );

        const orderElement =
          document.querySelector(
            "#confirmedOrderId"
          );

        if (orderElement) {
          orderElement.textContent =
            result.purchase.transaction_id;
        }

        return;
      }

      const status =
        result?.payment_status ||
        "pending";

      setPurchaseMessage(
        status === "pending"
          ? "Pagamento recebido. Aguardando confirmação..."
          : `Status do pagamento: ${status}`,
        "warning"
      );
    } catch (error) {
      console.error(
        `[Purchase] Tentativa ${attempt}:`,
        error
      );

      setPurchaseMessage(
        "Estamos confirmando o pagamento. Aguarde alguns instantes...",
        "warning"
      );
    }

    if (
      attempt <
      PURCHASE_MAX_ATTEMPTS
    ) {
      await sleep(
        PURCHASE_RETRY_MS
      );
    }
  }

  setPurchaseMessage(
    "O pagamento ainda está sendo confirmado. Você poderá acompanhar o pedido na sua conta.",
    "warning"
  );
}

document.addEventListener(
  "DOMContentLoaded",
  initializePurchaseEvent
);
