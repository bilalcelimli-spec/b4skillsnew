/**
 * Standard Setting Panel
 *
 * Admin UI for CEFR cut-score determination via the Modified Angoff method
 * (Angoff 1971, Zieky & Livingston 1977).
 *
 * Workflow:
 *  1. Create a new standard-setting study
 *  2. Experts submit probability ratings per item × border
 *  3. Compute blended cut-scores (Angoff + empirical validation)
 *  4. Review confidence / inter-rater reliability
 *  5. Apply cut-scores to live engine configuration
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, RefreshCw, ChevronDown, ChevronRight, CheckCircle2, Play, BookOpen } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CutScore {
  border: string;
  theta: number;
  empiricalTheta: number;
  blendedTheta: number;
  confidence: number;
  seOfCut: number;
}

interface Study {
  id: string;
  name: string;
  method: "ANGOFF" | "BOOKMARK";
  borders: string[];
  panelSize: number;
  interRaterReliability: number;
  cutScores: CutScore[];
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BORDER_LABELS: Record<string, string> = {
  PRE_A1_A1: "PRE-A1 → A1",
  A1_A2: "A1 → A2",
  A2_B1: "A2 → B1",
  B1_B2: "B1 → B2",
  B2_C1: "B2 → C1",
  C1_C2: "C1 → C2",
};

function confColor(c: number) {
  if (c >= 0.8) return "text-green-700 bg-green-50";
  if (c >= 0.6) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StandardSettingPanel() {
  const [studies, setStudies]       = useState<Study[]>([]);
  const [loading, setLoading]       = useState(false);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [computing, setComputing]   = useState<string | null>(null);
  const [applying, setApplying]     = useState<string | null>(null);
  const [creating, setCreating]     = useState(false);
  const [newName, setNewName]       = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/psychometrics/standard-setting/studies", { credentials: "include" });
      if (res.ok) setStudies(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createStudy = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/psychometrics/standard-setting/studies", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), method: "ANGOFF" }),
      });
      if (res.ok) {
        setNewName("");
        await load();
      }
    } finally {
      setCreating(false);
    }
  };

  const computeCutScores = async (studyId: string) => {
    setComputing(studyId);
    try {
      await fetch(`/api/psychometrics/standard-setting/${studyId}/compute`, {
        method: "POST",
        credentials: "include",
      });
      await load();
    } finally {
      setComputing(null);
    }
  };

  const applyCutScores = async (studyId: string) => {
    setApplying(studyId);
    try {
      await fetch(`/api/psychometrics/standard-setting/${studyId}/apply`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Standard Setting</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Modified Angoff method — CEFR cut-score determination from expert panel ratings
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-slate-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Create new study */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-sm font-medium text-slate-700 mb-3">New Standard-Setting Study</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Study name (e.g. Spring 2026 Angoff Panel)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createStudy()}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            onClick={createStudy}
            disabled={creating || !newName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>
      </div>

      {/* Studies list */}
      {loading && studies.length === 0 ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      ) : studies.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          No standard-setting studies yet. Create one above.
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {studies.map((study) => {
              const isExp = expanded === study.id;
              const hasCuts = study.cutScores?.length > 0;

              return (
                <motion.div
                  key={study.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                >
                  {/* Row */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpanded(isExp ? null : study.id)}
                  >
                    <BookOpen className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm">{study.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-500">{study.method}</span>
                        {study.panelSize > 0 && (
                          <span className="text-xs text-slate-500">{study.panelSize} panelists</span>
                        )}
                        {study.interRaterReliability > 0 && (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${confColor(study.interRaterReliability)}`}>
                            ICC {(study.interRaterReliability * 100).toFixed(0)}%
                          </span>
                        )}
                        {hasCuts && (
                          <span className="text-xs text-green-600 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            {study.cutScores.length} cut-scores computed
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {new Date(study.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); computeCutScores(study.id); }}
                        disabled={computing === study.id}
                        className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                      >
                        {computing === study.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Compute
                      </button>
                      {hasCuts && (
                        <button
                          onClick={(e) => { e.stopPropagation(); applyCutScores(study.id); }}
                          disabled={applying === study.id}
                          className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded text-xs font-medium hover:bg-green-100 disabled:opacity-50 transition-colors"
                        >
                          {applying === study.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          Apply
                        </button>
                      )}
                      {isExp ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Cut-scores detail */}
                  <AnimatePresence>
                    {isExp && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-100 bg-slate-50"
                      >
                        {!hasCuts ? (
                          <p className="px-4 py-4 text-xs text-slate-500">
                            No cut-scores yet. Submit Angoff ratings via the API and click Compute.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="text-slate-500 border-b border-slate-100">
                                <tr>
                                  <th className="text-left px-4 py-2 font-medium">Border</th>
                                  <th className="text-right px-4 py-2 font-medium">Angoff θ</th>
                                  <th className="text-right px-4 py-2 font-medium">Empirical θ</th>
                                  <th className="text-right px-4 py-2 font-medium">Blended θ</th>
                                  <th className="text-right px-4 py-2 font-medium">SE</th>
                                  <th className="text-right px-4 py-2 font-medium">Confidence</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {study.cutScores.map((cs) => (
                                  <tr key={cs.border} className="hover:bg-white transition-colors">
                                    <td className="px-4 py-2 font-medium text-slate-700">
                                      {BORDER_LABELS[cs.border] ?? cs.border}
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-600 font-mono">
                                      {cs.theta.toFixed(3)}
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-600 font-mono">
                                      {cs.empiricalTheta !== 0 ? cs.empiricalTheta.toFixed(3) : "—"}
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono font-semibold text-indigo-700">
                                      {cs.blendedTheta.toFixed(3)}
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-500 font-mono">
                                      ±{cs.seOfCut.toFixed(3)}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${confColor(cs.confidence)}`}>
                                        {(cs.confidence * 100).toFixed(0)}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
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
