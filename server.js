// server.js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Gemini / Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Handler function (reutilizable)
async function handlePokemonPrompt(prompt) {
  const result = await model.generateContent(prompt);
  // result.response.text() puede variar según SDK; se usa tal cual en tu código original
  return result.response.text();
}

// Ruta original para chat (si tu frontend la usa)
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Falta el prompt" });

    const respuesta = await handlePokemonPrompt(prompt);
    return res.json({ response: respuesta });
  } catch (error) {
    console.error("Error en /api/chat:", error);
    return res.status(500).json({ error: "Error procesando solicitud." });
  }
});

// Compatibilidad con /pokemon (para frontend que llame a /pokemon)
app.post("/pokemon", async (req, res) => {
  try {
    // aquí asumimos que tu frontend envía { pokemon: "nombre" }
    const body = req.body || {};
    const nombre = body.pokemon || body.name || body.prompt || "";
    if (!nombre) return res.status(400).json({ error: "No se envió nombre del Pokémon" });

    const prompt = `Dame una descripción detallada de ${nombre} en Pokémon GO, incluyendo debilidades, fortalezas, ataques y estrategias.`;
    const respuesta = await handlePokemonPrompt(prompt);
    return res.json({ respuesta });
  } catch (error) {
    console.error("Error en /pokemon:", error);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

// Exportar app para Vercel (NO usar app.listen)
export default app;

