(() => {
  "use strict";

  /*
   * =========================================================
   * CONFIGURAÇÕES
   * =========================================================
   *
   * Caso os nomes das colunas no seu Supabase sejam diferentes,
   * altere apenas este objeto.
   */

  const DASHBOARD_CONFIG = {
    autoRefreshMilliseconds: 30000,
    lowStockLimit: 5,

    tables: {
      orders: "orders",
      orderItems: "order_items",
      products: "products",
      customers: "customers"
    },

    columns: {
      orders: {
        id: "id",
        number: "order_number",
        total: "total",
        status: "status",
        paymentStatus: "payment_status",
        createdAt: "created_at",
        customerId: "customer_id",
        customerName: "customer_name",
        customerEmail: "customer_email",
        couponCode: "coupon",
        discount: "discount"
      },

      orderItems: {
        id: "id",
        orderId: "order_id",
        productId: "product_id",
        productName: "product_name",
        quantity: "quantity",
        unitPrice: "unit_price",
        total: "total"
        image: "image_url",
      },

      products: {
        id: "id",
        name: "name",
        sku: "sku",
        image: "image_url",
        stock: "stock",
        active: "active"
      },

      customers: {
        id: "id",
        name: "name",
        email: "email",
        createdAt: "created_at"
      }
    },

    approvedPaymentStatuses: [
      "approved",
      "paid",
      "pago",
      "aprovado"
    ],

    cancelledOrderStatuses: [
      "cancelled",
      "canceled",
      "cancelado",
      "rejected",
      "rejeitado",
      "failed"
    ],

    pendingOrderStatuses: [
      "pending",
      "pendente",
      "awaiting_payment",
      "aguardando_pagamento"
    ]
  };

  const state = {
    period: "30days",
    startDate: null,
    endDate: null,
    previousStartDate: null,
    previousEndDate: null,
    revenueChart: null,
    orderStatusChart: null,
    autoRefreshTimer: null,
    isLoading: false
  };

  const elements = {};

  /*
   * =========================================================
   * INICIALIZAÇÃO
   * =========================================================
   */

  document.addEventListener("DOMContentLoaded", initializeDashboard);

  async function initializeDashboard() {
    cacheElements();
    configureEvents();

    try {
      getSupabaseClient();
      await loadAdminInformation();
      calculatePeriod("30days");
      await loadDashboard();

      startAutoRefresh();
    } catch (error) {
      console.error("Erro ao inicializar dashboard:", error);

      showToast(
        error?.message || "Não foi possível carregar o dashboard.",
        "error"
      );

      hideLoading();
    }
  }

  function cacheElements() {
    elements.loading = document.getElementById("dashboard-loading");

    elements.sidebar = document.getElementById("admin-sidebar");
    elements.sidebarOverlay = document.getElementById("sidebar-overlay");
    elements.openSidebar = document.getElementById("open-sidebar");
    elements.closeSidebar = document.getElementById("close-sidebar");

    elements.refreshButton = document.getElementById("refresh-dashboard");
    elements.logoutButton = document.getElementById("admin-logout-button");

    elements.lastUpdateText = document.getElementById("last-update-text");
    elements.adminUserEmail = document.getElementById("admin-user-email");

    elements.periodButtons = document.querySelectorAll(".period-button");

    elements.customPeriodContainer = document.getElementById(
      "custom-period-container"
    );

    elements.customStartDate = document.getElementById("custom-start-date");
    elements.customEndDate = document.getElementById("custom-end-date");
    elements.applyCustomPeriod = document.getElementById(
      "apply-custom-period"
    );

    elements.kpiRevenue = document.getElementById("kpi-revenue");
    elements.kpiRevenueComparison = document.getElementById(
      "kpi-revenue-comparison"
    );

    elements.kpiTodayRevenue = document.getElementById(
      "kpi-today-revenue"
    );

    elements.kpiTodayOrders = document.getElementById(
      "kpi-today-orders"
    );

    elements.kpiOrders = document.getElementById("kpi-orders");

    elements.kpiOrdersComparison = document.getElementById(
      "kpi-orders-comparison"
    );

    elements.kpiAverageTicket = document.getElementById(
      "kpi-average-ticket"
    );

    elements.kpiTicketComparison = document.getElementById(
      "kpi-ticket-comparison"
    );

    elements.kpiProductsSold = document.getElementById(
      "kpi-products-sold"
    );

    elements.kpiProductsComparison = document.getElementById(
      "kpi-products-comparison"
    );

    elements.kpiCustomers = document.getElementById("kpi-customers");

    elements.kpiNewCustomers = document.getElementById(
      "kpi-new-customers"
    );

    elements.kpiCoupons = document.getElementById("kpi-coupons");

    elements.kpiCouponValue = document.getElementById(
      "kpi-coupon-value"
    );

    elements.kpiLowStock = document.getElementById("kpi-low-stock");

    elements.chartRevenueTotal = document.getElementById(
      "chart-revenue-total"
    );

    elements.revenueChartCanvas = document.getElementById(
      "revenue-chart"
    );

    elements.orderStatusChartCanvas = document.getElementById(
      "order-status-chart"
    );

    elements.orderStatusLegend = document.getElementById(
      "order-status-legend"
    );

    elements.bestProductsTable = document.getElementById(
      "best-products-table"
    );

    elements.latestOrdersTable = document.getElementById(
      "latest-orders-table"
    );

    elements.stockAlertList = document.getElementById(
      "stock-alert-list"
    );

    elements.sidebarPendingOrders = document.getElementById(
      "sidebar-pending-orders"
    );

    elements.toast = document.getElementById("dashboard-toast");
    elements.toastMessage = document.getElementById(
      "dashboard-toast-message"
    );
  }

  function configureEvents() {
    elements.openSidebar?.addEventListener("click", openSidebar);
    elements.closeSidebar?.addEventListener("click", closeSidebar);
    elements.sidebarOverlay?.addEventListener("click", closeSidebar);

    elements.refreshButton?.addEventListener("click", async () => {
      await loadDashboard({
        showSuccessMessage: true
      });
    });

    elements.periodButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const period = button.dataset.period;

        activatePeriodButton(period);

        if (period === "custom") {
          elements.customPeriodContainer.classList.remove("hidden");
          prepareDefaultCustomDates();
          return;
        }

        elements.customPeriodContainer.classList.add("hidden");

        state.period = period;
        calculatePeriod(period);

        await loadDashboard();
      });
    });

    elements.applyCustomPeriod?.addEventListener("click", async () => {
      const start = elements.customStartDate.value;
      const end = elements.customEndDate.value;

      if (!start || !end) {
        showToast(
          "Informe a data inicial e a data final.",
          "error"
        );

        return;
      }

      const startDate = startOfDay(new Date(`${start}T00:00:00`));
      const endDate = endOfDay(new Date(`${end}T23:59:59`));

      if (startDate > endDate) {
        showToast(
          "A data inicial não pode ser maior que a data final.",
          "error"
        );

        return;
      }

      state.period = "custom";
      calculateCustomPeriod(startDate, endDate);

      await loadDashboard();
    });

    elements.logoutButton?.addEventListener("click", logoutAdmin);

    window.addEventListener("resize", () => {
      if (window.innerWidth > 980) {
        closeSidebar();
      }
    });
  }

  /*
   * =========================================================
   * SUPABASE
   * =========================================================
   */

  function getSupabaseClient() {
    if (
      typeof supabaseClient !== "undefined" &&
      supabaseClient?.from
    ) {
      return supabaseClient;
    }

    if (window.supabaseClient?.from) {
      return window.supabaseClient;
    }

    if (window.sb?.from) {
      return window.sb;
    }

    throw new Error(
      "Cliente do Supabase não encontrado. Verifique o arquivo supabase-config.js."
    );
  }

  async function loadAdminInformation() {
    const client = getSupabaseClient();

    const {
      data: { session },
      error
    } = await client.auth.getSession();

    if (error) {
      throw error;
    }

    if (!session?.user) {
      window.location.href = "/admin/login.html";
      return;
    }

    if (elements.adminUserEmail) {
      elements.adminUserEmail.textContent =
        session.user.email || "Administrador";
    }
  }

  async function logoutAdmin() {
    try {
      const client = getSupabaseClient();

      await client.auth.signOut();

      window.location.href = "/admin/login.html";
    } catch (error) {
      console.error("Erro ao sair:", error);
      showToast("Não foi possível sair do painel.", "error");
    }
  }

  /*
   * =========================================================
   * CARREGAMENTO PRINCIPAL
   * =========================================================
   */

  async function loadDashboard(options = {}) {
    if (state.isLoading) {
      return;
    }

    state.isLoading = true;
    setRefreshLoading(true);

    try {
      const [
        currentOrders,
        previousOrders,
        todayOrders,
        currentOrderItems,
        previousOrderItems,
        products,
        customers
      ] = await Promise.all([
        fetchOrders(state.startDate, state.endDate),
        fetchOrders(state.previousStartDate, state.previousEndDate),
        fetchOrders(startOfDay(new Date()), endOfDay(new Date())),
        fetchOrderItems(state.startDate, state.endDate),
        fetchOrderItems(
          state.previousStartDate,
          state.previousEndDate
        ),
        fetchProducts(),
        fetchCustomers()
      ]);

      const currentApprovedOrders =
        filterRevenueOrders(currentOrders);

      const previousApprovedOrders =
        filterRevenueOrders(previousOrders);

      const todayApprovedOrders =
        filterRevenueOrders(todayOrders);

      const currentOrderIds = new Set(
        currentApprovedOrders.map((order) => String(order.id))
      );

      const previousOrderIds = new Set(
        previousApprovedOrders.map((order) => String(order.id))
      );

      const approvedCurrentItems = currentOrderItems.filter((item) =>
        currentOrderIds.has(String(item.orderId))
      );

      const approvedPreviousItems = previousOrderItems.filter((item) =>
        previousOrderIds.has(String(item.orderId))
      );

      const dashboardData = buildDashboardData({
        currentOrders,
        previousOrders,
        currentApprovedOrders,
        previousApprovedOrders,
        todayApprovedOrders,
        approvedCurrentItems,
        approvedPreviousItems,
        products,
        customers
      });

      renderDashboard(dashboardData);

      updateLastUpdate();

      if (options.showSuccessMessage) {
        showToast("Dashboard atualizado com sucesso.", "success");
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);

      showToast(
        error?.message ||
          "Ocorreu um erro ao buscar os dados do Supabase.",
        "error"
      );
    } finally {
      state.isLoading = false;
      setRefreshLoading(false);
      hideLoading();
    }
  }

  /*
   * =========================================================
   * CONSULTAS
   * =========================================================
   */

  async function fetchOrders(startDate, endDate) {
    const client = getSupabaseClient();
    const config = DASHBOARD_CONFIG.columns.orders;

    const selectColumns = [
      config.id,
      config.number,
      config.total,
      config.status,
      config.paymentStatus,
      config.createdAt,
      config.customerId,
      config.customerName,
      config.customerEmail,
      config.couponCode,
      config.discount
    ]
      .filter(Boolean)
      .join(",");

    let query = client
      .from(DASHBOARD_CONFIG.tables.orders)
      .select(selectColumns)
      .gte(config.createdAt, startDate.toISOString())
      .lte(config.createdAt, endDate.toISOString())
      .order(config.createdAt, {
        ascending: false
      });

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `Erro ao carregar pedidos: ${error.message}`
      );
    }

    return (data || []).map(normalizeOrder);
  }

  async function fetchOrderItems(startDate, endDate) {
    const client = getSupabaseClient();

    /*
     * Primeiro buscamos os pedidos do período.
     * Depois buscamos os itens pertencentes a esses pedidos.
     */

    const orders = await fetchOrders(startDate, endDate);
    const orderIds = orders.map((order) => order.id).filter(Boolean);

    if (!orderIds.length) {
      return [];
    }

    const config = DASHBOARD_CONFIG.columns.orderItems;

    const selectColumns = [
      config.id,
      config.orderId,
      config.productId,
      config.productName,
      config.quantity,
      config.unitPrice,
      config.total,
      config.image
    ]
      .filter(Boolean)
      .join(",");

    const { data, error } = await client
      .from(DASHBOARD_CONFIG.tables.orderItems)
      .select(selectColumns)
      .in(config.orderId, orderIds);

    if (error) {
      throw new Error(
        `Erro ao carregar itens dos pedidos: ${error.message}`
      );
    }

    return (data || []).map(normalizeOrderItem);
  }

  async function fetchProducts() {
    const client = getSupabaseClient();
    const config = DASHBOARD_CONFIG.columns.products;

    const selectColumns = [
      config.id,
      config.name,
      config.sku,
      config.image,
      config.stock,
      config.active
    ]
      .filter(Boolean)
      .join(",");

    const { data, error } = await client
      .from(DASHBOARD_CONFIG.tables.products)
      .select(selectColumns)
      .order(config.name, {
        ascending: true
      });

    if (error) {
      throw new Error(
        `Erro ao carregar produtos: ${error.message}`
      );
    }

    return (data || []).map(normalizeProduct);
  }

  async function fetchCustomers() {
    const client = getSupabaseClient();
    const config = DASHBOARD_CONFIG.columns.customers;

    const selectColumns = [
      config.id,
      config.name,
      config.email,
      config.createdAt
    ]
      .filter(Boolean)
      .join(",");

    const { data, error } = await client
      .from(DASHBOARD_CONFIG.tables.customers)
      .select(selectColumns);

    if (error) {
      throw new Error(
        `Erro ao carregar clientes: ${error.message}`
      );
    }

    return (data || []).map(normalizeCustomer);
  }

  /*
   * =========================================================
   * NORMALIZAÇÃO
   * =========================================================
   */

  function normalizeOrder(rawOrder) {
    const config = DASHBOARD_CONFIG.columns.orders;

    return {
      id: rawOrder[config.id],
      number:
        rawOrder[config.number] ||
        createShortOrderNumber(rawOrder[config.id]),

      total: parseMoney(rawOrder[config.total]),
      status: normalizeText(rawOrder[config.status]),
      paymentStatus: normalizeText(
        rawOrder[config.paymentStatus]
      ),

      createdAt: rawOrder[config.createdAt],
      customerId: rawOrder[config.customerId],
      customerName:
        rawOrder[config.customerName] || "Cliente não informado",

      customerEmail: rawOrder[config.customerEmail] || "",
      couponCode: rawOrder[config.couponCode] || "",
      discount: parseMoney(rawOrder[config.discount])
    };
  }

  function normalizeOrderItem(rawItem) {
    const config = DASHBOARD_CONFIG.columns.orderItems;

    const quantity = Number(rawItem[config.quantity]) || 0;
    const unitPrice = parseMoney(rawItem[config.unitPrice]);

    const informedTotal = parseMoney(rawItem[config.total]);

    rreturn {
  id: rawItem[config.id],
  orderId: rawItem[config.orderId],
  productId: rawItem[config.productId],

  productName:
    rawItem[config.productName] ||
    "Produto não informado",

  image: rawItem[config.image] || "",

  quantity,
  unitPrice,

  total:
    informedTotal ||
    quantity * unitPrice
};

  function normalizeProduct(rawProduct) {
    const config = DASHBOARD_CONFIG.columns.products;

    return {
      id: rawProduct[config.id],
      name: rawProduct[config.name] || "Produto sem nome",
      sku: rawProduct[config.sku] || "",
      image: rawProduct[config.image] || "",
      stock: Number(rawProduct[config.stock]) || 0,
      active:
        rawProduct[config.active] === undefined
          ? true
          : Boolean(rawProduct[config.active])
    };
  }

  function normalizeCustomer(rawCustomer) {
    const config = DASHBOARD_CONFIG.columns.customers;

    return {
      id: rawCustomer[config.id],
      name: rawCustomer[config.name] || "Cliente",
      email: rawCustomer[config.email] || "",
      createdAt: rawCustomer[config.createdAt]
    };
  }

  /*
   * =========================================================
   * CÁLCULOS
   * =========================================================
   */

  function buildDashboardData({
    currentOrders,
    previousOrders,
    currentApprovedOrders,
    previousApprovedOrders,
    todayApprovedOrders,
    approvedCurrentItems,
    approvedPreviousItems,
    products,
    customers
  }) {
    const currentRevenue = sum(
      currentApprovedOrders.map((order) => order.total)
    );

    const previousRevenue = sum(
      previousApprovedOrders.map((order) => order.total)
    );

    const todayRevenue = sum(
      todayApprovedOrders.map((order) => order.total)
    );

    const currentOrderCount = currentApprovedOrders.length;
    const previousOrderCount = previousApprovedOrders.length;

    const currentAverageTicket = currentOrderCount
      ? currentRevenue / currentOrderCount
      : 0;

    const previousAverageTicket = previousOrderCount
      ? previousRevenue / previousOrderCount
      : 0;

    const currentProductsSold = sum(
      approvedCurrentItems.map((item) => item.quantity)
    );

    const previousProductsSold = sum(
      approvedPreviousItems.map((item) => item.quantity)
    );

    const newCustomers = customers.filter((customer) => {
      if (!customer.createdAt) {
        return false;
      }

      const date = new Date(customer.createdAt);

      return date >= state.startDate && date <= state.endDate;
    });

    const couponOrders = currentApprovedOrders.filter(
      (order) => order.couponCode
    );

    const couponDiscount = sum(
      couponOrders.map((order) => order.discount)
    );

    const lowStockProducts = products
      .filter(
        (product) =>
          product.active &&
          product.stock <= DASHBOARD_CONFIG.lowStockLimit
      )
      .sort((a, b) => a.stock - b.stock);

    return {
      metrics: {
        revenue: currentRevenue,
        revenueComparison: calculatePercentageChange(
          currentRevenue,
          previousRevenue
        ),

        todayRevenue,
        todayOrders: todayApprovedOrders.length,

        orders: currentOrderCount,
        ordersComparison: calculatePercentageChange(
          currentOrderCount,
          previousOrderCount
        ),

        averageTicket: currentAverageTicket,
        averageTicketComparison: calculatePercentageChange(
          currentAverageTicket,
          previousAverageTicket
        ),

        productsSold: currentProductsSold,
        productsSoldComparison: calculatePercentageChange(
          currentProductsSold,
          previousProductsSold
        ),

        customers: customers.length,
        newCustomers: newCustomers.length,

        coupons: couponOrders.length,
        couponDiscount,

        lowStock: lowStockProducts.length
      },

      revenueSeries: buildRevenueSeries(currentApprovedOrders),

      orderStatus: buildOrderStatus(currentOrders),

      bestProducts: buildBestProducts(
        approvedCurrentItems,
        products
      ),

      latestOrders: currentOrders.slice(0, 10),

      lowStockProducts
    };
  }

  function filterRevenueOrders(orders) {
  return orders.filter((order) => {
    const paymentStatus = normalizeText(order.paymentStatus);
    const orderStatus = normalizeText(order.status);

    const cancelledStatuses = [
      "cancelled",
      "canceled",
      "cancelado",
      "rejected",
      "rejeitado",
      "failed"
    ];

    if (cancelledStatuses.includes(orderStatus)) {
      return false;
    }

    const approvedStatuses = [
      "approved",
      "paid",
      "pago",
      "aprovado"
    ];

    return (
      approvedStatuses.includes(paymentStatus) ||
      approvedStatuses.includes(orderStatus)
    );
  });
}

  function buildRevenueSeries(orders) {
    const days = enumerateDays(state.startDate, state.endDate);

    const valuesByDate = new Map(
      days.map((day) => [formatDateKey(day), 0])
    );

    orders.forEach((order) => {
      if (!order.createdAt) {
        return;
      }

      const dateKey = formatDateKey(new Date(order.createdAt));

      valuesByDate.set(
        dateKey,
        (valuesByDate.get(dateKey) || 0) + order.total
      );
    });

    return days.map((day) => {
      const key = formatDateKey(day);

      return {
        date: day,
        label: formatChartDate(day),
        value: valuesByDate.get(key) || 0
      };
    });
  }

  function buildOrderStatus(orders) {
    const statusMap = new Map();

    orders.forEach((order) => {
      const status =
        normalizeText(order.status) || "não informado";

      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    return Array.from(statusMap.entries())
      .map(([status, value]) => ({
        status,
        label: formatStatusLabel(status),
        value
      }))
      .sort((a, b) => b.value - a.value);
  }

  function buildBestProducts(orderItems, products) {
    const productsById = new Map(
      products.map((product) => [
        String(product.id),
        product
      ])
    );

    const productSummary = new Map();

    orderItems.forEach((item) => {
      const key =
        item.productId !== null &&
        item.productId !== undefined
          ? String(item.productId)
          : item.productName;

      const product = productsById.get(String(item.productId));

      const existing = productSummary.get(key) || {
        id: item.productId,
        name:product?.name || item.productName || "Produto sem identificação",
        sku: product?.sku || "",
        image: product?.image || item.image || "",
        quantity: 0,
        revenue: 0
      };

      existing.quantity += item.quantity;
      existing.revenue += item.total;

      productSummary.set(key, existing);
    });

    return Array.from(productSummary.values())
      .sort((a, b) => {
        if (b.quantity !== a.quantity) {
          return b.quantity - a.quantity;
        }

        return b.revenue - a.revenue;
      })
      .slice(0, 8);
  }

  function calculatePercentageChange(current, previous) {
    if (previous === 0 && current === 0) {
      return 0;
    }

    if (previous === 0) {
      return 100;
    }

    return ((current - previous) / previous) * 100;
  }

  /*
   * =========================================================
   * RENDERIZAÇÃO
   * =========================================================
   */

  function renderDashboard(data) {
    renderMetrics(data.metrics);
    renderRevenueChart(data.revenueSeries);
    renderOrderStatusChart(data.orderStatus);
    renderBestProducts(data.bestProducts);
    renderLatestOrders(data.latestOrders);
    renderLowStock(data.lowStockProducts);
    renderSidebarPendingOrders(data.latestOrders);
  }

  function renderMetrics(metrics) {
    elements.kpiRevenue.textContent = formatCurrency(
      metrics.revenue
    );

    renderComparison(
      elements.kpiRevenueComparison,
      metrics.revenueComparison
    );

    elements.kpiTodayRevenue.textContent = formatCurrency(
      metrics.todayRevenue
    );

    elements.kpiTodayOrders.textContent = formatQuantityText(
      metrics.todayOrders,
      "pedido",
      "pedidos"
    );

    elements.kpiOrders.textContent = formatInteger(
      metrics.orders
    );

    renderComparison(
      elements.kpiOrdersComparison,
      metrics.ordersComparison
    );

    elements.kpiAverageTicket.textContent = formatCurrency(
      metrics.averageTicket
    );

    renderComparison(
      elements.kpiTicketComparison,
      metrics.averageTicketComparison
    );

    elements.kpiProductsSold.textContent = formatInteger(
      metrics.productsSold
    );

    renderComparison(
      elements.kpiProductsComparison,
      metrics.productsSoldComparison
    );

    elements.kpiCustomers.textContent = formatInteger(
      metrics.customers
    );

    elements.kpiNewCustomers.textContent = `${formatInteger(
      metrics.newCustomers
    )} novos`;

    elements.kpiCoupons.textContent = formatInteger(
      metrics.coupons
    );

    elements.kpiCouponValue.textContent = formatCurrency(
      metrics.couponDiscount
    );

    elements.kpiLowStock.textContent = formatInteger(
      metrics.lowStock
    );

    elements.chartRevenueTotal.textContent = formatCurrency(
      metrics.revenue
    );
  }

  function renderComparison(element, percentage) {
    if (!element) {
      return;
    }

    const rounded = Math.round(percentage * 10) / 10;
    const absoluteValue = Math.abs(rounded);

    element.classList.remove("positive", "negative", "neutral");

    if (rounded > 0) {
      element.classList.add("positive");
      element.textContent = `↑ ${formatDecimal(absoluteValue)}%`;
      return;
    }

    if (rounded < 0) {
      element.classList.add("negative");
      element.textContent = `↓ ${formatDecimal(absoluteValue)}%`;
      return;
    }

    element.classList.add("neutral");
    element.textContent = "0%";
  }

  function renderRevenueChart(series) {
    if (!elements.revenueChartCanvas) {
      return;
    }

    if (state.revenueChart) {
      state.revenueChart.destroy();
    }

    const context = elements.revenueChartCanvas.getContext("2d");

    const gradient = context.createLinearGradient(0, 0, 0, 320);

    gradient.addColorStop(0, "rgba(232, 62, 140, 0.35)");
    gradient.addColorStop(1, "rgba(232, 62, 140, 0)");

    state.revenueChart = new Chart(context, {
      type: "line",

      data: {
        labels: series.map((item) => item.label),

        datasets: [
          {
            label: "Faturamento",
            data: series.map((item) => item.value),
            borderColor: "#e83e8c",
            backgroundColor: gradient,
            fill: true,
            borderWidth: 2.5,
            tension: 0.35,
            pointRadius: series.length > 35 ? 0 : 3,
            pointHoverRadius: 6,
            pointBackgroundColor: "#e83e8c",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2
          }
        ]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
          mode: "index",
          intersect: false
        },

        plugins: {
          legend: {
            display: false
          },

          tooltip: {
            backgroundColor: "#202029",
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            borderColor: "rgba(255,255,255,0.12)",
            borderWidth: 1,
            padding: 12,

            callbacks: {
              label(context) {
                return ` ${formatCurrency(context.raw)}`;
              }
            }
          }
        },

        scales: {
          x: {
            grid: {
              display: false
            },

            ticks: {
              color: "#767681",
              maxTicksLimit: 10,
              font: {
                size: 10
              }
            },

            border: {
              display: false
            }
          },

          y: {
            beginAtZero: true,

            grid: {
              color: "rgba(255,255,255,0.055)"
            },

            ticks: {
              color: "#767681",
              font: {
                size: 10
              },

              callback(value) {
                return formatCompactCurrency(value);
              }
            },

            border: {
              display: false
            }
          }
        }
      }
    });
  }

  function renderOrderStatusChart(statusData) {
    if (!elements.orderStatusChartCanvas) {
      return;
    }

    if (state.orderStatusChart) {
      state.orderStatusChart.destroy();
    }

    const preparedData = statusData.length
      ? statusData
      : [
          {
            status: "sem_pedidos",
            label: "Sem pedidos",
            value: 1
          }
        ];

    const colors = preparedData.map((item, index) =>
      getStatusColor(item.status, index)
    );

    state.orderStatusChart = new Chart(
      elements.orderStatusChartCanvas,
      {
        type: "doughnut",

        data: {
          labels: preparedData.map((item) => item.label),

          datasets: [
            {
              data: preparedData.map((item) => item.value),
              backgroundColor: colors,
              borderColor: "#15151b",
              borderWidth: 5,
              hoverOffset: 7
            }
          ]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "69%",

          plugins: {
            legend: {
              display: false
            },

            tooltip: {
              backgroundColor: "#202029",
              titleColor: "#ffffff",
              bodyColor: "#ffffff",
              borderColor: "rgba(255,255,255,0.12)",
              borderWidth: 1,

              callbacks: {
                label(context) {
                  return ` ${context.label}: ${context.raw}`;
                }
              }
            }
          }
        }
      }
    );

    renderOrderStatusLegend(preparedData, colors);
  }

  function renderOrderStatusLegend(statusData, colors) {
    if (!elements.orderStatusLegend) {
      return;
    }

    if (
      statusData.length === 1 &&
      statusData[0].status === "sem_pedidos"
    ) {
      elements.orderStatusLegend.innerHTML = `
        <div class="empty-state">
          Nenhum pedido encontrado no período.
        </div>
      `;

      return;
    }

    elements.orderStatusLegend.innerHTML = statusData
      .slice(0, 6)
      .map(
        (item, index) => `
          <div class="status-legend-item">
            <span
              class="status-legend-dot"
              style="background:${colors[index]}"
            ></span>

            <span class="status-legend-label">
              ${escapeHTML(item.label)}
            </span>

            <span class="status-legend-value">
              ${formatInteger(item.value)}
            </span>
          </div>
        `
      )
      .join("");
  }

  function renderBestProducts(products) {
    if (!elements.bestProductsTable) {
      return;
    }

    if (!products.length) {
      elements.bestProductsTable.innerHTML = `
        <tr>
          <td colspan="3" class="table-empty">
            Nenhum produto vendido no período.
          </td>
        </tr>
      `;

      return;
    }

    elements.bestProductsTable.innerHTML = products
      .map(
        (product) => `
          <tr>
            <td>
              <div class="product-cell">
                ${
                  product.image
                    ? `
                      <img
                        class="product-image"
                        src="${escapeAttribute(product.image)}"
                        alt="${escapeAttribute(product.name)}"
                        loading="lazy"
                      >
                    `
                    : `
                      <div class="product-image-placeholder">
                        ◫
                      </div>
                    `
                }

                <div class="product-information">
                  <strong>${escapeHTML(product.name)}</strong>

                  ${
                    product.sku
                      ? `
                        <small>
                          SKU: ${escapeHTML(product.sku)}
                        </small>
                      `
                      : ""
                  }
                </div>
              </div>
            </td>

            <td>
              ${formatInteger(product.quantity)}
            </td>

            <td>
              <strong>
                ${formatCurrency(product.revenue)}
              </strong>
            </td>
          </tr>
        `
      )
      .join("");
  }

  function renderLatestOrders(orders) {
    if (!elements.latestOrdersTable) {
      return;
    }

    if (!orders.length) {
      elements.latestOrdersTable.innerHTML = `
        <tr>
          <td colspan="7" class="table-empty">
            Nenhum pedido encontrado no período.
          </td>
        </tr>
      `;

      return;
    }

    elements.latestOrdersTable.innerHTML = orders
      .map(
        (order) => `
          <tr>
            <td>
              <span class="order-number">
                #${escapeHTML(String(order.number))}
              </span>
            </td>

            <td>
              <div class="customer-cell">
                <strong>
                  ${escapeHTML(order.customerName)}
                </strong>

                ${
                  order.customerEmail
                    ? `
                      <small>
                        ${escapeHTML(order.customerEmail)}
                      </small>
                    `
                    : ""
                }
              </div>
            </td>

            <td>
              ${formatDateTime(order.createdAt)}
            </td>

            <td>
              <span class="${getStatusBadgeClass(
                order.paymentStatus
              )}">
                ${escapeHTML(
                  formatStatusLabel(order.paymentStatus)
                )}
              </span>
            </td>

            <td>
              <span class="${getStatusBadgeClass(order.status)}">
                ${escapeHTML(formatStatusLabel(order.status))}
              </span>
            </td>

            <td>
              <strong>
                ${formatCurrency(order.total)}
              </strong>
            </td>

            <td>
              <a
                href="/admin/pedidos.html?id=${encodeURIComponent(
                  order.id
                )}"
                class="order-action"
                title="Abrir pedido"
              >
                ›
              </a>
            </td>
          </tr>
        `
      )
      .join("");
  }

  function renderLowStock(products) {
    if (!elements.stockAlertList) {
      return;
    }

    if (!products.length) {
      elements.stockAlertList.innerHTML = `
        <div class="empty-state">
          Nenhum produto com estoque baixo.
        </div>
      `;

      return;
    }

    elements.stockAlertList.innerHTML = products
      .slice(0, 7)
      .map(
        (product) => `
          <a
            href="/admin/produtos.html?id=${encodeURIComponent(
              product.id
            )}"
            class="stock-alert-item"
          >
            <div class="stock-alert-icon">
              !
            </div>

            <div class="stock-alert-information">
              <strong>
                ${escapeHTML(product.name)}
              </strong>

              <small>
                ${
                  product.sku
                    ? `SKU: ${escapeHTML(product.sku)}`
                    : "Produto ativo"
                }
              </small>
            </div>

            <div class="stock-alert-value">
              ${formatInteger(product.stock)} un.
            </div>
          </a>
        `
      )
      .join("");
  }

  function renderSidebarPendingOrders(orders) {
    if (!elements.sidebarPendingOrders) {
      return;
    }

    const pendingCount = orders.filter((order) => {
      const status = normalizeText(order.status);
      const paymentStatus = normalizeText(order.paymentStatus);

      return (
        DASHBOARD_CONFIG.pendingOrderStatuses.includes(status) ||
        DASHBOARD_CONFIG.pendingOrderStatuses.includes(paymentStatus)
      );
    }).length;

    elements.sidebarPendingOrders.textContent = String(pendingCount);

    elements.sidebarPendingOrders.classList.toggle(
      "hidden",
      pendingCount === 0
    );
  }

  /*
   * =========================================================
   * PERÍODOS
   * =========================================================
   */

  function calculatePeriod(period) {
    const now = new Date();
    let startDate;
    let endDate;

    switch (period) {
      case "today":
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;

      case "7days":
        startDate = startOfDay(addDays(now, -6));
        endDate = endOfDay(now);
        break;

      case "month":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
          0,
          0,
          0,
          0
        );

        endDate = endOfDay(now);
        break;

      case "year":
        startDate = new Date(
          now.getFullYear(),
          0,
          1,
          0,
          0,
          0,
          0
        );

        endDate = endOfDay(now);
        break;

      case "30days":
      default:
        startDate = startOfDay(addDays(now, -29));
        endDate = endOfDay(now);
        break;
    }

    calculateCustomPeriod(startDate, endDate);
  }

  function calculateCustomPeriod(startDate, endDate) {
    const durationMilliseconds =
      endDate.getTime() - startDate.getTime() + 1;

    state.startDate = startDate;
    state.endDate = endDate;

    state.previousEndDate = new Date(
      startDate.getTime() - 1
    );

    state.previousStartDate = new Date(
      state.previousEndDate.getTime() -
        durationMilliseconds +
        1
    );
  }

  function prepareDefaultCustomDates() {
    if (!elements.customStartDate || !elements.customEndDate) {
      return;
    }

    elements.customStartDate.value = formatInputDate(
      state.startDate || addDays(new Date(), -29)
    );

    elements.customEndDate.value = formatInputDate(
      state.endDate || new Date()
    );
  }

  function activatePeriodButton(period) {
    elements.periodButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.period === period
      );
    });
  }

  /*
   * =========================================================
   * INTERFACE
   * =========================================================
   */

  function openSidebar() {
    elements.sidebar?.classList.add("open");
    elements.sidebarOverlay?.classList.add("visible");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    elements.sidebar?.classList.remove("open");
    elements.sidebarOverlay?.classList.remove("visible");
    document.body.style.overflow = "";
  }

  function hideLoading() {
    elements.loading?.classList.add("finished");
  }

  function setRefreshLoading(isLoading) {
    if (!elements.refreshButton) {
      return;
    }

    elements.refreshButton.disabled = isLoading;
    elements.refreshButton.classList.toggle("loading", isLoading);
  }

  function updateLastUpdate() {
    if (!elements.lastUpdateText) {
      return;
    }

    elements.lastUpdateText.textContent = new Intl.DateTimeFormat(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }
    ).format(new Date());
  }

  function startAutoRefresh() {
    if (state.autoRefreshTimer) {
      clearInterval(state.autoRefreshTimer);
    }

    state.autoRefreshTimer = setInterval(() => {
      loadDashboard();
    }, DASHBOARD_CONFIG.autoRefreshMilliseconds);
  }

  let toastTimer;

  function showToast(message, type = "success") {
    if (!elements.toast || !elements.toastMessage) {
      return;
    }

    clearTimeout(toastTimer);

    elements.toastMessage.textContent = message;

    elements.toast.classList.remove(
      "success",
      "error",
      "visible"
    );

    elements.toast.classList.add(type);

    requestAnimationFrame(() => {
      elements.toast.classList.add("visible");
    });

    toastTimer = setTimeout(() => {
      elements.toast.classList.remove("visible");
    }, 4000);
  }

  /*
   * =========================================================
   * FUNÇÕES AUXILIARES
   * =========================================================
   */

  function getStatusBadgeClass(status) {
    const normalizedStatus = normalizeText(status)
      .replaceAll("_", "-");

    const knownStatuses = [
      "approved",
      "paid",
      "completed",
      "entregue",
      "pending",
      "pendente",
      "awaiting",
      "aguardando",
      "processing",
      "producao",
      "em-producao",
      "shipped",
      "enviado",
      "cancelled",
      "canceled",
      "cancelado",
      "rejected",
      "failed"
    ];

    const statusClass = knownStatuses.includes(normalizedStatus)
      ? `status-${normalizedStatus}`
      : "status-default";

    return `status-badge ${statusClass}`;
  }

  function getStatusColor(status, index = 0) {
    const normalizedStatus = normalizeText(status);

    if (
      [
        "approved",
        "paid",
        "pago",
        "aprovado",
        "completed",
        "entregue"
      ].includes(normalizedStatus)
    ) {
      return "#35d07f";
    }

    if (
      [
        "pending",
        "pendente",
        "awaiting_payment",
        "aguardando_pagamento"
      ].includes(normalizedStatus)
    ) {
      return "#ffad42";
    }

    if (
      [
        "processing",
        "producao",
        "em_producao"
      ].includes(normalizedStatus)
    ) {
      return "#5898ff";
    }

    if (["shipped", "enviado"].includes(normalizedStatus)) {
      return "#9f72ff";
    }

    if (
      DASHBOARD_CONFIG.cancelledOrderStatuses.includes(
        normalizedStatus
      )
    ) {
      return "#ff5d68";
    }

    const fallbackColors = [
      "#e83e8c",
      "#5ed4c7",
      "#8f7cff",
      "#f0c35a",
      "#67a7ff",
      "#ef7d62"
    ];

    return fallbackColors[index % fallbackColors.length];
  }

  function formatStatusLabel(status) {
    if (!status) {
      return "Não informado";
    }

    const translations = {
      approved: "Aprovado",
      paid: "Pago",
      pago: "Pago",
      aprovado: "Aprovado",
      pending: "Pendente",
      pendente: "Pendente",
      awaiting_payment: "Aguardando pagamento",
      aguardando_pagamento: "Aguardando pagamento",
      processing: "Em processamento",
      producao: "Em produção",
      em_producao: "Em produção",
      shipped: "Enviado",
      enviado: "Enviado",
      completed: "Concluído",
      entregue: "Entregue",
      cancelled: "Cancelado",
      canceled: "Cancelado",
      cancelado: "Cancelado",
      rejected: "Rejeitado",
      rejeitado: "Rejeitado",
      failed: "Falhou"
    };

    const normalizedStatus = normalizeText(status);

    return (
      translations[normalizedStatus] ||
      normalizedStatus
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    );
  }

  function createShortOrderNumber(id) {
    if (!id) {
      return "—";
    }

    return String(id).replaceAll("-", "").slice(0, 8).toUpperCase();
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function parseMoney(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let normalizedValue = String(value)
    .trim()
    .replace("R$", "")
    .replace(/\s/g, "");

  /*
   * Formato brasileiro:
   * 1.234,56
   */
  if (
    normalizedValue.includes(".") &&
    normalizedValue.includes(",")
  ) {
    normalizedValue = normalizedValue
      .replace(/\./g, "")
      .replace(",", ".");
  }

  /*
   * Formato brasileiro sem separador de milhar:
   * 23,59
   */
  else if (normalizedValue.includes(",")) {
    normalizedValue = normalizedValue.replace(",", ".");
  }

  /*
   * Formato retornado pelo Supabase:
   * 23.59
   *
   * Nesse caso, o ponto deve ser preservado.
   */

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

  function sum(values) {
    return values.reduce(
      (total, value) => total + (Number(value) || 0),
      0
    );
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value) || 0);
  }

  function formatCompactCurrency(value) {
    const number = Number(value) || 0;

    if (number >= 1000000) {
      return `R$ ${(number / 1000000).toFixed(1)} mi`;
    }

    if (number >= 1000) {
      return `R$ ${(number / 1000).toFixed(1)} mil`;
    }

    return `R$ ${Math.round(number)}`;
  }

  function formatInteger(value) {
    return new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function formatDecimal(value) {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(Number(value) || 0);
  }

  function formatDateTime(value) {
    if (!value) {
      return "—";
    }

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

  function formatChartDate(date) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit"
    }).format(date);
  }

  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatInputDate(date) {
    return formatDateKey(date);
  }

  function formatQuantityText(value, singular, plural) {
    const quantity = Number(value) || 0;

    return `${formatInteger(quantity)} ${
      quantity === 1 ? singular : plural
    }`;
  }

  function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function endOfDay(date) {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function enumerateDays(startDate, endDate) {
    const dates = [];
    const currentDate = startOfDay(startDate);
    const finalDate = startOfDay(endDate);

    while (currentDate <= finalDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHTML(value);
  }
})();
