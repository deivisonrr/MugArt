const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("nav");
const cards = [...document.querySelectorAll(".model-card")];
const colors = [...document.querySelectorAll(".color")];
const selectedModelText = document.getElementById("selectedModelText");
const selectedArtText = document.getElementById("selectedArtText");
const artInput = document.getElementById("artInput");
const artPreview = document.getElementById("artPreview");
const placeholderText = document.getElementById("placeholderText");
const clearArt = document.getElementById("clearArt");
const sendWhatsapp = document.getElementById("sendWhatsapp");
const modelsTrack = document.getElementById("modelsTrack");

let selectedModel = "Caneca Branca";
let selectedFileName = "";
let hasArt = false;

menuToggle?.addEventListener("click", () => nav.classList.toggle("open"));

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => nav.classList.remove("open"));
});

function selectCard(card) {
  cards.forEach((item) => item.classList.remove("active"));
  card.classList.add("active");

  selectedModel =
    card.dataset.modelo ||
    card.querySelector("h3")?.innerText ||
    "Caneca Branca";

  selectedModelText.textContent = selectedModel;

  colors.forEach((color) => {
    color.classList.toggle(
      "selected",
      color.dataset.target === selectedModel
    );
  });
}

cards.forEach((card) => {
  card.addEventListener("click", () => selectCard(card));
});

colors.forEach((color) => {
  color.addEventListener("click", () => {
    colors.forEach((item) => item.classList.remove("selected"));
    color.classList.add("selected");

    const index = color.dataset.card;

    if (index !== undefined && cards[index]) {
      selectCard(cards[index]);

      cards[index].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  });
});

document.querySelector(".arrow.left")?.addEventListener("click", () => {
  modelsTrack.scrollBy({
    left: -260,
    behavior: "smooth",
  });
});

document.querySelector(".arrow.right")?.addEventListener("click", () => {
  modelsTrack.scrollBy({
    left: 260,
    behavior: "smooth",
  });
});

artInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];

  if (!file) return;

  selectedFileName = file.name;
  hasArt = true;
  selectedArtText.textContent = file.name;

  const reader = new FileReader();

  reader.onload = (e) => {
    artPreview.src = e.target.result;
    artPreview.style.display = "block";
    placeholderText.style.display = "none";
  };

  reader.readAsDataURL(file);
});

clearArt.addEventListener("click", () => {
  artInput.value = "";
  hasArt = false;
  selectedFileName = "";
  selectedArtText.textContent = "Nenhuma";

  artPreview.removeAttribute("src");
  artPreview.style.display = "none";
  placeholderText.style.display = "block";
});

sendWhatsapp.addEventListener("click", () => {

  const name =
    document.getElementById("customerName").value.trim() ||
    "Não informado";

  const note =
    document.getElementById("customerNote").value.trim() ||
    "Sem observações";

  /* ==========================
     DATALAYER
  ========================== */

  window.dataLayer = window.dataLayer || [];

  window.dataLayer.push({

    event: "pedido_whatsapp",

    customer_name: name,

    mug_model: selectedModel,

    artwork_uploaded: hasArt,

    artwork_name: hasArt ? selectedFileName : "",

    observations: note,

    page_title: document.title,

    page_location: window.location.href

  });

  /* ==========================
     WHATSAPP
  ========================== */

  const message = `Olá, vim pelo site da MugArt e gostaria de solicitar um orçamento.

Resumo do pedido:
Nome: ${name}
Modelo escolhido: ${selectedModel}
Arte enviada pelo site: ${hasArt ? "Sim - " + selectedFileName : "Não"}
Observações: ${note}

Gostaria de continuar o atendimento pelo WhatsApp.`;

  window.open(
    `https://wa.me/5511988849236?text=${encodeURIComponent(message)}`,
    "_blank"
  );

});
