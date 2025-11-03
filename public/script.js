// Detectar entorno antiguo
(function () {
  const isOldEnv =
    !window.fetch ||
    !window.Promise ||
    !window.URL ||
    !window.TextDecoder ||
    !window.TextEncoder;

  if (isOldEnv) {
    console.warn("⚠️ Entorno antiguo detectado. Activando modo de compatibilidad.");
    const polyfill = document.createElement("script");
    polyfill.src = "https://cdn.jsdelivr.net/npm/promise-polyfill@8/dist/polyfill.min.js";
    document.head.appendChild(polyfill);
  }
})();

// Elementos del DOM
const form = document.getElementById("buscarForm");
const input = document.getElementById("pokemonInput");
const screen = document.getElementById("screen");
const btnAudioEl = document.getElementById("btnAudio");

let speech = null, paused = false, currentParagraphIndex = 0, paragraphs = [], paragraphElements = [];

btnAudioEl.style.display = "none";

// Función para obtener Pokémon desde tu proxy en el servidor
async function obtenerPokemon(nombre) {
  try {
    const res = await fetch(`/api/proxy-pokemon/${nombre.toLowerCase()}`);
    if (!res.ok) throw new Error("No se encontró el Pokémon");
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error al obtener Pokémon:", err);
    return null;
  }
}

// Formulario principal
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) window.speechSynthesis.cancel();
  paused = false;
  btnAudioEl.classList.remove("speaking");

  const nombre = input.value.trim().toLowerCase();
  if (!nombre) return alert("Ingresa un nombre de Pokémon");

  screen.innerHTML = `<p>🔎 Buscando información sobre <strong>${nombre}</strong>...</p>`;
  btnAudioEl.style.display = "none";

  try {
    const res = await fetch("/api/pokemon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pokemon: nombre })
    });
    const data = await res.json();
    if (!res.ok) {
      screen.innerHTML = `<p>❌ Error: ${data.error || "No se pudo obtener información."}</p>`;
      return;
    }

    const pokeData = await obtenerPokemon(nombre);
    const sprite = pokeData?.sprites?.other?.["official-artwork"]?.front_default || "";

    screen.innerHTML = `
      <img src="${sprite}" alt="${nombre}" class="pokemon-img">
      <h2>${nombre.toUpperCase()}</h2>
      <div id="resultado">${formatText(data.respuesta)}</div>
    `;

    paragraphs = data.respuesta.replace(/[\*\/]/g, "").split(/\n+/).filter(p => p.trim() !== "");
    paragraphElements = document.querySelectorAll("#resultado p");
    currentParagraphIndex = 0;
    btnAudioEl.style.display = "block";
    speech = null;

  } catch (err) {
    console.error("❌ Error de conexión:", err);
    screen.innerHTML = `<p>⚠️ Error al conectar con el servidor.</p>`;
  }
});

// Audio TTS
btnAudioEl.addEventListener("click", () => {
  const synth = window.speechSynthesis;
  if (!paragraphs.length) return;
  if (synth.speaking || paused) {
    if (!paused) { synth.pause(); paused = true; btnAudioEl.classList.remove("speaking"); }
    else { synth.resume(); paused = false; btnAudioEl.classList.add("speaking"); }
  } else {
    currentParagraphIndex = 0; speakNext();
  }
});

function speakNext() {
  if (currentParagraphIndex >= paragraphs.length) {
    btnAudioEl.classList.remove("speaking");
    currentParagraphIndex = 0;
    paragraphElements.forEach(p => p.classList.remove("highlight"));
    if (paragraphElements[0]) paragraphElements[0].scrollIntoView({behavior:'smooth', block:'start'});
    speech = null; return;
  }
  const paragraph = paragraphs[currentParagraphIndex];
  const utterance = new SpeechSynthesisUtterance(paragraph);
  utterance.lang = 'es-ES';
  paragraphElements.forEach(p => p.classList.remove('highlight'));
  const currentEl = paragraphElements[currentParagraphIndex];
  if (currentEl) { currentEl.classList.add('highlight'); currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  utterance.onend = () => { currentParagraphIndex++; speakNext(); };
  speech = utterance; window.speechSynthesis.speak(speech);
  btnAudioEl.classList.add('speaking'); paused = false;
}

// Formatear texto con tags
function formatText(text) {
  if (!text) return "Sin respuesta del modelo.";
  const paragraphs = text.split(/\n+/).filter(p => p.trim() !== "");
  const tags = ["Tipo","Tipos","Habilidad","Habilidades","Debilidad","Debilidades","Ataque","Ataques","Estrategia","Estrategias","Consejo","Consejos","Evolución","Evoluciones","Movimientos","Resistencia","Ventaja","Fortaleza","Fortalezas","Debilidad Frente A","Recomendación","Notas"];
  return paragraphs.map(p => {
    tags.forEach(tag => { const regex = new RegExp(`(${tag}):`, "gi"); p = p.replace(regex, `<span class='tag'>${tag}</span>:`); });
    return `<p>${p}</p>`;
  }).join("");
}
