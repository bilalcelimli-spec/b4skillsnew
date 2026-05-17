/**
 * FreemiumTestWidget — Full-screen adaptive English placement test
 *
 * Full-screen exam experience:
 *  Step 1 — Register   (name + email + GDPR consent)
 *  Step 2 — Intro      (what to expect)
 *  Step 3 — Question   (full-screen two-panel exam layout)
 *  Step 4 — Result     (CEFR level + CI + upgrade CTA)
 *
 * Features:
 *  - Full viewport takeover (no modal card)
 *  - Two-panel layout: context (passage/audio) + question
 *  - Live timer in header
 *  - Keyboard shortcuts: 1–4 select option, Enter submits
 *  - Confirm-quit dialog on Escape/× during test
 *  - CEFR bar-chart visualisation in result
 *  - 90% CI slider in result
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import {
  X, ArrowRight, CheckCircle2, Brain, Clock, BookOpen,
  Headphones, Pen, Mic, AlertCircle, Loader2, Star,
  ChevronRight, ChevronDown, Award, BarChart3, Zap, Shield,
  TrendingUp, Volume2, Share2, Image,
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

const CEFR_SCALE = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
type CefrLevel = (typeof CEFR_SCALE)[number];

const CEFR_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  PRE_A1: { bg: "bg-slate-100",  text: "text-slate-700",  border: "border-slate-300",  accent: "#64748b" },
  A1:     { bg: "bg-emerald-50", text: "text-emerald-700",border: "border-emerald-300",accent: "#059669" },
  A2:     { bg: "bg-green-50",   text: "text-green-700",  border: "border-green-300",  accent: "#16a34a" },
  B1:     { bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-300",   accent: "#2563eb" },
  B2:     { bg: "bg-indigo-50",  text: "text-indigo-700", border: "border-indigo-300", accent: "#4f46e5" },
  C1:     { bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-300", accent: "#7c3aed" },
  C2:     { bg: "bg-[#fdf2f8]",  text: "text-[#9b276c]", border: "border-[#9b276c]",  accent: "#9b276c" },
};

const CEFR_LABELS: Record<string, { label: string; desc: string; tagline: string }> = {
  PRE_A1: { label: "Pre A1", desc: "Beginner",           tagline: "You're at the very start of your English journey." },
  A1:     { label: "A1",     desc: "Elementary",         tagline: "You can use basic English in familiar situations." },
  A2:     { label: "A2",     desc: "Pre-Intermediate",   tagline: "You can communicate in simple, routine tasks." },
  B1:     { label: "B1",     desc: "Intermediate",       tagline: "You can deal with most situations while travelling." },
  B2:     { label: "B2",     desc: "Upper-Intermediate", tagline: "You can interact with fluency and spontaneity." },
  C1:     { label: "C1",     desc: "Advanced",           tagline: "You can express ideas fluently and precisely." },
  C2:     { label: "C2",     desc: "Mastery",            tagline: "You can understand virtually everything you read or hear." },
};

const SKILL_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  READING:    { icon: <BookOpen size={13} />,   color: "text-blue-700",    bg: "bg-blue-100" },
  LISTENING:  { icon: <Headphones size={13} />, color: "text-purple-700",  bg: "bg-purple-100" },
  GRAMMAR:    { icon: <Pen size={13} />,        color: "text-amber-700",   bg: "bg-amber-100" },
  VOCABULARY: { icon: <Brain size={13} />,      color: "text-emerald-700", bg: "bg-emerald-100" },
  WRITING:    { icon: <Pen size={13} />,        color: "text-orange-700",  bg: "bg-orange-100" },
  SPEAKING:   { icon: <Mic size={13} />,        color: "text-rose-700",    bg: "bg-rose-100" },
};

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StepDots: React.FC<{ step: Step }> = ({ step }) => {
  const steps: Step[] = ["register", "intro", "question"];
  const idx = steps.indexOf(step);
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className={cn(
          "h-1.5 rounded-full transition-all duration-300",
          i === idx ? "w-6 bg-[#9b276c]" : i < idx ? "w-3 bg-[#9b276c]/40" : "w-3 bg-slate-200"
        )} />
      ))}
    </div>
  );
};

const SkillBadge: React.FC<{ skill: string }> = ({ skill }) => {
  const m = SKILL_META[skill] ?? { icon: null, color: "text-slate-600", bg: "bg-slate-100" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider", m.bg, m.color)}>
      {m.icon} {skill}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const FreemiumTestWidget: React.FC<FreemiumTestWidgetProps> = ({ onClose }) => {
  const [step, setStep] = useState<Step>("register");

  // Registration
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Session
  const [placementId, setPlacementId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<PlacementItem | null>(null);
  const [maxItems, setMaxItems] = useState(12);
  const [itemsAdministered, setItemsAdministered] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer
  const [testStartTime, setTestStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [itemStartTime, setItemStartTime] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Result
  const [result, setResult] = useState<PlacementResult | null>(null);

  // Confirm quit
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  // Mobile context panel visibility
  const [showContext, setShowContext] = useState(true);
  // FIB text answer
  const [inputAnswer, setInputAnswer] = useState("");
  // Share copied feedback
  const [copied, setCopied] = useState(false);

  // ── Effects ────────────────────────────────────────────────────────────────

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showQuitDialog) { setShowQuitDialog(false); return; }
        if (step === "question") { setShowQuitDialog(true); return; }
        onClose();
        return;
      }
      if (step === "question" && !loading) {
        const isFIB = currentItem?.type === "FILL_IN_BLANKS" || !!currentItem?.content.scaffold;
        if (!isFIB && currentItem?.content.options) {
          const n = currentItem.content.options.length;
          const num = parseInt(e.key);
          if (!isNaN(num) && num >= 1 && num <= n) setSelectedOption(num - 1);
        }
        if (e.key === "Enter") {
          if (isFIB && inputAnswer.trim()) handleSubmitAnswer();
          else if (!isFIB && selectedOption !== null) handleSubmitAnswer();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentItem, selectedOption, inputAnswer, loading, showQuitDialog, onClose]);

  // Timer
  useEffect(() => {
    if (step === "question" && testStartTime > 0) {
      timerRef.current = setInterval(() => setElapsed(Date.now() - testStartTime), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [step, testStartTime]);

  // Reset option on item change
  useEffect(() => {
    setSelectedOption(null);
    setInputAnswer("");
    setItemStartTime(Date.now());
    setError(null);
    setShowContext(true);
  }, [currentItem?.id]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

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
    setTestStartTime(Date.now());
    setStep("question");
  }, []);

  const handleSubmitAnswer = useCallback(async () => {
    if (!placementId || !currentItem) return;
    const isFIB = currentItem.type === "FILL_IN_BLANKS" || !!currentItem.content.scaffold;
    if (isFIB && !inputAnswer.trim()) return;
    if (!isFIB && selectedOption === null) return;
    const answer = isFIB ? inputAnswer.trim() : selectedOption;
    const latencyMs = Date.now() - itemStartTime;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assessment/placement/${placementId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: currentItem.id, selectedOption: answer, latencyMs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit response");
      if (data.complete) {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
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
  }, [selectedOption, inputAnswer, placementId, currentItem, itemStartTime, itemsAdministered]);

  const handleShareResult = useCallback(async () => {
    if (!result) return;
    const meta = CEFR_LABELS[result.cefrLevel];
    const text = `I just scored ${meta?.label ?? result.cefrLevel} (${meta?.desc ?? ""}) on my free General English Test! Try it free → https://b4skills.com`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My CEFR Result", text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {}
  }, [result]);

  // ── Render: Register ──────────────────────────────────────────────────────

  const renderRegister = () => (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-y-auto">
      <div className="w-full max-w-lg">
        <motion.div
          key="register"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
          className="flex flex-col gap-8"
        >
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[#9b276c] to-[#7d1f57] mb-6 shadow-xl shadow-[#9b276c]/30">
              <Brain size={36} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              General English Test
            </h1>
            <p className="text-slate-500 mt-3 text-base leading-relaxed max-w-sm mx-auto">
              Free · ~10 minutes · CEFR A1–C2 result · Grammar, Vocabulary, Reading &amp; Listening
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Clock size={20} />, val: "~10 min", label: "Duration" },
              { icon: <Zap size={20} />, val: "Adaptive", label: "Algorithm" },
              { icon: <Award size={20} />, val: "A1–C2", label: "CEFR Scale" },
            ].map((s, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center gap-2 text-center">
                <div className="text-[#9b276c]">{s.icon}</div>
                <div className="font-black text-slate-900">{s.val}</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col gap-5 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Emma Johnson"
                  maxLength={100}
                  autoFocus
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9b276c]/30 focus:border-[#9b276c] transition-all"
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Email Address</label>
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
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <button
                type="button"
                onClick={() => setConsent((v) => !v)}
                className={cn(
                  "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
                  consent ? "bg-[#9b276c] border-[#9b276c]" : "border-slate-300 hover:border-[#9b276c]/50"
                )}
                aria-checked={consent}
                role="checkbox"
              >
                {consent && <CheckCircle2 size={11} className="text-white stroke-[3]" />}
              </button>
              <span className="text-xs text-slate-500 leading-relaxed">
                I agree that my anonymised responses may be used to improve the assessment platform (GDPR Art. 6(1)(a)). Your email will not be shared with third parties.
              </span>
            </label>

            {regError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={15} className="flex-shrink-0" />
                {regError}
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full bg-[#9b276c] hover:bg-[#7d1f57] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl h-14 font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#9b276c]/25 hover:shadow-xl"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : (
                <>Start General English Test <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );

  // ── Render: Intro ──────────────────────────────────────────────────────────

  const renderIntro = () => (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-y-auto">
      <div className="w-full max-w-lg">
        <motion.div
          key="intro"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
          className="flex flex-col gap-8"
        >
          <div className="text-center">
            <div className="text-5xl mb-4">👋</div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">Hi {name.split(" ")[0]}, you're all set!</h2>
            <p className="text-slate-500 mt-2 text-base">Here's what to expect in your General English Test.</p>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: <Brain size={22} className="text-[#9b276c]" />,
                bg: "bg-[#fdf2f8] border-[#9b276c]/20",
                title: "Adaptive Questions",
                body: "Each question adjusts to your level in real time — harder when you answer correctly, easier when you don't.",
              },
              {
                icon: <BarChart3 size={22} className="text-indigo-600" />,
                bg: "bg-indigo-50 border-indigo-200",
                title: "8–12 Questions Total",
                body: "The test stops automatically once it has a statistically reliable estimate of your level.",
              },
              {
                icon: <Clock size={22} className="text-blue-600" />,
                bg: "bg-blue-50 border-blue-200",
                title: "No Time Pressure",
                body: "There's no countdown per question. Read carefully and answer when you're ready.",
              },
              {
                icon: <Star size={22} className="text-amber-500" />,
                bg: "bg-amber-50 border-amber-200",
                title: "Covers 4 Skills",
                body: "Reading, Grammar, Vocabulary, and Listening. Give each question your best effort.",
              },
              {
                icon: <Shield size={22} className="text-green-600" />,
                bg: "bg-green-50 border-green-200",
                title: "Keyboard Shortcuts",
                body: "Press 1–4 to select an option, Enter to confirm. Esc opens a quit prompt.",
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className={cn("flex items-start gap-4 border rounded-2xl p-4", card.bg)}
              >
                <div className="flex-shrink-0 mt-0.5">{card.icon}</div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{card.title}</div>
                  <div className="text-slate-500 text-sm leading-relaxed mt-0.5">{card.body}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <button
            onClick={handleStartTest}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-14 font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            I'm Ready — Begin Test <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    </div>
  );

  // ── Render: Question ───────────────────────────────────────────────────────

  const renderQuestion = () => {
    if (!currentItem) return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Loader2 size={36} className="animate-spin text-[#9b276c]" />
        <p className="text-slate-500 font-medium">Loading your next question…</p>
      </div>
    );

    const content = currentItem.content;
    const hasPassage = !!content.passage;
    const hasAudio = !!content.audioUrl;
    const hasImage = !!content.imageUrl;
    const isFIB = currentItem.type === "FILL_IN_BLANKS" || !!content.scaffold;
    const hasContext = hasPassage || hasAudio || hasImage;
    const opts = content.options ?? [];
    const progressPct = Math.min(100, (itemsAdministered / maxItems) * 100);

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-100 flex-shrink-0">
          <motion.div
            className="h-full bg-[#9b276c]"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        <div className={cn(
          "flex-1 overflow-hidden",
          hasContext ? "flex flex-col lg:flex-row" : "flex justify-center overflow-y-auto"
        )}>
          {/* ── Context panel (passage / audio / image) ── */}
          {hasContext && (
            <div className={cn(
              "lg:w-[44%] xl:w-[40%] flex-shrink-0 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto",
              !showContext && "hidden lg:block"
            )}>
              <div className="p-6 md:p-8 space-y-6">
                {hasAudio && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase tracking-wider mb-3">
                      <Headphones size={13} /> Listening Exercise
                    </div>
                    <div className="bg-white border border-purple-200 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Volume2 size={18} className="text-white" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Audio Clip</div>
                          <div className="text-xs text-slate-400">You may listen as many times as you need</div>
                        </div>
                      </div>
                      <audio controls src={content.audioUrl} className="w-full" preload="metadata" />
                    </div>
                  </div>
                )}

                {hasPassage && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                      <BookOpen size={13} /> Reading Passage
                    </div>
                    <div className="bg-white border border-blue-100 rounded-2xl p-5">
                      <p className="text-[15px] text-slate-700 leading-[1.8] whitespace-pre-wrap">
                        {content.passage}
                      </p>
                    </div>
                  </div>
                )}

                {hasImage && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      <Image size={13} /> Visual Context
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                      <img
                        src={content.imageUrl}
                        alt="Question visual context"
                        className="w-full object-contain max-h-72"
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Question panel ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0, x: hasContext ? 20 : 0, y: hasContext ? 0 : 12 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: hasContext ? -20 : 0, y: hasContext ? 0 : -12 }}
              transition={{ duration: 0.22 }}
              className={cn("overflow-y-auto", hasContext ? "flex-1" : "w-full max-w-2xl")}
            >
              {/* Mobile: show/hide context panel */}
              {hasContext && (
                <div className="lg:hidden px-6 pt-5">
                  <button
                    onClick={() => setShowContext(v => !v)}
                    className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 w-full hover:bg-slate-100 transition-colors"
                  >
                    <ChevronDown size={13} className={cn("transition-transform duration-200", showContext && "-rotate-180")} />
                    {showContext ? "Hide" : "Show"} {hasAudio ? "audio" : hasImage ? "image" : "passage"}
                  </button>
                </div>
              )}

              <div className="p-6 md:p-8 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <SkillBadge skill={currentItem.skill} />
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Q {itemsAdministered + 1}</span>
                    <span className="text-slate-200">·</span>
                    <span>up to {maxItems}</span>
                  </div>
                </div>

                {content.prompt && (
                  <p className="text-lg md:text-xl font-semibold text-slate-900 leading-snug">
                    {content.prompt}
                  </p>
                )}

                {/* Fill-in-the-blank */}
                {isFIB && content.scaffold && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <p className="text-base text-slate-700 leading-relaxed">
                      {content.scaffold.split("___").map((part, i, arr) => (
                        <React.Fragment key={i}>
                          {part}
                          {i < arr.length - 1 && (
                            <span className={cn(
                              "inline-block min-w-[80px] border-b-2 px-2 mx-1 text-center font-bold transition-colors",
                              inputAnswer ? "border-[#9b276c] text-[#9b276c]" : "border-slate-400 text-slate-400"
                            )}>
                              {inputAnswer || "···"}
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </p>
                  </div>
                )}
                {isFIB && (
                  <input
                    type="text"
                    value={inputAnswer}
                    onChange={(e) => setInputAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && inputAnswer.trim() && handleSubmitAnswer()}
                    placeholder="Type your answer here…"
                    disabled={loading}
                    autoFocus
                    maxLength={200}
                    className="w-full border-2 border-slate-200 focus:border-[#9b276c] rounded-xl px-4 py-3.5 text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9b276c]/20 transition-all disabled:opacity-50"
                  />
                )}

                {!isFIB && opts.length > 0 && (
                  <div className="space-y-3">
                    {opts.map((opt, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={!loading ? { scale: 1.007 } : {}}
                        whileTap={!loading ? { scale: 0.993 } : {}}
                        onClick={() => !loading && setSelectedOption(idx)}
                        disabled={loading}
                        className={cn(
                          "w-full text-left px-5 py-4 rounded-2xl border-2 text-sm font-medium transition-all duration-150 flex items-center gap-4",
                          selectedOption === idx
                            ? "border-[#9b276c] bg-[#fdf2f8] text-[#9b276c] shadow-md shadow-[#9b276c]/10"
                            : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 bg-white",
                          loading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span className={cn(
                          "flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black transition-all",
                          selectedOption === idx ? "bg-[#9b276c] text-white" : "bg-slate-100 text-slate-500"
                        )}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1 leading-snug">{opt}</span>
                        {selectedOption === idx && (
                          <CheckCircle2 size={17} className="flex-shrink-0 text-[#9b276c]" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}

                {!isFIB && opts.length > 0 && (
                  <p className="text-[11px] text-slate-400 text-center">
                    Press{" "}
                    {opts.map((_, i) => (
                      <span key={i}>
                        <kbd className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 text-[10px]">{i + 1}</kbd>
                        {i < opts.length - 1 ? " " : ""}
                      </span>
                    ))}
                    {" "}to select · <kbd className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 text-[10px]">Enter</kbd> to submit
                  </p>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmitAnswer}
                  disabled={(isFIB ? !inputAnswer.trim() : selectedOption === null) || loading}
                  className={cn(
                    "w-full rounded-2xl h-14 font-black text-base flex items-center justify-center gap-2 transition-all",
                    (isFIB ? !!inputAnswer.trim() : selectedOption !== null) && !loading
                      ? "bg-[#9b276c] hover:bg-[#7d1f57] text-white shadow-lg shadow-[#9b276c]/25"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Analysing your answer…</>
                  ) : (
                    <>Submit Answer <ChevronRight size={18} /></>
                  )}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  };

  // ── Render: Result ─────────────────────────────────────────────────────────

  const renderResult = () => {
    if (!result) return null;
    const cefrKey = result.cefrLevel as CefrLevel;
    const colors = CEFR_COLORS[cefrKey] ?? CEFR_COLORS.B1;
    const meta = CEFR_LABELS[cefrKey] ?? { label: cefrKey, desc: "", tagline: "" };
    const minutes = Math.max(1, Math.round(result.completionMs / 60_000));
    const [, ciLow, ciHigh] = result.cefrConfidenceInterval;
    const scaleIdx = CEFR_SCALE.indexOf(cefrKey as CefrLevel);
    const ciLeftPct = Math.max(0, ((ciLow + 4.5) / 9) * 100);
    const ciRightPct = Math.max(0, 100 - ((ciHigh + 4.5) / 9) * 100);
    const thetaPct = Math.max(0, Math.min(100, ((result.theta + 4.5) / 9) * 100));

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col lg:flex-row">

          {/* ── Left: CEFR hero ── */}
          <div className="lg:w-2/5 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col items-center justify-center p-8 md:p-12 text-center gap-6">
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.15 }}
              className={cn(
                "w-44 h-44 rounded-[2.5rem] border-4 flex flex-col items-center justify-center shadow-2xl",
                colors.bg, colors.border
              )}
              style={{ boxShadow: `0 20px 60px ${colors.accent}40` }}
            >
              <span className={cn("text-5xl font-black tracking-tight", colors.text)}>{meta.label}</span>
              <span className={cn("text-xs font-bold uppercase tracking-wider mt-1", colors.text)}>{meta.desc}</span>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <h2 className="text-2xl font-black text-slate-900">Your estimated level</h2>
              <p className="text-slate-500 mt-1 text-sm leading-relaxed max-w-xs">{meta.tagline}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-5 text-sm text-slate-500"
            >
              <div className="flex items-center gap-1.5">
                <BarChart3 size={15} className="text-[#9b276c]" />
                <span className="font-bold">{result.itemsAdministered} questions</span>
              </div>
              <span className="text-slate-200">·</span>
              <div className="flex items-center gap-1.5">
                <Clock size={15} className="text-[#9b276c]" />
                <span className="font-bold">~{minutes} min</span>
              </div>
            </motion.div>
          </div>

          {/* ── Right: Details ── */}
          <div className="flex-1 p-6 md:p-10 flex flex-col gap-6">

            {/* CEFR bar chart */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Your Position on the CEFR Scale</div>
              <div className="flex items-end gap-1.5 h-14">
                {CEFR_SCALE.map((level, i) => {
                  const isResult = i === scaleIdx;
                  const isPast = i < scaleIdx;
                  const heightPx = isResult ? 56 : isPast ? 36 : 20;
                  return (
                    <div key={level} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: heightPx }}
                        transition={{ delay: i * 0.07, duration: 0.4, ease: "easeOut" }}
                        className={cn(
                          "w-full rounded-t-md",
                          isResult ? "bg-[#9b276c]" : isPast ? "bg-[#9b276c]/30" : "bg-slate-200"
                        )}
                      />
                      <span className={cn(
                        "text-[10px] font-bold",
                        isResult ? "text-[#9b276c]" : "text-slate-400"
                      )}>
                        {CEFR_LABELS[level]?.label ?? level}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Confidence interval */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">90% Confidence Interval</span>
                <span className="text-xs font-mono text-slate-500 font-bold">θ = {result.theta.toFixed(2)} · SEM = {result.sem.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-500 w-10 text-right text-xs">{ciLow.toFixed(1)}</span>
                <div className="flex-1 h-3 bg-slate-200 rounded-full relative">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="absolute h-full rounded-full"
                    style={{
                      left: `${ciLeftPct}%`,
                      right: `${ciRightPct}%`,
                      backgroundColor: `${colors.accent}40`,
                      border: `2px solid ${colors.accent}60`,
                    }}
                  />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7, type: "spring", bounce: 0.5 }}
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md"
                    style={{
                      left: `calc(${thetaPct}% - 8px)`,
                      backgroundColor: colors.accent,
                    }}
                  />
                </div>
                <span className="font-bold text-slate-500 w-10 text-xs">{ciHigh.toFixed(1)}</span>
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Your true level falls within this range with 90% confidence.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Questions", val: String(result.itemsAdministered), icon: <BarChart3 size={18} /> },
                { label: "Duration",  val: `~${minutes}m`,                    icon: <Clock size={18} /> },
                { label: "Precision", val: `${Math.max(0, Math.round((1 - result.sem) * 100))}%`, icon: <TrendingUp size={18} /> },
              ].map((s, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center gap-2 text-center">
                  <div className="text-[#9b276c]">{s.icon}</div>
                  <div className="font-black text-slate-900 text-xl">{s.val}</div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Upgrade CTA */}
            <div className="bg-gradient-to-br from-[#9b276c] to-[#7d1f57] rounded-3xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap size={22} />
                </div>
                <div className="flex-1">
                  <div className="font-black text-lg mb-1">Get your official CEFR certificate</div>
                  <p className="text-white/80 text-sm leading-relaxed mb-4">
                    Unlock a full 4-skill assessment covering Speaking &amp; Writing with a certified CEFR report recognised by employers and universities.
                  </p>
                  <a
                    href={result.upgradePrompt.callToActionUrl}
                    className="inline-flex items-center gap-2 bg-white text-[#9b276c] font-black text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors shadow-lg"
                  >
                    Start Full Assessment <ArrowRight size={15} />
                  </a>
                </div>
              </div>
            </div>

            <button
              onClick={handleShareResult}
              className="w-full bg-white border-2 border-slate-200 hover:border-[#9b276c]/40 text-slate-700 hover:text-[#9b276c] rounded-xl h-12 font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              {copied
                ? <><CheckCircle2 size={16} className="text-green-500" /> Copied to clipboard!</>
                : <><Share2 size={16} /> Share My Result</>
              }
            </button>

            <button
              onClick={onClose}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl h-12 font-bold text-sm transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Layout ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">

      {/* ── Top header ── */}
      <header className="flex-shrink-0 border-b border-slate-100 bg-white/98 px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#9b276c] text-white font-black text-sm px-2.5 py-1 -skew-x-6 rounded-sm tracking-tight select-none">
            b4skills
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
            General English Test
          </span>
        </div>

        <div className="flex items-center gap-3">
          {step !== "result" && <StepDots step={step} />}

          {step === "question" && elapsed > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <Clock size={11} /> {formatTime(elapsed)}
            </div>
          )}

          <button
            onClick={() => step === "question" ? setShowQuitDialog(true) : onClose()}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={15} className="text-slate-600" />
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {step === "register" && (
            <motion.div key="reg" className="flex-1 flex flex-col overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {renderRegister()}
            </motion.div>
          )}
          {step === "intro" && (
            <motion.div key="intro" className="flex-1 flex flex-col overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {renderIntro()}
            </motion.div>
          )}
          {step === "question" && (
            <motion.div key="q" className="flex-1 flex flex-col overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {renderQuestion()}
            </motion.div>
          )}
          {step === "result" && (
            <motion.div key="res" className="flex-1 flex flex-col overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {renderResult()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Confirm quit dialog ── */}
      <AnimatePresence>
        {showQuitDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full flex flex-col gap-5"
            >
              <div className="text-center">
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-xl font-black text-slate-900">Quit the test?</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  Your progress will be lost. You'll need to start a new session to get your CEFR estimate.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQuitDialog(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl h-12 font-bold text-sm transition-all"
                >
                  Continue Test
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl h-12 font-bold text-sm transition-all"
                >
                  Quit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};










