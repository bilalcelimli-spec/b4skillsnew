/**
 * Human Item Authoring Form
 * Writers create items from scratch → HUMAN_DRAFT stage → same review pipeline.
 * Evidence-Centred Design: construct → descriptor → subskill → task → evidence.
 * §65 never auto-publishes: all human drafts enter HUMAN_DRAFT → review pipeline.
 */
import { useState } from "react";
import {
  BookOpen, Headphones, PenLine, Mic, BookMarked, Hash,
  CheckCircle2, AlertTriangle, Plus, Trash2, RefreshCw, Save,
  ChevronDown, ChevronUp, Info,
} from "lucide-react";
import {
  SUBSKILLS_BY_SKILL, GENRES_BY_SKILL, TOPICS,
  WORD_COUNT_GUIDANCE, DEFAULT_ITEM_TYPE,
} from "../../lib/content-factory/blueprint";

// ── Constants ─────────────────────────────────────────────────────────────────

const SKILLS = [
  { value: "READING",    label: "Reading",    icon: <BookOpen size={14} />,    color: "text-blue-500" },
  { value: "LISTENING",  label: "Listening",  icon: <Headphones size={14} />,  color: "text-purple-500" },
  { value: "WRITING",    label: "Writing",    icon: <PenLine size={14} />,     color: "text-emerald-500" },
  { value: "SPEAKING",   label: "Speaking",   icon: <Mic size={14} />,         color: "text-orange-500" },
  { value: "GRAMMAR",    label: "Grammar",    icon: <BookMarked size={14} />,  color: "text-red-500" },
  { value: "VOCABULARY", label: "Vocabulary", icon: <Hash size={14} />,        color: "text-teal-500" },
];

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const REGISTERS = ["formal", "informal", "neutral", "academic", "colloquial"];
const ENGLISH_VARIANTS = ["BRITISH", "AMERICAN", "AUSTRALIAN", "INTERNATIONAL"];
const AGE_SUITABILITIES = ["UNIVERSAL", "ADULT", "TEEN", "YOUNG_LEARNER"];
const CULTURAL_LOADS = ["LOW", "MEDIUM", "HIGH"];

const RUBRIC_DIMS = [
  { key: "taskFulfilment",             label: "Task Fulfilment" },
  { key: "organisation",               label: "Organisation" },
  { key: "lexicalResource",            label: "Lexical Resource" },
  { key: "grammar",                    label: "Grammar" },
  { key: "communicativeEffectiveness", label: "Communicative Effectiveness" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface MCQOption {
  id: string;        // A | B | C | D
  text: string;
  isCorrect: boolean;
  distractorRationale: string;
}

const EMPTY_OPTIONS: MCQOption[] = [
  { id: "A", text: "", isCorrect: false, distractorRationale: "" },
  { id: "B", text: "", isCorrect: true,  distractorRationale: "" },
  { id: "C", text: "", isCorrect: false, distractorRationale: "" },
  { id: "D", text: "", isCorrect: false, distractorRationale: "" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1">
      <label className="text-xs font-medium text-[var(--foreground)]">{children}</label>
      {hint && <p className="text-[10px] text-[var(--muted)] mt-0.5">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, rows }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return rows ? (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
      placeholder={placeholder}
      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y" />
  ) : (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500" />
  );
}

function SelectInput({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: Array<string | { value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) =>
        typeof o === "string"
          ? <option key={o} value={o}>{o.replace(/_/g, " ")}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  );
}

// ── MCQ Options editor ────────────────────────────────────────────────────────

function MCQOptionsEditor({ options, onChange }: {
  options: MCQOption[]; onChange: (opts: MCQOption[]) => void;
}) {
  const setCorrect = (id: string) => {
    onChange(options.map((o) => ({ ...o, isCorrect: o.id === id })));
  };
  const update = (id: string, field: keyof MCQOption, value: string | boolean) => {
    onChange(options.map((o) => o.id === id ? { ...o, [field]: value } : o));
  };

  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <div key={opt.id} className={`rounded-lg border p-2.5 space-y-1.5 transition-colors ${
          opt.isCorrect ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10" : "border-[var(--border)]"
        }`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCorrect(opt.id)}
              className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors ${
                opt.isCorrect
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-blue-400"
              }`}
              title={opt.isCorrect ? "Correct answer" : "Set as correct"}
            >
              {opt.id}
            </button>
            <input
              type="text"
              value={opt.text}
              onChange={(e) => update(opt.id, "text", e.target.value)}
              placeholder={`Option ${opt.id} text…`}
              className="flex-1 text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {opt.isCorrect && <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
          </div>
          {!opt.isCorrect && (
            <input
              type="text"
              value={opt.distractorRationale}
              onChange={(e) => update(opt.id, "distractorRationale", e.target.value)}
              placeholder="Distractor rationale: what error does this represent? (§30)"
              className="w-full text-[10px] px-2 py-1 rounded border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function ContentFactoryItemForm({ onSuccess }: { onSuccess?: (itemId: string, itemCode: string | null) => void }) {
  // ── Taxonomy ──
  const [skill, setSkill] = useState("READING");
  const [cefr, setCefr] = useState("B1");
  const [subskill, setSubskill] = useState("");
  const [genre, setGenre] = useState("");
  const [topic, setTopic] = useState("");
  const [register, setRegister] = useState("neutral");
  const [englishVariant, setEnglishVariant] = useState("INTERNATIONAL");
  const [ageSuitability, setAgeSuitability] = useState("UNIVERSAL");
  const [culturalLoad, setCulturalLoad] = useState("LOW");

  // ── Evidence-centred design ──
  const [construct, setConstruct] = useState("");
  const [evidenceStatement, setEvidenceStatement] = useState("");
  const [descriptorRef, setDescriptorRef] = useState("");

  // ── MCQ content ──
  const [passage, setPassage] = useState("");
  const [ttsScript, setTtsScript] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<MCQOption[]>(EMPTY_OPTIONS);

  // ── Writing/Speaking content ──
  const [prompt, setPrompt] = useState("");
  const [audience, setAudience] = useState("");
  const [purpose, setPurpose] = useState("");
  const [contextNote, setContextNote] = useState("");
  const [minWords, setMinWords] = useState(0);
  const [maxWords, setMaxWords] = useState(0);
  const [responseTimeSec, setResponseTimeSec] = useState(90);
  const [prepTimeSec, setPrepTimeSec] = useState(30);
  const [rubric, setRubric] = useState<Record<string, string>>(
    Object.fromEntries(RUBRIC_DIMS.map((d) => [d.key, ""]))
  );

  // ── Metadata ──
  const [difficulty, setDifficulty] = useState(0.0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── Submit state ──
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; code: string | null } | null>(null);

  const isProductive = ["WRITING", "SPEAKING"].includes(skill);
  const isMCQ = !isProductive;
  const isReading = skill === "READING";
  const isListening = skill === "LISTENING";
  const wc = WORD_COUNT_GUIDANCE[cefr];
  const subskills = SUBSKILLS_BY_SKILL[skill] ?? [];
  const genres = GENRES_BY_SKILL[skill] ?? [];

  // Reset content when skill changes
  const handleSkillChange = (s: string) => {
    setSkill(s);
    setSubskill("");
    setGenre("");
    setOptions([...EMPTY_OPTIONS]);
    setPassage(""); setTtsScript(""); setQuestion(""); setPrompt("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Build content object
    let content: Record<string, unknown>;
    if (isProductive) {
      content = {
        prompt, audience, purpose, contextNote,
        ...(skill === "WRITING" ? { minWords, maxWords } : { responseTime: responseTimeSec, prepTime: prepTimeSec }),
        rubric: Object.fromEntries(RUBRIC_DIMS.map((d) => [d.key, rubric[d.key] || ""])),
      };
    } else {
      content = {
        ...(isReading && passage ? { passage } : {}),
        ...(isListening && ttsScript ? { ttsScript } : {}),
        question,
        options: options.map((o) => ({
          id: o.id, text: o.text, isCorrect: o.isCorrect,
          distractorRationale: o.isCorrect ? undefined : o.distractorRationale,
        })),
        correctAnswer: options.find((o) => o.isCorrect)?.id ?? "B",
      };
    }

    // Basic client-side validation
    if (isMCQ && !question.trim()) { setError("Question/stem is required"); return; }
    if (isMCQ && options.filter((o) => o.text.trim()).length < 4) { setError("All 4 options must have text"); return; }
    if (isMCQ && !options.some((o) => o.isCorrect && o.text.trim())) { setError("Mark one option as correct"); return; }
    if (isProductive && !prompt.trim()) { setError("Task prompt is required"); return; }

    setSaving(true);
    try {
      const resp = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: DEFAULT_ITEM_TYPE[skill] ?? "MULTIPLE_CHOICE",
          skill,
          cefrLevel: cefr,
          difficulty,
          discrimination: 1.0,
          guessing: isProductive ? 0.0 : 0.25,
          content,
          tags: [skill, cefr, subskill, genre, topic].filter(Boolean),
          status: "DRAFT",
          pipelineStage: "HUMAN_DRAFT",
          provenance: "HUMAN_AUTHORED",
          subskill: subskill || null,
          genre: genre || null,
          topic: topic || null,
          construct: construct || null,
          evidenceStatement: evidenceStatement || null,
          descriptorRef: descriptorRef || null,
          register,
          englishVariant,
          ageSuitability,
          culturalLoad,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) { setError(data.error ?? "Failed to create item"); return; }

      // IQS auto-score (non-blocking)
      fetch(`/api/items/${data.id}/iqs`, { method: "POST" }).catch(() => {});

      setSuccess({ id: data.id, code: data.itemCode ?? null });
      onSuccess?.(data.id, data.itemCode ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSuccess(null); setError(null);
    setPassage(""); setTtsScript(""); setQuestion("");
    setOptions([...EMPTY_OPTIONS]);
    setPrompt(""); setAudience(""); setPurpose(""); setContextNote("");
    setConstruct(""); setEvidenceStatement(""); setDescriptorRef("");
    setRubric(Object.fromEntries(RUBRIC_DIMS.map((d) => [d.key, ""])));
  };

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center space-y-3">
        <CheckCircle2 size={28} className="text-emerald-500 mx-auto" />
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Item saved as HUMAN_DRAFT</h3>
        <p className="text-xs text-[var(--muted)]">
          Code: <strong className="font-mono text-[var(--foreground)]">{success.code ?? success.id.slice(0, 10)}</strong>
          {" "}— now in the Language Review queue.
        </p>
        <div className="flex gap-2 justify-center">
          <button onClick={resetForm}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">
            Write another item
          </button>
          <button onClick={() => setSuccess(null)}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--muted)]">
            Stay on this item
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ECD reminder */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 p-3 flex items-start gap-2">
        <Info size={12} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-[var(--muted)] leading-relaxed">
          <strong>Evidence-Centred Design chain (§3):</strong> CONSTRUCT → DESCRIPTOR → SUBSKILL → TASK → EVIDENCE → RESPONSE → SCORE → INFERENCE.
          Fill Construct + Evidence Statement before writing the item content.
        </p>
      </div>

      {/* ── Skill selector ── */}
      <div>
        <FieldLabel>Skill</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((s) => (
            <button key={s.value} type="button"
              onClick={() => handleSkillChange(s.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                skill === s.value
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className={skill === s.value ? "text-white" : s.color}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CEFR + Subskill row ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel hint={wc ? wc.label : undefined}>CEFR Level</FieldLabel>
          <div className="flex gap-1">
            {CEFR_LEVELS.map((l) => (
              <button key={l} type="button"
                onClick={() => setCefr(l)}
                className={`flex-1 py-1.5 rounded text-xs font-bold border transition-colors ${
                  cefr === l ? "border-blue-500 bg-blue-500 text-white" : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >{l}</button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel hint="Measured sub-construct (§12)">Subskill *</FieldLabel>
          <SelectInput value={subskill} onChange={setSubskill}
            options={[...subskills]} placeholder="— select subskill —" />
        </div>
      </div>

      {/* ── Evidence-centred design ── */}
      <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--card)] space-y-2.5">
        <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide">Evidence-Centred Design (§3, §11)</p>
        <div>
          <FieldLabel hint="What skill/knowledge this item measures, e.g. 'Reading for inference'">Construct</FieldLabel>
          <TextInput value={construct} onChange={setConstruct} placeholder="Reading for inference — implied meaning across paragraphs" />
        </div>
        <div>
          <FieldLabel hint="What a correct response proves the candidate can do">Evidence Statement</FieldLabel>
          <TextInput value={evidenceStatement} onChange={setEvidenceStatement} rows={2}
            placeholder="A correct response shows the candidate can integrate information from two paragraphs to identify an unstated conclusion." />
        </div>
        <div>
          <FieldLabel>Descriptor Reference</FieldLabel>
          <TextInput value={descriptorRef} onChange={setDescriptorRef} placeholder="CEFR CV2020 B2 Reading p.67 (optional)" />
        </div>
      </div>

      {/* ── Genre / Topic / Register ── */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <FieldLabel>Genre</FieldLabel>
          <SelectInput value={genre} onChange={setGenre} options={genres} placeholder="— genre —" />
        </div>
        <div>
          <FieldLabel>Topic</FieldLabel>
          <SelectInput value={topic} onChange={setTopic}
            options={[...TOPICS]} placeholder="— topic —" />
        </div>
        <div>
          <FieldLabel>Register</FieldLabel>
          <SelectInput value={register} onChange={setRegister} options={REGISTERS} />
        </div>
      </div>

      {/* ── READING: passage ── */}
      {isReading && (
        <div>
          <FieldLabel hint={wc ? `Target: ${wc.label}` : undefined}>Reading Passage</FieldLabel>
          <TextInput value={passage} onChange={setPassage} rows={6}
            placeholder={`Write or paste the reading text (${wc?.min ?? 100}–${wc?.max ?? 400} words)…`} />
          <p className="text-[10px] text-[var(--muted)] mt-1 text-right">{passage.split(/\s+/).filter(Boolean).length} words</p>
        </div>
      )}

      {/* ── LISTENING: script ── */}
      {isListening && (
        <div>
          <FieldLabel hint="Write as natural spoken dialogue/monologue — NOT a written essay read aloud">Audio Script (TTS)</FieldLabel>
          <TextInput value={ttsScript} onChange={setTtsScript} rows={6}
            placeholder="[SPEAKER 1]: Good morning…&#10;[SPEAKER 2]: Morning! Have you heard about…" />
        </div>
      )}

      {/* ── MCQ: question + options ── */}
      {isMCQ && (
        <>
          <div>
            <FieldLabel hint="Phrase to test the specific construct — not a vocabulary definition">Question / Stem *</FieldLabel>
            <TextInput value={question} onChange={setQuestion} rows={2}
              placeholder="According to the text, what is the main reason…?" />
          </div>
          <div>
            <FieldLabel hint="Click a letter to set the correct answer. Add distractor rationale to wrong options (§30).">
              Options (A–D) *
            </FieldLabel>
            <MCQOptionsEditor options={options} onChange={setOptions} />
          </div>
        </>
      )}

      {/* ── WRITING / SPEAKING ── */}
      {isProductive && (
        <div className="space-y-3">
          <div>
            <FieldLabel>Task Prompt *</FieldLabel>
            <TextInput value={prompt} onChange={setPrompt} rows={3}
              placeholder={skill === "WRITING"
                ? "You have received an email from your manager asking you to…"
                : "Tell me about a time when you had to make a difficult decision. What did you do and what happened?"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Audience</FieldLabel>
              <TextInput value={audience} onChange={setAudience} placeholder="a colleague, a magazine editor…" />
            </div>
            <div>
              <FieldLabel>Communicative Purpose</FieldLabel>
              <TextInput value={purpose} onChange={setPurpose} placeholder="persuade, inform, narrate…" />
            </div>
          </div>
          <div>
            <FieldLabel>Context Note</FieldLabel>
            <TextInput value={contextNote} onChange={setContextNote} rows={2}
              placeholder="Additional context the candidate needs to complete the task…" />
          </div>
          {skill === "WRITING" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Min Words</FieldLabel>
                <input type="number" value={minWords} onChange={(e) => setMinWords(+e.target.value)} min={0}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <FieldLabel hint={wc ? `Suggested max: ${wc.max}` : undefined}>Max Words</FieldLabel>
                <input type="number" value={maxWords} onChange={(e) => setMaxWords(+e.target.value)} min={0}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Response Time (sec)</FieldLabel>
                <input type="number" value={responseTimeSec} onChange={(e) => setResponseTimeSec(+e.target.value)} min={30} max={300}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <FieldLabel>Prep Time (sec)</FieldLabel>
                <input type="number" value={prepTimeSec} onChange={(e) => setPrepTimeSec(+e.target.value)} min={0} max={60}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
          )}
          <div>
            <FieldLabel hint="One descriptor per dimension — what earns a top score on each criterion">Scoring Rubric</FieldLabel>
            <div className="space-y-2">
              {RUBRIC_DIMS.map((dim) => (
                <div key={dim.key} className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--muted)] w-48 shrink-0">{dim.label}</span>
                  <TextInput value={rubric[dim.key]} onChange={(v) => setRubric((r) => ({ ...r, [dim.key]: v }))}
                    placeholder={`${dim.label} descriptor…`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Advanced ── */}
      <button type="button" onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
        {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Advanced (English variant, cultural load, IRT seed difficulty)
      </button>
      {showAdvanced && (
        <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--card)] grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>English Variant</FieldLabel>
            <SelectInput value={englishVariant} onChange={setEnglishVariant} options={ENGLISH_VARIANTS} />
          </div>
          <div>
            <FieldLabel>Age Suitability</FieldLabel>
            <SelectInput value={ageSuitability} onChange={setAgeSuitability} options={AGE_SUITABILITIES} />
          </div>
          <div>
            <FieldLabel>Cultural Load</FieldLabel>
            <SelectInput value={culturalLoad} onChange={setCulturalLoad} options={CULTURAL_LOADS} />
          </div>
          <div>
            <FieldLabel hint="IRT θ seed — overwritten by calibration later">Estimated Difficulty (b)</FieldLabel>
            <input type="number" value={difficulty} step={0.1} min={-4} max={4}
              onChange={(e) => setDifficulty(parseFloat(e.target.value))}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          <AlertTriangle size={13} className="shrink-0" />{error}
        </div>
      )}

      {/* ── Submit ── */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
          {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save as HUMAN_DRAFT</>}
        </button>
        <p className="text-[10px] text-[var(--muted)]">
          Saved to <strong>HUMAN_DRAFT</strong> stage → enters review pipeline after Language Review.
        </p>
      </div>
    </form>
  );
}
