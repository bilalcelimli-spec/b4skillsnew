import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Search,
  Filter,
  ArrowUpRight,
  User as UserIcon,
  Calendar,
  Activity,
  Palette,
  Upload,
  Settings as SettingsIcon,
  LayoutDashboard,
  Zap,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Calculator,
  Key,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { BrandingSettings } from "./admin/BrandingSettings";
import { BulkCandidateImport } from "./admin/BulkCandidateImport";
import { IntegrationsSettings } from "./admin/IntegrationsSettings";
import { AuditLogView } from "./admin/AuditLogView";
import { AdvancedAnalytics } from "./admin/AdvancedAnalytics";
import { GlobalSettings } from "./admin/GlobalSettings";
import { CandidateManagement } from "./admin/CandidateManagement";
import { ProctoringReview } from "./admin/ProctoringReview";
import { BillingDashboard } from "./admin/BillingDashboard";

import { SessionReview } from "./admin/SessionReview";
import { CalibrationStudy } from "./admin/CalibrationStudy";
import { ContentReviewDashboard } from "./admin/ContentReviewDashboard";
import { ExamCodeManager } from "./admin/ExamCodeManager";

interface SessionData {
  id: string;
  candidateId: string;
  organizationId: string;
  status: string;
  currentStage: number;
  abilityEstimate: number;
  cefrLevel?: string;
  startedAt: any;
  completedAt?: any;
  candidateName?: string;
  candidateEmail?: string;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "candidates"
    | "branding"
    | "import"
    | "codes"
    | "integrations"
    | "audit"
    | "analytics"
    | "settings"
    | "proctoring"
    | "billing"
    | "calibration"
  >("overview");
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    avgTheta: 0,
  });

  useEffect(() => {
    const loadMockSessions = () => {
      const mockSessions: SessionData[] = [
        {
          id: "demo-sess-1",
          candidateId: "user-1",
          organizationId: "b4skills-demo",
          status: "completed",
          currentStage: 20,
          abilityEstimate: 1.2,
          cefrLevel: "B2",
          startedAt: new Date(Date.now() - 3600000),
          completedAt: new Date(),
          candidateName: "Alice Johnson",
          candidateEmail: "alice@example.com",
        },
        {
          id: "demo-sess-2",
          candidateId: "user-2",
          organizationId: "b4skills-demo",
          status: "in_progress",
          currentStage: 8,
          abilityEstimate: 0.3,
          cefrLevel: "B1",
          startedAt: new Date(Date.now() - 900000),
          candidateName: "Ben Carter",
          candidateEmail: "ben@example.com",
        },
        {
          id: "demo-sess-3",
          candidateId: "user-3",
          organizationId: "b4skills-demo",
          status: "completed",
          currentStage: 20,
          abilityEstimate: 2.1,
          cefrLevel: "C1",
          startedAt: new Date(Date.now() - 7200000),
          completedAt: new Date(Date.now() - 3600000),
          candidateName: "Clara Ricci",
          candidateEmail: "clara@example.com",
        },
      ];
      setSessions(mockSessions);
      setStats({ total: 3, completed: 2, inProgress: 1, avgTheta: 1.65 });
      setLoading(false);
    };

    loadMockSessions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
            Admin Command Center
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Enterprise Management & Global Analytics
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <TabButton
            active={activeTab === "overview"}
            onClick={() => {
              setActiveTab("overview");
              setSelectedSessionId(null);
            }}
            icon={<LayoutDashboard size={14} />}
            label="Overview"
          />
          <TabButton
            active={activeTab === "candidates"}
            onClick={() => {
              setActiveTab("candidates");
              setSelectedSessionId(null);
            }}
            icon={<Users size={14} />}
            label="Candidates"
          />
          <TabButton
            active={activeTab === "content-qa"}
            onClick={() => {
              setActiveTab("content-qa");
              setSelectedSessionId(null);
            }}
            icon={<CheckCircle2 size={14} />}
            label="Content QA"
          />
          <TabButton
            active={activeTab === "branding"}
            onClick={() => {
              setActiveTab("branding");
              setSelectedSessionId(null);
            }}
            icon={<Palette size={14} />}
            label="Branding"
          />
          <TabButton
            active={activeTab === "import"}
            onClick={() => {
              setActiveTab("import");
              setSelectedSessionId(null);
            }}
            icon={<Upload size={14} />}
            label="Import"
          />
          <TabButton
            active={activeTab === "codes"}
            onClick={() => {
              setActiveTab("codes");
              setSelectedSessionId(null);
            }}
            icon={<Key size={14} />}
            label="Exam Codes"
          />
          <TabButton
            active={activeTab === "integrations"}
            onClick={() => {
              setActiveTab("integrations");
              setSelectedSessionId(null);
            }}
            icon={<Zap size={14} />}
            label="Integrations"
          />
          <TabButton
            active={activeTab === "audit"}
            onClick={() => {
              setActiveTab("audit");
              setSelectedSessionId(null);
            }}
            icon={<ShieldCheck size={14} />}
            label="Audit Logs"
          />
          <TabButton
            active={activeTab === "proctoring"}
            onClick={() => {
              setActiveTab("proctoring");
              setSelectedSessionId(null);
            }}
            icon={<ShieldAlert size={14} />}
            label="Proctoring"
          />
          <TabButton
            active={activeTab === "billing"}
            onClick={() => {
              setActiveTab("billing");
              setSelectedSessionId(null);
            }}
            icon={<CreditCard size={14} />}
            label="Billing"
          />
          <TabButton
            active={activeTab === "analytics"}
            onClick={() => {
              setActiveTab("analytics");
              setSelectedSessionId(null);
            }}
            icon={<BarChart3 size={14} />}
            label="Analytics"
          />
          <TabButton
            active={activeTab === "calibration"}
            onClick={() => {
              setActiveTab("calibration");
              setSelectedSessionId(null);
            }}
            icon={<Calculator size={14} />}
            label="Calibration"
          />
          <TabButton
            active={activeTab === "settings"}
            onClick={() => {
              setActiveTab("settings");
              setSelectedSessionId(null);
            }}
            icon={<SettingsIcon size={14} />}
            label="Settings"
          />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={<Activity className="text-indigo-600" />}
                label="Total Sessions"
                value={stats.total.toString()}
                trend="+12% from last week"
              />
              <StatCard
                icon={<CheckCircle2 className="text-emerald-600" />}
                label="Completed"
                value={stats.completed.toString()}
                trend={`${Math.round((stats.completed / (stats.total || 1)) * 100)}% completion rate`}
              />
              <StatCard
                icon={<Clock className="text-amber-600" />}
                label="In Progress"
                value={stats.inProgress.toString()}
                trend="Active candidates"
              />
              <StatCard
                icon={<BarChart3 className="text-purple-600" />}
                label="Avg. Ability"
                value={stats.avgTheta.toFixed(2)}
                trend="CEFR B2 Average"
              />
            </div>

            {/* Main Content Area */}
            {selectedSessionId ? (
              <SessionReview
                sessionId={selectedSessionId}
                onBack={() => setSelectedSessionId(null)}
              />
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Session Table */}
                <Card className="xl:col-span-2 overflow-hidden border-slate-200 shadow-sm rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100">
                    <div className="font-black text-slate-900 uppercase tracking-tight text-sm">
                      Recent Assessment Sessions
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[10px] font-black uppercase tracking-widest rounded-xl"
                      >
                        <Filter size={12} className="mr-1" /> Filter
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[10px] font-black uppercase tracking-widest rounded-xl"
                      >
                        <Search size={12} className="mr-1" /> Search
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/30 text-slate-400 text-[8px] uppercase tracking-widest font-black">
                            <th className="px-6 py-4 border-b border-slate-100">
                              Candidate
                            </th>
                            <th className="px-6 py-4 border-b border-slate-100">
                              Status
                            </th>
                            <th className="px-6 py-4 border-b border-slate-100 text-center">
                              Ability (θ)
                            </th>
                            <th className="px-6 py-4 border-b border-slate-100">
                              Started
                            </th>
                            <th className="px-6 py-4 border-b border-slate-100 text-right">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sessions.map((session) => (
                            <tr
                              key={session.id}
                              className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                              onClick={() => setSelectedSessionId(session.id)}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-black border border-slate-200">
                                    {session.candidateName?.[0]}
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-slate-900">
                                      {session.candidateName}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium">
                                      {session.candidateEmail}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={cn(
                                    "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                    session.status === "completed"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700",
                                  )}
                                >
                                  {session.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="text-sm font-mono font-black text-slate-700">
                                    {session.abilityEstimate?.toFixed(2)}
                                  </div>
                                  <CEFRBadge
                                    theta={session.abilityEstimate}
                                    level={session.cefrLevel}
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase tracking-widest">
                                  <Calendar
                                    size={12}
                                    className="text-slate-300"
                                  />
                                  {session.startedAt?.toDate
                                    ? session.startedAt
                                        .toDate()
                                        .toLocaleDateString()
                                    : "N/A"}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                                >
                                  <ArrowUpRight size={16} />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Sidebar Insights */}
                <div className="space-y-6">
                  <Card className="border-indigo-100 bg-indigo-50/30 rounded-2xl shadow-sm">
                    <CardHeader className="font-black text-indigo-900 uppercase tracking-tight text-sm">
                      System Health
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <HealthItem
                        label="AI Scoring Engine"
                        status="Operational"
                        color="bg-green-500"
                      />
                      <HealthItem
                        label="Adaptive Logic"
                        status="Operational"
                        color="bg-green-500"
                      />
                      <HealthItem
                        label="Storage API"
                        status="Operational"
                        color="bg-green-500"
                      />
                      <HealthItem
                        label="Proctoring Service"
                        status="Degraded"
                        color="bg-amber-500"
                      />
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl shadow-sm border-slate-200">
                    <CardHeader className="font-black text-slate-900 uppercase tracking-tight text-sm">
                      Distribution
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <DistributionBar
                          label="Advanced (C1/C2)"
                          percentage={15}
                          color="bg-purple-500"
                        />
                        <DistributionBar
                          label="Upper Int (B2)"
                          percentage={35}
                          color="bg-indigo-500"
                        />
                        <DistributionBar
                          label="Intermediate (B1)"
                          percentage={30}
                          color="bg-blue-500"
                        />
                        <DistributionBar
                          label="Elementary (A1/A2)"
                          percentage={20}
                          color="bg-slate-400"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "candidates" && (
          <motion.div
            key="candidates"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <CandidateManagement orgId="default-org" onGenerateCodes={() => setActiveTab("codes")} />
          </motion.div>
        )}

        {activeTab === "branding" && (
          <motion.div
            key="branding"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BrandingSettings orgId="default-org" />
          </motion.div>
        )}

        {activeTab === "import" && (
          <motion.div
            key="import"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BulkCandidateImport orgId="default-org" />
          </motion.div>
        )}

        {activeTab === "content-qa" && (
          <motion.div
            key="content-qa"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ContentReviewDashboard />
          </motion.div>
        )}

        {activeTab === "codes" && (
          <motion.div
            key="codes"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ExamCodeManager />
          </motion.div>
        )}

        {activeTab === "integrations" && (
          <motion.div
            key="integrations"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <IntegrationsSettings orgId="default-org" />
          </motion.div>
        )}

        {activeTab === "audit" && (
          <motion.div
            key="audit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <AuditLogView orgId="default-org" />
          </motion.div>
        )}

        {activeTab === "proctoring" && (
          <motion.div
            key="proctoring"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ProctoringReview orgId="default-org" />
          </motion.div>
        )}

        {activeTab === "billing" && (
          <motion.div
            key="billing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BillingDashboard orgId="default-org" />
          </motion.div>
        )}

        {activeTab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <AdvancedAnalytics orgId="default-org" />
          </motion.div>
        )}

        {activeTab === "calibration" && (
          <motion.div
            key="calibration"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <CalibrationStudy />
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlobalSettings orgId="default-org" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
        active
          ? "bg-white text-indigo-600 shadow-sm"
          : "text-slate-400 hover:text-slate-600",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <Card className="border-slate-200 hover:border-indigo-200 transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
          <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {trend.includes("+") ? trend.split(" ")[0] : ""}
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900 mb-1">{value}</div>
        <div className="text-xs text-slate-500 font-medium">{label}</div>
        <div className="mt-4 text-[10px] text-slate-400 font-medium">
          {trend}
        </div>
      </CardContent>
    </Card>
  );
}

function CEFRBadge({ theta, level }: { theta: number; level?: string }) {
  const getLevel = (t: number) => {
    if (level) return level;
    if (t < -2.5) return "PRE_A1";
    if (t < -1.5) return "A1";
    if (t < -0.5) return "A2";
    if (t < 0.5) return "B1";
    if (t < 1.5) return "B2";
    if (t < 2.5) return "C1";
    return "C2";
  };

  const currentLevel = getLevel(theta);
  const colors: Record<string, string> = {
    PRE_A1: "bg-slate-100 text-slate-400",
    A1: "bg-slate-100 text-slate-600",
    A2: "bg-blue-100 text-blue-600",
    B1: "bg-emerald-100 text-emerald-600",
    B2: "bg-amber-100 text-amber-600",
    C1: "bg-purple-100 text-purple-600",
    C2: "bg-indigo-100 text-indigo-600",
  };

  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-[10px] font-black",
        colors[currentLevel] || "bg-slate-100",
      )}
    >
      {currentLevel}
    </span>
  );
}

function HealthItem({
  label,
  status,
  color,
}: {
  label: string;
  status: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {status}
        </span>
        <div className={cn("w-2 h-2 rounded-full animate-pulse", color)} />
      </div>
    </div>
  );
}

function DistributionBar({
  label,
  percentage,
  color,
}: {
  label: string;
  percentage: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function Loader2({ className, size }: { className?: string; size?: number }) {
  return <Activity className={cn("animate-spin", className)} size={size} />;
}
