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

// Gemini API setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Función reutilizable
async function handlePokemonPrompt(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ✅ Endpoint 1: /api/chat (por compatibilidad)
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

// ✅ Endpoint 2: /pokemon y /api/pokemon (ambos funcionan)
app.post(["/pokemon", "/api/pokemon"], async (req, res) => {
  try {
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

// Exportar para Vercel (sin app.listen)
export default app;
