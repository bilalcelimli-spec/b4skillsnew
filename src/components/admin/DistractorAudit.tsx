import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  TrendingDown,
  BarChart3,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface DistractorStats {
  optionIndex: number;
  optionText: string;
  selectionCount: number;
  selectionRate: number;
  meanTheta: number;
  isCorrect: boolean;
  quality: "good" | "weak" | "non-functioning";
}

interface ItemAnalysisReport {
  itemId: string;
  skill: string;
  cefrLevel: string;
  sampleSize: number;
  pValue: number;
  pointBiserial: number;
  irtParams: { a: number; b: number; c: number };
  irtFit: { infit: number; outfit: number };
  distractorAnalysis: DistractorStats[];
  flags: string[];
  grade: "A" | "B" | "C" | "D" | "F";
}

interface BankSummary {
  total: number;
  gradeDistribution: Record<string, number>;
  avgPBis: number;
  avgPValue: number;
  flaggedCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800",
  B: "bg-green-100 text-green-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  F: "bg-red-100 text-red-800",
};

function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-bold", GRADE_COLORS[grade] ?? "bg-gray-100 text-gray-700")}>
      {grade}
    </span>
  );
}

function QualityDot({ quality }: { quality: DistractorStats["quality"] }) {
  return (
    <span
      className={cn("inline-block w-2 h-2 rounded-full mr-1.5", {
        "bg-emerald-500": quality === "good",
        "bg-yellow-500": quality === "weak",
        "bg-red-500": quality === "non-functioning",
      })}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ITEM ROW
// ─────────────────────────────────────────────────────────────────────────────

function ItemRow({ report }: { report: ItemAnalysisReport }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-3 py-2 text-xs font-mono text-gray-500">{report.itemId.slice(-8)}</td>
        <td className="px-3 py-2 text-xs">{report.skill}</td>
        <td className="px-3 py-2 text-xs">{report.cefrLevel}</td>
        <td className="px-3 py-2 text-xs text-center">{report.sampleSize}</td>
        <td className="px-3 py-2 text-xs text-center">{report.pValue.toFixed(2)}</td>
        <td className={cn("px-3 py-2 text-xs text-center", report.pointBiserial < 0.15 ? "text-red-600 font-medium" : "")}>
          {report.pointBiserial.toFixed(2)}
        </td>
        <td className="px-3 py-2 text-xs text-center">{report.irtFit.infit.toFixed(2)}</td>
        <td className="px-3 py-2">
          <GradeBadge grade={report.grade} />
        </td>
        <td className="px-3 py-2 text-xs">
          {report.flags.length > 0 ? (
            <span className="text-red-600">{report.flags.length} flag{report.flags.length > 1 ? "s" : ""}</span>
          ) : (
            <span className="text-emerald-600">Clean</span>
          )}
        </td>
        <td className="px-3 py-2 text-gray-400">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={10} className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="space-y-3">
              {/* IRT params */}
              <div className="flex gap-4 text-xs text-gray-600">
                <span><strong>a</strong> {report.irtParams.a.toFixed(2)}</span>
                <span><strong>b</strong> {report.irtParams.b.toFixed(2)}</span>
                <span><strong>c</strong> {report.irtParams.c.toFixed(2)}</span>
                <span><strong>outfit</strong> {report.irtFit.outfit.toFixed(2)}</span>
              </div>
              {/* Flags */}
              {report.flags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {report.flags.map((f) => (
                    <span key={f} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">{f}</span>
                  ))}
                </div>
              )}
              {/* Distractor table */}
              {report.distractorAnalysis.length > 0 && (
                <table className="w-full text-xs border border-gray-200 rounded">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium">#</th>
                      <th className="px-2 py-1 text-left font-medium">Option</th>
                      <th className="px-2 py-1 text-center font-medium">Rate</th>
                      <th className="px-2 py-1 text-center font-medium">Mean θ</th>
                      <th className="px-2 py-1 text-center font-medium">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.distractorAnalysis.map((d) => (
                      <tr key={d.optionIndex} className={d.isCorrect ? "bg-emerald-50" : ""}>
                        <td className="px-2 py-1">{d.optionIndex + 1}</td>
                        <td className="px-2 py-1 max-w-xs truncate" title={d.optionText}>{d.optionText}</td>
                        <td className="px-2 py-1 text-center">{(d.selectionRate * 100).toFixed(1)}%</td>
                        <td className="px-2 py-1 text-center">{d.meanTheta.toFixed(2)}</td>
                        <td className="px-2 py-1 text-center">
                          <QualityDot quality={d.quality} />
                          {d.quality}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function DistractorAudit() {
  const [summary, setSummary] = useState<BankSummary | null>(null);
  const [flagged, setFlagged] = useState<ItemAnalysisReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, flagRes] = await Promise.all([
        fetch("/api/items/distractor-audit/summary", { credentials: "include" }),
        fetch("/api/items/distractor-audit/flagged", { credentials: "include" }),
      ]);
      if (!sumRes.ok || !flagRes.ok) throw new Error("Failed to fetch distractor audit data");
      const [sumData, flagData] = await Promise.all([sumRes.json(), flagRes.json()]);
      setSummary(sumData);
      setFlagged(flagData.items ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtered = flagged.filter((r) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return r.skill.toLowerCase().includes(q)
      || r.cefrLevel.toLowerCase().includes(q)
      || r.grade.toLowerCase().includes(q)
      || r.flags.some((f) => f.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Distractor &amp; Item Quality Audit</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            CTT + IRT item fit for all ACTIVE/PRETEST items with ≥ 10 responses
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={cn("mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{summary.total}</p>
              <p className="text-xs text-gray-500">Items analysed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{summary.flaggedCount}</p>
              <p className="text-xs text-gray-500">Flagged</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{summary.avgPBis.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Avg r_pb</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{summary.avgPValue.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Avg p-value</p>
            </CardContent>
          </Card>
          {/* Grade distribution bar */}
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-gray-500 mb-1">Grade distribution</p>
              <div className="flex gap-1 items-end h-8">
                {["A", "B", "C", "D", "F"].map((g) => {
                  const count = summary.gradeDistribution[g] ?? 0;
                  const pct = summary.total > 0 ? (count / summary.total) * 100 : 0;
                  const colors: Record<string, string> = { A: "bg-emerald-500", B: "bg-green-400", C: "bg-yellow-400", D: "bg-orange-400", F: "bg-red-500" };
                  return (
                    <div key={g} className="flex flex-col items-center flex-1" title={`${g}: ${count}`}>
                      <div className={cn("w-full rounded-t", colors[g])} style={{ height: `${Math.max(2, pct)}%` }} />
                      <span className="text-[9px] text-gray-500 mt-0.5">{g}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Filter by skill, level, flag…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show all items
        </label>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-2 px-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {flagged.length > 0
              ? <AlertTriangle size={14} className="text-orange-500" />
              : <CheckCircle2 size={14} className="text-emerald-500" />}
            <span className="text-sm font-medium text-gray-700">
              {filtered.length} item{filtered.length !== 1 ? "s" : ""} {filter ? "matching filter" : "flagged"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <RefreshCw size={20} className="animate-spin mr-2" />
              Analysing item bank…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <CheckCircle2 size={32} className="mb-2 text-emerald-400" />
              <p className="text-sm">No flagged items {filter ? "matching filter" : ""}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Skill</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">CEFR</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">N</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">p</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">r_pb</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">infit</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Grade</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Flags</th>
                  <th className="px-3 py-2 w-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <ItemRow key={r.itemId} report={r} />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><QualityDot quality="good" />Good distractor (≥2% selected, low-ability selectors)</span>
        <span className="flex items-center gap-1"><QualityDot quality="weak" />Weak (high-ability selecting wrong answer)</span>
        <span className="flex items-center gap-1"><QualityDot quality="non-functioning" />Non-functioning (&lt;2% selected)</span>
      </div>
    </div>
  );
}
