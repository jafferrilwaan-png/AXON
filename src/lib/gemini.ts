import { GoogleGenAI, Type } from "@google/genai";

// AXON Intelligence: Health Check & Proxy Bridge
// For local or Vercel express deployment, we use backend to keep the key safe.
// However, if deployed on a static node (like basic Vercel SPA) and a client key is available, use it.
const useBackend = import.meta.env.VITE_GEMINI_API_KEY ? false : true;

export async function callAIApi(model: string, contents: any, config?: any, systemInstruction?: string) {
  let finalModel = model;

  if (useBackend) {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: finalModel, contents, config, systemInstruction })
    });
    
    if (!response.ok) {
      let errorMsg = `AI Request failed with status ${response.status}`;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const errData = await response.json();
          errorMsg = typeof errData.error === 'object' ? JSON.stringify(errData.error) : errData.error;
        } catch (e) {
          // Fallback if JSON parsing fails despite content-type
        }
      } else {
        // Handle non-JSON responses (like HTML error pages)
        const text = await response.text();
        if (text.includes('<!doctype html>') || text.includes('<!DOCTYPE html>')) {
          errorMsg = `Server returned an HTML error page (Status ${response.status}). This usually means the API route was not found or the server is misconfigured.`;
        } else {
          errorMsg = text.substring(0, 200) || errorMsg;
        }
      }
      
      if (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("API key not valid")) {
        throw new Error("Invalid Gemini API Key. Please provide a valid API key in the project settings/secrets.");
      }
      
      if (errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429")) {
        throw new Error("QUOTA_EXCEEDED: The AXON clinical engine has reached its daily processing limit (20 requests/day). This is a safety protocol for the free tier. Please try again in 24 hours.");
      }
      
      throw new Error(errorMsg);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Expected JSON response but received ${contentType || 'unknown'}. Content: ${text.substring(0, 100)}...`);
    }

    const data = await response.json();
    return data;
  } else {
    // Legacy client-side call (keeping for reference if backend fails)
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing AI API Key. Please provide VITE_GEMINI_API_KEY for Vercel SPA deployment.");
    }
    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    const response = await ai.models.generateContent({
      model: finalModel,
      contents,
      config: {
        ...config,
        systemInstruction
      }
    });
    return response;
  }
}

/**
 * Unified generation helper
 */
export async function generateContent(model: string, contents: any, config?: any, systemInstruction?: string) {
  const result = await callAIApi(model, contents, config, systemInstruction);
  
  // Normalize response structure (Direct API vs SDK result)
  if (result.text) {
    return {
      text: result.text,
      response: result
    };
  }

  if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
    return {
      text: result.candidates[0].content.parts[0].text,
      response: result
    };
  }
  
  return result;
}

/**
 * Extracts structured medical data from an image/PDF using Gemini Flash.
 */
export async function extractMedicalData(base64Data: string, mimeType: string) {
  try {
    const result = await callAIApi(
      "gemini-3-flash-preview", 
      [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        "Extract medical information from this document. Provide a 1-sentence snippet summarizing the core finding. Extract a list of keyFindings and a list of followUp suggestions. Also provide title, type (Diagnosis, Lab Report, Medication, Treatment, General), date, and provider."
      ],
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['Diagnosis', 'Lab Report', 'Medication', 'Treatment', 'General'] },
            date: { type: Type.STRING, description: "YYYY-MM-DD" },
            provider: { type: Type.STRING },
            snippet: { type: Type.STRING, description: "1-sentence quick view summary" },
            keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
            followUp: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["title", "type", "date", "snippet", "keyFindings", "followUp"]
        }
      }
    );
    
    // Normalize text extraction
    const responseText = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(responseText.trim());
  } catch (error: any) {
    console.error("Gemini OCR Error:", error);
    throw new Error("Failed to extract medical data");
  }
}

/**
 * Synthesizes a longitudinal medical history into a clinical summary for doctors.
 */
export async function synthesizeLongitudinalHistory(records: any[]) {
  try {
    const recordsText = JSON.stringify(records, null, 2);
    
    const result = await callAIApi(
      "gemini-3-flash-preview",
      `You are a brilliant medical orchestrator AI. Analyze these longitudinal patient records over time. RECORDS: ${recordsText} Synthesize these past records to find trends. Highlight chronic risks, medication history changes, and treatment-response patterns.`,
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chronicRisks: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Highlight the top 3-4 chronic or compounding risks identified over time."
            },
            medicationPatterns: {
              type: Type.STRING,
              description: "Analyze the medication history: dose changes, new drugs, or potential interactions."
            },
            treatmentResponse: {
              type: Type.STRING,
              description: "Summarize how the patient has responded to previous treatments based on follow-up records."
            },
            clinicalSummary: {
              type: Type.STRING,
              description: "A 2-4 sentence executive summary of the patient's holistic health status for the point-of-care doctor."
            }
          },
          required: ["chronicRisks", "medicationPatterns", "treatmentResponse", "clinicalSummary"]
        }
      }
    );

    const responseText = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(responseText.trim());
  } catch (error: any) {
    console.error("Gemini Synthesis Error:", error);
    throw new Error("Failed to synthesize patient records");
  }
}

/**
 * Agent 1: Ingestion Agent
 */
export async function ingestionAgent(rawText: string) {
  try {
    const prompt = `You are an expert Medical Registrar. Extract structured data from this medical document text.
    TEXT: ${rawText}
    Focus on: Diagnoses, Medications (name, dose, freq), Lab Results, and Provider.`;

    const result = await callAIApi(
      "gemini-3-flash-preview",
      prompt,
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['diagnosis', 'medication', 'lab_report', 'treatment', 'note'] },
            date: { type: Type.STRING, description: "YYYY-MM-DD" },
            provider: { type: Type.STRING },
            summary: { type: Type.STRING },
            medications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  frequency: { type: Type.STRING }
                }
              }
            },
            diagnoses: { type: Type.ARRAY, items: { type: Type.STRING } },
            lab_results: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "type", "date"]
        }
      }
    );

    const responseText = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(responseText.trim());
  } catch (error) {
    console.error("Ingestion Agent Error:", error);
    throw error;
  }
}

/**
 * AXON Vitality Agent
 */
export async function vitalityAgent(profile: any) {
  try {
    const prompt = `Act as a senior clinical analyst for AXON. 
    Calculate a 'Health Vitality Score' (0-100) based on the following weighted algorithm:
    - Vitals (40%): BP, Heart Rate, Blood Sugar.
    - Lifestyle (30%): Sleep, Water, Smoking, Activity Level.
    - Family History (15%): Chronic illness history.
    - BMI (15%): Calculated from Height/Weight.

    PATIENT PROFILE: ${JSON.stringify(profile)}

    Output exactly JSON with vitality_score, detailed_explanation, and 3 specific improvement_areas.`;

    const result = await callAIApi(
      "gemini-3-flash-preview",
      prompt,
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vitality_score: { type: Type.NUMBER },
            explanation: { type: Type.STRING },
            improvement_areas: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["vitality_score", "explanation", "improvement_areas"]
        }
      }
    );
    const responseText = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(responseText.trim());
  } catch (error) {
    console.error("Vitality Agent Error:", error);
    return { 
      vitality_score: 75, 
      explanation: "Baseline AXON assessment.", 
      improvement_areas: ["Hydration optimization", "Sleep consistency", "Regular activity"] 
    };
  }
}

/**
 * Agent: Risk Agent
 */
export async function riskAgent(records: any[]) {
  const prompt = `Review these medical records for chronic risk factors.
  RECORDS: ${JSON.stringify(records)}`;

  const result = await callAIApi(
    "gemini-3-flash-preview",
    prompt,
    {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          risk_level: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
          conditions: { type: Type.ARRAY, items: { type: Type.STRING } },
          confidence: { type: Type.NUMBER },
          reasoning: { type: Type.STRING }
        }
      }
    }
  );

  const responseText = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(responseText.trim());
}

/**
 * Chat with AXON
 */
export async function chatWithAxon(messages: any[], userQuery: string) {
  try {
    const contents = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: userQuery }]
    });

    const result = await callAIApi(
      "gemini-3-flash-preview",
      contents,
      {},
      "You are AXON, an advanced clinical assistant AI. Provide crisp, professional, and well-structured responses focusing on clinical relevance."
    );
    
    return result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error("AXON Chat Error:", error);
    throw error;
  }
}

/**
 * AXON Medical Scribe
 */
export async function axonMedicalScribe(records: any[]) {
  try {
    const recordsText = JSON.stringify(records.map(r => ({
      Diagonal: r.diagnosis || r.data?.diagnoses || r.title,
      Labs: r.labs || r.data?.lab_results || "N/A",
      Medications: r.medications || r.data?.medications || "N/A",
      Treatment: r.treatment || r.data?.treatment || "N/A"
    })));
    
    const systemInstruction = `## ROLE
You are the AXON Clinical Orchestrator. Your mission is to build and manage a Longitudinal Patient Memory Layer.

## PROBLEM STATEMENT COMPLIANCE
- Integrate siloed EHR data from Supabase (Ref: qabjhnybmlxhxyxvjvtg).
- Harmonize data into four core columns: Diagnosis, Labs, Medications, and Treatment.
- Act as a specialized agent network: Harmonizer (merges data), Sentinel (finds risks), and Summarizer (POC brief).

## EXECUTION RULES
- Only unlock clinical data after 2FA (6-digit code) confirmation.
- Use a professional, secure, and clinical tone.
- Prioritize real-time hardware telemetry ingestion for trajectory prediction.`;

    const result = await callAIApi(
      "gemini-3-flash-preview",
      `Analyze these cross-silo records and provide clinical context as instructed.\nRECORDS:\n${recordsText}`,
      {},
      systemInstruction
    );
    
    return result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error("AXON Scribe Error:", error);
    return "Error synthesizing medical context.";
  }
}

export async function summaryAgent(patient: any, records: any[]) {
  const prompt = `Provide a professional 3-sentence clinical executive summary for a doctor.
  Patient: ${JSON.stringify(patient)}
  History: ${JSON.stringify(records)}`;

  const result = await callAIApi("gemini-3-flash-preview", prompt);
  const text = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim();
}

// End of file

