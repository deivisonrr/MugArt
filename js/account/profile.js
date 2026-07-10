/* ==========================================================
   MugArt - Área do Cliente
   profile.js
========================================================== */

Account.formatCpfCnpj = function (value) {
    const numbers =
        Account.onlyNumbers(value).slice(0, 14);

    if (!numbers) return "";

    if (numbers.length <= 11) {
        if (numbers.length <= 3) {
            return numbers;
        }

        if (numbers.length <= 6) {
            return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
        }

        if (numbers.length <= 9) {
            return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
        }

        return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
    }

    if (numbers.length <= 2) {
        return numbers;
    }

    if (numbers.length <= 5) {
        return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    }

    if (numbers.length <= 8) {
        return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    }

    if (numbers.length <= 12) {
        return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    }

    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
};

Account.isValidEmail = function (email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
        String(email || "").trim()
    );
};

Account.isValidPhone = function (phone) {
    return Account.onlyNumbers(phone).length === 11;
};

Account.isValidDocument = function (documentValue) {
    const numbers =
        Account.onlyNumbers(documentValue);

    return (
        numbers.length === 11 ||
        numbers.length === 14
    );
};

Account.fillProfileForm = function () {
    if (!Account.customer) return;

    const nameInput =
        document.getElementById("profileName");

    const phoneInput =
        document.getElementById("profilePhone");

    const documentInput =
        document.getElementById("profileDocument");

    const emailInput =
        document.getElementById("profileEmail");

    if (nameInput) {
        nameInput.value =
            Account.customer.name || "";
    }

    if (phoneInput) {
        phoneInput.value =
            Account.formatPhone(
                Account.customer.phone || ""
            );
    }

    if (documentInput) {
        documentInput.value =
            Account.formatCpfCnpj(
                Account.customer.cpf_cnpj || ""
            );
    }

    if (emailInput) {
        emailInput.value =
            Account.customer.email ||
            Account.user?.email ||
            "";
    }
};

Account.saveProfile = async function (event) {
    event.preventDefault();

    const button =
        document.getElementById("saveProfileButton");

    const name =
        document
            .getElementById("profileName")
            .value
            .trim();

    const phone =
        document
            .getElementById("profilePhone")
            .value
            .trim();

    const documentValue =
        document
            .getElementById("profileDocument")
            .value
            .trim();

    const email =
        document
            .getElementById("profileEmail")
            .value
            .trim()
            .toLowerCase();

    if (name.length < 3) {
        Account.showMessage(
            "Digite seu nome completo.",
            "error"
        );

        return;
    }

    if (!Account.isValidPhone(phone)) {
        Account.showMessage(
            "Digite um WhatsApp válido.",
            "error"
        );

        return;
    }

    if (!Account.isValidDocument(documentValue)) {
        Account.showMessage(
            "Digite um CPF ou CNPJ completo.",
            "error"
        );

        return;
    }

    if (!Account.isValidEmail(email)) {
        Account.showMessage(
            "Digite um e-mail válido.",
            "error"
        );

        return;
    }

    try {
        if (button) {
            button.disabled = true;
            button.textContent = "Salvando...";
        }

        const customerResult =
            await mugartSupabase
                .from("customers")
                .update({
                    name,
                    phone,
                    cpf_cnpj: documentValue,
                    email
                })
                .eq(
                    "id",
                    Account.customer.id
                )
                .select()
                .single();

        if (customerResult.error) {
            throw customerResult.error;
        }

        const currentAuthEmail =
            String(Account.user?.email || "")
                .trim()
                .toLowerCase();

        if (
            email &&
            email !== currentAuthEmail
        ) {
            const authResult =
                await mugartSupabase.auth.updateUser({
                    email
                });

            if (authResult.error) {
                throw authResult.error;
            }

            Account.showMessage(
                "Dados atualizados. Confirme o novo e-mail pelo link enviado.",
                "success"
            );
        } else {
            Account.showMessage(
                "Dados atualizados com sucesso.",
                "success"
            );
        }

        Account.customer =
            customerResult.data;

        if (Account.user) {
            Account.user.email = email;
        }

        Account.updateHeader();
        Account.fillProfileForm();

    } catch (error) {
        console.error(
            "Erro ao atualizar perfil:",
            error
        );

        Account.showMessage(
            error?.message ||
            "Não foi possível atualizar seus dados.",
            "error"
        );

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent =
                "Salvar alterações";
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const form =
        document.getElementById("profileForm");

    const phoneInput =
        document.getElementById("profilePhone");

    const documentInput =
        document.getElementById("profileDocument");

    form?.addEventListener(
        "submit",
        Account.saveProfile
    );

    phoneInput?.addEventListener(
        "input",
        () => {
            phoneInput.value =
                Account.formatPhone(
                    phoneInput.value
                );
        }
    );

    documentInput?.addEventListener(
        "input",
        () => {
            documentInput.value =
                Account.formatCpfCnpj(
                    documentInput.value
                );
        }
    );
});
