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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function generarRespuesta(prompt) {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Error generando respuesta IA:", err);
    return "No se pudo generar la descripción en este momento.";
  }
}

// ✅ RUTA POST COMPATIBLE CON TU SCRIPT ORIGINAL
app.post("/api/pokemon", async (req, res) => {
  try {
    const nombre = (req.body.pokemon || "").toLowerCase();
    if (!nombre) {
      return res.status(400).json({ error: "No se envió nombre del Pokémon" });
    }

    // Obtener datos base desde PokeAPI
    const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${nombre}`);
    if (!pokeRes.ok) {
      return res.json({ respuesta: null });
    }

    const pokeData = await pokeRes.json();

    // Extraer datos del Pokémon
    const tipos = pokeData.types.map(t => t.type.name).join(", ");
    const habilidades = pokeData.abilities.map(a => a.ability.name).join(", ");
    const ataques = pokeData.moves.length
      ? pokeData.moves.slice(0, 5).map(m => m.move.name.replace(/-/g, " ")).join(", ")
      : "Información no disponible";

    const baseStats = pokeData.stats
      .map(s => `${s.stat.name}: ${s.base_stat}`)
      .join(" | ");

    const sprite = pokeData.sprites?.other?.["official-artwork"]?.front_default || "";

    // Prompt mejorado pero breve
    const prompt = `Eres un experto en Pokémon GO.
Redacta una descripción ordenada, clara y con buen formato sobre ${nombre}.
Incluye los siguientes apartados (máx. 4 líneas cada uno):

Tipo: ${tipos}
Habilidades: ${habilidades}
Ataques recomendados: ${ataques}
Fortalezas: describe sus principales ventajas o resistencias.
Debilidades: tipos que lo afectan más.
Estrategias: cómo usarlo en combate.
Consejos: sugerencias útiles de entrenamiento.

No repitas información ni uses texto extenso.`;

    const respuestaIA = await generarRespuesta(prompt);

    res.json({ respuesta: respuestaIA, sprite });
  } catch (error) {
    console.error("Error en /api/pokemon:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default app;
