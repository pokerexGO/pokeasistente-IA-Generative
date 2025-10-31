// api/pokemon.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { pokemon } = req.body;
    if (!pokemon) return res.status(400).json({ error: "Falta el nombre del Pokémon" });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Dame una descripción detallada de ${pokemon} en Pokémon GO, incluyendo debilidades, fortalezas, ataques y estrategias.`;
    const result = await model.generateContent(prompt);

    return res.status(200).json({ respuesta: result.response.text() });
  } catch (error) {
    console.error("Error en /api/pokemon:", error);
    return res.status(500).json({ error: "Error en el servidor" });
  }
}
