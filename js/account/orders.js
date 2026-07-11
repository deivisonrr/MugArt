/* ==========================================================
   MugArt - Área do Cliente
   orders.js
   Rastreamento Premium no modal
========================================================== */

Account.loadOrders = async function () {
    if (!Account.customer) return;

    const { data, error } = await mugartSupabase
        .from("orders")
        .select(`
            id,
            order_number,
            customer_id,
            customer_email,
            status,
            payment_status,
            production_status,
            shipping_status,
            subtotal,
            discount,
            shipping,
            total,
            shipping_method,
            shipping_company,
            shipping_service,
            shipping_delivery_time,
            shipping_tracking_code,
            tracking_code,
            carrier,
            shipping_label_url,
            created_at,
            updated_at
        `)
        .eq("customer_id", Account.customer.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao carregar pedidos:", error);

        Account.showMessage(
            "Não foi possível carregar seus pedidos.",
            "error"
        );

        return;
    }

    Account.orders = data || [];

    Account.updateOrdersDashboard();
    Account.renderOrders();
    Account.renderLatestOrder();
};

Account.updateOrdersDashboard = function () {
    const counter = document.getElementById("dashboardOrdersCount");

    if (counter) {
        counter.textContent = Account.orders.length;
    }
};

Account.orderStatusText = function (order) {
    if (
        order.status === "canceled" ||
        order.status === "cancelled"
    ) {
        return "Cancelado";
    }

    if (
        order.shipping_status === "delivered" ||
        order.status === "delivered"
    ) {
        return "Entregue";
    }

    if (
        order.shipping_status === "shipped" ||
        order.status === "sent" ||
        order.status === "shipped"
    ) {
        return "Enviado";
    }

    if (
        order.production_status === "completed" ||
        order.production_status === "finished" ||
        order.production_status === "ready"
    ) {
        return "Produção concluída";
    }

    if (
        order.production_status === "in_production" ||
        order.production_status === "production" ||
        order.production_status === "printing" ||
        order.production_status === "pressing" ||
        order.production_status === "quality" ||
        order.status === "production"
    ) {
        return "Em produção";
    }

    if (
        order.payment_status === "approved" ||
        order.payment_status === "paid" ||
        order.status === "approved" ||
        order.status === "paid"
    ) {
        return "Pagamento aprovado";
    }

    return "Pedido recebido";
};

Account.orderStatusClass = function (order) {
    const status = Account.orderStatusText(order);

    const classes = {
        "Pedido recebido": "pending",
        "Pagamento aprovado": "approved",
        "Em produção": "production",
        "Produção concluída": "ready",
        "Enviado": "sent",
        "Entregue": "delivered",
        "Cancelado": "canceled"
    };

    return classes[status] || "pending";
};

Account.renderLatestOrder = function () {
    const container = document.getElementById("latestOrderContainer");

    if (!container) return;

    const order = Account.orders[0];

    if (!order) {
        container.innerHTML = `
            <div class="account-empty-state">
                <span>📦</span>
                <h3>Nenhum pedido encontrado</h3>
                <p>Seus pedidos aparecerão aqui.</p>
                <a href="../loja.html">Ir para a loja</a>
            </div>
        `;

        return;
    }

    container.innerHTML = Account.orderCardTemplate(order, true);

    Account.bindOrderCardActions(container);
};

Account.renderOrders = function () {
    const container = document.getElementById("ordersList");

    if (!container) return;

    const search = String(
        document.getElementById("ordersSearch")?.value || ""
    )
        .trim()
        .toLowerCase();

    const statusFilter =
        document.getElementById("ordersStatusFilter")?.value || "";

    const orders = Account.orders.filter((order) => {
        const orderNumber = String(order.order_number || "").toLowerCase();
        const status = Account.orderStatusClass(order);

        const matchesSearch =
            !search ||
            orderNumber.includes(search);

        const matchesStatus =
            !statusFilter ||
            status === statusFilter ||
            order.status === statusFilter ||
            order.payment_status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (!orders.length) {
        container.innerHTML = `
            <div class="account-empty-state">
                <span>🔎</span>
                <h3>Nenhum pedido encontrado</h3>
                <p>Altere os filtros ou faça uma nova compra.</p>
                <a href="../loja.html">Ir para a loja</a>
            </div>
        `;

        return;
    }

    container.innerHTML = orders
        .map((order) => Account.orderCardTemplate(order))
        .join("");

    Account.bindOrderCardActions(container);
};

Account.bindOrderCardActions = function (container) {
    container
        .querySelectorAll("[data-open-order]")
        .forEach((button) => {
            button.addEventListener("click", () => {
                Account.openOrder(button.dataset.openOrder);
            });
        });
};

Account.orderCardTemplate = function (order, compact = false) {
    const statusText = Account.orderStatusText(order);
    const statusClass = Account.orderStatusClass(order);

    const shippingText = order.shipping_company
        ? `${order.shipping_company} ${order.shipping_service || ""}`
        : "Frete ainda não definido";

    return `
        <article class="account-order-card ${compact ? "compact" : ""}">
            <div class="account-order-card-head">
                <div>
                    <span>Pedido</span>
                    <h3>${Account.escapeHtml(order.order_number || "-")}</h3>
                    <small>${Account.formatDate(order.created_at)}</small>
                </div>

                <span class="account-order-status ${statusClass}">
                    ${statusText}
                </span>
            </div>

            <div class="account-order-details-grid">
                <div>
                    <small>Pagamento</small>
                    <strong>
                        ${
                            ["approved", "paid"].includes(order.payment_status)
                                ? "Aprovado"
                                : "Pendente"
                        }
                    </strong>
                </div>

                <div>
                    <small>Entrega</small>
                    <strong>${Account.escapeHtml(shippingText)}</strong>
                </div>

                <div>
                    <small>Total</small>
                    <strong>${Account.formatMoney(order.total)}</strong>
                </div>
            </div>

            <div class="account-order-card-actions">
                <button
                    class="account-primary-button"
                    type="button"
                    data-open-order="${order.id}"
                >
                    Acompanhar pedido
                </button>
            </div>
        </article>
    `;
};

Account.openOrder = async function (orderId) {
    const modal = document.getElementById("orderModal");
    const content = document.getElementById("orderModalContent");

    if (!modal || !content) return;

    content.innerHTML = `
        <div class="account-loading-inline">
            Carregando pedido...
        </div>
    `;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("account-modal-open");

    const { data: order, error } = await mugartSupabase
        .from("orders")
        .select(`
            *,
            order_items (*),
            order_addresses (*),
            order_history (*)
        `)
        .eq("id", orderId)
        .eq("customer_id", Account.customer.id)
        .single();

    if (error) {
        console.error("Erro ao abrir pedido:", error);

        content.innerHTML = `
            <div class="account-empty-state">
                <span>⚠️</span>
                <h3>Não foi possível abrir o pedido</h3>
                <p>Tente novamente em instantes.</p>
            </div>
        `;

        return;
    }

    const items = order.order_items || [];
    const address = order.order_addresses?.[0] || {};
    const history = (order.order_history || []).sort((a, b) => {
        return new Date(a.created_at) - new Date(b.created_at);
    });

    const trackingCode =
        order.shipping_tracking_code ||
        order.tracking_code ||
        "";

    const carrier =
        order.shipping_company ||
        order.carrier ||
        "";

    const trackingUrl = Account.buildTrackingUrl(
        carrier,
        trackingCode
    );

    content.innerHTML = `
        <div class="account-tracking-modal">

            <div class="account-modal-header account-tracking-modal-header">
                <div>
                    <span>Pedido</span>
                    <h2>${Account.escapeHtml(order.order_number || "-")}</h2>
                    <p>${Account.formatDate(order.created_at)}</p>
                </div>

                <div class="account-tracking-current-status">
                    <small>Status atual</small>
                    <strong class="${Account.orderStatusClass(order)}">
                        ${Account.orderStatusText(order)}
                    </strong>
                </div>
            </div>

            ${Account.orderTimelineTemplate(order, history)}

            <div class="account-tracking-layout">

                <div class="account-tracking-main-column">

                    <section class="account-panel account-tracking-panel">
                        <div class="account-tracking-panel-head">
                            <div>
                                <span>Produtos</span>
                                <h3>Itens do pedido</h3>
                            </div>
                        </div>

                        <div class="account-order-items">
                            ${
                                items.length
                                    ? items.map((item) => `
                                        <div class="account-order-item account-order-item-premium">
                                            <img
                                                src="${Account.escapeAttribute(
                                                    item.image_url ||
                                                    "../assets/hero-caneca.png"
                                                )}"
                                                alt="${Account.escapeAttribute(
                                                    item.product_name || "Produto"
                                                )}"
                                                onerror="this.src='../assets/hero-caneca.png'"
                                            >

                                            <div>
                                                <strong>
                                                    ${Account.escapeHtml(
                                                        item.product_name || "-"
                                                    )}
                                                </strong>

                                                <span>
                                                    ${item.quantity}x •
                                                    ${Account.formatMoney(item.unit_price)}
                                                </span>
                                            </div>

                                            <b>
                                                ${Account.formatMoney(item.total)}
                                            </b>
                                        </div>
                                    `).join("")
                                    : "<p>Nenhum item encontrado.</p>"
                            }
                        </div>
                    </section>

                    <section class="account-panel account-tracking-panel">
                        <div class="account-tracking-panel-head">
                            <div>
                                <span>Histórico</span>
                                <h3>Atualizações do pedido</h3>
                            </div>
                        </div>

                        ${Account.orderHistoryTemplate(order, history)}
                    </section>

                </div>

                <div class="account-tracking-side-column">

                    <section class="account-panel account-tracking-panel">
                        <div class="account-tracking-panel-head">
                            <div>
                                <span>Entrega</span>
                                <h3>Informações do envio</h3>
                            </div>
                        </div>

                        <div class="account-tracking-shipping-info">
                            <div>
                                <small>Transportadora</small>
                                <strong>
                                    ${Account.escapeHtml(carrier || "Ainda não informada")}
                                </strong>
                            </div>

                            <div>
                                <small>Serviço</small>
                                <strong>
                                    ${Account.escapeHtml(
                                        order.shipping_service ||
                                        order.shipping_method ||
                                        "Ainda não informado"
                                    )}
                                </strong>
                            </div>

                            <div>
                                <small>Prazo estimado</small>
                                <strong>
                                    ${
                                        order.shipping_delivery_time
                                            ? `${order.shipping_delivery_time} dia(s) útil(eis)`
                                            : "Ainda não informado"
                                    }
                                </strong>
                            </div>

                            <div>
                                <small>Código de rastreio</small>
                                <strong class="account-tracking-code">
                                    ${Account.escapeHtml(
                                        trackingCode || "Ainda não disponível"
                                    )}
                                </strong>
                            </div>
                        </div>

                        ${
                            trackingUrl
                                ? `
                                    <a
                                        class="account-primary-button account-tracking-external-button"
                                        href="${Account.escapeAttribute(trackingUrl)}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Rastrear entrega
                                    </a>
                                `
                                : ""
                        }

                        <hr>

                        <div class="account-tracking-address">
                            <small>Endereço de entrega</small>

                            <p>
                                ${Account.escapeHtml(address.street || "-")},
                                ${Account.escapeHtml(address.number || "-")}
                            </p>

                            <p>
                                ${Account.escapeHtml(address.neighborhood || "-")} -
                                ${Account.escapeHtml(address.city || "-")} /
                                ${Account.escapeHtml(address.state || "-")}
                            </p>

                            <p>
                                CEP: ${Account.escapeHtml(address.zip || "-")}
                            </p>
                        </div>
                    </section>

                    <section class="account-panel account-tracking-panel">
                        <div class="account-tracking-panel-head">
                            <div>
                                <span>Resumo</span>
                                <h3>Valores</h3>
                            </div>
                        </div>

                        <div class="account-summary-lines">
                            <div>
                                <span>Subtotal</span>
                                <strong>${Account.formatMoney(order.subtotal)}</strong>
                            </div>

                            <div>
                                <span>Desconto</span>
                                <strong>${Account.formatMoney(order.discount)}</strong>
                            </div>

                            <div>
                                <span>Frete</span>
                                <strong>${Account.formatMoney(order.shipping)}</strong>
                            </div>

                            <div class="total">
                                <span>Total</span>
                                <strong>${Account.formatMoney(order.total)}</strong>
                            </div>
                        </div>
                    </section>

                    <section class="account-panel account-tracking-help">
                        <span>Precisa de ajuda?</span>
                        <h3>Fale com a MugArt</h3>

                        <p>
                            Nossa equipe pode ajudar com dúvidas sobre produção,
                            envio ou prazo de entrega.
                        </p>

                        <a
                            href="https://wa.me/5511988849236?text=${encodeURIComponent(
                                `Olá! Preciso de ajuda com o pedido ${order.order_number || order.id}.`
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="account-secondary-button"
                        >
                            Chamar no WhatsApp
                        </a>
                    </section>

                </div>

            </div>

        </div>
    `;
};

Account.orderTimelineTemplate = function (order, history = []) {
    const currentIndex = Account.resolveOrderStepIndex(order);
    const dates = Account.resolveOrderStepDates(order, history);

    const steps = [
        {
            key: "received",
            label: "Pedido recebido",
            description: "Recebemos seu pedido.",
            date: dates.received
        },
        {
            key: "paid",
            label: "Pagamento aprovado",
            description: "O pagamento foi confirmado.",
            date: dates.paid
        },
        {
            key: "production",
            label: "Em produção",
            description: "Seu pedido está sendo preparado.",
            date: dates.production
        },
        {
            key: "finished",
            label: "Produção concluída",
            description: "O pedido ficou pronto para envio.",
            date: dates.finished
        },
        {
            key: "sent",
            label: "Enviado",
            description: "O pedido foi entregue à transportadora.",
            date: dates.sent
        },
        {
            key: "delivered",
            label: "Entregue",
            description: "O pedido foi entregue.",
            date: dates.delivered
        }
    ];

    return `
        <div class="account-order-timeline account-order-timeline-premium">
            ${steps.map((step, index) => {
                const completed = index < currentIndex;
                const current = index === currentIndex;

                return `
                    <div class="
                        account-timeline-step-premium
                        ${completed ? "completed" : ""}
                        ${current ? "current" : ""}
                    ">
                        <div class="account-timeline-marker">
                            ${completed ? "✓" : index + 1}
                        </div>

                        <div class="account-timeline-content">
                            <strong>${step.label}</strong>
                            <p>${step.description}</p>

                            ${
                                step.date
                                    ? `<time>${Account.formatDate(step.date)}</time>`
                                    : ""
                            }
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
};

Account.orderHistoryTemplate = function (order, history) {
    const normalized = history
        .map((item) => {
            const title =
                item.status ||
                item.new_status ||
                item.event_type ||
                item.action ||
                "Atualização";

            const description =
                item.description ||
                item.message ||
                item.notes ||
                item.details ||
                "";

            return {
                title: Account.formatStatusLabel(title),
                description,
                created_at:
                    item.created_at ||
                    item.updated_at ||
                    order.updated_at ||
                    order.created_at
            };
        })
        .filter((item) => item.title || item.description);

    if (!normalized.length) {
        return `
            <div class="account-empty-state account-history-empty">
                <span>🕘</span>
                <h3>Sem atualizações adicionais</h3>
                <p>
                    As próximas movimentações aparecerão aqui.
                </p>
            </div>
        `;
    }

    return `
        <div class="account-tracking-history">
            ${normalized
                .slice()
                .reverse()
                .map((item) => `
                    <article class="account-tracking-history-item">
                        <time>${Account.formatDate(item.created_at)}</time>

                        <div>
                            <strong>${Account.escapeHtml(item.title)}</strong>

                            ${
                                item.description
                                    ? `<p>${Account.escapeHtml(item.description)}</p>`
                                    : ""
                            }
                        </div>
                    </article>
                `)
                .join("")}
        </div>
    `;
};

Account.resolveOrderStepIndex = function (order) {
    const shipping = Account.normalizeStatus(order.shipping_status);
    const production = Account.normalizeStatus(order.production_status);
    const payment = Account.normalizeStatus(order.payment_status);
    const status = Account.normalizeStatus(order.status);

    if (["delivered", "entregue"].includes(shipping) ||
        ["delivered", "entregue"].includes(status)) {
        return 5;
    }

    if (["shipped", "sent", "enviado", "despachado"].includes(shipping) ||
        ["shipped", "sent", "enviado"].includes(status)) {
        return 4;
    }

    if (["completed", "finished", "ready", "concluido", "pronto"].includes(production)) {
        return 3;
    }

    if ([
        "in_production",
        "production",
        "printing",
        "pressing",
        "quality",
        "producing",
        "em_producao"
    ].includes(production) || status === "production") {
        return 2;
    }

    if (
        ["approved", "paid", "pago", "aprovado"].includes(payment) ||
        ["approved", "paid", "pago", "aprovado"].includes(status)
    ) {
        return 1;
    }

    return 0;
};

Account.resolveOrderStepDates = function (order, history) {
    const dates = {
        received: order.created_at,
        paid: null,
        production: null,
        finished: null,
        sent: null,
        delivered: null
    };

    history.forEach((item) => {
        const text = Account.normalizeStatus(
            [
                item.status,
                item.new_status,
                item.event_type,
                item.action,
                item.description,
                item.message,
                item.notes
            ]
                .filter(Boolean)
                .join(" ")
        );

        const date =
            item.created_at ||
            item.updated_at ||
            null;

        if (!date) return;

        if (
            !dates.paid &&
            ["approved", "paid", "pago", "aprovado"].some((value) =>
                text.includes(value)
            )
        ) {
            dates.paid = date;
        }

        if (
            !dates.production &&
            ["production", "producao", "printing", "pressing", "quality"].some((value) =>
                text.includes(value)
            )
        ) {
            dates.production = date;
        }

        if (
            !dates.finished &&
            ["completed", "finished", "ready", "concluido", "pronto"].some((value) =>
                text.includes(value)
            )
        ) {
            dates.finished = date;
        }

        if (
            !dates.sent &&
            ["shipped", "sent", "enviado", "despachado"].some((value) =>
                text.includes(value)
            )
        ) {
            dates.sent = date;
        }

        if (
            !dates.delivered &&
            ["delivered", "entregue"].some((value) =>
                text.includes(value)
            )
        ) {
            dates.delivered = date;
        }
    });

    if (
        !dates.paid &&
        ["approved", "paid"].includes(
            Account.normalizeStatus(order.payment_status)
        )
    ) {
        dates.paid = order.updated_at || order.created_at;
    }

    return dates;
};

Account.buildTrackingUrl = function (carrier, code) {
    if (!code) return "";

    const normalizedCarrier = Account.normalizeStatus(carrier);

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
};

Account.normalizeStatus = function (value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_");
};

Account.formatStatusLabel = function (value) {
    return String(value || "Atualização")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

Account.escapeHtml = function (value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
};

Account.escapeAttribute = function (value) {
    return Account.escapeHtml(value);
};

document.addEventListener("DOMContentLoaded", () => {
    document
        .getElementById("ordersSearch")
        ?.addEventListener("input", () => {
            Account.renderOrders();
        });

    document
        .getElementById("ordersStatusFilter")
        ?.addEventListener("change", () => {
            Account.renderOrders();
        });

    document
        .querySelectorAll("[data-close-order-modal]")
        .forEach((element) => {
            element.addEventListener("click", () => {
                const modal = document.getElementById("orderModal");

                modal?.classList.remove("open");
                modal?.setAttribute("aria-hidden", "true");
                document.body.classList.remove("account-modal-open");
            });
        });
});
