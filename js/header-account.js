document.addEventListener("DOMContentLoaded", async () => {
    const button = document.getElementById("accountMenuButton");
    const dropdown = document.getElementById("accountDropdown");
    const label = document.getElementById("accountMenuLabel");
    const name = document.getElementById("accountMenuName");
    const loginLink = document.getElementById("accountLoginLink");
    const loggedOptions = document.getElementById("accountLoggedOptions");
    const logoutButton = document.getElementById("accountLogoutButton");

    if (!button || !dropdown) return;

    button.addEventListener("click", (event) => {
        event.stopPropagation();
        dropdown.classList.toggle("open");
    });

    dropdown.addEventListener("click", (event) => {
        event.stopPropagation();
    });

    document.addEventListener("click", () => {
        dropdown.classList.remove("open");
    });

    if (!window.mugartSupabase) {
        console.error("Supabase não carregou no cabeçalho.");
        return;
    }

    try {
        const { data, error } =
            await mugartSupabase.auth.getSession();

        if (error) {
            throw error;
        }

        const session = data?.session;

        if (!session?.user) {
            label.textContent = "Entrar";
            name.textContent = "Minha conta";
            loginLink.classList.remove("hidden");
            loggedOptions.classList.add("hidden");
            return;
        }

        const user = session.user;

        const { data: customer, error: customerError } =
            await mugartSupabase
                .from("customers")
                .select("name")
                .eq("auth_user_id", user.id)
                .maybeSingle();

        if (customerError) {
            console.error(
                "Erro ao carregar nome do cliente:",
                customerError
            );
        }

        const firstName = String(
            customer?.name ||
            user.user_metadata?.name ||
            "Cliente"
        )
            .trim()
            .split(" ")[0];

        label.textContent = `Olá, ${firstName}`;
        name.textContent = "Minha conta";

        loginLink.classList.add("hidden");
        loggedOptions.classList.remove("hidden");

    } catch (error) {
        console.error(
            "Erro ao verificar sessão no cabeçalho:",
            error
        );
    }

    logoutButton?.addEventListener("click", async () => {
        const { error } =
            await mugartSupabase.auth.signOut();

        if (error) {
            console.error("Erro ao sair:", error);
            return;
        }

        window.location.reload();
    });
});
