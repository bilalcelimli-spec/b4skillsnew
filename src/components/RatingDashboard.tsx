import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  Users,
  Flag,
  BarChart2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RatingTask {
  id: string;
  sessionId?: string;
  itemId?: string;
  type: "WRITING" | "SPEAKING";
  content: string;
  aiResult?: {
    cefrLevel?: string;
    feedback?: string;
    score?: number;
    rubricScores?: {
      grammar?: number;
      vocabulary?: number;
      coherence?: number;
      taskRelevance?: number;
      fluency?: number;
    };
  };
  status: string;
  /** True when the first rater already submitted; this task needs a second rater */
  needsSecondRater?: boolean;
  /** QWK after second rater — available on COMPLETED tasks */
  qwk?: number | null;
  createdAt: string;
  response?: {
    id: string;
    session?: { id: string; candidate?: { name?: string } };
    item?: { skill: string; cefrLevel: string };
    metadata?: Record<string, any>;
  };
}

interface QueueStats {
  pending: number;
  claimed: number;
  completed: number;
  flagged: number;
  avgQwk: number | null;
}

// CEFR → normalized 0-10 score helper
function cefrToScore(level?: string): number {
  const map: Record<string, number> = { PRE_A1: 0, A1: 1.5, A2: 3, B1: 5, B2: 6.5, C1: 8, C2: 10 };
  return map[level?.toUpperCase().replace("-", "_") ?? ""] ?? 5;
}

// Per-dimension rubric labels
const RUBRIC_DIMS_WRITING  = ["grammar", "vocabulary", "coherence", "taskRelevance"] as const;
const RUBRIC_DIMS_SPEAKING = ["grammar", "vocabulary", "coherence", "taskRelevance", "fluency"] as const;
type RubricDim = typeof RUBRIC_DIMS_WRITING[number] | typeof RUBRIC_DIMS_SPEAKING[number];

const DIM_LABELS: Record<RubricDim, string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  coherence: "Coherence & Cohesion",
  taskRelevance: "Task Relevance",
  fluency: "Fluency & Delivery",
};

// ─── Component ─────────────────────────────────────────────────────────────────

export const RatingDashboard: React.FC<{ raterId?: string }> = ({ raterId }) => {
  const [tasks, setTasks]             = useState<RatingTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<RatingTask | null>(null);
  const [stats, setStats]             = useState<QueueStats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "CLAIMED" | "COMPLETED" | "FLAGGED">("PENDING");

  // Per-dimension rubric scores (0-10, step 0.5)
  const [rubric, setRubric] = useState<Record<RubricDim, number>>({
    grammar: 5, vocabulary: 5, coherence: 5, taskRelevance: 5, fluency: 5,
  });
  const [feedback, setFeedback] = useState("");
  const [isSecondRater, setIsSecondRater] = useState(false);

  const overallScore = useCallback(() => {
    const dims = selectedTask?.type === "SPEAKING" ? RUBRIC_DIMS_SPEAKING : RUBRIC_DIMS_WRITING;
    const sum = dims.reduce((acc, d) => acc + (rubric[d] ?? 5), 0);
    return parseFloat((sum / dims.length / 10).toFixed(3)); // normalized 0-1
  }, [rubric, selectedTask]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, statsRes] = await Promise.all([
        fetch(`/api/rating/tasks?status=${statusFilter}`, { credentials: "include" }),
        fetch("/api/rating/stats", { credentials: "include" }),
      ]);
      const tasksData = tasksRes.ok ? await tasksRes.json() : [];
      const statsData = statsRes.ok ? await statsRes.json() : null;

      // Normalise tasks — extract useful fields from nested response relation
      const normalised: RatingTask[] = (Array.isArray(tasksData) ? tasksData : []).map((t: any) => {
        const meta       = t.response?.metadata ?? {};
        const aiResult   = meta?.reviewQueue?.aiResult ?? meta?.aiResult ?? null;
        const taskType   = t.response?.item?.skill === "WRITING" ? "WRITING" : "SPEAKING";
        const content    = t.response?.value ?? t.response?.metadata?.transcript ?? t.content ?? "";
        return {
          id:               t.id,
          sessionId:        t.response?.session?.id ?? t.sessionId,
          itemId:           t.response?.itemId ?? t.itemId,
          type:             taskType,
          content,
          aiResult,
          status:           t.status,
          needsSecondRater: t.status === "PENDING" && t.score != null,
          qwk:              t.qwk ?? null,
          createdAt:        t.createdAt,
          response:         t.response,
        };
      });

      setTasks(normalised);
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error("Failed to fetch rating tasks");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Pre-fill rubric from AI suggestion when task is selected
  useEffect(() => {
    if (!selectedTask) return;
    const ai = selectedTask.aiResult?.rubricScores;
    if (ai) {
      setRubric({
        grammar:       ai.grammar      ?? 5,
        vocabulary:    ai.vocabulary   ?? 5,
        coherence:     ai.coherence    ?? 5,
        taskRelevance: ai.taskRelevance ?? 5,
        fluency:       ai.fluency      ?? 5,
      });
    } else {
      const suggested = cefrToScore(selectedTask.aiResult?.cefrLevel);
      setRubric({ grammar: suggested, vocabulary: suggested, coherence: suggested, taskRelevance: suggested, fluency: suggested });
    }
    setFeedback("");
  }, [selectedTask]);

  const handleClaim = async (task: RatingTask) => {
    if (!raterId) return;
    const endpoint = task.needsSecondRater
      ? `/api/rating/tasks/${task.id}/claim-second`
      : `/api/rating/tasks/${task.id}/claim`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ raterId }),
      });
      if (res.ok) {
        setSelectedTask(task);
        setIsSecondRater(task.needsSecondRater ?? false);
      }
    } catch (err) {
      console.error("Failed to claim task");
    }
  };

  const handleSubmit = async () => {
    if (!selectedTask || submitting) return;
    setSubmitting(true);
    const score    = overallScore();
    const endpoint = isSecondRater
      ? `/api/rating/tasks/${selectedTask.id}/submit-second`
      : `/api/rating/tasks/${selectedTask.id}/submit`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ score, feedback, rubricScores: rubric }),
      });
      if (res.ok) {
        setSelectedTask(null);
        setIsSecondRater(false);
        fetchTasks();
      }
    } catch (err) {
      console.error("Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  const dims = selectedTask?.type === "SPEAKING" ? RUBRIC_DIMS_SPEAKING : RUBRIC_DIMS_WRITING;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rating Queue</h1>
          <p className="text-slate-500 text-sm mt-0.5">Double-blind human evaluation for Speaking &amp; Writing responses.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchTasks}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Pending",   value: stats.pending,   color: "text-amber-600  bg-amber-50  border-amber-100",  icon: <Clock size={14} /> },
            { label: "Claimed",   value: stats.claimed,   color: "text-indigo-600 bg-indigo-50 border-indigo-100", icon: <Users size={14} /> },
            { label: "Completed", value: stats.completed, color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: <CheckCircle2 size={14} /> },
            { label: "Flagged",   value: stats.flagged,   color: "text-red-600    bg-red-50    border-red-100",    icon: <Flag size={14} /> },
            { label: "Avg QWK",   value: stats.avgQwk != null ? stats.avgQwk.toFixed(2) : "—", color: "text-violet-600 bg-violet-50 border-violet-100", icon: <BarChart2 size={14} /> },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-3 flex items-center gap-2 ${s.color}`}>
              {s.icon}
              <div>
                <div className="text-lg font-bold leading-none">{s.value}</div>
                <div className="text-[10px] uppercase tracking-wider font-medium opacity-70">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Status filter tabs ─────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["PENDING","CLAIMED","COMPLETED","FLAGGED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setSelectedTask(null); }}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 -mb-px transition-colors",
              statusFilter === s
                ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {s}
            {s === "PENDING" && stats?.pending   ? ` (${stats.pending})`   : ""}
            {s === "FLAGGED" && stats?.flagged    ? ` (${stats.flagged})`   : ""}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Task list ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-400">
                  <Clock className="animate-spin mx-auto mb-2" size={22} />
                  <p className="text-sm">Loading…</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={22} />
                  <p className="text-sm">Queue is empty</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleClaim(task)}
                      disabled={statusFilter === "COMPLETED"}
                      className={cn(
                        "w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group disabled:opacity-60 disabled:cursor-default",
                        selectedTask?.id === task.id && "bg-indigo-50/60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                          task.type === "WRITING" ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {task.type === "WRITING" ? <MessageSquare size={16} /> : <Play size={16} />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 text-sm">{task.type}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {task.response?.item?.cefrLevel ?? ""} · {task.response?.session?.candidate?.name ?? task.sessionId?.slice(0, 8) ?? "—"}
                          </div>
                          {task.needsSecondRater && (
                            <span className="text-[9px] bg-violet-100 text-violet-700 px-1 rounded font-bold">2ND RATER</span>
                          )}
                          {task.qwk != null && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold ml-1">QWK {task.qwk.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Rating interface ───────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedTask ? (
              <motion.div
                key={selectedTask.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="border-indigo-200 shadow-lg shadow-indigo-100/40">
                  {/* Task header */}
                  <CardHeader className="border-b border-slate-100 bg-slate-50/60 py-3 px-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-black uppercase tracking-widest">
                          {selectedTask.type}
                        </span>
                        {isSecondRater && (
                          <span className="px-2 py-0.5 bg-violet-600 text-white rounded text-[10px] font-black uppercase tracking-widest">
                            2nd Rater
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {selectedTask.response?.item?.cefrLevel ?? ""} · {selectedTask.response?.session?.candidate?.name ?? ""}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>Dismiss</Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Response text */}
                    <section>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Candidate Response</p>
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed text-slate-700 text-sm whitespace-pre-wrap max-h-52 overflow-y-auto">
                        {selectedTask.content || <em className="text-slate-400">No content available — check response metadata.</em>}
                      </div>
                    </section>

                    {/* AI provisional score */}
                    {selectedTask.aiResult && (
                      <section className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-widest">
                          <AlertCircle size={13} />
                          AI Provisional — {selectedTask.aiResult.cefrLevel ?? "?"}
                          {selectedTask.aiResult.score != null && (
                            <span className="ml-auto text-amber-600 font-mono">{(selectedTask.aiResult.score * 10).toFixed(1)} / 10</span>
                          )}
                        </div>
                        {selectedTask.aiResult.feedback && (
                          <p className="text-xs text-amber-700 italic">"{selectedTask.aiResult.feedback}"</p>
                        )}
                        {/* AI rubric breakdown mini-bars */}
                        {selectedTask.aiResult.rubricScores && (
                          <div className="space-y-1 pt-1 border-t border-amber-200">
                            {Object.entries(selectedTask.aiResult.rubricScores).map(([dim, val]) => (
                              <div key={dim} className="flex items-center gap-2">
                                <span className="text-[10px] text-amber-600 w-24 truncate">{DIM_LABELS[dim as RubricDim] ?? dim}</span>
                                <div className="flex-1 h-1 bg-amber-100 rounded-full">
                                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(val as number) * 10}%` }} />
                                </div>
                                <span className="text-[10px] font-mono text-amber-700 w-5 text-right">{(val as number).toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    )}

                    {/* Per-dimension rubric scoring */}
                    <section className="space-y-4 pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Rubric Scores</p>
                      {dims.map((dim) => (
                        <div key={dim}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-medium text-slate-700">{DIM_LABELS[dim]}</label>
                            <span className="text-sm font-bold text-indigo-600 font-mono w-6 text-right">{rubric[dim].toFixed(1)}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={rubric[dim]}
                            onChange={(e) => setRubric(prev => ({ ...prev, [dim]: parseFloat(e.target.value) }))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                          <div className="flex justify-between mt-0.5 text-[9px] text-slate-400">
                            <span>Pre-A1</span><span>B1</span><span>C2</span>
                          </div>
                        </div>
                      ))}

                      {/* Overall derived score */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-sm font-semibold text-slate-700">Overall (derived)</span>
                        <span className="text-xl font-black text-indigo-600">{(overallScore() * 10).toFixed(2)} / 10</span>
                      </div>
                    </section>

                    {/* Qualitative feedback */}
                    <section>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Qualitative Feedback <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={4}
                        className="w-full p-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-0 transition-all resize-none text-sm"
                        placeholder="Provide specific, actionable feedback for the candidate…"
                      />
                    </section>

                    <Button
                      className="w-full h-11 font-bold"
                      onClick={handleSubmit}
                      disabled={submitting || feedback.trim().length < 10}
                    >
                      {submitting
                        ? <><RefreshCw size={14} className="animate-spin mr-2" />Submitting…</>
                        : isSecondRater ? "Submit Second Rating" : "Submit Rating"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="h-[580px] flex flex-col items-center justify-center text-center p-12 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-5">
                  <ClipboardList size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Select a Task</h3>
                <p className="text-sm text-slate-500 max-w-xs">
                  Choose a task from the queue to begin evaluation. Tasks marked <strong>2ND RATER</strong> await a second independent rater.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
