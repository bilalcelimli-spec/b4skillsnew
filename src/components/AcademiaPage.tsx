import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BrainCircuit, ShieldCheck, BarChart3, Users,
  ChevronRight, BookOpen, Target, Layers, Zap, GraduationCap,
  PlayCircle, Sparkles, Award, Globe2, Building2, Library
} from 'lucide-react';
import { Highlight, Check, Pillar, SmallFeature, ProductCard, PersonaPanel } from './SchoolsPage';

// ─── Main Component ────────────────────────────────────────────────────────────
export const AcademiaPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 overflow-x-hidden selection:bg-[#9b276c]/20 flex flex-col">
      
      {/* Background base gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] bg-rose-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[40vw] h-[40vw] bg-purple-100/40 rounded-full blur-[120px]" />
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
          Speak to Academia Sales <ChevronRight size={14} />
        </button>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-16 lg:py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div className="col-span-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-center text-center lg:text-left z-10 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full text-xs font-black text-[#9b276c] uppercase tracking-[0.2em] mb-8 mx-auto lg:mx-0 shadow-sm"
            >
              <Library size={14} /> b4skills for Universities
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-5xl lg:text-[64px] font-black tracking-tighter text-slate-900 leading-[1.05] mb-8"
            >
              Academic Integrity.<br/>
              Validated<br/>
              <Highlight>At Scale.</Highlight>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-lg text-slate-600 leading-relaxed font-medium mb-10 max-w-xl mx-auto lg:mx-0"
            >
              Secure, rigorous, and reliable English language testing built specifically for university admissions, internal placement, and graduate exit benchmarking.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start w-full"
            >
              <button
                onClick={onBack}
                className="bg-slate-900 hover:bg-[#9b276c] text-white font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                Request Pilot <ChevronRight size={16} />
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            className="col-span-1 lg:col-span-6 xl:col-span-7 relative w-full h-[400px] lg:h-[600px] xl:h-[650px]"
          >
            <div className="relative w-full h-full rounded-[48px] overflow-hidden shadow-2xl shadow-slate-900/10 border-[8px] border-white z-10">
              <img
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1400&auto=format&fit=crop&q=80"
                alt="University students on campus"
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/40 via-transparent to-transparent" />
            </div>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
              className="absolute -bottom-6 -left-6 lg:-left-12 z-20 bg-white p-5 rounded-[24px] shadow-2xl border border-slate-100 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Globe2 size={24} className="text-blue-600" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Framework</div>
                <div className="text-lg font-black text-slate-900">CEFR & GSE Mapped</div>
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
              Uncompromising Standards<br />for Higher Education
            </h2>
            <p className="text-slate-500 font-medium text-lg">
              We fuse cutting-edge Item Response Theory with seamless architectural delivery, ensuring validity and reliability.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Pillar icon={<BrainCircuit size={26} />} title="Validated Psychometrics" desc="Our CAT engine prevents item exposure and precisely identifies capability far faster than flat linear testing." />
            <Pillar icon={<ShieldCheck size={26} />} title="Proctored Security" desc="Optional live monitoring, browser lockdown, and AI-powered anomaly detection for remote high-stakes testing." />
            <Pillar icon={<Layers size={26} />} title="Seamless LTI Integration" desc="Connect instantly to Blackboard, Canvas, or Moodle via standard LTI 1.3 integration." />
            <Pillar icon={<BarChart3 size={26} />} title="Advanced Cohort Analytics" desc="Drill down into faculty-wide data, track longitudinal progress, and export to institutional data warehouses." />
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
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80"
                alt="University library study session"
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/20 to-transparent" />
            </motion.div>
            <div className="lg:w-1/2 p-10 xl:p-16 flex flex-col justify-center w-full">
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <div className="text-xs font-black text-[#9b276c] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} /> Research Backed
                </div>
                <h2 className="text-3xl xl:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                  Validity Meets<br />
                  <span className="text-[#9b276c]">Modern Assessment.</span>
                </h2>
                <div className="h-1 w-12 bg-[#9b276c] rounded-full mb-8" />
                <ul className="space-y-4 mb-10">
                  <Check>Cut operational bottlenecks associated with manual placements. Full cohorts assessed in under an hour.</Check>
                  <Check>Align with international admissions standards. Ensure your applicants possess the requisite skills to thrive.</Check>
                  <Check>Our proprietary AI speaking evaluation mimics human raters with exceptional Pearson correlation coefficients.</Check>
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
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#9b276c]/20 to-transparent pointer-events-none" />
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative z-10">
                <div className="text-xs font-black text-white/50 uppercase tracking-[0.25em] mb-4">Academia Portfolio</div>
                <h2 className="text-3xl lg:text-[40px] font-black tracking-tight leading-tight mb-6">
                  Scalable Solutions for<br/>Every Faculty Need
                </h2>
                <div className="flex flex-col gap-3 w-full max-w-md">
                  {[
                    { label: "Global Admissions Testing", icon: <Globe2 size={18} /> },
                    { label: "Pre-Sessional Tracking", icon: <Building2 size={18} /> },
                    { label: "Graduate Exit Benchmarking", icon: <Award size={18} /> },
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
              <img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&auto=format&fit=crop&q=80" alt="Student researching" className="absolute inset-0 w-full h-full object-cover object-center" referrerPolicy="no-referrer" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CARDS & PERSONAS ─────────────────────────────────────────────────── */}
      <section className="py-24 relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">The Academic Suite</h2>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-[1200px] mx-auto mb-32">
            <ProductCard label="International Admissions" title="b4skills Secure" desc="End-to-end proctored assessment verifying reading, listening, writing and spoken English production remotely." onClick={onBack} />
            <ProductCard label="Internal Grouping" title="Faculty Placement" desc="Rapid 25-minute CAT test to confidently drop arriving students into the correct pre-sessional language support tier." onClick={onBack} />
            <ProductCard label="Quality Assurance" title="Exit Exam Module" desc="Data-rich concluding assessment proving pedagogical efficacy and providing students an exit credential." onClick={onBack} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-[1200px] mx-auto items-stretch">
            <PersonaPanel role="Admissions Officer" name="Admissions Teams" image="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80" quote="We replaced three separate entrance tests with b4skills and halved our processing time without sacrificing validity." points={["No manual grading bottlenecks", "Assured security and anti-fraud", "Direct integration with student records"]} gradient="from-blue-600 to-indigo-700" />
            <PersonaPanel role="Language Faculty Head" name="Faculty Heads" image="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800&auto=format&fit=crop&q=80" quote="The nuanced gap analysis in the writing and speaking reports allows us to tailor pre-sessional focus perfectly." points={["Detailed multi-skill domain reporting", "Automated CEFR sub-skill breakdowns", "Longitudinal cohort tracking"]} gradient="from-emerald-600 to-teal-700" />
            <PersonaPanel role="University Student" name="Students" image="https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=800&auto=format&fit=crop&q=80" quote="The testing platform was incredibly smooth and straightforward. Getting my results clearly explained reduced all my anxiety." points={["Modern, distraction-free interface", "Transparent skill feedback", "Fair, adaptive questioning"]} gradient="from-purple-600 to-fuchsia-700" />
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden bg-slate-950 w-full mt-auto">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10 w-full">
          <h2 className="text-5xl lg:text-6xl font-black text-white tracking-tight mb-8">Modernize Your Faculty<br/>Assessments</h2>
          <div className="flex justify-center w-full max-w-sm mx-auto whitespace-nowrap">
            <button onClick={onBack} className="bg-[#9b276c] hover:bg-[#7e1f58] text-white font-black text-sm uppercase tracking-widest px-10 py-5 rounded-2xl transition-all shadow-xl hover:-translate-y-1">Request Institutional Pilot</button>
          </div>
        </div>
      </section>
      <footer className="py-10 bg-slate-950 border-t border-white/10 text-center relative z-10 w-full">
        <p className="text-slate-500 text-sm font-medium">© {new Date().getFullYear()} b4skills Inc. — Transforming Educational Assessment.</p>
      </footer>
    </div>
  );
};
