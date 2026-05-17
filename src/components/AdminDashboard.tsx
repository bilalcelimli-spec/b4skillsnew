import React, { useState, useEffect, useCallback, useRef } from "react";
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
  ChevronRight,
  ChevronDown,
  Command,
  X,
  BookOpen,
  Microscope,
  Wrench,
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

// ─── Navigation data ─────────────────────────────────────────────────────────

type TabId =
  | "overview" | "candidates" | "branding" | "import" | "codes"
  | "integrations" | "audit" | "analytics" | "settings" | "proctoring"
  | "billing" | "fraud"
  | "calibration" | "content-qa" | "item-generator" | "item-inventory"
  | "distractor-audit" | "aig-quality" | "bias-review" | "dif" | "item-bank"
  | "standard-setting" | "equating" | "psychometric-quality" | "item-retirement"
  | "mirt" | "grm" | "exposure" | "exposure-ctrl" | "rater-reliability"
  | "classification" | "blueprint" | "theta-diag" | "tif" | "person-fit"
  | "shadow-test" | "item-drift" | "cognitive-diag" | "bayes-calib"
  | "mst-routing" | "rt-diag" | "local-dep" | "anchor-items" | "subscale"
  | "csem" | "tcc" | "dbf" | "poly-dif" | "reliability" | "stopping-rule"
  | "item-fit" | "cat-sim" | "score-norms" | "online-calib" | "dsf" | "bn-dep"
  | "score-report" | "mg-inv" | "irt-rt" | "scale-eq" | "growth"
  | "rater-calib" | "long-dif" | "validity";

type RoleMode = "operator" | "psychometrician" | "admin";
type PrimarySection = "overview" | "item-bank" | "candidates" | "psychometrics" | "operations";

interface NavEntry { id: TabId; label: string; icon: React.ReactNode; badge?: string }
interface NavSection { label: string; items: NavEntry[]; defaultOpen?: boolean }

const SECONDARY_NAV: Record<PrimarySection, NavSection[]> = {
  overview: [
    {
      label: "Dashboard",
      defaultOpen: true,
      items: [
        { id: "overview", label: "Overview", icon: <LayoutDashboard size={14} /> },
        { id: "analytics", label: "Analytics", icon: <BarChart3 size={14} /> },
      ],
    },
  ],
  "item-bank": [
    {
      label: "Review & QA",
      defaultOpen: true,
      items: [
        { id: "content-qa", label: "Content QA", icon: <CheckCircle2 size={14} /> },
        { id: "distractor-audit", label: "Item Quality", icon: <FlaskConical size={14} /> },
        { id: "aig-quality", label: "AIG Quality", icon: <Activity size={14} /> },
        { id: "bias-review", label: "Bias Review", icon: <ShieldAlert size={14} /> },
      ],
    },
    {
      label: "Generation & Inventory",
      defaultOpen: true,
      items: [
        { id: "item-generator", label: "AI Generator", icon: <Wand2 size={14} /> },
        { id: "item-inventory", label: "Inventory", icon: <Database size={14} /> },
        { id: "item-bank", label: "Item Bank", icon: <Layers size={14} /> },
        { id: "item-retirement", label: "Retirement", icon: <Trash2 size={14} /> },
      ],
    },
  ],
  candidates: [
    {
      label: "Candidates",
      defaultOpen: true,
      items: [
        { id: "candidates", label: "All Candidates", icon: <Users size={14} /> },
        { id: "codes", label: "Exam Codes", icon: <Key size={14} /> },
        { id: "import", label: "Bulk Import", icon: <Upload size={14} /> },
      ],
    },
  ],
  psychometrics: [
    {
      label: "Calibration & Fit",
      defaultOpen: true,
      items: [
        { id: "calibration", label: "Calibration", icon: <Calculator size={14} /> },
        { id: "item-fit", label: "Item Fit", icon: <FlaskConical size={14} /> },
        { id: "bayes-calib", label: "Bayes Calibration", icon: <Calculator size={14} /> },
        { id: "online-calib", label: "Online Calibration", icon: <TrendingUp size={14} /> },
        { id: "anchor-items", label: "Anchor Items", icon: <Upload size={14} /> },
      ],
    },
    {
      label: "Fairness & Bias",
      defaultOpen: true,
      items: [
        { id: "dif", label: "DIF Monitor", icon: <ShieldAlert size={14} /> },
        { id: "poly-dif", label: "Poly DIF", icon: <ShieldCheck size={14} /> },
        { id: "dbf", label: "Bundle DIF", icon: <ShieldAlert size={14} /> },
        { id: "long-dif", label: "Longitudinal DIF", icon: <GitBranch size={14} /> },
      ],
    },
    {
      label: "Scoring & Reporting",
      defaultOpen: false,
      items: [
        { id: "grm", label: "GRM Scoring", icon: <BarChart3 size={14} /> },
        { id: "subscale", label: "Subscale", icon: <BarChart3 size={14} /> },
        { id: "csem", label: "Cond. SEM", icon: <Activity size={14} /> },
        { id: "score-norms", label: "Score Norms", icon: <Database size={14} /> },
        { id: "score-report", label: "Score Report", icon: <FileText size={14} /> },
        { id: "validity", label: "Validity Evidence", icon: <CheckSquare size={14} /> },
        { id: "reliability", label: "Reliability", icon: <BarChart3 size={14} /> },
      ],
    },
    {
      label: "CAT & Adaptive",
      defaultOpen: false,
      items: [
        { id: "cat-sim", label: "CAT Simulation", icon: <Calculator size={14} /> },
        { id: "stopping-rule", label: "Stopping Rules", icon: <Zap size={14} /> },
        { id: "mst-routing", label: "MST Routing", icon: <Network size={14} /> },
        { id: "shadow-test", label: "Shadow Test", icon: <Database size={14} /> },
        { id: "exposure", label: "Exposure Monitor", icon: <ShieldCheck size={14} /> },
        { id: "exposure-ctrl", label: "Exposure Control", icon: <Shield size={14} /> },
      ],
    },
    {
      label: "Advanced Research",
      defaultOpen: false,
      items: [
        { id: "mirt", label: "MIRT 6D", icon: <Zap size={14} /> },
        { id: "cognitive-diag", label: "Cognitive Diag", icon: <Wand2 size={14} /> },
        { id: "tif", label: "TIF", icon: <BarChart3 size={14} /> },
        { id: "tcc", label: "TCC", icon: <TrendingUp size={14} /> },
        { id: "theta-diag", label: "θ Diagnostics", icon: <Zap size={14} /> },
        { id: "person-fit", label: "Person Fit", icon: <ShieldAlert size={14} /> },
        { id: "item-drift", label: "Item Drift", icon: <FlaskConical size={14} /> },
        { id: "standard-setting", label: "Standard Setting", icon: <Calculator size={14} /> },
        { id: "equating", label: "Equating", icon: <ArrowUpRight size={14} /> },
        { id: "scale-eq", label: "Scale Equating", icon: <Link2 size={14} /> },
        { id: "psychometric-quality", label: "Psych Quality", icon: <Activity size={14} /> },
        { id: "classification", label: "Classification", icon: <Activity size={14} /> },
        { id: "blueprint", label: "Blueprint", icon: <LayoutDashboard size={14} /> },
        { id: "rater-reliability", label: "Rater IRR", icon: <Users size={14} /> },
        { id: "rater-calib", label: "Rater Calib.", icon: <UserCheck size={14} /> },
        { id: "rt-diag", label: "RT Diagnostics", icon: <Clock size={14} /> },
        { id: "local-dep", label: "Local Dependence", icon: <Link2 size={14} /> },
        { id: "bn-dep", label: "Bayesian Network", icon: <Network size={14} /> },
        { id: "dsf", label: "DSF", icon: <Layers size={14} /> },
        { id: "mg-inv", label: "MG Invariance", icon: <Share2 size={14} /> },
        { id: "irt-rt", label: "IRT-RT Model", icon: <Clock size={14} /> },
        { id: "growth", label: "Growth", icon: <TrendingUp size={14} /> },
      ],
    },
  ],
  operations: [
    {
      label: "Operations",
      defaultOpen: true,
      items: [
        { id: "proctoring", label: "Proctoring", icon: <ShieldCheck size={14} /> },
        { id: "fraud", label: "Fraud Monitor", icon: <ShieldAlert size={14} /> },
        { id: "audit", label: "Audit Logs", icon: <ShieldCheck size={14} /> },
        { id: "billing", label: "Billing", icon: <CreditCard size={14} /> },
      ],
    },
    {
      label: "Configuration",
      defaultOpen: true,
      items: [
        { id: "branding", label: "Branding", icon: <Palette size={14} /> },
        { id: "integrations", label: "Integrations", icon: <Zap size={14} /> },
        { id: "settings", label: "Settings", icon: <SettingsIcon size={14} /> },
      ],
    },
  ],
};

// Flat list for command palette search
const ALL_ITEMS: { id: TabId; label: string; section: string }[] = Object.entries(SECONDARY_NAV).flatMap(
  ([section, groups]) =>
    groups.flatMap((g) => g.items.map((item) => ({ id: item.id, label: item.label, section: g.label })))
);

const NAV_LABELS: Record<string, string> = Object.fromEntries(
  ALL_ITEMS.map((i) => [i.id, i.label])
);

// Which primary section each tab belongs to
const TAB_TO_SECTION: Record<TabId, PrimarySection> = {} as any;
Object.entries(SECONDARY_NAV).forEach(([section, groups]) => {
  groups.forEach((g) => g.items.forEach((item) => {
    (TAB_TO_SECTION as any)[item.id] = section as PrimarySection;
  }));
});

// Primary nav
const PRIMARY_NAV: { id: PrimarySection; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { id: "item-bank", label: "Item Bank", icon: <BookOpen size={16} /> },
  { id: "candidates", label: "Candidates", icon: <Users size={16} /> },
  { id: "psychometrics", label: "Psychometrics", icon: <Microscope size={16} /> },
  { id: "operations", label: "Operations", icon: <Wrench size={16} /> },
];

// Role visibility
const ROLE_HIDDEN: Record<RoleMode, PrimarySection[]> = {
  operator: ["psychometrics"],
  psychometrician: ["operations"],
  admin: [],
};

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
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [activeSection, setActiveSection] = useState<PrimarySection>("overview");
  const [role, setRole] = useState<RoleMode>("admin");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, avgTheta: 0 });
  const [serviceHealth, setServiceHealth] = useState<Record<string, string>>({
    aiScoring: "loading",
    adaptiveLogic: "loading",
    storageApi: "loading",
    proctoringService: "loading",
  });

  // Open ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
        setCmdQuery("");
      }
      if (e.key === "Escape") setCmdOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const navigateTo = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setActiveSection(TAB_TO_SECTION[tab] ?? "overview");
    setSelectedSessionId(null);
    setCmdOpen(false);
    setCmdQuery("");
  }, []);

  useEffect(() => {
    if (!ORG_ID) { setSessions([]); setStats({ total: 0, completed: 0, inProgress: 0, avgTheta: 0 }); setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/organizations/${ORG_ID}/sessions?limit=100`, { credentials: "include" });
        if (!res.ok) throw new Error("sessions fetch failed");
        const data = await res.json();
        const normStatus = (s: string) => s.toLowerCase();
        const mapped: SessionData[] = (data as any[]).map((s) => ({
          id: s.id, candidateId: s.candidateId, organizationId: s.organizationId,
          status: normStatus(s.status || ""), currentStage: s.currentStage ?? 0,
          abilityEstimate: s.theta ?? 0, cefrLevel: s.scoreReport?.overallCefr ?? s.cefrLevel,
          startedAt: s.startedAt || s.createdAt, completedAt: s.completedAt,
          candidateName: s.candidate?.name, candidateEmail: s.candidate?.email,
        }));
        setSessions(mapped);
        const total = mapped.length;
        const completed = mapped.filter((x) => x.status === "completed").length;
        const inProgress = mapped.filter((x) => x.status === "in_progress").length;
        const avgTheta = total > 0 ? mapped.reduce((a, b) => a + (b.abilityEstimate || 0), 0) / total : 0;
        setStats({ total, completed, inProgress, avgTheta });
      } catch { setSessions([]); setStats({ total: 0, completed: 0, inProgress: 0, avgTheta: 0 }); }
      finally { setLoading(false); }
    })();
  }, [ORG_ID]);

  // Poll real service health every 30 s
  useEffect(() => {
    const fetchServiceHealth = async () => {
      try {
        const res = await fetch("/api/health/services", { credentials: "include" });
        if (!res.ok) throw new Error("health fetch failed");
        const data = await res.json();
        setServiceHealth(data.services ?? {});
      } catch {
        setServiceHealth({
          aiScoring: "degraded",
          adaptiveLogic: "degraded",
          storageApi: "degraded",
          proctoringService: "degraded",
        });
      }
    };
    fetchServiceHealth();
    const interval = setInterval(fetchServiceHealth, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  }

  if (!ORG_ID) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <p className="font-semibold">No organization on your account</p>
        <p className="text-sm mt-1 text-amber-800">An administrator must assign you to an organization before the admin console can load data.</p>
      </div>
    );
  }

  const visiblePrimary = PRIMARY_NAV.filter((p) => !ROLE_HIDDEN[role].includes(p.id));
  const currentSections = SECONDARY_NAV[activeSection] ?? [];
  const cmdResults = cmdQuery.trim()
    ? ALL_ITEMS.filter((i) => i.label.toLowerCase().includes(cmdQuery.toLowerCase()) || i.section.toLowerCase().includes(cmdQuery.toLowerCase())).slice(0, 8)
    : ALL_ITEMS.slice(0, 8);

  return (
    <div className="flex flex-col min-h-screen -mx-4 md:-mx-8 bg-slate-50">
      {/* ── Top Primary Nav Bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 flex items-center gap-0 px-4 h-12 shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-2 pr-6 border-r border-slate-200 mr-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap size={12} className="text-white" />
          </div>
          <span className="text-xs font-black text-slate-900 uppercase tracking-tight">Admin</span>
        </div>

        {/* Primary sections */}
        <nav className="flex items-center gap-0.5 flex-1">
          {visiblePrimary.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActiveSection(p.id);
                // Navigate to first tab in section
                const firstTab = SECONDARY_NAV[p.id]?.[0]?.items?.[0]?.id;
                if (firstTab) { setActiveTab(firstTab); setSelectedSessionId(null); }
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 h-12 text-[11px] font-semibold transition-all border-b-2",
                activeSection === p.id
                  ? "text-indigo-700 border-indigo-600 bg-indigo-50/60"
                  : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50",
              )}
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
          {/* Role selector */}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as RoleMode)}
            className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 border-0 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="admin">Admin</option>
            <option value="psychometrician">Psychometrician</option>
            <option value="operator">Operator</option>
          </select>

          {/* ⌘K button */}
          <button
            onClick={() => { setCmdOpen(true); setCmdQuery(""); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-500 transition-colors"
          >
            <Command size={11} />
            <span>K</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── Secondary Sidebar ──────────────────────────────────────────── */}
        <aside className="w-52 flex-shrink-0 bg-white border-r border-slate-200 sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto">
          <nav className="py-3 px-2 space-y-0.5">
            {currentSections.map((section) => (
              <SecondaryNavSection
                key={section.label}
                section={section}
                activeTab={activeTab}
                onNavigate={navigateTo}
              />
            ))}
          </nav>
        </aside>

        {/* ── Main Content ───────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 px-6 py-5 overflow-auto">
          {/* Breadcrumb + title */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mb-1 uppercase tracking-widest">
                <span>{PRIMARY_NAV.find((p) => p.id === activeSection)?.label}</span>
                <ChevronRight size={10} />
                <span className="text-slate-600">{NAV_LABELS[activeTab] ?? "Overview"}</span>
              </div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                {NAV_LABELS[activeTab] ?? "Admin"}
              </h1>
            </div>
            {/* Contextual quick actions */}
            <QuickActions activeSection={activeSection} activeTab={activeTab} onNavigate={navigateTo} />
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={<Activity className="text-indigo-600" />} label="Total Sessions" value={stats.total.toString()} trend="+12% from last week" />
                  <StatCard icon={<CheckCircle2 className="text-emerald-600" />} label="Completed" value={stats.completed.toString()} trend={`${Math.round((stats.completed / (stats.total || 1)) * 100)}% completion rate`} />
                  <StatCard icon={<Clock className="text-amber-600" />} label="In Progress" value={stats.inProgress.toString()} trend="Active candidates" />
                  <StatCard icon={<BarChart3 className="text-purple-600" />} label="Avg. Ability" value={stats.avgTheta.toFixed(2)} trend="CEFR B2 Average" />
                </div>

                {/* Quick nav widgets */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Content QA", sub: "Review flagged items", tab: "content-qa" as TabId, color: "bg-amber-50 border-amber-200 hover:border-amber-400", icon: <CheckCircle2 size={18} className="text-amber-600" /> },
                    { label: "AI Generator", sub: "Generate new items", tab: "item-generator" as TabId, color: "bg-indigo-50 border-indigo-200 hover:border-indigo-400", icon: <Wand2 size={18} className="text-indigo-600" /> },
                    { label: "Calibration", sub: "IRT item parameters", tab: "calibration" as TabId, color: "bg-purple-50 border-purple-200 hover:border-purple-400", icon: <Calculator size={18} className="text-purple-600" /> },
                    { label: "Candidates", sub: "Manage test takers", tab: "candidates" as TabId, color: "bg-emerald-50 border-emerald-200 hover:border-emerald-400", icon: <Users size={18} className="text-emerald-600" /> },
                  ].map((w) => (
                    <button key={w.tab} onClick={() => navigateTo(w.tab)} className={cn("flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left", w.color)}>
                      <div className="mt-0.5">{w.icon}</div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{w.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{w.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedSessionId ? (
                  <SessionReview sessionId={selectedSessionId} onBack={() => setSelectedSessionId(null)} />
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <Card className="xl:col-span-2 overflow-hidden border-slate-200 shadow-sm rounded-2xl">
                      <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100">
                        <div className="font-black text-slate-900 uppercase tracking-tight text-sm">Recent Sessions</div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest rounded-lg"><Filter size={11} className="mr-1" /> Filter</Button>
                          <Button variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest rounded-lg"><Search size={11} className="mr-1" /> Search</Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/30 text-slate-400 text-[8px] uppercase tracking-widest font-black">
                                <th className="px-5 py-3 border-b border-slate-100">Candidate</th>
                                <th className="px-5 py-3 border-b border-slate-100">Status</th>
                                <th className="px-5 py-3 border-b border-slate-100 text-center">Ability (θ)</th>
                                <th className="px-5 py-3 border-b border-slate-100">Started</th>
                                <th className="px-5 py-3 border-b border-slate-100 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {sessions.map((session) => (
                                <tr key={session.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedSessionId(session.id)}>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-black border border-slate-200">{session.candidateName?.[0]}</div>
                                      <div>
                                        <div className="text-sm font-bold text-slate-900">{session.candidateName}</div>
                                        <div className="text-[10px] text-slate-400 font-medium">{session.candidateEmail}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest", session.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{session.status}</span>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                      <div className="text-sm font-mono font-black text-slate-700">{session.abilityEstimate?.toFixed(2)}</div>
                                      <CEFRBadge theta={session.abilityEstimate} level={session.cefrLevel} />
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase tracking-widest">
                                      <Calendar size={11} className="text-slate-300" />
                                      {session.startedAt?.toDate ? session.startedAt.toDate().toLocaleDateString() : "N/A"}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 text-right">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"><ArrowUpRight size={14} /></Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-4">
                      <Card className="border-indigo-100 bg-indigo-50/30 rounded-2xl shadow-sm">
                        <CardHeader className="font-black text-indigo-900 uppercase tracking-tight text-sm">System Health</CardHeader>
                        <CardContent className="space-y-3">
                          <HealthItem label="AI Scoring Engine" status={serviceHealth.aiScoring ?? "loading"} color={serviceHealth.aiScoring === "operational" ? "bg-green-500" : serviceHealth.aiScoring === "degraded" ? "bg-amber-500" : "bg-red-500"} />
                          <HealthItem label="Adaptive Logic" status={serviceHealth.adaptiveLogic ?? "loading"} color={serviceHealth.adaptiveLogic === "operational" ? "bg-green-500" : serviceHealth.adaptiveLogic === "degraded" ? "bg-amber-500" : "bg-red-500"} />
                          <HealthItem label="Storage API" status={serviceHealth.storageApi ?? "loading"} color={serviceHealth.storageApi === "operational" ? "bg-green-500" : serviceHealth.storageApi === "degraded" ? "bg-amber-500" : "bg-red-500"} />
                          <HealthItem label="Proctoring Service" status={serviceHealth.proctoringService ?? "loading"} color={serviceHealth.proctoringService === "operational" ? "bg-green-500" : serviceHealth.proctoringService === "degraded" ? "bg-amber-500" : "bg-red-500"} />
                        </CardContent>
                      </Card>
                      <Card className="rounded-2xl shadow-sm border-slate-200">
                        <CardHeader className="font-black text-slate-900 uppercase tracking-tight text-sm">CEFR Distribution</CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <DistributionBar label="Advanced (C1/C2)" percentage={15} color="bg-purple-500" />
                            <DistributionBar label="Upper Int (B2)" percentage={35} color="bg-indigo-500" />
                            <DistributionBar label="Intermediate (B1)" percentage={30} color="bg-blue-500" />
                            <DistributionBar label="Elementary (A1/A2)" percentage={20} color="bg-slate-400" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "analytics" && (<motion.div key="analytics" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><AdvancedAnalytics orgId={ORG_ID} /></motion.div>)}
            {activeTab === "candidates" && (<motion.div key="candidates" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><CandidateManagement orgId={ORG_ID} onGenerateCodes={() => navigateTo("codes")} /></motion.div>)}
            {activeTab === "codes" && (<motion.div key="codes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ExamCodeManager orgId={ORG_ID} /></motion.div>)}
            {activeTab === "import" && (<motion.div key="import" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><BulkCandidateImport orgId={ORG_ID} /></motion.div>)}
            {activeTab === "content-qa" && (<motion.div key="content-qa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ContentReviewDashboard /></motion.div>)}
            {activeTab === "item-generator" && (<motion.div key="item-generator" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ItemGeneratorPanel /></motion.div>)}
            {activeTab === "item-inventory" && (<motion.div key="item-inventory" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ItemBankInventory /></motion.div>)}
            {activeTab === "distractor-audit" && (<motion.div key="distractor-audit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><DistractorAudit /></motion.div>)}
            {activeTab === "aig-quality" && (<motion.div key="aig-quality" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><AigQualityPanel /></motion.div>)}
            {activeTab === "fraud" && (<motion.div key="fraud" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><FraudDashboard /></motion.div>)}
            {activeTab === "bias-review" && (<motion.div key="bias-review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><BiasReviewPanel /></motion.div>)}
            {activeTab === "dif" && (<motion.div key="dif" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><DifDashboard /></motion.div>)}
            {activeTab === "item-bank" && (<motion.div key="item-bank" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ItemBankPanel /></motion.div>)}
            {activeTab === "standard-setting" && (<motion.div key="standard-setting" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><StandardSettingPanel /></motion.div>)}
            {activeTab === "equating" && (<motion.div key="equating" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><EquatingPanel /></motion.div>)}
            {activeTab === "psychometric-quality" && (<motion.div key="psychometric-quality" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><PsychometricQualityPanel /></motion.div>)}
            {activeTab === "item-retirement" && (<motion.div key="item-retirement" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ItemRetirementPanel /></motion.div>)}
            {activeTab === "mirt" && (<motion.div key="mirt" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><MirtDiagnosticsPanel /></motion.div>)}
            {activeTab === "grm" && (<motion.div key="grm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><GrmScoringPanel /></motion.div>)}
            {activeTab === "exposure" && (<motion.div key="exposure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ItemExposurePanel /></motion.div>)}
            {activeTab === "exposure-ctrl" && (<motion.div key="exposure-ctrl" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ItemExposureControlPanel /></motion.div>)}
            {activeTab === "rater-reliability" && (<motion.div key="rater-reliability" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><RaterReliabilityPanel /></motion.div>)}
            {activeTab === "classification" && (<motion.div key="classification" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ClassificationAccuracyPanel /></motion.div>)}
            {activeTab === "blueprint" && (<motion.div key="blueprint" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ContentBlueprintPanel /></motion.div>)}
            {activeTab === "theta-diag" && (<motion.div key="theta-diag" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ThetaDiagnosticsPanel /></motion.div>)}
            {activeTab === "tif" && (<motion.div key="tif" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><TestInformationPanel /></motion.div>)}
            {activeTab === "person-fit" && (<motion.div key="person-fit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><PersonFitPanel /></motion.div>)}
            {activeTab === "shadow-test" && (<motion.div key="shadow-test" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ShadowTestPanel /></motion.div>)}
            {activeTab === "item-drift" && (<motion.div key="item-drift" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ItemDriftPanel /></motion.div>)}
            {activeTab === "cognitive-diag" && (<motion.div key="cognitive-diag" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><CognitiveDiagnosticPanel /></motion.div>)}
            {activeTab === "bayes-calib" && (<motion.div key="bayes-calib" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><BayesianCalibrationPanel /></motion.div>)}
            {activeTab === "mst-routing" && (<motion.div key="mst-routing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><MSTRoutingPanel /></motion.div>)}
            {activeTab === "rt-diag" && (<motion.div key="rt-diag" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ResponseTimeDiagnosticsPanel /></motion.div>)}
            {activeTab === "local-dep" && (<motion.div key="local-dep" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><LocalItemDependencePanel /></motion.div>)}
            {activeTab === "anchor-items" && (<motion.div key="anchor-items" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><AnchorItemMonitorPanel /></motion.div>)}
            {activeTab === "subscale" && (<motion.div key="subscale" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><SubscaleCompositeScoringPanel /></motion.div>)}
            {activeTab === "csem" && (<motion.div key="csem" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ConditionalSEMPanel /></motion.div>)}
            {activeTab === "tcc" && (<motion.div key="tcc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><TestCharacteristicCurvePanel /></motion.div>)}
            {activeTab === "dbf" && (<motion.div key="dbf" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><DifferentialBundleFunctioningPanel /></motion.div>)}
            {activeTab === "poly-dif" && (<motion.div key="poly-dif" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><PolytomousDIFPanel /></motion.div>)}
            {activeTab === "reliability" && (<motion.div key="reliability" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ScoreReliabilitySubgroupPanel /></motion.div>)}
            {activeTab === "stopping-rule" && (<motion.div key="stopping-rule" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><AdaptiveStoppingRulePanel /></motion.div>)}
            {activeTab === "item-fit" && (<motion.div key="item-fit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ItemFitPanel /></motion.div>)}
            {activeTab === "cat-sim" && (<motion.div key="cat-sim" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><CATItemSelectionPanel /></motion.div>)}
            {activeTab === "score-norms" && (<motion.div key="score-norms" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ScoreNormingPanel /></motion.div>)}
            {activeTab === "online-calib" && (<motion.div key="online-calib" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><OnlineCalibrationMonitorPanel /></motion.div>)}
            {activeTab === "dsf" && (<motion.div key="dsf" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><DifferentialStepFunctioningPanel /></motion.div>)}
            {activeTab === "bn-dep" && (<motion.div key="bn-dep" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><BayesianNetworkDependencePanel /></motion.div>)}
            {activeTab === "score-report" && (<motion.div key="score-report" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ScoreReportingAnalyticsPanel /></motion.div>)}
            {activeTab === "mg-inv" && (<motion.div key="mg-inv" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><MultigroupInvariancePanel /></motion.div>)}
            {activeTab === "irt-rt" && (<motion.div key="irt-rt" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><IRTResponseTimePanel /></motion.div>)}
            {activeTab === "scale-eq" && (<motion.div key="scale-eq" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ScaleEquatingDiagnosticsPanel /></motion.div>)}
            {activeTab === "growth" && (<motion.div key="growth" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><PersonFitGrowthPanel /></motion.div>)}
            {activeTab === "rater-calib" && (<motion.div key="rater-calib" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><RaterCalibrationPanel /></motion.div>)}
            {activeTab === "long-dif" && (<motion.div key="long-dif" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><LongitudinalDIFPanel /></motion.div>)}
            {activeTab === "validity" && (<motion.div key="validity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ScoreValidityEvidencePanel /></motion.div>)}
            {activeTab === "integrations" && (<motion.div key="integrations" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><IntegrationsSettings orgId={ORG_ID} /></motion.div>)}
            {activeTab === "audit" && (<motion.div key="audit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><AuditLogView orgId={ORG_ID} /></motion.div>)}
            {activeTab === "proctoring" && (<motion.div key="proctoring" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ProctoringReview orgId={ORG_ID} /></motion.div>)}
            {activeTab === "billing" && (<motion.div key="billing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><BillingDashboard orgId={ORG_ID} /></motion.div>)}
            {activeTab === "calibration" && (<motion.div key="calibration" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><CalibrationStudy /></motion.div>)}
            {activeTab === "settings" && (<motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><GlobalSettings orgId={ORG_ID} /></motion.div>)}
            {activeTab === "branding" && (<motion.div key="branding" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><BrandingSettings orgId={ORG_ID} /></motion.div>)}
          </AnimatePresence>
        </main>
      </div>

      {/* ── ⌘K Command Palette ──────────────────────────────────────────── */}
      <AnimatePresence>
        {cmdOpen && (
          <motion.div
            key="cmd-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setCmdOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                <Search size={16} className="text-slate-400 flex-shrink-0" />
                <input
                  autoFocus
                  value={cmdQuery}
                  onChange={(e) => setCmdQuery(e.target.value)}
                  placeholder="Navigate to any panel..."
                  className="flex-1 text-sm text-slate-700 placeholder-slate-400 bg-transparent outline-none"
                />
                <button onClick={() => setCmdOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>
              {/* Results */}
              <div className="py-1.5 max-h-72 overflow-y-auto">
                {cmdResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-indigo-50 transition-colors"
                  >
                    <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{item.label}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{item.section}</div>
                    </div>
                    <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest border border-slate-200 rounded px-1.5 py-0.5">↵</div>
                  </button>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 text-[10px] text-slate-400">
                <span><kbd className="font-bold">↑↓</kbd> navigate</span>
                <span><kbd className="font-bold">↵</kbd> open</span>
                <span><kbd className="font-bold">esc</kbd> close</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Helper components ───────────────────────────────────────────────────────

function SecondaryNavSection({
  section,
  activeTab,
  onNavigate,
}: {
  section: { label: string; items: { id: TabId; label: string; icon: React.ReactNode }[]; defaultOpen?: boolean };
  activeTab: string;
  onNavigate: (id: TabId) => void;
}) {
  const [open, setOpen] = useState(section.defaultOpen !== false);
  const hasActive = section.items.some((i) => i.id === activeTab);

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between px-2 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors",
          hasActive ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
        )}
      >
        <span>{section.label}</span>
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 ml-1">
          {section.items.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all text-left",
                  active
                    ? "bg-indigo-50 text-indigo-700 font-bold"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                )}
              >
                <span className={cn("flex-shrink-0", active ? "text-indigo-500" : "text-slate-400")}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
                {active && <span className="ml-auto w-1 h-3 rounded-full bg-indigo-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuickActions({
  activeSection,
  activeTab,
  onNavigate,
}: {
  activeSection: string;
  activeTab: string;
  onNavigate: (id: TabId) => void;
}) {
  if (activeSection === "item-bank" && activeTab === "content-qa") {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => onNavigate("item-generator")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors"
        >
          <Wand2 size={12} /> Generate Items
        </button>
      </div>
    );
  }
  return null;
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
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
          <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {trend.includes("+") ? trend.split(" ")[0] : ""}
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900 mb-1">{value}</div>
        <div className="text-xs text-slate-500 font-medium">{label}</div>
        <div className="mt-3 text-[10px] text-slate-400 font-medium">{trend}</div>
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
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-black", colors[currentLevel] || "bg-slate-100")}>
      {currentLevel}
    </span>
  );
}

function HealthItem({ label, status, color }: { label: string; status: string; color: string }) {
  const displayStatus = status === "loading" ? "Checking…"
    : status === "operational" ? "Operational"
    : status === "degraded" ? "Degraded"
    : status === "down" ? "Down"
    : status;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{displayStatus}</span>
        <div className={cn("w-2 h-2 rounded-full animate-pulse", color)} />
      </div>
    </div>
  );
}

function DistributionBar({ label, percentage, color }: { label: string; percentage: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
