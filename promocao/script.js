/*
  MugArt LP - configuração rápida
  Preencha o número abaixo somente com DDI + DDD + número.
  Exemplo de formato: 5517999999999
*/
const WHATSAPP_NUMBER = "";

const whatsappMessage =
  "Olá! Vim pela promoção da MugArt: comprei 4 canecas e quero ganhar a 5ª grátis. Quero saber como participar.";

function buildWhatsAppUrl() {
  if (!WHATSAPP_NUMBER) return "#whatsapp-config";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
}

function track(eventName, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...params
  });
}

document.querySelectorAll(".js-whatsapp").forEach((button) => {
  button.href = buildWhatsAppUrl();
  button.addEventListener("click", (event) => {
    track("promocao_whatsapp_click", { campaign: "compre4_ganhe5" });

    if (!WHATSAPP_NUMBER) {
      event.preventDefault();
      alert("O botão do WhatsApp já está preparado. Falta apenas configurar o número da MugArt no arquivo script.js.");
    }
  });
});

document.querySelectorAll("[data-event]").forEach((link) => {
  link.addEventListener("click", () => {
    track(link.dataset.event, {
      campaign: "compre4_ganhe5",
      destination: link.href
    });
  });
});
