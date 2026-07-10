document.addEventListener("DOMContentLoaded", async () => {
    const wrapper = document.getElementById("headerAccount");
    const button = document.getElementById("headerAccountButton");
    const dropdown = document.getElementById("headerAccountDropdown");

    const greeting = document.getElementById("headerAccountGreeting");
    const title = document.getElementById("headerAccountTitle");
    const avatar = document.getElementById("headerAccountAvatar");

    const guestArea = document.getElementById("headerAccountGuest");
    const loggedArea = document.getElementById("headerAccountLogged");

    const customerName = document.getElementById(
        "headerAccountCustomerName"
    );

    const customerInitial = document.getElementById(
        "headerAccountInitial"
    );

    const logoutButton = document.getElementById(
        "headerAccountLogout"
    );

    if (!wrapper || !button || !dropdown) {
        console.error("Menu da conta não encontrado no HTML.");
        return;
    }

    function closeDropdown() {
        wrapper.classList.remove("open");
        button.setAttribute("aria-expanded", "false");
    }

    button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const opened = wrapper.classList.toggle("open");

        button.setAttribute(
            "aria-expanded",
            String(opened)
        );
    });

    dropdown.addEventListener("click", (event) => {
        event.stopPropagation();
    });

    document.addEventListener("click", closeDropdown);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeDropdown();
        }
    });

    function showGuest() {
        if (greeting) {
            greeting.textContent = "Olá, visitante";
        }

        if (title) {
            title.textContent = "Entrar";
        }

        if (avatar) {
            avatar.textContent = "👤";
        }

        guestArea?.classList.remove("hidden");
        loggedArea?.classList.add("hidden");
    }

    function showLoggedUser(name) {
        const fullName = String(name || "Cliente").trim();
        const firstName = fullName.split(" ")[0] || "Cliente";
        const initial = firstName.charAt(0).toUpperCase() || "M";

        if (greeting) {
            greeting.textContent = `Olá, ${firstName}`;
        }

        if (title) {
            title.textContent = "Minha conta";
        }

        if (avatar) {
            avatar.textContent = initial;
        }

        if (customerName) {
            customerName.textContent = fullName;
        }

        if (customerInitial) {
            customerInitial.textContent = initial;
        }

        guestArea?.classList.add("hidden");
        loggedArea?.classList.remove("hidden");
    }

    if (!window.mugartSupabase) {
        console.error("Supabase não carregou no cabeçalho.");
        showGuest();
        return;
    }

    try {
        const { data, error } =
            await mugartSupabase.auth.getSession();

        if (error) {
            throw error;
        }

        const user = data?.session?.user;

        if (!user) {
            showGuest();
        } else {
            const { data: customer, error: customerError } =
                await mugartSupabase
                    .from("customers")
                    .select("name")
                    .eq("auth_user_id", user.id)
                    .maybeSingle();

            if (customerError) {
                console.error(
                    "Erro ao carregar cliente:",
                    customerError
                );
            }

            const name =
                customer?.name ||
                user.user_metadata?.name ||
                user.email?.split("@")[0] ||
                "Cliente";

            showLoggedUser(name);
        }
    } catch (error) {
        console.error(
            "Erro ao verificar sessão:",
            error
        );

        showGuest();
    }

    logoutButton?.addEventListener("click", async () => {
        logoutButton.disabled = true;
        logoutButton.textContent = "Saindo...";

        const { error } =
            await mugartSupabase.auth.signOut();

        if (error) {
            console.error("Erro ao sair:", error);

            logoutButton.disabled = false;
            logoutButton.innerHTML = `
                <i class="fa-solid fa-right-from-bracket"></i>
                Sair
            `;

            return;
        }

        window.location.reload();
    });
});
