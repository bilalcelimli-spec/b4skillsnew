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
    | "calibration" | "content-qa" | "item-generator" | "item-inventory" | "distractor-audit" | "aig-quality" | "fraud" | "bias-review" | "dif" | "item-bank" | "standard-setting" | "equating" | "psychometric-quality" | "item-retirement" | "mirt" | "grm" | "exposure" | "rater-reliability" | "classification" | "blueprint" | "theta-diag" | "tif" | "person-fit" | "shadow-test" | "item-drift" | "cognitive-diag" | "bayes-calib" | "mst-routing" | "rt-diag" | "local-dep" | "anchor-items" | "subscale" | "csem" | "tcc" | "dbf" | "poly-dif" | "reliability" | "stopping-rule" | "item-fit" | "cat-sim" | "score-norms" | "online-calib" | "dsf" | "bn-dep" | "score-report" | "mg-inv" | "irt-rt"
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
            active={activeTab === "item-generator"}
            onClick={() => {
              setActiveTab("item-generator");
              setSelectedSessionId(null);
            }}
            icon={<Wand2 size={14} />}
            label="AI Generator"
          />
          <TabButton
            active={activeTab === "item-inventory"}
            onClick={() => {
              setActiveTab("item-inventory");
              setSelectedSessionId(null);
            }}
            icon={<Database size={14} />}
            label="Item Inventory"
          />
          <TabButton
            active={activeTab === "distractor-audit"}
            onClick={() => {
              setActiveTab("distractor-audit");
              setSelectedSessionId(null);
            }}
            icon={<FlaskConical size={14} />}
            label="Item Quality"
          />
          <TabButton
            active={activeTab === "aig-quality"}
            onClick={() => {
              setActiveTab("aig-quality");
              setSelectedSessionId(null);
            }}
            icon={<Wand2 size={14} />}
            label="AIG Quality"
          />
          <TabButton
            active={activeTab === "bias-review"}
            onClick={() => {
              setActiveTab("bias-review");
              setSelectedSessionId(null);
            }}
            icon={<ShieldAlert size={14} />}
            label="Bias Review"
          />
          <TabButton
            active={activeTab === "fraud"}
            onClick={() => {
              setActiveTab("fraud");
              setSelectedSessionId(null);
            }}
            icon={<ShieldAlert size={14} />}
            label="Fraud Monitor"
          />
          <TabButton
            active={activeTab === "dif"}
            onClick={() => {
              setActiveTab("dif");
              setSelectedSessionId(null);
            }}
            icon={<FlaskConical size={14} />}
            label="DIF Monitor"
          />
          <TabButton
            active={activeTab === "item-bank"}
            onClick={() => {
              setActiveTab("item-bank");
              setSelectedSessionId(null);
            }}
            icon={<Database size={14} />}
            label="Item Bank"
          />
          <TabButton
            active={activeTab === "standard-setting"}
            onClick={() => {
              setActiveTab("standard-setting");
              setSelectedSessionId(null);
            }}
            icon={<Calculator size={14} />}
            label="Standard Setting"
          />
          <TabButton
            active={activeTab === "equating"}
            onClick={() => {
              setActiveTab("equating");
              setSelectedSessionId(null);
            }}
            icon={<ArrowUpRight size={14} />}
            label="Equating"
          />
          <TabButton
            active={activeTab === "psychometric-quality"}
            onClick={() => {
              setActiveTab("psychometric-quality");
              setSelectedSessionId(null);
            }}
            icon={<Activity size={14} />}
            label="Quality"
          />
          <TabButton
            active={activeTab === "item-retirement"}
            onClick={() => {
              setActiveTab("item-retirement");
              setSelectedSessionId(null);
            }}
            icon={<Trash2 size={14} />}
            label="Item Retirement"
          />
          <TabButton
            active={activeTab === "mirt"}
            onClick={() => {
              setActiveTab("mirt");
              setSelectedSessionId(null);
            }}
            icon={<Zap size={14} />}
            label="MIRT 6D"
          />
          <TabButton
            active={activeTab === "grm"}
            onClick={() => {
              setActiveTab("grm");
              setSelectedSessionId(null);
            }}
            icon={<BarChart3 size={14} />}
            label="GRM Scoring"
          />
          <TabButton
            active={activeTab === "exposure"}
            onClick={() => {
              setActiveTab("exposure");
              setSelectedSessionId(null);
            }}
            icon={<ShieldCheck size={14} />}
            label="Exposure"
          />
          <TabButton
            active={activeTab === "rater-reliability"}
            onClick={() => {
              setActiveTab("rater-reliability");
              setSelectedSessionId(null);
            }}
            icon={<Users size={14} />}
            label="Rater IRR"
          />
          <TabButton
            active={activeTab === "classification"}
            onClick={() => {
              setActiveTab("classification");
              setSelectedSessionId(null);
            }}
            icon={<Activity size={14} />}
            label="Classification"
          />
          <TabButton
            active={activeTab === "blueprint"}
            onClick={() => {
              setActiveTab("blueprint");
              setSelectedSessionId(null);
            }}
            icon={<LayoutDashboard size={14} />}
            label="Blueprint"
          />
          <TabButton
            active={activeTab === "theta-diag"}
            onClick={() => {
              setActiveTab("theta-diag");
              setSelectedSessionId(null);
            }}
            icon={<Zap size={14} />}
            label="θ Diagnostics"
          />
          <TabButton
            active={activeTab === "tif"}
            onClick={() => {
              setActiveTab("tif");
              setSelectedSessionId(null);
            }}
            icon={<BarChart3 size={14} />}
            label="TIF"
          />
          <TabButton
            active={activeTab === "person-fit"}
            onClick={() => { setActiveTab("person-fit"); setSelectedSessionId(null); }}
            icon={<ShieldAlert size={14} />}
            label="Person Fit"
          />
          <TabButton
            active={activeTab === "shadow-test"}
            onClick={() => { setActiveTab("shadow-test"); setSelectedSessionId(null); }}
            icon={<Database size={14} />}
            label="Shadow Test"
          />
          <TabButton
            active={activeTab === "item-drift"}
            onClick={() => { setActiveTab("item-drift"); setSelectedSessionId(null); }}
            icon={<FlaskConical size={14} />}
            label="Item Drift"
          />
          <TabButton
            active={activeTab === "cognitive-diag"}
            onClick={() => { setActiveTab("cognitive-diag"); setSelectedSessionId(null); }}
            icon={<Wand2 size={14} />}
            label="Cognitive Diag"
          />
          <TabButton
            active={activeTab === "bayes-calib"}
            onClick={() => { setActiveTab("bayes-calib"); setSelectedSessionId(null); }}
            icon={<Calculator size={14} />}
            label="Bayes Calib"
          />
          <TabButton
            active={activeTab === "mst-routing"}
            onClick={() => { setActiveTab("mst-routing"); setSelectedSessionId(null); }}
            icon={<LayoutDashboard size={14} />}
            label="MST Routing"
          />
          <TabButton
            active={activeTab === "rt-diag"}
            onClick={() => { setActiveTab("rt-diag"); setSelectedSessionId(null); }}
            icon={<Clock size={14} />}
            label="RT Diagnostics"
          />
          <TabButton
            active={activeTab === "local-dep"}
            onClick={() => { setActiveTab("local-dep"); setSelectedSessionId(null); }}
            icon={<Key size={14} />}
            label="Local Dep"
          />
          <TabButton
            active={activeTab === "anchor-items"}
            onClick={() => { setActiveTab("anchor-items"); setSelectedSessionId(null); }}
            icon={<Upload size={14} />}
            label="Anchor Items"
          />
          <TabButton
            active={activeTab === "subscale"}
            onClick={() => { setActiveTab("subscale"); setSelectedSessionId(null); }}
            icon={<BarChart3 size={14} />}
            label="Subscale"
          />
          <TabButton
            active={activeTab === "csem"}
            onClick={() => { setActiveTab("csem"); setSelectedSessionId(null); }}
            icon={<Activity size={14} />}
            label="Cond. SEM"
          />
          <TabButton
            active={activeTab === "tcc"}
            onClick={() => { setActiveTab("tcc"); setSelectedSessionId(null); }}
            icon={<TrendingUp size={14} />}
            label="TCC"
          />
          <TabButton
            active={activeTab === "dbf"}
            onClick={() => { setActiveTab("dbf"); setSelectedSessionId(null); }}
            icon={<ShieldAlert size={14} />}
            label="DBF"
          />
          <TabButton
            active={activeTab === "poly-dif"}
            onClick={() => { setActiveTab("poly-dif"); setSelectedSessionId(null); }}
            icon={<ShieldCheck size={14} />}
            label="Poly DIF"
          />
          <TabButton
            active={activeTab === "reliability"}
            onClick={() => { setActiveTab("reliability"); setSelectedSessionId(null); }}
            icon={<BarChart3 size={14} />}
            label="Reliability"
          />
          <TabButton
            active={activeTab === "stopping-rule"}
            onClick={() => { setActiveTab("stopping-rule"); setSelectedSessionId(null); }}
            icon={<Zap size={14} />}
            label="Stop Rules"
          />
          <TabButton
            active={activeTab === "item-fit"}
            onClick={() => { setActiveTab("item-fit"); setSelectedSessionId(null); }}
            icon={<FlaskConical size={14} />}
            label="Item Fit"
          />
          <TabButton
            active={activeTab === "cat-sim"}
            onClick={() => { setActiveTab("cat-sim"); setSelectedSessionId(null); }}
            icon={<Calculator size={14} />}
            label="CAT Sim"
          />
          <TabButton
            active={activeTab === "score-norms"}
            onClick={() => { setActiveTab("score-norms"); setSelectedSessionId(null); }}
            icon={<Database size={14} />}
            label="Norms"
          />
          <TabButton
            active={activeTab === "online-calib"}
            onClick={() => { setActiveTab("online-calib"); setSelectedSessionId(null); }}
            icon={<TrendingUp size={14} />}
            label="Drift"
          />
          <TabButton
            active={activeTab === "dsf"}
            onClick={() => { setActiveTab("dsf"); setSelectedSessionId(null); }}
            icon={<Layers size={14} />}
            label="DSF"
          />
          <TabButton
            active={activeTab === "bn-dep"}
            onClick={() => { setActiveTab("bn-dep"); setSelectedSessionId(null); }}
            icon={<Network size={14} />}
            label="BN Dep"
          />
          <TabButton
            active={activeTab === "score-report"}
            onClick={() => { setActiveTab("score-report"); setSelectedSessionId(null); }}
            icon={<FileText size={14} />}
            label="Score Report"
          />
          <TabButton
            active={activeTab === "mg-inv"}
            onClick={() => { setActiveTab("mg-inv"); setSelectedSessionId(null); }}
            icon={<Share2 size={14} />}
            label="MG Inv."
          />
          <TabButton
            active={activeTab === "irt-rt"}
            onClick={() => { setActiveTab("irt-rt"); setSelectedSessionId(null); }}
            icon={<Clock size={14} />}
            label="RT Model"
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

