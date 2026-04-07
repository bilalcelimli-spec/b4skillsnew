import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Star, 
  MessageSquare, 
  Activity,
  ArrowUpRight,
  RefreshCw,
  Filter,
  Calendar,
  PieChart as PieChartIcon,
  Download,
  Radar
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RadarComponent
} from "recharts";

export const AdvancedAnalytics: React.FC<{ orgId: string }> = ({ orgId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [orgId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/analytics`, {
        headers: { "x-user-email": "bilalcelimli@gmail.com" } // Mock admin auth
      });
      setData(await res.json());
    } catch (err) {
      console.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    // Simulated CSV export
    const csvContent = "data:text/csv;charset=utf-8,CEFR,Count\n" + 
      data.cefrDistribution.map((e: any) => `${e.name},${e.value}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `b4skills_analytics_${orgId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-12 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Loading Analytics...</div>;

  const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
          <BarChart3 className="text-indigo-600" size={28} />
          Institutional Insights
        </h2>
        <div className="flex gap-2">
          <Button 
            variant={compareMode ? "primary" : "outline"} 
            size="sm" 
            onClick={() => setCompareMode(!compareMode)} 
            className={cn(
              "rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest transition-all",
              compareMode ? "bg-indigo-600 text-white" : ""
            )}
          >
            <Users size={14} className="mr-2" /> {compareMode ? "Hide Comparison" : "Compare Cohorts"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportData} className="rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest">
            <Download size={14} className="mr-2" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAnalytics} className="rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest">
            <RefreshCw size={14} className="mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <Users size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{data.sessionsCount}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Sessions</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <Star size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{data.avgRating.toFixed(1)}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg. Feedback Rating</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">+12%</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Growth Month-over-Month</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
              <MessageSquare size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{data.feedbacksCount}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Feedbacks</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <BarChart3 className="text-indigo-600" size={20} />
              CEFR Level Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.cefrDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: "#94a3b8" }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: "#94a3b8" }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} 
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar dataKey="value" name="Current" fill="#6366f1" radius={[6, 6, 0, 0]} />
                {compareMode && (
                  <Bar dataKey={(d) => d.value * 0.8} name="Global Avg" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Radar className="text-indigo-600" size={20} />
              Skill Proficiency Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.skillBreakdown}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fontSize: 10, fontWeight: 900, fill: "#94a3b8" }} 
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 150]} 
                  tick={{ fontSize: 8, fill: "#cbd5e1" }} 
                />
                <RadarComponent
                  name="Current Cohort"
                  dataKey="A"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.6}
                />
                {compareMode && (
                  <RadarComponent
                    name="Global Average"
                    dataKey="B"
                    stroke="#94a3b8"
                    fill="#94a3b8"
                    fillOpacity={0.2}
                  />
                )}
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <PieChartIcon className="text-indigo-600" size={20} />
              Proficiency Mix
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.cefrDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.cefrDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Activity className="text-indigo-600" size={20} />
              Cohort Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Week 1', score: 45 },
                { name: 'Week 2', score: 52 },
                { name: 'Week 3', score: 48 },
                { name: 'Week 4', score: 61 },
                { name: 'Week 5', score: 55 },
                { name: 'Week 6', score: 67 },
              ]}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: "#94a3b8" }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: "#94a3b8" }} 
                />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#6366f1" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <TrendingUp className="text-indigo-600" size={20} />
              Skill Gap Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {[
              { skill: "Speaking Fluency", gap: -15, status: "CRITICAL" },
              { skill: "Listening Comprehension", gap: +8, status: "ON_TRACK" },
              { skill: "Writing Cohesion", gap: -5, status: "STABLE" },
              { skill: "Reading Speed", gap: +12, status: "ON_TRACK" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.skill}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">vs. Global Benchmark</div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-sm font-black",
                    item.gap > 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {item.gap > 0 ? "+" : ""}{item.gap}%
                  </div>
                  <div className={cn(
                    "text-[8px] font-black uppercase tracking-widest",
                    item.status === "CRITICAL" ? "text-red-600" : 
                    item.status === "ON_TRACK" ? "text-emerald-600" : "text-slate-400"
                  )}>
                    {item.status.replace(/_/g, " ")}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Star className="text-indigo-600" size={20} />
              Candidate Feedback Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-8 py-4">
                <div className="text-center">
                  <div className="text-3xl font-black text-emerald-600">88%</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Positive</div>
                </div>
                <div className="w-px h-12 bg-slate-100" />
                <div className="text-center">
                  <div className="text-3xl font-black text-amber-600">9%</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neutral</div>
                </div>
                <div className="w-px h-12 bg-slate-100" />
                <div className="text-center">
                  <div className="text-3xl font-black text-red-600">3%</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Negative</div>
                </div>
              </div>
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="text-[10px] font-black text-indigo-900 uppercase tracking-tight mb-2">Top Sentiment Keyword</div>
                <div className="flex flex-wrap gap-2">
                  {["Adaptive", "Fair", "Fast", "Intuitive", "Challenging"].map(tag => (
                    <span key={tag} className="px-2 py-1 bg-white text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <Activity className="text-indigo-600" size={20} />
          Recent Institutional Activity
        </h3>
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[8px] uppercase tracking-widest font-black">
                    <th className="px-8 py-4 border-b border-slate-100">Candidate</th>
                    <th className="px-8 py-4 border-b border-slate-100">CEFR Level</th>
                    <th className="px-8 py-4 border-b border-slate-100">Status</th>
                    <th className="px-8 py-4 border-b border-slate-100 text-right">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { name: "John Doe", cefr: "B2", status: "VERIFIED", time: "2h ago" },
                    { name: "Jane Smith", cefr: "C1", status: "PENDING_REVIEW", time: "4h ago" },
                    { name: "Robert Chen", cefr: "B1", status: "VERIFIED", time: "1d ago" },
                    { name: "Elena Rodriguez", cefr: "A2", status: "FLAGGED", time: "1d ago" },
                  ].map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="text-xs font-bold text-slate-900">{item.name}</div>
                      </td>
                      <td className="px-8 py-4">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[10px] font-black">
                          {item.cefr}
                        </span>
                      </td>
                      <td className="px-8 py-4">
                        <div className={cn(
                          "text-[8px] font-black uppercase tracking-widest",
                          item.status === "VERIFIED" ? "text-emerald-600" : 
                          item.status === "FLAGGED" ? "text-red-600" : "text-amber-600"
                        )}>
                          {item.status.replace(/_/g, " ")}
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.time}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
