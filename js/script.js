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
let selectedColor = "branca";
let selectedFileName = "";
let selectedFileType = "";
let selectedFileExtension = "";
let selectedFileSizeKb = 0;
let hasArt = false;

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => nav.classList.toggle("open"));
}

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => {
    if (nav) nav.classList.remove("open");
  });
});

function selectCard(card) {
  cards.forEach((item) => item.classList.remove("active"));
  card.classList.add("active");

  selectedModel =
    card.dataset.modelo ||
    card.querySelector("h3")?.innerText ||
    "Caneca Branca";

  selectedColor = card.dataset.cor || "";

  if (selectedModelText) {
    selectedModelText.textContent = selectedModel;
  }

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
  if (modelsTrack) {
    modelsTrack.scrollBy({
      left: -260,
      behavior: "smooth",
    });
  }
});

document.querySelector(".arrow.right")?.addEventListener("click", () => {
  if (modelsTrack) {
    modelsTrack.scrollBy({
      left: 260,
      behavior: "smooth",
    });
  }
});

if (artInput) {
  artInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    selectedFileName = file.name;
    selectedFileType = file.type;
    selectedFileExtension = file.name.split(".").pop().toLowerCase();
    selectedFileSizeKb = Math.round(file.size / 1024);
    hasArt = true;

    if (selectedArtText) {
      selectedArtText.textContent = file.name;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      if (artPreview) {
        artPreview.src = e.target.result;
        artPreview.style.display = "block";
      }

      if (placeholderText) {
        placeholderText.style.display = "none";
      }
    };

    reader.readAsDataURL(file);
  });
}

if (clearArt) {
  clearArt.addEventListener("click", () => {
    if (artInput) artInput.value = "";
    hasArt = false;
    selectedFileName = "";
    selectedFileType = "";
    selectedFileExtension = "";
    selectedFileSizeKb = 0;

    if (selectedArtText) {
      selectedArtText.textContent = "Nenhuma";
    }

    if (artPreview) {
      artPreview.removeAttribute("src");
      artPreview.style.display = "none";
    }

    if (placeholderText) {
      placeholderText.style.display = "block";
    }
  });
}

if (sendWhatsapp) {
  sendWhatsapp.addEventListener("click", () => {
    const name =
      document.getElementById("customerName")?.value.trim() ||
      "Não informado";

    const note =
      document.getElementById("customerNote")?.value.trim() ||
      "Sem observações";

    window.dataLayer = window.dataLayer || [];

    window.dataLayer.push({
      event: "pedido_whatsapp",

      mug_model: selectedModel,
      mug_color: selectedColor,

      artwork_uploaded: hasArt,
      artwork_name: hasArt ? selectedFileName : "",
      artwork_type: hasArt ? selectedFileType : "",
      artwork_extension: hasArt ? selectedFileExtension : "",
      artwork_size_kb: hasArt ? selectedFileSizeKb : 0,

      customer_name_filled: name !== "Não informado",
      customer_note_filled: note !== "Sem observações",

      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname
    });

    const message = `Olá, vim pelo site da MugArt e gostaria de solicitar um orçamento.

Resumo do pedido:
Nome: ${name}
Modelo escolhido: ${selectedModel}
Cor da caneca: ${selectedColor}
Arte enviada pelo site: ${hasArt ? "Sim - " + selectedFileName : "Não"}
Observações: ${note}

Gostaria de continuar o atendimento pelo WhatsApp.`;

    window.open(
      `https://wa.me/5511988849236?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  });
}