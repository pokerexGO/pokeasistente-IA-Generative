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

// =============================================
// Función IA con control de errores
// =============================================
async function generarRespuesta(prompt) {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Error generando respuesta de Gemini:", err);
    return "No se pudo generar la descripción en este momento.";
  }
}

// =============================================
// Ruta principal compatible con tu script.js
// =============================================
app.get("/api/pokemon/:nombre", async (req, res) => {
  try {
    const nombre = req.params.nombre.toLowerCase();

    const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${nombre}`);
    if (!pokeRes.ok) {
      return res.json({ respuesta: null });
    }

    const pokeData = await pokeRes.json();

    // Datos base
    const tipos = pokeData.types.map(t => t.type.name).join(", ");
    const habilidades = pokeData.abilities.map(a => a.ability.name).join(", ");
    const ataques = pokeData.moves.length
      ? pokeData.moves.slice(0, 5).map(m => m.move.name.replace(/-/g, " ")).join(", ")
      : "Información no disponible";
    const baseStats = pokeData.stats
      .map(s => `${s.stat.name}: ${s.base_stat}`)
      .join(" | ");

    // Prompt con más información (ordenada pero no extensa)
    const prompt = `Eres un experto en Pokémon. Genera una descripción clara, breve y ordenada del Pokémon ${nombre}.
Incluye los siguientes apartados (cada uno en párrafo separado):
Tipo: ${tipos}
Habilidades: ${habilidades}
Ataques recomendados: ${ataques}
Fortalezas: principales ventajas o resistencias.
Debilidades: principales desventajas o tipos que lo afectan.
Estrategias: cómo usarlo en combate de forma efectiva.
Consejos: recomendaciones breves para entrenarlo.
Evita textos largos (máx. 4 líneas por punto).`;

    const respuestaIA = await generarRespuesta(prompt);

    // Retornamos con el mismo formato que espera tu script.js
    res.json({ respuesta: respuestaIA });
  } catch (error) {
    console.error("Error en /api/pokemon:", error);
    res.json({ respuesta: null });
  }
});

// =============================================
// Proxy para sprites (igual que antes)
// =============================================
app.get("/api/proxy-pokemon/:nombre", async (req, res) => {
  try {
    const nombre = req.params.nombre.toLowerCase();
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${nombre}`);
    if (!response.ok) return res.status(404).json({ error: "Pokémon no encontrado" });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error en proxy:", error);
    res.status(500).json({ error: "Error en proxy" });
  }
});

export default app;
