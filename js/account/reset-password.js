const form = document.getElementById("newPasswordForm");
const messageBox = document.getElementById("authMessage");
const saveButton = document.getElementById("savePasswordButton");

function showMessage(message, type = "error") {
    messageBox.className = `auth-message show ${type}`;
    messageBox.textContent = message;
}

function setLoading(loading) {
    saveButton.disabled = loading;
    saveButton.classList.toggle("loading", loading);
}

async function confirmRecoverySession() {
    const { data, error } = await mugartSupabase.auth.getSession();

    if (error) {
        console.error(error);
        showMessage("Não foi possível validar o link de recuperação.");
        return false;
    }

    if (!data.session) {
        showMessage(
            "Este link é inválido ou expirou. Solicite uma nova recuperação."
        );
        return false;
    }

    return true;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password =
        document.getElementById("newPassword").value;

    const confirmation =
        document.getElementById("confirmPassword").value;

    if (password.length < 6) {
        showMessage("A senha deve possuir pelo menos 6 caracteres.");
        return;
    }

    if (password !== confirmation) {
        showMessage("As senhas não coincidem.");
        return;
    }

    try {
        setLoading(true);

        const { error } = await mugartSupabase.auth.updateUser({
            password
        });

        if (error) {
            throw error;
        }

        form.reset();

        showMessage(
            "Senha alterada com sucesso. Redirecionando para sua conta...",
            "success"
        );

        setTimeout(() => {
            window.location.href = "minha-conta.html";
        }, 1500);

    } catch (error) {
        console.error("Erro ao redefinir senha:", error);

        showMessage(
            error.message || "Não foi possível alterar sua senha."
        );

    } finally {
        setLoading(false);
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    if (!window.mugartSupabase) {
        showMessage("Não foi possível conectar ao Supabase.");
        return;
    }

    await confirmRecoverySession();
});
