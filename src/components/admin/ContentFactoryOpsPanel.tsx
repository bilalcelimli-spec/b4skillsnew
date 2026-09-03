/**
 * Content Factory Operations Panel
 * Maintenance job controls for admins — backfills, batch scoring,
 * pilot promotion dry-run, suspend controls.
 * All jobs are one-click, results shown inline.
 */
import { useState, useEffect } from "react";
import {
  Hash, Brain, Zap, FlaskConical, RefreshCw,
  CheckCircle2, AlertTriangle, Info, Play,
} from "lucide-react";

interface OpsStats {
  missingCodes: number;
  missingEmbeddings: number;
  unscoredIqs: number;
  approvedForPilot: number;
}

interface JobResult {
  ok: boolean;
  message: string;
  detail?: string;
}

interface Job {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  warning?: string;
  actionLabel: string;
  statKey?: keyof OpsStats;
  statLabel?: string;
  run: () => Promise<JobResult>;
}

// ── Single job card ───────────────────────────────────────────────────────────

function JobCard({ job, stats }: { job: Job; stats: OpsStats | null }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<JobResult | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      const r = await job.run();
      setResult(r);
    } catch (e) {
      setResult({ ok: false, message: (e as Error).message });
    } finally {
      setRunning(false);
    }
  };

  const stat = job.statKey && stats ? stats[job.statKey] : null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[var(--muted)]/10 text-[var(--muted)] shrink-0">
          {job.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-[var(--foreground)]">{job.title}</h4>
            {stat !== null && stat !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                stat === 0 ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                           : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
              }`}>
                {stat} {job.statLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed">{job.description}</p>
          {job.warning && (
            <p className="text-[10px] text-amber-500 flex items-center gap-1 mt-1">
              <AlertTriangle size={10} className="shrink-0" />{job.warning}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleRun}
        disabled={running}
        className="flex items-center gap-2 self-start px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
      >
        {running ? <><RefreshCw size={11} className="animate-spin" /> Running…</> : <><Play size={11} /> {job.actionLabel}</>}
      </button>

      {result && (
        <div className={`flex items-start gap-2 p-2.5 rounded-lg text-xs border ${
          result.ok
            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
        }`}>
          {result.ok ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> : <AlertTriangle size={13} className="shrink-0 mt-0.5" />}
          <div>
            <p className="font-medium">{result.message}</p>
            {result.detail && <p className="text-[10px] opacity-80 mt-0.5">{result.detail}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pilot dry-run preview ─────────────────────────────────────────────────────

function PilotDryRunCard() {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Array<{ id: string; itemCode: string | null; skill: string; cefrLevel: string; iqScore: number | null }> | null>(null);

  const runDryRun = async () => {
    setLoading(true);
    setCandidates(null);
    try {
      const r = await fetch("/api/content/pilot/promote?dryRun=true", { method: "POST" });
      const d = await r.json();
      setCandidates(d.candidates ?? []);
    } catch { setCandidates([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-500 shrink-0">
          <FlaskConical size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-[var(--foreground)]">Pilot Promotion — Dry Run</h4>
          <p className="text-xs text-[var(--muted)] mt-0.5">Preview which APPROVED_FOR_PILOT items would be promoted to PRETEST without committing.</p>
        </div>
      </div>

      <button
        onClick={runDryRun}
        disabled={loading}
        className="flex items-center gap-2 self-start px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
      >
        {loading ? <><RefreshCw size={11} className="animate-spin" /> Checking…</> : <><Play size={11} /> Preview candidates</>}
      </button>

      {candidates !== null && (
        candidates.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-[var(--muted)] p-2.5 rounded-lg border border-[var(--border)]">
            <CheckCircle2 size={13} className="text-emerald-500" /> No items in APPROVED_FOR_PILOT stage.
          </div>
        ) : (
          <div className="rounded-lg border border-purple-200 dark:border-purple-800 overflow-hidden">
            <div className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
              <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">{candidates.length} item{candidates.length > 1 ? "s" : ""} would be promoted</p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {candidates.slice(0, 20).map((c) => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                  <span className="font-mono text-[var(--foreground)]">{c.itemCode ?? c.id.slice(0, 10)}</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-medium">{c.cefrLevel}</span>
                  <span className="text-[var(--muted)]">{c.skill}</span>
                  {c.iqScore != null && <span className={`ml-auto text-[10px] font-bold ${c.iqScore >= 65 ? "text-emerald-500" : "text-amber-500"}`}>IQS {Math.round(c.iqScore)}</span>}
                </div>
              ))}
              {candidates.length > 20 && (
                <div className="px-3 py-1.5 text-[10px] text-[var(--muted)]">…and {candidates.length - 20} more</div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function ContentFactoryOpsPanel() {
  const [stats, setStats] = useState<OpsStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadStats = () => {
    setStatsLoading(true);
    fetch("/api/content/ops/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  };

  useEffect(() => { loadStats(); }, []);

  const jobs: Job[] = [
    {
      id: "item-codes",
      icon: <Hash size={16} />,
      title: "Item Code Backfill",
      description: "Assign human-readable codes (REA-B2-0042) to items that have none. Safe to run multiple times — only touches items with null itemCode.",
      actionLabel: "Run backfill",
      statKey: "missingCodes",
      statLabel: "items missing codes",
      run: async () => {
        const r = await fetch("/api/content/item-codes/backfill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maxItems: 500 }) });
        const d = await r.json();
        if (!r.ok) return { ok: false, message: d.error ?? "Backfill failed" };
        return { ok: true, message: `Assigned ${d.assigned} codes`, detail: d.failed > 0 ? `${d.failed} failed — check server logs` : undefined };
      },
    },
    {
      id: "embeddings",
      icon: <Brain size={16} />,
      title: "Embedding Backfill",
      description: "Generate Gemini text-embedding-004 vectors for items that predate the duplicate detector. Required for accurate near-clone screening in future batches.",
      warning: "Makes one Gemini API call per item — may take several minutes for large backlogs.",
      actionLabel: "Run embedding backfill (max 200)",
      statKey: "missingEmbeddings",
      statLabel: "items missing embeddings",
      run: async () => {
        const r = await fetch("/api/content/duplicates/backfill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maxItems: 200 }) });
        const d = await r.json();
        if (!r.ok) return { ok: false, message: d.error ?? "Backfill failed" };
        return { ok: true, message: `Embedded ${d.processed} items`, detail: d.failed > 0 ? `${d.failed} failed (non-fatal)` : undefined };
      },
    },
    {
      id: "iqs",
      icon: <Zap size={16} />,
      title: "IQS Batch Score",
      description: "Compute and store Item Quality Score (0–100) for items that don't have one yet. Reviewers see IQS in the review queue — this backfills legacy items.",
      actionLabel: "Score unscored items",
      statKey: "unscoredIqs",
      statLabel: "unscored items",
      run: async () => {
        const r = await fetch("/api/items/iqs/batch?onlyUnscored=true", { method: "POST" });
        const d = await r.json();
        if (!r.ok) return { ok: false, message: d.error ?? "IQS batch failed" };
        return { ok: true, message: `Scored ${d.processed ?? d.count ?? "?"} items`, detail: d.failed > 0 ? `${d.failed} failed` : undefined };
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Info size={13} className="text-blue-400" />
          <p className="text-xs text-[var(--muted)]">
            Maintenance jobs — safe to run at any time. Stats refresh automatically.
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={statsLoading}
          className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <RefreshCw size={11} className={statsLoading ? "animate-spin" : ""} /> Refresh stats
        </button>
      </div>

      {/* Job cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} stats={stats} />
        ))}
        <PilotDryRunCard />
      </div>

      {/* Approved-for-pilot quick stat */}
      {stats && stats.approvedForPilot > 0 && (
        <div className="rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 p-3 flex items-center gap-3">
          <FlaskConical size={16} className="text-purple-500 shrink-0" />
          <p className="text-xs text-purple-700 dark:text-purple-300">
            <strong>{stats.approvedForPilot} item{stats.approvedForPilot > 1 ? "s" : ""}</strong> approved and waiting for pilot promotion.
            Go to the <strong>Monitor tab</strong> and click "Promote APPROVED → PILOT" to embed them in live sessions.
          </p>
        </div>
      )}
    </div>
  );
}
