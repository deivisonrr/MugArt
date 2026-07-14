/* ==========================================================
   MugArt - Favoritos da Área do Cliente
========================================================== */

(function () {
    "use strict";

    const LOCAL_KEY = "mugart_favorites";

    Account.favorites = [];
    Account.favoriteProducts = [];

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatMoney(value) {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(Number(value || 0));
    }

    function getLocalFavorites() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(LOCAL_KEY) || "[]"
            );

            return Array.isArray(saved)
                ? saved.map(String)
                : [];
        } catch {
            return [];
        }
    }

    function saveLocalFavorites(ids) {
        localStorage.setItem(
            LOCAL_KEY,
            JSON.stringify(
                Array.from(new Set(ids.map(String)))
            )
        );
    }

    async function getCurrentUser() {
        const result =
            await window.mugartSupabase.auth.getSession();

        return result.data.session?.user || null;
    }

    Account.loadFavorites = async function () {
        const loading =
            document.getElementById("favoritesLoading");

        const container =
            document.getElementById("favoritesList");

        loading?.classList.remove("hidden");

        try {
            const user = await getCurrentUser();

            if (!user) {
                Account.favorites = getLocalFavorites();
                await loadFavoriteProducts(Account.favorites);
                renderFavorites();
                return;
            }

            await migrateLocalFavorites(user.id);

            const favoritesResult =
                await window.mugartSupabase
                    .from("customer_favorites")
                    .select("product_id, created_at")
                    .eq("user_id", user.id)
                    .order("created_at", {
                        ascending: false
                    });

            if (favoritesResult.error) {
                throw favoritesResult.error;
            }

            Account.favorites =
                (favoritesResult.data || [])
                    .map(row => String(row.product_id));

            saveLocalFavorites(Account.favorites);

            await loadFavoriteProducts(Account.favorites);
            renderFavorites();

        } catch (error) {
            console.error(
                "Erro ao carregar favoritos:",
                error
            );

            if (container) {
                container.innerHTML = `
                    <div class="account-empty-state account-favorites-empty">
                        <span>⚠️</span>
                        <h3>Não foi possível carregar os favoritos</h3>
                        <p>${escapeHtml(error.message || "Tente novamente.")}</p>
                    </div>
                `;
            }
        } finally {
            loading?.classList.add("hidden");
        }
    };

    async function migrateLocalFavorites(userId) {
        const localIds = getLocalFavorites();

        if (!localIds.length) return;

        const rows = localIds.map(productId => ({
            user_id: userId,
            product_id: productId
        }));

        const result =
            await window.mugartSupabase
                .from("customer_favorites")
                .upsert(rows, {
                    onConflict: "user_id,product_id",
                    ignoreDuplicates: true
                });

        if (result.error) {
            console.warn(
                "Não foi possível migrar todos os favoritos locais:",
                result.error
            );
        }
    }

    async function loadFavoriteProducts(ids) {
        if (!ids.length) {
            Account.favoriteProducts = [];
            return;
        }

        const result =
            await window.mugartSupabase
                .from("products")
                .select(`
                    id,
                    name,
                    slug,
                    description,
                    price,
                    old_price,
                    stock,
                    image_url,
                    image_alt,
                    active,
                    categories (
                        id,
                        name
                    )
                `)
                .in("id", ids)
                .eq("active", true);

        if (result.error) {
            throw result.error;
        }

        const productMap = new Map(
            (result.data || []).map(product => [
                String(product.id),
                product
            ])
        );

        Account.favoriteProducts =
            ids
                .map(id => productMap.get(String(id)))
                .filter(Boolean);
    }

    function renderFavorites() {
        const container =
            document.getElementById("favoritesList");

        const count =
            document.getElementById("dashboardFavoritesCount");

        if (count) {
            count.textContent =
                String(Account.favoriteProducts.length);
        }

        if (!container) return;

        if (!Account.favoriteProducts.length) {
            container.innerHTML = `
                <div class="account-empty-state account-favorites-empty">
                    <span>♡</span>
                    <h3>Nenhum produto favorito</h3>
                    <p>
                        Clique no coração dos produtos da loja para salvá-los aqui.
                    </p>
                    <a href="../loja.html">Ver produtos</a>
                </div>
            `;
            return;
        }

        container.innerHTML =
            Account.favoriteProducts
                .map(product => {
                    const productUrl =
                        "../produto.html?slug=" +
                        encodeURIComponent(
                            product.slug || product.id
                        );

                    const category =
                        product.categories?.name ||
                        "Canecas";

                    return `
                        <article
                            class="account-favorite-card"
                            data-favorite-product-id="${escapeHtml(product.id)}"
                        >
                            <a
                                class="account-favorite-image"
                                href="${productUrl}"
                            >
                                <img
                                    src="${escapeHtml(product.image_url || "../assets/hero-caneca.png")}"
                                    alt="${escapeHtml(product.image_alt || product.name)}"
                                    loading="lazy"
                                >
                            </a>

                            <div class="account-favorite-content">
                                <span>${escapeHtml(category)}</span>
                                <h3>${escapeHtml(product.name)}</h3>

                                <p>
                                    ${escapeHtml(product.description || "Produto MugArt.")}
                                </p>

                                <div class="account-favorite-stock ${
                                    Number(product.stock || 0) <= 0
                                        ? "out"
                                        : ""
                                }">
                                    ${
                                        Number(product.stock || 0) > 0
                                            ? `${Number(product.stock)} em estoque`
                                            : "Esgotado"
                                    }
                                </div>

                                <div class="account-favorite-price">
                                    <strong>${formatMoney(product.price)}</strong>
                                    ${
                                        Number(product.old_price || 0) >
                                        Number(product.price || 0)
                                            ? `<small>${formatMoney(product.old_price)}</small>`
                                            : ""
                                    }
                                </div>

                                <div class="account-favorite-actions">
                                    <a
                                        class="account-primary-button"
                                        href="${productUrl}"
                                    >
                                        Ver produto
                                    </a>

                                    <button
                                        class="account-remove-favorite"
                                        type="button"
                                        data-remove-favorite="${escapeHtml(product.id)}"
                                    >
                                        ♥ Remover
                                    </button>
                                </div>
                            </div>
                        </article>
                    `;
                })
                .join("");

        container
            .querySelectorAll("[data-remove-favorite]")
            .forEach(button => {
                button.addEventListener("click", async () => {
                    await removeFavorite(
                        button.dataset.removeFavorite
                    );
                });
            });
    }

    async function removeFavorite(productId) {
        const user = await getCurrentUser();

        if (user) {
            const result =
                await window.mugartSupabase
                    .from("customer_favorites")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("product_id", productId);

            if (result.error) {
                console.error(result.error);
                return;
            }
        }

        Account.favorites =
            Account.favorites.filter(
                id => String(id) !== String(productId)
            );

        Account.favoriteProducts =
            Account.favoriteProducts.filter(
                product =>
                    String(product.id) !== String(productId)
            );

        saveLocalFavorites(Account.favorites);
        renderFavorites();

        if (typeof Account.showMessage === "function") {
            Account.showMessage(
                "Produto removido dos favoritos.",
                "success"
            );
        }
    }
})();
