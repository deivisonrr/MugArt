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
    selectedPayment: "pix",
    selectedShippingCompany: "",
    selectedShippingService: "",
    selectedShippingDeliveryTime: 0
};

function qs(s) {
    return document.querySelector(s);
}

function qsa(s) {
    return Array.from(document.querySelectorAll(s));
}

function money(v) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(Number(v || 0));
}

function onlyNumbers(v) {
    return String(v || "").replace(/\D/g, "");
}

function loadStorage(k, f) {
    try {
        const s = localStorage.getItem(k);
        return s ? JSON.parse(s) : f;
    } catch {
        return f;
    }
}

function saveStorage(k, v) {
    localStorage.setItem(k, JSON.stringify(v));
}

function toast(m) {
    const el = qs("#checkoutToast");

    if (!el) {
        alert(m);
        return;
    }

    el.textContent = m;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2800);
}

function formatPhone(value) {
    const n = onlyNumbers(value).slice(0, 11);

    if (!n) return "";

    if (n.length <= 2) {
        return `(${n}`;
    }

    if (n.length <= 6) {
        return `(${n.slice(0, 2)}) ${n.slice(2)}`;
    }

    if (n.length <= 10) {
        return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    }

    return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

function formatCpfCnpj(value) {
    const n = onlyNumbers(value).slice(0, 14);

    if (!n) return "";

    if (n.length <= 11) {
        if (n.length <= 3) return n;
        if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
        if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
        return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
    }

    if (n.length <= 2) return n;
    if (n.length <= 5) return `${n.slice(0, 2)}.${n.slice(2)}`;
    if (n.length <= 8) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5)}`;
    if (n.length <= 12) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8)}`;
    return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
}

function formatCep(v) {
    const n = onlyNumbers(v).slice(0, 8);
    return n.length > 5 ? n.slice(0, 5) + "-" + n.slice(5) : n;
}

function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim());
}

function phoneValido(phone) {
    return onlyNumbers(phone).length === 11;
}

function documentoValido(value) {
    const n = onlyNumbers(value);

    if (n.length === 11) {
        return cpfValido(n);
    }

    if (n.length === 14) {
        return cnpjValido(n);
    }

    return false;
}

function cpfValido(cpf) {
    cpf = onlyNumbers(cpf);

    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;

    let soma = 0;
    let resto;

    for (let i = 1; i <= 9; i++) {
        soma += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10), 10)) return false;

    soma = 0;

    for (let i = 1; i <= 10; i++) {
        soma += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;

    return resto === parseInt(cpf.substring(10, 11), 10);
}

function cnpjValido(cnpj) {
    cnpj = onlyNumbers(cnpj);

    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
        if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;

    if (resultado !== parseInt(digitos.charAt(0), 10)) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
        if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;

    return resultado === parseInt(digitos.charAt(1), 10);
}

function setInvalid(id, invalid) {
    const el = qs("#" + id);

    if (!el) return;

    el.classList.toggle("is-invalid", invalid);
}

function validarCamposCliente() {
    const nome = qs("#customerName")?.value.trim() || "";
    const telefone = qs("#customerPhone")?.value.trim() || "";
    const email = qs("#customerEmail")?.value.trim() || "";
    const documento = qs("#customerDocument")?.value.trim() || "";

    let ok = true;

    setInvalid("customerName", !nome);
    setInvalid("customerPhone", !phoneValido(telefone));
    setInvalid("customerEmail", !emailValido(email));

    if (!nome) ok = false;
    if (!phoneValido(telefone)) ok = false;
    if (!emailValido(email)) ok = false;

    if (documento && !documentoValido(documento)) {
        setInvalid("customerDocument", true);
        ok = false;
    } else {
        setInvalid("customerDocument", false);
    }

    return ok;
}

function validarEndereco() {
    const cep = qs("#shippingZip")?.value.trim() || "";
    const rua = qs("#shippingStreet")?.value.trim() || "";
    const numero = qs("#shippingNumber")?.value.trim() || "";
    const bairro = qs("#shippingNeighborhood")?.value.trim() || "";
    const cidade = qs("#shippingCity")?.value.trim() || "";
    const estado = qs("#shippingState")?.value.trim() || "";

    let ok = true;

    setInvalid("shippingZip", onlyNumbers(cep).length !== 8);
    setInvalid("shippingStreet", !rua);
    setInvalid("shippingNumber", !numero);
    setInvalid("shippingNeighborhood", !bairro);
    setInvalid("shippingCity", !cidade);
    setInvalid("shippingState", estado.length !== 2);

    if (onlyNumbers(cep).length !== 8) ok = false;
    if (!rua) ok = false;
    if (!numero) ok = false;
    if (!bairro) ok = false;
    if (!cidade) ok = false;
    if (estado.length !== 2) ok = false;

    return ok;
}

async function preencherClienteLogadoNoCheckout() {
    try {
        if (
            !window.mugartSupabase ||
            typeof window.mugartSupabase
                .from !== "function"
        ) {
            console.warn(
                "[Checkout] Cliente Supabase indisponível."
            );
            return false;
        }

        const {
            data: sessionData,
            error: sessionError
        } = await mugartSupabase.auth.getSession();

        if (sessionError) {
            console.error(
                "[Checkout] Erro ao carregar sessão:",
                sessionError
            );
            return false;
        }

        const user = sessionData?.session?.user;

        if (!user) {
            console.info(
                "[Checkout] Usuário não autenticado."
            );
            return false;
        }

        console.info(
            "[Checkout] Usuário logado:",
            user.email,
            user.id
        );

        const {
            data: customer,
            error: customerError
        } = await mugartSupabase
            .from("customers")
            .select("*")
            .eq("auth_user_id", user.id)
            .maybeSingle();

        if (customerError) {
            console.error(
                "[Checkout] Erro ao buscar cliente:",
                customerError
            );
            return false;
        }

        if (!customer) {
            console.warn(
                "[Checkout] Cliente não encontrado para:",
                user.id
            );
            return false;
        }

        console.info(
            "[Checkout] Cliente encontrado:",
            customer
        );

        preencherCampo(
            "customerName",
            customer.name || ""
        );

        preencherCampo(
            "customerPhone",
            customer.phone || ""
        );

        preencherCampo(
            "customerEmail",
            customer.email || user.email || ""
        );

        preencherCampo(
            "customerDocument",
            customer.cpf_cnpj ||
            customer.document ||
            ""
        );

        const emailInput =
            qs("#customerEmail");

        if (emailInput) {
            emailInput.readOnly = true;
            emailInput.classList.add(
                "checkout-readonly"
            );
        }

        preencherCampo(
            "shippingZip",
            customer.zip || ""
        );

        preencherCampo(
            "shippingStreet",
            customer.address || ""
        );

        preencherCampo(
            "shippingCity",
            customer.city || ""
        );

        preencherCampo(
            "shippingState",
            customer.state || ""
        );

        if (
            typeof preencherEnderecoPadraoDoCliente ===
            "function"
        ) {
            await preencherEnderecoPadraoDoCliente(
                customer.id
            );
        }

        saveDraft();
        updateProgress();
        renderSummary();

        const cep = onlyNumbers(
            qs("#shippingZip")?.value || ""
        );

        if (cep.length === 8) {
            await searchCep();
        }

        return true;

    } catch (error) {
        console.error(
            "[Checkout] Erro inesperado ao preencher cliente:",
            error
        );
        return false;
    }
}

function preencherCampo(id, value) {
    const field = qs("#" + id);

    if (!field) {
        console.warn(
            `[Checkout] Campo não encontrado: #${id}`
        );
        return;
    }

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return;
    }

    field.value = String(value);

    applyMasks(field);

    field.dispatchEvent(
        new Event("input", {
            bubbles: true
        })
    );

    field.dispatchEvent(
        new Event("change", {
            bubbles: true
        })
    );
}

async function preencherEnderecoPadraoDoCliente(
    customerId
) {
    try {
        const {
            data: addresses,
            error
        } = await mugartSupabase
            .from("customer_addresses")
            .select("*")
            .eq("customer_id", customerId)
            .order("is_default", {
                ascending: false
            })
            .order("created_at", {
                ascending: false
            })
            .limit(1);

        if (error) {
            /*
             * Por enquanto não interrompe o checkout caso
             * a tabela ainda não exista ou tenha outro nome.
             */
            console.warn(
                "[Checkout] Endereço salvo não carregado:",
                error.message
            );

            return false;
        }

        const address = addresses?.[0];

        if (!address) {
            console.info(
                "[Checkout] Cliente ainda não possui endereço salvo."
            );

            return false;
        }

        console.info(
            "[Checkout] Endereço padrão carregado:",
            address
        );

        preencherCampo(
            "shippingZip",
            formatCep(
                address.zip ||
                address.postal_code ||
                ""
            )
        );

        preencherCampo(
            "shippingStreet",
            address.street ||
            address.address ||
            ""
        );

        preencherCampo(
            "shippingNumber",
            address.number || ""
        );

        preencherCampo(
            "shippingComplement",
            address.complement || ""
        );

        preencherCampo(
            "shippingNeighborhood",
            address.neighborhood || ""
        );

        preencherCampo(
            "shippingCity",
            address.city || ""
        );

        preencherCampo(
            "shippingState",
            String(address.state || "")
                .toUpperCase()
        );

        return true;

    } catch (error) {
        console.warn(
            "[Checkout] Não foi possível carregar o endereço padrão:",
            error
        );

        return false;
    }
}

async function exigirLoginNoCheckout() {
    if (!window.mugartSupabase) {
        console.error(
            "[Checkout] Supabase não carregou."
        );

        return false;
    }

    const {
        data,
        error
    } = await mugartSupabase.auth.getSession();

    if (error) {
        console.error(
            "[Checkout] Erro ao verificar sessão:",
            error
        );

        window.location.href =
            "conta/login.html?redirect=../checkout.html";

        return false;
    }

    if (!data?.session) {
        localStorage.setItem(
            "mugart_redirect_after_login",
            "../checkout.html"
        );

        window.location.href =
            "conta/login.html?redirect=../checkout.html";

        return false;
    }

    return true;
}

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        const usuarioLogado =
            await exigirLoginNoCheckout();

        if (!usuarioLogado) {
            return;
        }

        CheckoutState.cart = loadStorage(
            CHECKOUT_KEYS.cart,
            []
        );

        await loadProducts();

        restoreDraft();
        bindEvents();
        renderCheckout();

        const clientePreenchido =
            await preencherClienteLogadoNoCheckout();

        if (clientePreenchido) {
            toast(
                "Seus dados foram preenchidos automaticamente."
            );
        } else if (CheckoutState.cart.length) {
            toast("Seu carrinho foi carregado.");
        }
    }
);

async function loadProducts() {
    if (!window.mugartSupabase) {
        toast("Supabase não carregou.");
        return;
    }

    const r = await mugartSupabase
        .from("products")
        .select("*,categories(id,name)")
        .eq("active", true);

    if (r.error) {
        console.error(r.error);
        toast("Erro ao carregar produtos.");
        return;
    }

    CheckoutState.products = r.data || [];
}

function bindEvents() {
    qs("#checkoutForm").addEventListener("submit", finishOrder);

    qs("#finishOrderBtn").addEventListener("click", () => {
        qs("#checkoutForm").requestSubmit();
    });

    qs("#applyCouponBtn").addEventListener("click", applyCoupon);

    qsa("input,select").forEach(f => {
        f.addEventListener("input", () => {
            applyMasks(f);
            saveDraft();
            updateProgress();
        });

        f.addEventListener("change", () => {
            saveDraft();
            updateProgress();
        });
    });

    const phone = qs("#customerPhone");
    const documentInput = qs("#customerDocument");
    const zip = qs("#shippingZip");
    const email = qs("#customerEmail");

    if (phone) {
        phone.addEventListener("input", () => {
            phone.value = formatPhone(phone.value);
            setInvalid("customerPhone", phone.value && !phoneValido(phone.value));
        });
    }

    if (documentInput) {
        documentInput.addEventListener("input", () => {
            documentInput.value = formatCpfCnpj(documentInput.value);

            if (documentInput.value) {
                setInvalid("customerDocument", !documentoValido(documentInput.value));
            } else {
                setInvalid("customerDocument", false);
            }
        });
    }

    if (email) {
        email.addEventListener("blur", () => {
            setInvalid("customerEmail", email.value && !emailValido(email.value));
        });
    }

    if (zip) {
        zip.addEventListener("input", handleCepInput);
        zip.addEventListener("blur", searchCep);
    }

    qsa("input[name='shippingMethod']").forEach(r => {
        r.addEventListener("change", () => {
            CheckoutState.selectedShipping = r.value;
            CheckoutState.shipping = Number(r.dataset.price || 0);
            updateOptionCards();
            renderSummary();
            saveDraft();
        });
    });

    qsa("input[name='paymentMethod']").forEach(r => {
        r.addEventListener("change", () => {
            CheckoutState.selectedPayment = r.value;
            updateOptionCards();
            saveDraft();
        });
    });
}

function applyMasks(field) {
    if (!field || !field.id) return;

    if (field.id === "customerPhone") {
        field.value = formatPhone(field.value);
    }

    if (field.id === "customerDocument") {
        field.value = formatCpfCnpj(field.value);
    }

    if (field.id === "shippingZip") {
        field.value = formatCep(field.value);
    }

    if (field.id === "shippingState") {
        field.value = String(field.value || "").replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
    }
}

function restoreDraft() {
    const d = loadStorage(CHECKOUT_KEYS.draft, null);

    if (!d) return;

    Object.keys(d).forEach(id => {
        const el = qs("#" + id);

        if (el) {
            el.value = d[id];
            applyMasks(el);
        }
    });

    CheckoutState.discount = Number(d.discount || 0);
    CheckoutState.shipping = Number(d.shipping || 0);
    CheckoutState.coupon = d.coupon || "";
}

function saveDraft() {
    const ids = [
        "customerName",
        "customerPhone",
        "customerEmail",
        "customerDocument",
        "shippingZip",
        "shippingStreet",
        "shippingNumber",
        "shippingComplement",
        "shippingNeighborhood",
        "shippingCity",
        "shippingState",
        "couponCode"
    ];

    const d = {};

    ids.forEach(id => {
        d[id] = qs("#" + id)?.value || "";
    });

    d.discount = CheckoutState.discount;
    d.shipping = CheckoutState.shipping;
    d.coupon = CheckoutState.coupon;

    saveStorage(CHECKOUT_KEYS.draft, d);
}

function renderCheckout() {
    renderItems();
    renderSummary();
    updateOptionCards();
}

function getProduct(id) {
    return CheckoutState.products.find(p => p.id === id);
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
        };
    }).filter(Boolean);
}

function renderItems() {
    const c = qs("#checkoutItems");
    const items = getCartItems();

    if (!items.length) {
        c.innerHTML = `
            <div class="empty-cart">
                <h3>Carrinho vazio</h3>
                <p>Volte para a loja e adicione produtos antes de finalizar.</p>
            </div>
        `;

        renderSummary();
        return;
    }

    c.innerHTML = items.map(i => `
        <article class="checkout-item">
            <img src="${i.product.image_url || "assets/hero-caneca.png"}" alt="${i.product.name}">
            
            <div class="item-info">
                <h3>${i.product.name}</h3>
                <span>
                    ${i.product.sku || "-"}
                    ${i.product.color ? " • " + i.product.color : ""}
                </span>

                <div class="item-controls">
                    <button type="button" onclick="changeQty('${i.productId}', -1)">−</button>
                    <input 
                        value="${i.quantity}" 
                        type="number" 
                        min="1" 
                        onchange="setQty('${i.productId}', this.value)"
                    >
                    <button type="button" onclick="changeQty('${i.productId}', 1)">+</button>
                </div>
            </div>

            <div class="item-price">
                <strong>${money(i.subtotal)}</strong>
                <button type="button" onclick="removeItem('${i.productId}')">Remover</button>
            </div>
        </article>
    `).join("");

    renderSummary();
}

function renderSummary() {
    const items = getCartItems();

    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const total = Math.max(0, subtotal - CheckoutState.discount + CheckoutState.shipping);

    qs("#summaryItems").innerHTML = items.length
        ? items.map(i => `
            <div class="summary-item">
                <img src="${i.product.image_url || "assets/hero-caneca.png"}">
                <div>
                    <strong>${i.product.name}</strong>
                    <span>${i.quantity}x • ${money(i.product.price)}</span>
                </div>
                <b>${money(i.subtotal)}</b>
            </div>
        `).join("")
        : '<p class="summary-note">Nenhum item no carrinho.</p>';

    qs("#summarySubtotal").textContent = money(subtotal);
    qs("#summaryDiscount").textContent = money(CheckoutState.discount);
    qs("#summaryShipping").textContent = money(CheckoutState.shipping);
    qs("#summaryTotal").textContent = money(total);

    updateProgress();
}

function updateProgress() {
    const hasItems = getCartItems().length > 0;

    const hasCustomer =
        qs("#customerName").value &&
        qs("#customerPhone").value &&
        qs("#customerEmail").value;

    const hasAddress =
        qs("#shippingZip").value &&
        qs("#shippingStreet").value &&
        qs("#shippingNumber").value;

    qsa(".progress-step").forEach(s => s.classList.remove("active"));

    qs("[data-step='cart']").classList.add("active");

    if (hasItems) {
        qs("[data-step='customer']").classList.add("active");
    }

    if (hasCustomer) {
        qs("[data-step='shipping']").classList.add("active");
    }

    if (hasAddress) {
        qs("[data-step='payment']").classList.add("active");
    }
}

window.changeQty = (id, d) => {
    const i = CheckoutState.cart.find(x => x.productId === id);

    if (!i) return;

    i.quantity = Math.max(1, Number(i.quantity || 1) + d);

    persistCart();
    renderItems();
};

window.setQty = (id, v) => {
    const i = CheckoutState.cart.find(x => x.productId === id);

    if (!i) return;

    i.quantity = Math.max(1, Number(v || 1));

    persistCart();
    renderItems();
};

window.removeItem = id => {
    CheckoutState.cart = CheckoutState.cart.filter(i => i.productId !== id);

    persistCart();
    renderItems();
};

function persistCart() {
    saveStorage(CHECKOUT_KEYS.cart, CheckoutState.cart);
}

function applyCoupon() {
    const code = qs("#couponCode").value.trim().toUpperCase();

    if (!code) {
        toast("Digite um cupom.");
        return;
    }

    if (code === "MUGART10") {
        const subtotal = getCartItems().reduce((s, i) => s + i.subtotal, 0);

        CheckoutState.discount = subtotal * 0.1;
        CheckoutState.coupon = code;

        toast("Cupom aplicado: 10% de desconto.");
    } else {
        CheckoutState.discount = 0;
        CheckoutState.coupon = "";

        toast("Cupom inválido.");
    }

    renderSummary();
    saveDraft();
}

function updateOptionCards() {
    qsa(".option-card").forEach(c => {
        const i = c.querySelector("input");

        if (i) {
            c.classList.toggle("active", i.checked);
        }
    });
}

function handleCepInput(e) {
    e.target.value = formatCep(e.target.value);

    if (onlyNumbers(e.target.value).length === 8) {
        searchCep();
    }
}

async function searchCep() {
    const cep = onlyNumbers(qs("#shippingZip").value);

    if (cep.length !== 8) return;

    try {
        toast("Buscando endereço...");

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

        toast("Endereço preenchido automaticamente.");

        await calculateShipping();
        
    } catch (e) {
        console.error(e);
        toast("Erro ao buscar CEP.");
    }
}

async function calculateShipping() {
    const cep = onlyNumbers(qs("#shippingZip")?.value || "");

    if (cep.length !== 8) return;

    const shippingOptions = qs("#shippingOptions");
    const shippingLoading = qs("#shippingLoading");

    if (!shippingOptions || !shippingLoading) return;

    shippingLoading.style.display = "block";
    shippingOptions.innerHTML = "";

    const items = getCartItems();
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

    try {
        const { data, error } = await mugartSupabase.functions.invoke(
            "calculate-shipping",
            {
                body: {
                    to_zip: cep,
                    quantity: items.reduce(
                        (sum, item) => sum + item.quantity,
                        0
                    ),
                    insurance_value: subtotal
                }
            }
        );

        if (
            error ||
            !data?.success ||
            !Array.isArray(data.options) ||
            !data.options.length
        ) {
            console.error("Erro ao calcular frete:", error || data);

            shippingOptions.innerHTML =
                "<p>Não foi possível calcular o frete.</p>";

            CheckoutState.shipping = 0;
            CheckoutState.selectedShipping = "";
            CheckoutState.selectedShippingCompany = "";
            CheckoutState.selectedShippingService = "";
            CheckoutState.selectedShippingDeliveryTime = 0;

            renderSummary();
            saveDraft();
            return;
        }

        shippingOptions.innerHTML = "";

        data.options.forEach((option, index) => {
            const label = document.createElement("label");

            label.className =
                "option-card" + (index === 0 ? " active" : "");

            label.innerHTML = `
                <input
                    type="radio"
                    name="shippingMethod"
                    value="${option.id}"
                    data-price="${option.price}"
                    ${index === 0 ? "checked" : ""}
                >

                <div>
                    <strong>${option.company}</strong>
                    <span>${option.name}</span>
                    <small>${option.delivery_time} dias úteis</small>
                </div>

                <b>${money(option.price)}</b>
            `;

            const input = label.querySelector("input");

            input?.addEventListener("change", () => {
                CheckoutState.selectedShipping = option.id;
                CheckoutState.selectedShippingCompany = option.company || "";
                CheckoutState.selectedShippingService = option.name || "";
                CheckoutState.selectedShippingDeliveryTime =
                    Number(option.delivery_time || 0);
                CheckoutState.shipping = Number(option.price || 0);

                updateOptionCards();
                renderSummary();
                saveDraft();
            });

            shippingOptions.appendChild(label);
        });

        const primeiraOpcao = data.options[0];

        CheckoutState.selectedShipping = primeiraOpcao.id;
        CheckoutState.selectedShippingCompany = primeiraOpcao.company || "";
        CheckoutState.selectedShippingService = primeiraOpcao.name || "";
        CheckoutState.selectedShippingDeliveryTime =
            Number(primeiraOpcao.delivery_time || 0);
        CheckoutState.shipping = Number(primeiraOpcao.price || 0);

        updateOptionCards();
        renderSummary();
        saveDraft();

    } catch (error) {
        console.error("Erro inesperado ao calcular frete:", error);

        shippingOptions.innerHTML =
            "<p>Não foi possível calcular o frete.</p>";

        CheckoutState.shipping = 0;
        renderSummary();

    } finally {
        shippingLoading.style.display = "none";
    }
}
async function iniciarPagamentoMercadoPago(order) {
    const paymentItems = (order.items || []).map(
        item => ({
            id:
                item.product_id ||
                item.id,

            title:
                item.product_name ||
                item.title ||
                "Produto MugArt",

            quantity:
                Number(item.quantity || 1),

            currency_id: "BRL",

            unit_price:
                Number(item.unit_price || 0)
        })
    );

    if (!paymentItems.length) {
        throw new Error(
            "O pedido foi criado, mas não possui itens para pagamento."
        );
    }

    const response =
        await mugartSupabase.functions.invoke(
            "create-payment",
            {
                body: {
                    order_id: order.id,
                    customer_name:
                        order.customer_name,

                    customer_email:
                        order.customer_email,

                    items: paymentItems
                }
            }
        );

    console.log(
        "Resposta do Mercado Pago:",
        response
    );

    const { data, error } = response;

    if (error) {
        console.error(
            "Erro na create-payment:",
            error
        );

        throw new Error(
            error.message ||
            "Erro ao iniciar pagamento."
        );
    }

    if (!data?.init_point) {
        console.error(
            "Resposta inválida da create-payment:",
            data
        );

        throw new Error(
            data?.error ||
            "Mercado Pago não retornou o link."
        );
    }

    /*
     * Limpa carrinho e rascunho somente depois
     * que o Mercado Pago retorna o link.
     */
    localStorage.removeItem(
        CHECKOUT_KEYS.cart
    );

    localStorage.removeItem(
        CHECKOUT_KEYS.draft
    );

    window.location.href =
        data.init_point;
}



async function criarPedidoPelaEdgeFunction(payload) {
    const { data, error } =
        await mugartSupabase.functions.invoke(
            "create-order",
            {
                body: payload
            }
        );

    if (error) {
        console.error(
            "Erro ao chamar create-order:",
            error
        );

        let message =
            error.message ||
            "Não foi possível criar o pedido.";

        /*
         * Em alguns erros de Edge Function, a resposta
         * detalhada fica disponível no contexto.
         */
        try {
            const responseBody =
                await error.context?.json?.();

            if (responseBody?.error) {
                message = responseBody.error;
            }
        } catch {
            // Mantém a mensagem original.
        }

        throw new Error(message);
    }

    if (!data?.success || !data?.data?.order_id) {
        console.error(
            "Resposta inválida da create-order:",
            data
        );

        throw new Error(
            data?.error ||
            "A função não retornou o pedido criado."
        );
    }

    return data.data;
}

async function finishOrder(e) {
    e.preventDefault();

    const finishButton = qs("#finishOrderBtn");
    const originalButtonText =
        finishButton?.textContent || "Ir para pagamento";

    const items = getCartItems();

    if (!items.length) {
        toast("Seu carrinho está vazio.");
        return;
    }

    if (!validarCamposCliente()) {
        toast(
            "Confira nome, telefone, e-mail e CPF/CNPJ."
        );
        return;
    }

    if (!validarEndereco()) {
        toast("Confira o endereço de entrega.");
        return;
    }

    const customerPayload = {
        name: qs("#customerName").value.trim(),

        email: qs("#customerEmail")
            .value
            .trim()
            .toLowerCase(),

        phone: qs("#customerPhone").value.trim(),

        cpf_cnpj:
            qs("#customerDocument").value.trim(),

        zip: qs("#shippingZip").value.trim(),

        address:
            qs("#shippingStreet").value.trim(),

        city: qs("#shippingCity").value.trim(),

        state:
            qs("#shippingState")
                .value
                .trim()
                .toUpperCase()
    };

    const addressPayload = {
        recipient_name: customerPayload.name,
        phone: customerPayload.phone,

        zip: qs("#shippingZip").value.trim(),

        street:
            qs("#shippingStreet").value.trim(),

        number:
            qs("#shippingNumber").value.trim(),

        complement:
            qs("#shippingComplement").value.trim(),

        neighborhood:
            qs("#shippingNeighborhood").value.trim(),

        city: qs("#shippingCity").value.trim(),

        state:
            qs("#shippingState")
                .value
                .trim()
                .toUpperCase(),

        country: "Brasil"
    };

    /*
     * Enviamos apenas ID e quantidade.
     * A Edge Function consulta nome, preço e estoque
     * diretamente no banco.
     */
    const itemPayload = items.map(item => ({
        product_id: item.product.id,
        quantity: Number(item.quantity || 1)
    }));

    const createOrderPayload = {
        customer: customerPayload,
        address: addressPayload,
        items: itemPayload,

        payment_method:
            CheckoutState.selectedPayment,

        shipping:
            Number(CheckoutState.shipping || 0),

        shipping_method:
            CheckoutState.selectedShipping || null,

        shipping_company:
            CheckoutState.selectedShippingCompany || null,

        shipping_service:
            CheckoutState.selectedShippingService || null,

        shipping_delivery_time:
            Number(
                CheckoutState.selectedShippingDeliveryTime || 0
            ),

        coupon:
            CheckoutState.coupon || "",

        notes:
            "Pedido criado pelo Checkout 3.0 via Edge Function."
    };

    try {
        if (finishButton) {
            finishButton.disabled = true;
            finishButton.textContent =
                "Criando pedido...";
        }

        toast("Criando seu pedido...");

        const createdOrder =
            await criarPedidoPelaEdgeFunction(
                createOrderPayload
            );

        console.log(
            "Pedido criado pela Edge Function:",
            createdOrder
        );

        if (finishButton) {
            finishButton.textContent =
                "Abrindo pagamento...";
        }

        await iniciarPagamentoMercadoPago({
            id: createdOrder.order_id,

            customer_name:
                createdOrder.customer_name ||
                customerPayload.name,

            customer_email:
                createdOrder.customer_email ||
                customerPayload.email,

            items:
                createdOrder.items || []
        });

    } catch (error) {
        console.error(
            "Erro ao finalizar pedido:",
            error
        );

        toast(
            error.message ||
            "Não foi possível finalizar o pedido."
        );

        if (finishButton) {
            finishButton.disabled = false;
            finishButton.textContent =
                originalButtonText;
        }
    }
}
