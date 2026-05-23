/**
 * UnifiedAdminConsole
 *
 * Single state-of-the-art admin workspace that replaces three separate modules:
 *   - AdminDashboard   (operations: sessions, candidates, billing…)
 *   - AssessmentStudio (content: item generator, item bank, QA…)
 *   - PsychometricManager (engine config: CEFR thresholds, CAT params)
 *
 * Structure
 * ─────────
 *  OPERATIONS   Overview · Candidates · Proctoring · Billing · Analytics
 *  CONTENT      AI Generator · Item Bank · Content Review · Calibration
 *  PSYCHOMETRICS  Engine Config
 *  PLATFORM     Branding · Exam Codes · Import · Integrations · Audit · Settings
 */

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  CreditCard,
  BarChart3,
  Wand2,
  Layers,
  CheckCircle2,
  Calculator,
  Sliders,
  Palette,
  Key,
  Upload,
  Zap,
  ShieldCheck,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  Activity,
  Clock,
  ArrowUpRight,
  Calendar,
  Filter,
  Search,
  Save,
  RefreshCw,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";

// ── Sub-panel imports ─────────────────────────────────────────────────────────
import { BrandingSettings } from "./BrandingSettings";
import { BulkCandidateImport } from "./BulkCandidateImport";
import { IntegrationsSettings } from "./IntegrationsSettings";
import { AuditLogView } from "./AuditLogView";
import { AdvancedAnalytics } from "./AdvancedAnalytics";
import { GlobalSettings } from "./GlobalSettings";
import { CandidateManagement } from "./CandidateManagement";
import { ProctoringReview } from "./ProctoringReview";
import { BillingDashboard } from "./BillingDashboard";
import { SessionReview } from "./SessionReview";
import { CalibrationStudy } from "./CalibrationStudy";
import { ContentReviewDashboard } from "./ContentReviewDashboard";
import { ExamCodeManager } from "./ExamCodeManager";
import { ItemGeneratorPanel } from "./ItemGeneratorPanel";
import { ItemBankPanel } from "./ItemBankPanel";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Section =
  | "overview"
  | "candidates"
  | "proctoring"
  | "billing"
  | "analytics"
  | "ai-generator"
  | "item-bank"
  | "content-review"
  | "calibration"
  | "engine-config"
  | "branding"
  | "exam-codes"
  | "import"
  | "integrations"
  | "audit"
  | "settings";

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

interface NavItem {
  id: Section;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// NAV STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    id: "operations",
    label: "Operations",
    items: [
      { id: "overview",   label: "Overview",    icon: <LayoutDashboard size={15} /> },
      { id: "candidates", label: "Candidates",  icon: <Users size={15} /> },
      { id: "proctoring", label: "Proctoring",  icon: <ShieldAlert size={15} /> },
      { id: "billing",    label: "Billing",     icon: <CreditCard size={15} /> },
      { id: "analytics",  label: "Analytics",   icon: <BarChart3 size={15} /> },
    ],
  },
  {
    id: "content",
    label: "Content Studio",
    items: [
      { id: "ai-generator",   label: "AI Generator",    icon: <Wand2 size={15} /> },
      { id: "item-bank",      label: "Item Bank",       icon: <Layers size={15} /> },
      { id: "content-review", label: "Content Review",  icon: <CheckCircle2 size={15} /> },
      { id: "calibration",    label: "Calibration",     icon: <Calculator size={15} /> },
    ],
  },
  {
    id: "psychometrics",
    label: "Psychometrics",
    items: [
      { id: "engine-config", label: "Engine Config", icon: <Sliders size={15} /> },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      { id: "branding",      label: "Branding",      icon: <Palette size={15} /> },
      { id: "exam-codes",    label: "Exam Codes",    icon: <Key size={15} /> },
      { id: "import",        label: "Bulk Import",   icon: <Upload size={15} /> },
      { id: "integrations",  label: "Integrations",  icon: <Zap size={15} /> },
      { id: "audit",         label: "Audit Log",     icon: <ShieldCheck size={15} /> },
      { id: "settings",      label: "Settings",      icon: <SettingsIcon size={15} /> },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const UnifiedAdminConsole: React.FC<{ orgId?: string }> = ({
  orgId: propOrgId,
}) => {
  const ORG_ID = propOrgId || "b4skills-demo";
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const navigate = (section: Section) => {
    setActiveSection(section);
    setSelectedSessionId(null);
  };

  return (
    <div className="flex h-full w-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-52 bg-slate-900 flex flex-col shrink-0 overflow-y-auto">
        {/* Logo / title */}
        <div className="px-4 pt-5 pb-4 border-b border-slate-800">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Admin Console
          </div>
          <div className="text-xs font-bold text-white mt-0.5">
            Command Center
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_GROUPS.map((group) => {
            const collapsed = collapsedGroups.has(group.id);
            return (
              <div key={group.id} className="mb-1">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <span>{group.label}</span>
                  {collapsed ? (
                    <ChevronRight size={11} />
                  ) : (
                    <ChevronDown size={11} />
                  )}
                </button>

                {/* Group items */}
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0.5 pb-2">
                        {group.items.map((item) => (
                          <NavButton
                            key={item.id}
                            item={item}
                            active={activeSection === item.id}
                            onClick={() => navigate(item.id)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-white">
        {/* Section header bar */}
        <SectionHeader section={activeSection} />

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeSection === "overview" && (
                <OverviewPanel
                  orgId={ORG_ID}
                  selectedSessionId={selectedSessionId}
                  onSelectSession={setSelectedSessionId}
                  onClearSession={() => setSelectedSessionId(null)}
                />
              )}
              {activeSection === "candidates" && (
                <CandidateManagement
                  orgId={ORG_ID}
                  onGenerateCodes={() => navigate("exam-codes")}
                />
              )}
              {activeSection === "proctoring" && (
                <ProctoringReview orgId={ORG_ID} />
              )}
              {activeSection === "billing" && (
                <BillingDashboard orgId={ORG_ID} />
              )}
              {activeSection === "analytics" && (
                <AdvancedAnalytics orgId={ORG_ID} />
              )}
              {activeSection === "ai-generator" && <ItemGeneratorPanel />}
              {activeSection === "item-bank" && <ItemBankPanel />}
              {activeSection === "content-review" && <ContentReviewDashboard />}
              {activeSection === "calibration" && <CalibrationStudy />}
              {activeSection === "engine-config" && <EngineConfigPanel />}
              {activeSection === "branding" && <BrandingSettings orgId={ORG_ID} />}
              {activeSection === "exam-codes" && (
                <ExamCodeManager orgId={ORG_ID} />
              )}
              {activeSection === "import" && (
                <BulkCandidateImport orgId={ORG_ID} />
              )}
              {activeSection === "integrations" && (
                <IntegrationsSettings orgId={ORG_ID} />
              )}
              {activeSection === "audit" && <AuditLogView orgId={ORG_ID} />}
              {activeSection === "settings" && <GlobalSettings orgId={ORG_ID} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR NAV BUTTON
// ─────────────────────────────────────────────────────────────────────────────

const NavButton: React.FC<{
  item: NavItem;
  active: boolean;
  onClick: () => void;
}> = ({ item, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold transition-all text-left",
      active
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/30"
        : "text-slate-400 hover:text-white hover:bg-slate-800",
    )}
  >
    <span className="shrink-0">{item.icon}</span>
    <span className="tracking-tight truncate">{item.label}</span>
    {item.badge && (
      <span className="ml-auto bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0">
        {item.badge}
      </span>
    )}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER BAR
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_META: Record<Section, { label: string; desc: string; group: string }> = {
  overview:       { label: "Overview",       desc: "Sessions, stats & system health", group: "Operations" },
  candidates:     { label: "Candidates",     desc: "Manage candidates and access",    group: "Operations" },
  proctoring:     { label: "Proctoring",     desc: "Review flagged sessions",         group: "Operations" },
  billing:        { label: "Billing",        desc: "Subscription & usage",            group: "Operations" },
  analytics:      { label: "Analytics",      desc: "Advanced reporting",              group: "Operations" },
  "ai-generator": { label: "AI Generator",   desc: "Generate assessment items",       group: "Content Studio" },
  "item-bank":    { label: "Item Bank",      desc: "Exposure control & inventory",    group: "Content Studio" },
  "content-review": { label: "Content Review", desc: "QA workflow & approvals",      group: "Content Studio" },
  calibration:    { label: "Calibration",    desc: "IRT calibration study",           group: "Content Studio" },
  "engine-config": { label: "Engine Config", desc: "CAT parameters & CEFR thresholds", group: "Psychometrics" },
  branding:       { label: "Branding",       desc: "Logo, colors & messaging",        group: "Platform" },
  "exam-codes":   { label: "Exam Codes",     desc: "Generate & manage access codes",  group: "Platform" },
  import:         { label: "Bulk Import",    desc: "CSV candidate import",            group: "Platform" },
  integrations:   { label: "Integrations",   desc: "Webhooks, SSO & APIs",            group: "Platform" },
  audit:          { label: "Audit Log",      desc: "Compliance & activity trail",     group: "Platform" },
  settings:       { label: "Settings",       desc: "Global platform configuration",   group: "Platform" },
};

const SectionHeader: React.FC<{ section: Section }> = ({ section }) => {
  const meta = SECTION_META[section];
  return (
    <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4 flex items-center gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
            {meta.group}
          </span>
          <span className="text-slate-200 text-[9px]">/</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            {meta.label}
          </span>
        </div>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-0.5">
          {meta.label}
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{meta.desc}</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW PANEL  (sessions + stats, extracted from AdminDashboard)
// ─────────────────────────────────────────────────────────────────────────────

const OverviewPanel: React.FC<{
  orgId: string;
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  onClearSession: () => void;
}> = ({ orgId, selectedSessionId, onSelectSession, onClearSession }) => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, avgTheta: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/organizations/${orgId}/sessions?limit=20`, {
          credentials: "include",
        });
        if (res.ok) {
          const raw: any[] = await res.json();
          const list: SessionData[] = raw.map((s) => ({
            id: s.id,
            candidateId: s.candidateId ?? s.candidate?.id ?? "",
            organizationId: orgId,
            status: s.status?.toLowerCase() ?? "unknown",
            currentStage: s.responsesCount ?? s.currentStage ?? 0,
            abilityEstimate: s.theta ?? s.abilityEstimate ?? 0,
            cefrLevel: s.scoreReport?.overallCefr ?? s.cefrLevel,
            startedAt: s.createdAt ?? s.startedAt,
            completedAt: s.completedAt,
            candidateName: s.candidate?.name ?? s.candidateName,
            candidateEmail: s.candidate?.email ?? s.candidateEmail,
          }));
          setSessions(list);
          const completed = list.filter((s) => s.status === "completed").length;
          const inProg = list.filter((s) => s.status === "in_progress").length;
          const avgTheta =
            list.length > 0
              ? list.reduce((a, s) => a + (s.abilityEstimate ?? 0), 0) / list.length
              : 0;
          setStats({ total: list.length, completed, inProgress: inProg, avgTheta });
          return;
        }
      } catch {
        // fall through to empty state
      }
      // Show empty state if API is unavailable
      setSessions([]);
      setStats({ total: 0, completed: 0, inProgress: 0, avgTheta: 0 });
      setLoading(false);
    };
    load().finally(() => setLoading(false));
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="animate-spin text-indigo-500" size={28} />
      </div>
    );
  }

  if (selectedSessionId) {
    return <SessionReview sessionId={selectedSessionId} onBack={onClearSession} />;
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Activity className="text-indigo-600" size={18} />} label="Total Sessions" value={stats.total.toString()} sub="All time" />
        <StatCard icon={<CheckCircle2 className="text-emerald-600" size={18} />} label="Completed" value={stats.completed.toString()} sub={`${Math.round((stats.completed / Math.max(stats.total, 1)) * 100)}% rate`} />
        <StatCard icon={<Clock className="text-amber-600" size={18} />} label="In Progress" value={stats.inProgress.toString()} sub="Active now" />
        <StatCard icon={<BarChart3 className="text-purple-600" size={18} />} label="Avg. Ability (θ)" value={stats.avgTheta.toFixed(2)} sub="CEFR B2 avg" />
      </div>

      {/* Sessions table + health sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Table */}
        <Card className="xl:col-span-2 rounded-2xl border-slate-200 overflow-hidden shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between bg-slate-50/60 border-b border-slate-100 py-3 px-5">
            <span className="text-xs font-black uppercase tracking-widest text-slate-700">Recent Sessions</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest rounded-lg">
                <Filter size={11} className="mr-1" /> Filter
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest rounded-lg">
                <Search size={11} className="mr-1" /> Search
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/40 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-5 py-3 border-b border-slate-100">Candidate</th>
                    <th className="px-5 py-3 border-b border-slate-100">Status</th>
                    <th className="px-5 py-3 border-b border-slate-100 text-center">θ / CEFR</th>
                    <th className="px-5 py-3 border-b border-slate-100">Started</th>
                    <th className="px-5 py-3 border-b border-slate-100 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => onSelectSession(s.id)}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-black border border-slate-200 shrink-0">
                            {s.candidateName?.[0] ?? "?"}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{s.candidateName ?? s.candidateId}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{s.candidateEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                          s.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-sm font-mono font-black text-slate-700">{s.abilityEstimate?.toFixed(2)}</span>
                          <CEFRBadge level={s.cefrLevel} theta={s.abilityEstimate} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase tracking-widest">
                          <Calendar size={11} className="text-slate-300" />
                          {formatDate(s.startedAt)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 rounded-lg">
                          <ArrowUpRight size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="rounded-2xl border-indigo-100 bg-indigo-50/30 shadow-sm">
            <CardHeader className="text-xs font-black uppercase tracking-widest text-indigo-900 pb-2">System Health</CardHeader>
            <CardContent className="space-y-3 pt-0">
              <HealthItem label="AI Scoring Engine" ok />
              <HealthItem label="Adaptive Logic" ok />
              <HealthItem label="Storage API" ok />
              <HealthItem label="Proctoring Service" ok />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="text-xs font-black uppercase tracking-widest text-slate-700 pb-2">CEFR Distribution</CardHeader>
            <CardContent className="space-y-3 pt-0">
              <DistBar label="C1 / C2" pct={15} color="bg-purple-500" />
              <DistBar label="B2"       pct={35} color="bg-indigo-500" />
              <DistBar label="B1"       pct={30} color="bg-blue-400" />
              <DistBar label="A1 / A2"  pct={20} color="bg-slate-400" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE CONFIG PANEL  (formerly PsychometricManager)
// ─────────────────────────────────────────────────────────────────────────────

const EngineConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/config/system", { credentials: "include" })
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({ cefrThresholds: { A1: -2.5, A2: -1.5, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5 }, pretestRatio: 0.1, minItems: 5, maxItems: 25, semThreshold: 0.3 }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/config/system", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      setMsg(res.ok ? { type: "success", text: "Configuration saved." } : { type: "error", text: "Save failed." });
    } catch {
      setMsg({ type: "error", text: "Network error while saving." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="animate-spin text-indigo-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Save button row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 font-medium">
          Adjust adaptive CAT parameters and CEFR cut-score thresholds.
        </p>
        <Button
          onClick={save}
          disabled={saving}
          className="gap-2 bg-indigo-600 h-10 px-5 rounded-xl font-black uppercase tracking-widest text-xs shadow-md shadow-indigo-100"
        >
          {saving ? <RefreshCw className="animate-spin" size={15} /> : <Save size={15} />}
          Save
        </Button>
      </div>

      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("p-3 rounded-xl text-sm font-bold border",
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-rose-50 text-rose-700 border-rose-100")}
        >
          {msg.text}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CEFR Thresholds */}
        <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Sliders size={18} />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-700">CEFR Thresholds</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">Theta cut-scores per level</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {["A1", "A2", "B1", "B2", "C1", "C2"].map((lvl) => (
                <div key={lvl} className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lvl} Min θ</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={config?.cefrThresholds?.[lvl] ?? ""}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) setConfig({ ...config, cefrThresholds: { ...config.cefrThresholds, [lvl]: v } });
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CAT Parameters */}
        <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Activity size={18} />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-700">Engine Parameters</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">CAT stopping & calibration</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <ConfigInput
              label="Pretest Ratio (0–1)"
              hint="Fraction of items used for calibration"
              type="number" step="0.05" min="0" max="1"
              value={config?.pretestRatio ?? 0.1}
              onChange={(v) => setConfig({ ...config, pretestRatio: parseFloat(v) })}
            />
            <div className="grid grid-cols-2 gap-4">
              <ConfigInput label="Min Items" type="number"
                value={config?.minItems ?? 5}
                onChange={(v) => setConfig({ ...config, minItems: parseInt(v) })} />
              <ConfigInput label="Max Items" type="number"
                value={config?.maxItems ?? 25}
                onChange={(v) => setConfig({ ...config, maxItems: parseInt(v) })} />
            </div>
            <ConfigInput
              label="SEM Stop Threshold"
              hint="Test stops when measurement precision reaches this value"
              type="number" step="0.01"
              value={config?.semThreshold ?? 0.3}
              onChange={(v) => setConfig({ ...config, semThreshold: parseFloat(v) })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm hover:border-indigo-200 transition-all">
      <CardContent className="p-5">
        <div className="p-2 bg-slate-50 rounded-lg w-fit mb-3">{icon}</div>
        <div className="text-2xl font-black text-slate-900 tracking-tighter">{value}</div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">{label}</div>
        <div className="text-[10px] text-slate-400 font-medium mt-1">{sub}</div>
      </CardContent>
    </Card>
  );
}

function HealthItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-indigo-800">{label}</span>
      <span className={cn("w-2 h-2 rounded-full", ok ? "bg-emerald-500" : "bg-rose-500")} />
    </div>
  );
}

function DistBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

function CEFRBadge({ theta, level }: { theta?: number; level?: string }) {
  const resolve = () => {
    if (level) return level;
    if (theta === undefined) return "?";
    if (theta < -2.5) return "PRE_A1";
    if (theta < -1.5) return "A1";
    if (theta < -0.5) return "A2";
    if (theta < 0.5)  return "B1";
    if (theta < 1.5)  return "B2";
    if (theta < 2.5)  return "C1";
    return "C2";
  };
  const lv = resolve();
  const colors: Record<string, string> = {
    PRE_A1: "bg-slate-100 text-slate-400",
    A1: "bg-slate-100 text-slate-600",
    A2: "bg-blue-100 text-blue-600",
    B1: "bg-emerald-100 text-emerald-700",
    B2: "bg-amber-100 text-amber-700",
    C1: "bg-purple-100 text-purple-700",
    C2: "bg-indigo-100 text-indigo-700",
    "?": "bg-slate-100 text-slate-400",
  };
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-black", colors[lv] ?? "bg-slate-100 text-slate-400")}>
      {lv}
    </span>
  );
}

function ConfigInput({
  label, hint, value, onChange, type = "text", step, min, max,
}: {
  label: string;
  hint?: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <input
        type={type}
        step={step}
        min={min}
        max={max}
        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="text-[10px] text-slate-400 font-medium">{hint}</p>}
    </div>
  );
}

function formatDate(v: any): string {
  if (!v) return "—";
  try {
    const d = v?.toDate ? v.toDate() : new Date(v);
    return d.toLocaleDateString();
  } catch {
    return "—";
  }
}
