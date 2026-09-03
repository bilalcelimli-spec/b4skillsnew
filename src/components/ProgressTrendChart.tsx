import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { thetaToCefr } from "../lib/cefr/cefr-framework";

interface ProgressPoint {
  sessionId: string;
  date: string;
  productLine: string;
  theta: number;
  cefrLevel: string;
  skillScores: Record<string, number> | null;
}

interface Props {
  candidateId: string;
}

const CEFR_THRESHOLDS: Array<{ theta: number; label: string; color: string }> = [
  { theta: -2.5, label: "A1→A2", color: "#94a3b8" },
  { theta: -1.0, label: "A2→B1", color: "#60a5fa" },
  { theta: 0.5,  label: "B1→B2", color: "#34d399" },
  { theta: 2.0,  label: "B2→C1", color: "#f59e0b" },
  { theta: 3.5,  label: "C1→C2", color: "#a78bfa" },
];

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString("default", { month: "short" })} ${d.getFullYear().toString().slice(2)}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ProgressPoint & { displayDate: string };
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-xs">
      <p className="font-black text-slate-800 mb-1">{d.displayDate}</p>
      <p className="text-indigo-600 font-bold">θ = {d.theta.toFixed(2)}</p>
      <p className="text-slate-600">CEFR: <span className="font-black">{d.cefrLevel}</span></p>
      <p className="text-slate-400 mt-1">{d.productLine}</p>
    </div>
  );
};

export const ProgressTrendChart: React.FC<Props> = ({ candidateId }) => {
  const [history, setHistory] = useState<ProgressPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidateId) return;
    setLoading(true);
    fetch(`/api/candidates/${candidateId}/progress-history`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => {
        setHistory(data.history ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load progress history.");
        setLoading(false);
      });
  }, [candidateId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Loading progress…
      </div>
    );
  }

  if (error || history.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        {error ?? "Complete more assessments to see your progress trend."}
      </div>
    );
  }

  const chartData = history.map((h) => ({
    ...h,
    displayDate: fmt(h.date),
  }));

  const first = history[0].theta;
  const last = history[history.length - 1].theta;
  const delta = last - first;
  const cefrGain = thetaToCefr(last) !== thetaToCefr(first);

  const TrendIcon = delta > 0.2 ? TrendingUp : delta < -0.2 ? TrendingDown : Minus;
  const trendColor = delta > 0.2 ? "text-emerald-500" : delta < -0.2 ? "text-rose-500" : "text-slate-400";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-black text-slate-900">Progress Over Time</h3>
          <p className="text-xs text-slate-400 mt-0.5">{history.length} completed assessment{history.length !== 1 ? "s" : ""}</p>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-black ${trendColor}`}>
          <TrendIcon size={18} />
          {delta > 0 ? "+" : ""}{delta.toFixed(2)} θ
          {cefrGain && <span className="text-xs font-bold ml-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Level Up!</span>}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <Tooltip content={<CustomTooltip />} />
          {CEFR_THRESHOLDS.map((t) => (
            <ReferenceLine
              key={t.label}
              y={t.theta}
              stroke={t.color}
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{ value: t.label, position: "insideTopRight", fontSize: 9, fill: t.color }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="theta"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Mini CEFR timeline */}
      <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
        {history.map((h, i) => (
          <div key={h.sessionId} className="flex flex-col items-center min-w-[52px] text-center">
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {h.cefrLevel}
            </span>
            <span className="text-[9px] text-slate-400 mt-1">{fmt(h.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
