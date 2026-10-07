import { OzgunKidsPlayer } from "./OzgunKidsPlayer";
import { OZGUN_PRODUCT } from "../lib/fixed-forms/ozgun-kids";
import { ExitAssessmentControl } from "./ExitAssessmentControl";
import React, { useState, useEffect } from "react";
import { Item } from "../lib/assessment-engine/types";
import { ItemRenderer } from "./ItemRenderer";
import { writingDraftKey } from "../lib/assessment-engine/writing-draft";
import { requestNextItem } from "../lib/assessment-engine/next-item-request";
import { ProctoringMonitor } from "./ProctoringMonitor";
import { ProctoringEventType } from "../lib/proctoring/proctoring-service";
import { proctoringEventPayload } from "../lib/proctoring/event-protocol";
import { Card, CardContent, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { 
  Clock, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CandidateFeedback } from "./CandidateFeedback";
import { PracticeMode } from "./PracticeMode";
import { FaceCapture } from "./FaceCapture";
import { useTranslation } from "react-i18next";
import "../lib/i18n/config";

interface TestPlayerProps {
  organizationId: string;
  candidateId: string;
  productLine?: string;
  startingSkill?: string;
  initialSessionId?: string;
  onSessionStarted?: (sessionId: string) => void;
  onComplete: (finalTheta: number | null, sessionId: string) => void;
  onCancel?: () => void;
}

const AdaptiveTestPlayer: React.FC<TestPlayerProps> = ({ organizationId, candidateId, productLine, startingSkill, initialSessionId, onSessionStarted, onComplete, onCancel }) => {
  const { t } = useTranslation();
  const [fixedSession, setFixedSession] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  // Elapsed time is tracked locally and reconciled with the server response.
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // maxDurationMs: server-enforced safety-net ceiling received on launch.
  // The client displays the remaining portion, while the server remains authoritative.
  const [maxDurationMs, setMaxDurationMs] = useState<number>(5_400_000); // 90 min default
  const sessionStartRef = React.useRef<number>(Date.now());
  const [showInsights, setShowInsights] = useState(false);
  const [statusError, setStatusError] = useState(false);
  const activeRef = React.useRef(true);
  useEffect(() => { activeRef.current = true; return () => { activeRef.current = false; }; }, []);
  const [itemFeedback, setItemFeedback] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'success' | 'error'>('idle');
  const [showPractice, setShowPractice] = useState(true);
  const [showFaceCapture, setShowFaceCapture] = useState(true);
  // True once /api/sessions/launch resolves — gates FaceCapture so it always
  // gets the real sessionId, never the "pre-session" fallback.
  const [sessionReady, setSessionReady] = useState(false);
  const [sectionTransition, setSectionTransition] = useState<{ completedSection: string; nextSection: string; sectionIndex: number; totalSections: number } | null>(null);
  const [currentSection, setCurrentSection] = useState<string>('VOCABULARY');
  const [sectionIndex, setSectionIndex] = useState<number>(0);
  // Restore per-section answer counts from persisted server responses.
  const [sectionCounts, setSectionCounts] = useState<Record<string, number>>({});
  const exitControl = onCancel ? <ExitAssessmentControl floating={showFaceCapture || showPractice || !!error} disabled={submitting || (!sessionReady && !error)} onExit={() => {
    activeRef.current = false;
    onCancel();
  }} /> : null;
  const responseStartTime = React.useRef<number>(Date.now());
  // Prevent concurrent fetchNextItem calls (race condition from section-transition
  // "Continue manually" button being clicked while the loop is still in-flight).
  const isFetchingNextRef = React.useRef(false);

  // Update stable reading passage when item changes.
  // Only calls setActivePassage when the passage text actually differs so
  // consecutive items with the same passage don't re-mount the left column.
  React.useEffect(() => {
    if (!currentItem) { setActivePassage(null); return; }
    if (currentItem.skill !== "READING") { setActivePassage(null); return; }
    const p = (currentItem as any).content?.passage as string | undefined;
    if (p) {
      setActivePassage(prev => (prev === p ? prev : p));
    } else {
      setActivePassage(null);
    }
  }, [currentItem?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Default section list — overwritten by the server's sectionOrder field
  // on /api/sessions/launch response. Kept as a sane fallback so the UI
  // renders something coherent even if the server payload is missing the field.
  const DEFAULT_SECTION_ORDER = ['VOCABULARY', 'GRAMMAR', 'READING', 'LISTENING', 'WRITING', 'SPEAKING'];
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  // Stable reading passage: only updates when the passage text actually changes.
  // Stays constant across consecutive items that share the same passage so the
  // left column doesn't re-mount and loses its scroll position.
  const [activePassage, setActivePassage] = useState<string | null>(null);
  const SECTION_LABELS: Record<string, string> = {
    VOCABULARY: 'Vocabulary',
    GRAMMAR: 'Grammar',
    LISTENING: 'Listening',
    READING: 'Reading',
    WRITING: 'Writing',
    SPEAKING: 'Speaking',
  };
  const SECTION_COLORS: Record<string, string> = {
    VOCABULARY: 'bg-pink-500',
    GRAMMAR: 'bg-violet-500',
    LISTENING: 'bg-cyan-500',
    READING: 'bg-blue-500',
    WRITING: 'bg-emerald-500',
    SPEAKING: 'bg-amber-500',
  };

  const launchStarted = React.useRef(false);
  // StrictMode replays effects in development; a launch must create one attempt.
  useEffect(() => {
    if (launchStarted.current) return;
    launchStarted.current = true;
    const launch = async () => {
      try {
        if (initialSessionId) {
          const statusRes = await fetch(`/api/sessions/${encodeURIComponent(initialSessionId)}/status`, { credentials: "include" });
          const existing = await statusRes.json();
          if (!activeRef.current) return;
          if (!statusRes.ok) throw new Error(existing.error ?? "Could not resume assessment");
          if (existing.sessionType === 'FIXED_FORM') {setSessionId(initialSessionId);setFixedSession(true);setLoading(false);return;}
          if (existing.status === "COMPLETED") { onComplete(existing.theta ?? null, initialSessionId); return; }
          if (existing.status !== "IN_PROGRESS") throw new Error("This assessment cannot be resumed in its current state");
          setSessionId(initialSessionId);
          setSessionReady(true);
          setShowPractice(false);
          if (typeof existing.maxDurationMs === "number") setMaxDurationMs(existing.maxDurationMs);
          if (Array.isArray(existing.sectionOrder)) setSectionOrder(existing.sectionOrder);
          sessionStartRef.current = existing.startedAt ? new Date(existing.startedAt).getTime() : Date.now();
          fetchNextItem(initialSessionId);
          return;
        }
        const res = await fetch("/api/sessions/launch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ candidateId, organizationId, productLine, ...(startingSkill ? { startingSkill } : {}) })
        });
        const data = await res.json();
        
        if (!activeRef.current) return;
        if (!res.ok || data.error) {
          throw new Error(data.error || "Launch failed");
        }
        
        setSessionId(data.sessionId);
        onSessionStarted?.(data.sessionId);
        setSessionReady(true);
        if (typeof data.maxDurationMs === "number") {
          setMaxDurationMs(data.maxDurationMs);
        }
        // Server is authoritative for the section breadcrumb — keeps the UI
        // in lockstep with the active product-line profile (Primary, Junior,
        // 15-Min Diagnostic, Academia, etc.). Falls back to DEFAULT_SECTION_ORDER
        // if the field is absent.
        if (Array.isArray(data.sectionOrder) && data.sectionOrder.length > 0) {
          setSectionOrder(data.sectionOrder);
        }
        sessionStartRef.current = Date.now();
        fetchNextItem(data.sessionId);
      } catch (err: any) {
        const raw = err?.message || "Unknown error";
        const msg = raw === "exam_code_required"
          ? "A valid exam code is required to start this assessment."
          : `Assessment could not start: ${raw}`;
        setError(msg);
        setLoading(false);
      }
    };
    launch();
  }, []);

  // Elapsed time counter — counts up from 0. The exam ends when the server
  // signals stop (psychometric criteria met) or TIME_LIMIT_EXCEEDED.
  // No client-side hard stop based on time.
  useEffect(() => {
    if (loading || !sessionId || finished) return;
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, sessionId, finished]);

  // Applies the result of a /next fetch to state (shared between normal flow and pre-fetched transition)
  const applyNextData = (data: any, sid: string) => {
    if (!activeRef.current) return;
    if (data.stop) {
      setFinished(true);
      if (activeRef.current) onComplete(data.finalTheta, sid);
      return;
    }
    if (data.currentSection) {
      setCurrentSection(data.currentSection);
      setSectionIndex(data.sectionIndex ?? 0);
    }
    // Sync elapsed time from server response (authoritative for reconnect cases)
    if (typeof data.elapsedMs === "number") {
      setElapsedSeconds(Math.floor(data.elapsedMs / 1000));
    }
    if (typeof data.maxDurationMs === "number") {
      setMaxDurationMs(data.maxDurationMs);
    }
    responseStartTime.current = Date.now();
    setCurrentItem(data.item);
    fetchStatus(sid);
  };

  const fetchNextItem = async (sid: string) => {
    if (isFetchingNextRef.current) return;
    isFetchingNextRef.current = true;
    setLoading(true);
    setUploadStatus('idle');
    setUploadProgress(0);
    try {
      const data = await requestNextItem(sid);
      if (!activeRef.current) return;

      if (data.stop) {
        setFinished(true);
        if (activeRef.current) onComplete(data.finalTheta, sid);
        return;
      }

      // Section transition: show interstitial AND pre-fetch the next item in parallel.
      // The transition screen stays until BOTH the minimum display time (2.5s) AND the
      // next item fetch have completed — eliminating the stale-closure setTimeout bug.
      // MAX_TRANSITION_DEPTH prevents infinite loops if the server is stuck returning
      // cascading sectionTransitions (e.g. item bank empty for all remaining sections).
      if (data.sectionTransition) {
        const MAX_TRANSITION_DEPTH = 8; // more than the max number of sections in any profile
        let transitionData = data;
        let depth = 0;

        while (transitionData.sectionTransition && depth < MAX_TRANSITION_DEPTH) {
          setSectionTransition({
            completedSection: transitionData.completedSection,
            nextSection: transitionData.nextSection,
            sectionIndex: transitionData.sectionIndex,
            totalSections: transitionData.totalSections,
          });
          setCurrentSection(transitionData.nextSection);
          setSectionIndex(transitionData.sectionIndex);
          setLoading(false);

          const MIN_DISPLAY_MS = depth === 0 ? 2500 : 1200;
          const t0 = Date.now();
          try {
            const nextData = await requestNextItem(sid);
            if (!activeRef.current) return;
            const elapsed = Date.now() - t0;
            if (elapsed < MIN_DISPLAY_MS) {
              await new Promise<void>(r => setTimeout(r, MIN_DISPLAY_MS - elapsed));
            }
            setSectionTransition(null);

            if (nextData.stop) {
              setFinished(true);
              if (activeRef.current) onComplete(nextData.finalTheta, sid);
              return;
            }

            transitionData = nextData;
            depth++;
          } catch (err) {
            setSectionTransition(null);
            setError(err instanceof Error ? err.message : "Failed to fetch next item after section transition.");
            return;
          }
        }

        if (depth >= MAX_TRANSITION_DEPTH) {
          setError("Assessment encountered an unexpected error (too many consecutive section transitions). Please contact support.");
          return;
        }

        applyNextData(transitionData, sid);
        return;
      }

      applyNextData(data, sid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch next item.");
    } finally {
      setLoading(false);
      isFetchingNextRef.current = false;
    }
  };

  const handleProctoringEvent = async (type: ProctoringEventType, severity: "LOW" | "MEDIUM" | "HIGH", metadata?: any) => {
    if (!sessionId) return;
    try {
      const response = await fetch("/api/proctoring/event", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proctoringEventPayload(sessionId, type, severity, metadata))
      });
      if (!response.ok) throw new Error(`Proctoring event was not saved (${response.status})`);
    } catch (err) {
      console.error("Failed to log proctoring event");
    }
  };

  const statusRequestRef = React.useRef(0);
  const fetchStatus = async (sid: string) => {
    const request = ++statusRequestRef.current;
    setStatusError(false);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sid)}/status`, { credentials: "include" });
      if (!res.ok) throw new Error('Progress unavailable');
      const data = await res.json();
      if (!activeRef.current || request !== statusRequestRef.current) return;
      setStatus(data);
      if (data.sectionCounts) setSectionCounts(data.sectionCounts);
    } catch {
      if (activeRef.current && request === statusRequestRef.current) setStatusError(true);
    }
  };

  useEffect(() => {
    if (!showInsights || !sessionId) return;
    void fetchStatus(sessionId);
    const timer = setInterval(() => void fetchStatus(sessionId), 10000);
    return () => clearInterval(timer);
  }, [showInsights, sessionId]);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleResponse = async (value: any) => {
    if (!sessionId || !currentItem || submitting) return;
    
    setSubmitting(true);
    setItemFeedback(null);
    setUploadStatus('uploading');
    setUploadProgress(10);

    let finalValue = value;

    try {
      // Save the response first. The server queues productive scoring after persistence.
      if (value instanceof Blob) {
        if (!value.size) throw new Error("Empty recording");
        const base64 = await blobToBase64(value);
        finalValue = { audio: base64, mimeType: value.type };
        setUploadProgress(60);
      }
      const res = await fetch(`/api/sessions/${sessionId}/respond`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: currentItem.id, value: finalValue, latencyMs: Date.now() - responseStartTime.current, candidateId })
      });
      const submitData = await res.json();
      
      if (!res.ok) {
        console.error('[respond]', submitData);
        // Don't crash the whole exam for a single failed submit — show inline warning
        setItemFeedback({ error: submitData?.error || "Failed to submit response. Please try again." });
        setUploadStatus('error');
      } else {
        setUploadStatus('success');
        setUploadProgress(100);
        try { sessionStorage.removeItem(writingDraftKey(sessionId, currentItem.id)); } catch { /* Storage unavailable */ }
        setSectionCounts(prev => ({ ...prev, [currentSection]: (prev[currentSection] ?? 0) + 1 }));
        await fetchNextItem(sessionId);
      }
    } catch (err) {
      console.error('[respond network]', err);
      setItemFeedback({ error: "Connection error. Please check your internet and try again." });
      setUploadStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Precision score: how close are we to the SEM target (0 → 1)?
  // Uses current SEM from status if available, else falls back to item count heuristic.
  const getPrecisionPct = (): number => {
    const currentSem = status?.sem;
    if (typeof currentSem === "number" && currentSem > 0) {
      // SEM 1.0 → 0%, SEM 0.30 → 100% (linear interpolation clamped to [0,1])
      const pct = Math.min(1, Math.max(0, (1.0 - currentSem) / (1.0 - 0.30)));
      return Math.round(pct * 100);
    }
    return 0;
  };

  if (fixedSession && sessionId) return <OzgunKidsPlayer organizationId={organizationId} initialSessionId={sessionId} onSessionStarted={onSessionStarted} onComplete={onComplete} onCancel={onCancel}/>;

  if (error) {
    const isCodeRequired = error.includes("exam code");
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center">
        {exitControl}
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl mb-6">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {isCodeRequired ? "Exam Code Required" : "Assessment Error"}
        </h2>
        <p className="text-slate-500 mb-8 max-w-md">{error}</p>
        {sessionId && <p className="mb-6 text-xs text-slate-500 font-mono break-all">Exam ID: {sessionId}</p>}
        {isCodeRequired && onCancel ? (
          <Button size="lg" onClick={onCancel}>
            Back to Dashboard
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => {
              setError(null);
              if (sessionId) {
                fetchNextItem(sessionId);
              } else {
                window.location.reload();
              }
            }}
          >
            Try Reconnecting
          </Button>
        )}
      </div>
    );
  }

  // Face capture (identity verification) before practice mode.
  // Wait for session launch to complete so FaceCapture always uploads to the
  // real sessionId — never to the "pre-session" fallback.
  if (showFaceCapture) {
    if (!sessionReady) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          {exitControl}
          <div className="flex flex-col items-center gap-4 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="text-sm font-medium">Preparing exam…</span>
          </div>
        </div>
      );
    }
    return (
      <>{exitControl}<FaceCapture
        sessionId={sessionId!}
        onCaptureDone={() => setShowFaceCapture(false)}
      /></>
    );
  }

  // Show Practice/Tutorial Mode before the real test
  if (showPractice) {
    return (
      <>{exitControl}<PracticeMode
        onComplete={() => setShowPractice(false)}
        onSkip={() => setShowPractice(false)}
      /></>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Proctoring Monitor */}
      {sessionId && (
        <ProctoringMonitor 
          sessionId={sessionId} 
          onEvent={handleProctoringEvent} 
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 flex-wrap sticky top-0 z-10">
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-[#9b276c] justify-center text-white font-bold text-xl px-3 py-1 -skew-x-6 rounded-sm tracking-tight flex items-center">
              <span style={{ textShadow: '0 0 8px rgba(253, 224, 71, 0.8), 0 0 15px rgba(253, 224, 71, 0.4)' }}>b4skills</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-100 hidden md:block" />
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
        </div>
        
        <div className="flex flex-wrap w-full sm:w-auto min-w-0 items-center justify-between gap-2 sm:gap-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-bold text-xs"
            aria-expanded={showInsights}
            aria-controls="assessment-insights"
            onClick={() => setShowInsights(!showInsights)}
          >
            <Activity size={16} />
            {t("admin.analytics")}
          </Button>

          {exitControl}

          {/* Adaptive timing display: remaining time + precision arc */}
          <div className="flex items-center gap-3">
            {/* Remaining time countdown */}
            {(() => {
              const maxSec = Math.floor(maxDurationMs / 1000);
              const remaining = Math.max(0, maxSec - elapsedSeconds);
              const isWarning = remaining <= 300; // last 5 minutes
              const isCritical = remaining <= 60;  // last 1 minute
              return (
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl font-mono text-sm sm:text-base font-bold transition-colors",
                    isCritical
                      ? "bg-red-100 text-red-700 animate-pulse"
                      : isWarning
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-700"
                  )}
                  role="timer"
                  aria-label={`Time remaining: ${formatTime(remaining)}`}
                  aria-live={isWarning ? "polite" : undefined}
                  title="Time remaining in this assessment"
                >
                  <Clock size={16} className={isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-slate-400"} />
                  {formatTime(remaining)}
                </div>
              );
            })()}

            {/* Precision meter: SEM-based progress toward stopping threshold */}
            {(() => {
              const pct = getPrecisionPct();
              const radius = 10;
              const circ = 2 * Math.PI * radius;
              const dash = (pct / 100) * circ;
              const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#6366f1" : "#94a3b8";
              return (
                <div
                  className="hidden sm:flex flex-col items-center gap-0.5 cursor-default"
                  title={`Measurement precision: ${pct}% — exam ends when precision target is reached`}
                  aria-label={`Measurement precision ${pct}%`}
                >
                  <svg width="28" height="28" viewBox="0 0 28 28">
                    <circle cx="14" cy="14" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <circle
                      cx="14" cy="14" r={radius}
                      fill="none"
                      stroke={color}
                      strokeWidth="3"
                      strokeDasharray={`${dash} ${circ - dash}`}
                      strokeLinecap="round"
                      transform="rotate(-90 14 14)"
                      style={{ transition: "stroke-dasharray 0.6s ease" }}
                    />
                    <text x="14" y="18" textAnchor="middle" fontSize="7" fontWeight="700" fill={color}>{pct}%</text>
                  </svg>
                  <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Precision</span>
                </div>
              );
            })()}
          </div>

          <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck size={14} />
            Secure Session
          </div>
        </div>
      </header>

      {/* Section Progress Bar — driven by sectionOrder from server response */}
      <div className="bg-white border-b border-slate-100 px-3 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto" role="navigation" aria-label="Test section progress">
        {sectionOrder.map((sec, i) => (
          <div key={sec} className="flex items-center gap-1.5 shrink-0">
            <div
              aria-current={i === sectionIndex ? "step" : undefined}
              className={cn(
                "flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full transition-all",
                i < sectionIndex
                  ? `${SECTION_COLORS[sec] ?? 'bg-slate-400'} text-white opacity-70`
                  : i === sectionIndex
                  ? `${SECTION_COLORS[sec] ?? 'bg-slate-500'} text-white shadow-sm`
                  : "bg-slate-100 text-slate-400"
              )}
            >
              {SECTION_LABELS[sec] ?? sec}
              {sectionCounts[sec] ? (
                <span className={cn(
                  "ml-1 px-1 rounded text-[9px] font-black leading-none",
                  i <= sectionIndex ? "bg-white/30" : "bg-slate-200 text-slate-500"
                )}>
                  {sectionCounts[sec]}
                </span>
              ) : null}
            </div>
            {i < sectionOrder.length - 1 && (
              <ChevronRight size={12} className="text-slate-300" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center p-3 sm:p-6 md:p-12 overflow-y-auto" role="main">
        <div className="w-full max-w-3xl">
          <AnimatePresence>
            {showInsights && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                id="assessment-insights"
                className="mb-8 overflow-hidden"
              >
                <Card className="bg-indigo-50 border-indigo-100 rounded-[32px] shadow-sm">
                  <CardContent className="p-6">
                    <h2 className="text-sm font-bold text-indigo-700 mb-3">{t('exam.insightsTitle', { defaultValue: 'Exam progress' })}</h2>
                    {statusError ? <div role="alert">
                      <p>{t('exam.progressError', { defaultValue: 'Progress could not be loaded. Your exam can continue.' })}</p>
                      <Button variant="outline" size="sm" onClick={() => sessionId && fetchStatus(sessionId)}>{t('common.retry')}</Button>
                    </div> : !status ? <p role="status">{t('common.loading')}</p> : <>
                      <p className="text-sm text-slate-700 mb-2">{t('exam.answered', { defaultValue: '{{count}} answers submitted', count: status.progress ?? 0 })}</p>
                      <p className="text-xs text-slate-500 mb-4">{t('exam.provisional', { defaultValue: 'Progress is provisional. Final results are available after scoring is complete.' })}</p>
                      {status.cefrLevel && <p className="text-sm text-indigo-700 mb-3">{t('exam.estimatedLevel', { defaultValue: 'Provisional level: {{level}}', level: status.cefrLevel })}</p>}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {sectionOrder.map(skill => {
                          const progress = status.skillProgress?.[skill];
                          const answered = progress?.answered ?? status.sectionCounts?.[skill] ?? 0;
                          const limit = progress?.maxItems ?? status.sectionLimits?.[skill];
                          return <div key={skill} className="bg-white p-3 rounded-xl border border-indigo-100">
                            <h3 className="text-xs font-bold text-slate-700">{SECTION_LABELS[skill] ?? skill}</h3>
                            <p className="text-sm text-indigo-700 mt-1">{answered}{typeof limit === 'number' && limit > 0 ? ` / ${limit}` : ''}</p>
                            {progress && <p className="text-xs text-slate-500">{t('exam.scoringCounts', { defaultValue: '{{scored}} scored · {{pending}} awaiting scoring', scored: progress.scored, pending: progress.pending })}</p>}
                          </div>;
                        })}
                      </div>
                    </>}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Task delivery must not wait for an exit-animation callback. Browsers
              can suspend animation frames while audio or tab visibility changes. */}
          <div aria-busy={loading} data-testid="assessment-task-panel">
            {sectionTransition ? (
              <div
                key="section-transition"
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center text-white shadow-xl mb-6", SECTION_COLORS[sectionTransition.nextSection])}>
                  <CheckCircle2 size={40} />
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Section {sectionTransition.sectionIndex} of {sectionTransition.totalSections} Complete
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                  {SECTION_LABELS[sectionTransition.completedSection]} Complete
                </h2>
                <p className="text-slate-500 font-medium mb-8">
                  Next up: <span className="font-black text-slate-800">{SECTION_LABELS[sectionTransition.nextSection]}</span>
                </p>
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
                  <Loader2 size={16} className="animate-spin" />
                  Starting {SECTION_LABELS[sectionTransition.nextSection]} section...
                </div>
                <button
                  onClick={() => {
                    setSectionTransition(null);
                    if (sessionId) fetchNextItem(sessionId);
                  }}
                  className="text-xs text-indigo-500 hover:text-indigo-700 font-bold underline underline-offset-2 transition-colors"
                >
                  Continue manually →
                </button>
              </div>
            ) : finished ? (
              <div
                key="feedback"
                className="py-12"
              >
                <CandidateFeedback 
                  sessionId={sessionId!} 
                  orgId={organizationId} 
                  onComplete={() => {
                    // Final redirect or cleanup
                  }} 
                />
              </div>
            ) : loading ? (
              <div
                key="loading"
                className="flex flex-col items-center justify-center py-32 text-center"
                aria-live="polite"
              >
                <Activity className="animate-spin text-indigo-600 mb-6" size={48} />
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Selecting Next Task</h3>
                <p className="text-slate-500 font-medium">The adaptive engine is analyzing your performance...</p>
              </div>
            ) : currentItem ? (
              <div
                key={currentItem.id}
              >
                <div className="mb-5 sm:mb-8 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest text-white", SECTION_COLORS[currentSection] ?? 'bg-indigo-500')}>
                      {SECTION_LABELS[currentSection] ?? currentItem.skill}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {status?.progress ?? 0} answered
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Level</div>
                    <div className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-black">
                      {status?.cefr}
                    </div>
                  </div>
                </div>

                {itemFeedback?.error && (
                  <div className="mb-4 px-4 sm:px-5 py-3 bg-rose-50 border border-rose-200 rounded-2xl flex flex-wrap items-center gap-3" role="alert">
                    <span className="text-rose-600 font-bold text-sm">⚠ {itemFeedback.error}</span>
                    <button
                      onClick={() => setItemFeedback(null)}
                      className="ml-auto text-xs text-rose-400 hover:text-rose-600 font-bold uppercase tracking-widest"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                <ItemRenderer
                  sessionId={sessionId ?? undefined}
                  item={currentItem}
                  onResponse={handleResponse}
                  disabled={submitting}
                  feedback={itemFeedback?.error ? null : itemFeedback}
                  isUploading={submitting}
                  uploadProgress={uploadProgress}
                  uploadStatus={uploadStatus}
                  activePassage={activePassage}
                />
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {/* Footer / Status */}
      <footer className="bg-white border-t border-slate-200 px-4 sm:px-8 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap min-w-0 items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Connected to Adaptive Engine
          </div>
          <div className="hidden sm:block h-4 w-px bg-slate-200" />
          <div className="text-xs text-slate-500 font-mono break-all" aria-label="Exam ID">
            Exam ID: {sessionId ?? 'Preparing…'}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <Activity size={12} />
          Real-time Psychometric Sync
        </div>
      </footer>
    </div>
  );
};

export const TestPlayer: React.FC<TestPlayerProps> = props => props.productLine === OZGUN_PRODUCT
  ? <OzgunKidsPlayer {...props}/>
  : <AdaptiveTestPlayer {...props}/>;
