import React from 'react';
import { motion } from 'motion/react';
import { 
  Database, 
  Brain, 
  Shield, 
  Layers, 
  Activity, 
  Zap, 
  Lock, 
  Server,
  Cloud,
  Cpu
} from 'lucide-react';
import { GlassCard } from '../components/ui';

export default function Architecture() {
  return (
    <div className="container mx-auto px-6 py-20 pb-32">
      <div className="max-w-4xl mx-auto text-center mb-20">
        <h1 className="text-5xl font-extrabold font-display tracking-tight mb-6">
          AXON <span className="text-gradient">System Architecture</span>
        </h1>
        <p className="text-xl text-slate-400 font-light">
          AXON leverages a zero-trust neural orchestrator and multi-agent AI framework 
          to maintain data sovereignty and intelligence-driven healthcare connectivity.
        </p>
      </div>

      {/* Diagram Layout */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
        {/* Connection Lines (Visual Decor) */}
        <div className="hidden lg:block absolute top-1/2 left-1/4 right-1/4 h-px bg-linear-to-r from-transparent via-white/10 to-transparent -z-10" />
        
        <ArchBlock 
          icon={<Database className="w-8 h-8 text-brand-cyan" />}
          title="Data Layer"
          category="Storage & RLS"
          tech="Supabase PostgreSQL"
          description="Distributed database enforcing Row-Level Security (RLS) at the infrastructure level. Patient records are vaulted and accessible only via direct ownership or active consent tokens."
        />
        
        <ArchBlock 
          icon={<Brain className="w-8 h-8 text-brand-purple" />}
          title="AI Orchestrator"
          category="Intelligence"
          tech="Gemini 2.0 Multi-Agent"
          description="A multi-agent chain (Ingestion, Context, Risk, Medication, Summary) that transforms fragmented unstructured data into clinical executive insights."
          active
        />
        
        <ArchBlock 
          icon={<Shield className="w-8 h-8 text-emerald-400" />}
          title="Consent Engine"
          category="Privacy"
          tech="Ephemeral Auth Codes"
          description="A short-lived (15-min) token system for provider access. No permanent doctor-patient data link is established, ensuring true longitudinal privacy."
        />
      </div>

      {/* Deep Dive Sections */}
      <div className="space-y-24">
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-2 bg-brand-blue/10 rounded-lg">
              <Layers className="w-6 h-6 text-brand-blue" />
            </div>
            <h2 className="text-3xl font-bold">The Multi-Agent Workflow</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <FlowStep num="01" title="Ingest" desc="OCR/Text parsing into structured JSON schemas." />
            <FlowStep num="02" title="Context" desc="Building temporal health narratives." />
            <FlowStep num="03" title="Analyze" desc="Risk detection and pattern recognition." />
            <FlowStep num="04" title="Audit" desc="Safety-checking medications and interactions." />
            <FlowStep num="05" title="Distill" desc="Final clinician-ready clinical summary." />
          </div>
        </section>

        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Interoperability Layer</h2>
              <p className="text-slate-400 leading-relaxed">
                AXON is designed to act as a bridge between legacy EHRs and modern patient applications. 
                Using conceptual HL7/FHIR adapters, we normalize data into a unified identity-linked memory layer 
                that follows the patient across borders.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-300">
                  <Zap className="w-4 h-4 text-brand-cyan" /> Cloud-Native Architecture
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Lock className="w-4 h-4 text-brand-cyan" /> AES-256 Encryption at Rest
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Activity className="w-4 h-4 text-brand-cyan" /> Real-time Audit Instrumentation
                </li>
              </ul>
            </div>
            
            <GlassCard className="aspect-video flex items-center justify-center border-white/5 bg-slate-900/50">
              <div className="relative">
                <Server className="w-16 h-16 text-slate-700" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute inset-0 bg-brand-blue/20 blur-2xl rounded-full"
                />
              </div>
            </GlassCard>
          </div>
        </section>
      </div>
    </div>
  );
}

const ArchBlock = ({ icon, title, category, tech, description, active }: { 
  icon: React.ReactNode, 
  title: string, 
  category: string, 
  tech: string, 
  description: string, 
  active?: boolean 
}) => (
  <motion.div
    whileHover={{ y: -5 }}
    className={`glass-card p-8 flex flex-col gap-6 ${active ? 'border-brand-purple/30 bg-brand-purple/5' : ''}`}
  >
    <div className="p-4 bg-white/5 rounded-2xl w-fit shadow-inner">
      {icon}
    </div>
    <div>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{category}</span>
      <h3 className="text-2xl font-bold mt-1">{title}</h3>
      <div className="mt-2 inline-block px-2 py-1 bg-white/5 border border-white/5 rounded text-[10px] font-mono text-slate-300">
        {tech}
      </div>
    </div>
    <p className="text-sm text-slate-400 leading-relaxed font-light">
      {description}
    </p>
  </motion.div>
);

const FlowStep = ({ num, title, desc }: { num: string, title: string, desc: string }) => (
  <div className="p-6 glass-morphism bg-white/[0.02] border-white/5 hover:border-white/10 transition-colors">
    <div className="text-brand-cyan font-mono text-sm font-bold mb-4">{num}</div>
    <h4 className="font-bold mb-2">{title}</h4>
    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
  </div>
);
