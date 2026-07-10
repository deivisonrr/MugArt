const loginForm = document.getElementById("loginForm");
const showRegister = document.getElementById("showRegister");
const showReset = document.getElementById("showReset");

function showMessage(message) {
    alert(message);
}

async function login(email, password) {
    const { data, error } = await mugartSupabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        showMessage("E-mail ou senha inválidos.");
        return;
    }

    window.location.href = "minha-conta.html";
}

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        await login(email, password);
    });
}

showRegister.addEventListener("click", async (event) => {
    event.preventDefault();

    const email = prompt("Digite seu e-mail:");
    if (!email) return;

    const password = prompt("Crie uma senha:");
    if (!password) return;

    const { data, error } = await mugartSupabase.auth.signUp({
        email,
        password
    });

    if (error) {
        showMessage(error.message);
        return;
    }

    showMessage("Conta criada! Verifique seu e-mail ou faça login.");
});

showReset.addEventListener("click", async (event) => {
    event.preventDefault();

    const email = prompt("Digite seu e-mail para recuperar a senha:");
    if (!email) return;

    const { error } = await mugartSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/conta/minha-conta.html"
    });

    if (error) {
        showMessage(error.message);
        return;
    }

    showMessage("Enviamos um link de recuperação para seu e-mail.");
});
