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

const Account = window.Account;

document.addEventListener("DOMContentLoaded", async () => {
    const loading = document.getElementById("accountLoading");
    const app = document.getElementById("accountApp");

    try {
        if (!window.mugartSupabase) {
            throw new Error("Supabase não carregou.");
        }

        const hasSession = await Account.loadSession();

        if (!hasSession) return;

        const hasCustomer = await Account.loadCustomer();

        if (!hasCustomer) return;

        Account.updateHeader();
        bindAccountNavigation();
        bindAccountActions();

        if (typeof Account.loadOrders === "function") {
            await Account.loadOrders();
        }

        if (typeof Account.loadAddresses === "function") {
            await Account.loadAddresses();
        }

        if (typeof Account.fillProfileForm === "function") {
            Account.fillProfileForm();
        }

        Account.openSection("dashboard");

        loading?.classList.add("hidden");
        app?.classList.remove("hidden");

    } catch (error) {
        console.error("Erro ao inicializar a área do cliente:", error);

        if (loading) {
            loading.innerHTML = `
                <div class="account-empty-state">
                    <span>⚠️</span>
                    <h3>Não foi possível carregar sua conta</h3>
                    <p>${error.message || "Tente novamente em instantes."}</p>
                    <a href="login.html">Voltar ao login</a>
                </div>
            `;
        }
    }
});

function bindAccountNavigation() {
    document
        .querySelectorAll("[data-account-section]")
        .forEach(button => {
            button.addEventListener("click", () => {
                const section = button.dataset.accountSection;

                Account.openSection(section);

                if (
                    section === "orders" &&
                    typeof Account.renderOrders === "function"
                ) {
                    Account.renderOrders();
                }

                if (
                    section === "addresses" &&
                    typeof Account.renderAddresses === "function"
                ) {
                    Account.renderAddresses();
                }

                if (
                    section === "profile" &&
                    typeof Account.fillProfileForm === "function"
                ) {
                    Account.fillProfileForm();
                }
            });
        });

    document
        .querySelectorAll("[data-open-section]")
        .forEach(button => {
            button.addEventListener("click", () => {
                Account.openSection(button.dataset.openSection);
            });
        });

    document
        .getElementById("viewAllOrdersButton")
        ?.addEventListener("click", () => {
            Account.openSection("orders");

            if (typeof Account.renderOrders === "function") {
                Account.renderOrders();
            }
        });
}

function bindAccountActions() {
    document
        .getElementById("headerLogoutButton")
        ?.addEventListener("click", Account.logout);

    document
        .getElementById("sidebarLogoutButton")
        ?.addEventListener("click", Account.logout);
}
