import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in the environment. Falling back to rule-based mock translations.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API Route for live translation
app.post("/api/translate", async (req, res) => {
  const { text, sourceLang, targetLang, mode } = req.body;

  if (!text || !targetLang) {
    return res.status(400).json({ error: "Missing required parameters: text, targetLang" });
  }

  const sLang = sourceLang || "Auto-detect";
  const contextInstruction = mode === "business" 
    ? "This is for a professional business meeting (Google Meet style). Translate accurately, keeping a professional, courteous, and precise tone appropriate for business interactions. Avoid slang."
    : "This is for an informal personal telephone call. Translate naturally, keeping a friendly, conversational, and warm tone. Use natural spoken-style phrasing.";

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Rule-based high-quality simulator when key is missing to ensure a functional preview
      console.log(`[Mock Translate] "${text}" from ${sLang} to ${targetLang} (${mode} mode)`);
      let mockResult = `[Translated to ${targetLang}]: ${text}`;
      
      // Simple common phrases simulation
      const lower = text.toLowerCase().trim();
      if (lower.includes("hello") || lower.includes("hi")) {
        if (targetLang.toLowerCase().includes("span")) mockResult = mode === "business" ? "Hola, buenos días." : "¡Hola! ¿Cómo estás?";
        else if (targetLang.toLowerCase().includes("fren")) mockResult = mode === "business" ? "Bonjour, ravi de vous rencontrer." : "Salut! Ça va?";
        else if (targetLang.toLowerCase().includes("germ")) mockResult = "Hallo, guten Tag.";
        else if (targetLang.toLowerCase().includes("chin")) mockResult = "你好";
        else if (targetLang.toLowerCase().includes("arab")) mockResult = "مرحباً";
      } else if (lower.includes("how are you")) {
        if (targetLang.toLowerCase().includes("span")) mockResult = mode === "business" ? "¿Cómo se encuentra usted hoy?" : "¿Cómo te va?";
        else if (targetLang.toLowerCase().includes("fren")) mockResult = mode === "business" ? "Comment allez-vous aujourd'hui?" : "Comment ça va?";
      } else if (lower.includes("business") || lower.includes("meeting")) {
        if (targetLang.toLowerCase().includes("span")) mockResult = "Hablemos de negocios y de los objetivos de nuestra reunión hoy.";
      }
      
      return res.json({ 
        translation: mockResult, 
        sourceDetected: sLang === "Auto-detect" ? "English" : sLang,
        simulated: true 
      });
    }

    const ai = getGeminiClient();
    const systemInstruction = `You are an elite, real-time speech translator. 
Your goal is to translate the input spoken text from ${sLang} into ${targetLang}.
Guidelines:
1. Translate ONLY the input text. Do not add any conversational replies, explanations, or metadata.
2. Preserve emotional nuance, emphasis, and context.
3. ${contextInstruction}
4. If there is a typo or transcription glitch in the input speech, correct it contextually during translation.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: text,
      config: {
        systemInstruction,
        temperature: 0.3,
      }
    });

    const translation = response.text?.trim() || text;
    res.json({ 
      translation, 
      sourceDetected: sLang === "Auto-detect" ? "English" : sLang 
    });

  } catch (error: any) {
    console.error("Gemini Translation API Error:", error);
    res.status(500).json({ error: "Failed to translate", details: error.message });
  }
});

// Setup Vite Dev Server / Static Assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
