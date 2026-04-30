// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function startServer() {
  const app = express();
  const PORT = 3e3;
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.get("/api/health", (req, res) => {
    console.log("Health check env status:", {
      GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
      GEMINI: !!process.env.GEMINI_API_KEY,
      VITE_GEMINI: !!process.env.VITE_GEMINI_API_KEY,
      SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      SUPABASE_ANON: !!process.env.VITE_SUPABASE_ANON_KEY,
      AXON: !!process.env.VITE_AXON_ENCRYPTION_KEY
    });
    res.json({
      status: "ok",
      config: {
        gemini: !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
        supabaseUrl: !!process.env.VITE_SUPABASE_URL,
        supabaseAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
        axonEncryptionKey: !!(process.env.VITE_AXON_ENCRYPTION_KEY || process.env.AXON_ENCRYPTION_KEY)
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
        model,
        contents,
        config: {
          ...config,
          systemInstruction
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
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer().catch(console.error);
