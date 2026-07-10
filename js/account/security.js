/* ==========================================================
   MugArt - Área do Cliente
   security.js
========================================================== */

Account.changePassword = async function (event) {

    event.preventDefault();

    const button =
        document.getElementById(
            "savePasswordButton"
        );

    const password =
        document
            .getElementById("newPassword")
            .value;

    const confirmPassword =
        document
            .getElementById("confirmNewPassword")
            .value;

    if (password.length < 6) {

        Account.showMessage(
            "A senha deve possuir pelo menos 6 caracteres.",
            "error"
        );

        return;

    }

    if (password !== confirmPassword) {

        Account.showMessage(
            "As senhas não coincidem.",
            "error"
        );

        return;

    }

    try {

        if (button) {

            button.disabled = true;
            button.textContent =
                "Alterando...";

        }

        const { error } =
            await mugartSupabase.auth.updateUser({

                password

            });

        if (error)
            throw error;

        document
            .getElementById("passwordForm")
            .reset();

        Account.showMessage(

            "Senha alterada com sucesso.",

            "success"

        );

    } catch (error) {

        console.error(error);

        Account.showMessage(

            error.message ||

            "Não foi possível alterar a senha.",

            "error"

        );

    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "Alterar senha";

        }

    }

};

document.addEventListener(
    "DOMContentLoaded",
    () => {

        document
            .getElementById("passwordForm")
            ?.addEventListener(

                "submit",

                Account.changePassword

            );

    }
);
