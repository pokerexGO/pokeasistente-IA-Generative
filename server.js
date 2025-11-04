import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from "node-fetch";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Inicializar modelo Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Función para generar respuestas de la IA
async function generarRespuesta(prompt) {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error en Gemini:", error);
    return "No se pudo generar información adicional en este momento.";
  }
}

// Endpoint principal
app.post("/api/pokemon", async (req, res) => {
  try {
    const nombre = (req.body.pokemon || "").toLowerCase();
    if (!nombre) return res.status(400).json({ error: "No se envió nombre del Pokémon" });

    // Obtener datos base del Pokémon desde la PokeAPI
    const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${nombre}`);
    if (!pokeRes.ok) return res.status(404).json({ error: "Pokémon no encontrado" });
    const pokeData = await pokeRes.json();

    const sprite =
      pokeData.sprites?.other?.["official-artwork"]?.front_default ||
      pokeData.sprites?.front_default ||
      "";

    // Tipos, habilidades, y estadísticas
    const tipos = pokeData.types.map((t) => t.type.name).join(", ");
    const habilidades = pokeData.abilities.map((a) => a.ability.name).join(", ");
    const baseStats = pokeData.stats
      .map((s) => `${s.stat.name}: ${s.base_stat}`)
      .join(" | ");

    // Ataques recomendados (siempre al menos algo)
    const ataques = pokeData.moves.length
      ? pokeData.moves.slice(0, 5).map((m) => m.move.name.replace(/-/g, " ")).join(", ")
      : "Información no disponible";

    // Prompt más completo para Gemini (pero conciso)
    const consulta = `En el contexto de Pokémon GO, describe al Pokémon ${nombre} con los siguientes puntos:
    - Tipos: ${tipos}.
    - Fortalezas y debilidades principales.
    - Estrategia general para usarlo en combate.
    - Movimiento o ataque más recomendado.
    - Breve consejo para contrarrestarlo si el rival lo usa.
    Resume cada punto con frases cortas y claras, no más de 5 líneas.`;

    const respuestaIA = await generarRespuesta(consulta);

    // Enviar todos los datos al frontend
    res.json({
      nombre,
      sprite,
      tipos,
      habilidades,
      baseStats,
      ataquesRecomendados: ataques,
      descripcionIA: respuestaIA,
    });
  } catch (error) {
    console.error("Error en /api/pokemon:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Exportar para Vercel
export default app;
