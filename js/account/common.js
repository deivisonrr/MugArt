
/* ==========================================================
   MugArt - Área do Cliente
   common.js
========================================================== */

window.Account = {

    session: null,

    user: null,

    customer: null,

    orders: [],

    addresses: [],

    currentSection: "dashboard"

};

/* ==========================================================
   Toast
========================================================== */

Account.showMessage = function (message, type = "success") {

    const box = document.getElementById("accountMessage");

    if (!box) return;

    box.className = `account-message ${type}`;

    box.innerHTML = message;

    box.style.display = "block";

    clearTimeout(box.timer);

    box.timer = setTimeout(() => {

        box.style.display = "none";

    }, 4000);

};

/* ==========================================================
   Helpers
========================================================== */

Account.onlyNumbers = function (value) {

    return String(value || "").replace(/\D/g, "");

};

Account.formatMoney = function (value) {

    return Number(value || 0).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

};

Account.formatDate = function (date) {

    if (!date) return "-";

    return new Date(date).toLocaleDateString("pt-BR");

};

Account.firstName = function () {

    if (!Account.customer) return "";

    return Account.customer.name.split(" ")[0];

};

/* ==========================================================
   Sessão
========================================================== */

Account.loadSession = async function () {

    const { data, error } =
        await mugartSupabase.auth.getSession();

    if (error) {

        console.error(error);

        location.href = "login.html";

        return false;

    }

    if (!data.session) {

        location.href = "login.html";

        return false;

    }

    Account.session = data.session;

    Account.user = data.session.user;

    return true;

};

/* ==========================================================
   Cliente
========================================================== */

Account.loadCustomer = async function () {

    const { data, error } =
        await mugartSupabase
            .from("customers")
            .select("*")
            .eq(
                "auth_user_id",
                Account.user.id
            )
            .single();

    if (error) {

        console.error(error);

        Account.showMessage(
            "Não foi possível carregar seus dados.",
            "error"
        );

        return false;

    }

    Account.customer = data;

    return true;

};

/* ==========================================================
   Atualiza cabeçalho
========================================================== */

Account.updateHeader = function () {

    if (!Account.customer) return;

    const name =
        Account.customer.name || "";

    const email =
        Account.customer.email || "";

    const avatar =
        name.substring(0, 1).toUpperCase();

    document.getElementById(
        "headerCustomerName"
    ).textContent = name;

    document.getElementById(
        "sidebarCustomerName"
    ).textContent = name;

    document.getElementById(
        "sidebarCustomerEmail"
    ).textContent = email;

    document.getElementById(
        "dashboardGreeting"
    ).textContent =
        `Olá, ${Account.firstName()} 👋`;

    document.getElementById(
        "accountAvatar"
    ).textContent = avatar;

};

/* ==========================================================
   Logout
========================================================== */

Account.logout = async function () {

    await mugartSupabase.auth.signOut();

    location.href = "login.html";

};

/* ==========================================================
   Menu lateral
========================================================== */

Account.openSection = function (section) {

    document
        .querySelectorAll(".account-menu-button")
        .forEach(btn => {

            btn.classList.remove("active");

        });

    document
        .querySelectorAll(".account-section")
        .forEach(sec => {

            sec.classList.remove("active");

        });

    document
        .querySelector(
            `[data-account-section="${section}"]`
        )
        ?.classList.add("active");

    document
        .querySelector(
            `[data-section-name="${section}"]`
        )
        ?.classList.add("active");

    Account.currentSection = section;

};

/* ==========================================================
   ViaCEP
========================================================== */

Account.buscarCEP = async function (cep) {

    cep = Account.onlyNumbers(cep);

    if (cep.length !== 8)
        return null;

    const response =
        await fetch(
            `https://viacep.com.br/ws/${cep}/json/`
        );

    const data =
        await response.json();

    if (data.erro)
        return null;

    return data;

};
