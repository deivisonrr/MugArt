/* ==========================================================
   MugArt - Área do Cliente
   orders.js
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
            shipping_label_url,
            created_at
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
    if (order.status === "canceled") {
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
        order.status === "sent"
    ) {
        return "Enviado";
    }

    if (
        order.production_status === "completed" ||
        order.production_status === "finished"
    ) {
        return "Produção concluída";
    }

    if (
        order.production_status === "in_production" ||
        order.status === "production"
    ) {
        return "Em produção";
    }

    if (
        order.payment_status === "approved" ||
        order.status === "approved"
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

    container
        .querySelector("[data-open-order]")
        ?.addEventListener("click", () => {
            Account.openOrder(order.id);
        });
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
                    <h3>${order.order_number || "-"}</h3>
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
                        ${order.payment_status === "approved"
                            ? "Aprovado"
                            : "Pendente"}
                    </strong>
                </div>

                <div>
                    <small>Entrega</small>
                    <strong>${shippingText}</strong>
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

    content.innerHTML = `
        <div class="account-modal-header">
            <span>Pedido</span>
            <h2>${order.order_number || "-"}</h2>
            <p>${Account.formatDate(order.created_at)}</p>
        </div>

        ${Account.orderTimelineTemplate(order, history)}

        <div class="account-order-modal-grid">

            <section class="account-panel">
                <h3>Itens do pedido</h3>

                <div class="account-order-items">
                    ${items.length
                        ? items.map((item) => `
                            <div class="account-order-item">
                                <img
                                    src="${item.image_url || "../assets/hero-caneca.png"}"
                                    alt="${item.product_name || "Produto"}"
                                >

                                <div>
                                    <strong>${item.product_name || "-"}</strong>
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

            <section class="account-panel">
                <h3>Entrega</h3>

                <p>
                    <strong>${order.shipping_company || "-"}</strong>
                    ${order.shipping_service || ""}
                </p>

                <p>
                    Prazo:
                    ${order.shipping_delivery_time || "-"} dias úteis
                </p>

                <p>
                    Frete:
                    ${Account.formatMoney(order.shipping)}
                </p>

                ${order.shipping_tracking_code
                    ? `
                        <div class="account-tracking-box">
                            <small>Código de rastreio</small>
                            <strong>${order.shipping_tracking_code}</strong>
                        </div>
                    `
                    : ""
                }

                <hr>

                <p>
                    ${address.street || "-"},
                    ${address.number || "-"}
                </p>

                <p>
                    ${address.neighborhood || "-"} -
                    ${address.city || "-"} /
                    ${address.state || "-"}
                </p>

                <p>CEP: ${address.zip || "-"}</p>
            </section>

            <section class="account-panel">
                <h3>Resumo</h3>

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

        </div>
    `;
};

Account.orderTimelineTemplate = function (order, history) {
    const steps = [
        {
            key: "received",
            label: "Pedido recebido",
            active: true
        },
        {
            key: "paid",
            label: "Pagamento aprovado",
            active:
                order.payment_status === "approved" ||
                order.status === "approved" ||
                order.status === "production" ||
                order.status === "sent" ||
                order.status === "delivered"
        },
        {
            key: "production",
            label: "Em produção",
            active:
                order.production_status === "in_production" ||
                order.production_status === "completed" ||
                order.status === "production" ||
                order.status === "sent" ||
                order.status === "delivered"
        },
        {
            key: "finished",
            label: "Produção concluída",
            active:
                order.production_status === "completed" ||
                order.production_status === "finished" ||
                order.status === "sent" ||
                order.status === "delivered"
        },
        {
            key: "sent",
            label: "Enviado",
            active:
                order.shipping_status === "shipped" ||
                order.status === "sent" ||
                order.status === "delivered"
        },
        {
            key: "delivered",
            label: "Entregue",
            active:
                order.shipping_status === "delivered" ||
                order.status === "delivered"
        }
    ];

    return `
        <div class="account-order-timeline">
            ${steps.map((step) => `
                <div class="account-timeline-step ${step.active ? "active" : ""}">
                    <span>${step.active ? "✓" : ""}</span>
                    <p>${step.label}</p>
                </div>
            `).join("")}
        </div>
    `;
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
            });
        });
});
