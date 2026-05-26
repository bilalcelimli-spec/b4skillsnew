/**
 * Score Report v2 — Redesigned assessment results display
 * ─────────────────────────────────────────────────────────────────────────────
 * Features:
 *   • Animated CEFR band reveal with count-up theta
 *   • Per-skill radar chart + individual band cards
 *   • External test equivalents (IELTS / TOEFL / TOEIC)
 *   • Confidence interval visualisation
 *   • Print-ready layout
 *   • Dark mode native
 *   • WCAG 2.2 AAA compliant
 *   • Micro-celebration on mount
 */
import React, { useEffect, useState } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip as RechartTooltip } from "recharts";
import { motion as m, useCountUp, AnimatePresence } from "../design-system/motion.js";
import { Card, Badge, Progress, Separator } from "../design-system/components.js";
import { useCelebration, CelebrationBanner } from "../design-system/MicroCelebration.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SkillResult {
  skill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "GRAMMAR" | "VOCABULARY";
  cefrBand: string;
  theta: number;       // -4 to +4
  sem: number;
  percentile: number;  // 0–100
  itemsAnswered: number;
}

export interface ScoreReportData {
  sessionId:    string;
  candidateName:string;
  organisation?: string;
  completedAt:  string;
  overallBand:  string;
  overallTheta: number;
  overallSEM:   number;
  overallPercentile: number;
  skills:       SkillResult[];
  ielts?:       number;
  toeflIBT?:    number;
  toeic?:       number;
  cambridgeMark?: number;
  moduleName?:  string;
  duration:     number;  // seconds
  strengths:    string[];
  improvements: string[];
  certificateId?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CEFR_ORDER = ["A1","A2","B1","B2","C1","C2"];

const CEFR_COLOR: Record<string, string> = {
  A1: "#64748b", A2: "#94a3b8", B1: "#3b82f6", B2: "#1a56db", C1: "#7c3aed", C2: "#059669",
};

const SKILL_LABELS: Record<string, string> = {
  READING: "Reading", LISTENING: "Listening", WRITING: "Writing",
  SPEAKING: "Speaking", GRAMMAR: "Grammar", VOCABULARY: "Vocabulary",
};

const SKILL_ICONS: Record<string, string> = {
  READING: "📖", LISTENING: "🎧", WRITING: "✍️",
  SPEAKING: "🗣️", GRAMMAR: "🔤", VOCABULARY: "💡",
};

// ── CEFR band pill ────────────────────────────────────────────────────────────

function CefrPill({ band, size = "md" }: { band: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const color = CEFR_COLOR[band] ?? "#64748b";
  const sizes = { sm: "0.6875rem / 20px / 8px 10px", md: "0.8125rem / 26px / 8px 14px", lg: "1rem / 32px / 10px 18px", xl: "1.5rem / 52px / 14px 24px" };
  const [fs, h, pad] = sizes[size].split(" / ");
  return (
    <span
      aria-label={`CEFR level ${band}`}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: fs, height: h, padding: pad, borderRadius: "var(--radius-full)",
        background: color + "22", color, fontWeight: 700, letterSpacing: "0.04em",
        border: `2px solid ${color}`,
      }}
    >
      {band}
    </span>
  );
}

// ── Overall score hero ────────────────────────────────────────────────────────

function ScoreHero({ data }: { data: ScoreReportData }) {
  const thetaDisplay = useCountUp(Math.round((data.overallTheta + 4) * 100 / 8), 1200);
  const ciLo = data.overallTheta - 1.96 * data.overallSEM;
  const ciHi = data.overallTheta + 1.96 * data.overallSEM;
  const bandColor = CEFR_COLOR[data.overallBand] ?? "#1a56db";

  return (
    <div style={{
      background: `linear-gradient(135deg, ${bandColor}18 0%, var(--brand-subtle) 100%)`,
      borderRadius: "var(--radius-2xl)", padding: "32px",
      border: `1px solid ${bandColor}33`,
      display: "flex", flexWrap: "wrap", gap: 28, alignItems: "center",
    }}>
      {/* CEFR band */}
      <m.div
        initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        style={{ textAlign: "center" }}
      >
        <CefrPill band={data.overallBand} size="xl" />
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6, fontWeight: 500 }}>Overall Level</p>
      </m.div>

      {/* Percentile score bar */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "baseline" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Scaled Score</span>
          <m.span
            key={thetaDisplay}
            initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ fontSize: "1.5rem", fontWeight: 700, color: bandColor, fontVariantNumeric: "tabular-nums" }}
          >
            {thetaDisplay}
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>/100</span>
          </m.span>
        </div>
        <Progress
          value={(data.overallTheta + 4) / 8 * 100}
          color={["A1","A2"].includes(data.overallBand) ? "warning" : ["B1","B2"].includes(data.overallBand) ? "brand" : "success"}
          size="lg"
          animate
        />
        {/* Confidence interval */}
        <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: 6 }}>
          95% CI: [{ciLo.toFixed(2)}, {ciHi.toFixed(2)}] θ
          · {data.overallPercentile}th percentile
        </p>
      </div>

      {/* Candidate info */}
      <div style={{ minWidth: 160 }}>
        <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", margin: 0 }}>{data.candidateName}</p>
        {data.organisation && <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: "2px 0 0" }}>{data.organisation}</p>}
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
          {new Date(data.completedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
          Duration: {Math.floor(data.duration / 60)}m {data.duration % 60}s
        </p>
      </div>
    </div>
  );
}

// ── Per-skill cards ───────────────────────────────────────────────────────────

function SkillCard({ skill, index }: { skill: SkillResult; index: number }) {
  const color = CEFR_COLOR[skill.cefrBand] ?? "#64748b";
  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: index * 0.07 }}
    >
      <Card padding="md" shadow="sm" style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span aria-hidden="true" style={{ fontSize: 22 }}>{SKILL_ICONS[skill.skill]}</span>
          <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>{SKILL_LABELS[skill.skill]}</span>
          <div style={{ marginInlineStart: "auto" }}>
            <CefrPill band={skill.cefrBand} size="sm" />
          </div>
        </div>
        <Progress
          value={(skill.theta + 4) / 8 * 100}
          color={["C1","C2"].includes(skill.cefrBand) ? "success" : ["B1","B2"].includes(skill.cefrBand) ? "brand" : "warning"}
          size="sm"
          animate
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>θ = {skill.theta.toFixed(2)}</span>
          <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>{skill.itemsAnswered} items</span>
        </div>
      </Card>
    </m.div>
  );
}

// ── Radar chart ───────────────────────────────────────────────────────────────

function SkillRadar({ skills }: { skills: SkillResult[] }) {
  const data = skills.map((s) => ({
    skill: SKILL_LABELS[s.skill],
    score: Math.round((s.theta + 4) / 8 * 100),
    fullMark: 100,
  }));

  return (
    <Card padding="md" shadow="sm">
      <h3 style={{ fontWeight: 600, fontSize: "0.9375rem", margin: "0 0 16px", color: "var(--text-primary)" }}>
        Skill Profile
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="skill" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Score" dataKey="score" stroke="var(--brand)" fill="var(--brand)" fillOpacity={0.18} strokeWidth={2} />
          <RechartTooltip
            contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "var(--text-primary)", fontWeight: 600 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── External equivalents ──────────────────────────────────────────────────────

function ExternalEquivalents({ data }: { data: ScoreReportData }) {
  const tests = [
    { name: "IELTS", value: data.ielts,         fmt: (v: number) => v.toFixed(1) + " / 9.0" },
    { name: "TOEFL iBT", value: data.toeflIBT,  fmt: (v: number) => v + " / 120" },
    { name: "TOEIC L&R", value: data.toeic,     fmt: (v: number) => v + " / 990" },
    { name: "Cambridge", value: data.cambridgeMark, fmt: (v: number) => v + " / 210" },
  ].filter((t) => t.value !== undefined);

  if (tests.length === 0) return null;

  return (
    <Card padding="md" shadow="sm">
      <h3 style={{ fontWeight: 600, fontSize: "0.9375rem", margin: "0 0 14px", color: "var(--text-primary)" }}>
        Equivalent Scores
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        {tests.map((t) => (
          <m.div
            key={t.name}
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            style={{
              padding: "12px 14px", borderRadius: "var(--radius-lg)",
              background: "var(--bg-subtle)", border: "1px solid var(--border)", textAlign: "center",
            }}
          >
            <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", margin: 0 }}>
              {t.name.toUpperCase()}
            </p>
            <p style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--brand)", margin: "4px 0 0", fontVariantNumeric: "tabular-nums" }}>
              {t.fmt(t.value as number)}
            </p>
          </m.div>
        ))}
      </div>
      <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: 10 }}>
        * Equivalents estimated via concordance tables. See docs/concordance for methodology.
      </p>
    </Card>
  );
}

// ── Main ScoreReport component ────────────────────────────────────────────────

export interface ScoreReportProps {
  data: ScoreReportData;
  onDownloadPDF?: () => void;
  onShareCertificate?: () => void;
  className?: string;
}

export function ScoreReport({ data, onDownloadPDF, onShareCertificate, className }: ScoreReportProps) {
  const { active, config, trigger, dismiss } = useCelebration();

  // Trigger celebration on mount
  useEffect(() => {
    const event =
      data.overallBand === "C2" || data.overallBand === "C1" ? "LEVEL_UP"
      : data.overallPercentile >= 99 ? "PERFECT"
      : "COMPLETE";
    const t = setTimeout(() => trigger(event), 500);
    return () => clearTimeout(t);
  }, [data.sessionId]);

  return (
    <div
      className={className}
      style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", fontFamily: "var(--font-sans)" }}
      role="main"
      aria-label="Assessment Score Report"
    >
      <CelebrationBanner event={active} config={config} onDismiss={dismiss} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Score Report
          </h1>
          {data.moduleName && (
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: "2px 0 0" }}>
              {data.moduleName}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {onDownloadPDF && (
            <button
              onClick={onDownloadPDF}
              className="no-print"
              style={{
                padding: "7px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
                background: "var(--bg-subtle)", color: "var(--text-primary)", cursor: "pointer",
                fontSize: "0.8125rem", fontWeight: 500,
              }}
            >
              ⬇️ PDF
            </button>
          )}
          {onShareCertificate && (
            <button
              onClick={onShareCertificate}
              className="no-print"
              style={{
                padding: "7px 14px", borderRadius: "var(--radius-md)", border: "none",
                background: "var(--brand)", color: "white", cursor: "pointer",
                fontSize: "0.8125rem", fontWeight: 600,
              }}
            >
              🎓 Certificate
            </button>
          )}
        </div>
      </div>

      {/* Hero */}
      <ScoreHero data={data} />

      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Radar */}
        <SkillRadar skills={data.skills} />
        {/* External equivalents */}
        <ExternalEquivalents data={data} />
      </div>

      {/* Per-skill grid */}
      <h2 style={{ fontWeight: 700, fontSize: "1rem", margin: "24px 0 12px", color: "var(--text-primary)" }}>
        Skill Breakdown
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {data.skills.map((s, i) => <SkillCard key={s.skill} skill={s} index={i} />)}
      </div>

      <div style={{ margin: "24px 0" }}><Separator /></div>

      {/* Strengths & improvements */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: "0.9375rem", margin: "0 0 12px", color: "var(--success)" }}>
            ✅ Strengths
          </h2>
          <ul style={{ margin: 0, padding: "0 0 0 18px", color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.7 }}>
            {data.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: "0.9375rem", margin: "0 0 12px", color: "var(--warning)" }}>
            📈 Areas to Improve
          </h2>
          <ul style={{ margin: 0, padding: "0 0 0 18px", color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.7 }}>
            {data.improvements.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 28, padding: "14px 18px", borderRadius: "var(--radius-lg)", background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
        <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
          LinguAdapt Adaptive Assessment · IRT 3PL scoring · CEFR-aligned ·{" "}
          {data.certificateId ? `Certificate ID: ${data.certificateId}` : `Session: ${data.sessionId}`} ·{" "}
          Completed {new Date(data.completedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
