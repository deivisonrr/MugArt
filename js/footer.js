(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", loadMugArtFooter);

  async function loadMugArtFooter() {
    const hosts = document.querySelectorAll("[data-mugart-footer]");

    if (!hosts.length) {
      return;
    }

    try {
      const version = "5";

      const [htmlResponse, cssResponse] = await Promise.all([
        fetch(`/components/footer.html?v=${version}`, {
          cache: "no-store"
        }),
        fetch(`/css/footer.css?v=${version}`, {
          cache: "no-store"
        })
      ]);

      if (!htmlResponse.ok || !cssResponse.ok) {
        throw new Error("Nao foi possivel carregar o rodape.");
      }

      const [footerHtml, footerCss] = await Promise.all([
        htmlResponse.text(),
        cssResponse.text()
      ]);

      hosts.forEach((host) => {
        host.innerHTML = "";

        const shadow =
          host.shadowRoot ||
          host.attachShadow({ mode: "open" });

        shadow.innerHTML = `
          <style>${footerCss}</style>
          ${footerHtml}
        `;

        initializeFooter(shadow);
      });
    } catch (error) {
      console.error("[MugArt Footer]", error);
    }
  }

  function initializeFooter(root) {
    root.querySelectorAll("[data-current-year]").forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });

    root.querySelectorAll("[data-open-cookie-preferences]").forEach((button) => {
      button.addEventListener("click", () => {
        if (typeof window.openCookiePreferences === "function") {
          window.openCookiePreferences();
          return;
        }

        window.location.href = "/politica-de-cookies.html";
      });
    });

    root.querySelectorAll("[data-footer-newsletter]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        alert("Cadastro recebido!");
        form.reset();
      });
    });
  }
})();
