// Detectar si el entorno es antiguo (por ejemplo, WebView de AppCreator24)
(function () {
  const isOldEnv =
    !window.fetch ||
    !window.Promise ||
    !window.URL ||
    !window.TextDecoder ||
    !window.TextEncoder;

  if (isOldEnv) {
    console.warn("⚠️ Entorno antiguo detectado. Activando modo de compatibilidad.");
    // Cargar polyfills básicos si hiciera falta
    const polyfill = document.createElement("script");
    polyfill.src = "https://cdn.jsdelivr.net/npm/promise-polyfill@8/dist/polyfill.min.js";
    document.head.appendChild(polyfill);
  }
})();

// 🎯 Acción principal
document.getElementById("send").addEventListener("click", async () => {
  const prompt = document.getElementById("prompt").value.trim();
  if (!prompt) return;

  try {
    // Enviar al backend la consulta general (chat)
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    // Si todo sale bien
    document.getElementById("response").innerText =
      data.respuesta || data.response || "Sin respuesta.";

  } catch (err) {
    console.error("❌ Error general:", err);
    document.getElementById("response").innerText = "⚠️ No se pudo conectar con el servidor.";
  }
});

// 🔄 Función adicional de compatibilidad para búsqueda Pokémon (opcional)
async function obtenerPokemon(nombre) {
  try {
    // Usamos el nuevo proxy en tu servidor.js
    const res = await fetch(`/proxy/pokemon/${nombre.toLowerCase()}`);
    if (!res.ok) throw new Error("No se encontró el Pokémon");
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error al obtener Pokémon:", err);
    return null;
  }
}
