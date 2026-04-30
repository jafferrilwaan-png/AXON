import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Shield, Brain, Zap, Clock, ClipboardList, ArrowRight, Github, Twitter, Linkedin } from 'lucide-react';
import { Button, GlassCard } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ThreeBackground } from '../components/ThreeBackground';

const Home = () => {
  // v1.0.1
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-transparent">
      <ThreeBackground />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-40">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[700px] h-[700px] bg-brand-blue/10 blur-[140px] rounded-full pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <Badge variant="info">Intelligence That Respects Your History</Badge>
            <h1 className="mt-8 text-7xl md:text-[9rem] font-sans font-extrabold tracking-tight leading-[0.9]">
              AXON <br />
              <span className="text-gradient text-4xl md:text-6xl block mt-6 font-display">Universal Health Memory.</span>
            </h1>
            <p className="mt-12 text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto font-light leading-relaxed">
              AXON connects your fragmented records into a single, intelligent vault 
              that stays with you forever. Your data. Your control. Secure and simple.
            </p>
            
            <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link to="/login?role=patient" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-20 px-14 text-xl shadow-[0_0_30px_rgba(52,144,220,0.3)] group uppercase tracking-widest">
                  Patient Portal
                  <ArrowRight className="ml-3 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/login?role=doctor" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full h-20 px-14 text-xl border-white/10 hover:bg-white/5 group uppercase tracking-widest">
                  Doctor Login
                  <ArrowRight className="ml-3 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-40 relative z-10 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-blue/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="container mx-auto px-6 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-32"
          >
            <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-6 uppercase">
              Beyond <span className="text-brand-blue">Silos</span>
            </h2>
            <div className="h-1 w-24 bg-brand-blue mx-auto mb-8 rounded-full" />
            <p className="text-slate-500 text-xl md:text-2xl font-light max-w-2xl mx-auto leading-relaxed">
              Democratizing health data ownership through neural patient-centric architecture.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <motion.div
               initial={{ opacity: 0, x: -50 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8, ease: "circOut" }}
            >
              <GlassCard className="h-full p-12 relative overflow-hidden group hover:border-brand-blue/40 transition-all duration-700 bg-white/[0.01]">
                <div className="absolute top-0 right-0 w-80 h-80 bg-brand-blue/10 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-brand-blue/20 transition-all duration-700" />
                <div className="relative z-10">
                  <div className="p-5 bg-brand-blue/10 w-fit rounded-3xl mb-10 border border-brand-blue/20 group-hover:scale-110 transition-transform duration-500">
                    <Activity className="w-14 h-14 text-brand-blue" />
                  </div>
                  <h3 className="text-4xl font-black text-white mb-8 tracking-tighter uppercase">Our Mission</h3>
                  <p className="text-slate-400 font-light text-xl leading-relaxed">
                    To democratize health data ownership by providing every individual with a <span className="text-white font-medium">permanent, cryptographic clinical registry</span>. We exist to eliminate the friction of fragmented healthcare, ensuring life-saving context is always instantly accessible.
                  </p>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, x: 50 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8, ease: "circOut" }}
            >
              <GlassCard className="h-full p-12 relative overflow-hidden group hover:border-brand-cyan/40 transition-all duration-700 bg-white/[0.01]">
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-cyan/10 rounded-full blur-[100px] -ml-40 -mb-40 group-hover:bg-brand-cyan/20 transition-all duration-700" />
                <div className="relative z-10">
                  <div className="p-5 bg-brand-cyan/10 w-fit rounded-3xl mb-10 border border-brand-cyan/20 group-hover:scale-110 transition-transform duration-500">
                    <Zap className="w-14 h-14 text-brand-cyan" />
                  </div>
                  <h3 className="text-4xl font-black text-white mb-8 tracking-tighter uppercase">Our Vision</h3>
                  <p className="text-slate-400 font-light text-xl leading-relaxed">
                    A future where <span className="text-white font-medium">medical errors caused by missing data</span> are completely eradicated. We envision a globally interoperable neural layer—AXON—that fluidly translates the world's EHR silos into a single source of truth.
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          <div className="flex justify-center mt-32">
            <motion.div 
               animate={{ y: [0, 10, 0] }}
               transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
               className="w-px h-32 bg-linear-to-b from-brand-blue/50 via-brand-cyan/30 to-transparent"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-32">
            <ProblemCard 
              icon={<Shield className="w-10 h-10 text-brand-blue" />}
              title="Doctor's Key"
              description="Doctors only access your vault when you provide a 6-digit Doctor's Key. Access is temporary and fully auditable."
            />
            <ProblemCard 
              icon={<Brain className="w-10 h-10 text-brand-purple" />}
              title="My Health Vault"
              description="A permanent, clinical-grade profile that follows you from birth. No more lost records or repeated tests."
            />
            <ProblemCard 
              icon={<Activity className="w-10 h-10 text-brand-cyan" />}
              title="Intelligence Brief"
              description="Our AI agents synthesize years of clinical history into high-fidelity briefs for point-of-care efficiency."
            />
          </div>
        </div>
      </section>

      {/* KPI / Performance Stats Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <KpiItem 
              value="94%" 
              label="Medical Error Reduction" 
              sub="AI-Preemptive Validation"
            />
            <KpiItem 
              value="< 12s" 
              label="Data Synapse Speed" 
              sub="Sub-second retrieval"
            />
            <KpiItem 
              value="5.8M" 
              label="Secured Health Nodes" 
              sub="Encrypted clinical records"
            />
            <KpiItem 
              value="100%" 
              label="Patient Ownership" 
              sub="Zero-trust architecture"
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-4xl font-bold">Futuristic Health Memory</h2>
            <p className="text-slate-400 mt-4">AXON transmits information intelligently across the care continuum.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Brain className="w-6 h-6 text-brand-purple" />}
              title="AXON Intelligence Engine"
              description="Proprietary agency layer summarizing fragmented health data into actionable clinician briefs."
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6 text-brand-blue" />}
              title="Ephemeral Vault Codes"
              description="Grant doctors 15-minute read access to your clinical vault. You own the private key."
            />
            <FeatureCard 
              icon={<Clock className="w-6 h-6 text-emerald-400" />}
              title="Clinical Baseline"
              description="Calculated Health Vitality Score based on chronic data and activity vectors."
            />
            <FeatureCard 
              icon={<Activity className="w-6 h-6 text-brand-cyan" />}
              title="Neural Connectivity"
              description="Seamless data flow between disparate EHR systems normalized into JSON schemas."
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-amber-400" />}
              title="Point-of-Care Recovery"
              description="Instant retrieval of medication interaction risks during critical care encounters."
            />
            <FeatureCard 
              icon={<ClipboardList className="w-6 h-6 text-slate-400" />}
              title="Immutable Audit Trail"
              description="Blockchain-inspired logs of every access attempt and record modification."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-slate-950/40">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <motion.img 
               src="https://i.ibb.co/Cpsv0qY7/73024ef0-7fe4-4884-96b1-58af0a49ff7c.png" 
               alt="AXON Logo" 
               className="w-[90px] md:w-[120px] object-contain" 
               whileHover={{ scale: 1.05 }}
            />
          </div>
          
          <div className="flex gap-8 text-sm text-slate-500 font-medium">
            <Link to="/architecture" className="hover:text-white">Architecture</Link>
            <a href="#" className="hover:text-white">Privacy Protocol</a>
            <a href="#" className="hover:text-white">Terms of Entry</a>
          </div>
          
          <div className="flex gap-4">
            <Twitter className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer" />
            <Linkedin className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer" />
            <Github className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer" />
          </div>
        </div>
        <div className="container mx-auto px-6 mt-8 text-center text-xs text-slate-600">
          © 2026 AXON. All rights reserved. Intelligent health data connectivity system.
        </div>
      </footer>
    </div>
  );
};

const ProblemCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <GlassCard className="flex flex-col gap-4 border-none bg-white/[0.02]">
    <div className="p-3 bg-white/5 w-fit rounded-2xl">{icon}</div>
    <h3 className="text-xl font-bold">{title}</h3>
    <p className="text-slate-400 font-light">{description}</p>
  </GlassCard>
);

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <GlassCard className="group">
    <div className="flex items-start gap-4">
      <div className="mt-1 p-2 bg-white/5 rounded-lg group-hover:bg-brand-blue/10 transition-colors">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-lg">{title}</h4>
        <p className="text-slate-400 mt-2 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  </GlassCard>
);

const Badge = ({ children, variant = 'info' }: { children: React.ReactNode, variant?: 'info' }) => (
  <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-brand-blue/10 text-brand-blue border border-brand-blue/20 inline-block mb-4">
    {children}
  </span>
);

const KpiItem = ({ value, label, sub }: { value: string, label: string, sub: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="text-center group"
  >
    <div className="text-4xl md:text-5xl font-black text-white mb-2 font-sans tracking-tighter group-hover:text-brand-blue transition-colors duration-500">
      {value}
    </div>
    <div className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-1">
      {label}
    </div>
    <div className="text-xs text-slate-500 font-light">
      {sub}
    </div>
  </motion.div>
);

export default Home;
