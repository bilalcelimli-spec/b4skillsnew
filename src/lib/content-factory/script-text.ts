/**
 * Passages and recording scripts must be plain strings: the audio pipeline,
 * the duplicate detector and every solver gate read them as text. Models
 * sometimes return them as turn lists, e.g. [{ speaker, text }].
 */

const TEXT_KEYS = ["text", "line", "utterance", "content", "speech"];
const SPEAKER_KEYS = ["speaker", "name", "role", "who"];

function turnToText(turn: unknown): string {
  if (typeof turn === "string") return turn.trim();
  if (Array.isArray(turn) && turn.length === 2 && turn.every((x) => typeof x === "string")) return `${turn[0].trim()}: ${turn[1].trim()}`;
  if (!turn || typeof turn !== "object") return "";
  const o = turn as Record<string, unknown>;
  const entries = Object.entries(o);
  // { "Maria": "Hello." } — a single speaker-to-line pair.
  if (entries.length === 1 && typeof entries[0][1] === "string" && !TEXT_KEYS.includes(entries[0][0])) {
    return `${entries[0][0].trim()}: ${(entries[0][1] as string).trim()}`;
  }
  const text = TEXT_KEYS.map((k) => o[k]).find((v) => typeof v === "string") as string | undefined;
  if (!text) return "";
  const who = SPEAKER_KEYS.map((k) => o[k]).find((v) => typeof v === "string") as string | undefined;
  return who ? `${who.trim()}: ${text.trim()}` : text.trim();
}

export function scriptToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(turnToText).filter(Boolean).join("\n");
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const nested = o.turns ?? o.lines ?? o.dialogue ?? o.conversation ?? o.script;
    if (nested !== undefined) return scriptToText(nested);
    const single = turnToText(o);
    if (single) return single;
    // { "Maria": "…", "Tom": "…" } — speaker-to-line map.
    const lines = Object.entries(o).filter(([, v]) => typeof v === "string").map(([k, v]) => `${k.trim()}: ${(v as string).trim()}`);
    return lines.join("\n");
  }
  return value == null ? "" : String(value);
}

const SOURCE_FIELDS = ["passage", "ttsScript", "transcript", "audioScript", "readingText", "text"] as const;

/**
 * Returns a copy of `content` whose source-text fields are plain strings.
 * If a field cannot be converted to non-empty text it is left UNCHANGED, so
 * unknown shapes are never overwritten with an empty string.
 */
export function normalizeSourceFields<T extends Record<string, unknown>>(content: T): T {
  const out: Record<string, unknown> = { ...content };
  for (const f of SOURCE_FIELDS) {
    if (out[f] !== undefined && typeof out[f] !== "string") {
      const text = scriptToText(out[f]).trim();
      if (text) out[f] = text;
    }
  }
  return out as T;
}

/** Source-text fields that are present but still not usable text. */
export function unusableSourceFields(content: Record<string, unknown>): string[] {
  return SOURCE_FIELDS.filter((f) => content[f] !== undefined && (typeof content[f] !== "string" || !(content[f] as string).trim()));
}
