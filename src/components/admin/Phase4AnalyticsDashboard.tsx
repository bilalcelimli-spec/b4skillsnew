import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Clock,
  Radar
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RadarComponent,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";
import type { LiveAnalyticsSnapshot } from "@/src/lib/analytics/live-metrics-engine";

export const Phase4AnalyticsDashboard: React.FC<{ orgId: string }> = ({ orgId }) => {
  const [data, setData] = useState<LiveAnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [orgId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${orgId}/analytics`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Loading Phase 4 Analytics...</div>;
  }

  if (error || !data) {
    return <div className="p-12 text-center text-red-600 font-black uppercase">Error: {error}</div>;
  }

  // Prepare MIRT radar data
  const mirtDimensions = [
    { name: "READING", value: data.mirt.dim0Avg },
    { name: "LISTENING", value: data.mirt.dim1Avg },
    { name: "WRITING", value: data.mirt.dim2Avg },
    { name: "SPEAKING", value: data.mirt.dim3Avg },
    { name: "GRAMMAR", value: data.mirt.dim4Avg },
    { name: "VOCABULARY", value: data.mirt.dim5Avg },
  ];

  // Prepare item difficulty distribution by CEFR
  const difficultyByLevel = data.itemDifficulty.map((d) => ({
    name: d.cefr,
    difficulty: parseFloat(d.avgDifficulty.toFixed(2)),
    count: d.count,
  }));

  // Prepare skill metrics
  const skillMetrics = data.skills.map((s) => ({
    name: s.skill,
    avgTheta: parseFloat(s.avgTheta.toFixed(2)),
    stdTheta: parseFloat(s.stdTheta.toFixed(2)),
    candidates: s.candidates,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
          <Radar className="text-indigo-600" size={28} />
          Phase 4: Advanced Metrics
        </h2>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-slate-200 shadow-sm rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-slate-900">
                  {data.sessions.totalSessions}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                  Total Sessions
                </div>
              </div>
              <Zap className="text-indigo-600" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-slate-900">
                  {(data.sessions.completionRate * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                  Completion Rate
                </div>
              </div>
              <CheckCircle2 className="text-emerald-600" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-slate-900">
                  {data.pretestPipeline.totalPretestItems}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                  Pretest Items
                </div>
              </div>
              <Clock className="text-amber-600" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-slate-900">
                  {data.retirementStatus.totalRetired}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                  Retired Items
                </div>
              </div>
              <AlertTriangle className="text-red-600" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MIRT 6D Radar Chart */}
      <Card className="border-slate-200 shadow-sm rounded-3xl">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
          <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <Radar className="text-indigo-600" size={20} />
            6D MIRT Ability Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={mirtDimensions}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 900, fill: "#64748b" }} />
              <PolarRadiusAxis angle={90} domain={[-3, 3]} tick={{ fontSize: 8, fill: "#cbd5e1" }} />
              <RadarComponent
                name="Mean Ability (θ)"
                dataKey="value"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.6}
              />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                formatter={(value) => parseFloat(value).toFixed(2)}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Item Difficulty Distribution and Skill Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-slate-200 shadow-sm rounded-3xl">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <BarChart3 className="text-indigo-600" size={20} />
              Item Difficulty by CEFR
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={difficultyByLevel}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 900, fill: "#94a3b8" }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 10, fontWeight: 900, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                  formatter={(value) => parseFloat(value).toFixed(2)}
                />
                <Bar dataKey="difficulty" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-3xl">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <TrendingUp className="text-indigo-600" size={20} />
              Per-Skill Ability Estimates
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={skillMetrics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 900, fill: "#94a3b8" }} />
                <YAxis domain={[-3, 3]} tick={{ fontSize: 10, fontWeight: 900, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                  formatter={(value) => parseFloat(value).toFixed(2)}
                />
                <Line type="monotone" dataKey="avgTheta" stroke="#6366f1" strokeWidth={3} dot={{ fill: "#6366f1", r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pretest Pipeline Metrics */}
      <Card className="border-slate-200 shadow-sm rounded-3xl">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
          <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <Clock className="text-amber-600" size={20} />
            Pretest Pipeline Health
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-2xl font-black text-slate-900">
                {data.pretestPipeline.totalPretestItems}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
                Total Items
              </div>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <div className="text-2xl font-black text-amber-900">
                {data.pretestPipeline.readyForCalibration}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mt-2">
                Ready for Calibration
              </div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="text-2xl font-black text-emerald-900">
                {data.pretestPipeline.readyForPromotion}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-2">
                Ready for Promotion
              </div>
            </div>
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200">
              <div className="text-2xl font-black text-indigo-900">
                {data.pretestPipeline.promotedThisWeek}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mt-2">
                Promoted This Week
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retirement Status */}
      <Card className="border-slate-200 shadow-sm rounded-3xl">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
          <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={20} />
            Item Retirement Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-4 bg-red-50 rounded-2xl border border-red-200">
              <div className="text-2xl font-black text-red-900">
                {data.retirementStatus.flaggedThisWeek}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-red-600 mt-2">
                Flagged This Week
              </div>
            </div>
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200">
              <div className="text-2xl font-black text-orange-900">
                {data.retirementStatus.autoRetiredThisWeek}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-orange-600 mt-2">
                Auto-Retired This Week
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-200">
              <div className="text-2xl font-black text-yellow-900">
                {data.retirementStatus.pendingApproval}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-yellow-600 mt-2">
                Pending Approval
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-2xl font-black text-slate-900">
                {data.retirementStatus.totalRetired}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-2">
                Total Retired
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Timestamp */}
      <div className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
};
