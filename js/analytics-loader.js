(function () {
  "use strict";

  async function carregarConfiguracoesAnalytics() {
    try {
      const supabase = window.mugartSupabase || window.supabaseClient;

      if (!supabase) {
        console.warn(
          "[Analytics] Supabase ainda não está disponível. Verifique se supabase-config.js foi carregado antes."
        );
        return;
      }

      const { data, error } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value, is_active")
        .in("setting_key", [
          "google_tag_manager_id",
          "google_analytics_id",
        ]);

      if (error) {
        console.error(
          "[Analytics] Erro ao buscar configurações:",
          error
        );
        return;
      }

      const configuracoes = {};

      for (const item of data || []) {
        configuracoes[item.setting_key] = {
          valor: String(item.setting_value || "").trim(),
          ativo: item.is_active === true,
        };
      }

      const gtm = configuracoes.google_tag_manager_id;
      const ga4 = configuracoes.google_analytics_id;

      if (gtm?.ativo && validarGtmId(gtm.valor)) {
        carregarGoogleTagManager(gtm.valor);
      }

      if (ga4?.ativo && validarGa4Id(ga4.valor)) {
        carregarGoogleAnalytics(ga4.valor);
      }
    } catch (erro) {
      console.error(
        "[Analytics] Falha inesperada ao carregar configurações:",
        erro
      );
    }
  }

  function validarGtmId(id) {
    return /^GTM-[A-Z0-9]+$/i.test(id);
  }

  function validarGa4Id(id) {
    return /^G-[A-Z0-9]+$/i.test(id);
  }

  function carregarGoogleTagManager(gtmId) {
    if (window.__mugartGtmCarregado) {
      return;
    }

    window.__mugartGtmCarregado = true;
    window.dataLayer = window.dataLayer || [];

    window.dataLayer.push({
      "gtm.start": new Date().getTime(),
      event: "gtm.js",
    });

    const primeiroScript = document.getElementsByTagName("script")[0];
    const scriptGtm = document.createElement("script");

    scriptGtm.async = true;
    scriptGtm.src =
      "https://www.googletagmanager.com/gtm.js?id=" +
      encodeURIComponent(gtmId);

    if (primeiroScript?.parentNode) {
      primeiroScript.parentNode.insertBefore(
        scriptGtm,
        primeiroScript
      );
    } else {
      document.head.appendChild(scriptGtm);
    }

    inserirNoscriptGtm(gtmId);

    console.info(
      `[Analytics] Google Tag Manager carregado: ${gtmId}`
    );
  }

  function inserirNoscriptGtm(gtmId) {
    if (document.getElementById("mugart-gtm-noscript")) {
      return;
    }

    const noscript = document.createElement("noscript");
    noscript.id = "mugart-gtm-noscript";

    const iframe = document.createElement("iframe");

    iframe.src =
      "https://www.googletagmanager.com/ns.html?id=" +
      encodeURIComponent(gtmId);

    iframe.height = "0";
    iframe.width = "0";
    iframe.style.display = "none";
    iframe.style.visibility = "hidden";
    iframe.setAttribute("title", "Google Tag Manager");

    noscript.appendChild(iframe);

    function adicionarAoBody() {
      if (!document.body) {
        return;
      }

      document.body.insertBefore(
        noscript,
        document.body.firstChild
      );
    }

    if (document.body) {
      adicionarAoBody();
    } else {
      document.addEventListener(
        "DOMContentLoaded",
        adicionarAoBody,
        { once: true }
      );
    }
  }

  function carregarGoogleAnalytics(ga4Id) {
    if (window.__mugartGa4Carregado) {
      return;
    }

    window.__mugartGa4Carregado = true;

    const scriptGa4 = document.createElement("script");

    scriptGa4.async = true;
    scriptGa4.src =
      "https://www.googletagmanager.com/gtag/js?id=" +
      encodeURIComponent(ga4Id);

    document.head.appendChild(scriptGa4);

    window.dataLayer = window.dataLayer || [];

    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };

    window.gtag("js", new Date());

    window.gtag("config", ga4Id, {
      send_page_view: true,
    });

    console.info(
      `[Analytics] Google Analytics carregado: ${ga4Id}`
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      carregarConfiguracoesAnalytics,
      { once: true }
    );
  } else {
    carregarConfiguracoesAnalytics();
  }
})();
