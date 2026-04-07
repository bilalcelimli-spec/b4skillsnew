import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "./ui/Button";
import { DynamicPage } from "./DynamicPage";
import { Check, ChevronRight, Menu, X, BrainCircuit, Target, Lightbulb, FileCheck2, Activity, Brain, BarChart, Zap, ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";

// Marker highlight component
const Highlight = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("relative inline-block whitespace-nowrap mx-1", className)}>
    <span className="absolute inset-y-1 -inset-x-2 bg-[#9b276c] -skew-x-[12deg] -z-10 rounded-sm" />
    <span className="relative z-10 text-white">{children}</span>
  </span>
);

export const LandingPage: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingFeature, setPendingFeature] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    
    // Global interceptor for loose-end #unavailable links
    const handleBrokenLinks = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.getAttribute('href') === '#unavailable') {
        e.preventDefault();
        setPendingFeature(link.innerText.trim() || 'This Feature');
      }
    };
    document.addEventListener("click", handleBrokenLinks);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleBrokenLinks);
    };
  }, []);

  if (pendingFeature) {
    return <DynamicPage pageName={pendingFeature} onBack={() => setPendingFeature(null)} />;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-800 overflow-x-hidden">
      {/* ─── NAVBAR ─── */}
      <nav className={cn(
        "fixed top-0 left-0 w-full z-50 transition-all duration-300",
        scrolled ? "bg-white/95 backdrop-blur-md shadow-sm py-4" : "bg-transparent py-6"
      )}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            <div className="bg-[#9b276c] justify-center text-white font-bold text-xl px-3 py-1 -skew-x-6 rounded-sm tracking-tight flex items-center">
              <span style={{ textShadow: '0 0 8px rgba(253, 224, 71, 0.8), 0 0 15px rgba(253, 224, 71, 0.4)' }}>b4skills</span>
            </div>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-700">
            {/* Mega Menu - Solutions */}
            <div className="group h-16 flex items-center">
              <a href="#solutions" className="hover:text-[#9b276c] transition-colors flex items-center gap-1 group-hover:text-[#9b276c] py-4">
                Solutions
                <ChevronRight size={14} className="group-hover:rotate-90 transition-transform duration-300" />
              </a>

              {/* Mega Menu Dropdown Box */}
              <div className="absolute top-[70px] left-1/2 -translate-x-1/2 w-screen max-w-[1100px] px-6 lg:px-0 opacity-0 invisible translate-y-4 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto z-50">
                <div className="bg-white rounded-3xl overflow-hidden flex flex-col md:flex-row text-left shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(148,163,184,0.1)]">
                  
                  {/* Left: Solutions & Products (White bg) */}
                  <div className="md:w-[70%] p-10 bg-white">
                    {/* Solutions Row */}
                    <div className="mb-10">
                      <div className="uppercase tracking-[0.2em] text-[#9b276c] text-[10px] font-black border-b-2 border-[#9b276c] inline-block pb-1 mb-8">Distributions</div>
                      <div className="grid grid-cols-4 gap-8">
                        {["Academia", "Schools", "Corporates", "Language Schools"].map(type => (
                          <div key={type} className="group/item cursor-pointer">
                            <h4 className="text-slate-400 font-bold mb-1 text-[11px] uppercase tracking-wider">b4skills for</h4>
                            <a href="#unavailable" className="flex flex-col font-black text-[22px] leading-tight text-slate-800 group-hover/item:text-[#9b276c] transition-colors">
                              {type}
                            </a>
                            <div className="h-0.5 w-0 bg-[#9b276c] mt-2 group-hover/item:w-full transition-all duration-300 opacity-50" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Products Row */}
                    <div>
                      <div className="uppercase tracking-[0.2em] text-slate-400 text-[10px] font-black border-b-2 border-slate-200 inline-block pb-1 mb-6">Assessments & Modules</div>
                      <div className="grid grid-cols-2 gap-x-16 gap-y-5 mt-2">
                        {[
                          "b4skills Diagnostic",
                          "b4skills Career Context",
                          "Early Years (Ages 7-10)",
                          "Video & Writing Interviews",
                          "Junior Suite (Ages 11-15)",
                          "General English Adaptive",
                          "Academic Admissions (C1+)",
                          "Business English Core"
                        ].map((item) => (
                          <a href="#unavailable" key={item} className="flex items-center justify-between text-slate-600 font-bold text-[14px] hover:text-[#9b276c] group/link transition-colors border-b border-transparent hover:border-slate-100 pb-1">
                            {item}
                            <ChevronRight size={14} className="opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-[#9b276c]" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Services (Grey bg like VTest) */}
                  <div className="md:w-[30%] bg-[#FAFAFA] p-10 border-l border-slate-100 flex flex-col">
                    <div className="uppercase tracking-[0.2em] text-slate-900 text-[10px] font-black mb-8 border-b-2 border-slate-300 inline-block pb-1 w-fit">Services</div>
                    
                    <div className="flex flex-col gap-6 flex-1 group/services">
                      <a href="#unavailable" className="text-slate-700 font-bold text-[15px] hover:text-[#9b276c] transition-colors flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 transition-colors" /> Custom Platform Dev.
                      </a>
                      <a href="#unavailable" className="text-slate-700 font-bold text-[15px] hover:text-[#9b276c] transition-colors flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 transition-colors" /> Administration Management
                      </a>
                      <a href="#unavailable" className="text-slate-700 font-bold text-[15px] hover:text-[#9b276c] transition-colors flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 transition-colors" /> AI Assessment Analysis
                      </a>
                    </div>

                    <div className="mt-8 bg-slate-900 rounded-2xl p-6 relative overflow-hidden group/callout hover:bg-slate-800 transition-colors cursor-pointer border border-[#9b276c]/30 hover:border-[#9b276c] duration-300">
                      <div className="absolute right-0 top-0 w-24 h-24 bg-[#9b276c] rounded-bl-full blur-2xl opacity-20 group-hover/callout:opacity-50 transition-opacity duration-500" />
                      <Zap size={20} className="text-[#9b276c] mb-3" />
                      <h4 className="text-white font-bold text-[15px] mb-1.5 line-clamp-1">Scale Instantly</h4>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed">
                        Connect LMS systems to our scalable IRT engine via API.
                      </p>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>

            <a href="#technology" className="hover:text-slate-900 transition-colors h-16 flex items-center">Technology & Pedagogy</a>
            <a href="#research" className="hover:text-slate-900 transition-colors h-16 flex items-center">Research</a>
            <div className="flex items-center gap-6 h-16">
              <button onClick={onStart} className="text-slate-900 font-bold border-b-2 border-[#9b276c] hover:bg-[#9b276c] hover:border-transparent px-2 py-1 transition-all">
                Test Taker Login
              </button>
              <Button onClick={onStart} className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6">
                Get Started
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-slate-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-xl border-t border-slate-100 flex flex-col p-6 gap-6 font-medium text-slate-700">
            <a href="#solutions" onClick={() => setMobileMenuOpen(false)}>Solutions</a>
            <a href="#technology" onClick={() => setMobileMenuOpen(false)}>Technology & Pedagogy</a>
            <a href="#research" onClick={() => setMobileMenuOpen(false)}>Research</a>
            <button onClick={onStart} className="text-left font-bold text-indigo-600">Test Taker Login</button>
            <Button onClick={onStart} className="bg-slate-900 text-white w-full rounded-full">Get Started</Button>
          </div>
        )}
      </nav>

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
              <button onClick={() => setPendingFeature('Schools')} className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm px-5 py-3 rounded-full text-sm font-bold text-slate-700 transition-transform hover:-translate-y-0.5">
                For Schools <div className="bg-purple-600 text-white rounded-full p-1"><ChevronRight size={14}/></div>
              </button>
              <button onClick={() => setPendingFeature('Academia')} className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm px-5 py-3 rounded-full text-sm font-bold text-slate-700 transition-transform hover:-translate-y-0.5">
                Academic <div className="bg-blue-600 text-white rounded-full p-1"><ChevronRight size={14}/></div>
              </button>
              <button onClick={() => setPendingFeature('Corporates')} className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm px-5 py-3 rounded-full text-sm font-bold text-slate-700 transition-transform hover:-translate-y-0.5">
                Corporate Solutions <div className="bg-slate-900 text-white rounded-full p-1"><ChevronRight size={14}/></div>
              </button>
            </div>
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
              <a href="#unavailable" className="font-bold text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-2">
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
      <footer className="bg-white border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 pb-12">
          <div className="md:col-span-1">
            <div className="bg-[#9b276c] text-white font-bold text-xl px-3 py-1 -skew-x-6 rounded-sm tracking-tight w-fit flex items-center mb-6">
              <span style={{ textShadow: '0 0 8px rgba(253, 224, 71, 0.8), 0 0 15px rgba(253, 224, 71, 0.4)' }}>b4skills</span>
            </div>
            <p className="text-[13px] leading-relaxed text-slate-600">
              The premier AI-powered, adaptive English language proficiency platform for schools, universities, and businesses.
            </p>
          </div>
          <div>
            <h4 className="text-slate-900 font-bold mb-4">Assessment Solutions</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              <li><a href="#unavailable" className="hover:text-[#9b276c] transition-colors">For Schools</a></li>
              <li><a href="#unavailable" className="hover:text-[#9b276c] transition-colors">Academic Testing</a></li>
              <li><a href="#unavailable" className="hover:text-[#9b276c] transition-colors">General & Business English</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-900 font-bold mb-4">Resources</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              <li><a href="#unavailable" className="hover:text-[#9b276c] transition-colors">Support Center</a></li>
              <li><a href="#unavailable" className="hover:text-[#9b276c] transition-colors">Pedagogy</a></li>
              <li><a href="#unavailable" className="hover:text-[#9b276c] transition-colors">Research & Adoptions</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-900 font-bold mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              <li><a href="#unavailable" className="hover:text-[#9b276c] transition-colors">About Us</a></li>
              <li><a href="#unavailable" className="hover:text-[#9b276c] transition-colors">Contact</a></li>
              <li><a href="#unavailable" className="hover:text-[#9b276c] transition-colors">Terms & Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-8">
          <p>&copy; {new Date().getFullYear()} b4skills Inc. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <span>Powered by IRT & Gemini AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
