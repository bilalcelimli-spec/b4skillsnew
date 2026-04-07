import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BrainCircuit, ShieldCheck, BarChart3, Users,
  ChevronRight, BookOpen, Target, Layers, Zap, GraduationCap,
  PlayCircle, Sparkles, Award, Globe2, Building2, Briefcase, TrendingUp, CheckCircle2
} from 'lucide-react';
import { Highlight, Check, Pillar, SmallFeature, ProductCard, PersonaPanel } from './SchoolsPage';

// ─── Main Component ────────────────────────────────────────────────────────────
export const CorporatePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 overflow-x-hidden selection:bg-[#9b276c]/20 flex flex-col">
      
      {/* Background base gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] bg-emerald-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[40vw] h-[40vw] bg-blue-100/40 rounded-full blur-[120px]" />
      </div>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.03)] py-4 px-6 md:px-12 flex justify-between items-center transition-all">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black text-sm uppercase tracking-wider transition-colors group bg-white/50 px-4 py-2 rounded-xl"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
        </button>
        <div className="bg-gradient-to-r from-[#9b276c] to-[#c73289] text-white font-bold text-xl px-4 py-1.5 -skew-x-6 rounded-lg tracking-tight flex items-center shadow-lg shadow-[#9b276c]/20">
          <span style={{ textShadow: '0 0 12px rgba(255,255,255,0.4)' }}>b4skills</span>
        </div>
        <button
          onClick={onBack}
          className="hidden md:flex items-center gap-2 bg-slate-900 hover:bg-[#9b276c] text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-xl hover:-translate-y-0.5"
        >
          Contact Enterprise Sales <ChevronRight size={14} />
        </button>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-16 lg:py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div className="col-span-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-center text-center lg:text-left z-10 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-8 mx-auto lg:mx-0 shadow-sm"
            >
              <Briefcase size={14} /> Corporate Solutions
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-5xl lg:text-[64px] font-black tracking-tighter text-slate-900 leading-[1.05] mb-8"
            >
              Hire & Develop<br/>
              Global<br/>
              <Highlight>Talent.</Highlight>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-lg text-slate-600 leading-relaxed font-medium mb-10 max-w-xl mx-auto lg:mx-0"
            >
              AI-powered English language evaluations for high-volume recruitment, BPO screening, and data-driven corporate learning & development tracking.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start w-full"
            >
              <button
                onClick={onBack}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                Book a Demo <ChevronRight size={16} />
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            className="col-span-1 lg:col-span-6 xl:col-span-7 relative w-full h-[400px] lg:h-[600px] xl:h-[650px]"
          >
            <div className="relative w-full h-full rounded-[48px] overflow-hidden shadow-2xl shadow-emerald-900/10 border-[8px] border-white z-10">
              <img
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1400&auto=format&fit=crop&q=80"
                alt="Corporate office meeting"
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/40 via-transparent to-transparent" />
            </div>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
              className="absolute -bottom-6 -left-6 lg:-left-12 z-20 bg-white p-5 rounded-[24px] shadow-2xl border border-slate-100 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <TrendingUp size={24} className="text-slate-900" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Scale</div>
                <div className="text-lg font-black text-slate-900">Bulk Shortlisting</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FOUR PILLARS ─────────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 relative z-10 w-full overflow-hidden">
        <div className="absolute inset-0 bg-white" style={{ clipPath: 'polygon(0 5%, 100% 0, 100% 95%, 0 100%)' }} />
        <div className="max-w-7xl mx-auto px-6 relative z-10 py-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
              Enterprise Grade Assessment
            </h2>
            <p className="text-slate-500 font-medium text-lg">
              Optimise hiring funnels, measure ROI on corporate training, and make confident HR decisions grounded in objective psychometric data.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Pillar icon={<Zap size={26} />} title="Rapid Talent Screening" desc="Screen thousands of candidates automatically in under 15 minutes per applicant using adaptive logic." />
            <Pillar icon={<Users size={26} />} title="Bias-Free Recruitment" desc="Remove subjective human interview bias. Candidates are assessed purely on language competency, aligned to custom CEFR cut-scores." />
            <Pillar icon={<Building2 size={26} />} title="Role-Specific Context" desc="Select tailored business vocabulary tracks (sales, engineering, customer service) to test functional, contextualized English." />
            <Pillar icon={<Layers size={26} />} title="Core ATS Integrations" desc="Automatically invite, test, and push results back into Workday, Greenhouse, Lever, and standard HRMS flow." />
          </div>
        </div>
      </section>

      {/* ── SPLIT SECTION ────────────────────────────────────────────────────── */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-[48px] overflow-hidden shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col lg:flex-row w-full h-auto min-h-[500px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              className="lg:w-1/2 relative min-h-[400px] lg:min-h-[600px] w-full"
            >
              <img
                src="https://images.unsplash.com/photo-1556761175-5973e8876c1a?w=1200&auto=format&fit=crop&q=80"
                alt="Corporate learning and development"
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/20 to-transparent" />
            </motion.div>
            <div className="lg:w-1/2 p-10 xl:p-16 flex flex-col justify-center w-full">
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <div className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} /> Measure What Matters
                </div>
                <h2 className="text-3xl xl:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                  Real Business Impact<br />
                  <span className="text-emerald-600">Calculated Precisely.</span>
                </h2>
                <div className="h-1 w-12 bg-emerald-600 rounded-full mb-8" />
                <ul className="space-y-4 mb-10">
                  <Check>Demonstrate absolute ROI to board stakeholders on corporate English language training budgets via clear before/after analytics.</Check>
                  <Check>Cut down costly internal technical and HR recruiter time spent verifying candidate communication abilities during screening stages.</Check>
                  <Check>Deploy customized BPO speaking tests assessing clarity, fluency, and business readiness for global contact centers operations.</Check>
                </ul>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PORTFOLIO ────────────────────────────────────────────────────────── */}
      <section className="py-16 relative z-10 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="bg-slate-900 text-white rounded-[48px] overflow-hidden shadow-2xl flex flex-col-reverse lg:flex-row w-full min-h-[500px]">
            <div className="lg:w-1/2 p-10 xl:p-16 flex flex-col justify-center relative w-full">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-600/20 to-transparent pointer-events-none" />
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative z-10">
                <div className="text-xs font-black text-white/50 uppercase tracking-[0.25em] mb-4">Enterprise Portfolio</div>
                <h2 className="text-3xl lg:text-[40px] font-black tracking-tight leading-tight mb-6">
                  Holistic Assessment for<br/>Your Global Workforce
                </h2>
                <div className="flex flex-col gap-3 w-full max-w-md">
                  {[
                    { label: "Talent Acquisition Funnels", icon: <Globe2 size={18} /> },
                    { label: "BPO Candidate Voice Analysis", icon: <CheckCircle2 size={18} /> },
                    { label: "L&D Pre/Post Benchmarking", icon: <BarChart3 size={18} /> },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between w-full bg-white/10 border border-white/10 p-4 rounded-2xl">
                      <div className="flex items-center gap-4 font-bold text-white">
                        <div className="bg-white/10 p-2 rounded-xl text-white">{item.icon}</div>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="lg:w-1/2 relative min-h-[300px] lg:min-h-full w-full">
              <img src="https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=1200&auto=format&fit=crop&q=80" alt="Group of diverse professionals" className="absolute inset-0 w-full h-full object-cover object-center" referrerPolicy="no-referrer" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CARDS & PERSONAS ─────────────────────────────────────────────────── */}
      <section className="py-24 relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">The Corporate Suite</h2>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-[1200px] mx-auto mb-32">
            <ProductCard label="Volume Hiring" title="Fast Screen (15m)" desc="Lightning-fast adaptive diagnostic separating proficient from unqualified candidates immediately via ATS URL triggers." onClick={onBack} />
            <ProductCard label="Contact Centers" title="BPO Oral Analysis" desc="Deep-dive speaking verification assessing intelligibility, fluency, and business vocabulary usage accurately using AI." onClick={onBack} />
            <ProductCard label="Executive Hires" title="Full Business Suite" desc="Complete 4-skills holistic workplace English assessment tailored for senior management level cross-border roles." onClick={onBack} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-[1200px] mx-auto items-stretch">
            <PersonaPanel role="Talent Acquisition" name="HR Recruiters" image="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&auto=format&fit=crop&q=80" quote="We screen 4,000 applicants quarterly. b4skills cut our language-test cost per candidate by 68% while improving selection quality." points={["Data pipelines integrated with ATS", "Reduces internal interview time", "Bias-free, metric-driven evaluation"]} gradient="from-emerald-600 to-teal-700" />
            <PersonaPanel role="L&D Director" name="L&D Directors" image="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&auto=format&fit=crop&q=80" quote="We finally have hard data to take to the CFO. We can show exactly which teams improved and by how much, validating our training spend." points={["Aggregated department-level views", "Pre vs Post intervention analysis", "Custom cut-score policy implementation"]} gradient="from-slate-600 to-slate-800" />
            <PersonaPanel role="Job Applicant" name="Candidates" image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80" quote="The process felt highly professional taking a test branded by the company. It respected my time and highlighted real workplace scenarios." points={["Any-device, seamless application access", "Relevant business case questions", "Transparent, immediate outcome paths"]} gradient="from-cyan-600 to-blue-700" />
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden bg-slate-950 w-full mt-auto">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10 w-full">
          <h2 className="text-5xl lg:text-6xl font-black text-white tracking-tight mb-8">Modernize Your Recruitment<br/>With Deep Insights</h2>
          <div className="flex justify-center w-full max-w-sm mx-auto whitespace-nowrap">
            <button onClick={onBack} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest px-10 py-5 rounded-2xl transition-all shadow-xl hover:-translate-y-1">Request Enterprise Demo</button>
          </div>
        </div>
      </section>
      <footer className="py-10 bg-slate-950 border-t border-white/10 text-center relative z-10 w-full">
        <p className="text-slate-500 text-sm font-medium">© {new Date().getFullYear()} b4skills Inc. — Transforming Educational Assessment.</p>
      </footer>
    </div>
  );
};
