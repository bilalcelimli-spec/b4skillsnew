import React, { useState, useEffect } from "react";
import { Item, SessionState } from "../lib/assessment-engine/types";
import { ItemRenderer } from "./ItemRenderer";
import { ProctoringMonitor } from "./ProctoringMonitor";
import { ProctoringEventType } from "../lib/proctoring/proctoring-service";
import { Card, CardContent, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { 
  Clock, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  GraduationCap,
  Activity,
  BookOpen,
  Headphones,
  Pen,
  Mic as MicIcon,
  BookMarked,
  TrendingUp
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
  onComplete: (finalTheta: number | null, sessionId: string) => void;
}

export const TestPlayer: React.FC<TestPlayerProps> = ({ organizationId, candidateId, productLine, onComplete }) => {
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes total
  const [showInsights, setShowInsights] = useState(false);
  const [itemFeedback, setItemFeedback] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'success' | 'error'>('idle');
  const [showPractice, setShowPractice] = useState(true);
  const [showFaceCapture, setShowFaceCapture] = useState(true);
  const [sectionTransition, setSectionTransition] = useState<{ completedSection: string; nextSection: string; sectionIndex: number; totalSections: number } | null>(null);
  const [currentSection, setCurrentSection] = useState<string>('VOCABULARY');
  const [sectionIndex, setSectionIndex] = useState<number>(0);
  // Track how many items have been answered per section (local, resets on reload)
  const [sectionCounts, setSectionCounts] = useState<Record<string, number>>({});
  // Theta trajectory for the real-time adaptivity ladder
  const [thetaHistory, setThetaHistory] = useState<Array<{ n: number; theta: number; cefr: string }>>([]);
  const responseStartTime = React.useRef<number>(Date.now());

  const SECTION_ORDER = ['VOCABULARY', 'GRAMMAR', 'LISTENING', 'READING'];
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

  // Launch Session
  useEffect(() => {
    const launch = async () => {
      try {
        const res = await fetch("/api/sessions/launch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId, organizationId, productLine })
        });
        const data = await res.json();
        
        if (!res.ok || data.error) {
          throw new Error(data.error || "Launch failed");
        }
        
        setSessionId(data.sessionId);
        fetchNextItem(data.sessionId);
      } catch (err) {
        setError("Failed to initialize assessment session. Please check your database connection.");
        setLoading(false);
      }
    };
    launch();
  }, []);

  // Timer — ends the exam when it reaches 0
  useEffect(() => {
    if (loading || !sessionId || finished) return;
    if (timeLeft === 0) {
      setFinished(true);
      onComplete(null, sessionId);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, sessionId, finished, timeLeft]);

  // Applies the result of a /next fetch to state (shared between normal flow and pre-fetched transition)
  const applyNextData = (data: any, sid: string) => {
    if (data.stop) {
      setFinished(true);
      onComplete(data.finalTheta, sid);
      return;
    }
    if (data.currentSection) {
      setCurrentSection(data.currentSection);
      setSectionIndex(data.sectionIndex ?? 0);
    }
    responseStartTime.current = Date.now();
    setCurrentItem(data.item);
    fetchStatus(sid);
  };

  const fetchNextItem = async (sid: string) => {
    setLoading(true);
    setUploadStatus('idle');
    setUploadProgress(0);
    try {
      const res = await fetch(`/api/sessions/${sid}/next`);
      const data = await res.json();
      
      if (!res.ok || data.error) {
         throw new Error(data.error || "Fetch failed");
      }

      if (data.stop) {
        setFinished(true);
        onComplete(data.finalTheta, sid);
        return;
      }

      // Section transition: show interstitial AND pre-fetch the next item in parallel.
      // The transition screen stays until BOTH the minimum display time (2.5s) AND the
      // next item fetch have completed — eliminating the stale-closure setTimeout bug.
      if (data.sectionTransition) {
        setSectionTransition({
          completedSection: data.completedSection,
          nextSection: data.nextSection,
          sectionIndex: data.sectionIndex,
          totalSections: data.totalSections,
        });
        setCurrentSection(data.nextSection);
        setSectionIndex(data.sectionIndex);
        setLoading(false);

        const MIN_DISPLAY_MS = 2500;
        const t0 = Date.now();
        try {
          const nextRes = await fetch(`/api/sessions/${sid}/next`);
          const nextData = await nextRes.json();
          // Wait for minimum display time
          const elapsed = Date.now() - t0;
          if (elapsed < MIN_DISPLAY_MS) {
            await new Promise<void>(r => setTimeout(r, MIN_DISPLAY_MS - elapsed));
          }
          setSectionTransition(null);
          if (nextData.stop) {
            setFinished(true);
            onComplete(nextData.finalTheta, sid);
          } else if (nextData.sectionTransition) {
            // Empty section — show briefly then continue
            setSectionTransition({
              completedSection: nextData.completedSection,
              nextSection: nextData.nextSection,
              sectionIndex: nextData.sectionIndex,
              totalSections: nextData.totalSections,
            });
            setCurrentSection(nextData.nextSection);
            setSectionIndex(nextData.sectionIndex);
            await new Promise<void>(r => setTimeout(r, 1500));
            setSectionTransition(null);
            fetchNextItem(sid);
          } else {
            applyNextData(nextData, sid);
          }
        } catch {
          setSectionTransition(null);
          setError("Failed to fetch next item after section transition.");
        }
        return;
      }

      applyNextData(data, sid);
    } catch (err) {
      setError("Failed to fetch next item.");
    } finally {
      setLoading(false);
    }
  };

  const handleProctoringEvent = async (type: ProctoringEventType, severity: "LOW" | "MEDIUM" | "HIGH", metadata?: any) => {
    if (!sessionId) return;
    try {
      await fetch("/api/proctoring/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, type, severity, metadata })
      });
    } catch (err) {
      console.error("Failed to log proctoring event");
    }
  };

  const fetchStatus = async (sid: string) => {
    try {
      const res = await fetch(`/api/sessions/${sid}/status`);
      const data = await res.json();
      
      // Fetch real-time insights if enabled
      if (showInsights) {
        const insightsRes = await fetch(`/api/sessions/${sid}/insights`);
        const insightsData = await insightsRes.json();
        const merged = { ...data, ...insightsData };
        setStatus(merged);
        // Append theta snapshot to history for the adaptivity ladder
        if (typeof merged.theta === "number" && merged.cefrLevel) {
          setThetaHistory(prev => {
            const n = prev.length + 1;
            return [...prev, { n, theta: merged.theta, cefr: merged.cefrLevel }];
          });
        }
      } else {
        setStatus(data);
        if (typeof data.theta === "number" && data.cefrLevel) {
          setThetaHistory(prev => {
            const n = prev.length + 1;
            return [...prev, { n, theta: data.theta, cefr: data.cefrLevel }];
          });
        }
      }
    } catch (err) {}
  };

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
    let aiPayload: any = { content: value };

    // Phase 7: Real-time AI Feedback for Writing/Speaking
    if (currentItem.skill === "WRITING" || currentItem.skill === "SPEAKING") {
      try {
        if (currentItem.skill === "SPEAKING" && value instanceof Blob) {
          setUploadProgress(30);
          const base64 = await blobToBase64(value);
          setUploadProgress(60);
          aiPayload = {
            audioBase64: base64,
            mimeType: value.type,
            prompt: currentItem.metadata?.prompt ?? (currentItem as any).content?.prompt
          };
          finalValue = { audio: base64, mimeType: value.type };
        } else if (currentItem.skill === "WRITING") {
          aiPayload = {
            content: value,
            prompt: currentItem.metadata?.prompt ?? (currentItem as any).content?.prompt
          };
        }

        setUploadStatus('analyzing');
        setUploadProgress(80);
        
        const endpoint = currentItem.skill === "WRITING" ? "/api/ai/score/writing" : "/api/ai/score/speaking-multimodal";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aiPayload)
        });
        
        const feedback = await res.json();
        setItemFeedback(feedback);
        setUploadStatus('success');
        setUploadProgress(100);
        
        // Wait a bit for the user to see the feedback before moving on
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (err) {
        console.error("AI Feedback Error:", err);
        setUploadStatus('error');
      }
    }

    try {
      const res = await fetch(`/api/sessions/${sessionId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: currentItem.id, value: finalValue, latencyMs: Date.now() - responseStartTime.current })
      });
      const submitData = await res.json();
      
      if (!res.ok) {
        console.error('[respond]', submitData);
        // Don't crash the whole exam for a single failed submit — show inline warning
        setItemFeedback({ error: submitData?.error || "Failed to submit response. Please try again." });
        setUploadStatus('error');
      } else {
        setSectionCounts(prev => ({ ...prev, [currentSection]: (prev[currentSection] ?? 0) + 1 }));
        fetchNextItem(sessionId);
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center">
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl mb-6">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Assessment Error</h2>
        <p className="text-slate-500 mb-8 max-w-md">{error}</p>
        <Button size="lg" onClick={() => window.location.reload()}>
          Try Reconnecting
        </Button>
      </div>
    );
  }

  // Face capture (identity verification) before practice mode
  if (showFaceCapture) {
    return (
      <FaceCapture
        sessionId={sessionId ?? "pre-session"}
        onCaptureDone={() => setShowFaceCapture(false)}
      />
    );
  }

  // Show Practice/Tutorial Mode before the real test
  if (showPractice) {
    return (
      <PracticeMode
        onComplete={() => setShowPractice(false)}
        onSkip={() => setShowPractice(false)}
      />
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
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-[#9b276c] justify-center text-white font-bold text-xl px-3 py-1 -skew-x-6 rounded-sm tracking-tight flex items-center">
              <span style={{ textShadow: '0 0 8px rgba(253, 224, 71, 0.8), 0 0 15px rgba(253, 224, 71, 0.4)' }}>b4skills</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-100 hidden md:block" />
          <LanguageSwitcher />
        </div>
        
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest"
            onClick={() => setShowInsights(!showInsights)}
          >
            <Activity size={16} />
            {t("admin.analytics")}
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl font-mono font-bold text-slate-700" role="timer" aria-label="Time remaining">
            <Clock size={18} className="text-slate-400" />
            {formatTime(timeLeft)}
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck size={14} />
            Secure Session
          </div>
        </div>
      </header>

      {/* Section Progress Bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-2 flex items-center gap-2" role="navigation" aria-label="Test section progress">
        {SECTION_ORDER.map((sec, i) => (
          <div key={sec} className="flex items-center gap-1.5">
            <div
              aria-current={i === sectionIndex ? "step" : undefined}
              className={cn(
                "flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full transition-all",
                i < sectionIndex
                  ? `${SECTION_COLORS[sec]} text-white opacity-70`
                  : i === sectionIndex
                  ? `${SECTION_COLORS[sec]} text-white shadow-sm`
                  : "bg-slate-100 text-slate-400"
              )}
            >
              {SECTION_LABELS[sec]}
              {sectionCounts[sec] ? (
                <span className={cn(
                  "ml-1 px-1 rounded text-[9px] font-black leading-none",
                  i <= sectionIndex ? "bg-white/30" : "bg-slate-200 text-slate-500"
                )}>
                  {sectionCounts[sec]}
                </span>
              ) : null}
            </div>
            {i < SECTION_ORDER.length - 1 && (
              <ChevronRight size={12} className="text-slate-300" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center p-6 md:p-12 overflow-y-auto" role="main">
        <div className="w-full max-w-3xl">
          <AnimatePresence>
            {showInsights && status && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <Card className="bg-indigo-50 border-indigo-100 rounded-[32px] shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
                        <Activity size={14} />
                        Real-time Progress Insights
                      </div>
                      <div className="px-3 py-1 bg-white text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                        Estimated: {status.cefrLevel}
                      </div>
                    </div>

                    {/* Theta Adaptivity Ladder */}
                    {thetaHistory.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">
                          <TrendingUp size={11} />
                          Ability Estimate (adapts after each response)
                        </div>
                        {/* CEFR ladder: columns = levels, dots = theta snapshots */}
                        <div className="bg-white rounded-2xl p-3 border border-indigo-100">
                          {(() => {
                            const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
                            const CEFR_LABELS: Record<string, string> = { PRE_A1: "Pre-A1", A1: "A1", A2: "A2", B1: "B1", B2: "B2", C1: "C1", C2: "C2" };
                            const CEFR_COLORS: Record<string, string> = {
                              PRE_A1: "bg-slate-300", A1: "bg-sky-400", A2: "bg-blue-400",
                              B1: "bg-violet-400", B2: "bg-purple-500", C1: "bg-amber-500", C2: "bg-rose-500"
                            };
                            const currentLevel = thetaHistory[thetaHistory.length - 1]?.cefr ?? "";
                            return (
                              <div className="flex items-end gap-1">
                                {CEFR_LEVELS.map((lvl) => {
                                  const visits = thetaHistory.filter(h => h.cefr === lvl).length;
                                  const isCurrent = lvl === currentLevel;
                                  return (
                                    <div key={lvl} className="flex-1 flex flex-col items-center gap-1">
                                      {/* Bar height proportional to time spent at this level */}
                                      <div className={cn(
                                        "w-full rounded-t-lg transition-all duration-500",
                                        CEFR_COLORS[lvl],
                                        isCurrent ? "opacity-100 ring-2 ring-indigo-400 ring-offset-1" : "opacity-30"
                                      )} style={{ height: `${Math.max(4, visits * 8)}px` }} />
                                      <span className={cn(
                                        "text-[9px] font-black",
                                        isCurrent ? "text-indigo-600" : "text-slate-400"
                                      )}>
                                        {CEFR_LABELS[lvl]}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                        <p className="text-[9px] text-indigo-400 mt-1 text-center">
                          The test adjusts difficulty based on your responses.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {["Reading", "Listening", "Writing", "Speaking"].map((skill) => (
                        <div key={skill} className="bg-white p-3 rounded-2xl border border-indigo-100/50">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{skill}</div>
                          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500" 
                              style={{ width: `${Math.round((sectionCounts[skill.toUpperCase()] ?? 0) / 10 * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {sectionTransition ? (
              <motion.div
                key="section-transition"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
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
              </motion.div>
            ) : finished ? (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12"
              >
                <CandidateFeedback 
                  sessionId={sessionId!} 
                  orgId={organizationId} 
                  onComplete={() => {
                    // Final redirect or cleanup
                  }} 
                />
              </motion.div>
            ) : loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-32 text-center"
                aria-live="polite"
              >
                <Activity className="animate-spin text-indigo-600 mb-6" size={48} />
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Selecting Next Task</h3>
                <p className="text-slate-500 font-medium">The adaptive engine is analyzing your performance...</p>
              </motion.div>
            ) : currentItem ? (
              <motion.div
                key={currentItem.id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <div className="mb-8 flex items-center justify-between">
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

                <ItemRenderer 
                  item={currentItem} 
                  onResponse={handleResponse} 
                  disabled={submitting}
                  feedback={itemFeedback}
                  isUploading={submitting}
                  uploadProgress={uploadProgress}
                  uploadStatus={uploadStatus}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer / Status */}
      <footer className="bg-white border-t border-slate-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Connected to Adaptive Engine
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="text-xs text-slate-400 font-mono">
            ID: {sessionId?.split('_')[1]}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <Activity size={12} />
          Real-time Psychometric Sync
        </div>
      </footer>
    </div>
  );
};
