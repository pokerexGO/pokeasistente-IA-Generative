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

// POST Pokémon para tu index.html
app.post("/api/pokemon", async (req, res) => {
  try {
    const nombre = (req.body.pokemon || "").toLowerCase();
    if (!nombre) return res.status(400).json({ error: "No se envió nombre del Pokémon" });

    const consulta = `
Dame una descripción breve y ordenada de ${nombre} en Pokémon GO.
Responde con secciones:
Tipo:
Fortalezas:
Debilidades:
Ataques recomendados:
Estrategia:

Sé claro y usa oraciones cortas. No repitas información ni des párrafos largos.
`;
    const respuesta = await generarRespuesta(consulta);

    // Obtener sprite
    let sprite = "";
    try {
      const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${nombre}`);
      if (pokeRes.ok) {
        const pokeData = await pokeRes.json();
        sprite = pokeData.sprites?.other?.["official-artwork"]?.front_default || "";
      }
    } catch (err) {
      console.error("Error al obtener sprite:", err);
    }

    res.json({ respuesta, sprite });

  } catch (error) {
    console.error("Error en /api/pokemon:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Exportar para Vercel
export default app;
