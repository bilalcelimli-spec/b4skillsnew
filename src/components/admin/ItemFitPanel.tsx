import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, FlaskConical, CheckCircle2, AlertTriangle, Activity } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemFitStats {
  itemId: string;
  itemLabel: string;
  skill: string;
  cefrLevel: string;
  difficulty: number;
  discrimination: number;
  nResponses: number;
  infit: number;
  infitZ: number;
  outfit: number;
  outfitZ: number;
  infitFlag: boolean;
  outfitFlag: boolean;
  flagged: boolean;
}

interface ItemFitPayload {
  totalItems: number;
  flaggedItems: number;
  meanInfit: number;
  meanOutfit: number;
  items: ItemFitStats[];
  infitDistribution: { bin: string; count: number }[];
  outfitDistribution: { bin: string; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#6366f1", VOCABULARY: "#8b5cf6", READING: "#3b82f6",
  LISTENING: "#06b6d4", WRITING: "#10b981", SPEAKING: "#f59e0b",
};

function FitBar({ value, label, flagLow, flagHigh }: { value: number; label: string; flagLow: number; flagHigh: number }) {
  const pct = Math.min(200, Math.max(0, (value / 2) * 100));
  const flagged = value < flagLow || value > flagHigh;
  const color = flagged ? "#ef4444" : "#10b981";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 truncate text-slate-400">{label}</span>
      <div className="relative flex-1 bg-slate-800 rounded-full h-2">
        {/* target zone */}
        <div className="absolute h-2 rounded-full bg-emerald-900/50" style={{ left: `${(flagLow / 2) * 100}%`, width: `${((flagHigh - flagLow) / 2) * 100}%` }} />
        <div className="absolute h-2 w-0.5 bg-white/20" style={{ left: "50%" }} />
        <div className="absolute top-0 h-2 w-2 rounded-full -translate-x-1/2" style={{ left: `${pct}%`, background: color }} />
      </div>
      <span className="w-12 text-right font-mono" style={{ color }}>{value.toFixed(3)}</span>
    </div>
  );
}

function DistChart({ bins, title }: { bins: { bin: string; count: number }[]; title: string }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="text-xs text-slate-400 mb-3">{title}</div>
      <div className="flex items-end gap-1 h-28">
        {bins.map((b) => {
          const h = (b.count / max) * 100;
          const val = parseFloat(b.bin);
          const flagged = val < 0.7 || val > 1.3;
          return (
            <div key={b.bin} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-t transition-all" style={{ height: `${h}%`, minHeight: b.count > 0 ? 2 : 0, background: flagged ? "#ef4444" : "#6366f1" }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {bins.map((b) => (
          <div key={b.bin} className="flex-1 text-center text-slate-500" style={{ fontSize: 8 }}>{b.bin}</div>
        ))}
      </div>
      <div className="flex gap-4 mt-2 text-xs text-slate-400">
        <span><span className="inline-block w-2 h-2 rounded-full bg-indigo-500 mr-1" />Acceptable [0.7–1.3]</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />Flagged</span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ItemFitPanel() {
  const [data, setData] = useState<ItemFitPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"table" | "infit" | "outfit">("table");
  const [sortKey, setSortKey] = useState<"infit" | "outfit" | "discrimination" | "nResponses">("infit");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/psychometrics/item-fit");
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayItems = (data?.items ?? [])
    .filter((it) => !flaggedOnly || it.flagged)
    .filter((it) => !search || it.itemLabel.toLowerCase().includes(search.toLowerCase()) || it.skill.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortKey === "nResponses") return b.nResponses - a.nResponses;
      if (sortKey === "discrimination") return b.discrimination - a.discrimination;
      return Math.abs(b[sortKey] - 1) - Math.abs(a[sortKey] - 1);
    });

  const kpiCards = data
    ? [
        { label: "Items Analysed", value: data.totalItems, icon: <FlaskConical size={16} />, color: "#6366f1", fmt: String },
        { label: "Flagged", value: data.flaggedItems, icon: <AlertTriangle size={16} />, color: data.flaggedItems > 0 ? "#ef4444" : "#10b981", fmt: String },
        { label: "Mean Infit", value: data.meanInfit, icon: <Activity size={16} />, color: Math.abs(data.meanInfit - 1) < 0.1 ? "#10b981" : "#f59e0b", fmt: (v: number) => v.toFixed(3) },
        { label: "Mean Outfit", value: data.meanOutfit, icon: <CheckCircle2 size={16} />, color: Math.abs(data.meanOutfit - 1) < 0.1 ? "#10b981" : "#f59e0b", fmt: (v: number) => v.toFixed(3) },
      ]
    : [];

  const tabs = [
    { id: "table" as const, label: "Item Table" },
    { id: "infit" as const, label: "Infit Distribution" },
    { id: "outfit" as const, label: "Outfit Distribution" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">IRT Item Fit Statistics</h2>
          <p className="text-xs text-slate-400 mt-0.5">Wright & Masters infit/outfit mean-square and standardized fit for each active item</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-200 transition-colors disabled:opacity-50">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}

      {data && (
        <div className="grid grid-cols-4 gap-3">
          {kpiCards.map((kpi) => (
            <div key={kpi.label} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
              <div className="flex items-center gap-1.5 mb-1" style={{ color: kpi.color }}>
                {kpi.icon}<span className="text-xs text-slate-400">{kpi.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{kpi.fmt(kpi.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">Sort:</span>
          {(["infit", "outfit", "discrimination", "nResponses"] as const).map((s) => (
            <button key={s} onClick={() => setSortKey(s)}
              className={`px-2 py-1 rounded text-xs transition-colors ${sortKey === s ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
              {s === "nResponses" ? "N" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" className="accent-indigo-500" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
          Flagged only
        </label>
        <input type="text" placeholder="Search item / skill…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
      </div>

      <div className="flex gap-1 border-b border-slate-700">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === t.id ? "border-indigo-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center h-40 text-slate-400 text-sm">
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading…
          </motion.div>
        )}

        {!loading && activeTab === "table" && (
          <motion.div key="table" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {displayItems.length === 0
              ? <div className="text-center py-12 text-slate-400 text-sm">No items found</div>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-300">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="text-left py-2 pr-3">Item</th>
                        <th className="text-left py-2 pr-3">Skill</th>
                        <th className="text-left py-2 pr-3">CEFR</th>
                        <th className="text-right py-2 pr-3">b</th>
                        <th className="text-right py-2 pr-3">a</th>
                        <th className="text-right py-2 pr-3">N</th>
                        <th className="text-right py-2 pr-3">Infit MS</th>
                        <th className="text-right py-2 pr-3">Infit Z</th>
                        <th className="text-right py-2 pr-3">Outfit MS</th>
                        <th className="text-right py-2 pr-3">Outfit Z</th>
                        <th className="text-center py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayItems.map((it) => (
                        <tr key={it.itemId} className={`border-b border-slate-800 hover:bg-slate-800/50 ${it.flagged ? "bg-red-900/10" : ""}`}>
                          <td className="py-2 pr-3 font-mono text-slate-400 text-xs">{it.itemLabel}</td>
                          <td className="py-2 pr-3">
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: (SKILL_COLORS[it.skill] ?? "#64748b") + "22", color: SKILL_COLORS[it.skill] ?? "#94a3b8" }}>
                              {it.skill}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-slate-400">{it.cefrLevel}</td>
                          <td className="py-2 pr-3 text-right font-mono">{it.difficulty.toFixed(2)}</td>
                          <td className="py-2 pr-3 text-right font-mono">{it.discrimination.toFixed(2)}</td>
                          <td className="py-2 pr-3 text-right">{it.nResponses}</td>
                          <td className={`py-2 pr-3 text-right font-mono font-semibold ${it.infitFlag ? "text-red-400" : "text-emerald-400"}`}>{it.infit.toFixed(3)}</td>
                          <td className={`py-2 pr-3 text-right font-mono ${Math.abs(it.infitZ) > 2 ? "text-red-400" : "text-slate-400"}`}>{it.infitZ.toFixed(2)}</td>
                          <td className={`py-2 pr-3 text-right font-mono font-semibold ${it.outfitFlag ? "text-red-400" : "text-emerald-400"}`}>{it.outfit.toFixed(3)}</td>
                          <td className={`py-2 pr-3 text-right font-mono ${Math.abs(it.outfitZ) > 2 ? "text-red-400" : "text-slate-400"}`}>{it.outfitZ.toFixed(2)}</td>
                          <td className="py-2 text-center">{it.flagged ? <AlertTriangle size={14} className="inline text-red-400" /> : <CheckCircle2 size={14} className="inline text-emerald-400" />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </motion.div>
        )}

        {!loading && activeTab === "infit" && data && (
          <motion.div key="infit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <DistChart bins={data.infitDistribution} title="Infit mean-square distribution (acceptable range: 0.7–1.3)" />
            <div className="mt-4 space-y-2">
              {(data.items.filter((it) => it.infitFlag).slice(0, 10)).map((it) => (
                <FitBar key={it.itemId} value={it.infit} label={`${it.skill} ${it.itemLabel}`} flagLow={0.7} flagHigh={1.3} />
              ))}
            </div>
          </motion.div>
        )}

        {!loading && activeTab === "outfit" && data && (
          <motion.div key="outfit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <DistChart bins={data.outfitDistribution} title="Outfit mean-square distribution (acceptable range: 0.7–1.3)" />
            <div className="mt-4 space-y-2">
              {(data.items.filter((it) => it.outfitFlag).slice(0, 10)).map((it) => (
                <FitBar key={it.itemId} value={it.outfit} label={`${it.skill} ${it.itemLabel}`} flagLow={0.7} flagHigh={1.3} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
