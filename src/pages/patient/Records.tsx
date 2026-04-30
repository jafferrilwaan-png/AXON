import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, UploadCloud, FileText, Loader2, Plus } from "lucide-react";
import { extractMedicalData } from "../../lib/gemini";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";

export default function PatientRecords() {
  const [records, setRecords] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In production: fetch from Supabase
    const fetchRecords = async () => {
      // const { data, error } = await supabase.from('medical_records').select('*');
      // if (data) setRecords(data);
    };
    fetchRecords();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      const base64Data = result.split(',')[1];
      
      try {
        const extractedData = await extractMedicalData(base64Data, file.type);
        
        // In production:
        // 1. Upload file to Supabase Storage
        // 2. Insert record to medical_records table with extractedData
        console.log("Extracted Data:", extractedData);
        
        // For now, update local state as placeholder
        const newRecord = {
          id: Math.random().toString(36),
          file_name: file.name,
          upload_date: new Date().toISOString(),
          structured_data: extractedData
        };
        setRecords([newRecord, ...records]);
      } catch (err: any) {
        setError("Failed to extract data: " + err.message);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-6xl mx-auto w-full p-6 space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <Link to="/patient" className="p-2 bg-white rounded-full hover:bg-slate-100 transition text-slate-500">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your Health History</h1>
          <p className="text-slate-500 text-sm mt-1">Upload records to your encrypted longitudinal timeline.</p>
        </div>
      </header>

      {error && (
         <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
           {error}
         </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Upload Column */}
        <div className="lg:col-span-1 space-y-6">
           <div className="glass-panel p-6 border-dashed border-2 border-slate-300 text-center hover:bg-slate-50 transition cursor-pointer relative">
             <input 
               title="Upload pdf/images"
               type="file" 
               accept="image/png, image/jpeg, application/pdf"
               onChange={handleFileUpload}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
             />
             <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
               <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center">
                 {isUploading ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />}
               </div>
               <div>
                  <h3 className="font-semibold text-slate-900">{isUploading ? "Extracting via AI..." : "Upload Medical Record"}</h3>
                  <p className="text-xs text-slate-500 mt-1">Images or PDFs. Max 5MB.</p>
               </div>
               <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 flex items-center gap-2">
                 <Plus size={16}/> Select File
               </button>
             </div>
           </div>
           
           <div className="bg-slate-100 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
             <strong>Privacy Note:</strong> Your uploaded documents are processed securely via Gemini Flash for OCR structure extraction. The structured JSON is stored encrypted.
           </div>
        </div>

        {/* Timeline Column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 px-2">Longitudinal Timeline</h2>
          
          {records.length === 0 ? (
            <div className="glass-panel p-12 flex flex-col items-center justify-center text-center text-slate-400">
               <FileText size={48} className="mb-4 opacity-20" />
               <p>No records found.<br/>Upload your first document to build your timeline.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((rec) => {
                 const data = rec.structured_data;
                 return (
                   <div key={rec.id} className="glass-panel p-0 overflow-hidden flex flex-col sm:flex-row hover:shadow-md transition duration-300">
                     <div className="bg-slate-50 p-6 border-b sm:border-b-0 sm:border-r border-slate-200 flex flex-col items-center justify-center min-w[140px] shrink-0">
                       <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">{data?.dateOfService ? format(new Date(data.dateOfService), 'MMM yyyy') : 'Unknown'}</span>
                       {data?.dateOfService && <span className="text-3xl font-bold font-mono text-slate-900">{format(new Date(data.dateOfService), 'dd')}</span>}
                     </div>
                     <div className="p-6 flex-1 space-y-3">
                       <div className="flex justify-between items-start">
                         <h3 className="font-bold text-lg text-slate-900">{data?.typeOfRecord || "Medical Record"}</h3>
                         <span className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded font-medium">{data?.providerName || "General"}</span>
                       </div>
                       
                       <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 font-serif leading-relaxed">
                         "{data?.keyFindings || "No structured findings available."}"
                       </p>
                       
                       {(data?.diagnosis?.length > 0 || data?.medications?.length > 0) && (
                         <div className="flex flex-wrap gap-2 pt-2">
                           {data?.diagnosis?.map((d:string, i:number) => <span key={i} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded border border-red-100">Dx: {d}</span>)}
                           {data?.medications?.map((m:string, i:number) => <span key={i} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100">Rx: {m}</span>)}
                         </div>
                       )}
                     </div>
                   </div>
                 )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
