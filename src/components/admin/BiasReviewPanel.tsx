/**
 * BiasReviewPanel — Admin panel for multi-LLM bias review
 * Shows per-item bias review results, allows triggering individual or batch reviews.
 */
import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Layers } from "lucide-react";
import { cn } from "../../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type BiasVerdict = "PASS" | "REVIEW" | "FAIL" | "SKIPPED";

type BiasType =
  | "GENDER_BIAS"
  | "CULTURAL_BIAS"
  | "SOCIOECONOMIC_BIAS"
  | "AGE_BIAS"
  | "DISABILITY_BIAS"
  | "RELIGIOUS_BIAS"
  | "NONE";

type BiasSeverity = "LOW" | "MEDIUM" | "HIGH" | "NONE";

interface ModelOpinion {
  model: string;
  verdict: BiasVerdict;
  biasTypes: BiasType[];
  severity: BiasSeverity;
  evidence: string;
  suggestion: string;
  reviewedAt: string;
}

interface BiasReviewResult {
  itemId: string;
  consensusVerdict: BiasVerdict;
  biasSummary: string;
  opinions: ModelOpinion[];
  reviewedAt: string;
}

interface PendingItem {
  id: string;
  cefrLevel: string;
  skillType: string;
  content: string;
}

interface BatchSummary {
  total: number;
  passed: number;
  reviewed: number;
  failed: number;
  skipped: number;
}

// ─── Verdict helpers ──────────────────────────────────────────────────────────

const VERDICT_CONFIG: Record<BiasVerdict, { label: string; color: string; icon: React.ReactNode }> = {
  PASS:    { label: "Pass",    color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: <CheckCircle2 size={13} /> },
  REVIEW:  { label: "Review",  color: "text-amber-600 bg-amber-50 border-amber-200",       icon: <AlertTriangle size={13} /> },
  FAIL:    { label: "Fail",    color: "text-red-600 bg-red-50 border-red-200",             icon: <XCircle size={13} /> },
  SKIPPED: { label: "Skipped", color: "text-slate-400 bg-slate-50 border-slate-200",       icon: <Layers size={13} /> },
};

const SEVERITY_COLOR: Record<BiasSeverity, string> = {
  NONE:   "text-emerald-600",
  LOW:    "text-amber-500",
  MEDIUM: "text-orange-500",
  HIGH:   "text-red-600",
};

function VerdictBadge({ verdict }: { verdict: BiasVerdict }) {
  const cfg = VERDICT_CONFIG[verdict];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border", cfg.color)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function BiasTypePill({ type }: { type: BiasType }) {
  if (type === "NONE") return null;
  const label = type.replace("_BIAS", "").replace("_", " ");
  return (
    <span className="px-1.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold rounded">
      {label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BiasReviewPanel() {
  const [view, setView] = useState<"pending" | "reviewed">("pending");
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [reviewedItems, setReviewedItems] = useState<{ id: string; cefrLevel: string; skillType: string; result: BiasReviewResult }[]>([]);
  const [batchResult, setBatchResult] = useState<BatchSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch ACTIVE/REVIEW items without a bias-review in metadata
  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/items?status=REVIEW,ACTIVE&limit=100");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Filter to items that don't have biasReview in metadata
      const items = (data.items ?? data) as Array<{
        id: string;
        cefrLevel: string;
        skillType: string;
        content: string;
        metadata?: { biasReview?: unknown };
      }>;
      setPendingItems(
        items
          .filter((it) => !it.metadata?.biasReview)
          .map((it) => ({ id: it.id, cefrLevel: it.cefrLevel, skillType: it.skillType, content: it.content }))
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReviewed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/items?status=REVIEW,ACTIVE&limit=100");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = (data.items ?? data) as Array<{
        id: string;
        cefrLevel: string;
        skillType: string;
        content: string;
        metadata?: { biasReview?: BiasReviewResult };
      }>;
      setReviewedItems(
        items
          .filter((it) => it.metadata?.biasReview)
          .map((it) => ({
            id: it.id,
            cefrLevel: it.cefrLevel,
            skillType: it.skillType,
            result: it.metadata!.biasReview!,
          }))
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "pending") fetchPending();
    else fetchReviewed();
  }, [view, fetchPending, fetchReviewed]);

  const reviewOne = useCallback(async (itemId: string) => {
    setReviewingId(itemId);
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}/bias-review`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Refresh both lists
      await fetchPending();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setReviewingId(null);
    }
  }, [fetchPending]);

  const runBatch = useCallback(async () => {
    setBatchRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/items/bias-review/batch?limit=50", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBatchResult(data);
      await fetchPending();
      await fetchReviewed();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBatchRunning(false);
    }
  }, [fetchPending, fetchReviewed]);

  // ─── Verdict distribution from reviewed items ──────────────────────────────
  const verdictCounts = reviewedItems.reduce(
    (acc, it) => { acc[it.result.consensusVerdict] = (acc[it.result.consensusVerdict] ?? 0) + 1; return acc; },
    {} as Record<BiasVerdict, number>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Bias Review</h2>
          <p className="text-sm text-slate-500">Multi-LLM fairness review per ETS guidelines — Claude 3.5 Sonnet + GPT-4o</p>
        </div>
        <Button variant="outline" size="sm" onClick={runBatch} disabled={batchRunning}>
          <Layers size={14} className={cn("mr-1.5", batchRunning && "animate-pulse")} />
          {batchRunning ? "Running…" : "Batch Review (50 items)"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Batch result */}
      {batchResult && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-semibold text-slate-500 mb-3">Last batch result ({batchResult.total} items)</p>
            <div className="grid grid-cols-4 gap-3 text-center">
              {(["passed", "reviewed", "failed", "skipped"] as const).map((k) => (
                <div key={k}>
                  <div className="text-xl font-bold text-slate-800">{batchResult[k]}</div>
                  <div className="text-xs text-slate-400 capitalize">{k}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary KPI from reviewed items */}
      {reviewedItems.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {(["PASS", "REVIEW", "FAIL", "SKIPPED"] as BiasVerdict[]).map((v) => {
            const cfg = VERDICT_CONFIG[v];
            return (
              <Card key={v}>
                <CardContent className="py-3">
                  <div className={cn("text-2xl font-bold", cfg.color.split(" ")[0])}>{verdictCounts[v] ?? 0}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{cfg.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 pb-2">
        {(["pending", "reviewed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
              view === t
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                : "text-slate-500 hover:bg-slate-50"
            )}
          >
            {t === "pending" ? `Pending (${pendingItems.length})` : `Reviewed (${reviewedItems.length})`}
          </button>
        ))}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => view === "pending" ? fetchPending() : fetchReviewed()} disabled={loading}>
          <RefreshCw size={13} className={cn(loading && "animate-spin")} />
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm animate-pulse">Loading…</div>
      ) : view === "pending" ? (
        /* ─── Pending list ────────────────────────────────────────────────── */
        pendingItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center gap-2">
            <CheckCircle2 size={28} className="text-emerald-400" />
            All items have been bias reviewed.
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Item ID", "CEFR", "Skill", "Preview", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingItems.map((item) => (
                      <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-slate-600">{item.id.slice(0, 10)}…</td>
                        <td className="px-4 py-2.5">
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-semibold">
                            {item.cefrLevel}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{item.skillType}</td>
                        <td className="px-4 py-2.5 text-slate-400 max-w-xs truncate">{item.content?.slice(0, 80)}…</td>
                        <td className="px-4 py-2.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reviewOne(item.id)}
                            disabled={reviewingId === item.id}
                          >
                            {reviewingId === item.id ? "Reviewing…" : "Review"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        /* ─── Reviewed list ───────────────────────────────────────────────── */
        reviewedItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No reviews found. Run a batch review first.</div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Item ID", "CEFR", "Skill", "Verdict", "Reviewed", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reviewedItems.map(({ id, cefrLevel, skillType, result }) => (
                      <React.Fragment key={id}>
                        <tr
                          className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                          onClick={() => setExpandedId(expandedId === id ? null : id)}
                        >
                          <td className="px-4 py-2.5 font-mono text-slate-600">{id.slice(0, 10)}…</td>
                          <td className="px-4 py-2.5">
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-semibold">
                              {cefrLevel}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{skillType}</td>
                          <td className="px-4 py-2.5"><VerdictBadge verdict={result.consensusVerdict} /></td>
                          <td className="px-4 py-2.5 text-slate-400">
                            {new Date(result.reviewedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 text-right">
                            {expandedId === id ? "▲" : "▼"}
                          </td>
                        </tr>
                        {expandedId === id && (
                          <tr className="bg-slate-50">
                            <td colSpan={6} className="px-6 py-4">
                              <p className="text-slate-600 mb-3">{result.biasSummary}</p>
                              <div className="space-y-3">
                                {result.opinions.map((op) => (
                                  <div key={op.model} className="border border-slate-200 rounded-lg p-3 bg-white">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-semibold text-slate-700 text-xs">{op.model}</span>
                                      <VerdictBadge verdict={op.verdict} />
                                      <span className={cn("text-xs font-semibold", SEVERITY_COLOR[op.severity])}>
                                        {op.severity}
                                      </span>
                                      <div className="flex gap-1 flex-wrap">
                                        {op.biasTypes.map((t) => <BiasTypePill key={t} type={t} />)}
                                      </div>
                                    </div>
                                    {op.evidence && (
                                      <p className="text-slate-500 text-xs mb-1"><span className="font-medium">Evidence:</span> {op.evidence}</p>
                                    )}
                                    {op.suggestion && op.suggestion !== "N/A" && (
                                      <p className="text-indigo-600 text-xs"><span className="font-medium">Suggestion:</span> {op.suggestion}</p>
                                    )}
                                  </div>
                                ))}
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
        )
      )}
    </div>
  );
}
