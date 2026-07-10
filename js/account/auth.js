/* =========================================================
   MugArt — Autenticação da Área do Cliente
   Arquivo: js/account/auth.js
========================================================= */

let authContent;
let tabLogin;
let tabRegister;
let tabReset;

function onlyNumbers(value) {
    return String(value || "").replace(/\D/g, "");
}

function formatPhone(value) {
    const numbers = onlyNumbers(value).slice(0, 11);

    if (!numbers) return "";

    if (numbers.length <= 2) {
        return `(${numbers}`;
    }

    if (numbers.length <= 6) {
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    }

    if (numbers.length <= 10) {
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }

    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
}

function formatCpfCnpj(value) {
    const numbers = onlyNumbers(value).slice(0, 14);

    if (!numbers) return "";

    if (numbers.length <= 11) {
        if (numbers.length <= 3) return numbers;

        if (numbers.length <= 6) {
            return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
        }

        if (numbers.length <= 9) {
            return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
        }

        return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
    }

    if (numbers.length <= 2) return numbers;

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
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
        String(email || "").trim()
    );
}

function isValidPhone(phone) {
    return onlyNumbers(phone).length === 11;
}

function isValidDocument(documentValue) {
    const documentNumbers = onlyNumbers(documentValue);

    return (
        documentNumbers.length === 11 ||
        documentNumbers.length === 14
    );
}

function setActiveTab(activeTab) {
    [tabLogin, tabRegister, tabReset].forEach((tab) => {
        tab?.classList.remove("active");
    });

    activeTab?.classList.add("active");
}

function showMessage(message, type = "error") {
    const messageElement = document.getElementById("authMessage");

    if (!messageElement) return;

    messageElement.className = `auth-message show ${type}`;
    messageElement.textContent = message;
}

function clearMessage() {
    const messageElement = document.getElementById("authMessage");

    if (!messageElement) return;

    messageElement.className = "auth-message";
    messageElement.textContent = "";
}

function setButtonLoading(button, loading) {
    if (!button) return;

    button.disabled = loading;
    button.classList.toggle("loading", loading);
}

function getErrorMessage(error) {
    const message = String(error?.message || "").toLowerCase();

    if (
        message.includes("invalid login credentials") ||
        message.includes("invalid credentials")
    ) {
        return "E-mail ou senha incorretos.";
    }

    if (message.includes("email not confirmed")) {
        return "Confirme seu e-mail antes de entrar.";
    }

    if (
        message.includes("user already registered") ||
        message.includes("already been registered")
    ) {
        return "Já existe uma conta cadastrada com este e-mail.";
    }

    if (message.includes("password should be at least")) {
        return "A senha deve possuir pelo menos 6 caracteres.";
    }

    if (message.includes("unable to validate email")) {
        return "Digite um endereço de e-mail válido.";
    }

    if (message.includes("email rate limit exceeded")) {
        return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    }

    return error?.message || "Não foi possível concluir a operação.";
}

/* =========================================================
   FORMULÁRIO DE LOGIN
========================================================= */

function renderLogin() {
    setActiveTab(tabLogin);

    authContent.innerHTML = `
        <form id="loginForm" class="auth-form auth-content-enter">

            <h2>Entrar</h2>

            <p>
                Acesse sua conta para acompanhar seus pedidos.
            </p>

            <div id="authMessage" class="auth-message"></div>

            <div class="auth-field">
                <label for="loginEmail">E-mail</label>

                <input
                    id="loginEmail"
                    type="email"
                    autocomplete="email"
                    placeholder="nome@empresa.com.br"
                    required
                >
            </div>

            <div class="auth-field">
                <label for="loginPassword">Senha</label>

                <input
                    id="loginPassword"
                    type="password"
                    autocomplete="current-password"
                    placeholder="Digite sua senha"
                    minlength="6"
                    required
                >
            </div>

            <button id="loginButton" type="submit">
                Entrar
            </button>

            <p class="auth-helper">
                Ainda não possui conta?
                <a href="#" id="goRegister">Criar conta</a>
            </p>

            <p class="auth-helper">
                <a href="#" id="goReset">Esqueci minha senha</a>
            </p>

        </form>
    `;

    document
        .getElementById("goRegister")
        ?.addEventListener("click", (event) => {
            event.preventDefault();
            renderRegister();
        });

    document
        .getElementById("goReset")
        ?.addEventListener("click", (event) => {
            event.preventDefault();
            renderReset();
        });

    document
        .getElementById("loginForm")
        ?.addEventListener("submit", handleLogin);
}

async function handleLogin(event) {
    event.preventDefault();

    clearMessage();

    const email = document
        .getElementById("loginEmail")
        .value
        .trim()
        .toLowerCase();

    const password = document
        .getElementById("loginPassword")
        .value;

    const button = document.getElementById("loginButton");

    if (!isValidEmail(email)) {
        showMessage("Digite um e-mail válido.");
        return;
    }

    if (password.length < 6) {
        showMessage("A senha deve possuir pelo menos 6 caracteres.");
        return;
    }

    try {
        setButtonLoading(button, true);

        const { data, error } =
            await mugartSupabase.auth.signInWithPassword({
                email,
                password
            });

        if (error) throw error;

        if (!data?.user) {
            throw new Error("Não foi possível identificar o usuário.");
        }

        showMessage("Login realizado com sucesso.", "success");

        setTimeout(() => {
            window.location.href = "minha-conta.html";
        }, 500);

    } catch (error) {
        console.error("Erro no login:", error);
        showMessage(getErrorMessage(error));

    } finally {
        setButtonLoading(button, false);
    }
}

/* =========================================================
   FORMULÁRIO DE CADASTRO
========================================================= */

function renderRegister() {
    setActiveTab(tabRegister);

    authContent.innerHTML = `
        <form id="registerForm" class="auth-form auth-content-enter">

            <h2>Criar conta</h2>

            <p>
                Cadastre-se para acompanhar seus pedidos e salvar endereços.
            </p>

            <div id="authMessage" class="auth-message"></div>

            <div class="auth-field">
                <label for="registerName">Nome completo</label>

                <input
                    id="registerName"
                    type="text"
                    autocomplete="name"
                    placeholder="Seu nome completo"
                    required
                >
            </div>

            <div class="auth-field-row">

                <div class="auth-field">
                    <label for="registerPhone">WhatsApp</label>

                    <input
                        id="registerPhone"
                        type="tel"
                        autocomplete="tel"
                        placeholder="(11) 99999-9999"
                        maxlength="15"
                        required
                    >
                </div>

                <div class="auth-field">
                    <label for="registerDocument">CPF/CNPJ</label>

                    <input
                        id="registerDocument"
                        type="text"
                        placeholder="000.000.000-00"
                        maxlength="18"
                        required
                    >
                </div>

            </div>

            <div class="auth-field">
                <label for="registerEmail">E-mail</label>

                <input
                    id="registerEmail"
                    type="email"
                    autocomplete="email"
                    placeholder="nome@empresa.com.br"
                    required
                >
            </div>

            <div class="auth-field-row">

                <div class="auth-field">
                    <label for="registerPassword">Senha</label>

                    <input
                        id="registerPassword"
                        type="password"
                        autocomplete="new-password"
                        placeholder="Mínimo de 6 caracteres"
                        minlength="6"
                        required
                    >
                </div>

                <div class="auth-field">
                    <label for="registerPasswordConfirm">
                        Confirmar senha
                    </label>

                    <input
                        id="registerPasswordConfirm"
                        type="password"
                        autocomplete="new-password"
                        placeholder="Repita sua senha"
                        minlength="6"
                        required
                    >
                </div>

            </div>

            <button id="registerButton" type="submit">
                Criar conta
            </button>

            <p class="auth-helper">
                Já possui uma conta?
                <a href="#" id="goLogin">Entrar</a>
            </p>

        </form>
    `;

    const phoneInput = document.getElementById("registerPhone");
    const documentInput = document.getElementById("registerDocument");

    phoneInput?.addEventListener("input", () => {
        phoneInput.value = formatPhone(phoneInput.value);
    });

    documentInput?.addEventListener("input", () => {
        documentInput.value = formatCpfCnpj(documentInput.value);
    });

    document
        .getElementById("goLogin")
        ?.addEventListener("click", (event) => {
            event.preventDefault();
            renderLogin();
        });

    document
        .getElementById("registerForm")
        ?.addEventListener("submit", handleRegister);
}

async function handleRegister(event) {
    event.preventDefault();

    clearMessage();

    const name = document
        .getElementById("registerName")
        .value
        .trim();

    const phone = document
        .getElementById("registerPhone")
        .value
        .trim();

    const documentValue = document
        .getElementById("registerDocument")
        .value
        .trim();

    const email = document
        .getElementById("registerEmail")
        .value
        .trim()
        .toLowerCase();

    const password = document
        .getElementById("registerPassword")
        .value;

    const passwordConfirm = document
        .getElementById("registerPasswordConfirm")
        .value;

    const button = document.getElementById("registerButton");

    if (name.length < 3) {
        showMessage("Digite seu nome completo.");
        return;
    }

    if (!isValidPhone(phone)) {
        showMessage("Digite um WhatsApp no formato (11) 99999-9999.");
        return;
    }

    if (!isValidDocument(documentValue)) {
        showMessage("Digite um CPF ou CNPJ completo.");
        return;
    }

    if (!isValidEmail(email)) {
        showMessage("Digite um e-mail válido.");
        return;
    }

    if (password.length < 6) {
        showMessage("A senha deve possuir pelo menos 6 caracteres.");
        return;
    }

    if (password !== passwordConfirm) {
        showMessage("As senhas não são iguais.");
        return;
    }

    try {
        setButtonLoading(button, true);

        const { data: authData, error: authError } =
            await mugartSupabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        phone,
                        cpf_cnpj: documentValue
                    },
                    emailRedirectTo:
                        `${window.location.origin}/conta/minha-conta.html`
                }
            });

        if (authError) throw authError;

        const authUser = authData?.user;

        if (!authUser) {
            throw new Error(
                "Não foi possível criar o usuário de autenticação."
            );
        }

        await linkCustomerToAuth({
            authUserId: authUser.id,
            name,
            phone,
            documentValue,
            email
        });

        if (authData.session) {
            showMessage("Conta criada com sucesso.", "success");

            setTimeout(() => {
                window.location.href = "minha-conta.html";
            }, 600);

            return;
        }

        showMessage(
            "Conta criada. Verifique sua caixa de entrada para confirmar o e-mail.",
            "success"
        );

    } catch (error) {
        console.error("Erro ao criar conta:", error);
        showMessage(getErrorMessage(error));

    } finally {
        setButtonLoading(button, false);
    }
}

async function linkCustomerToAuth({
    authUserId,
    name,
    phone,
    documentValue,
    email
}) {
    const { data: existingCustomers, error: searchError } =
        await mugartSupabase
            .from("customers")
            .select("id,auth_user_id,email")
            .ilike("email", email)
            .limit(1);

    if (searchError) {
        console.error(
            "Erro ao procurar cliente existente:",
            searchError
        );

        throw new Error(
            "A conta foi criada, mas não foi possível vincular o cadastro do cliente."
        );
    }

    const existingCustomer = existingCustomers?.[0];

    if (existingCustomer) {
        const { error: updateError } =
            await mugartSupabase
                .from("customers")
                .update({
                    auth_user_id: authUserId,
                    name,
                    phone,
                    cpf_cnpj: documentValue
                })
                .eq("id", existingCustomer.id);

        if (updateError) {
            console.error(
                "Erro ao vincular cliente existente:",
                updateError
            );

            throw new Error(
                "A conta foi criada, mas não foi possível vincular seus pedidos anteriores."
            );
        }

        return existingCustomer.id;
    }

    const { data: newCustomer, error: insertError } =
        await mugartSupabase
            .from("customers")
            .insert({
                auth_user_id: authUserId,
                name,
                phone,
                cpf_cnpj: documentValue,
                email
            })
            .select("id")
            .single();

    if (insertError) {
        console.error(
            "Erro ao criar cadastro do cliente:",
            insertError
        );

        throw new Error(
            "A conta foi criada, mas não foi possível criar o cadastro do cliente."
        );
    }

    return newCustomer.id;
}

/* =========================================================
   RECUPERAÇÃO DE SENHA
========================================================= */

function renderReset() {
    setActiveTab(tabReset);

    authContent.innerHTML = `
        <form id="resetForm" class="auth-form auth-content-enter">

            <h2>Recuperar senha</h2>

            <p>
                Digite seu e-mail e enviaremos um link para criar uma nova senha.
            </p>

            <div id="authMessage" class="auth-message"></div>

            <div class="auth-field">
                <label for="resetEmail">E-mail</label>

                <input
                    id="resetEmail"
                    type="email"
                    autocomplete="email"
                    placeholder="nome@empresa.com.br"
                    required
                >
            </div>

            <button id="resetButton" type="submit">
                Enviar link
            </button>

            <button
                id="backLogin"
                class="auth-secondary-button"
                type="button"
            >
                Voltar para o login
            </button>

        </form>
    `;

    document
        .getElementById("resetForm")
        ?.addEventListener("submit", handleResetPassword);

    document
        .getElementById("backLogin")
        ?.addEventListener("click", renderLogin);
}

async function handleResetPassword(event) {
    event.preventDefault();

    clearMessage();

    const email = document
        .getElementById("resetEmail")
        .value
        .trim()
        .toLowerCase();

    const button = document.getElementById("resetButton");

    if (!isValidEmail(email)) {
        showMessage("Digite um e-mail válido.");
        return;
    }

    try {
        setButtonLoading(button, true);

        const { error } =
            await mugartSupabase.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo:
                        `${window.location.origin}/conta/minha-conta.html?reset-password=1`
                }
            );

        if (error) throw error;

        showMessage(
            "Enviamos o link de recuperação para seu e-mail.",
            "success"
        );

    } catch (error) {
        console.error(
            "Erro ao recuperar senha:",
            error
        );

        showMessage(getErrorMessage(error));

    } finally {
        setButtonLoading(button, false);
    }
}

/* =========================================================
   ABAS E VERIFICAÇÃO DE SESSÃO
========================================================= */

tabLogin?.addEventListener("click", renderLogin);
tabRegister?.addEventListener("click", renderRegister);
tabReset?.addEventListener("click", renderReset);

async function checkExistingSession() {
    try {
        const { data, error } =
            await mugartSupabase.auth.getSession();

        if (error) {
            console.error(
                "Erro ao verificar sessão:",
                error
            );

            return;
        }

        if (data?.session?.user) {
            window.location.href = "minha-conta.html";
        }

    } catch (error) {
        console.error(
            "Erro inesperado ao verificar sessão:",
            error
        );
    }
}

document.addEventListener("DOMContentLoaded", async () => {

    authContent = document.getElementById("authContent");
    tabLogin = document.getElementById("tabLogin");
    tabRegister = document.getElementById("tabRegister");
    tabReset = document.getElementById("tabReset");

    if (!authContent || !tabLogin || !tabRegister || !tabReset) {
        console.error("Elementos da tela de autenticação não encontrados.");
        return;
    }

    tabLogin.addEventListener("click", renderLogin);
    tabRegister.addEventListener("click", renderRegister);
    tabReset.addEventListener("click", renderReset);

    if (!window.mugartSupabase) {
        authContent.innerHTML = `
            <div class="auth-message show error">
                Erro ao conectar ao Supabase.
            </div>
        `;
        return;
    }

    try {
        const { data } = await mugartSupabase.auth.getSession();

        if (data?.session) {
            window.location.href = "minha-conta.html";
            return;
        }

    } catch (e) {
        console.error(e);
    }

    renderLogin();

});
