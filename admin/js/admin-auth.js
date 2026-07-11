/* ==========================================================
   MugArt Admin — Autenticação
   Arquivo: admin/js/admin-auth.js
========================================================== */

(function () {
  "use strict";

  function currentAdminPath() {
    return window.location.pathname + window.location.search;
  }

  function redirectToLogin() {
    const redirect = encodeURIComponent(currentAdminPath());
    window.location.replace(`/conta/login.html?redirect=${redirect}`);
  }

  async function getAdminSession() {
    const supabase = window.mugartSupabase;

    if (!supabase) {
      throw new Error("Supabase não carregou no painel administrativo.");
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    const user = sessionData?.session?.user;
    if (!user) return null;

    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("auth_user_id, name, active")
      .eq("auth_user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (adminError) {
      throw new Error(`Erro ao validar administrador: ${adminError.message}`);
    }

    return { user, adminUser: adminUser || null };
  }

  function bindLogout() {
    const button = document.querySelector("#logoutBtn");
    if (!button) return;

    button.addEventListener("click", async () => {
      button.disabled = true;

      try {
        await window.mugartSupabase.auth.signOut();
      } catch (error) {
        console.error("[Admin Auth] Erro ao sair:", error);
      } finally {
        localStorage.removeItem("mugart_admin_auth");
        sessionStorage.clear();
        window.location.replace("/conta/login.html");
      }
    });
  }

  async function initializeAdminAuth() {
    try {
      const result = await getAdminSession();

      if (!result) {
        redirectToLogin();
        return;
      }

      if (!result.adminUser) {
        alert("Esta conta não possui permissão para acessar o painel administrativo.");
        window.location.replace("/conta/minha-conta.html");
        return;
      }

      bindLogout();
      document.documentElement.classList.add("admin-authenticated");

      window.dispatchEvent(
        new CustomEvent("mugart-admin-ready", { detail: result })
      );
    } catch (error) {
      console.error("[Admin Auth] Falha ao validar acesso:", error);
      alert(error?.message || "Não foi possível validar o acesso administrativo.");
      redirectToLogin();
    }
  }

  document.addEventListener("DOMContentLoaded", initializeAdminAuth);
})();
