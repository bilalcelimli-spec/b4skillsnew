/**
 * Content Factory Batch Panel
 * §131 "Admin may request: Generate 20 draft B1 Reading inference items..."
 * §132 Blueprint-aware generation — always against a precise cell spec
 * §189 First action must NOT be "Generate 10,000 questions"
 * §190 First controlled batch: 50-100 items across selected blueprint cells
 */
import { useState } from "react";
import {
  Wand2, Play, CheckCircle2, AlertTriangle, Loader2,
  BookOpen, Headphones, PenLine, Mic, BookMarked, Hash,
  ChevronDown, ChevronRight, Info, Shield,
} from "lucide-react";
import {
  READING_SUBSKILLS, LISTENING_SUBSKILLS, WRITING_SUBSKILLS,
  SPEAKING_SUBSKILLS, GRAMMAR_SUBSKILLS, VOCABULARY_SUBSKILLS,
  GENRES_BY_SKILL, TOPICS, type BlueprintCell,
} from "../../lib/content-factory/blueprint";

// ── Constants ─────────────────────────────────────────────────────────────────

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SKILLS = ["READING", "LISTENING", "GRAMMAR", "VOCABULARY", "WRITING", "SPEAKING"];

const SKILL_META: Record<string, { icon: React.ReactNode; color: string }> = {
  READING:    { icon: <BookOpen size={14} />,    color: "text-blue-500" },
  LISTENING:  { icon: <Headphones size={14} />,  color: "text-purple-500" },
  WRITING:    { icon: <PenLine size={14} />,      color: "text-emerald-500" },
  SPEAKING:   { icon: <Mic size={14} />,          color: "text-amber-500" },
  GRAMMAR:    { icon: <BookMarked size={14} />,   color: "text-rose-500" },
  VOCABULARY: { icon: <Hash size={14} />,         color: "text-teal-500" },
};

const SUBSKILLS_BY_SKILL: Record<string, readonly string[]> = {
  READING: READING_SUBSKILLS,
  LISTENING: LISTENING_SUBSKILLS,
  WRITING: WRITING_SUBSKILLS,
  SPEAKING: SPEAKING_SUBSKILLS,
  GRAMMAR: GRAMMAR_SUBSKILLS,
  VOCABULARY: VOCABULARY_SUBSKILLS,
};

const ITEM_TYPES_BY_SKILL: Record<string, string[]> = {
  READING:    ["MULTIPLE_CHOICE", "INTEGRATED_TASK"],
  LISTENING:  ["MULTIPLE_CHOICE", "FILL_IN_BLANKS"],
  GRAMMAR:    ["MULTIPLE_CHOICE", "FILL_IN_BLANKS"],
  VOCABULARY: ["MULTIPLE_CHOICE", "FILL_IN_BLANKS", "DRAG_DROP"],
  WRITING:    ["WRITING_PROMPT"],
  SPEAKING:   ["SPEAKING_PROMPT"],
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface BatchResult {
  batchId: string;
  requested: number;
  generated: number;
  storedIds: string[];
  skipped: number;
  skippedReasons: string[];
  duplicatesBlocked: number;
  nearMatchWarnings: number;
  durationMs: number;
  reviewQueueSize: number;
}

// ── Select helper ─────────────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--foreground)] mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-[var(--muted)] mt-0.5">{hint}</p>}
    </div>
  );
}

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-xs px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>{o.replace(/_/g, " ")}</option>
      ))}
    </select>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ContentFactoryBatchPanel() {
  // Cell spec
  const [cefr, setCefr] = useState("B1");
  const [skill, setSkill] = useState("READING");
  const [subskill, setSubskill] = useState("INFERENCE");
  const [genre, setGenre] = useState("");
  const [topic, setTopic] = useState("");
  const [itemType, setItemType] = useState("");
  const [construct, setConstruct] = useState("");
  const [evidenceStatement, setEvidenceStatement] = useState("");
  const [distractorStrategy, setDistratorStrategy] = useState("");
  const [ageSuitability, setAgeSuitability] = useState("ADULT");
  const [culturalLoad, setCulturalLoad] = useState("LOW");
  const [count, setCount] = useState(5);
  const [notes, setNotes] = useState("");

  // Advanced section toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // State
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSkillChange = (s: string) => {
    setSkill(s);
    const subs = SUBSKILLS_BY_SKILL[s] ?? [];
    setSubskill(subs[0] ?? "");
    setGenre("");
    setItemType("");
  };

  const handleGenerate = async () => {
    if (!cefr || !skill || !subskill) {
      setError("CEFR level, skill, and subskill are required.");
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);

    const cell: BlueprintCell = {
      cefr, skill, subskill,
      ...(genre ? { genre } : {}),
      ...(topic ? { topic } : {}),
      ...(itemType ? { itemType } : {}),
      ...(construct ? { construct } : {}),
      ...(evidenceStatement ? { evidenceStatement } : {}),
      ...(distractorStrategy ? { distractorStrategy } : {}),
      ageSuitability: ageSuitability as any,
      culturalLoad,
      englishVariant: "INTERNATIONAL",
    };

    try {
      const resp = await fetch("/api/content/batch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cell, count, notes: notes || undefined }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error ?? "Generation failed");
      } else {
        setResult(data as BatchResult);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const subskillOptions = SUBSKILLS_BY_SKILL[skill] ?? [];
  const genreOptions = GENRES_BY_SKILL[skill] ?? [];
  const itemTypeOptions = ITEM_TYPES_BY_SKILL[skill] ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-[var(--foreground)]">Blueprint-Aware Batch Generator</h3>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          Specify the exact blueprint cell. Items are generated as <code className="bg-[var(--muted)]/10 px-1 rounded">AI_DRAFT</code> and must pass human review before going live — never auto-published.
        </p>
      </div>

      {/* North star reminder */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-[var(--muted)]">
        <Info size={13} className="text-blue-500 mt-0.5 shrink-0" />
        <span>
          <strong className="text-[var(--foreground)]">§189</strong> — First action must NOT be "Generate 10,000 questions."
          Start with a controlled batch of 5–20 items. Review, validate, then scale.
          Max 20 items per API call.
        </span>
      </div>

      {/* Required cell spec */}
      <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--card)] space-y-4">
        <h4 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wide">Blueprint Cell — Required</h4>

        <div className="grid grid-cols-2 gap-4">
          <Field label="CEFR Target">
            <Select value={cefr} onChange={setCefr} options={CEFR_LEVELS} />
          </Field>

          <Field label="Skill">
            <div className="flex gap-2">
              {SKILLS.map((s) => {
                const m = SKILL_META[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleSkillChange(s)}
                    title={s}
                    className={`flex-1 flex flex-col items-center py-1.5 rounded-lg border text-[10px] transition-colors ${
                      skill === s
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        : "border-[var(--border)] text-[var(--muted)] hover:border-blue-300"
                    }`}
                  >
                    <span className={skill === s ? "text-blue-500" : m.color}>{m.icon}</span>
                    <span className="hidden sm:block mt-0.5">{s.slice(0, 3)}</span>
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <Field label="Subskill" hint="The specific cognitive/linguistic process being measured">
          <Select
            value={subskill}
            onChange={setSubskill}
            options={subskillOptions as string[]}
            placeholder="Select subskill..."
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Count" hint="1–20 items per call">
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.min(20, Math.max(1, +e.target.value)))}
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>

          <Field label="Genre" hint="Optional but improves CEFR alignment">
            <Select
              value={genre}
              onChange={setGenre}
              options={genreOptions}
              placeholder="Any genre"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Topic">
            <Select
              value={topic}
              onChange={setTopic}
              options={TOPICS as unknown as string[]}
              placeholder="Any topic"
            />
          </Field>

          <Field label="Item Type">
            <Select
              value={itemType}
              onChange={setItemType}
              options={itemTypeOptions}
              placeholder="Default for skill"
            />
          </Field>
        </div>
      </div>

      {/* Advanced spec */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]/5 transition-colors rounded-xl"
        >
          <span>Advanced Specification (§11 Evidence Statement, §30 Distractor Strategy)</span>
          {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {showAdvanced && (
          <div className="px-4 pb-4 space-y-4 border-t border-[var(--border)]">
            <div className="pt-3" />

            <Field label="Construct" hint="e.g. Reading for inference">
              <input
                type="text"
                value={construct}
                onChange={(e) => setConstruct(e.target.value)}
                placeholder="e.g. Reading for inference"
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </Field>

            <Field
              label="Evidence Statement"
              hint="What a correct response proves (§11)"
            >
              <textarea
                value={evidenceStatement}
                onChange={(e) => setEvidenceStatement(e.target.value)}
                rows={2}
                placeholder="e.g. Candidate integrates information across two paragraphs to identify an implied consequence the writer does not state explicitly."
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </Field>

            <Field
              label="Distractor Strategy"
              hint="Per-distractor error specification (§30). Leave blank for defaults."
            >
              <textarea
                value={distractorStrategy}
                onChange={(e) => setDistratorStrategy(e.target.value)}
                rows={3}
                placeholder={`e.g.\n- Distractor A: misreads explicit detail near the answer\n- Distractor B: confuses an example with the main conclusion\n- Distractor C: overgeneralises a statement`}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Age Suitability">
                <Select
                  value={ageSuitability}
                  onChange={setAgeSuitability}
                  options={["YOUNG_LEARNER", "TEEN", "ADULT", "UNIVERSAL"]}
                />
              </Field>

              <Field label="Cultural Load">
                <Select
                  value={culturalLoad}
                  onChange={setCulturalLoad}
                  options={["LOW", "MEDIUM", "HIGH"]}
                />
              </Field>
            </div>

            <Field label="Generator Notes" hint="Optional context visible to the model">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Avoid technology topics — used in previous batch"
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </Field>
          </div>
        )}
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={running || !cefr || !skill || !subskill}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
      >
        {running ? (
          <><Loader2 size={15} className="animate-spin" /> Generating {count} items…</>
        ) : (
          <><Wand2 size={15} /> Generate {count} {cefr} {skill} items ({subskill})</>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--card)] space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <span className="text-sm font-semibold text-[var(--foreground)]">Batch complete</span>
            <span className="text-xs text-[var(--muted)] ml-auto">{(result.durationMs / 1000).toFixed(1)}s</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Requested", value: result.requested, color: "text-[var(--foreground)]" },
              { label: "Generated", value: result.generated, color: "text-emerald-500" },
              { label: "Skipped", value: result.skipped, color: result.skipped > 0 ? "text-amber-500" : "text-[var(--muted)]" },
              { label: "Duplicates Blocked", value: result.duplicatesBlocked ?? 0, color: result.duplicatesBlocked > 0 ? "text-red-500" : "text-[var(--muted)]" },
              { label: "Near-Match Warnings", value: result.nearMatchWarnings ?? 0, color: result.nearMatchWarnings > 0 ? "text-amber-400" : "text-[var(--muted)]" },
            ].map((tile) => (
              <div key={tile.label} className="rounded-lg border border-[var(--border)] p-2">
                <div className={`text-xl font-bold ${tile.color}`}>{tile.value}</div>
                <div className="text-[10px] text-[var(--muted)]">{tile.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-[10px] text-[var(--muted)]">
            <Shield size={11} className="text-amber-500 mt-0.5 shrink-0" />
            <span>
              All {result.generated} items stored as <strong className="text-[var(--foreground)]">AI_DRAFT</strong>.
              They must pass Language Review → CEFR Review → Fairness Review → Moderation before reaching pilot status.
              Use the <strong>Content Review</strong> tab to begin the review workflow.
            </span>
          </div>

          {result.skippedReasons.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)]">
                {result.skippedReasons.length} skip reason{result.skippedReasons.length > 1 ? "s" : ""}
              </summary>
              <ul className="mt-2 space-y-1 pl-3 border-l border-[var(--border)]">
                {result.skippedReasons.map((r, i) => (
                  <li key={i} className="text-[var(--muted)]">{r}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="text-[10px] text-[var(--muted)] font-mono break-all">
            Batch ID: {result.batchId}
          </div>
        </div>
      )}

      {/* Quality gates reminder */}
      <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--card)] space-y-2">
        <h4 className="text-xs font-semibold text-[var(--foreground)]">8 Quality Gates (§150)</h4>
        <div className="grid grid-cols-2 gap-1 text-[10px] text-[var(--muted)]">
          {[
            "Gate 1 — Specification (construct clear?)",
            "Gate 2 — Language (natural and correct?)",
            "Gate 3 — CEFR (target plausible?)",
            "Gate 4 — Item Design (valid evidence?)",
            "Gate 5 — Fairness (no obvious bias?)",
            "Gate 6 — Security (original, protected?)",
            "Gate 7 — Pilot (acceptable empirical behaviour?)",
            "Gate 8 — Calibration (parameters usable?)",
          ].map((g) => (
            <div key={g} className="flex items-start gap-1">
              <span className="mt-0.5 shrink-0">→</span>
              <span>{g}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[var(--muted)]">Only after Gate 8: <strong className="text-[var(--foreground)]">LIVE</strong>.</p>
      </div>
    </div>
  );
}
