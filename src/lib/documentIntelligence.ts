import { supabase } from './supabase';
import { callAIApi } from './gemini';
import { Type } from "@google/genai";

export const processMedicalDocument = async (file: File, patientId: string) => {
  try {
    // 1. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${patientId}/${fileName}`;
    
    // Using a different bucket name since schema uses 'medical-reports'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('medical-reports')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('medical-reports')
      .getPublicUrl(filePath);

    // 2. Create placeholder record in DB (UI shows "Processing...")
    const { data: record, error: dbError } = await supabase
      .from('medical_records')
      .insert({
        patient_id: patientId,
        file_url: publicUrlData.publicUrl,
        title: "AI Processing Document...",
        is_processing: true
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 3. Process with Gemini AI (Convert file to base64)
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      
      const config = {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            document_type: { type: Type.STRING, enum: ["lab_report", "scan", "prescription", "discharge_summary", "notes"] },
            date_detected: { type: Type.STRING },
            summary: { type: Type.STRING },
            key_findings: { type: Type.ARRAY, items: { type: Type.STRING } },
            test_values: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ["low", "normal", "high"] }
                }
              }
            },
            risk_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
            doctor_notes: { type: Type.STRING },
            follow_up: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "document_type", "summary"]
        }
      };

      const prompt = `Analyze this medical document. Extract the clinical data for a patient memory layer.`;

      try {
        const result = await callAIApi(
          "gemini-3-flash-preview",
          [
            { inlineData: { data: base64Data, mimeType: file.type } },
            prompt
          ],
          config
        );
        
        const text = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
        const extractedData = JSON.parse(text.trim());

        // 4. Update Database with AI Data
        await supabase.from('medical_records').update({
          title: extractedData.title,
          document_type: extractedData.document_type,
          date_detected: extractedData.date_detected,
          summary: extractedData.summary,
          key_findings: extractedData.key_findings,
          test_values: extractedData.test_values,
          risk_flags: extractedData.risk_flags,
          doctor_notes: extractedData.doctor_notes,
          follow_up: extractedData.follow_up,
          is_processing: false
        }).eq('id', record.id);

      } catch (aiError) {
        console.error("AI Processing failed:", aiError);
        // Fallback if AI fails
        await supabase.from('medical_records').update({
          title: "Unprocessed Record",
          summary: "AI extraction encountered an error. Please manually review the attached file.",
          is_processing: false
        }).eq('id', record.id);
      }
    };
    
    return record;
  } catch (error) {
    console.error("Upload process failed:", error);
    throw error;
  }
};
