(() => {
  "use strict";

  const STORAGE_KEY =
    "mugart_cookie_consent_v1";

  const CONSENT_VERSION =
    "1.0";

  let consentElementsLoaded =
    false;

  document.addEventListener(
    "DOMContentLoaded",
    initializeConsentManager,
  );

  async function initializeConsentManager() {
    try {
      await loadConsentInterface();

      bindConsentEvents();

      const savedConsent =
        getSavedConsent();

      if (savedConsent) {
        applyConsent(
          savedConsent,
          {
            persist: false,
            source: "saved",
          },
        );

        hideBanner();
      } else {
        showBanner();
      }

      window.openCookiePreferences =
        openPreferences;
    } catch (error) {
      console.error(
        "[MugArt Consent]",
        error,
      );
    }
  }

  async function loadConsentInterface() {
    if (consentElementsLoaded) {
      return;
    }

    const existingBanner =
      document.querySelector(
        "[data-consent-banner]",
      );

    if (existingBanner) {
      consentElementsLoaded = true;
      return;
    }

    const response =
      await fetch(
        "/components/cookie-consent.html?v=1",
        {
          cache: "no-store",
        },
      );

    if (!response.ok) {
      throw new Error(
        `Nao foi possivel carregar o banner: ${response.status}`,
      );
    }

    const html =
      await response.text();

    const container =
      document.createElement("div");

    container.setAttribute(
      "data-mugart-consent-root",
      "",
    );

    container.innerHTML =
      html;

    document.body.appendChild(
      container,
    );

    consentElementsLoaded = true;
  }

  function bindConsentEvents() {
    document
      .querySelector(
        "[data-consent-accept]",
      )
      ?.addEventListener(
        "click",
        acceptAll,
      );

    document
      .querySelector(
        "[data-consent-reject]",
      )
      ?.addEventListener(
        "click",
        rejectOptional,
      );

    document
      .querySelector(
        "[data-consent-customize]",
      )
      ?.addEventListener(
        "click",
        openPreferences,
      );

    document
      .querySelector(
        "[data-consent-save]",
      )
      ?.addEventListener(
        "click",
        saveCustomPreferences,
      );

    document
      .querySelector(
        "[data-consent-modal-reject]",
      )
      ?.addEventListener(
        "click",
        rejectOptional,
      );

    document
      .querySelectorAll(
        "[data-consent-close]",
      )
      .forEach((element) => {
        element.addEventListener(
          "click",
          closePreferences,
        );
      });

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          closePreferences();
        }
      },
    );
  }

  function acceptAll() {
    applyConsent({
      necessary: true,
      analytics: true,
      preferences: true,
      marketing: true,
    });
  }

  function rejectOptional() {
    applyConsent({
      necessary: true,
      analytics: false,
      preferences: false,
      marketing: false,
    });
  }

  function saveCustomPreferences() {
    const analytics =
      document.querySelector(
        "[data-consent-analytics]",
      )?.checked === true;

    const preferences =
      document.querySelector(
        "[data-consent-preferences]",
      )?.checked === true;

    const marketing =
      document.querySelector(
        "[data-consent-marketing]",
      )?.checked === true;

    applyConsent({
      necessary: true,
      analytics,
      preferences,
      marketing,
    });
  }

  function applyConsent(
    consent,
    options = {},
  ) {
    const normalized = {
      necessary: true,
      analytics:
        consent.analytics === true,
      preferences:
        consent.preferences === true,
      marketing:
        consent.marketing === true,
      version:
        CONSENT_VERSION,
      updated_at:
        new Date().toISOString(),
    };

    window.gtag =
      window.gtag ||
      function gtag() {
        window.dataLayer =
          window.dataLayer || [];

        window.dataLayer.push(
          arguments,
        );
      };

    window.gtag(
      "consent",
      "update",
      mapConsentToGoogle(
        normalized,
      ),
    );

    window.dataLayer =
      window.dataLayer || [];

    window.dataLayer.push({
      event:
        "mugart_consent_update",

      consent_source:
        options.source ||
        "user_action",

      consent_analytics:
        normalized.analytics,

      consent_preferences:
        normalized.preferences,

      consent_marketing:
        normalized.marketing,
    });

    if (options.persist !== false) {
      saveConsent(normalized);
    }

    synchronizeInputs(
      normalized,
    );

    hideBanner();
    closePreferences();

    window.dispatchEvent(
      new CustomEvent(
        "mugart:consent-updated",
        {
          detail: normalized,
        },
      ),
    );
  }

  function mapConsentToGoogle(
    consent,
  ) {
    return {
      analytics_storage:
        consent.analytics
          ? "granted"
          : "denied",

      ad_storage:
        consent.marketing
          ? "granted"
          : "denied",

      ad_user_data:
        consent.marketing
          ? "granted"
          : "denied",

      ad_personalization:
        consent.marketing
          ? "granted"
          : "denied",

      functionality_storage:
        consent.preferences
          ? "granted"
          : "denied",

      personalization_storage:
        consent.preferences
          ? "granted"
          : "denied",

      security_storage:
        "granted",
    };
  }

  function openPreferences() {
    const saved =
      getSavedConsent() || {
        analytics: false,
        preferences: false,
        marketing: false,
      };

    synchronizeInputs(saved);

    const modal =
      document.querySelector(
        "[data-consent-modal]",
      );

    modal?.classList.add(
      "is-visible",
    );

    modal?.setAttribute(
      "aria-hidden",
      "false",
    );
  }

  function closePreferences() {
    const modal =
      document.querySelector(
        "[data-consent-modal]",
      );

    modal?.classList.remove(
      "is-visible",
    );

    modal?.setAttribute(
      "aria-hidden",
      "true",
    );
  }

  function synchronizeInputs(
    consent,
  ) {
    const analytics =
      document.querySelector(
        "[data-consent-analytics]",
      );

    const preferences =
      document.querySelector(
        "[data-consent-preferences]",
      );

    const marketing =
      document.querySelector(
        "[data-consent-marketing]",
      );

    if (analytics) {
      analytics.checked =
        consent.analytics === true;
    }

    if (preferences) {
      preferences.checked =
        consent.preferences === true;
    }

    if (marketing) {
      marketing.checked =
        consent.marketing === true;
    }
  }

  function showBanner() {
    document
      .querySelector(
        "[data-consent-banner]",
      )
      ?.classList.add(
        "is-visible",
      );
  }

  function hideBanner() {
    document
      .querySelector(
        "[data-consent-banner]",
      )
      ?.classList.remove(
        "is-visible",
      );
  }

  function saveConsent(
    consent,
  ) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(consent),
      );
    } catch (error) {
      console.warn(
        "[MugArt Consent] Nao foi possivel salvar:",
        error,
      );
    }
  }

  function getSavedConsent() {
    try {
      const raw =
        localStorage.getItem(
          STORAGE_KEY,
        );

      if (!raw) {
        return null;
      }

      const parsed =
        JSON.parse(raw);

      if (
        !parsed ||
        parsed.version !==
          CONSENT_VERSION
      ) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }
})();
