import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";
import { 
  Calculator, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Target,
  Database,
  Users
} from "lucide-react";
import { motion } from "motion/react";

export const CalibrationStudy: React.FC = () => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conductStudy = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calibration/study", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to conduct study");
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const applyCalibration = async () => {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/calibration/apply", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to apply calibration");
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setApplying(false);
    }
  };

  const chartData = results ? Object.entries(results.cutScores)
    .filter(([level]) => level !== "PRE_A1")
    .map(([level, score]) => ({
      level,
      cutScore: Number(score).toFixed(2),
      meanDifficulty: Number(results.stats.meanDifficulties[level]).toFixed(2),
      empiricalMean: results.stats.empiricalMeans[level] ? Number(results.stats.empiricalMeans[level]).toFixed(2) : null
    })) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Psychometric Calibration</h2>
          <p className="text-sm text-slate-500 font-medium">Calibrate ability estimates (theta) against CEFR levels using empirical data.</p>
        </div>
        <Button 
          onClick={conductStudy} 
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs h-12 px-6 rounded-2xl shadow-lg shadow-indigo-100"
        >
          {loading ? <RefreshCw size={18} className="animate-spin mr-2" /> : <Calculator size={18} className="mr-2" />}
          Run Calibration Study
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
          <AlertCircle size={20} />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {results ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <TrendingUp size={16} className="text-indigo-600" />
                  Calibrated Cut-Scores Visualization
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="level" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                      <Bar dataKey="cutScore" name="Cut Score (Midpoint)" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                      <Bar dataKey="meanDifficulty" name="Mean Item Difficulty" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-slate-200 shadow-sm rounded-3xl">
                <CardHeader className="p-6 pb-0">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Study Sample Size</CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-3xl font-black text-slate-900">{results.stats.itemCount}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Database size={10} /> Calibrated Items
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-3xl font-black text-indigo-600">{results.stats.responseCount}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 justify-end">
                      <Users size={10} /> Empirical Responses
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm rounded-3xl bg-indigo-600 text-white">
                <CardHeader className="p-6 pb-0">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Calibration Status</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <div className="text-lg font-black uppercase tracking-tight">System Calibrated</div>
                      <div className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Last updated: Just now</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm rounded-3xl">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Target size={16} className="text-indigo-600" />
                  Established Cut-Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {Object.entries(results.cutScores)
                    .filter(([level]) => level !== "PRE_A1")
                    .map(([level, score]) => (
                    <div key={level} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 font-black text-xs border border-slate-200">
                          {level}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CEFR Threshold</div>
                      </div>
                      <div className="text-sm font-black text-slate-900 font-mono">
                        {Number(score).toFixed(3)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <Button 
                    onClick={applyCalibration} 
                    disabled={applying || applied}
                    className={`w-full font-black uppercase tracking-widest text-[10px] h-10 rounded-xl transition-all ${
                      applied 
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    {applying ? <RefreshCw size={14} className="animate-spin mr-2" /> : applied ? <CheckCircle2 size={14} className="mr-2" /> : <Database size={14} className="mr-2" />}
                    {applied ? "Applied Successfully" : "Apply to Live System"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 text-amber-700 font-black text-[10px] uppercase tracking-widest">
                <AlertCircle size={14} />
                Methodology Note
              </div>
              <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                Cut-scores are calculated using a hybrid approach: 50% theoretical mean item difficulty (b-parameter) and 50% empirical candidate ability (theta) for successful responses. This ensures the test remains aligned with both the item bank design and real-world performance.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 text-slate-400">
          <Calculator size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-bold uppercase tracking-widest">No calibration data available</p>
          <p className="text-xs font-medium mt-2">Run a study to establish precise CEFR cut-scores.</p>
        </div>
      )}
    </div>
  );
};
