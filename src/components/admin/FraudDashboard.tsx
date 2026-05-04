import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { RefreshCw, Shield, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type FraudTier = "PASS" | "REVIEW" | "FLAG" | "BLOCK";

interface FraudSignals {
  rtAnomalyScore: number;
  rtOutlierItems: string[];
  similarityScore: number;
  mostSimilarSessionId: string | null;
  ipClusterScore: number;
  clusterSize: number;
}

interface FraudSession {
  sessionId: string;
  candidateId: string;
  compositeScore: number;
  auditedAt: string;
  signals?: FraudSignals;
  tier?: FraudTier;
}

interface BatchSummary {
  audited: number;
  blocked: number;
  flagged: number;
  reviewed: number;
  passed: number;
}

// ─── Tier helpers ─────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<FraudTier, { label: string; color: string; icon: React.ReactNode }> = {
  PASS:   { label: "Pass",   color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: <CheckCircle2 size={13} /> },
  REVIEW: { label: "Review", color: "text-amber-600 bg-amber-50 border-amber-200",       icon: <AlertTriangle size={13} /> },
  FLAG:   { label: "Flag",   color: "text-orange-600 bg-orange-50 border-orange-200",    icon: <AlertTriangle size={13} /> },
  BLOCK:  { label: "Block",  color: "text-red-600 bg-red-50 border-red-200",             icon: <XCircle size={13} /> },
};

function TierBadge({ tier }: { tier: FraudTier }) {
  const cfg = TIER_CONFIG[tier];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border", cfg.color)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.75 ? "bg-red-500" : value >= 0.5 ? "bg-orange-400" : value >= 0.3 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono w-8 text-right text-slate-600">{(value).toFixed(2)}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FraudDashboard() {
  const [activeTier, setActiveTier] = useState<FraudTier>("FLAG");
  const [sessions, setSessions] = useState<FraudSession[]>([]);
  const [batchResult, setBatchResult] = useState<BatchSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTier = useCallback(async (tier: FraudTier) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/fraud-tier/${tier}?limit=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSessions(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const runBatch = useCallback(async () => {
    setBatchRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions/fraud-check/batch", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBatchResult(data);
      // Refresh current tier list
      await fetchTier(activeTier);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBatchRunning(false);
    }
  }, [activeTier, fetchTier]);

  React.useEffect(() => { fetchTier(activeTier); }, [activeTier, fetchTier]);

  const tiers: FraudTier[] = ["BLOCK", "FLAG", "REVIEW", "PASS"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Fraud Detection Dashboard</h2>
          <p className="text-sm text-slate-500">RT anomaly · Response-pattern similarity · IP clustering</p>
        </div>
        <Button variant="outline" size="sm" onClick={runBatch} disabled={batchRunning}>
          <Shield size={14} className={cn("mr-1.5", batchRunning && "animate-pulse")} />
          {batchRunning ? "Running audit…" : "Run Batch Audit"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Batch result summary */}
      {batchResult && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-semibold text-slate-500 mb-3">Last batch result</p>
            <div className="grid grid-cols-5 gap-3 text-center">
              {(["audited", "passed", "reviewed", "flagged", "blocked"] as const).map((k) => (
                <div key={k}>
                  <div className="text-xl font-bold text-slate-800">{batchResult[k as keyof BatchSummary]}</div>
                  <div className="text-xs text-slate-400 capitalize">{k}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tier tabs */}
      <div className="flex gap-2">
        {tiers.map((t) => {
          const cfg = TIER_CONFIG[t];
          return (
            <button
              key={t}
              onClick={() => setActiveTier(t)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                activeTier === t ? cfg.color : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
              )}
            >
              {cfg.label}
            </button>
          );
        })}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => fetchTier(activeTier)} disabled={loading}>
          <RefreshCw size={13} className={cn(loading && "animate-spin")} />
        </Button>
      </div>

      {/* Session table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm animate-pulse">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">No sessions in {activeTier} tier.</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Session", "Candidate", "Composite", "Tier", "Audited At", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-slate-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <React.Fragment key={s.sessionId}>
                      <tr
                        className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                        onClick={() => setExpandedId(expandedId === s.sessionId ? null : s.sessionId)}
                      >
                        <td className="px-4 py-2.5 font-mono text-slate-600">{s.sessionId.slice(0, 10)}…</td>
                        <td className="px-4 py-2.5 text-slate-500">{s.candidateId.slice(0, 10)}…</td>
                        <td className="px-4 py-2.5 w-36">
                          <ScoreBar value={s.compositeScore} />
                        </td>
                        <td className="px-4 py-2.5">
                          <TierBadge tier={(s.tier ?? activeTier) as FraudTier} />
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">
                          {new Date(s.auditedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 text-right">
                          {expandedId === s.sessionId ? "▲" : "▼"}
                        </td>
                      </tr>
                      {expandedId === s.sessionId && s.signals && (
                        <tr className="bg-slate-50">
                          <td colSpan={6} className="px-6 py-3">
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div>
                                <p className="font-semibold text-slate-600 mb-1">RT Anomaly</p>
                                <ScoreBar value={s.signals.rtAnomalyScore} />
                                <p className="text-slate-400 mt-1">{s.signals.rtOutlierItems.length} outlier items</p>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-600 mb-1">Pattern Similarity</p>
                                <ScoreBar value={s.signals.similarityScore} />
                                {s.signals.mostSimilarSessionId && (
                                  <p className="text-slate-400 mt-1 font-mono truncate">
                                    Similar: {s.signals.mostSimilarSessionId.slice(0, 12)}…
                                  </p>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-600 mb-1">IP Cluster</p>
                                <ScoreBar value={s.signals.ipClusterScore} />
                                <p className="text-slate-400 mt-1">{s.signals.clusterSize} sessions from /24</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
