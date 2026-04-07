import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BrainCircuit, ShieldCheck, BarChart3, Users,
  ChevronRight, BookOpen, Target, Layers, Zap, GraduationCap,
  PlayCircle, Sparkles, Award, Globe2, Building2, Briefcase, TrendingUp, Presentation, CheckCircle2, Languages
} from 'lucide-react';
import { Highlight, Check, Pillar, SmallFeature, ProductCard, PersonaPanel } from './SchoolsPage';

// ─── Main Component ────────────────────────────────────────────────────────────
export const LanguageSchoolsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 overflow-x-hidden selection:bg-[#9b276c]/20 flex flex-col">
      
      {/* Background base gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] bg-pink-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[40vw] h-[40vw] bg-orange-100/40 rounded-full blur-[120px]" />
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
          Partner Sign-Up <ChevronRight size={14} />
        </button>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-16 lg:py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div className="col-span-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-center text-center lg:text-left z-10 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full text-xs font-black text-pink-600 uppercase tracking-[0.2em] mb-8 mx-auto lg:mx-0 shadow-sm"
            >
              <Languages size={14} /> For Language Schools
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-5xl lg:text-[64px] font-black tracking-tighter text-slate-900 leading-[1.05] mb-8"
            >
              Precision Placement &<br/>
              Exit <Highlight>Exams.</Highlight>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-lg text-slate-600 leading-relaxed font-medium mb-10 max-w-xl mx-auto lg:mx-0"
            >
              Automatically place incoming English learners into the exact right course level on day one. Deliver branded, high-stakes summative certificates at graduation.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start w-full"
            >
              <button
                onClick={onBack}
                className="bg-pink-600 hover:bg-pink-700 text-white font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                Become a Partner <ChevronRight size={16} />
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            className="col-span-1 lg:col-span-6 xl:col-span-7 relative w-full h-[400px] lg:h-[600px] xl:h-[650px]"
          >
            <div className="relative w-full h-full rounded-[48px] overflow-hidden shadow-2xl shadow-pink-900/10 border-[8px] border-white z-10">
              <img
                src="https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1400&auto=format&fit=crop&q=80"
                alt="Language school students studying"
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
                <Target size={24} className="text-slate-900" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">CEFR Aligned</div>
                <div className="text-lg font-black text-slate-900">A1 to C2 Diagnostic</div>
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
              A Complete Assessment Suite
            </h2>
            <p className="text-slate-500 font-medium text-lg">
              Language academies need reliable tools that handle high enrollment spikes without compromising on the depth of the initial diagnostic.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Pillar icon={<Zap size={26} />} title="Instant Level Matching" desc="Incoming students take a quick adaptive test linking their score instantly into your CRM and class placement rosters." />
            <Pillar icon={<Award size={26} />} title="White-Label Certification" desc="Wrap our assessment engine inside your brand. Deliver final CEFR exit certificates carrying your academy’s logo." />
            <Pillar icon={<BarChart3 size={26} />} title="Progress Tracking" desc="Run periodic assessments measuring specific functional grammar and vocabulary acquisition to prove ROI to learners." />
            <Pillar icon={<ShieldCheck size={26} />} title="Online Proctoring" desc="Remote students attempting placement tests at home are monitored via lightweight AI ensuring validity." />
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
                src="https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?w=1200&auto=format&fit=crop&q=80"
                alt="International students learning English"
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/20 to-transparent" />
            </motion.div>
            <div className="lg:w-1/2 p-10 xl:p-16 flex flex-col justify-center w-full">
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <div className="text-xs font-black text-pink-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} /> Brand Autonomy
                </div>
                <h2 className="text-3xl xl:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                  Your Academy,<br />
                  <span className="text-pink-600">Your Identity.</span>
                </h2>
                <div className="h-1 w-12 bg-pink-600 rounded-full mb-8" />
                <ul className="space-y-4 mb-10">
                  <Check>Fully white-labeled testing environments keeping students within your educational ecosystem.</Check>
                  <Check>Customize score reports to map to your specific internal course-level terminology (e.g. "Advanced Level 4").</Check>
                  <Check>Eliminate costly paper-and-pen entrance level-checks during chaotic physical enrollment days.</Check>
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
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-pink-600/20 to-transparent pointer-events-none" />
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative z-10">
                <div className="text-xs font-black text-white/50 uppercase tracking-[0.25em] mb-4">EFL/ESL Programs</div>
                <h2 className="text-3xl lg:text-[40px] font-black tracking-tight leading-tight mb-6">
                  Scale Enrollment Checks<br/>Globally
                </h2>
                <div className="flex flex-col gap-3 w-full max-w-md">
                  {[
                    { label: "Agency Link Referrals", icon: <Globe2 size={18} /> },
                    { label: "Integrated Speaking & Writing", icon: <CheckCircle2 size={18} /> },
                    { label: "Mass Intake Roster Updates", icon: <BarChart3 size={18} /> },
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
              <img src="https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1200&auto=format&fit=crop&q=80" alt="Students taking notes" className="absolute inset-0 w-full h-full object-cover object-center" referrerPolicy="no-referrer" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CARDS & PERSONAS ─────────────────────────────────────────────────── */}
      <section className="py-24 relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">The ESL Toolkit</h2>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-[1200px] mx-auto mb-32">
            <ProductCard label="Quick Intake" title="Placement Test" desc="A short adaptive reading and listening module designed purely to group students rapidly into A1-C1 course tiers." onClick={onBack} />
            <ProductCard label="Course Graduation" title="Exit Certificate" desc="High-stakes, 4-skill summative assessment issuing white-labeled certificates validating course completion CEFR standards." onClick={onBack} />
            <ProductCard label="Young Learners" title="Junior Track" desc="Age-appropriate prompts and visual vocabulary designed specifically for assessing primary and middle-school English academies." onClick={onBack} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-[1200px] mx-auto items-stretch">
            <PersonaPanel role="Director of Studies" name="Curriculum Head" image="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&auto=format&fit=crop&q=80" quote="Before b4skills, our core teachers spent the entire first week of summer camp manually speaking with new arrivals. Now, it's fully automated." points={["Saves instructor payroll hours", "Objective, defensible placements", "Real-time class balancing"]} gradient="from-pink-600 to-rose-700" />
            <PersonaPanel role="Agency Partner" name="Recruiters" image="https://images.unsplash.com/photo-1558222218-b7b54eede3f3?w=800&auto=format&fit=crop&q=80" quote="I send a single test link out to agents in Brazil. Before the student even books their flight to our school, their CEFR level is registered." points={["Pre-arrival testing globally", "Custom URL query tracking", "Zero setup required abroad"]} gradient="from-slate-600 to-slate-800" />
            <PersonaPanel role="Adult Learner" name="Students" image="https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800&auto=format&fit=crop&q=80" quote="Taking my placement test on my smartphone perfectly framed how modern this language school runs compared to outdated competitors." points={["Mobile-optimized exams", "No software downloads needed", "Instant result gratification"]} gradient="from-orange-500 to-amber-700" />
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden bg-slate-950 w-full mt-auto">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10 w-full">
          <h2 className="text-5xl lg:text-6xl font-black text-white tracking-tight mb-8">Ready to Elevate Your<br/>Academy's Standards?</h2>
          <div className="flex justify-center w-full max-w-sm mx-auto whitespace-nowrap">
            <button onClick={onBack} className="bg-pink-600 hover:bg-pink-700 text-white font-black text-sm uppercase tracking-widest px-10 py-5 rounded-2xl transition-all shadow-xl hover:-translate-y-1">Start Partnership</button>
          </div>
        </div>
      </section>
      <footer className="py-10 bg-slate-950 border-t border-white/10 text-center relative z-10 w-full">
        <p className="text-slate-500 text-sm font-medium">© {new Date().getFullYear()} b4skills Inc. — Transforming Educational Assessment.</p>
      </footer>
    </div>
  );
};
