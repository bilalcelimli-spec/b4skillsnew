import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BrainCircuit, ShieldCheck, BarChart3, Users,
  CheckCircle2, ChevronRight, BookOpen, Mic, FileText,
  TrendingUp, Target, Layers, Baby, Zap, GraduationCap,
  Star, PlayCircle, Sparkles, Award
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SchoolsPageProps {
  onBack: () => void;
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
export const Highlight = ({ children }: { children: React.ReactNode }) => (
  <span className="relative inline-block">
    <span className="absolute inset-y-1 -inset-x-2 bg-gradient-to-r from-[#9b276c] to-[#d63384] -skew-x-[12deg] -z-10 rounded-lg shadow-lg" />
    <span className="relative z-10 text-white px-1">{children}</span>
  </span>
);

export const Check = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-4 text-slate-700 text-[15px] font-medium leading-relaxed bg-white/60 p-3 rounded-2xl border border-slate-100 shadow-sm">
    <div className="bg-[#9b276c]/10 p-1 rounded-full shrink-0">
      <CheckCircle2 size={18} className="text-[#9b276c]" />
    </div>
    <span className="pt-0.5">{children}</span>
  </li>
);

export const Pillar = ({
  icon, title, desc
}: { icon: React.ReactNode; title: string; desc: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="flex flex-col items-start gap-5 p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#9b276c]/30 transition-all duration-300 group"
  >
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#9b276c]/10 to-[#9b276c]/5 flex items-center justify-center text-[#9b276c] group-hover:scale-110 group-hover:bg-[#9b276c] group-hover:text-white transition-all duration-300">
      {icon}
    </div>
    <div>
      <h3 className="font-black text-slate-900 text-xl tracking-tight mb-2 group-hover:text-[#9b276c] transition-colors">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed font-medium">{desc}</p>
    </div>
  </motion.div>
);

export const SmallFeature = ({
  icon, title, desc
}: { icon: React.ReactNode; title: string; desc: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    className="flex flex-col gap-4 p-6 rounded-[28px] bg-slate-50 border border-slate-100/50 hover:bg-white hover:shadow-lg transition-all"
  >
    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#9b276c]">
      {icon}
    </div>
    <div>
      <h4 className="font-black text-slate-900 text-base tracking-tight mb-2">{title}</h4>
      <p className="text-slate-500 text-xs leading-relaxed font-medium">{desc}</p>
    </div>
  </motion.div>
);

export const ProductCard = ({
  label, title, desc, onClick
}: { label: string; title: string; desc: string; onClick: () => void }) => (
  <motion.button
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    onClick={onClick}
    className="group text-left p-10 rounded-[40px] border border-slate-200 bg-white/80 backdrop-blur-xl hover:border-[#9b276c] hover:shadow-2xl hover:shadow-[#9b276c]/10 transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#9b276c]/5 to-transparent rounded-full -mr-10 -mt-10" />
    <div className="text-[11px] font-black text-[#9b276c] uppercase tracking-[0.25em] mb-4 bg-[#9b276c]/10 inline-block px-3 py-1.5 rounded-full">{label}</div>
    <h3 className="font-black text-3xl text-slate-900 tracking-tight mb-4">{title}</h3>
    <p className="text-slate-600 text-[15px] font-medium leading-relaxed mb-8">{desc}</p>
    <div className="flex items-center gap-2 text-[#9b276c] font-black text-sm uppercase tracking-widest group-hover:gap-4 transition-all bg-white shadow-sm inline-flex px-5 py-3 rounded-2xl">
      Explore Module <ChevronRight size={16} />
    </div>
  </motion.button>
);

export const PersonaPanel = ({
  role, name, quote, points, gradient, image
}: {
  role: string; name: string; quote: string;
  points: string[]; gradient: string; image: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    className="rounded-[40px] overflow-hidden bg-white border border-slate-200/60 shadow-lg hover:shadow-2xl transition-all duration-500 group flex flex-col h-full"
  >
    <div className="h-64 relative overflow-hidden shrink-0">
      <img
        src={image}
        alt={name}
        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />
      <div className="absolute bottom-0 left-0 p-8 w-full">
        <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase tracking-[0.2em] mb-2">b4skills translates to</div>
        <div className="text-3xl font-black text-white tracking-tight flex items-end justify-between">
          {name}
        </div>
      </div>
    </div>
    <div className="p-8 flex flex-col grow">
      <div className="relative mb-6 shrink-0">
        <span className="absolute -top-4 -left-2 text-6xl text-slate-100 font-serif leading-none">"</span>
        <p className="relative z-10 text-slate-700 text-[15px] italic font-medium leading-relaxed">
          {quote}
        </p>
      </div>
      <div className="h-px w-full bg-gradient-to-r from-slate-100 via-slate-200 to-transparent mb-6 shrink-0" />
      <ul className="space-y-4 mb-auto">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-3 text-[14px] text-slate-600 font-medium">
            <div className="bg-slate-50 p-1 rounded-full shrink-0 mt-0.5">
              <CheckCircle2 size={16} className="text-[#9b276c]" />
            </div>
            {p}
          </li>
        ))}
      </ul>
    </div>
  </motion.div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export const SchoolsPage: React.FC<SchoolsPageProps> = ({ onBack }) => {
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
          Start Free Trial <ChevronRight size={14} />
        </button>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-16 lg:py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left: text */}
          <div className="col-span-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-center text-center lg:text-left z-10 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full text-xs font-black text-[#9b276c] uppercase tracking-[0.2em] mb-8 mx-auto lg:mx-0 shadow-sm"
            >
              <Sparkles size={14} /> b4skills for Schools
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-5xl lg:text-[64px] font-black tracking-tighter text-slate-900 leading-[1.05] mb-8"
            >
              Assessment<br/>that actually<br/>
              <Highlight>Inspires.</Highlight>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-lg text-slate-600 leading-relaxed font-medium mb-10 max-w-xl mx-auto lg:mx-0"
            >
              Transform your K-12 English language testing with adaptive, AI-scored, and curriculum-aligned solutions built to empower every student and teacher.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start w-full"
            >
              <button
                onClick={onBack}
                className="bg-slate-900 hover:bg-[#9b276c] text-white font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                Discover Modules <ChevronRight size={16} />
              </button>
              <button
                onClick={onBack}
                className="bg-white hover:bg-slate-50 text-slate-900 font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl border border-slate-200 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                <PlayCircle size={18} className="text-[#9b276c]" /> Watch Demo
              </button>
            </motion.div>
          </div>

          {/* Right: image card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            className="col-span-1 lg:col-span-6 xl:col-span-7 relative w-full h-[400px] lg:h-[600px] xl:h-[650px]"
          >
            <div className="relative w-full h-full rounded-[48px] overflow-hidden shadow-2xl shadow-slate-900/10 border-[8px] border-white z-10">
              <img
                src="https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1400&auto=format&fit=crop&q=80"
                alt="Happy students collaborating in a modern classroom"
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/40 via-transparent to-transparent" />
            </div>
            
            {/* Floating UI Elements */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
              className="absolute -bottom-6 -left-6 lg:-left-12 z-20 bg-white p-5 rounded-[24px] shadow-2xl border border-slate-100 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Target size={24} className="text-emerald-600" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Adaptivity</div>
                <div className="text-lg font-black text-slate-900">Pinpoint Accuracy</div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }}
              className="absolute -top-6 -right-6 lg:-right-8 z-20 bg-slate-900 text-white p-4 rounded-[20px] shadow-2xl flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-[#9b276c] flex items-center justify-center">
                <TrendingUp size={20} className="text-white" />
              </div>
              <div>
                <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-0.5">CEFR Alignment</div>
                <div className="text-sm font-black">Pre-A1 to C1</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FOUR PILLARS ─────────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 relative z-10 w-full overflow-hidden">
        {/* Curved top/bottom background */}
        <div className="absolute inset-0 bg-white" style={{ clipPath: 'polygon(0 5%, 100% 0, 100% 95%, 0 100%)' }} />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 py-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
              A New Generation of<br />Language Assessment
            </h2>
            <p className="text-slate-500 font-medium text-lg">
              Designed by ELT specialists and powered by advanced psychometrics. Tests that evaluate precisely without compromising student confidence.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Pillar
              icon={<BrainCircuit size={26} />}
              title="Adaptive Engine"
              desc="Questions seamlessly adjust in real-time. No more demotivating impossible questions or boring basic ones."
            />
            <Pillar
              icon={<BarChart3 size={26} />}
              title="Growth Insights"
              desc="Comprehensive, actionable reports showing precise strengths and concrete next steps for every single learner."
            />
            <Pillar
              icon={<Award size={26} />}
              title="Confidence-First"
              desc="We celebrate achievement. Every test concludes with a meaningful certificate, not just a stark pass or fail."
            />
            <Pillar
              icon={<Layers size={26} />}
              title="Modular Design"
              desc="Mix and match Reading, Listening, Speaking, and Writing to fit your exact curriculum and timeline."
            />
          </div>
        </div>
      </section>

      {/* ── SMART TESTING GRID ───────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-16 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="max-w-2xl w-full"
            >
              <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">
                Smart Testing.<br/>
                <span className="text-[#9b276c]">Ultimate Flexibility.</span>
              </h2>
              <p className="text-slate-500 font-medium text-lg">
                Build the exact assessment framework your institution requires.
              </p>
            </motion.div>
            <motion.button
              initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              onClick={onBack}
              className="hidden lg:flex items-center gap-2 text-slate-900 font-black text-sm uppercase tracking-widest hover:text-[#9b276c] transition-colors whitespace-nowrap"
            >
              View Full Features <ChevronRight size={16} />
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SmallFeature
              icon={<Zap size={22} />}
              title="Tailored Delivery"
              desc="Select specific language skills or use pre-configured bundles. You control what and when to test."
            />
            <SmallFeature
              icon={<GraduationCap size={22} />}
              title="All Ages & Levels"
              desc="From primary years (age 7) right up to secondary graduation, spanning CEFR Pre-A1 through to C1."
            />
            <SmallFeature
              icon={<BookOpen size={22} />}
              title="Curriculum Aligned"
              desc="Results mapped clearly to international frameworks, making inspection and curriculum planning effortless."
            />
            <SmallFeature
              icon={<Users size={22} />}
              title="Dedicated Support"
              desc="Benefit from our school success managers who assist with setup, training, and ongoing assessment strategy."
            />
          </div>
        </div>
      </section>

      {/* ── SPLIT: ASSESSMENT DESIGN ─────────────────────────────────────────── */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-[48px] overflow-hidden shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col lg:flex-row w-full h-auto min-h-[500px]">
            
            {/* Image Left */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              className="lg:w-1/2 relative min-h-[400px] lg:min-h-[600px] w-full"
            >
              <img
                src="https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&auto=format&fit=crop&q=80"
                alt="Teacher facilitating group work"
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/20 to-transparent" />
            </motion.div>

            {/* Text Right */}
            <div className="lg:w-1/2 p-10 xl:p-16 flex flex-col justify-center w-full">
              <motion.div
                initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              >
                <div className="text-xs font-black text-[#9b276c] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} /> Pedagogy First
                </div>
                <h2 className="text-3xl xl:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                  Built Around How Children<br />
                  <span className="text-[#9b276c]">Actually Learn.</span>
                </h2>
                <div className="h-1 w-12 bg-[#9b276c] rounded-full mb-8" />
                <ul className="space-y-4 mb-10">
                  <Check>Intuitive, age-appropriate interfaces keep students immersed—minimizing anxiety and yielding authentic results.</Check>
                  <Check>Our IRT (Item Response Theory) engine pinpoints CEFR levels quickly without subjecting learners to frustratingly hard items.</Check>
                  <Check>Reports translate complex data into a common, constructive language for teachers, parents, and the student.</Check>
                </ul>
                <button
                  onClick={onBack}
                  className="bg-slate-900 hover:bg-[#9b276c] text-white font-black text-[13px] uppercase tracking-widest px-8 py-3.5 rounded-xl transition-all w-fit shadow-md whitespace-nowrap"
                >
                  Explore Methodology
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PORTFOLIO SPLIT ──────────────────────────────────────────────────── */}
      <section className="py-16 relative z-10 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="bg-slate-900 text-white rounded-[48px] overflow-hidden shadow-2xl flex flex-col-reverse lg:flex-row w-full min-h-[500px]">
            
            {/* Text Left */}
            <div className="lg:w-1/2 p-10 xl:p-16 flex flex-col justify-center relative w-full">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#9b276c]/20 to-transparent pointer-events-none" />
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="relative z-10"
              >
                <div className="text-xs font-black text-white/50 uppercase tracking-[0.25em] mb-4">Portfolio</div>
                <h2 className="text-3xl lg:text-[40px] font-black tracking-tight leading-tight mb-6">
                  Discover the<br/>Schools Portfolio
                </h2>
                <p className="text-white/70 font-medium text-lg leading-relaxed mb-10 max-w-md w-full">
                  Adaptable by duration, age relevance, and skill focus—b4skills modules integrate perfectly into any academic calendar.
                </p>
                <div className="flex flex-col gap-3 w-full max-w-md">
                  {[
                    { label: "Ages 7–10 Suite", icon: <Baby size={18} /> },
                    { label: "Ages 11–15 Suite", icon: <GraduationCap size={18} /> },
                    { label: "Diagnostic Fast-Track", icon: <Zap size={18} /> },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={onBack}
                      className="flex items-center justify-between w-full bg-white/10 hover:bg-white/20 border border-white/10 p-4 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-4 font-bold text-white">
                        <div className="bg-white/10 p-2 rounded-xl text-white group-hover:bg-[#9b276c] transition-colors">{item.icon}</div>
                        {item.label}
                      </div>
                      <ChevronRight size={20} className="text-white/50 group-hover:text-white transition-colors" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Image Right */}
            <motion.div
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="lg:w-1/2 relative min-h-[300px] lg:min-h-full w-full"
            >
              <img
                src="https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&auto=format&fit=crop&q=80"
                alt="Student focused on laptop"
                className="absolute inset-0 w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT CARDS ────────────────────────────────────────────────────── */}
      <section className="py-24 relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">Choose Your Assessment</h2>
            <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
              Purpose-built modules for different developmental stages and testing goals.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-[1200px] mx-auto">
            <ProductCard
              label="Ages 7–10"
              title="Primary Module"
              desc="Highly visual, audio-guided adaptive assessment (Pre-A1 to A2). Perfect for young EFL learners needing a friendly, engaging baseline."
              onClick={onBack}
            />
            <ProductCard
              label="Ages 11–15"
              title="Junior Suite"
              desc="Comprehensive 4-skills testing (A1 to B2) evaluating teens with age-relevant topics. Growth-oriented analytics designed to motivate."
              onClick={onBack}
            />
            <ProductCard
              label="All Ages"
              title="Diagnostic Test"
              desc="Ultra-fast 15-minute placement tool ideal for beginning-of-year class grouping. Provides precise CEFR bands instantly."
              onClick={onBack}
            />
          </div>
        </div>
      </section>

      {/* ── PERSONA PANELS ───────────────────────────────────────────────────── */}
      <section className="py-24 relative z-10 bg-white w-full">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">Delivering Value Everywhere</h2>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-[1200px] mx-auto items-stretch">
            <PersonaPanel
              role="Teachers"
              name="Teachers"
              image="https://images.unsplash.com/photo-1580894732444-8ecded790047?w=800&auto=format&fit=crop&q=80"
              quote="I can see every student's skill profile the moment they finish. No marking, no waiting—just actionable data for Monday's lesson."
              points={[
                "Zero manual grading required",
                "Actionable class-level intervention insights",
                "Effortless one-click bulk assignment"
              ]}
              gradient="from-emerald-500 to-teal-600"
            />
            <PersonaPanel
              role="Students"
              name="Students"
              image="https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80"
              quote="The test didn't feel impossible or scary. It adapted to me, and I loved getting my certificate right away to show my parents."
              points={[
                "Stress-free, gamified UX/UI",
                "Questions automatically tune to their level",
                "Instant achievement certificates"
              ]}
              gradient="from-blue-500 to-indigo-600"
            />
            <PersonaPanel
              role="Administrators"
              name="Administrators"
              image="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&auto=format&fit=crop&q=80"
              quote="We finally have standardized CEFR data across the whole school. It has completely transformed our inspection reporting."
              points={[
                "Holistic school-wide proficiency dashboards",
                "Term-over-term cohort growth tracking",
                "One-click inspection-ready exports"
              ]}
              gradient="from-[#9b276c] to-purple-700"
            />
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden bg-slate-950 w-full mt-auto">
        <div className="absolute top-0 right-[-10%] w-[800px] h-[800px] bg-[#9b276c] rounded-full blur-[150px] opacity-30 pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600 rounded-full blur-[150px] opacity-20 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10 w-full">
          <div className="w-20 h-20 bg-gradient-to-br from-[#9b276c] to-[#d63384] rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-[#9b276c]/40">
            <Sparkles size={36} className="text-white" />
          </div>
          <h2 className="text-5xl lg:text-6xl font-black text-white tracking-tight mb-8">
            Empower Your School<br/>Today
          </h2>
          <p className="text-slate-300 text-xl font-medium mb-12 max-w-2xl mx-auto">
            Get a full-featured 60-day trial for your institution. Includes dedicated onboarding and full platform access.
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center w-full max-w-sm mx-auto whitespace-nowrap">
            <button
              onClick={onBack}
              className="bg-white hover:bg-slate-100 text-slate-900 font-black text-sm uppercase tracking-widest px-10 py-5 rounded-2xl transition-all shadow-xl hover:-translate-y-1"
            >
              Request Free Trial
            </button>
            <button
              onClick={onBack}
              className="bg-white/10 hover:bg-white/20 text-white font-black text-sm uppercase tracking-widest px-10 py-5 rounded-2xl border border-white/20 transition-all backdrop-blur-sm"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      <footer className="py-10 bg-slate-950 border-t border-white/10 text-center relative z-10 w-full">
        <p className="text-slate-500 text-sm font-medium">© {new Date().getFullYear()} b4skills Inc. — Transforming Educational Assessment.</p>
      </footer>
    </div>
  );
};
