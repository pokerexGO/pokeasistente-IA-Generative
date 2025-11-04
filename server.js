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

// Modelo Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function generarRespuesta(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// GET Pokémon para AppCreator24
app.get("/api/pokemon/:name", async (req, res) => {
  try {
    const nombre = req.params.name;
    if (!nombre) return res.status(400).json({ error: "No se envió nombre del Pokémon" });

    const consulta = `Dame una descripción detallada de ${nombre} en Pokémon GO, incluyendo debilidades, fortalezas, ataques y estrategias.`;
    const respuesta = await generarRespuesta(consulta);
    res.json({ respuesta });
  } catch (error) {
    console.error("Error en /api/pokemon:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Proxy para sprites y datos
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
