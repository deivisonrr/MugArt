(async function () {
  const path =
    window.location.pathname.toLowerCase();

  const ignored =
    path.startsWith("/admin/") ||
    path.endsWith("/manutencao.html");

  if (ignored) return;

  const bypass =
    localStorage.getItem(
      "mugart_maintenance_bypass"
    ) === "true";

  if (bypass) return;

  try {
    if (!window.mugartSupabase) {
      return;
    }

    const { data, error } =
      await mugartSupabase.functions.invoke(
        "get-site-mode",
        { body: {} }
      );

    if (error) {
      console.warn(
        "[Site Mode] Não foi possível consultar:",
        error
      );
      return;
    }

    const settings = data?.data;

    if (settings?.maintenance_mode) {
      sessionStorage.setItem(
        "mugart_maintenance_content",
        JSON.stringify({
          title: settings.maintenance_title,
          message: settings.maintenance_message,
        })
      );

      window.location.replace(
        "/manutencao.html"
      );
    }
  } catch (error) {
    console.warn("[Site Mode]", error);
  }
})();
