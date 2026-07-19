const qs = selector => document.querySelector(selector);

function showMessage(message, type = "") {
  const element = qs("#modeMessage");
  element.textContent = message;
  element.className = `message ${type}`.trim();
}

async function getMode() {
  const { data, error } =
    await mugartSupabase.functions.invoke(
      "get-site-mode",
      { body: {} }
    );

  if (error) {
    throw error;
  }

  return data?.data;
}

async function loadMode() {
  try {
    const settings = await getMode();

    if (!settings) {
      throw new Error("Configuração não encontrada.");
    }

    const environmentInput = qs(
      `input[name="environment"][value="${settings.environment}"]`
    );

    if (environmentInput) {
      environmentInput.checked = true;
    }

    qs("#maintenanceMode").checked =
      Boolean(settings.maintenance_mode);

    qs("#maintenanceTitle").value =
      settings.maintenance_title ||
      "MugArt está em manutenção";

    qs("#maintenanceMessage").value =
      settings.maintenance_message || "";

    const production =
      settings.environment === "production";

    const status = qs("#currentStatus");
    status.className =
      `status ${production ? "production" : "development"}`;

    status.textContent = production
      ? "Produção ativa"
      : "Teste / manutenção ativo";
  } catch (error) {
    console.error(error);
    showMessage(
      error.message || "Não foi possível carregar.",
      "error"
    );
  }
}

async function saveMode() {
  const button = qs("#saveModeBtn");
  const selected = qs(
    'input[name="environment"]:checked'
  );

  if (!selected) {
    showMessage("Selecione um ambiente.", "error");
    return;
  }

  try {
    button.disabled = true;
    button.textContent = "Salvando...";

    const environment = selected.value;
    const maintenanceMode =
      qs("#maintenanceMode").checked;

    const { data, error } =
      await mugartSupabase.functions.invoke(
        "set-site-mode",
        {
          body: {
            environment,
            maintenance_mode: maintenanceMode,
            maintenance_title:
              qs("#maintenanceTitle").value.trim(),
            maintenance_message:
              qs("#maintenanceMessage").value.trim(),
          },
        }
      );

    if (error) {
      let message = error.message;

      try {
        const response =
          await error.context?.json?.();

        if (response?.error) {
          message = response.error;
        }
      } catch {}

      throw new Error(message);
    }

    showMessage(
      data?.message || "Configuração salva.",
      "success"
    );

    await loadMode();
  } catch (error) {
    console.error(error);
    showMessage(
      error.message || "Erro ao salvar.",
      "error"
    );
  } finally {
    button.disabled = false;
    button.textContent = "Salvar configuração";
  }
}

function openTestSite() {
  localStorage.setItem(
    "mugart_maintenance_bypass",
    "true"
  );

  window.open("/", "_blank", "noopener");
  showMessage(
    "Acesso de teste liberado neste navegador.",
    "success"
  );
}

function removeBypass() {
  localStorage.removeItem(
    "mugart_maintenance_bypass"
  );

  showMessage(
    "Acesso de teste removido.",
    "success"
  );
}

document.addEventListener("DOMContentLoaded", () => {
  qs("#saveModeBtn").addEventListener(
    "click",
    saveMode
  );

  qs("#openTestSiteBtn").addEventListener(
    "click",
    openTestSite
  );

  qs("#removeBypassBtn").addEventListener(
    "click",
    removeBypass
  );

  loadMode();
});
