// ================================
// Compatibilidad entornos antiguos
// ================================
(function () {
  const isOldEnv =
    !window.fetch ||
    !window.Promise ||
    !window.URL ||
    !window.TextDecoder ||
    !window.TextEncoder;

  if (isOldEnv) {
    console.warn("⚠️ Entorno antiguo detectado. Activando modo de compatibilidad.");
    var polyfill = document.createElement("script");
    polyfill.src = "https://cdn.jsdelivr.net/npm/promise-polyfill@8/dist/polyfill.min.js";
    document.head.appendChild(polyfill);

    var fetchPolyfill = document.createElement("script");
    fetchPolyfill.src = "https://cdn.jsdelivr.net/npm/whatwg-fetch@3.6.2/dist/fetch.umd.min.js";
    document.head.appendChild(fetchPolyfill);
  }
})();

// ================================
// Elementos DOM
// ================================
var form = document.getElementById("buscarForm");
var input = document.getElementById("pokemonInput");
var screen = document.getElementById("screen");
var btnAudioEl = document.getElementById("btnAudio");

var speech = null;
var paused = false;
var currentParagraphIndex = 0;
var paragraphs = [];
var paragraphElements = [];

btnAudioEl.style.display = "none";

// ================================
// Función fetch Pokémon (proxy)
// ================================
function obtenerPokemon(nombre, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "/api/proxy-pokemon/" + encodeURIComponent(nombre.toLowerCase()));
  xhr.onload = function () {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        var data = JSON.parse(xhr.responseText);
        callback(null, data);
      } catch (e) {
        callback("Error parseando datos");
      }
    } else {
      callback("No se encontró el Pokémon");
    }
  };
  xhr.onerror = function () { callback("Error de conexión"); };
  xhr.send();
}

// ================================
// Formulario principal
// ================================
form.addEventListener("submit", function (e) {
  e.preventDefault();

  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
  paused = false;
  btnAudioEl.classList.remove("speaking");

  var nombre = (input.value || "").trim().toLowerCase();
  if (!nombre) return alert("Ingresa un nombre de Pokémon");

  screen.innerHTML = "<p>🔎 Buscando información sobre <strong>" + nombre + "</strong>...</p>";
  btnAudioEl.style.display = "none";

  // Fetch al endpoint /api/pokemon
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/pokemon");
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.onload = function () {
    var data;
    try {
      data = JSON.parse(xhr.responseText);
    } catch (e) {
      screen.innerHTML = "<p>❌ Error al procesar la respuesta del servidor.</p>";
      return;
    }
    if (xhr.status < 200 || xhr.status >= 300) {
      screen.innerHTML = "<p>❌ Error: " + (data.error || "No se pudo obtener información.") + "</p>";
      return;
    }

    // Luego obtenemos la info completa del proxy
    obtenerPokemon(nombre, function (err, pokeData) {
      var sprite = "";
      if (pokeData &&
          pokeData.sprites &&
          pokeData.sprites.other &&
          pokeData.sprites.other["official-artwork"] &&
          pokeData.sprites.other["official-artwork"].front_default) {
        sprite = pokeData.sprites.other["official-artwork"].front_default;
      }

      screen.innerHTML =
        "<img src='" + sprite + "' alt='" + nombre + "' class='pokemon-img'>" +
        "<h2>" + nombre.toUpperCase() + "</h2>" +
        "<div id='resultado'>" + formatText(data.respuesta) + "</div>";

      paragraphs = (data.respuesta || "").replace(/[\*\/]/g, "").split(/\n+/).filter(function(p) { return p.trim() !== ""; });
      paragraphElements = document.querySelectorAll("#resultado p");
      currentParagraphIndex = 0;
      btnAudioEl.style.display = "block";
      speech = null;
    });
  };
  xhr.onerror = function () {
    screen.innerHTML = "<p>⚠️ Error al conectar con el servidor.</p>";
  };
  xhr.send(JSON.stringify({ pokemon: nombre }));
});

// ================================
// Audio TTS
// ================================
if ("speechSynthesis" in window && typeof SpeechSynthesisUtterance === "function") {
  btnAudioEl.addEventListener("click", function () {
    if (!paragraphs.length) return;
    var synth = window.speechSynthesis;

    if (synth.speaking || paused) {
      if (!paused) { synth.pause(); paused = true; btnAudioEl.classList.remove("speaking"); }
      else { synth.resume(); paused = false; btnAudioEl.classList.add("speaking"); }
    } else {
      currentParagraphIndex = 0;
      speakNext();
    }
  });
} else {
  btnAudioEl.style.display = "none";
  console.warn("TTS no disponible en este entorno.");
}

function speakNext() {
  if (currentParagraphIndex >= paragraphs.length) {
    btnAudioEl.classList.remove("speaking");
    currentParagraphIndex = 0;
    for (var i = 0; i < paragraphElements.length; i++) paragraphElements[i].classList.remove("highlight");
    if (paragraphElements[0]) paragraphElements[0].scrollIntoView({behavior:'smooth', block:'start'});
    speech = null;
    return;
  }
  var paragraph = paragraphs[currentParagraphIndex];
  var utterance = new SpeechSynthesisUtterance(paragraph);
  utterance.lang = 'es-ES';

  for (var j = 0; j < paragraphElements.length; j++) paragraphElements[j].classList.remove('highlight');
  var currentEl = paragraphElements[currentParagraphIndex];
  if (currentEl) {
    currentEl.classList.add('highlight');
    currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  utterance.onend = function () { currentParagraphIndex++; speakNext(); };
  speech = utterance;
  window.speechSynthesis.speak(speech);
  btnAudioEl.classList.add('speaking'); paused = false;
}

// ================================
// Formatear texto con tags
// ================================
function formatText(text) {
  if (!text) return "Sin respuesta del modelo.";
  var paragraphs = text.split(/\n+/).filter(function(p) { return p.trim() !== ""; });
  var tags = ["Tipo","Tipos","Habilidad","Habilidades","Debilidad","Debilidades","Ataque","Ataques","Estrategia","Estrategias","Consejo","Consejos","Evolución","Evoluciones","Movimientos","Resistencia","Ventaja","Fortaleza","Fortalezas","Debilidad Frente A","Recomendación","Notas"];
  
  return paragraphs.map(function(p) {
    for (var i=0; i<tags.length; i++) {
      var regex = new RegExp("(" + tags[i] + "):", "gi");
      p = p.replace(regex, "<span class='tag'>" + tags[i] + "</span>:");
    }
    return "<p>" + p + "</p>";
  }).join("");
}
