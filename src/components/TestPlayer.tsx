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
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CandidateFeedback } from "./CandidateFeedback";
import { PracticeMode } from "./PracticeMode";
import { useTranslation } from "react-i18next";
import "../lib/i18n/config";

interface TestPlayerProps {
  organizationId: string;
  candidateId: string;
  productLine?: string;
  onComplete: (finalTheta: number, sessionId: string) => void;
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

  // Timer
  useEffect(() => {
    if (loading || !sessionId) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, sessionId]);

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

      setCurrentItem(data.item);
      fetchStatus(sid);
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
        setStatus({ ...data, ...insightsData });
      } else {
        setStatus(data);
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
        body: JSON.stringify({ itemId: currentItem.id, value: finalValue })
      });
      
      if (res.ok) {
        fetchNextItem(sessionId);
      } else {
        setError("Failed to submit response. Please try again.");
        setUploadStatus('error');
      }
    } catch (err) {
      setError("Connection error. Retrying...");
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

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={20} aria-valuenow={status?.progress || 0}>
        <motion.div 
          className="h-full bg-indigo-600"
          initial={{ width: 0 }}
          animate={{ width: `${(status?.progress / 20) * 100}%` }} // 20 is maxItems
          transition={{ duration: 0.5 }}
        />
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {["Reading", "Listening", "Writing", "Speaking"].map((skill) => (
                        <div key={skill} className="bg-white p-3 rounded-2xl border border-indigo-100/50">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{skill}</div>
                          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500" 
                              style={{ width: `${Math.random() * 60 + 20}%` }} // Simulated skill progress
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
            {finished ? (
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
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-widest">
                      {currentItem.skill}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Task {(status?.progress ?? 0) + 1} of 20
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
