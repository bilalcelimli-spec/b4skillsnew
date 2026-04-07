import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { 
  Users, 
  TrendingUp, 
  BarChart3, 
  Map, 
  Download, 
  Filter, 
  Calendar,
  Globe,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  ShieldCheck
} from "lucide-react";
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
  PieChart, 
  Pie, 
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface AnalyticsData {
  totalCandidates: number;
  completedSessions: number;
  averageAbility: number;
  cefrDistribution: Record<string, number>;
  skillPerformance: Record<string, number>;
  timeSeriesData: any[];
  settings?: {
    webhookUrl?: string;
    apiKey?: string;
  };
}

export const InstitutionalDashboard: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"analytics" | "onboarding" | "ecosystem">("analytics");
  const [bulkData, setBulkData] = useState("");
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    fetchAnalytics();
  }, [organizationId]);

  useEffect(() => {
    if (data?.settings) {
      setWebhookUrl((data.settings as any).webhookUrl || "");
      setApiKey((data.settings as any).apiKey || "");
    }
  }, [data]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/cohort?organizationId=${organizationId}`);
      const analytics = await res.json();
      setData(analytics);
    } catch (err) {
      console.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEcosystem = async (generateKey = false) => {
    try {
      const res = await fetch("/api/ecosystem/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, webhookUrl, generateApiKey: generateKey })
      });
      const result = await res.json();
      if (result.settings) {
        setApiKey(result.settings.apiKey || "");
        setWebhookUrl(result.settings.webhookUrl || "");
        alert("Ecosystem configuration updated successfully.");
      }
    } catch (err) {
      alert("Failed to update ecosystem configuration.");
    }
  };

  const handleBulkOnboarding = async () => {
    try {
      const candidates = JSON.parse(bulkData);
      const res = await fetch("/api/onboarding/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: candidates.map((c: any) => ({ ...c, organizationId })) })
      });
      const results = await res.json();
      setOnboardingStatus(results);
      fetchAnalytics();
    } catch (err) {
      alert("Invalid JSON format for bulk onboarding.");
    }
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 py-32 text-center">
        <BarChart3 className="animate-pulse text-indigo-600 mb-6" size={48} />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Aggregating Cohort Data</h3>
        <p className="text-slate-500">Processing real-time psychometric results...</p>
      </div>
    );
  }

  const cefrChartData = Object.entries(data.cefrDistribution ?? {}).map(([name, value]) => ({ name, value }));
  const skillChartData = Object.entries(data.skillPerformance ?? {}).map(([subject, A]) => ({ subject, A, fullMark: 100 }));
  
  const COLORS = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff"];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Institutional Dashboard</h1>
          <p className="text-slate-500 mt-1 font-medium">Cohort performance and proficiency distribution for {organizationId}.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1">
            <Button 
              variant={activeView === "analytics" ? "secondary" : "ghost"} 
              className={cn("px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all", activeView === "analytics" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
              onClick={() => setActiveView("analytics")}
            >
              <BarChart3 size={16} className="mr-2" /> Analytics
            </Button>
            <Button 
              variant={activeView === "onboarding" ? "secondary" : "ghost"} 
              className={cn("px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all", activeView === "onboarding" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
              onClick={() => setActiveView("onboarding")}
            >
              <Users size={16} className="mr-2" /> Onboarding
            </Button>
            <Button 
              variant={activeView === "ecosystem" ? "secondary" : "ghost"} 
              className={cn("px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all", activeView === "ecosystem" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
              onClick={() => setActiveView("ecosystem")}
            >
              <Globe size={16} className="mr-2" /> Ecosystem
            </Button>
          </div>
          <Button variant="outline" className="gap-2 h-11 px-5 rounded-xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50">
            <Filter size={18} /> Filter
          </Button>
          <Button className="gap-2 bg-indigo-600 h-11 px-6 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100">
            <Download size={18} /> Export Report
          </Button>
        </div>
      </header>

      {activeView === "analytics" ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              icon={<Users className="text-blue-600" size={24} />} 
              label="Total Candidates" 
              value={(data.totalCandidates ?? 0).toLocaleString()} 
              trend="+12% vs last month"
              trendUp={true}
            />
            <StatCard 
              icon={<Award className="text-emerald-600" size={24} />} 
              label="Avg. Proficiency" 
              value="B1+" 
              trend="Stable"
              trendUp={true}
            />
            <StatCard 
              icon={<TrendingUp className="text-indigo-600" size={24} />} 
              label="Completion Rate" 
              value={`${data.totalCandidates ? ((data.completedSessions / data.totalCandidates) * 100).toFixed(1) : 0}%`} 
              trend="+2.4%"
              trendUp={true}
            />
            <StatCard 
              icon={<Zap className="text-amber-600" size={24} />} 
              label="Test Credits" 
              value="1,240" 
              trend="Buy More"
              trendUp={true}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* CEFR Distribution */}
            <Card className="lg:col-span-2 rounded-[32px] border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 font-black uppercase tracking-widest text-xs text-slate-400 border-b border-slate-50">Proficiency Distribution (CEFR)</CardHeader>
              <CardContent className="h-80 p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cefrChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }} />
                    <Tooltip 
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", padding: "12px" }}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Skill Radar */}
            <Card className="rounded-[32px] border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 font-black uppercase tracking-widest text-xs text-slate-400 border-b border-slate-50">Skill Performance Matrix</CardHeader>
              <CardContent className="h-80 p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillChartData}>
                    <PolarGrid stroke="#f1f5f9" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "black" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Cohort Average"
                      dataKey="A"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.2}
                      strokeWidth={3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Growth Trend */}
            <Card className="rounded-[32px] border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 font-black uppercase tracking-widest text-xs text-slate-400 border-b border-slate-50">Proficiency Growth Trend</CardHeader>
              <CardContent className="h-80 p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.timeSeriesData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)", padding: "12px" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgScore" 
                      stroke="#6366f1" 
                      strokeWidth={4} 
                      dot={{ r: 6, fill: "#6366f1", strokeWidth: 3, stroke: "#fff" }} 
                      activeDot={{ r: 8, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent High Performers */}
            <Card className="rounded-[32px] border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 font-black uppercase tracking-widest text-xs text-slate-400 border-b border-slate-50">Top Performing Candidates</CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {[
                    { name: "Alice Johnson", score: "C2", date: "2 hours ago", avatar: "AJ", trust: 98 },
                    { name: "Robert Smith", score: "C1", date: "5 hours ago", avatar: "RS", trust: 95 },
                    { name: "Elena Rodriguez", score: "C1", date: "Yesterday", avatar: "ER", trust: 92 },
                    { name: "David Kim", score: "B2+", date: "Yesterday", avatar: "DK", trust: 88 },
                    { name: "Sarah Miller", score: "B2", date: "2 days ago", avatar: "SM", trust: 94 }
                  ].map((candidate, i) => (
                    <div key={i} className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-xs uppercase tracking-widest border border-slate-100">
                          {candidate.avatar}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-sm uppercase tracking-tight">{candidate.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{candidate.date}</div>
                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                            <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                              <ShieldCheck size={10} /> {candidate.trust}% Trust
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        {candidate.score}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : activeView === "onboarding" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-[32px] border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="p-6 font-black uppercase tracking-widest text-xs text-slate-400 border-b border-slate-50">Bulk Candidate Onboarding</CardHeader>
            <CardContent className="p-8 space-y-6">
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Paste a JSON array of candidate objects to mass-create accounts. 
                Each object should include <code className="bg-slate-50 px-1.5 py-0.5 rounded text-indigo-600 font-bold">name</code> and <code className="bg-slate-50 px-1.5 py-0.5 rounded text-indigo-600 font-bold">email</code>.
              </p>
              <textarea 
                className="w-full h-64 p-6 font-mono text-xs bg-slate-50 border border-slate-100 rounded-[32px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder='[{"name": "John Doe", "email": "john@example.com"}]'
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
              />
              <Button 
                className="w-full bg-indigo-600 h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100"
                onClick={handleBulkOnboarding}
              >
                Execute Bulk Onboarding
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="p-6 font-black uppercase tracking-widest text-xs text-slate-400 border-b border-slate-50">Onboarding Status</CardHeader>
            <CardContent className="p-8">
              {!onboardingStatus ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-300">
                  <Users size={64} className="mb-6 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest">No operations performed</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[32px]">
                      <div className="text-4xl font-black text-emerald-600 mb-1">{onboardingStatus.success}</div>
                      <div className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Successful</div>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 p-6 rounded-[32px]">
                      <div className="text-4xl font-black text-rose-600 mb-1">{onboardingStatus.failed}</div>
                      <div className="text-[10px] font-black text-rose-800 uppercase tracking-widest">Failed</div>
                    </div>
                  </div>
                  
                  {onboardingStatus.errors.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Error Logs</h4>
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 border border-slate-50 rounded-2xl">
                        {onboardingStatus.errors.map((err: any, i: number) => (
                          <div key={i} className="p-4 text-xs flex justify-between gap-4">
                            <span className="font-black text-slate-700 uppercase tracking-tight">{err.email}</span>
                            <span className="text-rose-500 font-bold">{err.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-[32px] border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="p-6 font-black uppercase tracking-widest text-xs text-slate-400 border-b border-slate-50">API & Ecosystem Integration</CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Webhook Endpoint URL</label>
                <div className="flex gap-3">
                  <input 
                    className="flex-1 h-12 px-5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    placeholder="https://your-api.com/webhooks/b4skills"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <Button 
                    className="bg-indigo-600 px-6 rounded-xl font-bold"
                    onClick={() => handleUpdateEcosystem()}
                  >
                    Save
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">We'll send POST requests to this URL when tests are completed.</p>
              </div>

              <div className="pt-8 border-t border-slate-50 space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Private API Key</label>
                <div className="flex gap-3">
                  <div className="flex-1 h-12 px-5 bg-slate-50 border border-slate-100 rounded-xl flex items-center font-mono text-sm text-slate-600 overflow-hidden">
                    {apiKey ? apiKey : "••••••••••••••••••••••••••••"}
                  </div>
                  <Button 
                    variant="outline"
                    className="px-6 rounded-xl font-bold border-slate-200"
                    onClick={() => handleUpdateEcosystem(true)}
                  >
                    {apiKey ? "Regenerate" : "Generate"}
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Use this key to authenticate requests to the b4skills API.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="p-6 font-black uppercase tracking-widest text-xs text-slate-400 border-b border-slate-50">Integration Guide</CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">1</div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Trigger Assessment</h4>
                    <p className="text-xs text-slate-500 mt-1">Send a POST request to <code className="bg-slate-50 px-1 rounded">/api/v1/sessions</code> with the candidate's email to initiate a test.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">2</div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Listen for Webhooks</h4>
                    <p className="text-xs text-slate-500 mt-1">Configure your endpoint to receive the <code className="bg-slate-50 px-1 rounded">test.completed</code> event with psychometric results.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">3</div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Retrieve Reports</h4>
                    <p className="text-xs text-slate-500 mt-1">Download PDF certificates and detailed skill breakdowns via the <code className="bg-slate-50 px-1 rounded">/api/v1/reports</code> endpoint.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; trend: string; trendUp: boolean }> = ({ icon, label, value, trend, trendUp }) => (
  <Card className="overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-bold",
          trendUp ? "text-emerald-600" : "text-red-600"
        )}>
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <div>
        <div className="text-3xl font-black text-slate-900 mb-1">{value}</div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</div>
      </div>
    </CardContent>
  </Card>
);
