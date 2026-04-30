import { generateContent } from "@/lib/gemini";

export const generateClinicalRecommendation = async (decryptedPatientContext: any[], userQuery: string) => {
  // Use the latest standard production model
  const model = "gemini-3-flash-preview"; 

  const systemInstruction = `
    You are AXON, an advanced, privacy-preserving medical AI agent.
    Your role is to surface clinically relevant context from longitudinal patient records.
    Analyze the following patient data array: ${JSON.stringify(decryptedPatientContext)}
    
    Respond to the query with highly specific, data-driven medical insights. 
    Maintain a clinical, objective, and secure tone. Highlight risk signals and treatment-response patterns.
    
    If data is insufficient, state: "Insufficient data vectors to project trajectory."
  `;

  try {
    const result = await generateContent(model, userQuery, {}, systemInstruction);
    return result.text;
  } catch (error) {
    console.error("AXON Agent Error:", error);
    return "Error: Unable to synthesize clinical context at this time.";
  }
};

/**
 * High-fidelity synthesis for the Clinical Brief
 */
export const synthesizeClinicalBrief = async (records: any[]) => {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are AXON. Synthesize the longitudinal health history of the patient.
    Maintain a clinical, advanced tone.
  `;

  const prompt = `
    RECORDS: ${JSON.stringify(records)}
    
    Format:
    - Immediate Risk Signals (High/Medium/Low)
    - Treatment-Response Patterns
    - Actionable Clinical Context
  `;

  try {
    const result = await generateContent(model, prompt, {}, systemInstruction);
    return result.text;
  } catch (error) {
    console.error("Synthesis error:", error);
    return "Insufficient data to project clinical trajectory.";
  }
};
