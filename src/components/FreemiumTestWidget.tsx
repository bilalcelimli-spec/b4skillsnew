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
  /** [ciLow, ciHigh] in theta units (90% CI) */
  cefrConfidenceInterval: [number, number];
  /** Human-readable CEFR range, e.g. "A2–B1" */
  cefrRange?: string;
  itemsAdministered: number;
  completionMs: number;
  skillBreakdown?: Record<string, { total: number; correct: number }>;
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

function thetaToCefrClient(theta: number): string {
  if (theta >= 2.5) return "C2";
  if (theta >= 1.5) return "C1";
  if (theta >= 0.5) return "B2";
  if (theta >= -0.5) return "B1";
  if (theta >= -1.75) return "A2";
  if (theta >= -3.0) return "A1";
  return "PRE_A1";
}

const CEFR_CAN_DO: Record<string, string[]> = {
  PRE_A1: [
    "Recognise a few familiar words in English",
    "Copy simple words and short sentences",
    "Understand very simple instructions with visual support",
  ],
  A1: [
    "Introduce myself and ask basic personal questions",
    "Understand and use familiar everyday expressions",
    "Interact in a very simple way when people speak slowly and clearly",
    "Read and understand simple notices, menus, and timetables",
  ],
  A2: [
    "Communicate in simple, routine tasks on familiar topics",
    "Describe my background, environment, and personal needs",
    "Understand sentences and frequently-used expressions in everyday areas",
    "Read short, simple texts to find specific information",
    "Write short, simple notes and personal messages",
  ],
  B1: [
    "Deal with most situations while travelling in an English-speaking area",
    "Describe experiences, events, dreams, hopes, and ambitions",
    "Understand the main points of clear standard speech on familiar matters",
    "Read straightforward texts on subjects related to my field",
    "Produce connected text on familiar or personal interest topics",
  ],
  B2: [
    "Interact with fluency and spontaneity with native speakers",
    "Understand the main ideas of complex text on concrete and abstract topics",
    "Read articles and reports concerned with contemporary problems",
    "Produce clear, detailed text on a wide range of subjects",
    "Explain a viewpoint on a topical issue giving advantages and disadvantages",
  ],
  C1: [
    "Express ideas fluently and spontaneously without much searching",
    "Use language flexibly for social, academic, and professional purposes",
    "Understand a wide range of demanding, longer texts",
    "Produce clear, well-structured, detailed text on complex subjects",
    "Follow extended speech even when it is not clearly structured",
  ],
  C2: [
    "Understand virtually everything I hear or read with ease",
    "Summarise information from different spoken and written sources",
    "Express myself spontaneously, very fluently and precisely",
    "Distinguish finer shades of meaning in complex situations",
    "Convey precise meaning in a nuanced and effortless manner",
  ],
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

const AudioPlayer: React.FC<{ src: string }> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [listenCount, setListenCount] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().catch(() => {}); setPlaying(true); }
  };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="bg-white border border-purple-200 rounded-2xl p-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onEnded={() => {
          setPlaying(false); setListenCount(c => c + 1); setProgress(0);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
        onTimeUpdate={() => { const a = audioRef.current; if (a?.duration) setProgress(a.currentTime / a.duration); }}
        onLoadedMetadata={() => { const a = audioRef.current; if (a) setDuration(a.duration); }}
      />
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
            playing ? "bg-purple-600 hover:bg-purple-700" : "bg-purple-100 hover:bg-purple-200"
          )}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing
            ? <span className="flex gap-1">{[0, 1].map(i => <span key={i} className="w-1 h-4 bg-white rounded-full" />)}</span>
            : <Volume2 size={20} className="text-purple-600" />
          }
        </button>
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-400">
            <span>Audio Clip{listenCount > 0 ? ` (×${listenCount} played)` : ""}</span>
            {duration > 0 && <span className="font-mono">{fmt(progress * duration)} / {fmt(duration)}</span>}
          </div>
          <div
            className="h-2 bg-purple-100 rounded-full cursor-pointer"
            onClick={(e) => {
              const a = audioRef.current;
              if (!a?.duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              a.currentTime = pct * a.duration;
              setProgress(pct);
            }}
          >
            <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="text-[10px] text-slate-400">You may listen as many times as you need</p>
        </div>
      </div>
    </div>
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
  const [maxItems, setMaxItems] = useState(30);
  const [itemsAdministered, setItemsAdministered] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer
  const [testStartTime, setTestStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [itemStartTime, setItemStartTime] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitHandlerRef = useRef<((opt?: number | string) => void) | null>(null);

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
  // Live CEFR band during test
  const [currentBand, setCurrentBand] = useState<string | null>(null);
  // Skills seen so far (for progress tracker)
  const [skillsSeen, setSkillsSeen] = useState<string[]>([]);
  // MCQ auto-advance (800 ms after selection)
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  // Speaking recording
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [speakingAudioUrl, setSpeakingAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speakingChunksRef = useRef<Blob[]>([]);
  const currentItemRef = useRef<any>(null);

  // Sync ref for item-scoped callbacks
  useEffect(() => { currentItemRef.current = currentItem; }, [currentItem]);

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
          if (!isNaN(num) && num >= 1 && num <= n) handleSelectOption(num - 1);
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
    setAutoAdvancing(false);
    setIsRecording(false);
    setHasRecording(false);
    setSpeakingAudioUrl(null);
    speakingChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
        // The stream tracks are handled in the onstop event of that recorder
      } catch (err) {
        console.error("Cleanup stop error:", err);
      }
    }
    mediaRecorderRef.current = null;
    if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setMaxItems(data.maxItems ?? 30);
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

  const handleSubmitAnswer = useCallback(async (explicitOption?: number | string) => {
    if (!placementId || !currentItem) return;
    // Cancel any pending auto-advance to prevent double-submit
    if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    setAutoAdvancing(false);
    const isFIB = currentItem.type === "FILL_IN_BLANKS" || !!currentItem.content.scaffold;
    const isSpeaking = currentItem.skill === "SPEAKING" && !isFIB && (currentItem.content.options ?? []).length === 0;
    if (isFIB && !inputAnswer.trim()) return;
    if (isSpeaking && !hasRecording) return;
    const answer = isFIB
      ? inputAnswer.trim()
      : isSpeaking
        ? "speaking_recorded"
        : (explicitOption !== undefined ? explicitOption : selectedOption);
    if (!isFIB && !isSpeaking && (answer === null || answer === undefined)) return;
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
        if (data.currentCefrBand) setCurrentBand(data.currentCefrBand);
        if (data.nextItem?.skill) setSkillsSeen(prev => [...prev, data.nextItem.skill]);
        setCurrentItem(data.nextItem);
        setItemStartTime(Date.now());
      }
    } catch (err: any) {
      setError(err.message ?? "Connection error. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedOption, inputAnswer, placementId, currentItem, itemStartTime, itemsAdministered, hasRecording]);

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

  // Keep ref in sync so auto-advance setTimeout always calls the latest handler
  submitHandlerRef.current = handleSubmitAnswer;

  const handleSelectOption = useCallback((idx: number) => {
    if (loading) return;
    setAutoAdvancing(false);
    if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    setSelectedOption(idx);
    setAutoAdvancing(true);
    autoAdvanceRef.current = setTimeout(() => {
      setAutoAdvancing(false);
      submitHandlerRef.current?.(idx);
    }, 800);
  }, [loading]);

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
              Free · ~20–30 minutes · CEFR A1–C2 result · Grammar, Vocabulary, Reading &amp; Listening
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Clock size={20} />, val: "~25 min", label: "Duration" },
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
                title: "10–30 Adaptive Questions",
                body: "The test stops automatically once it has a statistically precise estimate of your level (SEM ≤ 0.35).",
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
    const opts = (content.options ?? []).map((o: any) =>
      typeof o === "string" ? o : String(o?.text ?? o)
    );
    const progressPct = step === "result" ? 100 : Math.min(95, (itemsAdministered / maxItems) * 100);

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
                    <AudioPlayer key={currentItem.id} src={content.audioUrl!} />
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SkillBadge skill={currentItem.skill} />
                    {currentBand && itemsAdministered >= 5 && (
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border",
                        CEFR_COLORS[currentBand]?.bg ?? "bg-slate-100",
                        CEFR_COLORS[currentBand]?.text ?? "text-slate-600",
                        CEFR_COLORS[currentBand]?.border ?? "border-slate-300",
                      )}>
                        ≈ {CEFR_LABELS[currentBand]?.label ?? currentBand}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1">
                      {([
                      "GRAMMAR", "VOCABULARY", "READING", "LISTENING", "SPEAKING", "WRITING",
                    ] as const).map(skill => {
                        const count = skillsSeen.filter(s => s === skill).length;
                        if (!count) return null;
                        const m = SKILL_META[skill];
                        return (
                          <div key={skill} title={`${skill}: ${count}`}
                            className={cn("w-5 h-5 rounded-full flex items-center justify-center", m.bg)}>
                            <span className={m.color}>{m.icon}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-xs font-bold text-slate-400">Q {itemsAdministered + 1}</div>
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

                {/* ── Speaking recorder ── */}
                {currentItem.skill === "SPEAKING" && !isFIB && opts.length === 0 && (
                  <div className="flex flex-col items-center gap-5 py-4">
                    <div className={cn(
                      "relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300",
                      isRecording
                        ? "bg-rose-100 ring-4 ring-rose-300 ring-offset-4 animate-pulse"
                        : hasRecording
                          ? "bg-green-100 ring-4 ring-green-300 ring-offset-4"
                          : "bg-rose-50 hover:bg-rose-100"
                    )}>
                      <button
                        onClick={async () => {
                          if (!currentItem) return;
                          const currentItemId = currentItem.id;
                          if (isRecording) {
                            mediaRecorderRef.current?.stop();
                            setIsRecording(false);
                            // Mark recording as ready immediately — don't wait for async onstop
                            setHasRecording(true);
                          } else {
                            try {
                              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                              
                              const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                                ? 'audio/webm;codecs=opus' 
                                : MediaRecorder.isTypeSupported('audio/webm') 
                                  ? 'audio/webm' 
                                  : 'audio/mp4';

                              const mr = new MediaRecorder(stream, { mimeType });
                              mediaRecorderRef.current = mr;
                              speakingChunksRef.current = [];
                              
                              mr.ondataavailable = (e) => { 
                                if (e.data.size > 0) speakingChunksRef.current.push(e.data); 
                              };
                              
                              mr.onstop = () => {
                                stream.getTracks().forEach(t => t.stop());
                                const blob = new Blob(speakingChunksRef.current, { type: mimeType });
                                // Update audio URL regardless of item guard so playback works;
                                // hasRecording is already set synchronously by the stop-button click.
                                if (blob.size > 0) {
                                  setSpeakingAudioUrl(URL.createObjectURL(blob));
                                }
                              };

                              mr.onerror = (e: any) => {
                                console.error("Recorder error:", e);
                                setError("Recording error: " + (e.message || "Unknown error"));
                                setIsRecording(false);
                              };

                              mr.start(100); // 100 ms timeslice ensures ondataavailable fires for short recordings
                              setIsRecording(true);
                              setHasRecording(false);
                              setSpeakingAudioUrl(null);
                            } catch (err: any) {
                              console.error("Recording error:", err);
                              setError(err.name === "NotAllowedError" 
                                ? "Microphone access denied. Please allow microphone access in your browser settings."
                                : `Recording error: ${err.message || "Could not start camera/microphone"}`
                              );
                            }
                          }
                        }}
                        disabled={loading}
                        aria-label={isRecording ? "Stop recording" : "Start recording"}
                        className="flex items-center justify-center w-full h-full rounded-full focus:outline-none"
                      >
                        {isRecording
                          ? <span className="w-7 h-7 bg-rose-600 rounded-sm" />
                          : <Mic size={36} className={hasRecording ? "text-green-600" : "text-rose-600"} />
                        }
                      </button>
                    </div>

                    <p className="text-sm font-semibold text-slate-600 text-center">
                      {isRecording
                        ? "Recording… tap the square to stop."
                        : hasRecording
                          ? "Recording saved. Listen back or submit."
                          : "Tap the microphone to start recording."}
                    </p>

                    {speakingAudioUrl && (
                      <audio controls src={speakingAudioUrl} className="w-full max-w-xs rounded-xl" />
                    )}
                  </div>
                )}

                {!isFIB && opts.length > 0 && (
                  <div className="space-y-3">
                    {opts.map((opt, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={!loading ? { scale: 1.007 } : {}}
                        whileTap={!loading ? { scale: 0.993 } : {}}
                        onClick={() => handleSelectOption(idx)}
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
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
                      <AlertCircle size={15} className="flex-shrink-0" />
                      {error}
                    </div>
                    <button
                      onClick={() => handleSubmitAnswer()}
                      disabled={loading}
                      className="self-start text-xs font-bold text-red-600 hover:text-red-700 underline underline-offset-2 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <button
                  onClick={() => handleSubmitAnswer()}
                  disabled={(isFIB ? !inputAnswer.trim() : (currentItem.skill === "SPEAKING" && !isFIB && opts.length === 0) ? !hasRecording : selectedOption === null) || loading || isRecording}
                  className={cn(
                    "w-full rounded-2xl h-14 font-black text-base flex items-center justify-center gap-2 transition-all relative overflow-hidden",
                    (isFIB ? !!inputAnswer.trim() : (currentItem.skill === "SPEAKING" && !isFIB && opts.length === 0) ? hasRecording : selectedOption !== null) && !loading && !isRecording
                      ? "bg-[#9b276c] hover:bg-[#7d1f57] text-white shadow-lg shadow-[#9b276c]/25"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  {autoAdvancing && !loading && (
                    <motion.div
                      className="absolute inset-0 bg-white/20 origin-left"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.8, ease: "linear" }}
                    />
                  )}
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Analysing your answer…</>
                  ) : autoAdvancing ? (
                    <><ChevronRight size={18} className="animate-pulse" /> Submitting…</>
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
    const [ciLow, ciHigh] = result.cefrConfidenceInterval;
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
                <span className="text-xs font-mono text-slate-500 font-bold">
                  {result.cefrRange ?? `${ciLow.toFixed(1)}–${ciHigh.toFixed(1)}`} · SEM={result.sem.toFixed(2)}
                </span>
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

            {/* Can-do statements */}
            {CEFR_CAN_DO[cefrKey] && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">What You Can Do at This Level</div>
                <ul className="space-y-2">
                  {CEFR_CAN_DO[cefrKey].map((stmt, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.07 }}
                      className="flex items-start gap-2.5 text-sm text-slate-700"
                    >
                      <CheckCircle2 size={14} className={cn("flex-shrink-0 mt-0.5", colors.text)} />
                      <span>{stmt}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skill breakdown */}
            {result.skillBreakdown && Object.keys(result.skillBreakdown).length > 0 && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Performance by Skill</div>
                <div className="space-y-3">
                  {Object.entries(result.skillBreakdown).map(([skill, data]) => {
                    const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                    const m = SKILL_META[skill] ?? { color: "text-slate-600", bg: "bg-slate-100", icon: null };
                    return (
                      <div key={skill}>
                        <div className="flex items-center justify-between mb-1">
                          <div className={cn("flex items-center gap-1.5 text-xs font-bold", m.color)}>
                            {m.icon} {skill.charAt(0) + skill.slice(1).toLowerCase()}
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-500">{data.correct}/{data.total} correct</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: colors.accent }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Questions", val: String(result.itemsAdministered), icon: <BarChart3 size={18} /> },
                { label: "Duration",  val: `~${minutes}m`,                    icon: <Clock size={18} /> },
                { label: "Precision", val: `${Math.min(100, Math.max(0, Math.round((1 - Math.min(result.sem, 1)) * 100)))}%`, icon: <TrendingUp size={18} /> },
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










