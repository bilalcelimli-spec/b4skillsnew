/**
 * Equating Panel
 *
 * Admin UI for linking test forms to a common theta scale.
 *
 * Supported methods:
 *   - Mean/Sigma   (Kolen & Brennan 2014, §3.4)
 *   - Stocking-Lord TCC equating (characteristic curve, §6.3)
 *   - Tucker / Levine CINEG (common-item non-equivalent groups, §4.3)
 *
 * Workflow:
 *   1. Choose old-form ID and new-form ID (item bank versions / calibration runs)
 *   2. Select common (anchor) items
 *   3. Run equating → review A, B transformation + TCC RMSD
 *   4. Inspect anchor-item drift report (flag items with |drift| > 0.3 logits)
 *   5. Apply transformation to the new form's item parameters
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RefreshCw,
  Play,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  BarChart3,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EquatingResult {
  A: number;
  B: number;
  method: string;
  commonItemCount: number;
  rmsd: number;
}

interface AnchorDrift {
  itemId: string;
  bOld: number;
  bNew: number;
  drift: number;
  flagged: boolean;
}

interface EquatingReport {
  equating: EquatingResult;
  anchorDrift?: AnchorDrift[];
  flaggedDriftCount?: number;
  rmsDrift?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METHOD_OPTIONS = [
  { value: "MEAN_SIGMA",    label: "Mean/Sigma",    desc: "Classic linear equating via b-parameter moments" },
  { value: "STOCKING_LORD", label: "Stocking-Lord", desc: "Characteristic curve — minimises TCC RMSD" },
  { value: "TUCKER",        label: "Tucker CINEG",  desc: "Common-item non-equivalent groups (Tucker)" },
  { value: "LEVINE",        label: "Levine CINEG",  desc: "Levine true-score — robust to group differences" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function EquatingPanel() {
  const [method, setMethod]         = useState<string>("STOCKING_LORD");
  const [oldFormId, setOldFormId]   = useState("");
  const [newFormId, setNewFormId]   = useState("");
  const [anchorIds, setAnchorIds]   = useState("");   // comma-separated item IDs
  const [report, setReport]         = useState<EquatingReport | null>(null);
  const [running, setRunning]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setRunning(true);
    try {
      const body: Record<string, unknown> = {
        method,
        oldFormId: oldFormId.trim() || undefined,
        newFormId: newFormId.trim() || undefined,
        anchorItemIds: anchorIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const res = await fetch("/api/psychometrics/equating/run", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json();
        setError(e.error ?? "Unknown error");
      } else {
        setReport(await res.json());
      }
    } finally {
      setRunning(false);
    }
  };

  const apply = async () => {
    if (!report) return;
    await fetch("/api/psychometrics/equating/apply", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newFormId: newFormId.trim(), equating: report.equating }),
    });
  };

  const eq = report?.equating;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Test Form Equating</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Link alternate test forms to a common theta scale · Kolen &amp; Brennan (2014)
        </p>
      </div>

      {/* Config */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
        {/* Method selector */}
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Equating Method</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {METHOD_OPTIONS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  method === m.value
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <p className={`text-xs font-semibold ${method === m.value ? "text-indigo-700" : "text-slate-800"}`}>
                  {m.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Form IDs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Old Form ID</label>
            <input
              type="text"
              placeholder="calibration-run-id or form tag"
              value={oldFormId}
              onChange={(e) => setOldFormId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">New Form ID</label>
            <input
              type="text"
              placeholder="calibration-run-id or form tag"
              value={newFormId}
              onChange={(e) => setNewFormId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        {/* Anchor items */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Anchor Item IDs <span className="text-slate-400">(comma-separated, ≥ 3 items)</span>
          </label>
          <textarea
            placeholder="item-id-1, item-id-2, item-id-3, ..."
            value={anchorIds}
            onChange={(e) => setAnchorIds(e.target.value)}
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={run}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? "Running…" : "Run Equating"}
        </button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {eq && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Transformation */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white">
              <div className="flex items-center justify-between mb-4">
                <p className="font-medium text-slate-800">Scale Transformation</p>
                <button
                  onClick={apply}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                >
                  <Play className="w-3 h-3" />
                  Apply to New Form
                </button>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Method</p>
                  <p className="text-sm font-semibold text-indigo-700">{eq.method}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <div className="bg-indigo-50 rounded-xl px-6 py-3 text-center">
                  <p className="text-xs text-slate-500 mb-0.5">θ_new = A · θ_old + B</p>
                  <p className="text-lg font-bold text-indigo-700 font-mono">
                    A = {eq.A.toFixed(4)}&ensp;B = {eq.B >= 0 ? "+" : ""}{eq.B.toFixed(4)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Anchor Items</p>
                  <p className="text-sm font-semibold text-slate-800">{eq.commonItemCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">TCC RMSD</p>
                  <p className={`text-sm font-semibold ${eq.rmsd < 0.05 ? "text-green-700" : eq.rmsd < 0.1 ? "text-amber-700" : "text-red-700"}`}>
                    {eq.rmsd.toFixed(5)}
                  </p>
                </div>
              </div>

              {/* RMSD interpretation */}
              <p className="text-xs text-slate-400 mt-3">
                {eq.rmsd < 0.05
                  ? "✓ Excellent TCC fit — forms are well-linked"
                  : eq.rmsd < 0.10
                  ? "△ Acceptable fit — minor scale drift present"
                  : "✗ Poor TCC fit — review anchor item selection"}
              </p>
            </div>

            {/* Anchor drift */}
            {report?.anchorDrift && report.anchorDrift.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-500" />
                  <p className="font-medium text-slate-800 text-sm">Anchor Item Drift</p>
                  {(report.flaggedDriftCount ?? 0) > 0 && (
                    <span className="ml-auto text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {report.flaggedDriftCount} flagged (|drift| ≥ 0.3 logits)
                    </span>
                  )}
                  {report.rmsDrift !== undefined && (
                    <span className="text-xs text-slate-500 ml-auto">
                      RMS drift: {report.rmsDrift.toFixed(3)}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-slate-500 bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Item ID</th>
                        <th className="text-right px-4 py-2 font-medium">b (old)</th>
                        <th className="text-right px-4 py-2 font-medium">b (new)</th>
                        <th className="text-right px-4 py-2 font-medium">Drift</th>
                        <th className="text-center px-4 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.anchorDrift.map((d) => (
                        <tr key={d.itemId} className={d.flagged ? "bg-amber-50" : "hover:bg-slate-50"}>
                          <td className="px-4 py-2 font-mono text-slate-600">{d.itemId}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-600">{d.bOld.toFixed(3)}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-600">{d.bNew.toFixed(3)}</td>
                          <td className={`px-4 py-2 text-right font-mono font-semibold ${d.flagged ? "text-amber-700" : "text-slate-700"}`}>
                            {d.drift >= 0 ? "+" : ""}{d.drift.toFixed(3)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {d.flagged ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mx-auto" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
