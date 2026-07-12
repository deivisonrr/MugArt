(() => {
  "use strict";

  const STORAGE_KEY =
    "mugart_cookie_consent_v1";

  window.dataLayer =
    window.dataLayer || [];

  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  const savedConsent =
    readSavedConsent();

  const defaults =
    savedConsent
      ? mapConsentToGoogle(savedConsent)
      : {
          analytics_storage: "denied",
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
          functionality_storage: "denied",
          personalization_storage: "denied",
          security_storage: "granted",
        };

  window.gtag(
    "consent",
    "default",
    {
      ...defaults,

      /*
       * Aguarda brevemente a escolha ou restauracao
       * da preferencia antes do disparo das tags.
       */
      wait_for_update: 500,
    },
  );

  window.gtag(
    "set",
    "ads_data_redaction",
    true,
  );

  window.gtag(
    "set",
    "url_passthrough",
    true,
  );

  window.mugartConsentInitialState =
    savedConsent || null;

  function readSavedConsent() {
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
        typeof parsed !== "object"
      ) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
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
})();
