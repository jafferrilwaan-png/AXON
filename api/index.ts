import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    config: {
      gemini: !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
      supabaseUrl: !!process.env.VITE_SUPABASE_URL,
      supabaseAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    }
  });
});

app.post("/api/ai/generate", async (req, res) => {
  try {
    const { model, contents, config, systemInstruction } = req.body;
    
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        ...config,
        systemInstruction: systemInstruction,
      }
    });

    const result = {
      text: response.text,
      candidates: response.candidates,
      usageMetadata: response.usageMetadata
    };

    res.json(result);
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Internal Server Error",
      details: error
    });
  }
});

export default app;
