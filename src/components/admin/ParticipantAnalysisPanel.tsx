/**
 * ParticipantAnalysisPanel.tsx
 *
 * Full per-session analysis view for admins / proctors / teachers.
 * Shows: candidate header, score summary, response pattern chart,
 * skill & CEFR breakdowns, person-fit card, item-level response table,
 * and a slide-in question detail drawer.
 *
 * Data source: GET /api/sessions/:id/full-analysis
 */

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import {
  ArrowLeft,
  User,
  Clock,
  Target,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  X,
  Download,
  Filter,
  Activity,
  Zap,
  Shield,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalysisData {
  session: {
    id: string;
    status: string;
    theta: number;
    sem: number;
    cefrLevel: string | null;
    startedAt: string | null;
    completedAt: string | null;
    responsesCount: number;
  };
  candidate: { id: string; name: string; email: string };
  scoreReport: { overallCefr: string; overallScore: number } | null;
  responses: Array<{
    id: string;
    order: number;
    value: string | null;
    isCorrect: boolean | null;
    score: number | null;
    aiScore: number | null;
    humanScore: number | null;
    latencyMs: number;
    rtZScore: number | null;
    rtFlag: string | null;
    item: {
      id: string;
      itemCode: string | null;
      type: string;
      skill: string;
      cefrLevel: string;
      difficulty: number;
      discrimination: number;
      guessing: number;
      content: {
        prompt?: string;
        question?: string;
        options?: string[];
        correctAnswer?: string | number;
        imageUrl?: string;
      };
    };
  }>;
  personFit: {
    lz: number;
    eci: number;
    u3: number;
    rgi: number;
    flag: string;
    recommendedAction: string;
  } | null;
  stats: {
    totalItems: number;
    totalCorrect: number;
    pctCorrect: number;
    avgLatencyMs: number;
    medianLatencyMs: number;
    durationMs: number | null;
    skillBreakdown: Record<string, { total: number; correct: number; avgLatency: number }>;
    cefrBreakdown: Record<string, { total: number; correct: number }>;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

const CEFR_COLORS: Record<string, string> = {
  PRE_A1: "#94a3b8", A1: "#60a5fa", A2: "#34d399",
  B1: "#fbbf24", B2: "#f97316", C1: "#a78bfa", C2: "#f43f5e",
};

const SKILL_COLORS: Record<string, string> = {
  READING: "#6366f1", LISTENING: "#22d3ee", WRITING: "#f59e0b",
  SPEAKING: "#ec4899", GRAMMAR: "#10b981", VOCABULARY: "#8b5cf6",
};

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = (ms / 1000).toFixed(1);
  return `${s}s`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec.toString().padStart(2, "0")}s`;
}

function cefrBadgeClass(cefr: string): string {
  const map: Record<string, string> = {
    PRE_A1: "bg-slate-100 text-slate-600",
    A1: "bg-blue-100 text-blue-700",
    A2: "bg-teal-100 text-teal-700",
    B1: "bg-amber-100 text-amber-700",
    B2: "bg-orange-100 text-orange-700",
    C1: "bg-violet-100 text-violet-700",
    C2: "bg-rose-100 text-rose-700",
  };
  return map[cefr] ?? "bg-slate-100 text-slate-600";
}

const RT_FLAG_LABELS: Record<string, { label: string; cls: string }> = {
  RAPID_GUESS:       { label: "Rapid", cls: "text-rose-500" },
  SOLUTION_BEHAVIOR: { label: "Normal", cls: "text-emerald-600" },
  NORMAL:            { label: "Normal", cls: "text-emerald-600" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}> = ({ icon, label, value, sub, accent = "bg-indigo-50 text-indigo-600" }) => (
  <Card className="border-slate-200 shadow-sm rounded-2xl">
    <CardContent className="p-5 flex items-start gap-4">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", accent)}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</div>
        <div className="text-xl font-black text-slate-900 leading-none">{value}</div>
        {sub && <div className="text-[10px] text-slate-400 font-medium mt-1">{sub}</div>}
      </div>
    </CardContent>
  </Card>
);

// ─── Question Drawer ──────────────────────────────────────────────────────────

const QuestionDrawer: React.FC<{
  response: AnalysisData["responses"][0] | null;
  onClose: () => void;
}> = ({ response, onClose }) => {
  if (!response) return null;
  const { item } = response;
  const prompt = item.content?.prompt ?? item.content?.question ?? "";
  const options = item.content?.options ?? [];
  const correct = item.content?.correctAnswer;
  const selected = response.value;

  return (
    <AnimatePresence>
      <motion.div
        key="drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      <motion.div
        key="drawer"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0">
          <div>
            <div className="text-xs font-black text-slate-900 uppercase tracking-tight">
              #{response.order} · {item.skill} · {item.cefrLevel}
            </div>
            {item.itemCode && (
              <div className="text-[9px] text-slate-400 font-mono mt-0.5">{item.itemCode}</div>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5 flex-1">
          {/* IRT Params */}
          <div className="flex gap-3">
            {[
              { label: "Difficulty (b)", val: item.difficulty.toFixed(2) },
              { label: "Discrim. (a)", val: item.discrimination.toFixed(2) },
              { label: "Guessing (c)", val: item.guessing.toFixed(2) },
            ].map(({ label, val }) => (
              <div key={label} className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</div>
                <div className="text-base font-black text-slate-800 mt-0.5">{val}</div>
              </div>
            ))}
          </div>

          {/* Image */}
          {item.content?.imageUrl && (
            <img
              src={item.content.imageUrl}
              alt="Stimulus"
              className="w-full rounded-2xl object-cover max-h-52 border border-slate-100"
            />
          )}

          {/* Prompt */}
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Question</div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{prompt}</p>
          </div>

          {/* Options */}
          {options.length > 0 && (
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Options</div>
              <div className="space-y-2">
                {options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isSelected = selected === opt || selected === letter || Number(selected) === i;
                  const isCorrectOpt =
                    correct === opt || correct === letter ||
                    Number(correct) === i || String(correct) === String(i);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border text-sm",
                        isCorrectOpt
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : isSelected
                          ? "bg-rose-50 border-rose-200 text-rose-800"
                          : "bg-slate-50 border-slate-100 text-slate-600"
                      )}
                    >
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5",
                        isCorrectOpt ? "bg-emerald-500 text-white" :
                        isSelected ? "bg-rose-400 text-white" : "bg-slate-200 text-slate-500"
                      )}>
                        {letter}
                      </span>
                      <span className="font-medium leading-snug">{opt}</span>
                      {isCorrectOpt && (
                        <CheckCircle2 size={14} className="ml-auto text-emerald-500 flex-shrink-0 mt-0.5" />
                      )}
                      {isSelected && !isCorrectOpt && (
                        <XCircle size={14} className="ml-auto text-rose-400 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Written / Speaking response */}
          {options.length === 0 && response.value && (
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Candidate Response</div>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed border border-slate-100">
                {response.value}
              </div>
            </div>
          )}

          {/* Scores row */}
          <div className="flex gap-3">
            {response.score !== null && (
              <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Score</div>
                <div className="text-lg font-black text-slate-800 mt-0.5">{response.score?.toFixed(2)}</div>
              </div>
            )}
            {response.aiScore !== null && (
              <div className="flex-1 bg-violet-50 rounded-xl p-3 text-center border border-violet-100">
                <div className="text-[8px] font-black uppercase tracking-widest text-violet-400">AI Score</div>
                <div className="text-lg font-black text-violet-800 mt-0.5">{response.aiScore?.toFixed(2)}</div>
              </div>
            )}
            {response.humanScore !== null && (
              <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                <div className="text-[8px] font-black uppercase tracking-widest text-amber-500">Human Score</div>
                <div className="text-lg font-black text-amber-800 mt-0.5">{response.humanScore?.toFixed(2)}</div>
              </div>
            )}
          </div>

          {/* RT Metadata */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Response Time</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[8px] text-slate-400 font-medium">Latency</div>
                <div className="text-sm font-black text-slate-800">{formatMs(response.latencyMs)}</div>
              </div>
              <div>
                <div className="text-[8px] text-slate-400 font-medium">RT Z-score</div>
                <div className="text-sm font-black text-slate-800">
                  {response.rtZScore !== null ? response.rtZScore.toFixed(2) : "—"}
                </div>
              </div>
              <div>
                <div className="text-[8px] text-slate-400 font-medium">RT Flag</div>
                <div className={cn("text-sm font-black", RT_FLAG_LABELS[response.rtFlag ?? ""]?.cls ?? "text-slate-600")}>
                  {RT_FLAG_LABELS[response.rtFlag ?? ""]?.label ?? response.rtFlag ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  sessionId: string;
  onBack: () => void;
}

type SkillFilter = "ALL" | "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "GRAMMAR" | "VOCABULARY";
type CorrectnessFilter = "ALL" | "CORRECT" | "INCORRECT";
type RTFilter = "ALL" | "RAPID_GUESS" | "NORMAL";

export const ParticipantAnalysisPanel: React.FC<Props> = ({ sessionId, onBack }) => {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<AnalysisData["responses"][0] | null>(null);

  // Table filters
  const [skillFilter, setSkillFilter]       = useState<SkillFilter>("ALL");
  const [correctFilter, setCorrectFilter]   = useState<CorrectnessFilter>("ALL");
  const [rtFilter, setRtFilter]             = useState<RTFilter>("ALL");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/full-analysis`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError("Analiz verisi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // CSV Export
  const exportCsv = () => {
    if (!data) return;
    const header = ["#", "Skill", "CEFR", "Type", "ItemCode", "Prompt(80)", "Answer", "Correct", "Score", "LatencyMs", "RTFlag", "Difficulty"];
    const rows = data.responses.map((r) => [
      r.order,
      r.item.skill,
      r.item.cefrLevel,
      r.item.type,
      r.item.itemCode ?? "",
      `"${(r.item.content?.prompt ?? "").slice(0, 80).replace(/"/g, "'")}"`,
      `"${(r.value ?? "").slice(0, 60).replace(/"/g, "'")}"`,
      r.isCorrect === true ? "1" : r.isCorrect === false ? "0" : "",
      r.score ?? "",
      r.latencyMs,
      r.rtFlag ?? "",
      r.item.difficulty.toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${sessionId.slice(-8)}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-slate-100 rounded-2xl w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl" />
        <div className="h-72 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle size={40} className="text-rose-400" />
        <p className="text-slate-500 font-medium">{error ?? "Veri bulunamadı."}</p>
        <Button variant="outline" onClick={onBack}>Geri dön</Button>
      </div>
    );
  }

  const { session, candidate, scoreReport, responses, personFit, stats } = data;

  // ── Filtered responses for table ─────────────────────────────────────────
  const filteredResponses = responses.filter((r) => {
    if (skillFilter !== "ALL" && r.item.skill !== skillFilter) return false;
    if (correctFilter === "CORRECT" && r.isCorrect !== true) return false;
    if (correctFilter === "INCORRECT" && r.isCorrect !== false) return false;
    if (rtFilter === "RAPID_GUESS" && r.rtFlag !== "RAPID_GUESS") return false;
    if (rtFilter === "NORMAL" && r.rtFlag === "RAPID_GUESS") return false;
    return true;
  });

  // ── Chart data ───────────────────────────────────────────────────────────
  const responseChartData = responses.map((r) => ({
    name: `#${r.order}`,
    correct: r.isCorrect === true ? 1 : 0,
    incorrect: r.isCorrect === false ? 1 : 0,
    latency: Math.round(r.latencyMs / 1000 * 10) / 10,
    skill: r.item.skill,
    cefr: r.item.cefrLevel,
    difficulty: r.item.difficulty,
  }));

  const skillChartData = Object.entries(stats.skillBreakdown).map(([skill, d]) => ({
    skill: skill.slice(0, 4),
    fullSkill: skill,
    correct: d.correct,
    incorrect: d.total - d.correct,
    pct: Math.round((d.correct / d.total) * 100),
    avgLatency: d.avgLatency,
  }));

  const cefrChartData = CEFR_ORDER
    .filter((c) => stats.cefrBreakdown[c])
    .map((c) => ({
      cefr: c,
      correct: stats.cefrBreakdown[c].correct,
      incorrect: stats.cefrBreakdown[c].total - stats.cefrBreakdown[c].correct,
    }));

  const cefr = scoreReport?.overallCefr ?? session.cefrLevel ?? "—";
  const durationStr = stats.durationMs ? formatDuration(stats.durationMs) : "—";

  // ── Person-fit flag severity ─────────────────────────────────────────────
  const pfBannerClass = personFit
    ? personFit.recommendedAction === "INVALIDATE"
      ? "bg-rose-50 border-rose-200 text-rose-700"
      : personFit.recommendedAction === "REVIEW"
      ? "bg-amber-50 border-amber-200 text-amber-700"
      : ""
    : "";

  return (
    <div className="space-y-8">
      {/* ── Back + Title ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            Katılımcı Analizi
          </h2>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Session ID: {sessionId}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}
          className="h-9 text-[10px] font-black uppercase tracking-widest rounded-xl gap-2">
          <Download size={13} /> CSV
        </Button>
      </div>

      {/* ── Candidate Header ─────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xl flex-shrink-0">
              {candidate.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-black text-slate-900">{candidate.name}</h3>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                  session.status === "COMPLETED" ? "bg-emerald-100 text-emerald-600" :
                  session.status === "FLAGGED"   ? "bg-rose-100 text-rose-600" :
                  "bg-slate-100 text-slate-500"
                )}>
                  {session.status}
                </span>
                {cefr && cefr !== "—" && (
                  <span className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest", cefrBadgeClass(cefr))}>
                    {cefr}
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-400 font-medium mt-1">{candidate.email}</div>
              <div className="flex gap-6 mt-3 text-[10px] text-slate-500 font-medium flex-wrap">
                {session.startedAt && (
                  <span>Başlangıç: {new Date(session.startedAt).toLocaleString("tr-TR")}</span>
                )}
                {session.completedAt && (
                  <span>Bitiş: {new Date(session.completedAt).toLocaleString("tr-TR")}</span>
                )}
                <span>Süre: {durationStr}</span>
              </div>
            </div>
          </div>

          {/* Person-fit banner */}
          {personFit && personFit.recommendedAction !== "ACCEPT" && (
            <div className={cn("mt-4 flex items-center gap-3 rounded-xl p-3 border text-sm font-semibold", pfBannerClass)}>
              <AlertTriangle size={16} className="flex-shrink-0" />
              Person-Fit uyarısı: {personFit.flag} — {personFit.recommendedAction}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 4 Stat Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity size={20} />}
          label="Theta (θ)"
          value={session.theta.toFixed(2)}
          sub={`SEM ±${session.sem.toFixed(2)} · CI [${(session.theta - 1.96 * session.sem).toFixed(1)}, ${(session.theta + 1.96 * session.sem).toFixed(1)}]`}
          accent="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={<Target size={20} />}
          label="Doğruluk"
          value={`${stats.pctCorrect}%`}
          sub={`${stats.totalCorrect}/${stats.totalItems} doğru`}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={<Zap size={20} />}
          label="Ort. Yanıt Süresi"
          value={formatMs(stats.avgLatencyMs)}
          sub={`Medyan: ${formatMs(stats.medianLatencyMs)}`}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Test Süresi"
          value={durationStr}
          sub={`${stats.totalItems} soru`}
          accent="bg-purple-50 text-purple-600"
        />
      </div>

      {/* ── Response Pattern Chart ────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
          <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <BarChart3 size={16} className="text-indigo-500" />
            Yanıt Örüntüsü
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Doğru / Yanlış</div>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={responseChartData} barSize={8} margin={{ left: 0, right: 0 }}>
              <XAxis dataKey="name" tick={false} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 1]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-xs">
                      <div className="font-black text-slate-900">{d.name} · {d.skill} · {d.cefr}</div>
                      <div className={d.correct ? "text-emerald-600" : "text-rose-500"}>
                        {d.correct ? "✓ Doğru" : "✗ Yanlış"}
                      </div>
                      <div className="text-slate-400">Süre: {d.latency}s · Zorluk: {d.difficulty}</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="correct" stackId="a" radius={[2, 2, 0, 0]}>
                {responseChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.correct ? "#10b981" : "#f43f5e"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 mt-4">Yanıt Süresi (saniye)</div>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={responseChartData} barSize={8} margin={{ left: 0, right: 0 }}>
              <XAxis dataKey="name" tick={false} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-xs">
                      <div className="font-black text-slate-900">{d.name}</div>
                      <div className="text-slate-600">Süre: {d.latency}s</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="latency" fill="#6366f1" radius={[2, 2, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Skill & CEFR Breakdowns ───────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Skill */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Beceri Kırılımı
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {skillChartData.length === 0 ? (
              <p className="text-slate-400 text-sm italic text-center py-8">Veri yok</p>
            ) : skillChartData.map((d) => (
              <div key={d.fullSkill}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: SKILL_COLORS[d.fullSkill] }} />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{d.fullSkill}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    {d.correct}/{d.correct + d.incorrect} · avg {formatMs(d.avgLatency)}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${d.pct}%`, background: SKILL_COLORS[d.fullSkill] }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* CEFR */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">
              CEFR Seviye Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {cefrChartData.length === 0 ? (
              <p className="text-slate-400 text-sm italic text-center py-8">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={cefrChartData} barSize={28} margin={{ bottom: 0 }}>
                  <XAxis dataKey="cefr" tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const correct = (payload.find((p) => p.dataKey === "correct")?.value as number) ?? 0;
                      const incorrect = (payload.find((p) => p.dataKey === "incorrect")?.value as number) ?? 0;
                      return (
                        <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-xs">
                          <div className="font-black text-slate-900">{label}</div>
                          <div className="text-emerald-600">✓ {correct} doğru</div>
                          <div className="text-rose-500">✗ {incorrect} yanlış</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="correct" stackId="a" radius={[0, 0, 0, 0]}>
                    {cefrChartData.map((entry) => (
                      <Cell key={entry.cefr} fill={CEFR_COLORS[entry.cefr] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                  <Bar dataKey="incorrect" stackId="a" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Person-Fit Card ───────────────────────────────────────── */}
      {personFit && (
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Shield size={16} className="text-violet-500" />
              Person-Fit Analizi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
              {[
                { label: "Lz (Drasgow 1985)", val: personFit.lz.toFixed(3), note: "< -1.65 → şüpheli" },
                { label: "ECI (Tatsuoka 1984)", val: personFit.eci.toFixed(3), note: "Aşırı → yanıt tutarsızlığı" },
                { label: "U3 (van der Linden)", val: personFit.u3.toFixed(3), note: "Hız–doğruluk denge" },
                { label: "RGI", val: personFit.rgi.toFixed(3), note: "Ort. bilgi oranı" },
              ].map(({ label, val, note }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</div>
                  <div className="text-2xl font-black text-slate-900">{val}</div>
                  <div className="text-[9px] text-slate-400 font-medium mt-1">{note}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600">Karar:</span>
              <span className={cn(
                "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest",
                personFit.recommendedAction === "ACCEPT"    ? "bg-emerald-100 text-emerald-700" :
                personFit.recommendedAction === "REVIEW"    ? "bg-amber-100 text-amber-700" :
                personFit.recommendedAction === "INVALIDATE"? "bg-rose-100 text-rose-700" :
                "bg-slate-100 text-slate-600"
              )}>
                {personFit.recommendedAction}
              </span>
              <span className="text-xs text-slate-400">{personFit.flag}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Response Table ────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Yanıt Tablosu
              <span className="ml-2 text-slate-400 font-medium normal-case text-xs">
                ({filteredResponses.length} / {responses.length})
              </span>
            </CardTitle>
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={12} className="text-slate-400" />
              {/* Skill filter */}
              <select
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value as SkillFilter)}
                className="text-[10px] font-black uppercase tracking-widest border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white"
              >
                <option value="ALL">Tüm Beceriler</option>
                {["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {/* Correctness filter */}
              <select
                value={correctFilter}
                onChange={(e) => setCorrectFilter(e.target.value as CorrectnessFilter)}
                className="text-[10px] font-black uppercase tracking-widest border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white"
              >
                <option value="ALL">Tümü</option>
                <option value="CORRECT">Doğru</option>
                <option value="INCORRECT">Yanlış</option>
              </select>
              {/* RT filter */}
              <select
                value={rtFilter}
                onChange={(e) => setRtFilter(e.target.value as RTFilter)}
                className="text-[10px] font-black uppercase tracking-widest border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white"
              >
                <option value="ALL">Tüm RT</option>
                <option value="RAPID_GUESS">Hızlı Tahmin</option>
                <option value="NORMAL">Normal</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30 text-slate-400 text-[8px] uppercase tracking-widest font-black">
                  <th className="px-5 py-3 border-b border-slate-100">#</th>
                  <th className="px-5 py-3 border-b border-slate-100">Beceri</th>
                  <th className="px-5 py-3 border-b border-slate-100">CEFR</th>
                  <th className="px-5 py-3 border-b border-slate-100">Tür</th>
                  <th className="px-5 py-3 border-b border-slate-100 max-w-xs">Soru (özet)</th>
                  <th className="px-5 py-3 border-b border-slate-100">Yanıt</th>
                  <th className="px-5 py-3 border-b border-slate-100 text-center">✓/✗</th>
                  <th className="px-5 py-3 border-b border-slate-100 text-right">Skor</th>
                  <th className="px-5 py-3 border-b border-slate-100 text-right">Süre</th>
                  <th className="px-5 py-3 border-b border-slate-100">RT</th>
                  <th className="px-5 py-3 border-b border-slate-100 text-right">Zorluk</th>
                  <th className="px-5 py-3 border-b border-slate-100" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResponses.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-5 py-10 text-center text-slate-400 text-sm italic">
                      Filtreler için yanıt bulunamadı.
                    </td>
                  </tr>
                ) : filteredResponses.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                    onClick={() => setSelectedResponse(r)}
                  >
                    <td className="px-5 py-3 text-xs font-black text-slate-400">{r.order}</td>
                    <td className="px-5 py-3">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{ background: SKILL_COLORS[r.item.skill] + "22", color: SKILL_COLORS[r.item.skill] }}>
                        {r.item.skill.slice(0, 4)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", cefrBadgeClass(r.item.cefrLevel))}>
                        {r.item.cefrLevel}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[9px] font-bold text-slate-400 uppercase">
                      {r.item.type.replace(/_/g, " ")}
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      <p className="text-xs text-slate-600 truncate max-w-[200px]">
                        {(r.item.content?.prompt ?? r.item.content?.question ?? "").slice(0, 90)}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-slate-500 truncate max-w-[120px] font-mono">
                        {(r.value ?? "—").slice(0, 40)}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {r.isCorrect === true  ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" /> :
                       r.isCorrect === false ? <XCircle size={16} className="text-rose-400 mx-auto" /> :
                       <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-xs font-bold text-slate-700">
                      {r.score !== null ? r.score?.toFixed(2) :
                       r.aiScore !== null ? <span className="text-violet-500">{r.aiScore?.toFixed(2)}</span> : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-xs font-bold text-slate-500">
                      {formatMs(r.latencyMs)}
                    </td>
                    <td className="px-5 py-3">
                      {r.rtFlag ? (
                        <span className={cn("text-[9px] font-black", RT_FLAG_LABELS[r.rtFlag]?.cls ?? "text-slate-400")}>
                          {RT_FLAG_LABELS[r.rtFlag]?.label ?? r.rtFlag}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-xs font-mono text-slate-400">
                      {r.item.difficulty.toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Question Detail Drawer ─────────────────────────────────── */}
      <QuestionDrawer
        response={selectedResponse}
        onClose={() => setSelectedResponse(null)}
      />
    </div>
  );
};
