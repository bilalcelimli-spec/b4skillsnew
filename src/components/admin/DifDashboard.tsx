/**
 * DIF Monitoring Dashboard
 *
 * Displays DIF-flagged items from the database, allows reviewers to
 * update flag status (PENDING → IN_REVIEW → REMEDIATED → RETIRED) and
 * to trigger a fresh batch DIF analysis run.
 *
 * ETS classification legend:
 *   A — Negligible  |  B — Moderate  |  C — Large (action required)
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Archive,
  Play,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DifFlaggedItem {
  id: string;
  itemId: string;
  flaggedAt: string;
  worstClassification: "A" | "B" | "C";
  totalDifResults: number;
  status: "PENDING" | "IN_REVIEW" | "REMEDIATED" | "RETIRED";
  notes: string | null;
  item?: {
    skill: string;
    cefrLevel: string;
    difStatus: string;
  };
}

interface DifSummary {
  totalFlagged: number;
  byClassification: Record<string, number>;
  byStatus: Record<string, number>;
  lastRunAt: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING:    { label: "Pending",    color: "text-amber-600 bg-amber-50",   icon: <Clock className="w-3 h-3" /> },
  IN_REVIEW:  { label: "In Review",  color: "text-blue-600 bg-blue-50",     icon: <RefreshCw className="w-3 h-3" /> },
  REMEDIATED: { label: "Remediated", color: "text-green-600 bg-green-50",   icon: <CheckCircle2 className="w-3 h-3" /> },
  RETIRED:    { label: "Retired",    color: "text-slate-500 bg-slate-100",  icon: <Archive className="w-3 h-3" /> },
};

const CLASS_CONFIG: Record<string, { label: string; color: string }> = {
  A: { label: "A — Negligible", color: "text-green-700  bg-green-50  border-green-200" },
  B: { label: "B — Moderate",   color: "text-amber-700  bg-amber-50  border-amber-200" },
  C: { label: "C — Large",      color: "text-red-700    bg-red-50    border-red-200" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DifDashboard() {
  const [summary, setSummary]       = useState<DifSummary | null>(null);
  const [items, setItems]           = useState<DifFlaggedItem[]>([]);
  const [filter, setFilter]         = useState<"ALL" | "PENDING" | "IN_REVIEW" | "REMEDIATED" | "RETIRED">("ALL");
  const [classFilter, setClassFilter] = useState<"ALL" | "A" | "B" | "C">("ALL");
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [running, setRunning]       = useState(false);
  const [updating, setUpdating]     = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);

  const load = async () => {
    setLoadingItems(true);
    try {
      const [sumRes, itemsRes] = await Promise.all([
        fetch("/api/psychometrics/dif/summary", { credentials: "include" }),
        fetch("/api/psychometrics/dif/flagged-all", { credentials: "include" }),
      ]);
      if (sumRes.ok)   setSummary(await sumRes.json());
      if (itemsRes.ok) setItems((await itemsRes.json()).items ?? []);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runBatch = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/psychometrics/dif/run-batch", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) await load();
    } finally {
      setRunning(false);
    }
  };

  const updateStatus = async (itemId: string, status: string) => {
    setUpdating(itemId);
    try {
      await fetch(`/api/psychometrics/dif/flagged/${itemId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setItems((prev) =>
        prev.map((it) => (it.itemId === itemId ? { ...it, status: status as any } : it))
      );
    } finally {
      setUpdating(null);
    }
  };

  const visible = items.filter((it) => {
    if (filter !== "ALL" && it.status !== filter) return false;
    if (classFilter !== "ALL" && it.worstClassification !== classFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">DIF Monitoring</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Differential Item Functioning — Mantel-Haenszel + Logistic Regression (ETS classification)
          </p>
        </div>
        <button
          onClick={runBatch}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {running ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {running ? "Running…" : "Run Batch DIF"}
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Flagged",  value: summary.totalFlagged,                  color: "bg-red-50 text-red-700" },
            { label: "Class C (Large)",value: summary.byClassification["C"] ?? 0,    color: "bg-red-50 text-red-700" },
            { label: "Pending Review", value: summary.byStatus["PENDING"] ?? 0,       color: "bg-amber-50 text-amber-700" },
            { label: "Remediated",     value: summary.byStatus["REMEDIATED"] ?? 0,    color: "bg-green-50 text-green-700" },
          ].map((card) => (
            <div key={card.label} className={`rounded-xl p-4 ${card.color}`}>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="text-xs font-medium mt-0.5 opacity-80">{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-slate-500 self-center mr-1">Status:</span>
        {(["ALL", "PENDING", "IN_REVIEW", "REMEDIATED", "RETIRED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === s
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {s === "ALL" ? "All" : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
        <span className="text-xs text-slate-500 self-center ml-3 mr-1">Class:</span>
        {(["ALL", "A", "B", "C"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setClassFilter(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              classFilter === c
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {c === "ALL" ? "All Classes" : CLASS_CONFIG[c]?.label ?? c}
          </button>
        ))}
      </div>

      {/* Item list */}
      {loadingItems ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          {items.length === 0
            ? "No DIF-flagged items found. Run a batch analysis to populate."
            : "No items match the current filters."}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {visible.map((item) => {
              const cls = CLASS_CONFIG[item.worstClassification];
              const st  = STATUS_CONFIG[item.status];
              const isExpanded = expanded === item.itemId;

              return (
                <motion.div
                  key={item.itemId}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                >
                  {/* Row header */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : item.itemId)}
                  >
                    <div className="flex-shrink-0">
                      {item.worstClassification === "C" ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      ) : item.worstClassification === "B" ? (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.itemId}
                        </code>
                        {item.item && (
                          <>
                            <span className="text-xs text-slate-500">{item.item.skill}</span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs text-slate-500">{item.item.cefrLevel}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cls.color}`}>
                          {item.worstClassification}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                          {st.icon}{st.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.totalDifResults} group comparison{item.totalDifResults !== 1 ? "s" : ""} flagged
                        </span>
                        <span className="text-xs text-slate-400">
                          · {new Date(item.flaggedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-slate-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-100 bg-slate-50 px-4 py-4 space-y-4"
                      >
                        {/* Status change */}
                        <div>
                          <p className="text-xs font-medium text-slate-600 mb-2">Update Status</p>
                          <div className="flex gap-2 flex-wrap">
                            {(["PENDING", "IN_REVIEW", "REMEDIATED", "RETIRED"] as const).map((s) => (
                              <button
                                key={s}
                                disabled={item.status === s || updating === item.itemId}
                                onClick={() => updateStatus(item.itemId, s)}
                                className={`px-3 py-1 rounded text-xs font-medium border transition-colors disabled:opacity-50 ${
                                  item.status === s
                                    ? "bg-slate-800 text-white border-slate-800"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-indigo-400"
                                }`}
                              >
                                {STATUS_CONFIG[s].label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Notes */}
                        {item.notes && (
                          <div>
                            <p className="text-xs font-medium text-slate-600 mb-1">Review Notes</p>
                            <p className="text-xs text-slate-700 bg-white border border-slate-200 rounded p-2">
                              {item.notes}
                            </p>
                          </div>
                        )}
                        <div className="text-xs text-slate-400">
                          Item flagged {new Date(item.flaggedAt).toLocaleString()} · {item.totalDifResults} B/C classification{item.totalDifResults !== 1 ? "s" : ""}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
