/**
 * Pure helpers for the content review UI. Browser-safe: no server or LLM imports.
 */

export type StructuredKey =
  | { kind: "matching"; rows: Array<{ zone: string; answer: string }>; unused: string[] }
  | { kind: "selection"; selectCount: number; items: Array<{ text: string; correct: boolean }> }
  | { kind: "ordering"; order: string[] }
  | null;

export function describeStructuredKey(c: Record<string, any>): StructuredKey {
  const items: unknown[] = Array.isArray(c.draggableItems) ? c.draggableItems : Array.isArray(c.wordBank) ? c.wordBank : [];
  if (!items.length) return null;
  const text = (i: number) => String(items[i] ?? "");

  if (c.correctMapping && Array.isArray(c.dropZones)) {
    const used = new Set<number>();
    const rows = c.dropZones.map((zone: unknown, i: number) => {
      const idx = c.correctMapping[String(i)];
      if (Number.isInteger(idx)) used.add(idx);
      return { zone: String(zone), answer: Number.isInteger(idx) ? text(idx) : "(no key)" };
    });
    return { kind: "matching", rows, unused: items.map((_, i) => i).filter((i) => !used.has(i)).map(text) };
  }
  if (Array.isArray(c.correctAnswers) && Number.isInteger(c.selectCount)) {
    const key = new Set<number>(c.correctAnswers);
    return { kind: "selection", selectCount: c.selectCount, items: items.map((_, i) => ({ text: text(i), correct: key.has(i) })) };
  }
  if (Array.isArray(c.correctOrder)) return { kind: "ordering", order: c.correctOrder.map((i: number) => text(i)) };
  if (Array.isArray(c.correctSequence)) return { kind: "ordering", order: c.correctSequence.map(String) };
  return null;
}

export interface Signal {
  label: string;
  tone: "ok" | "warn" | "bad" | "info";
}

const FLAG_LABELS: Record<string, string> = {
  "TEXTDEP-SOLVABLE-BLIND": "Answerable without the source (MCQ solver)",
  "TEXTDEP-KEY-UNCONFIRMED": "Key not confirmed with the source",
  "MATCH-SOLVABLE-BLIND": "Full answer found without the source",
  "MATCH-KEY-UNCONFIRMED": "Key not confirmed with the source",
  "INTEG-TEST_WISENESS": "Key identifiable by style (absolutes / length)",
  "INTEG-LEXICAL_LIFT": "Key repeats the text almost verbatim",
  "INTEG-DEMAND_BELOW_LEVEL": "Thinking required is below the CEFR level",
  "INTEG-DEMAND_ABOVE_LEVEL": "Thinking required is above the CEFR level",
};

/** Turns the generator's automated gate results into short reviewer-facing signals. */
export function generationSignals(metadata: Record<string, any> | null | undefined): Signal[] {
  const m = metadata ?? {};
  const g = m.generationGates ?? {};
  const td = g.textDependency ?? {};
  const out: Signal[] = [];

  const blind = typeof td.blindExact === "boolean" ? td.blindExact : td.blindOk;
  const guided = typeof td.guidedExact === "boolean" ? td.guidedExact : td.guidedOk;
  if (typeof blind === "boolean") out.push(blind ? { label: "Solved without the source by an LLM", tone: "warn" } : { label: "Needs the source (LLM solver)", tone: "ok" });
  if (guided === false) out.push({ label: "Key not confirmed with the source", tone: "bad" });

  for (const f of (g.flags as string[] | undefined) ?? []) {
    if (f === "TEXTDEP-SOLVABLE-BLIND" || f === "MATCH-SOLVABLE-BLIND" || f === "TEXTDEP-KEY-UNCONFIRMED" || f === "MATCH-KEY-UNCONFIRMED") continue;
    out.push({ label: FLAG_LABELS[f] ?? f, tone: "warn" });
  }
  for (const f of (m.contentQuality?.flags as string[] | undefined) ?? []) {
    out.push({ label: `Audit: ${f.toLowerCase().replace(/_/g, " ")}`, tone: "warn" });
  }
  if (m.cognitiveDemand) out.push({ label: `Demand: ${String(m.cognitiveDemand).toLowerCase().replace(/_/g, " ")}`, tone: "info" });
  if (g.hardening?.status && g.hardening.status !== "unchanged") out.push({ label: `Distractors: ${g.hardening.status.replace(/-/g, " ")}`, tone: "info" });

  const seen = new Set<string>();
  return out.filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true)));
}
