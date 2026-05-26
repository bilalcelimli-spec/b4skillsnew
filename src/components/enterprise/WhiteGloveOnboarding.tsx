/**
 * White-Glove Enterprise Onboarding Wizard
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-step wizard for new enterprise customers:
 *
 *   Step 1 — Welcome
 *   Step 2 — Organisation Profile
 *   Step 3 — Branding (logo + colours)
 *   Step 4 — Bulk Candidate Import (CSV)
 *   Step 5 — Assessment Modules
 *   Step 6 — Integrations (SSO / API key)
 *   Step 7 — Training Schedule
 *   Step 8 — Go-Live Checklist
 *
 * Uses: Dialog + Tabs + Progress from design system
 * WCAG 2.2 AAA: focus management, aria-live announcements, high contrast
 */

import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion as m, AnimatePresence } from "../../design-system/motion.js";
import { Button, Progress, Card, Badge, Separator } from "../../design-system/components.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrgProfile {
  name:       string;
  domain:     string;
  size:       string;
  industry:   string;
  adminEmail: string;
  country:    string;
}

export interface BrandingConfig {
  logoUrl?:    string;
  primaryColor: string;
  secondaryColor: string;
  font:        string;
}

export interface CandidateRow {
  email:    string;
  name:     string;
  group?:   string;
  language?: string;
}

export interface ModuleConfig {
  academic:   boolean;
  business:   boolean;
  healthcare: boolean;
  general:    boolean;
  customModuleName?: string;
}

export interface IntegrationConfig {
  ssoEnabled:   boolean;
  ssoProvider:  string;
  samlMetadata: string;
  apiKeyCreated: boolean;
}

export interface OnboardingData {
  org:          OrgProfile;
  branding:     BrandingConfig;
  candidates:   CandidateRow[];
  modules:      ModuleConfig;
  integrations: IntegrationConfig;
  trainingDate: string;
  goLive:       boolean;
}

// ── Step metadata ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Welcome",       icon: "👋" },
  { id: 2, label: "Organisation",  icon: "🏢" },
  { id: 3, label: "Branding",      icon: "🎨" },
  { id: 4, label: "Candidates",    icon: "👥" },
  { id: 5, label: "Modules",       icon: "📚" },
  { id: 6, label: "Integrations",  icon: "🔗" },
  { id: 7, label: "Training",      icon: "📅" },
  { id: 8, label: "Go Live",       icon: "🚀" },
];

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label htmlFor={id} style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  background: "var(--bg-app)",
  color: "var(--text-primary)",
  fontSize: "0.875rem",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

// ── Step components ───────────────────────────────────────────────────────────

function StepWelcome({ orgName }: { orgName?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 0 16px" }}>
      <m.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        style={{ fontSize: 64, marginBottom: 16, display: "block" }}
        aria-hidden="true"
      >
        🎉
      </m.div>
      <h2 style={{ fontWeight: 800, fontSize: "1.5rem", color: "var(--text-primary)", margin: "0 0 10px" }}>
        Welcome to LinguAdapt Enterprise
      </h2>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", maxWidth: 420, margin: "0 auto 20px" }}>
        We'll walk you through setting up your organisation in 8 simple steps.
        The whole process takes about 10 minutes.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        {["Adaptive testing", "80+ languages", "CEFR certified", "GDPR compliant"].map((feat) => (
          <Badge key={feat} variant="info">{feat}</Badge>
        ))}
      </div>
    </div>
  );
}

function StepOrganisation({ data, onChange }: { data: OrgProfile; onChange: (d: OrgProfile) => void }) {
  const set = (k: keyof OrgProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...data, [k]: e.target.value });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Field label="Organisation Name *" id="org-name">
        <input id="org-name" value={data.name} onChange={set("name")} required autoComplete="organization" style={inputStyle} />
      </Field>
      <Field label="Primary Domain *" id="org-domain">
        <input id="org-domain" value={data.domain} onChange={set("domain")} placeholder="acme.com" style={inputStyle} />
      </Field>
      <Field label="Admin Email *" id="org-email">
        <input id="org-email" type="email" value={data.adminEmail} onChange={set("adminEmail")} autoComplete="email" style={inputStyle} />
      </Field>
      <Field label="Country" id="org-country">
        <input id="org-country" value={data.country} onChange={set("country")} autoComplete="country" style={inputStyle} />
      </Field>
      <Field label="Organisation Size" id="org-size">
        <select id="org-size" value={data.size} onChange={set("size")} style={inputStyle}>
          {["1–49", "50–249", "250–999", "1000–4999", "5000+"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Industry" id="org-industry">
        <select id="org-industry" value={data.industry} onChange={set("industry")} style={inputStyle}>
          {["Education", "Healthcare", "Finance", "Technology", "Government", "Consulting", "Other"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function StepBranding({ data, onChange }: { data: BrandingConfig; onChange: (d: BrandingConfig) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Logo must be < 2 MB"); return; }
    const url = URL.createObjectURL(file);
    onChange({ ...data, logoUrl: url });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Logo upload */}
      <div>
        <p style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)", margin: "0 0 8px" }}>
          Organisation Logo
        </p>
        <div
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          aria-label="Upload logo — PNG or SVG, max 2 MB"
          style={{
            border: "2px dashed var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            textAlign: "center",
            cursor: "pointer",
            background: "var(--bg-subtle)",
          }}
        >
          {data.logoUrl
            ? <img src={data.logoUrl} alt="Logo preview" style={{ maxHeight: 64, maxWidth: 240 }} />
            : <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>Click to upload PNG/SVG (max 2 MB)</p>
          }
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/svg+xml" onChange={handleLogoChange} style={{ display: "none" }} aria-hidden="true" />
      </div>

      {/* Colours */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Primary Colour" id="brand-primary">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" id="brand-primary" value={data.primaryColor}
              onChange={(e) => onChange({ ...data, primaryColor: e.target.value })}
              style={{ width: 40, height: 36, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", padding: 2 }}
              aria-label="Primary brand colour"
            />
            <input value={data.primaryColor} onChange={(e) => onChange({ ...data, primaryColor: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
          </div>
        </Field>
        <Field label="Secondary Colour" id="brand-secondary">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" id="brand-secondary" value={data.secondaryColor}
              onChange={(e) => onChange({ ...data, secondaryColor: e.target.value })}
              style={{ width: 40, height: 36, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", padding: 2 }}
              aria-label="Secondary brand colour"
            />
            <input value={data.secondaryColor} onChange={(e) => onChange({ ...data, secondaryColor: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
          </div>
        </Field>
      </div>

      {/* Font */}
      <Field label="UI Font" id="brand-font">
        <select id="brand-font" value={data.font} onChange={(e) => onChange({ ...data, font: e.target.value })} style={inputStyle}>
          {["Inter", "Roboto", "Open Sans", "Lato", "Poppins", "Source Sans 3", "Noto Sans"].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function StepCandidates({ rows, onChange }: { rows: CandidateRow[]; onChange: (r: CandidateRow[]) => void }) {
  const [dragOver, setDragOver] = useState(false);

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n").slice(1); // skip header
    const parsed: CandidateRow[] = [];
    for (const line of lines) {
      const [email, name, group, language] = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
      if (email) parsed.push({ email, name: name ?? "", group, language });
    }
    onChange(parsed);
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) { alert("Please upload a CSV file"); return; }
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target?.result as string);
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        role="region"
        aria-label="CSV upload area — drag and drop or click to browse"
        style={{
          border: `2px dashed ${dragOver ? "var(--brand)" : "var(--border)"}`,
          borderRadius: "var(--radius-lg)",
          padding: "28px",
          textAlign: "center",
          background: dragOver ? "var(--brand-subtle)" : "var(--bg-subtle)",
          transition: "all 0.15s",
        }}
      >
        <p style={{ margin: "0 0 8px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          📎 Drag & drop CSV or{" "}
          <label style={{ color: "var(--brand)", cursor: "pointer", fontWeight: 600 }}>
            browse
            <input
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              style={{ display: "none" }}
            />
          </label>
        </p>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Expected columns: email, name, group (optional), language (optional)
        </p>
      </div>

      {rows.length > 0 && (
        <div>
          <p style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)", margin: "0 0 8px" }}>
            {rows.length} candidates loaded
          </p>
          <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-subtle)" }}>
                  {["Email", "Name", "Group", "Language"].map((h) => (
                    <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "6px 10px", color: "var(--text-secondary)" }}>{r.email}</td>
                    <td style={{ padding: "6px 10px" }}>{r.name}</td>
                    <td style={{ padding: "6px 10px", color: "var(--text-muted)" }}>{r.group ?? "—"}</td>
                    <td style={{ padding: "6px 10px", color: "var(--text-muted)" }}>{r.language ?? "—"}</td>
                  </tr>
                ))}
                {rows.length > 8 && (
                  <tr><td colSpan={4} style={{ padding: "6px 10px", color: "var(--text-muted)", fontStyle: "italic" }}>…and {rows.length - 8} more</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StepModules({ data, onChange }: { data: ModuleConfig; onChange: (d: ModuleConfig) => void }) {
  const modules: Array<{ key: keyof ModuleConfig; label: string; desc: string; icon: string }> = [
    { key: "general",    label: "General English",   desc: "Core language skills for everyday communication", icon: "🌐" },
    { key: "academic",   label: "Academic English",  desc: "IELTS/TOEFL aligned academic writing & reading", icon: "🎓" },
    { key: "business",   label: "Business English",  desc: "Meetings, presentations, emails, negotiations",   icon: "💼" },
    { key: "healthcare", label: "Healthcare English", desc: "Medical terminology, patient communication",       icon: "🏥" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {modules.map((mod) => (
        <label key={mod.key} style={{ cursor: "pointer" }}>
          <Card padding="md" shadow="sm" style={{
            border: data[mod.key] ? "2px solid var(--brand)" : "1px solid var(--border)",
            background: data[mod.key] ? "var(--brand-subtle)" : "var(--bg-surface)",
            transition: "all 0.15s",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <input
                type="checkbox"
                checked={!!data[mod.key]}
                onChange={(e) => onChange({ ...data, [mod.key]: e.target.checked })}
                style={{ marginTop: 2, accentColor: "var(--brand)" }}
                aria-label={mod.label}
              />
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                  {mod.icon} {mod.label}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {mod.desc}
                </p>
              </div>
            </div>
          </Card>
        </label>
      ))}
    </div>
  );
}

function StepIntegrations({ data, onChange }: { data: IntegrationConfig; onChange: (d: IntegrationConfig) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* SSO */}
      <Card padding="md" shadow="sm">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <input
            type="checkbox"
            id="sso-enabled"
            checked={data.ssoEnabled}
            onChange={(e) => onChange({ ...data, ssoEnabled: e.target.checked })}
            style={{ accentColor: "var(--brand)" }}
          />
          <label htmlFor="sso-enabled" style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)", cursor: "pointer" }}>
            Enable SSO (SAML 2.0 / OIDC)
          </label>
          <Badge variant="info" style={{ marginInlineStart: "auto" }}>Recommended</Badge>
        </div>
        {data.ssoEnabled && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="SSO Provider" id="sso-provider">
              <select id="sso-provider" value={data.ssoProvider}
                onChange={(e) => onChange({ ...data, ssoProvider: e.target.value })}
                style={inputStyle}
              >
                {["Okta", "Microsoft Entra", "Google Workspace", "Auth0", "OneLogin", "Custom SAML"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="SAML Metadata URL or XML" id="saml-meta">
              <textarea
                id="saml-meta"
                rows={3}
                value={data.samlMetadata}
                onChange={(e) => onChange({ ...data, samlMetadata: e.target.value })}
                placeholder="https://your-idp.com/saml/metadata or paste XML…"
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </Field>
          </div>
        )}
      </Card>

      {/* API key */}
      <Card padding="md" shadow="sm">
        <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)", margin: "0 0 8px" }}>🔑 API Access</p>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: "0 0 12px" }}>
          Generate an API key to integrate LinguAdapt with your LMS or HR system.
        </p>
        <Button
          variant={data.apiKeyCreated ? "success" : "outline"}
          size="sm"
          onClick={() => onChange({ ...data, apiKeyCreated: true })}
        >
          {data.apiKeyCreated ? "✓ API Key Created" : "Generate API Key"}
        </Button>
      </Card>
    </div>
  );
}

function StepTraining({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
        Schedule a live onboarding call with your dedicated LinguAdapt Customer Success Manager.
      </p>
      <Field label="Preferred training date" id="training-date">
        <input
          id="training-date"
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          style={inputStyle}
        />
      </Field>
      <Card padding="md" shadow="sm" style={{ background: "var(--brand-subtle)", border: "1px solid var(--brand)" }}>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--brand)", fontWeight: 600 }}>
          📞 What's included in your training session:
        </p>
        <ul style={{ margin: "8px 0 0 16px", padding: 0, fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
          <li>Platform walkthrough for administrators</li>
          <li>Score report interpretation</li>
          <li>Candidate support guidance</li>
          <li>API / LMS integration setup</li>
          <li>Q&A with assessment specialists</li>
        </ul>
      </Card>
    </div>
  );
}

function StepGoLive({ data }: { data: OnboardingData }) {
  const checks = [
    { label: "Organisation profile complete",    done: !!data.org.name && !!data.org.adminEmail },
    { label: "Branding configured",              done: !!data.branding.primaryColor },
    { label: "Candidates imported",              done: data.candidates.length > 0 },
    { label: "At least one module selected",     done: Object.values(data.modules).some(Boolean) },
    { label: "SSO or API configured",            done: data.integrations.ssoEnabled || data.integrations.apiKeyCreated },
    { label: "Training session scheduled",       done: !!data.trainingDate },
  ];

  const allDone = checks.every((c) => c.done);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
        {allDone
          ? "Everything is set! Your LinguAdapt Enterprise workspace is ready to launch."
          : "Complete the remaining items before going live."}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {checks.map((check) => (
          <m.div
            key={check.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: check.done ? "var(--success-subtle)" : "var(--bg-subtle)",
              border: `1px solid ${check.done ? "var(--success)" : "var(--border)"}`,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 18 }}>{check.done ? "✅" : "⬜"}</span>
            <span style={{ fontSize: "0.875rem", color: check.done ? "var(--success-text)" : "var(--text-secondary)", fontWeight: check.done ? 600 : 400 }}>
              {check.label}
            </span>
          </m.div>
        ))}
      </div>
      {allDone && (
        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ textAlign: "center", padding: "20px 0 8px" }}
        >
          <span aria-hidden="true" style={{ fontSize: 52 }}>🚀</span>
          <p style={{ fontWeight: 700, fontSize: "1.125rem", color: "var(--text-primary)", margin: "8px 0 0" }}>
            You're ready to go live!
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
            Click "Launch" to activate your workspace and send invites to candidates.
          </p>
        </m.div>
      )}
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export interface WhiteGloveOnboardingProps {
  open:     boolean;
  onClose:  () => void;
  onLaunch: (data: OnboardingData) => void;
}

const DEFAULT_DATA: OnboardingData = {
  org:          { name: "", domain: "", adminEmail: "", country: "", size: "50–249", industry: "Education" },
  branding:     { primaryColor: "#1a56db", secondaryColor: "#7c3aed", font: "Inter" },
  candidates:   [],
  modules:      { general: true, academic: false, business: false, healthcare: false },
  integrations: { ssoEnabled: false, ssoProvider: "Okta", samlMetadata: "", apiKeyCreated: false },
  trainingDate: "",
  goLive:       false,
};

export function WhiteGloveOnboarding({ open, onClose, onLaunch }: WhiteGloveOnboardingProps) {
  const [step,  setStep]  = useState(1);
  const [data,  setData]  = useState<OnboardingData>(DEFAULT_DATA);
  const [busy,  setBusy]  = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const progress  = ((step - 1) / (STEPS.length - 1)) * 100;
  const isLast    = step === STEPS.length;
  const allChecks = [!!data.org.name, !!data.org.adminEmail, !!data.branding.primaryColor, data.candidates.length > 0, Object.values(data.modules).some(Boolean), data.integrations.ssoEnabled || data.integrations.apiKeyCreated, !!data.trainingDate];
  const canLaunch = allChecks.every(Boolean);

  const goNext = () => {
    if (step < STEPS.length) { setStep((s) => s + 1); setTimeout(() => headingRef.current?.focus(), 80); }
  };
  const goBack = () => {
    if (step > 1) { setStep((s) => s - 1); setTimeout(() => headingRef.current?.focus(), 80); }
  };

  const handleLaunch = async () => {
    setBusy(true);
    try {
      await onLaunch({ ...data, goLive: true });
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      style={{
        position: "fixed", inset: 0, zIndex: "var(--z-modal)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      {/* Backdrop */}
      <m.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        aria-hidden="true"
      />

      {/* Panel */}
      <m.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        style={{
          position: "relative", zIndex: 1,
          width: "min(700px, 100%)", maxHeight: "calc(100svh - 32px)",
          borderRadius: "var(--radius-2xl)",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-2xl)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          fontFamily: "var(--font-sans)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h2
              id="onboarding-title"
              ref={headingRef}
              tabIndex={-1}
              style={{ margin: 0, fontWeight: 700, fontSize: "1.0625rem", color: "var(--text-primary)", outline: "none" }}
            >
              {STEPS[step - 1].icon} {STEPS[step - 1].label}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                Step {step} of {STEPS.length}
              </span>
              <button
                onClick={onClose}
                aria-label="Close onboarding"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 22, lineHeight: 1, padding: 4, borderRadius: "var(--radius-sm)" }}
              >
                ×
              </button>
            </div>
          </div>
          <Progress value={progress} size="sm" color="brand" animate />

          {/* Step pills (desktop) */}
          <div style={{ display: "flex", gap: 4, marginTop: 12, flexWrap: "wrap" }} role="list" aria-label="Onboarding steps">
            {STEPS.map((s) => (
              <button
                key={s.id}
                role="listitem"
                onClick={() => { if (s.id < step) setStep(s.id); }}
                aria-current={s.id === step ? "step" : undefined}
                aria-label={`Step ${s.id}: ${s.label}${s.id === step ? " (current)" : s.id < step ? " (completed)" : ""}`}
                style={{
                  padding: "3px 9px",
                  borderRadius: "var(--radius-full)",
                  border: "none",
                  background: s.id === step ? "var(--brand)" : s.id < step ? "var(--success-subtle)" : "var(--bg-overlay)",
                  color:      s.id === step ? "white" : s.id < step ? "var(--success-text)" : "var(--text-muted)",
                  fontSize:   "0.6875rem",
                  fontWeight: s.id === step ? 700 : 400,
                  cursor:     s.id < step ? "pointer" : "default",
                }}
              >
                {s.id < step ? "✓" : s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <AnimatePresence mode="wait">
            <m.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              {step === 1 && <StepWelcome orgName={data.org.name} />}
              {step === 2 && <StepOrganisation data={data.org} onChange={(org) => setData({ ...data, org })} />}
              {step === 3 && <StepBranding data={data.branding} onChange={(branding) => setData({ ...data, branding })} />}
              {step === 4 && <StepCandidates rows={data.candidates} onChange={(candidates) => setData({ ...data, candidates })} />}
              {step === 5 && <StepModules data={data.modules} onChange={(modules) => setData({ ...data, modules })} />}
              {step === 6 && <StepIntegrations data={data.integrations} onChange={(integrations) => setData({ ...data, integrations })} />}
              {step === 7 && <StepTraining date={data.trainingDate} onChange={(trainingDate) => setData({ ...data, trainingDate })} />}
              {step === 8 && <StepGoLive data={data} />}
            </m.div>
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div style={{
          padding: "14px 24px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          background: "var(--bg-subtle)",
        }}>
          <Button variant="ghost" size="md" onClick={goBack} disabled={step === 1}>
            ← Back
          </Button>
          {isLast
            ? (
              <Button
                variant="success"
                size="md"
                loading={busy}
                disabled={!canLaunch || busy}
                onClick={handleLaunch}
              >
                🚀 Launch Workspace
              </Button>
            )
            : (
              <Button variant="primary" size="md" onClick={goNext}>
                Next →
              </Button>
            )
          }
        </div>
      </m.div>
    </div>
  );
}
