// server.js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from "node-fetch"; // 🔧 Añadido para usar fetch en el servidor

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ✅ Usar el modelo original de Replit:
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Función reutilizable
async function generarRespuesta(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ✅ Endpoint principal de Pokémon (mejorado para AppCreator)
app.post("/api/pokemon", async (req, res) => {
  try {
    const { pokemon, prompt } = req.body;
    const nombre = pokemon || prompt;
    if (!nombre) return res.status(400).json({ error: "No se envió nombre del Pokémon" });

    const consulta = `Dame una descripción detallada de ${nombre} en Pokémon GO, incluyendo debilidades, fortalezas, ataques y estrategias.`;
    const respuesta = await generarRespuesta(consulta);

    // 🔧 Nuevo: obtener el sprite desde el servidor
    let sprite = "";
    try {
      const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${nombre.toLowerCase()}`);
      if (pokeRes.ok) {
        const pokeData = await pokeRes.json();
        sprite = pokeData.sprites?.other?.["official-artwork"]?.front_default || "";
      }
    } catch (e) {
      console.warn("No se pudo obtener sprite:", e.message);
    }

    res.json({ respuesta, sprite });
  } catch (error) {
    console.error("Error en /api/pokemon:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Endpoint de chat (opcional)
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Falta el prompt" });

    const respuesta = await generarRespuesta(prompt);
    res.json({ respuesta });
  } catch (error) {
    console.error("Error en /api/chat:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 🔧 Ruta proxy (mantener por compatibilidad)
app.get("/api/proxy-pokemon/:name", async (req, res) => {
  try {
    const name = req.params.name.toLowerCase();
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
    if (!response.ok) throw new Error("No se encontró el Pokémon");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error en proxy:", err);
    res.status(500).json({ error: "Error en proxy de PokeAPI" });
  }
});

// Exportar para Vercel
export default app;

