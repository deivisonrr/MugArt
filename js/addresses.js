
/* ==========================================================
   MugArt - Área do Cliente
   addresses.js
========================================================== */

Account.loadAddresses = async function () {
    if (!Account.customer) return;

    const { data, error } = await mugartSupabase
        .from("customer_addresses")
        .select("*")
        .eq("customer_id", Account.customer.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao carregar endereços:", error);

        Account.showMessage(
            "Não foi possível carregar seus endereços.",
            "error"
        );

        return;
    }

    Account.addresses = data || [];

    Account.updateAddressesDashboard();
    Account.renderAddresses();
};

Account.updateAddressesDashboard = function () {
    const counter = document.getElementById(
        "dashboardAddressesCount"
    );

    if (counter) {
        counter.textContent = Account.addresses.length;
    }
};

Account.renderAddresses = function () {
    const container = document.getElementById("addressesList");

    if (!container) return;

    if (!Account.addresses.length) {
        container.innerHTML = `
            <div class="account-empty-state">
                <span>📍</span>
                <h3>Nenhum endereço cadastrado</h3>
                <p>
                    Cadastre um endereço para agilizar suas próximas compras.
                </p>

                <button
                    class="account-primary-button"
                    type="button"
                    data-create-address
                >
                    Cadastrar endereço
                </button>
            </div>
        `;

        container
            .querySelector("[data-create-address]")
            ?.addEventListener("click", () => {
                Account.openAddressModal();
            });

        return;
    }

    container.innerHTML = Account.addresses
        .map((address) => `
            <article class="account-address-card">

                <div class="account-address-card-head">

                    <div>
                        <span>Endereço</span>
                        <h3>${address.label || "Endereço"}</h3>
                    </div>

                    ${address.is_default
                        ? `
                            <span class="account-default-badge">
                                Padrão
                            </span>
                        `
                        : ""
                    }

                </div>

                <div class="account-address-body">

                    <strong>
                        ${address.recipient_name ||
                        Account.customer?.name ||
                        "-"}
                    </strong>

                    <p>
                        ${address.street || "-"},
                        ${address.number || "-"}
                    </p>

                    ${address.complement
                        ? `<p>${address.complement}</p>`
                        : ""
                    }

                    <p>
                        ${address.neighborhood || "-"} -
                        ${address.city || "-"} /
                        ${address.state || "-"}
                    </p>

                    <p>
                        CEP: ${address.zip || "-"}
                    </p>

                    <p>
                        Telefone: ${address.phone || "-"}
                    </p>

                </div>

                <div class="account-address-actions">

                    ${!address.is_default
                        ? `
                            <button
                                class="account-text-button"
                                type="button"
                                data-default-address="${address.id}"
                            >
                                Tornar padrão
                            </button>
                        `
                        : ""
                    }

                    <button
                        class="account-text-button"
                        type="button"
                        data-edit-address="${address.id}"
                    >
                        Editar
                    </button>

                    <button
                        class="account-text-button danger"
                        type="button"
                        data-delete-address="${address.id}"
                    >
                        Excluir
                    </button>

                </div>

            </article>
        `)
        .join("");

    container
        .querySelectorAll("[data-edit-address]")
        .forEach((button) => {
            button.addEventListener("click", () => {
                Account.openAddressModal(
                    button.dataset.editAddress
                );
            });
        });

    container
        .querySelectorAll("[data-delete-address]")
        .forEach((button) => {
            button.addEventListener("click", () => {
                Account.deleteAddress(
                    button.dataset.deleteAddress
                );
            });
        });

    container
        .querySelectorAll("[data-default-address]")
        .forEach((button) => {
            button.addEventListener("click", () => {
                Account.setDefaultAddress(
                    button.dataset.defaultAddress
                );
            });
        });
};

Account.openAddressModal = function (addressId = null) {
    const modal = document.getElementById("addressModal");
    const form = document.getElementById("addressForm");

    if (!modal || !form) return;

    form.reset();

    document.getElementById("addressId").value = "";

    document.getElementById("addressRecipient").value =
        Account.customer?.name || "";

    document.getElementById("addressPhone").value =
        Account.customer?.phone || "";

    document.getElementById("addressModalTitle").textContent =
        "Novo endereço";

    if (addressId) {
        const address = Account.addresses.find(
            (item) => String(item.id) === String(addressId)
        );

        if (!address) return;

        document.getElementById("addressModalTitle").textContent =
            "Editar endereço";

        document.getElementById("addressId").value =
            address.id || "";

        document.getElementById("addressLabel").value =
            address.label || "";

        document.getElementById("addressZip").value =
            Account.formatCep
                ? Account.formatCep(address.zip)
                : address.zip || "";

        document.getElementById("addressRecipient").value =
            address.recipient_name || "";

        document.getElementById("addressPhone").value =
            Account.formatPhone
                ? Account.formatPhone(address.phone)
                : address.phone || "";

        document.getElementById("addressStreet").value =
            address.street || "";

        document.getElementById("addressNumber").value =
            address.number || "";

        document.getElementById("addressComplement").value =
            address.complement || "";

        document.getElementById("addressNeighborhood").value =
            address.neighborhood || "";

        document.getElementById("addressCity").value =
            address.city || "";

        document.getElementById("addressState").value =
            address.state || "";

        document.getElementById("addressDefault").checked =
            Boolean(address.is_default);
    }

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
};

Account.closeAddressModal = function () {
    const modal = document.getElementById("addressModal");

    if (!modal) return;

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
};

Account.saveAddress = async function (event) {
    event.preventDefault();

    const button = document.getElementById(
        "saveAddressButton"
    );

    const addressId = document
        .getElementById("addressId")
        .value;

    const payload = {
        customer_id: Account.customer.id,
        label:
            document
                .getElementById("addressLabel")
                .value
                .trim(),

        recipient_name:
            document
                .getElementById("addressRecipient")
                .value
                .trim(),

        phone:
            document
                .getElementById("addressPhone")
                .value
                .trim(),

        zip:
            document
                .getElementById("addressZip")
                .value
                .trim(),

        street:
            document
                .getElementById("addressStreet")
                .value
                .trim(),

        number:
            document
                .getElementById("addressNumber")
                .value
                .trim(),

        complement:
            document
                .getElementById("addressComplement")
                .value
                .trim(),

        neighborhood:
            document
                .getElementById("addressNeighborhood")
                .value
                .trim(),

        city:
            document
                .getElementById("addressCity")
                .value
                .trim(),

        state:
            document
                .getElementById("addressState")
                .value
                .trim()
                .toUpperCase(),

        country: "Brasil",

        is_default:
            document
                .getElementById("addressDefault")
                .checked
    };

    if (
        !payload.label ||
        !payload.recipient_name ||
        !payload.phone ||
        Account.onlyNumbers(payload.zip).length !== 8 ||
        !payload.street ||
        !payload.number ||
        !payload.neighborhood ||
        !payload.city ||
        payload.state.length !== 2
    ) {
        Account.showMessage(
            "Confira todos os campos obrigatórios do endereço.",
            "error"
        );

        return;
    }

    try {
        if (button) {
            button.disabled = true;
            button.textContent = "Salvando...";
        }

        if (payload.is_default) {
            await mugartSupabase
                .from("customer_addresses")
                .update({
                    is_default: false
                })
                .eq(
                    "customer_id",
                    Account.customer.id
                );
        }

        let result;

        if (addressId) {
            result = await mugartSupabase
                .from("customer_addresses")
                .update(payload)
                .eq("id", addressId)
                .eq(
                    "customer_id",
                    Account.customer.id
                );
        } else {
            result = await mugartSupabase
                .from("customer_addresses")
                .insert(payload);
        }

        if (result.error) {
            throw result.error;
        }

        if (
            payload.is_default &&
            Account.customer
        ) {
            const refreshed = await mugartSupabase
                .from("customer_addresses")
                .select("id")
                .eq(
                    "customer_id",
                    Account.customer.id
                )
                .eq("is_default", true)
                .limit(1)
                .maybeSingle();

            if (refreshed.data?.id) {
                await mugartSupabase
                    .from("customers")
                    .update({
                        default_address_id:
                            refreshed.data.id
                    })
                    .eq(
                        "id",
                        Account.customer.id
                    );

                Account.customer.default_address_id =
                    refreshed.data.id;
            }
        }

        Account.closeAddressModal();

        await Account.loadAddresses();

        Account.showMessage(
            addressId
                ? "Endereço atualizado com sucesso."
                : "Endereço cadastrado com sucesso.",
            "success"
        );

    } catch (error) {
        console.error(
            "Erro ao salvar endereço:",
            error
        );

        Account.showMessage(
            "Não foi possível salvar o endereço.",
            "error"
        );

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Salvar endereço";
        }
    }
};

Account.deleteAddress = async function (addressId) {
    const address = Account.addresses.find(
        (item) => String(item.id) === String(addressId)
    );

    if (!address) return;

    const confirmed = window.confirm(
        `Deseja excluir o endereço "${address.label || "Endereço"}"?`
    );

    if (!confirmed) return;

    const { error } = await mugartSupabase
        .from("customer_addresses")
        .delete()
        .eq("id", addressId)
        .eq(
            "customer_id",
            Account.customer.id
        );

    if (error) {
        console.error(
            "Erro ao excluir endereço:",
            error
        );

        Account.showMessage(
            "Não foi possível excluir o endereço.",
            "error"
        );

        return;
    }

    if (
        Account.customer.default_address_id ===
        addressId
    ) {
        await mugartSupabase
            .from("customers")
            .update({
                default_address_id: null
            })
            .eq(
                "id",
                Account.customer.id
            );

        Account.customer.default_address_id = null;
    }

    await Account.loadAddresses();

    Account.showMessage(
        "Endereço excluído com sucesso.",
        "success"
    );
};

Account.setDefaultAddress = async function (addressId) {
    try {
        const clearResult = await mugartSupabase
            .from("customer_addresses")
            .update({
                is_default: false
            })
            .eq(
                "customer_id",
                Account.customer.id
            );

        if (clearResult.error) {
            throw clearResult.error;
        }

        const defaultResult = await mugartSupabase
            .from("customer_addresses")
            .update({
                is_default: true
            })
            .eq("id", addressId)
            .eq(
                "customer_id",
                Account.customer.id
            );

        if (defaultResult.error) {
            throw defaultResult.error;
        }

        const customerResult = await mugartSupabase
            .from("customers")
            .update({
                default_address_id: addressId
            })
            .eq(
                "id",
                Account.customer.id
            );

        if (customerResult.error) {
            throw customerResult.error;
        }

        Account.customer.default_address_id =
            addressId;

        await Account.loadAddresses();

        Account.showMessage(
            "Endereço padrão atualizado.",
            "success"
        );

    } catch (error) {
        console.error(
            "Erro ao alterar endereço padrão:",
            error
        );

        Account.showMessage(
            "Não foi possível alterar o endereço padrão.",
            "error"
        );
    }
};

/* ==========================================================
   Máscaras auxiliares
========================================================== */

Account.formatPhone = function (value) {
    const numbers =
        Account.onlyNumbers(value).slice(0, 11);

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
};

Account.formatCep = function (value) {
    const numbers =
        Account.onlyNumbers(value).slice(0, 8);

    if (numbers.length <= 5) {
        return numbers;
    }

    return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
};

/* ==========================================================
   Eventos
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
    document
        .getElementById("newAddressButton")
        ?.addEventListener("click", () => {
            Account.openAddressModal();
        });

    document
        .getElementById("addressForm")
        ?.addEventListener(
            "submit",
            Account.saveAddress
        );

    document
        .querySelectorAll(
            "[data-close-address-modal]"
        )
        .forEach((element) => {
            element.addEventListener(
                "click",
                Account.closeAddressModal
            );
        });

    const zipInput =
        document.getElementById("addressZip");

    const phoneInput =
        document.getElementById("addressPhone");

    const stateInput =
        document.getElementById("addressState");

    zipInput?.addEventListener("input", () => {
        zipInput.value =
            Account.formatCep(zipInput.value);
    });

    zipInput?.addEventListener("blur", async () => {
        const cep =
            Account.onlyNumbers(zipInput.value);

        if (cep.length !== 8) return;

        try {
            const address =
                await Account.buscarCEP(cep);

            if (!address) {
                Account.showMessage(
                    "CEP não encontrado.",
                    "error"
                );

                return;
            }

            document.getElementById(
                "addressStreet"
            ).value = address.logradouro || "";

            document.getElementById(
                "addressNeighborhood"
            ).value = address.bairro || "";

            document.getElementById(
                "addressCity"
            ).value = address.localidade || "";

            document.getElementById(
                "addressState"
            ).value = address.uf || "";

            document.getElementById(
                "addressNumber"
            )?.focus();

        } catch (error) {
            console.error(
                "Erro ao consultar CEP:",
                error
            );

            Account.showMessage(
                "Não foi possível consultar o CEP.",
                "error"
            );
        }
    });

    phoneInput?.addEventListener("input", () => {
        phoneInput.value =
            Account.formatPhone(phoneInput.value);
    });

    stateInput?.addEventListener("input", () => {
        stateInput.value = String(
            stateInput.value || ""
        )
            .replace(/[^a-zA-Z]/g, "")
            .slice(0, 2)
            .toUpperCase();
    });
});
