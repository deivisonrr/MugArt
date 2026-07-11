(function () {
    "use strict";

    const CouponAdmin = {
        coupons: [],
        usages: [],
        filteredCoupons: [],
        editingId: null
    };

    async function callAdminCoupons(
    action,
    payload = {}
) {
    const {
        data,
        error
    } =
        await window.mugartSupabase
            .functions
            .invoke(
                "admin-coupons",
                {
                    body: {
                        action,
                        ...payload
                    }
                }
            );

    if (error) {
        let message =
            error.message ||
            "Erro na administração de cupons.";

        try {
            const responseBody =
                await error.context
                    ?.json?.();

            if (responseBody?.error) {
                message =
                    responseBody.error;
            }
        } catch {
            // Mantém a mensagem original.
        }

        throw new Error(message);
    }

    if (!data?.success) {
        throw new Error(
            data?.error ||
            "Não foi possível concluir a operação."
        );
    }

    return data;
}

    function qs(selector) {
        return document.querySelector(selector);
    }

    function qsa(selector) {
        return Array.from(
            document.querySelectorAll(selector)
        );
    }

    function money(value) {
        return Number(value || 0)
            .toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            });
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function normalizeCode(value) {
        return String(value || "")
            .trim()
            .toUpperCase()
            .replace(/\s+/g, "");
    }

    function numberOrNull(value) {
        const text = String(value ?? "").trim();

        if (!text) {
            return null;
        }

        const number = Number(text);

        return Number.isFinite(number)
            ? number
            : null;
    }

    function toLocalInputValue(value) {
        if (!value) {
            return "";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        const offset =
            date.getTimezoneOffset() * 60000;

        return new Date(
            date.getTime() - offset
        )
            .toISOString()
            .slice(0, 16);
    }

    function toIsoOrNull(value) {
        const text = String(value || "").trim();

        if (!text) {
            return null;
        }

        const date = new Date(text);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return date.toISOString();
    }

    function formatDate(value) {
        if (!value) {
            return "Sem validade";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleString(
            "pt-BR",
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        );
    }

    function showToast(message, type = "success") {
        const toast = qs("#adminToast");

        if (!toast) {
            alert(message);
            return;
        }

        toast.textContent = message;
        toast.className =
            `admin-toast show ${type}`;

        clearTimeout(toast.timer);

        toast.timer = setTimeout(() => {
            toast.className = "admin-toast";
        }, 3500);
    }

    function showFormMessage(
        message,
        type = "error"
    ) {
        const element =
            qs("#couponFormMessage");

        if (!element) {
            return;
        }

        element.textContent = message;
        element.className =
            `admin-form-message show ${type}`;
    }

    function clearFormMessage() {
        const element =
            qs("#couponFormMessage");

        if (!element) {
            return;
        }

        element.textContent = "";
        element.className =
            "admin-form-message";
    }

    async function loadCoupons() {
        const supabase =
            window.mugartSupabase;

        if (!supabase) {
            showToast(
                "Supabase não carregou.",
                "error"
            );
            return;
        }

        const [
            couponResult,
            usageResult
        ] = await Promise.all([
            supabase
                .from("coupons")
                .select("*")
                .order("created_at", {
                    ascending: false
                }),

            supabase
                .from("coupon_usages")
                .select(`
                    id,
                    coupon_id,
                    discount_amount,
                    created_at
                `)
        ]);

        if (couponResult.error) {
            console.error(
                "Erro ao carregar cupons:",
                couponResult.error
            );

            showToast(
                "Não foi possível carregar os cupons.",
                "error"
            );

            return;
        }

        if (usageResult.error) {
            console.warn(
                "Utilizações não carregadas:",
                usageResult.error
            );
        }

        CouponAdmin.coupons =
            couponResult.data || [];

        CouponAdmin.usages =
            usageResult.data || [];

        applyFilters();
        renderMetrics();
    }

    function getCouponUsageCount(coupon) {
        const realUsageCount =
            CouponAdmin.usages.filter(
                usage =>
                    usage.coupon_id ===
                    coupon.id
            ).length;

        return Math.max(
            Number(
                coupon.usage_count || 0
            ),
            realUsageCount
        );
    }

    function getCouponStatus(coupon) {
        const now = new Date();

        if (!coupon.active) {
            return {
                key: "inactive",
                label: "Inativo",
                className: "inactive"
            };
        }

        if (
            coupon.starts_at &&
            new Date(coupon.starts_at) > now
        ) {
            return {
                key: "scheduled",
                label: "Agendado",
                className: "scheduled"
            };
        }

        if (
            coupon.expires_at &&
            new Date(coupon.expires_at) < now
        ) {
            return {
                key: "expired",
                label: "Expirado",
                className: "expired"
            };
        }

        if (
            coupon.usage_limit !== null &&
            getCouponUsageCount(coupon) >=
                Number(coupon.usage_limit)
        ) {
            return {
                key: "finished",
                label: "Esgotado",
                className: "expired"
            };
        }

        return {
            key: "active",
            label: "Ativo",
            className: "active"
        };
    }

    function formatCouponType(type) {
        const types = {
            percentage: "Percentual",
            fixed: "Valor fixo",
            free_shipping: "Frete grátis"
        };

        return types[type] || type || "-";
    }

    function formatCouponBenefit(coupon) {
        if (
            coupon.discount_type ===
            "percentage"
        ) {
            return `${Number(
                coupon.discount_value || 0
            ).toLocaleString("pt-BR")}%`;
        }

        if (
            coupon.discount_type === "fixed"
        ) {
            return money(
                coupon.discount_value
            );
        }

        if (
            coupon.discount_type ===
            "free_shipping"
        ) {
            return "Frete grátis";
        }

        return "-";
    }

    function formatCouponValidity(coupon) {
        if (
            !coupon.starts_at &&
            !coupon.expires_at
        ) {
            return "Sem validade";
        }

        const start =
            coupon.starts_at
                ? formatDate(
                    coupon.starts_at
                )
                : "Imediato";

        const end =
            coupon.expires_at
                ? formatDate(
                    coupon.expires_at
                )
                : "Sem término";

        return `${start} até ${end}`;
    }

    function applyFilters() {
        const search =
            String(
                qs("#couponSearch")?.value ||
                ""
            )
                .trim()
                .toLowerCase();

        const statusFilter =
            qs("#couponStatusFilter")
                ?.value || "all";

        CouponAdmin.filteredCoupons =
            CouponAdmin.coupons.filter(
                coupon => {
                    const haystack = [
                        coupon.code,
                        coupon.description,
                        coupon.discount_type
                    ]
                        .join(" ")
                        .toLowerCase();

                    const matchesSearch =
                        !search ||
                        haystack.includes(search);

                    const status =
                        getCouponStatus(coupon);

                    const matchesStatus =
                        statusFilter === "all" ||
                        status.key === statusFilter;

                    return (
                        matchesSearch &&
                        matchesStatus
                    );
                }
            );

        renderCoupons();
    }

    function renderCoupons() {
        const tbody =
            qs("#couponsTableBody");

        if (!tbody) {
            return;
        }

        const coupons =
            CouponAdmin.filteredCoupons;

        if (!coupons.length) {
            tbody.innerHTML = `
                <tr>
                    <td
                      colspan="9"
                      class="admin-empty-cell"
                    >
                      Nenhum cupom encontrado.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML =
            coupons.map(coupon => {
                const status =
                    getCouponStatus(coupon);

                const usageCount =
                    getCouponUsageCount(coupon);

                const usageLimit =
                    coupon.usage_limit === null
                        ? "∞"
                        : Number(
                            coupon.usage_limit
                        );

                return `
                    <tr>
                      <td>
                        <strong class="coupon-code">
                          ${escapeHtml(coupon.code)}
                        </strong>
                      </td>

                      <td>
                        ${escapeHtml(
                            coupon.description ||
                            "-"
                        )}
                      </td>

                      <td>
                        ${escapeHtml(
                            formatCouponType(
                                coupon.discount_type
                            )
                        )}
                      </td>

                      <td>
                        <strong>
                          ${escapeHtml(
                              formatCouponBenefit(
                                  coupon
                              )
                          )}
                        </strong>
                      </td>

                      <td>
                        ${money(
                            coupon.minimum_order_value
                        )}
                      </td>

                      <td class="coupon-validity">
                        ${escapeHtml(
                            formatCouponValidity(
                                coupon
                            )
                        )}
                      </td>

                      <td>
                        ${usageCount} / ${usageLimit}
                      </td>

                      <td>
                        <span
                          class="coupon-status
                                 ${status.className}"
                        >
                          ${status.label}
                        </span>
                      </td>

                      <td>
                        <div class="coupon-actions">

                          <button
                            type="button"
                            class="table-action-button"
                            data-edit-coupon="${coupon.id}"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            class="table-action-button"
                            data-toggle-coupon="${coupon.id}"
                          >
                            ${
                                coupon.active
                                    ? "Desativar"
                                    : "Ativar"
                            }
                          </button>

                          <button
                            type="button"
                            class="table-action-button danger"
                            data-delete-coupon="${coupon.id}"
                          >
                            Excluir
                          </button>

                        </div>
                      </td>
                    </tr>
                `;
            }).join("");

        bindTableActions();
    }

    function renderMetrics() {
        const activeCoupons =
            CouponAdmin.coupons.filter(
                coupon =>
                    getCouponStatus(coupon)
                        .key === "active"
            );

        const totalUses =
            CouponAdmin.usages.length;

        const totalDiscount =
            CouponAdmin.usages.reduce(
                (sum, usage) =>
                    sum +
                    Number(
                        usage.discount_amount ||
                        0
                    ),
                0
            );

        let topCoupon = null;
        let topUses = 0;

        CouponAdmin.coupons.forEach(
            coupon => {
                const uses =
                    getCouponUsageCount(
                        coupon
                    );

                if (uses > topUses) {
                    topUses = uses;
                    topCoupon = coupon;
                }
            }
        );

        qs("#metricActiveCoupons").textContent =
            String(activeCoupons.length);

        qs("#metricCouponUses").textContent =
            String(totalUses);

        qs("#metricCouponDiscount").textContent =
            money(totalDiscount);

        qs("#metricTopCoupon").textContent =
            topCoupon
                ? `${topCoupon.code} (${topUses})`
                : "-";
    }

    function openCouponModal(coupon = null) {
        CouponAdmin.editingId =
            coupon?.id || null;

        qs("#couponModalTitle").textContent =
            coupon
                ? "Editar cupom"
                : "Novo cupom";

        qs("#couponId").value =
            coupon?.id || "";

        qs("#couponCode").value =
            coupon?.code || "";

        qs("#couponDescription").value =
            coupon?.description || "";

        qs("#couponDiscountType").value =
            coupon?.discount_type ||
            "percentage";

        qs("#couponDiscountValue").value =
            Number(
                coupon?.discount_value || 0
            );

        qs("#couponMinimumOrder").value =
            Number(
                coupon?.minimum_order_value ||
                0
            );

        qs("#couponMaximumDiscount").value =
            coupon?.maximum_discount ??
            "";

        qs("#couponStartsAt").value =
            toLocalInputValue(
                coupon?.starts_at
            );

        qs("#couponExpiresAt").value =
            toLocalInputValue(
                coupon?.expires_at
            );

        qs("#couponUsageLimit").value =
            coupon?.usage_limit ??
            "";

        qs("#couponCustomerLimit").value =
            coupon
                ?.usage_limit_per_customer ??
            1;

        qs("#couponActive").checked =
            coupon?.active !== false;

        clearFormMessage();
        updateCouponTypeFields();

        qs("#couponModal")
            .classList.remove("hidden");

        document.body
            .classList.add("modal-open");

        setTimeout(() => {
            qs("#couponCode")?.focus();
        }, 50);
    }

    function closeCouponModal() {
        qs("#couponModal")
            ?.classList.add("hidden");

        document.body
            .classList.remove("modal-open");

        CouponAdmin.editingId = null;

        qs("#couponForm")?.reset();
        clearFormMessage();
    }

    function updateCouponTypeFields() {
        const type =
            qs("#couponDiscountType")
                ?.value;

        const valueField =
            qs("#couponValueField");

        const maximumField =
            qs("#couponMaximumDiscountField");

        const valueInput =
            qs("#couponDiscountValue");

        if (
            type === "free_shipping"
        ) {
            valueField
                ?.classList.add("hidden");

            maximumField
                ?.classList.add("hidden");

            if (valueInput) {
                valueInput.required = false;
                valueInput.value = "0";
            }

            return;
        }

        valueField
            ?.classList.remove("hidden");

        if (valueInput) {
            valueInput.required = true;
        }

        if (type === "percentage") {
            maximumField
                ?.classList.remove("hidden");
        } else {
            maximumField
                ?.classList.add("hidden");
        }
    }

    async function saveCoupon(event) {
        event.preventDefault();

        clearFormMessage();

        const button =
            qs("#saveCouponButton");

        const couponId =
            qs("#couponId").value;

        const code =
            normalizeCode(
                qs("#couponCode").value
            );

        const description =
            qs("#couponDescription")
                .value
                .trim();

        const discountType =
            qs("#couponDiscountType")
                .value;

        let discountValue =
            Number(
                qs("#couponDiscountValue")
                    .value || 0
            );

        if (
            discountType ===
            "free_shipping"
        ) {
            discountValue = 0;
        }

        if (!code) {
            showFormMessage(
                "Informe o código do cupom."
            );
            return;
        }

        if (
            discountType ===
                "percentage" &&
            (
                discountValue <= 0 ||
                discountValue > 100
            )
        ) {
            showFormMessage(
                "O percentual deve estar entre 0,01 e 100."
            );
            return;
        }

        if (
            discountType === "fixed" &&
            discountValue <= 0
        ) {
            showFormMessage(
                "Informe um valor de desconto maior que zero."
            );
            return;
        }

        const startsAt =
            toIsoOrNull(
                qs("#couponStartsAt")
                    .value
            );

        const expiresAt =
            toIsoOrNull(
                qs("#couponExpiresAt")
                    .value
            );

        if (
            startsAt &&
            expiresAt &&
            new Date(startsAt) >=
                new Date(expiresAt)
        ) {
            showFormMessage(
                "A data final deve ser posterior à data inicial."
            );
            return;
        }

        const payload = {
            code,
            description:
                description || null,

            discount_type:
                discountType,

            discount_value:
                discountValue,

            minimum_order_value:
                Number(
                    qs("#couponMinimumOrder")
                        .value || 0
                ),

            maximum_discount:
                discountType ===
                    "percentage"
                    ? numberOrNull(
                        qs("#couponMaximumDiscount")
                            .value
                    )
                    : null,

            starts_at:
                startsAt,

            expires_at:
                expiresAt,

            usage_limit:
                numberOrNull(
                    qs("#couponUsageLimit")
                        .value
                ),

            usage_limit_per_customer:
                numberOrNull(
                    qs("#couponCustomerLimit")
                        .value
                ) || 1,

            active:
                qs("#couponActive")
                    .checked,

            updated_at:
                new Date().toISOString()
        };

        try {
            button.disabled = true;
            button.textContent =
                "Salvando...";

            const supabase =
                window.mugartSupabase;

            let result;

            if (couponId) {
                result = await supabase
                    .from("coupons")
                    .update(payload)
                    .eq("id", couponId);
            } else {
                result = await supabase
                    .from("coupons")
                    .insert({
                        ...payload,
                        usage_count: 0,
                        created_at:
                            new Date()
                                .toISOString()
                    });
            }

            if (result.error) {
                if (
                    String(
                        result.error.message
                    ).toLowerCase()
                    .includes("duplicate")
                ) {
                    throw new Error(
                        "Já existe um cupom com este código."
                    );
                }

                throw result.error;
            }

            closeCouponModal();

            showToast(
                couponId
                    ? "Cupom atualizado."
                    : "Cupom criado."
            );

            await loadCoupons();

        } catch (error) {
            console.error(
                "Erro ao salvar cupom:",
                error
            );

            showFormMessage(
                error.message ||
                "Não foi possível salvar o cupom."
            );

        } finally {
            button.disabled = false;
            button.textContent =
                "Salvar cupom";
        }
    }

    async function toggleCoupon(id) {
        const coupon =
            CouponAdmin.coupons.find(
                item => item.id === id
            );

        if (!coupon) {
            return;
        }

        const { error } =
            await window.mugartSupabase
                .from("coupons")
                .update({
                    active: !coupon.active,
                    updated_at:
                        new Date()
                            .toISOString()
                })
                .eq("id", id);

        if (error) {
            console.error(error);

            showToast(
                "Não foi possível alterar o cupom.",
                "error"
            );

            return;
        }

        showToast(
            coupon.active
                ? "Cupom desativado."
                : "Cupom ativado."
        );

        await loadCoupons();
    }

    async function deleteCoupon(id) {
        const coupon =
            CouponAdmin.coupons.find(
                item => item.id === id
            );

        if (!coupon) {
            return;
        }

        const confirmed =
            window.confirm(
                `Excluir o cupom ${coupon.code}?`
            );

        if (!confirmed) {
            return;
        }

        const { count, error: countError } =
            await window.mugartSupabase
                .from("coupon_usages")
                .select("id", {
                    count: "exact",
                    head: true
                })
                .eq("coupon_id", id);

        if (countError) {
            console.error(countError);

            showToast(
                "Não foi possível verificar o uso do cupom.",
                "error"
            );

            return;
        }

        if (Number(count || 0) > 0) {
            showToast(
                "Este cupom já foi utilizado. Desative-o em vez de excluir.",
                "error"
            );

            return;
        }

        const { error } =
            await window.mugartSupabase
                .from("coupons")
                .delete()
                .eq("id", id);

        if (error) {
            console.error(error);

            showToast(
                "Não foi possível excluir o cupom.",
                "error"
            );

            return;
        }

        showToast("Cupom excluído.");

        await loadCoupons();
    }

    function bindTableActions() {
        qsa("[data-edit-coupon]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        const coupon =
                            CouponAdmin.coupons
                                .find(
                                    item =>
                                        item.id ===
                                        button.dataset
                                            .editCoupon
                                );

                        if (coupon) {
                            openCouponModal(
                                coupon
                            );
                        }
                    }
                );
            });

        qsa("[data-toggle-coupon]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        toggleCoupon(
                            button.dataset
                                .toggleCoupon
                        )
                );
            });

        qsa("[data-delete-coupon]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        deleteCoupon(
                            button.dataset
                                .deleteCoupon
                        )
                );
            });
    }

    function bindEvents() {
        qs("#newCouponButton")
            ?.addEventListener(
                "click",
                () =>
                    openCouponModal()
            );

        qsa("[data-close-coupon-modal]")
            .forEach(element => {
                element.addEventListener(
                    "click",
                    closeCouponModal
                );
            });

        qs("#couponForm")
            ?.addEventListener(
                "submit",
                saveCoupon
            );

        qs("#couponDiscountType")
            ?.addEventListener(
                "change",
                updateCouponTypeFields
            );

        qs("#couponCode")
            ?.addEventListener(
                "input",
                event => {
                    event.target.value =
                        normalizeCode(
                            event.target.value
                        );
                }
            );

        qs("#couponSearch")
            ?.addEventListener(
                "input",
                applyFilters
            );

        qs("#couponStatusFilter")
            ?.addEventListener(
                "change",
                applyFilters
            );

        document.addEventListener(
            "keydown",
            event => {
                if (
                    event.key ===
                    "Escape"
                ) {
                    closeCouponModal();
                }
            }
        );
    }

    document.addEventListener(
        "DOMContentLoaded",
        async () => {
            bindEvents();
            updateCouponTypeFields();
            await loadCoupons();
        }
    );
})();
