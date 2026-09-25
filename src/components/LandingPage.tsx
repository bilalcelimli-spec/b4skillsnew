import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FreemiumTestWidget } from "./FreemiumTestWidget";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";
import { Check, ChevronRight, BrainCircuit, Target, Lightbulb, FileCheck2, Activity, Brain, BarChart, Zap, ArrowRight, Quote, ShieldCheck } from "lucide-react";
import { cn } from "../lib/utils";

// Marker highlight component
const Highlight = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("relative inline-block whitespace-nowrap mx-1", className)}>
    <span className="absolute inset-y-1 -inset-x-2 bg-[#9b276c] -skew-x-[12deg] -z-10 rounded-sm" />
    <span className="relative z-10 text-white">{children}</span>
  </span>
);

export const LandingPage: React.FC<{ onStart: () => void, onCodeEntry?: () => void }> = ({ onStart, onCodeEntry }) => {
  const [showFreemiumTest, setShowFreemiumTest] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-800 overflow-x-hidden">
      {/* Freemium Test Widget Overlay */}
      <AnimatePresence>
        {showFreemiumTest && (
          <FreemiumTestWidget
            onClose={() => setShowFreemiumTest(false)}
            onSignup={() => { setShowFreemiumTest(false); onStart(); }}
          />
        )}
      </AnimatePresence>
      {/* ─── NAVBAR ─── */}
      <SiteNav onStart={onStart} onCodeEntry={onCodeEntry} />

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
        <div className="lg:w-1/2 z-10 relative">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="text-5xl lg:text-6xl font-bold leading-[1.1] text-slate-900 tracking-tight"
          >
            Secure Online <Highlight>Testing</Highlight><br />
            & Assessment Platform
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-8 text-lg lg:text-xl text-slate-600 max-w-lg leading-relaxed"
          >
            b4skills offers innovative English assessment solutions powered by IRT psychometrics and Gemini AI in a secure environment. For universities, schools, and global enterprises.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-10"
          >
            <p className="text-sm font-bold tracking-wide text-slate-400 mb-6">We specialize in English assessments.</p>
            <div className="flex flex-wrap gap-4">
              <a href="/schools" className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm px-5 py-3 rounded-full text-sm font-bold text-slate-700 transition-transform hover:-translate-y-0.5">
                For Schools <div className="bg-purple-600 text-white rounded-full p-1"><ChevronRight size={14}/></div>
              </a>
              <a href="/academia" className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm px-5 py-3 rounded-full text-sm font-bold text-slate-700 transition-transform hover:-translate-y-0.5">
                Academic <div className="bg-blue-600 text-white rounded-full p-1"><ChevronRight size={14}/></div>
              </a>
              <a href="/corporate" className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm px-5 py-3 rounded-full text-sm font-bold text-slate-700 transition-transform hover:-translate-y-0.5">
                Corporate Solutions <div className="bg-slate-900 text-white rounded-full p-1"><ChevronRight size={14}/></div>
              </a>
            </div>

            {/* Free placement test CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 flex items-center gap-4"
            >
              <button
                onClick={() => setShowFreemiumTest(true)}
                className="flex items-center gap-3 bg-[#9b276c] hover:bg-[#7d1f57] text-white px-6 py-3.5 rounded-full text-sm font-bold shadow-lg shadow-[#9b276c]/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#9b276c]/40"
              >
                <Zap size={16} />
                Test Your Level — Free
              </button>
              <span className="text-xs text-slate-400 font-medium">~25 min · No account needed · A1–C2</span>
            </motion.div>
          </motion.div>
        </div>

        {/* Hero Background Image */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}
          className="lg:w-1/2 w-full relative pl-0 lg:pl-10"
        >
          <div className="aspect-[4/3] w-full rounded-[2.5rem] overflow-hidden relative shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/20 to-transparent z-10" />
            <img 
              src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
              alt="Student tracking assessment" 
              className="w-full h-full object-cover"
            />
          </div>
          {/* Floating badge */}
          <div className="absolute -bottom-6 -left-2 bg-white p-5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4 z-20">
            <div className="w-12 h-12 bg-[#ae397d] rounded-full flex items-center justify-center text-white">
              <Check size={24} strokeWidth={3} />
            </div>
            <div>
              <div className="font-bold text-slate-900">CEFR Certified</div>
              <div className="text-sm text-slate-500">A1 through C2 levels</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── TRUSTED BY ─── */}
      <section className="py-14 bg-white border-y border-slate-100" id="partners">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-8">
            Trusted by institutions & pilot partners
          </p>
          {/* Logo strip — SVG wordmarks so no external image dependency */}
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60">
            {[
              { label: "Ankara Bilim Üniversitesi", abbr: "ABÜ" },
              { label: "Istanbul Tech Language Centre", abbr: "ITLC" },
              { label: "Global HR Solutions", abbr: "GHR" },
              { label: "EduCorp Training", abbr: "EDU" },
              { label: "Language Academy Istanbul", abbr: "LAI" },
              { label: "İTÜ Language School", abbr: "İTÜ" },
            ].map(({ label, abbr }) => (
              <div key={abbr} className="flex items-center gap-2 text-slate-500" title={label}>
                <span className="flex items-center justify-center w-8 h-8 rounded bg-slate-100 text-[10px] font-black text-slate-600">{abbr}</span>
                <span className="text-sm font-semibold hidden sm:block">{label}</span>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "b4skills cut our placement testing time by 60%. The CEFR-mapped reports are exactly what our academic board needs.",
                name: "Dr. Ayşe K.",
                role: "Director of Language Programs",
                org: "Pilot University Partner",
              },
              {
                quote: "Our HR team uses the Corporate track for pre-hire English screening. The adaptive engine is genuinely impressive — no two sessions look the same.",
                name: "Mehmet D.",
                role: "Talent Acquisition Lead",
                org: "Enterprise Pilot Partner",
              },
              {
                quote: "The AI scoring on writing tasks is fast and consistent. It's freed our examiners to focus on edge cases and appeals.",
                name: "Sarah L.",
                role: "Chief Examiner",
                org: "Language School Pilot",
              },
            ].map(({ quote, name, role, org }) => (
              <figure key={name} className="bg-slate-50 rounded-2xl p-6 flex flex-col gap-4">
                <Quote size={20} className="text-[#9b276c]/40 flex-shrink-0" />
                <blockquote className="text-slate-700 text-sm leading-relaxed flex-grow">"{quote}"</blockquote>
                <figcaption>
                  <p className="text-sm font-bold text-slate-900">{name}</p>
                  <p className="text-xs text-slate-500">{role} · <span className="italic">{org}</span></p>
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <a
              href="/verify"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#9b276c] transition-colors"
            >
              <ShieldCheck size={14} />
              Verify a certificate issued by b4skills →
            </a>
          </div>
        </div>
      </section>

      {/* ─── FREE PLACEMENT TEST SECTION ─── */}
      <section className="py-16 bg-gradient-to-br from-[#9b276c] to-[#7d1f57] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white rounded-full blur-2xl" />
        </div>
        <div className="max-w-4xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-white max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest mb-4">
              <Zap size={12} /> Free Level Test
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-3">
              Measure Your Exact English Level<br className="hidden md:block" /> with Adaptive IRT
            </h2>
            <p className="text-white/80 text-base leading-relaxed mb-4">
              No account needed. Our AI-powered adaptive engine serves the best questions from our certified item bank,
              personalised to your level in real time using IRT psychometrics.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-white/70 font-medium">
              {["✓ Completely free", "✓ CEFR A1–C2 scale", "✓ 10–30 adaptive questions", "✓ Instant results"].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={() => setShowFreemiumTest(true)}
              className="flex items-center gap-3 bg-white text-[#9b276c] font-black text-base px-8 py-4 rounded-2xl shadow-2xl hover:shadow-white/30 transition-all hover:-translate-y-1 hover:scale-105"
            >
              <Zap size={20} />
              Start Free Test
              <ArrowRight size={18} className="ml-1" />
            </button>
            <p className="text-white/50 text-xs text-center mt-3 font-medium">Takes about 20–30 minutes</p>
          </div>
        </div>
      </section>

      {/* ─── BENTO BOX FEATURES (Redesigned) ─── */}
      <section className="py-28 bg-slate-50 relative overflow-hidden" id="solutions">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#9b276c]/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-slate-900 leading-tight">
              Redefining Assessment with <br className="hidden md:block" />
              <Highlight className="mt-2">Adaptive Intelligence</Highlight>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
              We ditched static tests. b4skills combines real-time psychometric algorithms with robust multimodal AI to measure authentic English proficiency dynamically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: Adaptive Engine (Large) */}
            <div className="md:col-span-2 bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group hover:shadow-2xl hover:shadow-slate-300/60 transition-all duration-500">
              <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                <BrainCircuit size={280} />
              </div>
              <div className="w-14 h-14 bg-slate-900 text-[#9b276c] rounded-2xl flex items-center justify-center mb-8 shadow-md">
                <BrainCircuit size={28} />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-4 text-slate-900 pr-10">Dynamic IRT Calibration</h3>
              <p className="text-slate-600 leading-relaxed text-[17px] max-w-lg mb-8">
                Our engine recalculates candidate ability (θ) after every single interaction using the 3-Parameter Logistic model. The result? A highly precise CEFR level in a fraction of the time of traditional exams.
              </p>
              <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 tracking-wide uppercase border-b-2 border-[#9b276c] pb-0.5 group-hover:text-[#9b276c] transition-colors">
                Explore The Algorithm <ChevronRight size={16} />
              </div>
            </div>

            {/* Bento Card 2: Proctoring (Tall/Square) */}
            <div className="md:col-span-1 bg-slate-900 text-white rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-900/20 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#9b276c]/20 rounded-bl-full blur-2xl" />
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md text-[#9b276c] border border-white/10 rounded-2xl flex items-center justify-center mb-8">
                <Target size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-4 leading-tight">Zero-Trust<br/>Proctoring</h3>
              <p className="text-slate-300 leading-relaxed text-[15px] mb-8">
                Continuous webcam anomaly detection and structural tab-locking ensure your certifications remain globally credible and manipulation-free.
              </p>
              <div className="mt-auto flex items-center gap-3">
                <div className="flex -space-x-3">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-emerald-500 flex items-center justify-center"><Check size={14} className="text-emerald-900 stroke-[3]" /></div>
                  <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-emerald-500 flex items-center justify-center"><Check size={14} className="text-emerald-900 stroke-[3]" /></div>
                </div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">A.I. Audited</span>
              </div>
            </div>

            {/* Bento Card 3: Enterprise (Square) */}
            <div className="md:col-span-1 bg-[#9b276c] rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden group hover:bg-[#ae397d] transition-colors duration-500 flex flex-col justify-between">
              <div className="w-14 h-14 bg-slate-900 text-[#9b276c] rounded-2xl flex items-center justify-center mb-8 shadow-lg">
                <FileCheck2 size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 text-white">Multi-Tenant Scale</h3>
                <p className="text-slate-100 leading-relaxed font-medium text-[15px]">
                  Perfect for B2B. Custom branding, localized data isolation, and deep cohort analytics right out of the box.
                </p>
              </div>
            </div>

            {/* Bento Card 4: AI Scoring (Large) */}
            <div className="md:col-span-2 bg-indigo-50/50 rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-indigo-100/50 flex flex-col md:flex-row items-start md:items-center gap-10 group hover:shadow-indigo-100 transition-all duration-500">
              <div className="flex-1">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-8 shadow-md shadow-indigo-200">
                  <Lightbulb size={28} />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4 text-slate-900">Multimodal AI Scoring</h3>
                <p className="text-slate-600 leading-relaxed text-[17px]">
                  Powered by advanced Gemini models. We don't just score multiple choice. Our engine listens to spoken responses and reads essays, grading nuance, lexical range, and grammar against strict CEFR rubrics.
                </p>
              </div>
              <div className="w-full md:w-56 aspect-[4/3] md:aspect-square rounded-3xl bg-white border-2 border-indigo-100 flex flex-col items-center justify-center text-indigo-600 flex-shrink-0 relative overflow-hidden shadow-sm group-hover:scale-105 transition-transform duration-700">
                <div className="text-5xl font-black relative z-10 tracking-tighter">C1</div>
                <div className="font-bold text-sm tracking-[0.2em] uppercase mt-2 relative z-10 text-slate-400">Advanced</div>
                {/* Decorative dots in background */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiM2MzY2ZjEiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] opacity-60" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── IMMERSIVE FEATURE SECTION: DESIGN & ANALYTICS ─── */}
      <section className="py-24 bg-white relative overflow-hidden" id="technology">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50 opacity-50 -skew-x-[20deg] transform origin-top" />
        <div className="absolute -left-48 bottom-12 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-60" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            
            {/* TEXT CONTENT */}
            <div className="lg:w-1/2 w-full space-y-10">
              <div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-bold tracking-wide mb-6"
                >
                  <Activity size={16} /> DATA-DRIVEN INSIGHTS
                </motion.div>
                <h2 className="text-4xl lg:text-5xl lg:leading-[1.15] font-black tracking-tight text-slate-900 mb-6">
                  <Highlight className="-ml-1">Smart</Highlight> Test & <br />Assessment Design
                </h2>
                <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-lg">
                  Empowering progress through engagement, personalized precision, and deep psychometric analysis.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    title: "Adaptive Intelligence",
                    text: "Item Response Theory (IRT) adjusts the difficulty level dynamically based on real-time responses.",
                    icon: <Brain size={20} className="text-indigo-600" />,
                    bg: "bg-indigo-100"
                  },
                  {
                    title: "Advanced Psychometrics",
                    text: "Comprehensive insights into learner performance with automated bias detection and trait analysis.",
                    icon: <BarChart size={20} className="text-rose-600" />,
                    bg: "bg-rose-100"
                  },
                  {
                    title: "Engaging Experience",
                    text: "Interactive navigation and user-friendly flows keep learners motivated and focused.",
                    icon: <Zap size={20} className="text-[#9b276c]" />,
                    bg: "bg-[#fdf2f8]"
                  }
                ].map((feature, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 }}
                    className="flex gap-5 items-start group"
                  >
                    <div className={`mt-1 flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl ${feature.bg} transition-transform group-hover:scale-110 duration-300`}>
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-1">{feature.title}</h4>
                      <p className="text-slate-600 leading-relaxed text-[15px]">{feature.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                onClick={onStart} 
                className="group flex items-center gap-3 font-bold text-lg text-indigo-600 hover:text-indigo-700 transition-colors mt-4"
              >
                Explore the Science
                <ArrowRight size={20} className="group-hover:translate-x-1 duration-300 transition-transform" />
              </motion.button>
            </div>

            {/* INTERACTIVE UI SHOWCASE INSTEAD OF IMAGE */}
            <div className="lg:w-1/2 w-full relative">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, type: "spring", bounce: 0.2 }}
                className="w-full bg-slate-900 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden border border-slate-800"
              >
                {/* Decorative header */}
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-[#802059]"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div className="ml-4 h-4 w-32 bg-slate-800 rounded-full"></div>
                </div>

                {/* Dashboard mock elements */}
                <div className="space-y-6">
                  {/* Graph element */}
                  <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                    <div className="flex justify-between items-center mb-6">
                      <div className="h-4 w-40 bg-slate-700 rounded-full"></div>
                      <div className="h-6 w-16 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg flex items-center justify-center">IRT</div>
                    </div>
                    
                    <div className="relative h-32 flex items-end gap-3 justify-between">
                      {[40, 55, 35, 75, 60, 90, 85].map((height, idx) => (
                        <div key={idx} className="w-full flex justify-center group relative">
                          <motion.div 
                            initial={{ height: 0 }}
                            whileInView={{ height: `${height}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: idx * 0.1, ease: 'easeOut' }}
                            className={`w-full max-w-[2rem] rounded-t-lg ${idx === 5 ? 'bg-indigo-500' : 'bg-slate-700'}`}
                          />
                        </div>
                      ))}
                      
                      {/* Floating trend line simulate */}
                      <svg className="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none">
                        <motion.path 
                          initial={{ pathLength: 0 }}
                          whileInView={{ pathLength: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
                          d="M0 100 Q 50 60, 100 80 T 200 40 T 300 20" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Adaptive path element */}
                  <div className="flex gap-4">
                    <div className="flex-1 bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
                      <div className="h-3 w-24 bg-slate-700 rounded-full mb-4"></div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#802059]/20 flex items-center justify-center text-[#802059]">
                          <Zap size={18} />
                        </div>
                        <div>
                          <div className="h-3 w-32 bg-slate-600 rounded-full mb-2"></div>
                          <div className="h-2 w-20 bg-slate-700 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 bg-indigo-600 rounded-2xl p-5 shadow-[0_0_30px_rgba(79,70,229,0.3)] relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] opacity-50" />
                      <div className="relative z-10">
                        <div className="h-3 w-24 bg-white/20 rounded-full mb-4"></div>
                        <div className="text-white font-black text-2xl tracking-tighter shrink-0 mb-1">C1 Proficient</div>
                        <div className="h-2 w-16 bg-white/40 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Floating badges */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -right-8 top-12 bg-white rounded-2xl p-4 shadow-xl border border-slate-100 flex items-center gap-4 z-20"
              >
                <div className="bg-green-100 text-green-600 p-2 rounded-full">
                  <Check size={20} className="stroke-[3]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Confidence Interval</div>
                  <div className="font-black text-slate-900">98.5%</div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 15, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -left-12 bottom-20 bg-white rounded-2xl p-4 shadow-xl border border-slate-100 z-20 w-48"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs font-bold text-slate-500">THETA ESTIMATE</div>
                  <Brain size={16} className="text-indigo-500" />
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                  <div className="bg-indigo-500 h-2 rounded-full w-[85%]"></div>
                </div>
                <div className="text-[10px] text-right font-bold text-indigo-600">θ = 2.45</div>
              </motion.div>
            </div>
            
          </div>
        </div>
      </section>

      {/* ─── SPLIT SECTION 2 (REVERSED) ─── */}
      <section className="py-24 bg-white" id="research">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row-reverse items-center gap-16">
          <div className="md:w-1/2 w-full">
            <div className="relative">
              {/* Graphic background shape */}
              <div className="absolute -inset-4 bg-[#9b276c] -z-10 rounded-br-[6rem] rounded-tl-[6rem] opacity-20 transform rotate-3" />
              <img 
                src="https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                alt="Modular testing" 
                className="w-full object-cover aspect-[4/3] shadow-lg rounded-tl-3xl rounded-br-3xl"
              />
            </div>
          </div>

          <div className="md:w-1/2">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.15] mb-8 text-slate-900">
              A Highly <Highlight className="-ml-1">Modular</Highlight>, <br/>Custom Experience
            </h2>
            
            <p className="text-lg text-slate-600 font-medium mb-10 leading-relaxed max-w-lg">
              Why settle for rigid exams? We've engineered an evaluation framework that morphs to fit your precise organizational needs and the candidate's evolving skill level.
            </p>

            <div className="space-y-6 mb-12">
              {[
                "Deploy independent testing blocks. Assess speaking, writing, reading, or listening—separately or combined into a unified workflow.",
                "Built on a fluid architecture that adjusts complexity on-the-fly, pinpointing exact proficiency without discouraging the learner.",
                "Granular CEFR alignments designed specifically for demanding academic admissions, corporate hiring, and continuous training.",
                "Eliminate assessment fatigue. Our algorithms optimize test duration, stopping the moment a statistically significant metric is locked in."
              ].map((text, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className="mt-1 flex-shrink-0 text-indigo-600 bg-indigo-50 p-1.5 rounded-xl border border-indigo-100 group-hover:scale-110 transition-transform">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <p className="text-slate-700 leading-relaxed text-[15px]">{text}</p>
                </div>
              ))}
            </div>

            <div className="inline-block border-b-2 border-indigo-200 hover:border-indigo-600 pb-1 transition-colors duration-300">
              <a href="/methodology" className="font-bold text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-2">
                Discover b4skills Pedagogy <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BRAND BREAK BANNER ─── */}
      <section className="relative py-24 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Tech" className="w-full h-full object-cover mix-blend-overlay filter grayscale" />
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#9b276c] to-transparent opacity-80" style={{ clipPath: 'polygon(100% 0, 100% 100%, 20% 100%, 80% 0)' }} />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-white pt-10 pb-16">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-[1.15] max-w-3xl">
            Next-Gen Architecture, <br />
            Unbounded <Highlight className="text-white before:bg-[#9b276c]">Potential</Highlight>
          </h2>
          <p className="text-xl text-slate-100 mt-6 max-w-2xl font-medium leading-relaxed opacity-90">
            Fusing cognitive science with advanced machine learning, we deliver a paradigm shift in precise language assessment for modern institutions and ambitious learners.
          </p>
        </div>
      </section>

      {/* ─── NEWS / CASE STUDIES SECTION ─── */}
      <section className="py-24 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-12 border-b border-slate-200 pb-6">
            <h2 className="text-3xl font-bold text-slate-900">b4skills News</h2>
            <div className="hidden md:flex gap-2">
              <button className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-100 transition-colors">
                <ChevronRight size={20} className="rotate-180" />
              </button>
              <button className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-100 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                img: "https://images.unsplash.com/photo-1543269865-cbf427effbad?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                title: "Business English - 4 Skills Now AI-Certified",
                desc: "We are thrilled to announce that the b4skills Business English suite has achieved a significant milestone in fully AI-powered scoring..."
              },
              {
                img: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                title: "Global Academies Accredit b4skills IRT Models!",
                desc: "Renowned European university consortiums have officially registered our Computer Adaptive logic as their standard benchmark."
              },
              {
                img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                title: "b4skills Partners with National Science Academy",
                desc: "b4skills is now officially recognized by leading science camps globally as an accepted proficiency exam format."
              }
            ].map((news, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center">
                <div className="w-full h-48 overflow-hidden relative">
                  <img src={news.img} alt={news.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap text-slate-900 shadow-sm border border-white/50">
                    Read Story
                  </div>
                </div>
                <div className="p-8 text-center bg-slate-50 flex-grow w-full">
                  <h3 className="text-lg font-bold mb-4 leading-snug group-hover:text-[#9b276c] transition-colors text-slate-900">{news.title}</h3>
                  <p className="text-slate-600 text-[15px] leading-relaxed line-clamp-3">{news.desc}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Carousel dots */}
          <div className="flex justify-center gap-2 mt-8 md:hidden">
            <span className="w-2 h-2 rounded-full bg-[#9b276c]"></span>
            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <SiteFooter />
    </div>
  );
};
