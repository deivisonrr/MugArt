/* ==========================================================
   MugArt - Área do Cliente
   common.js
========================================================== */

var Account = window.Account = {
    session: null,
    user: null,
    customer: null,
    orders: [],
    addresses: [],
    currentSection: "dashboard"
};

/* ==========================================================
   Mensagens
========================================================== */

Account.showMessage = function (message, type = "success") {
    const box = document.getElementById("accountMessage");

    if (!box) return;

    box.className = `account-message ${type}`;
    box.textContent = message;
    box.style.display = "block";

    clearTimeout(box.timer);

    box.timer = setTimeout(() => {
        box.style.display = "none";
    }, 4000);
};

/* ==========================================================
   Funções auxiliares
========================================================== */

Account.onlyNumbers = function (value) {
    return String(value || "").replace(/\D/g, "");
};

Account.formatMoney = function (value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
};

Account.formatDate = function (date) {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("pt-BR");
};

Account.firstName = function () {
    const name = String(Account.customer?.name || "").trim();

    return name ? name.split(" ")[0] : "";
};

/* ==========================================================
   Sessão
========================================================== */

Account.loadSession = async function () {
    const { data, error } =
        await mugartSupabase.auth.getSession();

    if (error) {
        console.error("Erro ao carregar sessão:", error);
        window.location.href = "login.html";
        return false;
    }

    if (!data?.session) {
        window.location.href = "login.html";
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
    const { data, error } = await mugartSupabase
        .from("customers")
        .select("*")
        .eq("auth_user_id", Account.user.id)
        .maybeSingle();

    if (error) {
        console.error("Erro ao carregar cliente:", error);

        Account.showMessage(
            "Não foi possível carregar seus dados.",
            "error"
        );

        return false;
    }

    if (!data) {
        Account.showMessage(
            "Cadastro de cliente não encontrado.",
            "error"
        );

        return false;
    }

    Account.customer = data;

    return true;
};

/* ==========================================================
   Cabeçalho
========================================================== */

Account.updateHeader = function () {
    if (!Account.customer) return;

    const name = Account.customer.name || "Cliente";
    const email =
        Account.customer.email ||
        Account.user?.email ||
        "";

    const avatar = name.charAt(0).toUpperCase() || "M";

    const headerName =
        document.getElementById("headerCustomerName");

    const sidebarName =
        document.getElementById("sidebarCustomerName");

    const sidebarEmail =
        document.getElementById("sidebarCustomerEmail");

    const greeting =
        document.getElementById("dashboardGreeting");

    const avatarElement =
        document.getElementById("accountAvatar");

    if (headerName) headerName.textContent = name;
    if (sidebarName) sidebarName.textContent = name;
    if (sidebarEmail) sidebarEmail.textContent = email;
    if (avatarElement) avatarElement.textContent = avatar;

    if (greeting) {
        greeting.textContent =
            `Olá, ${Account.firstName()} 👋`;
    }
};

/* ==========================================================
   Logout
========================================================== */

Account.logout = async function () {
    const { error } =
        await mugartSupabase.auth.signOut();

    if (error) {
        console.error("Erro ao sair:", error);

        Account.showMessage(
            "Não foi possível encerrar a sessão.",
            "error"
        );

        return;
    }

    window.location.href = "login.html";
};

/* ==========================================================
   Menu
========================================================== */

Account.openSection = function (section) {
    document
        .querySelectorAll(".account-menu-button")
        .forEach((button) => {
            button.classList.remove("active");
        });

    document
        .querySelectorAll(".account-section")
        .forEach((element) => {
            element.classList.remove("active");
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
    const cleanCep = Account.onlyNumbers(cep);

    if (cleanCep.length !== 8) {
        return null;
    }

    const response = await fetch(
        `https://viacep.com.br/ws/${cleanCep}/json/`
    );

    if (!response.ok) {
        throw new Error("Erro ao consultar CEP.");
    }

    const data = await response.json();

    if (data.erro) {
        return null;
    }

    return data;
};
