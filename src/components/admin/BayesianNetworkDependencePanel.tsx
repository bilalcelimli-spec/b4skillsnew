import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Network, CheckCircle2, AlertTriangle, GitBranch } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NetworkEdge {
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
  mutualInfo: number;      // mutual information in bits
  condIndepP: number;      // p-value for conditional independence test
  strength: number;        // normalized edge strength [0,1]
  flagged: boolean;        // conditional dependence flagged (p < 0.05)
}

interface NetworkNode {
  itemId: string;
  itemLabel: string;
  skill: string;
  cefrLevel: string;
  degree: number;          // number of flagged edges
  maxMI: number;           // max mutual information with any neighbor
  clusterId: number;       // community cluster assignment
  flagged: boolean;        // participates in at least one flagged edge
}

interface ClusterGroup {
  clusterId: number;
  items: string[];
  meanMI: number;
  nEdges: number;
}

interface BayesNetPayload {
  totalItems: number;
  totalEdges: number;
  flaggedEdges: number;
  clusters: number;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  clusterGroups: ClusterGroup[];
  miDistribution: { bin: string; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#6366f1", VOCABULARY: "#8b5cf6", READING: "#3b82f6",
  LISTENING: "#06b6d4", WRITING: "#10b981", SPEAKING: "#f59e0b",
};

const CLUSTER_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#06b6d4"];

function ForceGraph({ nodes, edges }: { nodes: NetworkNode[]; edges: NetworkEdge[] }) {
  // Simple static SVG layout using cluster-based polar placement
  const W = 480, H = 300, CX = W / 2, CY = H / 2;

  // Place nodes in clusters around a circle
  const clusterIds = Array.from(new Set(nodes.map((n) => n.clusterId)));
  const nodePositions = new Map<string, { x: number; y: number }>();
  const R_OUTER = 110;
  const R_INNER = 40;

  for (const cid of clusterIds) {
    const clusterNodes = nodes.filter((n) => n.clusterId === cid);
    const clusterAngle = (clusterIds.indexOf(cid) / clusterIds.length) * Math.PI * 2;
    const clusterCX = CX + Math.cos(clusterAngle) * R_OUTER;
    const clusterCY = CY + Math.sin(clusterAngle) * R_OUTER;

    clusterNodes.forEach((n, i) => {
      const a = (i / Math.max(1, clusterNodes.length)) * Math.PI * 2;
      const r = Math.min(R_INNER, 15 * Math.sqrt(clusterNodes.length));
      nodePositions.set(n.itemId, {
        x: clusterCX + Math.cos(a) * r,
        y: clusterCY + Math.sin(a) * r,
      });
    });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 300 }}>
      {/* edges */}
      {edges.filter((e) => e.flagged).slice(0, 80).map((e, i) => {
        const src = nodePositions.get(e.sourceId);
        const tgt = nodePositions.get(e.targetId);
        if (!src || !tgt) return null;
        return (
          <line
            key={`e-${i}`}
            x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
            stroke={`rgba(239,68,68,${Math.min(0.8, e.strength * 1.5)})`}
            strokeWidth={Math.max(0.5, e.strength * 2)}
          />
        );
      })}
      {/* unflagged edges (faint) */}
      {edges.filter((e) => !e.flagged).slice(0, 60).map((e, i) => {
        const src = nodePositions.get(e.sourceId);
        const tgt = nodePositions.get(e.targetId);
        if (!src || !tgt) return null;
        return (
          <line
            key={`ue-${i}`}
            x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
            stroke="rgba(99,102,241,0.15)"
            strokeWidth={0.5}
          />
        );
      })}
      {/* nodes */}
      {nodes.map((n) => {
        const pos = nodePositions.get(n.itemId);
        if (!pos) return null;
        const r = 3 + n.degree * 1.5;
        return (
          <circle
            key={n.itemId}
            cx={pos.x}
            cy={pos.y}
            r={Math.min(10, r)}
            fill={CLUSTER_COLORS[n.clusterId % CLUSTER_COLORS.length]}
            opacity={0.85}
            stroke={n.flagged ? "#ef4444" : "none"}
            strokeWidth={1.5}
          >
            <title>{`${n.itemLabel} (${n.skill}) deg=${n.degree}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

type BNTab = "graph" | "edges" | "clusters" | "dist";
type SortKey = "mutualInfo" | "condIndepP" | "strength";

export function BayesianNetworkDependencePanel() {
  const [data, setData] = useState<BayesNetPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BNTab>("graph");
  const [sortKey, setSortKey] = useState<SortKey>("mutualInfo");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/psychometrics/bayes-net-dep");
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = data ? [
    { label: "Items in Network", value: data.totalItems, icon: <Network size={16} />, color: "#6366f1", fmt: String },
    { label: "Edges (MI pairs)", value: data.totalEdges, icon: <GitBranch size={16} />, color: "#8b5cf6", fmt: String },
    { label: "Flagged Edges", value: data.flaggedEdges, icon: <AlertTriangle size={16} />, color: data.flaggedEdges > 0 ? "#ef4444" : "#10b981", fmt: String },
    { label: "Clusters", value: data.clusters, icon: <CheckCircle2 size={16} />, color: "#06b6d4", fmt: String },
  ] : [];

  const sortedEdges = data
    ? [...data.edges]
        .filter((e) => !flaggedOnly || e.flagged)
        .sort((a, b) => {
          if (sortKey === "mutualInfo") return b.mutualInfo - a.mutualInfo;
          if (sortKey === "condIndepP") return a.condIndepP - b.condIndepP;
          return b.strength - a.strength;
        })
        .slice(0, 200)
    : [];

  const TABS: { id: BNTab; label: string }[] = [
    { id: "graph", label: "Network Graph" },
    { id: "edges", label: "Edge Table" },
    { id: "clusters", label: "Clusters" },
    { id: "dist", label: "MI Distribution" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Bayesian Network Item Dependence</h2>
          <p className="text-slate-400 text-sm mt-1">
            Mutual-information based conditional dependence · Yen (1993) Q₃ framework
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">{error}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2" style={{ color: k.color }}>{k.icon}<span className="text-xs text-slate-400">{k.label}</span></div>
            <div className="text-2xl font-bold text-white">{k.fmt(k.value as any)}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/40 rounded-lg p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === t.id ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* GRAPH */}
        {activeTab === "graph" && (
          <motion.div key="graph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs">
              Items as nodes (coloured by cluster), edges represent conditional dependence (red = flagged, p &lt; 0.05).
              Node size scales with degree (number of flagged neighbours).
            </p>
            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : data ? (
              <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-2">
                <ForceGraph nodes={data.nodes} edges={data.edges} />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3 text-xs">
              {CLUSTER_COLORS.slice(0, data?.clusters ?? 0).map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: c }} />
                  Cluster {i}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* EDGES */}
        {activeTab === "edges" && (
          <motion.div key="edges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="accent-indigo-500" />
                Flagged only
              </label>
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="mutualInfo">Sort: Mutual Info</option>
                <option value="condIndepP">Sort: p-value (asc)</option>
                <option value="strength">Sort: Strength</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : sortedEdges.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No edges match the current filter.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-400">
                      <th className="px-3 py-2 text-left">Source</th>
                      <th className="px-3 py-2 text-left">Target</th>
                      <th className="px-3 py-2 text-right">MI (bits)</th>
                      <th className="px-3 py-2 text-right">Strength</th>
                      <th className="px-3 py-2 text-right">p-value</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEdges.map((e, i) => (
                      <tr key={`${e.sourceId}-${e.targetId}-${i}`} className={`border-t border-slate-700/30 hover:bg-slate-800/40 ${e.flagged ? "bg-red-950/20" : ""}`}>
                        <td className="px-3 py-2 font-mono text-white">{e.sourceLabel}</td>
                        <td className="px-3 py-2 font-mono text-white">{e.targetLabel}</td>
                        <td className="px-3 py-2 text-right font-mono">{e.mutualInfo.toFixed(4)}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <div className="w-16 bg-slate-700 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${e.strength * 100}%` }} />
                            </div>
                            <span className="font-mono w-10 text-right">{(e.strength * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono" style={{ color: e.flagged ? "#ef4444" : "#94a3b8" }}>
                          {e.condIndepP < 0.001 ? "<0.001" : e.condIndepP.toFixed(3)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {e.flagged
                            ? <span className="px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 text-xs">⚠ Dep</span>
                            : <span className="px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 text-xs">✓ Ind</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* CLUSTERS */}
        {activeTab === "clusters" && (
          <motion.div key="clusters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs">
              Greedy modularity-based community clusters. Items in the same cluster share high mutual information
              and may indicate testlet / passage effects.
            </p>
            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : data ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.clusterGroups.map((cg) => (
                  <div key={cg.clusterId} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: CLUSTER_COLORS[cg.clusterId % CLUSTER_COLORS.length] }} />
                      <span className="text-sm font-medium text-white">Cluster {cg.clusterId}</span>
                      <span className="text-xs text-slate-400 ml-auto">{cg.nEdges} edges · MI̅={cg.meanMI.toFixed(4)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {cg.items.map((label) => {
                        const node = data.nodes.find((n) => n.itemLabel === label);
                        return (
                          <span
                            key={label}
                            className="px-1.5 py-0.5 rounded text-xs font-mono"
                            style={{
                              background: SKILL_COLORS[node?.skill ?? "GRAMMAR"] + "33",
                              color: SKILL_COLORS[node?.skill ?? "GRAMMAR"],
                              border: `1px solid ${SKILL_COLORS[node?.skill ?? "GRAMMAR"]}55`,
                            }}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </motion.div>
        )}

        {/* MI DISTRIBUTION */}
        {activeTab === "dist" && (
          <motion.div key="dist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs">
              Distribution of pairwise mutual information (bits) across all item pairs. High MI (&gt;0.05 bits) indicates conditional dependence.
            </p>
            {data && (() => {
              const max = Math.max(1, ...data.miDistribution.map((b) => b.count));
              return (
                <div className="space-y-1">
                  {data.miDistribution.map((b) => {
                    const flagged = parseFloat(b.bin) >= 0.05;
                    return (
                      <div key={b.bin} className="flex items-center gap-2 text-xs">
                        <span className="w-12 text-right font-mono text-slate-400">{b.bin}</span>
                        <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(b.count / max) * 100}%`, background: flagged ? "#ef4444" : "#6366f1" }}
                          />
                        </div>
                        <span className="w-8 text-slate-300">{b.count}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
