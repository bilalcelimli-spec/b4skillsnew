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
  Loader2,
  Wand2,
  Database,
  FlaskConical,
  Trash2,
  TrendingUp,
  Layers,
  Network,
  FileText,
  Share2,
  Shield,
  Link2,
  UserCheck,
  GitBranch,
  CheckSquare,
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
import { ItemGeneratorPanel } from "./admin/ItemGeneratorPanel";
import { ItemBankInventory } from "./admin/ItemBankInventory";
import { DistractorAudit } from "./admin/DistractorAudit";
import { AigQualityPanel } from "./admin/AigQualityPanel";
import { FraudDashboard } from "./admin/FraudDashboard";
import { BiasReviewPanel } from "./admin/BiasReviewPanel";
import { DifDashboard } from "./admin/DifDashboard";
import { ItemBankPanel } from "./admin/ItemBankPanel";
import { StandardSettingPanel } from "./admin/StandardSettingPanel";
import { EquatingPanel } from "./admin/EquatingPanel";
import { PsychometricQualityPanel } from "./admin/PsychometricQualityPanel";
import { ItemRetirementPanel } from "./admin/ItemRetirementPanel";
import { MirtDiagnosticsPanel } from "./admin/MirtDiagnosticsPanel";
import { GrmScoringPanel } from "./admin/GrmScoringPanel";
import { ItemExposurePanel } from "./admin/ItemExposurePanel";
import { RaterReliabilityPanel } from "./admin/RaterReliabilityPanel";
import { ClassificationAccuracyPanel } from "./admin/ClassificationAccuracyPanel";
import { ContentBlueprintPanel } from "./admin/ContentBlueprintPanel";
import { ThetaDiagnosticsPanel } from "./admin/ThetaDiagnosticsPanel";
import { TestInformationPanel } from "./admin/TestInformationPanel";
import { PersonFitPanel } from "./admin/PersonFitPanel";
import { ShadowTestPanel } from "./admin/ShadowTestPanel";
import { ItemDriftPanel } from "./admin/ItemDriftPanel";
import { CognitiveDiagnosticPanel } from "./admin/CognitiveDiagnosticPanel";
import { BayesianCalibrationPanel } from "./admin/BayesianCalibrationPanel";
import { MSTRoutingPanel } from "./admin/MSTRoutingPanel";
import { ResponseTimeDiagnosticsPanel } from "./admin/ResponseTimeDiagnosticsPanel";
import { LocalItemDependencePanel } from "./admin/LocalItemDependencePanel";
import { AnchorItemMonitorPanel } from "./admin/AnchorItemMonitorPanel";
import { SubscaleCompositeScoringPanel } from "./admin/SubscaleCompositeScoringPanel";
import { ConditionalSEMPanel } from "./admin/ConditionalSEMPanel";
import { TestCharacteristicCurvePanel } from "./admin/TestCharacteristicCurvePanel";
import { DifferentialBundleFunctioningPanel } from "./admin/DifferentialBundleFunctioningPanel";
import { PolytomousDIFPanel } from "./admin/PolytomousDIFPanel";
import { ScoreReliabilitySubgroupPanel } from "./admin/ScoreReliabilitySubgroupPanel";
import { AdaptiveStoppingRulePanel } from "./admin/AdaptiveStoppingRulePanel";
import { ItemFitPanel } from "./admin/ItemFitPanel";
import { CATItemSelectionPanel } from "./admin/CATItemSelectionPanel";
import { ScoreNormingPanel } from "./admin/ScoreNormingPanel";
import { OnlineCalibrationMonitorPanel } from "./admin/OnlineCalibrationMonitorPanel";
import { DifferentialStepFunctioningPanel } from "./admin/DifferentialStepFunctioningPanel";
import { BayesianNetworkDependencePanel } from "./admin/BayesianNetworkDependencePanel";
import { ScoreReportingAnalyticsPanel } from "./admin/ScoreReportingAnalyticsPanel";
import { MultigroupInvariancePanel } from "./admin/MultigroupInvariancePanel";
import { IRTResponseTimePanel } from "./admin/IRTResponseTimePanel";
import { ItemExposureControlPanel } from "./admin/ItemExposureControlPanel";
import { ScaleEquatingDiagnosticsPanel } from "./admin/ScaleEquatingDiagnosticsPanel";
import { PersonFitGrowthPanel } from "./admin/PersonFitGrowthPanel";
import { RaterCalibrationPanel } from "./admin/RaterCalibrationPanel";
import { LongitudinalDIFPanel } from "./admin/LongitudinalDIFPanel";
import { ScoreValidityEvidencePanel } from "./admin/ScoreValidityEvidencePanel";

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

export const AdminDashboard: React.FC<{ orgId?: string }> = ({ orgId: propOrgId }) => {
  const ORG_ID = propOrgId;
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
    | "calibration" | "content-qa" | "item-generator" | "item-inventory" | "distractor-audit" | "aig-quality" | "fraud" | "bias-review" | "dif" | "item-bank" | "standard-setting" | "equating" | "psychometric-quality" | "item-retirement" | "mirt" | "grm" | "exposure" | "rater-reliability" | "classification" | "blueprint" | "theta-diag" | "tif" | "person-fit" | "shadow-test" | "item-drift" | "cognitive-diag" | "bayes-calib" | "mst-routing" | "rt-diag" | "local-dep" | "anchor-items" | "subscale" | "csem" | "tcc" | "dbf" | "poly-dif" | "reliability" | "stopping-rule" | "item-fit" | "cat-sim" | "score-norms" | "online-calib" | "dsf" | "bn-dep" | "score-report" | "mg-inv" | "irt-rt" | "exposure" | "scale-eq" | "growth" | "rater-calib" | "long-dif" | "validity"
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
    if (!ORG_ID) {
      setSessions([]);
      setStats({ total: 0, completed: 0, inProgress: 0, avgTheta: 0 });
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/organizations/${ORG_ID}/sessions?limit=100`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("sessions fetch failed");
        const data = await res.json();
        const normStatus = (s: string) => s.toLowerCase();
        const mapped: SessionData[] = (data as any[]).map((s) => ({
          id: s.id,
          candidateId: s.candidateId,
          organizationId: s.organizationId,
          status: normStatus(s.status || ""),
          currentStage: s.currentStage ?? 0,
          abilityEstimate: s.theta ?? 0,
          cefrLevel: s.scoreReport?.overallCefr ?? s.cefrLevel,
          startedAt: s.startedAt || s.createdAt,
          completedAt: s.completedAt,
          candidateName: s.candidate?.name,
          candidateEmail: s.candidate?.email,
        }));
        setSessions(mapped);
        const total = mapped.length;
        const completed = mapped.filter((x) => x.status === "completed").length;
        const inProgress = mapped.filter((x) => x.status === "in_progress").length;
        const avgTheta =
          total > 0 ? mapped.reduce((a, b) => a + (b.abilityEstimate || 0), 0) / total : 0;
        setStats({ total, completed, inProgress, avgTheta });
      } catch {
        setSessions([]);
        setStats({ total: 0, completed: 0, inProgress: 0, avgTheta: 0 });
      } finally {
        setLoading(false);
      }
    })();
  }, [ORG_ID]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (!ORG_ID) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <p className="font-semibold">No organization on your account</p>
        <p className="text-sm mt-1 text-amber-800">
          An administrator must assign you to an organization before the admin console can load data.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-0 items-start min-h-screen -mx-4 md:-mx-8">
      {/* ── Sidebar Navigation ───────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen overflow-y-auto flex flex-col">
        {/* Brand header */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="text-xs font-black text-slate-900 uppercase tracking-tighter leading-tight">
            Admin Command
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
            Enterprise Console
          </div>
        </div>

        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto px-2">
          {/* ─ Core ─ */}
          <NavGroup label="Core">
            <NavItem id="overview" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<LayoutDashboard size={13} />} label="Overview" />
            <NavItem id="candidates" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Users size={13} />} label="Candidates" />
            <NavItem id="codes" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Key size={13} />} label="Exam Codes" />
            <NavItem id="analytics" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<BarChart3 size={13} />} label="Analytics" />
          </NavGroup>

          {/* ─ Content ─ */}
          <NavGroup label="Content">
            <NavItem id="content-qa" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<CheckCircle2 size={13} />} label="Content QA" />
            <NavItem id="item-generator" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Wand2 size={13} />} label="AI Generator" />
            <NavItem id="item-inventory" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Database size={13} />} label="Item Inventory" />
            <NavItem id="item-bank" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Layers size={13} />} label="Item Bank" />
            <NavItem id="distractor-audit" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<FlaskConical size={13} />} label="Item Quality" />
            <NavItem id="aig-quality" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Activity size={13} />} label="AIG Quality" />
            <NavItem id="bias-review" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<ShieldAlert size={13} />} label="Bias Review" />
            <NavItem id="item-retirement" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Trash2 size={13} />} label="Item Retirement" />
          </NavGroup>

          {/* ─ IRT / Psychometrics ─ */}
          <NavGroup label="Psychometrics">
            <NavItem id="calibration" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Calculator size={13} />} label="Calibration" />
            <NavItem id="dif" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<FlaskConical size={13} />} label="DIF Monitor" />
            <NavItem id="standard-setting" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Calculator size={13} />} label="Standard Setting" />
            <NavItem id="equating" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<ArrowUpRight size={13} />} label="Equating" />
            <NavItem id="psychometric-quality" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Activity size={13} />} label="Quality" />
            <NavItem id="mirt" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Zap size={13} />} label="MIRT 6D" />
            <NavItem id="grm" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<BarChart3 size={13} />} label="GRM Scoring" />
            <NavItem id="exposure" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<ShieldCheck size={13} />} label="Exposure" />
            <NavItem id="rater-reliability" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Users size={13} />} label="Rater IRR" />
            <NavItem id="classification" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Activity size={13} />} label="Classification" />
            <NavItem id="blueprint" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<LayoutDashboard size={13} />} label="Blueprint" />
            <NavItem id="theta-diag" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Zap size={13} />} label="θ Diagnostics" />
            <NavItem id="tif" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<BarChart3 size={13} />} label="TIF" />
            <NavItem id="person-fit" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<ShieldAlert size={13} />} label="Person Fit" />
            <NavItem id="shadow-test" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Database size={13} />} label="Shadow Test" />
            <NavItem id="item-drift" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<FlaskConical size={13} />} label="Item Drift" />
            <NavItem id="cognitive-diag" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Wand2 size={13} />} label="Cognitive Diag" />
            <NavItem id="bayes-calib" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Calculator size={13} />} label="Bayes Calib" />
            <NavItem id="mst-routing" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Network size={13} />} label="MST Routing" />
            <NavItem id="rt-diag" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Clock size={13} />} label="RT Diagnostics" />
            <NavItem id="local-dep" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Link2 size={13} />} label="Local Dep." />
            <NavItem id="anchor-items" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Upload size={13} />} label="Anchor Items" />
            <NavItem id="subscale" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<BarChart3 size={13} />} label="Subscale" />
            <NavItem id="csem" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Activity size={13} />} label="Cond. SEM" />
            <NavItem id="tcc" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<TrendingUp size={13} />} label="TCC" />
            <NavItem id="dbf" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<ShieldAlert size={13} />} label="DBF" />
            <NavItem id="poly-dif" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<ShieldCheck size={13} />} label="Poly DIF" />
            <NavItem id="reliability" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<BarChart3 size={13} />} label="Reliability" />
            <NavItem id="stopping-rule" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Zap size={13} />} label="Stop Rules" />
            <NavItem id="item-fit" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<FlaskConical size={13} />} label="Item Fit" />
            <NavItem id="cat-sim" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Calculator size={13} />} label="CAT Sim" />
            <NavItem id="score-norms" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Database size={13} />} label="Score Norms" />
            <NavItem id="online-calib" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<TrendingUp size={13} />} label="Online Calib." />
            <NavItem id="dsf" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Layers size={13} />} label="DSF" />
            <NavItem id="bn-dep" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Network size={13} />} label="BN Dep." />
            <NavItem id="score-report" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<FileText size={13} />} label="Score Report" />
            <NavItem id="mg-inv" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Share2 size={13} />} label="MG Invariance" />
            <NavItem id="irt-rt" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Clock size={13} />} label="IRT-RT Model" />
            <NavItem id="scale-eq" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Link2 size={13} />} label="Scale Equating" />
            <NavItem id="growth" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<TrendingUp size={13} />} label="Growth" />
            <NavItem id="rater-calib" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<UserCheck size={13} />} label="Rater Calib." />
            <NavItem id="long-dif" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<GitBranch size={13} />} label="Long. DIF" />
            <NavItem id="validity" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<CheckSquare size={13} />} label="Validity" />
          </NavGroup>

          {/* ─ Operations ─ */}
          <NavGroup label="Operations">
            <NavItem id="import" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Upload size={13} />} label="Import" />
            <NavItem id="branding" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Palette size={13} />} label="Branding" />
            <NavItem id="fraud" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<ShieldAlert size={13} />} label="Fraud Monitor" />
            <NavItem id="proctoring" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<ShieldCheck size={13} />} label="Proctoring" />
            <NavItem id="billing" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<CreditCard size={13} />} label="Billing" />
            <NavItem id="integrations" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<Zap size={13} />} label="Integrations" />
            <NavItem id="audit" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<ShieldCheck size={13} />} label="Audit Logs" />
            <NavItem id="settings" activeTab={activeTab} setActiveTab={setActiveTab} setSelectedSessionId={setSelectedSessionId} icon={<SettingsIcon size={13} />} label="Settings" />
          </NavGroup>
        </nav>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 px-6 py-6 overflow-auto">
        {/* Page title bar */}
        <header className="mb-6">
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">
            {NAV_LABELS[activeTab] ?? "Admin"}
          </h1>
          <p className="text-slate-400 font-medium text-xs mt-0.5">
            Enterprise Management & Global Analytics
          </p>
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
            <CandidateManagement orgId={ORG_ID} onGenerateCodes={() => setActiveTab("codes")} />
          </motion.div>
        )}

        {activeTab === "branding" && (
          <motion.div
            key="branding"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BrandingSettings orgId={ORG_ID} />
          </motion.div>
        )}

        {activeTab === "import" && (
          <motion.div
            key="import"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BulkCandidateImport orgId={ORG_ID} />
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

        {activeTab === "item-generator" && (
          <motion.div
            key="item-generator"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ItemGeneratorPanel />
          </motion.div>
        )}

        {activeTab === "item-inventory" && (
          <motion.div
            key="item-inventory"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ItemBankInventory />
          </motion.div>
        )}

        {activeTab === "distractor-audit" && (
          <motion.div
            key="distractor-audit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DistractorAudit />
          </motion.div>
        )}

        {activeTab === "aig-quality" && (
          <motion.div
            key="aig-quality"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <AigQualityPanel />
          </motion.div>
        )}

        {activeTab === "fraud" && (
          <motion.div
            key="fraud"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <FraudDashboard />
          </motion.div>
        )}

        {activeTab === "bias-review" && (
          <motion.div
            key="bias-review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BiasReviewPanel />
          </motion.div>
        )}

        {activeTab === "dif" && (
          <motion.div
            key="dif"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DifDashboard />
          </motion.div>
        )}

        {activeTab === "item-bank" && (
          <motion.div
            key="item-bank"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ItemBankPanel />
          </motion.div>
        )}

        {activeTab === "standard-setting" && (
          <motion.div
            key="standard-setting"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <StandardSettingPanel />
          </motion.div>
        )}

        {activeTab === "equating" && (
          <motion.div
            key="equating"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <EquatingPanel />
          </motion.div>
        )}

        {activeTab === "psychometric-quality" && (
          <motion.div
            key="psychometric-quality"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PsychometricQualityPanel />
          </motion.div>
        )}

        {activeTab === "item-retirement" && (
          <motion.div
            key="item-retirement"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ItemRetirementPanel />
          </motion.div>
        )}

        {activeTab === "mirt" && (
          <motion.div
            key="mirt"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <MirtDiagnosticsPanel />
          </motion.div>
        )}

        {activeTab === "grm" && (
          <motion.div
            key="grm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GrmScoringPanel />
          </motion.div>
        )}

        {activeTab === "exposure" && (
          <motion.div
            key="exposure"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ItemExposurePanel />
          </motion.div>
        )}

        {activeTab === "rater-reliability" && (
          <motion.div
            key="rater-reliability"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <RaterReliabilityPanel />
          </motion.div>
        )}

        {activeTab === "classification" && (
          <motion.div
            key="classification"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ClassificationAccuracyPanel />
          </motion.div>
        )}

        {activeTab === "blueprint" && (
          <motion.div
            key="blueprint"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ContentBlueprintPanel />
          </motion.div>
        )}

        {activeTab === "theta-diag" && (
          <motion.div
            key="theta-diag"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ThetaDiagnosticsPanel />
          </motion.div>
        )}

        {activeTab === "tif" && (
          <motion.div
            key="tif"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <TestInformationPanel />
          </motion.div>
        )}

        {activeTab === "person-fit" && (
          <motion.div
            key="person-fit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PersonFitPanel />
          </motion.div>
        )}

        {activeTab === "shadow-test" && (
          <motion.div
            key="shadow-test"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ShadowTestPanel />
          </motion.div>
        )}

        {activeTab === "item-drift" && (
          <motion.div
            key="item-drift"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ItemDriftPanel />
          </motion.div>
        )}

        {activeTab === "cognitive-diag" && (
          <motion.div
            key="cognitive-diag"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <CognitiveDiagnosticPanel />
          </motion.div>
        )}

        {activeTab === "bayes-calib" && (
          <motion.div
            key="bayes-calib"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BayesianCalibrationPanel />
          </motion.div>
        )}

        {activeTab === "mst-routing" && (
          <motion.div
            key="mst-routing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <MSTRoutingPanel />
          </motion.div>
        )}

        {activeTab === "rt-diag" && (
          <motion.div
            key="rt-diag"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ResponseTimeDiagnosticsPanel />
          </motion.div>
        )}

        {activeTab === "local-dep" && (
          <motion.div
            key="local-dep"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <LocalItemDependencePanel />
          </motion.div>
        )}

        {activeTab === "anchor-items" && (
          <motion.div
            key="anchor-items"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <AnchorItemMonitorPanel />
          </motion.div>
        )}

        {activeTab === "subscale" && (
          <motion.div
            key="subscale"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SubscaleCompositeScoringPanel />
          </motion.div>
        )}

        {activeTab === "csem" && (
          <motion.div
            key="csem"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ConditionalSEMPanel />
          </motion.div>
        )}

        {activeTab === "tcc" && (
          <motion.div
            key="tcc"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <TestCharacteristicCurvePanel />
          </motion.div>
        )}

        {activeTab === "dbf" && (
          <motion.div
            key="dbf"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DifferentialBundleFunctioningPanel />
          </motion.div>
        )}

        {activeTab === "poly-dif" && (
          <motion.div
            key="poly-dif"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PolytomousDIFPanel />
          </motion.div>
        )}

        {activeTab === "reliability" && (
          <motion.div
            key="reliability"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ScoreReliabilitySubgroupPanel />
          </motion.div>
        )}

        {activeTab === "stopping-rule" && (
          <motion.div
            key="stopping-rule"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <AdaptiveStoppingRulePanel />
          </motion.div>
        )}

        {activeTab === "item-fit" && (
          <motion.div
            key="item-fit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ItemFitPanel />
          </motion.div>
        )}

        {activeTab === "cat-sim" && (
          <motion.div
            key="cat-sim"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <CATItemSelectionPanel />
          </motion.div>
        )}

        {activeTab === "score-norms" && (
          <motion.div
            key="score-norms"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ScoreNormingPanel />
          </motion.div>
        )}

        {activeTab === "online-calib" && (
          <motion.div
            key="online-calib"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <OnlineCalibrationMonitorPanel />
          </motion.div>
        )}

        {activeTab === "dsf" && (
          <motion.div
            key="dsf"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DifferentialStepFunctioningPanel />
          </motion.div>
        )}

        {activeTab === "bn-dep" && (
          <motion.div
            key="bn-dep"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BayesianNetworkDependencePanel />
          </motion.div>
        )}

        {activeTab === "score-report" && (
          <motion.div
            key="score-report"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ScoreReportingAnalyticsPanel />
          </motion.div>
        )}

        {activeTab === "mg-inv" && (
          <motion.div
            key="mg-inv"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <MultigroupInvariancePanel />
          </motion.div>
        )}

        {activeTab === "irt-rt" && (
          <motion.div
            key="irt-rt"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <IRTResponseTimePanel />
          </motion.div>
        )}

        {activeTab === "exposure" && (
          <motion.div
            key="exposure"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ItemExposureControlPanel />
          </motion.div>
        )}

        {activeTab === "scale-eq" && (
          <motion.div
            key="scale-eq"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ScaleEquatingDiagnosticsPanel />
          </motion.div>
        )}

        {activeTab === "growth" && (
          <motion.div
            key="growth"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PersonFitGrowthPanel />
          </motion.div>
        )}

        {activeTab === "rater-calib" && (
          <motion.div
            key="rater-calib"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <RaterCalibrationPanel />
          </motion.div>
        )}

        {activeTab === "long-dif" && (
          <motion.div
            key="long-dif"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <LongitudinalDIFPanel />
          </motion.div>
        )}

        {activeTab === "validity" && (
          <motion.div
            key="validity"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ScoreValidityEvidencePanel />
          </motion.div>
        )}

        {activeTab === "codes" && (
          <motion.div
            key="codes"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ExamCodeManager orgId={ORG_ID} />
          </motion.div>
        )}

        {activeTab === "integrations" && (
          <motion.div
            key="integrations"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <IntegrationsSettings orgId={ORG_ID} />
          </motion.div>
        )}

        {activeTab === "audit" && (
          <motion.div
            key="audit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <AuditLogView orgId={ORG_ID} />
          </motion.div>
        )}

        {activeTab === "proctoring" && (
          <motion.div
            key="proctoring"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ProctoringReview orgId={ORG_ID} />
          </motion.div>
        )}

        {activeTab === "billing" && (
          <motion.div
            key="billing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <BillingDashboard orgId={ORG_ID} />
          </motion.div>
        )}

        {activeTab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <AdvancedAnalytics orgId={ORG_ID} />
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
            <GlobalSettings orgId={ORG_ID} />
          </motion.div>
        )}
      </AnimatePresence>
      </main>
    </div>
  );
};

const NAV_LABELS: Record<string, string> = {
  overview: "Overview",
  candidates: "Candidates",
  codes: "Exam Codes",
  analytics: "Analytics",
  "content-qa": "Content QA",
  "item-generator": "AI Generator",
  "item-inventory": "Item Inventory",
  "item-bank": "Item Bank",
  "distractor-audit": "Item Quality",
  "aig-quality": "AIG Quality",
  "bias-review": "Bias Review",
  "item-retirement": "Item Retirement",
  calibration: "Calibration",
  dif: "DIF Monitor",
  "standard-setting": "Standard Setting",
  equating: "Equating",
  "psychometric-quality": "Quality",
  mirt: "MIRT 6D",
  grm: "GRM Scoring",
  exposure: "Exposure",
  "rater-reliability": "Rater IRR",
  classification: "Classification",
  blueprint: "Blueprint",
  "theta-diag": "θ Diagnostics",
  tif: "TIF",
  "person-fit": "Person Fit",
  "shadow-test": "Shadow Test",
  "item-drift": "Item Drift",
  "cognitive-diag": "Cognitive Diag",
  "bayes-calib": "Bayes Calibration",
  "mst-routing": "MST Routing",
  "rt-diag": "RT Diagnostics",
  "local-dep": "Local Dep.",
  "anchor-items": "Anchor Items",
  subscale: "Subscale",
  csem: "Cond. SEM",
  tcc: "TCC",
  dbf: "DBF",
  "poly-dif": "Poly DIF",
  reliability: "Reliability",
  "stopping-rule": "Stop Rules",
  "item-fit": "Item Fit",
  "cat-sim": "CAT Sim",
  "score-norms": "Score Norms",
  "online-calib": "Online Calibration",
  dsf: "DSF",
  "bn-dep": "BN Dep.",
  "score-report": "Score Report",
  "mg-inv": "MG Invariance",
  "irt-rt": "IRT-RT Model",
  "scale-eq": "Scale Equating",
  growth: "Growth",
  "rater-calib": "Rater Calibration",
  "long-dif": "Longitudinal DIF",
  validity: "Validity Evidence",
  import: "Import",
  branding: "Branding",
  fraud: "Fraud Monitor",
  proctoring: "Proctoring",
  billing: "Billing",
  integrations: "Integrations",
  audit: "Audit Logs",
  settings: "Settings",
};

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
        {label}
      </div>
      {children}
    </div>
  );
}

function NavItem({
  id,
  activeTab,
  setActiveTab,
  setSelectedSessionId,
  icon,
  label,
}: {
  id: string;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  setSelectedSessionId: (id: string | null) => void;
  icon: React.ReactNode;
  label: string;
}) {
  const active = activeTab === id;
  return (
    <button
      onClick={() => { setActiveTab(id); setSelectedSessionId(null); }}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all text-left",
        active
          ? "bg-indigo-50 text-indigo-700 font-bold"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
      )}
    >
      <span className={cn("flex-shrink-0", active ? "text-indigo-500" : "text-slate-400")}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {active && <span className="ml-auto w-1 h-4 rounded-full bg-indigo-500 flex-shrink-0" />}
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

