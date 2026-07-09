const CHECKOUT_KEYS = {
    cart: "mugart_cart",
    draft: "mugart_checkout_draft"
};
const CheckoutState = {
    products: [],
    cart: [],
    discount: 0,
    shipping: 0,
    coupon: "",
    selectedShipping: "pickup",
    selectedPayment: "pix"
};

function qs(s) {
    return document.querySelector(s)
}

function qsa(s) {
    return Array.from(document.querySelectorAll(s))
}

function money(v) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(Number(v || 0))
}

function onlyNumbers(v) {
    return String(v || "").replace(/\D/g, "")
}

function loadStorage(k, f) {
    try {
        const s = localStorage.getItem(k);
        return s ? JSON.parse(s) : f
    } catch {
        return f
    }
}

function saveStorage(k, v) {
    localStorage.setItem(k, JSON.stringify(v))
}

function toast(m) {
    const el = qs("#checkoutToast");
    el.textContent = m;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2800)
}
document.addEventListener("DOMContentLoaded", async () => {
    CheckoutState.cart = loadStorage(CHECKOUT_KEYS.cart, []);
    await loadProducts();
    restoreDraft();
    bindEvents();
    renderCheckout();
    if (CheckoutState.cart.length) toast("Seu carrinho foi carregado.")
});
async function loadProducts() {
    if (!window.mugartSupabase) {
        toast("Supabase não carregou.");
        return
    }
    const r = await mugartSupabase.from("products").select("*,categories(id,name)").eq("active", true);
    if (r.error) {
        console.error(r.error);
        toast("Erro ao carregar produtos.");
        return
    }
    CheckoutState.products = r.data || []
}

function bindEvents() {
    qs("#checkoutForm").addEventListener("submit", finishOrder);
    qs("#finishOrderBtn").addEventListener("click", () => qs("#checkoutForm").requestSubmit());
    qs("#applyCouponBtn").addEventListener("click", applyCoupon);
    qsa("input,select").forEach(f => {
        f.addEventListener("input", saveDraft);
        f.addEventListener("change", saveDraft)
    });
    qs("#shippingZip").addEventListener("input", handleCepInput);
    qs("#shippingZip").addEventListener("blur", searchCep);
    qsa("input[name='shippingMethod']").forEach(r => r.addEventListener("change", () => {
        CheckoutState.selectedShipping = r.value;
        CheckoutState.shipping = Number(r.dataset.price || 0);
        updateOptionCards();
        renderSummary();
        saveDraft()
    }));
    qsa("input[name='paymentMethod']").forEach(r => r.addEventListener("change", () => {
        CheckoutState.selectedPayment = r.value;
        updateOptionCards();
        saveDraft()
    }))
}

function restoreDraft() {
    const d = loadStorage(CHECKOUT_KEYS.draft, null);
    if (!d) return;
    Object.keys(d).forEach(id => {
        const el = qs("#" + id);
        if (el) el.value = d[id]
    });
    CheckoutState.discount = Number(d.discount || 0);
    CheckoutState.shipping = Number(d.shipping || 0);
    CheckoutState.coupon = d.coupon || ""
}

function saveDraft() {
    const ids = ["customerName", "customerPhone", "customerEmail", "customerDocument", "shippingZip", "shippingStreet", "shippingNumber", "shippingComplement", "shippingNeighborhood", "shippingCity", "shippingState", "couponCode"];
    const d = {};
    ids.forEach(id => d[id] = qs("#" + id)?.value || "");
    d.discount = CheckoutState.discount;
    d.shipping = CheckoutState.shipping;
    d.coupon = CheckoutState.coupon;
    saveStorage(CHECKOUT_KEYS.draft, d)
}

function renderCheckout() {
    renderItems();
    renderSummary();
    updateOptionCards()
}

function getProduct(id) {
    return CheckoutState.products.find(p => p.id === id)
}

function getCartItems() {
    return CheckoutState.cart.map(i => {
        const p = getProduct(i.productId);
        if (!p) return null;
        return {
            ...i,
            product: p,
            quantity: Number(i.quantity || 1),
            subtotal: Number(p.price || 0) * Number(i.quantity || 1)
        }
    }).filter(Boolean)
}

function renderItems() {
    const c = qs("#checkoutItems"),
        items = getCartItems();
    if (!items.length) {
        c.innerHTML = '<div class="empty-cart"><h3>Carrinho vazio</h3><p>Volte para a loja e adicione produtos antes de finalizar.</p></div>';
        renderSummary();
        return
    }
    c.innerHTML = items.map(i => `<article class="checkout-item"><img src="${i.product.image_url||"assets/hero-caneca.png"}" alt="${i.product.name}"><div class="item-info"><h3>${i.product.name}</h3><span>${i.product.sku||"-"} ${i.product.color?"• "+i.product.color:""}</span><div class="item-controls"><button type="button" onclick="changeQty('${i.productId}',-1)">−</button><input value="${i.quantity}" type="number" min="1" onchange="setQty('${i.productId}',this.value)"><button type="button" onclick="changeQty('${i.productId}',1)">+</button></div></div><div class="item-price"><strong>${money(i.subtotal)}</strong><button type="button" onclick="removeItem('${i.productId}')">Remover</button></div></article>`).join("");
    renderSummary()
}

function renderSummary() {
    const items = getCartItems(),
        subtotal = items.reduce((s, i) => s + i.subtotal, 0),
        total = Math.max(0, subtotal - CheckoutState.discount + CheckoutState.shipping);
    qs("#summaryItems").innerHTML = items.length ? items.map(i => `<div class="summary-item"><img src="${i.product.image_url||"assets/hero-caneca.png"}"><div><strong>${i.product.name}</strong><span>${i.quantity}x • ${money(i.product.price)}</span></div><b>${money(i.subtotal)}</b></div>`).join("") : '<p class="summary-note">Nenhum item no carrinho.</p>';
    qs("#summarySubtotal").textContent = money(subtotal);
    qs("#summaryDiscount").textContent = money(CheckoutState.discount);
    qs("#summaryShipping").textContent = money(CheckoutState.shipping);
    qs("#summaryTotal").textContent = money(total);
    updateProgress()
}

function updateProgress() {
    const hasItems = getCartItems().length > 0,
        hasCustomer = qs("#customerName").value && qs("#customerPhone").value && qs("#customerEmail").value,
        hasAddress = qs("#shippingZip").value && qs("#shippingStreet").value && qs("#shippingNumber").value;
    qsa(".progress-step").forEach(s => s.classList.remove("active"));
    qs("[data-step='cart']").classList.add("active");
    if (hasItems) qs("[data-step='customer']").classList.add("active");
    if (hasCustomer) qs("[data-step='shipping']").classList.add("active");
    if (hasAddress) qs("[data-step='payment']").classList.add("active")
}
window.changeQty = (id, d) => {
    const i = CheckoutState.cart.find(x => x.productId === id);
    if (!i) return;
    i.quantity = Math.max(1, Number(i.quantity || 1) + d);
    persistCart();
    renderItems()
};
window.setQty = (id, v) => {
    const i = CheckoutState.cart.find(x => x.productId === id);
    if (!i) return;
    i.quantity = Math.max(1, Number(v || 1));
    persistCart();
    renderItems()
};
window.removeItem = id => {
    CheckoutState.cart = CheckoutState.cart.filter(i => i.productId !== id);
    persistCart();
    renderItems()
};

function persistCart() {
    saveStorage(CHECKOUT_KEYS.cart, CheckoutState.cart)
}

function applyCoupon() {
    const code = qs("#couponCode").value.trim().toUpperCase();
    if (!code) {
        toast("Digite um cupom.");
        return
    }
    if (code === "MUGART10") {
        const subtotal = getCartItems().reduce((s, i) => s + i.subtotal, 0);
        CheckoutState.discount = subtotal * .1;
        CheckoutState.coupon = code;
        toast("Cupom aplicado: 10% de desconto.")
    } else {
        CheckoutState.discount = 0;
        CheckoutState.coupon = "";
        toast("Cupom inválido.")
    }
    renderSummary();
    saveDraft()
}

function updateOptionCards() {
    qsa(".option-card").forEach(c => {
        const i = c.querySelector("input");
        c.classList.toggle("active", i.checked)
    })
}

function formatCep(v) {
    const n = onlyNumbers(v).slice(0, 8);
    return n.length > 5 ? n.slice(0, 5) + "-" + n.slice(5) : n
}

function handleCepInput(e) {
    e.target.value = formatCep(e.target.value);
    if (onlyNumbers(e.target.value).length === 8) searchCep()
}
async function searchCep() {
    const cep = onlyNumbers(qs("#shippingZip").value);
    if (cep.length !== 8) return;

    try {
        const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const d = await r.json();

        if (d.erro) {
            toast("CEP não encontrado.");
            return;
        }

        qs("#shippingStreet").value = d.logradouro || "";
        qs("#shippingNeighborhood").value = d.bairro || "";
        qs("#shippingCity").value = d.localidade || "";
        qs("#shippingState").value = d.uf || "";
        qs("#shippingNumber").focus();

        saveDraft();
        updateProgress();
    } catch (e) {
        console.error(e);
        toast("Erro ao buscar CEP.");
    }
}

async function iniciarPagamentoMercadoPago(order) {

    const response = await mugartSupabase.functions.invoke(
        "create-payment",
        {
            body: {
                order_id: order.id,
                customer_name: order.customer_name,
                customer_email: order.customer_email,
                items: order.items.map(item => ({
                    id: item.product_id,
                    title: item.product_name,
                    quantity: Number(item.quantity),
                    currency_id: "BRL",
                    unit_price: Number(item.unit_price)
                }))
            }
        }
    );

    console.log("Resposta completa:", response);

    const { data, error } = response;

    if (error) {
        console.error("ERRO:", error);
        console.error("RESPOSTA:", response);
        toast(error.message || "Erro ao iniciar pagamento.");
        return;
    }

    console.log("DATA:", data);

    if (!data || !data.init_point) {
        console.error("Resposta inválida:", data);
        toast("Mercado Pago não retornou o link.");
        return;
    }

    window.location.href = data.init_point;
}
async function finishOrder(e) {
    e.preventDefault();

    const items = getCartItems();

    if (!items.length) {
        toast("Seu carrinho está vazio.");
        return;
    }

    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const total = Math.max(0, subtotal - CheckoutState.discount + CheckoutState.shipping);

    const customerPayload = {
        name: qs("#customerName").value.trim(),
        email: qs("#customerEmail").value.trim(),
        phone: qs("#customerPhone").value.trim(),
        cpf_cnpj: qs("#customerDocument").value.trim(),
        zip: qs("#shippingZip").value.trim(),
        address: qs("#shippingStreet").value.trim(),
        city: qs("#shippingCity").value.trim(),
        state: qs("#shippingState").value.trim()
    };

    const cr = await mugartSupabase.from("customers").insert(customerPayload).select().single();

    if (cr.error) {
        console.error(cr.error);
        toast("Erro ao salvar cliente.");
        return;
    }

    const orderNumber = "MUG-" + Date.now();

    const orderPayload = {
        order_number: orderNumber,
        customer_id: cr.data.id,
        customer_name: customerPayload.name,
        customer_email: customerPayload.email,
        customer_phone: customerPayload.phone,
        cpf_cnpj: customerPayload.cpf_cnpj,
        status: "pending",
        production_status: "not_started",
        payment_method: CheckoutState.selectedPayment,
        payment_status: "pending",
        shipping_status: "not_shipped",
        subtotal: subtotal,
        discount: CheckoutState.discount,
        shipping: CheckoutState.shipping,
        total: total,
        coupon: CheckoutState.coupon,
        notes: "Pedido criado pelo Checkout 3.0"
    };

    const or = await mugartSupabase.from("orders").insert(orderPayload).select().single();

    if (or.error) {
        console.error(or.error);
        toast("Erro ao criar pedido.");
        return;
    }

    const orderId = or.data.id;

    const rows = items.map(i => ({
        order_id: orderId,
        product_id: i.product.id,
        product_name: i.product.name,
        sku: i.product.sku,
        color: i.product.color,
        image_url: i.product.image_url,
        quantity: i.quantity,
        unit_price: Number(i.product.price || 0),
        discount: 0,
        total: i.subtotal
    }));

    const ir = await mugartSupabase.from("order_items").insert(rows);

    if (ir.error) {
        console.error(ir.error);
        toast("Erro ao salvar itens.");
        return;
    }

    await mugartSupabase.from("order_addresses").insert({
        order_id: orderId,
        recipient_name: customerPayload.name,
        phone: customerPayload.phone,
        zip: qs("#shippingZip").value.trim(),
        street: qs("#shippingStreet").value.trim(),
        number: qs("#shippingNumber").value.trim(),
        complement: qs("#shippingComplement").value.trim(),
        neighborhood: qs("#shippingNeighborhood").value.trim(),
        city: qs("#shippingCity").value.trim(),
        state: qs("#shippingState").value.trim(),
        country: "Brasil"
    });

    await mugartSupabase.from("payments").insert({
        order_id: orderId,
        provider: "mercadopago",
        method: CheckoutState.selectedPayment,
        status: "pending",
        amount: total
    });

    await mugartSupabase.from("order_history").insert({
        order_id: orderId,
        event_type: "created",
        new_value: "pending",
        note: "Pedido criado automaticamente pelo Checkout 3.0.",
        created_by: "checkout"
    });

    await iniciarPagamentoMercadoPago({
        id: orderId,
        customer_name: customerPayload.name,
        customer_email: customerPayload.email,
        items: rows
    });
}

function somenteNumeros(valor) {
  return valor.replace(/\D/g, "");
}

function formatarTelefone(valor) {
  valor = somenteNumeros(valor).slice(0, 11);

  if (valor.length <= 10) {
    return valor.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  }

  return valor.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
}

function formatarCpfCnpj(valor) {
  valor = somenteNumeros(valor).slice(0, 14);

  if (valor.length <= 11) {
    return valor
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return valor
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatarCep(valor) {
  valor = somenteNumeros(valor).slice(0, 8);
  return valor.replace(/^(\d{5})(\d)/, "$1-$2");
}

async function buscarEnderecoPorCep(cep) {
  cep = somenteNumeros(cep);

  if (cep.length !== 8) return;

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const dados = await resposta.json();

    if (dados.erro) {
      alert("CEP não encontrado.");
      return;
    }

    document.getElementById("endereco").value = dados.logradouro || "";
    document.getElementById("bairro").value = dados.bairro || "";
    document.getElementById("cidade").value = dados.localidade || "";
    document.getElementById("estado").value = dados.uf || "";

    const numero = document.getElementById("numero");
    if (numero) numero.focus();

  } catch (erro) {
    console.error("Erro ao buscar CEP:", erro);
    alert("Erro ao buscar endereço pelo CEP.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const telefone = document.getElementById("telefone");
  const documento = document.getElementById("documento");
  const cep = document.getElementById("cep");

  if (telefone) {
    telefone.addEventListener("input", () => {
      telefone.value = formatarTelefone(telefone.value);
    });
  }

  if (documento) {
    documento.addEventListener("input", () => {
      documento.value = formatarCpfCnpj(documento.value);
    });
  }

  if (cep) {
    cep.addEventListener("input", () => {
      cep.value = formatarCep(cep.value);
    });

    cep.addEventListener("blur", () => {
      buscarEnderecoPorCep(cep.value);
    });
  }
});
