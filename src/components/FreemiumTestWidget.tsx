/**
 * FreemiumTestWidget
 *
 * A 4-step adaptive placement test that runs with no authentication:
 *  Step 1 — Register (name + email + GDPR consent)
 *  Step 2 — Instructions
 *  Step 3 — Test player  (adaptive MC questions, 6-12 items)
 *  Step 4 — Results page (CEFR level + upgrade CTA)
 *
 * Uses /api/assessment/placement/* endpoints.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";
import {
  X, ArrowRight, CheckCircle2, Brain, Clock, BookOpen,
  Headphones, Pen, Mic, AlertCircle, Loader2, Star,
  ChevronRight, Award, BarChart3, Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "register" | "intro" | "question" | "result";

interface PlacementItem {
  id: string;
  skill: string;
  type: string;
  cefrLevel: string;
  content: {
    prompt?: string;
    options?: string[];
    passage?: string;
    audioUrl?: string;
    scaffold?: string;   // fill-in-the-blank template
    imageUrl?: string;
  };
}

interface PlacementResult {
  placementId: string;
  cefrLevel: string;
  theta: number;
  sem: number;
  cefrConfidenceInterval: [string, number, number];
  itemsAdministered: number;
  completionMs: number;
  upgradePrompt: {
    message: string;
    skills: string[];
    callToActionUrl: string;
  };
}

interface FreemiumTestWidgetProps {
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CEFR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PRE_A1: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300" },
  A1:     { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
  A2:     { bg: "bg-green-50", text: "text-green-700", border: "border-green-300" },
  B1:     { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300" },
  B2:     { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-300" },
  C1:     { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-300" },
  C2:     { bg: "bg-[#fdf2f8]", text: "text-[#9b276c]", border: "border-[#9b276c]" },
};

const CEFR_LABELS: Record<string, { label: string; desc: string }> = {
  PRE_A1: { label: "Pre A1", desc: "Beginner" },
  A1:     { label: "A1", desc: "Elementary" },
  A2:     { label: "A2", desc: "Pre-Intermediate" },
  B1:     { label: "B1", desc: "Intermediate" },
  B2:     { label: "B2", desc: "Upper Intermediate" },
  C1:     { label: "C1", desc: "Advanced" },
  C2:     { label: "C2", desc: "Mastery" },
};

const SKILL_ICONS: Record<string, React.ReactNode> = {
  READING:    <BookOpen size={14} />,
  LISTENING:  <Headphones size={14} />,
  GRAMMAR:    <Pen size={14} />,
  VOCABULARY: <Brain size={14} />,
  WRITING:    <Pen size={14} />,
  SPEAKING:   <Mic size={14} />,
};

const SKILL_COLORS: Record<string, string> = {
  READING:    "bg-blue-100 text-blue-700",
  LISTENING:  "bg-purple-100 text-purple-700",
  GRAMMAR:    "bg-amber-100 text-amber-700",
  VOCABULARY: "bg-emerald-100 text-emerald-700",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ current: number; max: number }> = ({ current, max }) => (
  <div className="w-full bg-slate-100 rounded-full h-1.5">
    <motion.div
      className="h-1.5 rounded-full bg-[#9b276c]"
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, (current / max) * 100)}%` }}
      transition={{ duration: 0.4 }}
    />
  </div>
);

const SkillBadge: React.FC<{ skill: string }> = ({ skill }) => (
  <span className={cn(
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider",
    SKILL_COLORS[skill] ?? "bg-slate-100 text-slate-600"
  )}>
    {SKILL_ICONS[skill]} {skill}
  </span>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const FreemiumTestWidget: React.FC<FreemiumTestWidgetProps> = ({ onClose }) => {
  const [step, setStep] = useState<Step>("register");

  // Registration state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Session state
  const [placementId, setPlacementId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<PlacementItem | null>(null);
  const [maxItems, setMaxItems] = useState(12);
  const [itemsAdministered, setItemsAdministered] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemStartTime, setItemStartTime] = useState<number>(Date.now());

  // Result state
  const [result, setResult] = useState<PlacementResult | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Reset selected option when item changes
  useEffect(() => {
    setSelectedOption(null);
    setItemStartTime(Date.now());
  }, [currentItem?.id]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRegister = useCallback(async () => {
    setRegError(null);
    if (!name.trim()) { setRegError("Please enter your name."); return; }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRx.test(email)) { setRegError("Please enter a valid email address."); return; }
    if (!consent) { setRegError("Please agree to the data usage terms to continue."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/assessment/placement/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), consentToResearch: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start test");

      setPlacementId(data.placementId);
      setCurrentItem(data.firstItem);
      setMaxItems(data.maxItems ?? 12);
      setItemsAdministered(0);
      setStep("intro");
    } catch (err: any) {
      setRegError(err.message ?? "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [name, email, consent]);

  const handleStartTest = useCallback(() => {
    setStep("question");
  }, []);

  const handleSubmitAnswer = useCallback(async () => {
    if (selectedOption === null || !placementId || !currentItem) return;

    const latencyMs = Date.now() - itemStartTime;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/assessment/placement/${placementId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: currentItem.id, selectedOption, latencyMs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit response");

      if (data.complete) {
        setResult(data.result);
        setStep("result");
      } else {
        setItemsAdministered(data.itemsAdministered ?? itemsAdministered + 1);
        setCurrentItem(data.nextItem);
      }
    } catch (err: any) {
      setError(err.message ?? "Connection error. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedOption, placementId, currentItem, itemStartTime, itemsAdministered]);

  // ── Render steps ──────────────────────────────────────────────────────────

  const renderRegister = () => (
    <motion.div
      key="register"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      className="flex flex-col gap-6"
    >
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#9b276c]/10 mb-4">
          <Brain size={28} className="text-[#9b276c]" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Find Your English Level</h2>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-xs mx-auto">
          10 minutes · Completely free · No account needed · Powered by IRT psychometrics
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { icon: <Clock size={18} />, val: "~10 min", label: "Duration" },
          { icon: <Zap size={18} />, val: "Adaptive", label: "Algorithm" },
          { icon: <Award size={18} />, val: "A1–C2", label: "CEFR Scale" },
        ].map((s, i) => (
          <div key={i} className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center gap-1">
            <div className="text-[#9b276c]">{s.icon}</div>
            <div className="font-black text-slate-900 text-sm">{s.val}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Emma Johnson"
            maxLength={100}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9b276c]/30 focus:border-[#9b276c] transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={254}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9b276c]/30 focus:border-[#9b276c] transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <div
            onClick={() => setConsent((v) => !v)}
            className={cn(
              "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
              consent ? "bg-[#9b276c] border-[#9b276c]" : "border-slate-300 group-hover:border-[#9b276c]/50"
            )}
          >
            {consent && <CheckCircle2 size={12} className="text-white stroke-[3]" />}
          </div>
          <span className="text-xs text-slate-500 leading-relaxed">
            I agree that my anonymised responses may be used to improve the assessment platform
            (GDPR Art. 6(1)(a)). Your email will not be shared.
          </span>
        </label>

        {regError && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            {regError}
          </div>
        )}

        <Button
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-[#9b276c] hover:bg-[#7d1f57] text-white rounded-xl h-12 font-bold text-sm flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : (
            <>Start My Free Test <ArrowRight size={16} /></>
          )}
        </Button>
      </div>
    </motion.div>
  );

  const renderIntro = () => (
    <motion.div
      key="intro"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      className="flex flex-col gap-6"
    >
      <div className="text-center">
        <h2 className="text-xl font-black text-slate-900">Hi {name.split(" ")[0]}, you're almost ready!</h2>
        <p className="text-slate-500 text-sm mt-1.5">Here's what to expect in your adaptive placement test.</p>
      </div>

      <div className="space-y-3">
        {[
          {
            icon: <Brain size={20} className="text-[#9b276c]" />,
            bg: "bg-[#fdf2f8]",
            title: "Adaptive Questions",
            body: "Each question adjusts to your level in real time. The test gets harder or easier based on your answers.",
          },
          {
            icon: <BarChart3 size={20} className="text-indigo-600" />,
            bg: "bg-indigo-50",
            title: "6–12 Questions Total",
            body: "The test stops automatically once we have a reliable estimate of your level — usually 6 to 12 items.",
          },
          {
            icon: <Clock size={20} className="text-blue-600" />,
            bg: "bg-blue-50",
            title: "No Time Pressure",
            body: "Take your time on each question. There's no countdown — just answer when you're ready.",
          },
          {
            icon: <Star size={20} className="text-amber-500" />,
            bg: "bg-amber-50",
            title: "Covers 4 Skills",
            body: "Reading, Grammar, Vocabulary, and Listening. Give each your best effort.",
          },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-4"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", card.bg)}>
              {card.icon}
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">{card.title}</div>
              <div className="text-slate-500 text-xs leading-relaxed mt-0.5">{card.body}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <Button
        onClick={handleStartTest}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 font-bold text-sm flex items-center justify-center gap-2"
      >
        I'm Ready — Begin Test <ArrowRight size={16} />
      </Button>
    </motion.div>
  );

  const renderQuestion = () => {
    if (!currentItem) return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 size={28} className="animate-spin text-[#9b276c]" />
        <p className="text-slate-500 text-sm">Loading your next question…</p>
      </div>
    );

    const content = currentItem.content;
    const isPassage = !!content.passage;

    return (
      <motion.div
        key={currentItem.id}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
        className="flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <SkillBadge skill={currentItem.skill} />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {itemsAdministered + 1} / {maxItems}
          </span>
        </div>
        <ProgressBar current={itemsAdministered} max={maxItems} />

        {/* Audio player for listening items */}
        {content.audioUrl && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Headphones size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-purple-700 mb-1.5 uppercase tracking-wider">Listen carefully</div>
              <audio controls src={content.audioUrl} className="w-full h-8" />
            </div>
          </div>
        )}

        {/* Reading passage */}
        {isPassage && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 max-h-40 overflow-y-auto">
            <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1">
              <BookOpen size={11} /> Reading Passage
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{content.passage}</p>
          </div>
        )}

        {/* Question prompt */}
        {content.prompt && (
          <p className="text-base font-semibold text-slate-900 leading-snug">{content.prompt}</p>
        )}

        {/* MC Options */}
        {content.options && (
          <div className="space-y-2">
            {content.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => !loading && setSelectedOption(idx)}
                disabled={loading}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-150",
                  selectedOption === idx
                    ? "border-[#9b276c] bg-[#fdf2f8] text-[#9b276c] font-bold"
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black mr-3",
                  selectedOption === idx ? "bg-[#9b276c] text-white" : "bg-slate-100 text-slate-500"
                )}>
                  {String.fromCharCode(65 + idx)}
                </span>
                {opt}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={15} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <Button
          onClick={handleSubmitAnswer}
          disabled={selectedOption === null || loading}
          className={cn(
            "w-full rounded-xl h-12 font-bold text-sm flex items-center justify-center gap-2 transition-all",
            selectedOption !== null && !loading
              ? "bg-[#9b276c] hover:bg-[#7d1f57] text-white"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Analysing…</>
          ) : (
            <>Submit Answer <ChevronRight size={16} /></>
          )}
        </Button>
      </motion.div>
    );
  };

  const renderResult = () => {
    if (!result) return null;
    const cefrKey = result.cefrLevel;
    const colors = CEFR_COLORS[cefrKey] ?? CEFR_COLORS.B1;
    const meta = CEFR_LABELS[cefrKey] ?? { label: cefrKey, desc: "" };
    const minutes = Math.round(result.completionMs / 60_000);
    const [, ciLow, ciHigh] = result.cefrConfidenceInterval;

    return (
      <motion.div
        key="result"
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
        className="flex flex-col gap-5"
      >
        {/* CEFR Badge */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.4, delay: 0.1 }}
            className={cn(
              "inline-flex flex-col items-center justify-center w-32 h-32 rounded-3xl border-4 mx-auto shadow-xl mb-3",
              colors.bg, colors.border
            )}
          >
            <span className={cn("text-4xl font-black tracking-tight", colors.text)}>{meta.label}</span>
            <span className={cn("text-[11px] font-bold uppercase tracking-wider mt-0.5", colors.text)}>{meta.desc}</span>
          </motion.div>
          <h2 className="text-xl font-black text-slate-900">Your estimated level</h2>
          <p className="text-slate-500 text-sm mt-1">
            Based on {result.itemsAdministered} adaptive questions in ~{minutes} min
          </p>
        </div>

        {/* Confidence interval */}
        <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Confidence Interval (90%)</span>
            <span>θ = {result.theta.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold">{ciLow.toFixed(1)}</span>
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden relative">
              <div
                className={cn("absolute h-full rounded-full", colors.bg, "border", colors.border)}
                style={{
                  left: `${Math.max(0, ((ciLow + 4.5) / 9) * 100)}%`,
                  right: `${Math.max(0, 100 - ((ciHigh + 4.5) / 9) * 100)}%`,
                  backgroundColor: undefined,
                }}
              >
                <div className="h-full w-full bg-[#9b276c]/30 rounded-full" />
              </div>
              <div
                className="absolute top-0 h-full w-1.5 bg-[#9b276c] rounded-full"
                style={{ left: `${Math.max(0, Math.min(100, ((result.theta + 4.5) / 9) * 100))}%` }}
              />
            </div>
            <span className="font-bold">{ciHigh.toFixed(1)}</span>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            SEM = {result.sem.toFixed(2)} — measurement uncertainty range
          </p>
        </div>

        {/* Upgrade prompt */}
        <div className="bg-gradient-to-br from-[#9b276c] to-[#7d1f57] rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap size={20} />
            </div>
            <div>
              <div className="font-black text-base mb-1">Get your full 4-skill report</div>
              <p className="text-white/80 text-xs leading-relaxed mb-3">
                This test covered Reading, Grammar &amp; Vocabulary.
                Unlock Speaking &amp; Writing assessment with a certified CEFR report.
              </p>
              <a
                href={result.upgradePrompt.callToActionUrl}
                className="inline-flex items-center gap-2 bg-white text-[#9b276c] font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/90 transition-colors"
              >
                Start Full Assessment <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>

        <Button
          onClick={onClose}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl h-11 font-bold text-sm"
        >
          Close
        </Button>
      </motion.div>
    );
  };

  // ── Layout ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-2">
            <div className="bg-[#9b276c] text-white font-black text-sm px-2.5 py-1 -skew-x-6 rounded-sm tracking-tight">
              b4skills
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Free Placement Test</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={16} className="text-slate-600" />
          </button>
        </div>

        {/* Step indicator (dots) */}
        {step !== "result" && (
          <div className="flex justify-center gap-2 pt-4 px-6">
            {(["register", "intro", "question"] as Step[]).map((s, i) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  step === s ? "w-8 bg-[#9b276c]" : i < ["register", "intro", "question"].indexOf(step) ? "w-4 bg-[#9b276c]/40" : "w-4 bg-slate-200"
                )}
              />
            ))}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {step === "register" && renderRegister()}
            {step === "intro" && renderIntro()}
            {step === "question" && renderQuestion()}
            {step === "result" && renderResult()}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
