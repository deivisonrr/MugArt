(() => {
  "use strict";

  document.addEventListener(
    "DOMContentLoaded",
    initializeMugArtFooter
  );

  async function initializeMugArtFooter() {
    const placeholders =
      document.querySelectorAll(
        "[data-mugart-footer]"
      );

    if (!placeholders.length) {
      return;
    }

    try {
      const response = await fetch(
        "/components/footer.html?v=1",
        {
          cache: "no-cache"
        }
      );

      if (!response.ok) {
        throw new Error(
          `Nao foi possivel carregar o rodape: ${response.status}`
        );
      }

      const footerHtml =
        await response.text();

      placeholders.forEach((placeholder) => {
        placeholder.innerHTML = footerHtml;
      });

      updateCurrentYear();
      bindCookiePreferences();
    } catch (error) {
      console.error(
        "[MugArt Footer]",
        error
      );
    }
  }

  function updateCurrentYear() {
    document
      .querySelectorAll(
        "[data-mugart-current-year]"
      )
      .forEach((element) => {
        element.textContent =
          String(
            new Date().getFullYear()
          );
      });
  }

  function bindCookiePreferences() {
    document
      .querySelectorAll(
        "[data-open-cookie-preferences]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            if (
              typeof window.openCookiePreferences ===
              "function"
            ) {
              window.openCookiePreferences();
              return;
            }

            window.location.href =
              "/politica-de-cookies.html";
          }
        );
      });
  }
})();
