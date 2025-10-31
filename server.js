// server.js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import fetch from "node-fetch"; // ✅ si ya lo tienes en package.json, lo dejamos
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

// 🔹 Función reutilizable para generar respuesta de Gemini
async function handlePokemonPrompt(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ✅ Endpoint 1: /api/chat (compatibilidad general)
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
    if (!nombre) {
      return res.status(400).json({ error: "No se envió nombre del Pokémon" });
    }

    // 🔹 Intentamos obtener datos base desde la PokéAPI
    let tipos = "desconocido";
    try {
      const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${nombre.toLowerCase()}`);
      if (pokeRes.ok) {
        const pokeData = await pokeRes.json();
        tipos = pokeData.types.map((t) => t.type.name).join(", ");
      }
    } catch {
      console.warn(`⚠️ No se pudo obtener info de PokéAPI para ${nombre}`);
    }

    const prompt = `
      Analiza el Pokémon ${nombre} de tipo ${tipos}.
      Dame una descripción estratégica para Pokémon GO:
      - fortalezas
      - debilidades
      - ataques recomendados
      - oponentes más efectivos
      - consejos de batalla
    `;

    const respuesta = await handlePokemonPrompt(prompt);

    return res.json({ respuesta });
  } catch (error) {
    console.error("Error en /pokemon:", error);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

// ✅ Exportar para Vercel (no usar app.listen)
export default app;
