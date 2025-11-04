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

app.post("/api/pokemon", async (req, res) => {
  try {
    const nombre = (req.body.pokemon || "").toLowerCase();
    if (!nombre) return res.status(400).json({ error: "No se envió nombre del Pokémon" });

    // Obtener datos desde la PokeAPI
    const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${nombre}`);
    if (!pokeRes.ok) {
      return res.status(404).json({ error: "Pokémon no encontrado" });
    }
    const pokeData = await pokeRes.json();

    const sprite =
      pokeData.sprites?.other?.["official-artwork"]?.front_default ||
      pokeData.sprites?.front_default ||
      "";

    // Obtener ataques recomendados
    const ataques = pokeData.moves
      .slice(0, 5)
      .map((m) => m.move.name.replace("-", " "))
      .join(", ");

    // Descripción más completa pero no extensa
    const consulta = `Dame una descripción clara y breve del Pokémon ${nombre} en Pokémon GO. 
    Incluye sus tipos, fortalezas, debilidades y una pequeña estrategia de combate. 
    Sé conciso pero informativo.`;

    const respuesta = await generarRespuesta(consulta);

    res.json({
      respuesta,
      sprite,
      ataquesRecomendados: ataques || "No se encontraron ataques disponibles"
    });

  } catch (error) {
    console.error("Error en /api/pokemon:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Exportar para Vercel
export default app;
