import { generateContent } from './gemini';

// 1. BMI Calculation Logic
export const calculateBMI = (weight: number, heightCm: number) => {
  const heightM = heightCm / 100;
  return (weight / (heightM * heightM)).toFixed(1);
};

// 2. The AI Advisor
export const getAIRecommendation = async (surveyData: any) => {
  const prompt = `
    Act as the AXON AI Clinical Teller, a world-class preventative medical intelligence engine.
    User Clinical Baseline: ${JSON.stringify(surveyData)}
    
    This patient has just initialized their health registry with AXON.
    Analyze their biometrics (BMI, Age, etc.), vitals, and chronic conditions.
    
    Provide:
    1. A cryptographic-style summary of their baseline "Health Vitality".
    2. A 3-step immediate optimization plan tailored specifically to their metrics.
    3. Targeted lifestyle adjustments (Nutrition/Neuro-physical Exercise).
    4. Predictive longevity warnings specific to their condition profile.
    
    Format: Use modern, clean markdown. Keep the tone clinical, futuristic, supportive, and precise. Avoid generic advice; make it specifically tied to the exact numbers provided.
  `;

  const result = await generateContent("gemini-3-flash-preview", prompt);
  return result.text;
};

// 3. Minimum Survey Requirements
export const SURVEY_QUESTIONS = [
  "Blood Pressure (Systolic)",
  "Blood Pressure (Diastolic)",
  "Fasting Sugar Level (mg/dL)",
  "Existing Chronic Diseases",
  "Daily Water Intake (Liters)",
  "Sleep Hours",
  "Family Medical History",
  "Smoking Status",
  "Alcohol Frequency",
  "Allergies",
  "Activity Level"
];
