/* ==========================================================
   MugArt Pedidos Pro v1
   Arquivo: admin/js/pedidos/pedidos-pro.js
========================================================== */

const OrderStatusLabels = {
  pending: "🟡 Aguardando pagamento",
  paid: "🟢 Pago",
  art_approval: "🟣 Arte em aprovação",
  production: "🔵 Produção",
  quality: "🟠 Controle de qualidade",
  packing: "🟤 Embalagem",
  shipped: "🚚 Enviado",
  delivered: "✅ Entregue",
  completed: "✅ Finalizado",
  cancelled: "❌ Cancelado",
  refunded: "↩ Reembolsado"
};

const PaymentStatusLabels = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  refunded: "Reembolsado"
};

const OrdersState = {
  orders: [],
  products: [],
  currentOrder: null,
  currentItems: [],
  filters: {
    search: "",
    status: "todos",
    payment: "todos",
    period: "todos"
  }
};

function po(selector) {
  return document.querySelector(selector);
}

function poAll(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function poMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function generateOrderNumber() {
  return "MUG-" + Date.now();
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.mugartSupabase) {
    alert("Supabase não carregou.");
    return;
  }

  bindOrderEvents();
  await loadOrdersData();
  renderOrdersPage();
});

function bindOrderEvents() {
  po("#newManualOrderBtn")?.addEventListener("click", openNewOrderDrawer);
  po("#refreshOrdersBtn")?.addEventListener("click", async () => {
    await loadOrdersData();
    renderOrdersPage();
  });

  po("#closeOrderDrawer")?.addEventListener("click", closeOrderDrawer);
  po("#cancelOrderBtn")?.addEventListener("click", closeOrderDrawer);
  po("#orderOverlay")?.addEventListener("click", closeOrderDrawer);

  po("#ordersSearch")?.addEventListener("input", (event) => {
    OrdersState.filters.search = event.target.value;
    renderOrders();
  });

  po("#ordersStatusFilter")?.addEventListener("change", (event) => {
    OrdersState.filters.status = event.target.value;
    renderOrders();
  });

  po("#ordersPaymentFilter")?.addEventListener("change", (event) => {
    OrdersState.filters.payment = event.target.value;
    renderOrders();
  });

  po("#ordersPeriodFilter")?.addEventListener("change", (event) => {
    OrdersState.filters.period = event.target.value;
    renderOrders();
  });

  poAll(".order-tab").forEach((button) => {
    button.addEventListener("click", () => {
      poAll(".order-tab").forEach((item) => item.classList.remove("active"));
      poAll(".order-tab-panel").forEach((item) => item.classList.remove("active"));

      button.classList.add("active");
      po(`#order-tab-${button.dataset.tab}`).classList.add("active");
    });
  });

  po("#orderForm")?.addEventListener("submit", saveOrder);
  po("#addOrderItemBtn")?.addEventListener("click", addOrderItemFromSelect);
  po("#addInternalNoteBtn")?.addEventListener("click", addInternalNote);

  ["#orderDiscount", "#orderShipping"].forEach((selector) => {
    po(selector)?.addEventListener("input", updateOrderTotalPreview);
  });

  po("#shippingZip")?.addEventListener("input", handleCepInput);
  po("#shippingZip")?.addEventListener("blur", searchCepAndFillAddress);
}

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCep(value) {
  const numbers = onlyNumbers(value).slice(0, 8);

  if (numbers.length > 5) {
    return numbers.slice(0, 5) + "-" + numbers.slice(5);
  }

  return numbers;
}

function handleCepInput(event) {
  event.target.value = formatCep(event.target.value);

  const cep = onlyNumbers(event.target.value);

  if (cep.length === 8) {
    searchCepAndFillAddress();
  }
}

async function searchCepAndFillAddress() {
  const zipInput = po("#shippingZip");
  const cep = onlyNumbers(zipInput?.value);

  if (!cep || cep.length !== 8) return;

  const oldPlaceholder = zipInput.placeholder;
  zipInput.placeholder = "Buscando CEP...";

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (data.erro) {
      alert("CEP não encontrado.");
      return;
    }

    po("#shippingStreet").value = data.logradouro || "";
    po("#shippingNeighborhood").value = data.bairro || "";
    po("#shippingCity").value = data.localidade || "";
    po("#shippingState").value = data.uf || "";

    if (po("#shippingComplement") && data.complemento) {
      po("#shippingComplement").value = data.complemento;
    }

    po("#shippingNumber")?.focus();
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    alert("Não foi possível buscar o CEP agora.");
  } finally {
    zipInput.placeholder = oldPlaceholder || "00000-000";
  }
}

async function loadOrdersData() {
  const ordersResult = await mugartSupabase
    .from("orders")
    .select(`
      *,
      customers (
        id,
        name,
        email,
        phone
      ),
      order_items (
        *
      ),
      order_addresses (
        *
      ),
      payments (
        *
      )
    `)
    .order("created_at", { ascending: false });

  if (ordersResult.error) {
    alert("Erro ao carregar pedidos: " + ordersResult.error.message);
    return;
  }

  OrdersState.orders = ordersResult.data || [];

  const productsResult = await mugartSupabase
    .from("products")
    .select(`
      *,
      categories (
        id,
        name
      )
    `)
    .eq("active", true)
    .order("name", { ascending: true });

  if (productsResult.error) {
    alert("Erro ao carregar produtos: " + productsResult.error.message);
    return;
  }

  OrdersState.products = productsResult.data || [];
}

function renderOrdersPage() {
  renderProductOptions();
  renderMetrics();
  renderOrders();
}

function renderProductOptions() {
  const select = po("#orderProductSelect");
  if (!select) return;

  select.innerHTML = OrdersState.products.length
    ? OrdersState.products.map((product) => `
      <option value="${product.id}">
        ${product.name} - ${poMoney(product.price)}
      </option>
    `).join("")
    : `<option value="">Nenhum produto ativo</option>`;
}

function renderMetrics() {
  const today = new Date().toISOString().slice(0, 10);

  const todayOrders = OrdersState.orders.filter((order) => {
    return new Date(order.created_at).toISOString().slice(0, 10) === today;
  });

  const revenueToday = todayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pendingPayment = OrdersState.orders.filter((order) => order.payment_status === "pending").length;
  const production = OrdersState.orders.filter((order) => ["production", "quality", "packing"].includes(order.status)).length;
  const avg = todayOrders.length ? revenueToday / todayOrders.length : 0;

  po("#ordersTodayMetric").textContent = todayOrders.length;
  po("#revenueTodayMetric").textContent = poMoney(revenueToday);
  po("#pendingPaymentMetric").textContent = pendingPayment;
  po("#productionMetric").textContent = production;
  po("#averageTicketMetric").textContent = poMoney(avg);
}

function getFilteredOrders() {
  const search = OrdersState.filters.search.toLowerCase();
  const status = OrdersState.filters.status;
  const payment = OrdersState.filters.payment;
  const period = OrdersState.filters.period;

  const now = new Date();

  return OrdersState.orders.filter((order) => {
    const matchesSearch =
      !search ||
      (order.order_number || "").toLowerCase().includes(search) ||
      (order.customer_name || "").toLowerCase().includes(search) ||
      (order.customer_email || "").toLowerCase().includes(search) ||
      (order.customer_phone || "").toLowerCase().includes(search);

    const matchesStatus = status === "todos" || order.status === status;
    const matchesPayment = payment === "todos" || order.payment_status === payment;

    let matchesPeriod = true;
    const orderDate = new Date(order.created_at);

    if (period === "today") {
      matchesPeriod = orderDate.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
    }

    if (period === "7days") {
      const diff = (now - orderDate) / (1000 * 60 * 60 * 24);
      matchesPeriod = diff <= 7;
    }

    if (period === "30days") {
      const diff = (now - orderDate) / (1000 * 60 * 60 * 24);
      matchesPeriod = diff <= 30;
    }

    return matchesSearch && matchesStatus && matchesPayment && matchesPeriod;
  });
}

function renderOrders() {
  const board = po("#ordersBoard");
  if (!board) return;

  const orders = getFilteredOrders();

  if (!orders.length) {
    board.innerHTML = `<div class="orders-empty">Nenhum pedido encontrado.</div>`;
    return;
  }

  board.innerHTML = orders.map(orderCardTemplate).join("");
}

function orderCardTemplate(order) {
  const itemsCount = order.order_items ? order.order_items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : 0;
  const createdAt = new Date(order.created_at).toLocaleString("pt-BR");

  return `
    <article class="order-card" onclick="editOrder('${order.id}')">
      <div class="order-card-main">
        <div class="order-card-title">
          <h3>${order.order_number}</h3>
          <span>${createdAt}</span>
          <span class="order-status ${order.status || "pending"}">
            ${OrderStatusLabels[order.status] || order.status}
          </span>
        </div>

        <div class="order-card-customer">
          ${order.customer_name || order.customers?.name || "Cliente não informado"}
        </div>

        <div class="order-card-meta">
          <span class="order-chip">${itemsCount} item(ns)</span>
          <span class="order-chip">Pagamento: ${PaymentStatusLabels[order.payment_status] || order.payment_status || "-"}</span>
          <span class="order-chip">Método: ${order.payment_method || "-"}</span>
          ${order.tracking_code ? `<span class="order-chip">Rastreio: ${order.tracking_code}</span>` : ""}
        </div>
      </div>

      <div class="order-card-side">
        <div class="order-total">${poMoney(order.total)}</div>
        <div class="order-actions" onclick="event.stopPropagation()">
          <button class="edit" type="button" onclick="editOrder('${order.id}')">Abrir</button>
          <button class="delete" type="button" onclick="deleteOrderPro('${order.id}')">Excluir</button>
        </div>
      </div>
    </article>
  `;
}

function openNewOrderDrawer() {
  OrdersState.currentOrder = null;
  OrdersState.currentItems = [];

  po("#orderForm").reset();
  po("#orderId").value = "";
  po("#orderNumber").value = generateOrderNumber();
  po("#orderDrawerTitle").textContent = "Novo pedido";
  po("#orderDrawerSubtitle").textContent = "Pedido manual";
  po("#orderStatus").value = "pending";
  po("#paymentStatus").value = "pending";
  po("#productionStatus").value = "not_started";
  po("#shippingStatus").value = "not_shipped";
  po("#orderDiscount").value = "0";
  po("#orderShipping").value = "0";
  po("#orderItemsList").innerHTML = "";
  po("#orderHistoryList").innerHTML = "";
  updateOrderTotalPreview();

  openOrderDrawer();
}

function openOrderDrawer() {
  po("#orderDrawer").classList.add("open");
  po("#orderOverlay").classList.add("open");
}

function closeOrderDrawer() {
  po("#orderDrawer").classList.remove("open");
  po("#orderOverlay").classList.remove("open");
}

window.editOrder = async function(id) {
  const order = OrdersState.orders.find((item) => item.id === id);
  if (!order) return;

  OrdersState.currentOrder = order;
  OrdersState.currentItems = (order.order_items || []).map((item) => ({
    product_id: item.product_id,
    variant_id: item.variant_id,
    product_name: item.product_name,
    sku: item.sku,
    color: item.color,
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || 0),
    discount: Number(item.discount || 0),
    total: Number(item.total || 0)
  }));

  po("#orderId").value = order.id;
  po("#orderNumber").value = order.order_number || "";
  po("#orderDrawerTitle").textContent = order.order_number || "Pedido";
  po("#orderDrawerSubtitle").textContent = order.customer_name || order.customers?.name || "";
  po("#orderStatus").value = order.status || "pending";
  po("#productionStatus").value = order.production_status || "not_started";
  po("#orderNotes").value = order.notes || "";
  po("#orderCoupon").value = order.coupon || "";
  po("#orderDiscount").value = order.discount || 0;
  po("#orderShipping").value = order.shipping || 0;

  po("#customerName").value = order.customer_name || order.customers?.name || "";
  po("#customerPhone").value = order.customer_phone || order.customers?.phone || "";
  po("#customerEmail").value = order.customer_email || order.customers?.email || "";
  po("#customerDocument").value = order.cpf_cnpj || "";

  po("#paymentMethod").value = order.payment_method || "pix";
  po("#paymentStatus").value = order.payment_status || "pending";
  po("#paymentTransactionId").value = order.payments?.[0]?.transaction_id || "";

  const address = order.order_addresses?.[0] || {};
  po("#shippingZip").value = address.zip || "";
  po("#shippingStreet").value = address.street || "";
  po("#shippingNumber").value = address.number || "";
  po("#shippingComplement").value = address.complement || "";
  po("#shippingNeighborhood").value = address.neighborhood || "";
  po("#shippingCity").value = address.city || "";
  po("#shippingState").value = address.state || "";
  po("#shippingCarrier").value = order.carrier || "";
  po("#trackingCode").value = order.tracking_code || "";
  po("#shippingStatus").value = order.shipping_status || "not_shipped";

  renderOrderItems();
  updateOrderTotalPreview();
  await renderOrderHistory(order.id);

  openOrderDrawer();
};

function addOrderItemFromSelect() {
  const productId = po("#orderProductSelect").value;
  const qty = Number(po("#orderItemQty").value || 1);
  const product = OrdersState.products.find((item) => item.id === productId);

  if (!product) {
    alert("Selecione um produto.");
    return;
  }

  const existing = OrdersState.currentItems.find((item) => item.product_id === productId && !item.variant_id);

  if (existing) {
    existing.quantity += qty;
    existing.total = existing.quantity * existing.unit_price;
  } else {
    OrdersState.currentItems.push({
      product_id: product.id,
      variant_id: null,
      product_name: product.name,
      sku: product.sku,
      color: product.color,
      quantity: qty,
      unit_price: Number(product.price || 0),
      discount: 0,
      total: qty * Number(product.price || 0)
    });
  }

  renderOrderItems();
  updateOrderTotalPreview();
}

function renderOrderItems() {
  const list = po("#orderItemsList");
  if (!list) return;

  if (!OrdersState.currentItems.length) {
    list.innerHTML = `<div class="orders-empty">Nenhum item adicionado.</div>`;
    return;
  }

  list.innerHTML = OrdersState.currentItems.map((item, index) => `
    <div class="order-item-row">
      <div>
        <h4>${item.product_name}</h4>
        <small>${item.sku || "-"} ${item.color ? "• " + item.color : ""} • Qtd: ${item.quantity}</small>
      </div>
      <strong>${poMoney(item.total)}</strong>
      <button type="button" onclick="removeOrderItem(${index})">Remover</button>
    </div>
  `).join("");
}

window.removeOrderItem = function(index) {
  OrdersState.currentItems.splice(index, 1);
  renderOrderItems();
  updateOrderTotalPreview();
};

function calculateSubtotal() {
  return OrdersState.currentItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
}

function calculateTotal() {
  const subtotal = calculateSubtotal();
  const discount = Number(po("#orderDiscount")?.value || 0);
  const shipping = Number(po("#orderShipping")?.value || 0);

  return Math.max(0, subtotal - discount + shipping);
}

function updateOrderTotalPreview() {
  po("#orderSubtotalPreview").textContent = poMoney(calculateSubtotal());
  po("#orderTotalPreview").textContent = poMoney(calculateTotal());
}

async function saveOrder(event) {
  event.preventDefault();

  if (!OrdersState.currentItems.length) {
    alert("Adicione ao menos um item ao pedido.");
    return;
  }

  const oldOrder = OrdersState.currentOrder;
  const orderId = po("#orderId").value;
  const subtotal = calculateSubtotal();
  const discount = Number(po("#orderDiscount").value || 0);
  const shipping = Number(po("#orderShipping").value || 0);
  const total = calculateTotal();

  const customerPayload = {
    name: po("#customerName").value.trim(),
    email: po("#customerEmail").value.trim(),
    phone: po("#customerPhone").value.trim(),
    cpf_cnpj: po("#customerDocument").value.trim(),
    zip: po("#shippingZip").value.trim(),
    address: po("#shippingStreet").value.trim(),
    city: po("#shippingCity").value.trim(),
    state: po("#shippingState").value.trim()
  };

  let customerId = oldOrder?.customer_id || null;

  if (customerId) {
    await mugartSupabase
      .from("customers")
      .update(customerPayload)
      .eq("id", customerId);
  } else {
    const customerResult = await mugartSupabase
      .from("customers")
      .insert(customerPayload)
      .select()
      .single();

    if (customerResult.error) {
      alert("Erro ao salvar cliente: " + customerResult.error.message);
      return;
    }

    customerId = customerResult.data.id;
  }

  const orderPayload = {
    order_number: po("#orderNumber").value.trim() || generateOrderNumber(),
    customer_id: customerId,
    customer_name: customerPayload.name,
    customer_email: customerPayload.email,
    customer_phone: customerPayload.phone,
    cpf_cnpj: customerPayload.cpf_cnpj,
    status: po("#orderStatus").value,
    production_status: po("#productionStatus").value,
    payment_method: po("#paymentMethod").value,
    payment_status: po("#paymentStatus").value,
    shipping_status: po("#shippingStatus").value,
    subtotal: subtotal,
    discount: discount,
    shipping: shipping,
    total: total,
    coupon: po("#orderCoupon").value.trim(),
    notes: po("#orderNotes").value.trim(),
    tracking_code: po("#trackingCode").value.trim(),
    carrier: po("#shippingCarrier").value.trim()
  };

  let savedOrderId = orderId;

  if (orderId) {
    const updateResult = await mugartSupabase
      .from("orders")
      .update(orderPayload)
      .eq("id", orderId);

    if (updateResult.error) {
      alert("Erro ao atualizar pedido: " + updateResult.error.message);
      return;
    }
  } else {
    const insertResult = await mugartSupabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();

    if (insertResult.error) {
      alert("Erro ao criar pedido: " + insertResult.error.message);
      return;
    }

    savedOrderId = insertResult.data.id;
  }

  await replaceOrderItems(savedOrderId);
  await upsertOrderAddress(savedOrderId, customerPayload);
  await upsertPayment(savedOrderId, total);
  await registerHistory(savedOrderId, oldOrder, orderPayload);

  await loadOrdersData();
  renderOrdersPage();

  alert("Pedido salvo com sucesso.");
  closeOrderDrawer();
}

async function replaceOrderItems(orderId) {
  await mugartSupabase
    .from("order_items")
    .delete()
    .eq("order_id", orderId);

  const rows = OrdersState.currentItems.map((item) => ({
    order_id: orderId,
    product_id: item.product_id,
    variant_id: item.variant_id,
    product_name: item.product_name,
    sku: item.sku,
    color: item.color,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount: item.discount || 0,
    total: item.total
  }));

  const result = await mugartSupabase
    .from("order_items")
    .insert(rows);

  if (result.error) {
    alert("Erro ao salvar itens: " + result.error.message);
  }
}

async function upsertOrderAddress(orderId, customerPayload) {
  await mugartSupabase
    .from("order_addresses")
    .delete()
    .eq("order_id", orderId);

  await mugartSupabase
    .from("order_addresses")
    .insert({
      order_id: orderId,
      recipient_name: customerPayload.name,
      phone: customerPayload.phone,
      zip: po("#shippingZip").value.trim(),
      street: po("#shippingStreet").value.trim(),
      number: po("#shippingNumber").value.trim(),
      complement: po("#shippingComplement").value.trim(),
      neighborhood: po("#shippingNeighborhood").value.trim(),
      city: po("#shippingCity").value.trim(),
      state: po("#shippingState").value.trim(),
      country: "Brasil"
    });
}

async function upsertPayment(orderId, amount) {
  await mugartSupabase
    .from("payments")
    .delete()
    .eq("order_id", orderId);

  await mugartSupabase
    .from("payments")
    .insert({
      order_id: orderId,
      provider: "manual",
      method: po("#paymentMethod").value,
      status: po("#paymentStatus").value,
      transaction_id: po("#paymentTransactionId").value.trim(),
      amount: amount,
      paid_at: po("#paymentStatus").value === "paid" ? new Date().toISOString() : null
    });
}

async function registerHistory(orderId, oldOrder, newOrder) {
  const events = [];

  if (!oldOrder) {
    events.push({
      order_id: orderId,
      event_type: "created",
      new_value: newOrder.status,
      note: "Pedido criado manualmente pelo painel."
    });
  } else {
    if (oldOrder.status !== newOrder.status) {
      events.push({
        order_id: orderId,
        event_type: "status_changed",
        old_value: oldOrder.status,
        new_value: newOrder.status,
        note: `Status alterado para ${OrderStatusLabels[newOrder.status] || newOrder.status}.`
      });
    }

    if (oldOrder.payment_status !== newOrder.payment_status) {
      events.push({
        order_id: orderId,
        event_type: "payment_changed",
        old_value: oldOrder.payment_status,
        new_value: newOrder.payment_status,
        note: `Pagamento alterado para ${PaymentStatusLabels[newOrder.payment_status] || newOrder.payment_status}.`
      });
    }

    if (oldOrder.tracking_code !== newOrder.tracking_code && newOrder.tracking_code) {
      events.push({
        order_id: orderId,
        event_type: "tracking_added",
        old_value: oldOrder.tracking_code,
        new_value: newOrder.tracking_code,
        note: `Código de rastreio adicionado: ${newOrder.tracking_code}.`
      });
    }
  }

  if (events.length) {
    await mugartSupabase
      .from("order_history")
      .insert(events);
  }
}

async function renderOrderHistory(orderId) {
  const result = await mugartSupabase
    .from("order_history")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  const notesResult = await mugartSupabase
    .from("order_notes")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  const list = po("#orderHistoryList");

  if (!list) return;

  const history = result.data || [];
  const notes = notesResult.data || [];

  const merged = [
    ...history.map((item) => ({ ...item, type: "history" })),
    ...notes.map((item) => ({ ...item, type: "note", event_type: "note_added" }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  list.innerHTML = merged.length
    ? merged.map((item) => `
      <div class="history-item">
        <strong>${historyLabel(item.event_type)}</strong>
        <span>${new Date(item.created_at).toLocaleString("pt-BR")}</span>
        <p>${item.note || "-"}</p>
      </div>
    `).join("")
    : `<div class="orders-empty">Nenhum histórico ainda.</div>`;
}

function historyLabel(type) {
  const labels = {
    created: "Pedido criado",
    status_changed: "Status alterado",
    payment_changed: "Pagamento alterado",
    tracking_added: "Rastreio adicionado",
    note_added: "Observação interna"
  };

  return labels[type] || type;
}

async function addInternalNote() {
  const orderId = po("#orderId").value;
  const note = po("#internalNote").value.trim();

  if (!orderId) {
    alert("Salve o pedido antes de adicionar observações.");
    return;
  }

  if (!note) return;

  const result = await mugartSupabase
    .from("order_notes")
    .insert({
      order_id: orderId,
      note: note,
      created_by: "admin"
    });

  if (result.error) {
    alert("Erro ao adicionar observação: " + result.error.message);
    return;
  }

  po("#internalNote").value = "";
  await renderOrderHistory(orderId);
}

window.deleteOrderPro = async function(id) {
  if (!confirm("Deseja excluir este pedido?")) return;

  const result = await mugartSupabase
    .from("orders")
    .delete()
    .eq("id", id);

  if (result.error) {
    alert("Erro ao excluir pedido: " + result.error.message);
    return;
  }

  await loadOrdersData();
  renderOrdersPage();
};
