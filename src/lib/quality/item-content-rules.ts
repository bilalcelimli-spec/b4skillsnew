/**
 * Editorial content rules added after the 2026-11-01 bank review, which pulled
 * 72 live items that the existing audit (scripts/audit-active-item-content.ts)
 * reported as clean. Each rule is one defect class found there. Pure functions
 * over stored item rows: no database, no network.
 */

import { hasNothingToAnswer } from "../validation/item-schema.js";

export type RuleSeverity = "BLOCKER" | "REVIEW";

export interface RuleItem {
  id: string;
  itemCode?: string | null;
  skill: string;
  type?: string | null;
  content: unknown;
}

export interface RuleHit {
  itemId: string;
  rule: string;
  severity: RuleSeverity;
  evidence: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const norm = (v: unknown) => str(v).toLowerCase().replace(/[^a-z0-9']+/g, " ").trim();
/** For comparing stems: quote style (‘ ’ ' ") must not separate two copies of one question. */
const stemKey = (v: unknown) => str(v).toLowerCase().replace(/[‘’'"“”]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const PICTURE_REF = /\blook at (?:(?:this|the|these|a|an)\s+)?(?:two\s+)?pictures?\b|\bpicture\s*\d|\[\s*picture\b|\bin the picture\b|\bthe picture (?:shows|is)\b/i;
const promptOf = (c: Record<string, any>) => str(c.prompt || c.question || c.stem || c.task);
const optionText = (o: any) => str(typeof o === "string" ? o : o?.text ?? o?.content);
const OWN_MEDIA_HOSTS = /(^|\.)supabase\.co$|(^|\.)b4skills\.com$/i;

/** Rules that look at one item. */
export function itemRules(item: RuleItem): RuleHit[] {
  const hits: RuleHit[] = [];
  const add = (rule: string, severity: RuleSeverity, evidence: string) => hits.push({ itemId: item.id, rule, severity, evidence });
  const c = (item.content ?? {}) as Record<string, any>;
  const prompt = promptOf(c);
  const options: any[] = Array.isArray(c.options) ? c.options : [];
  const objective = ["MULTIPLE_CHOICE", "FILL_IN_BLANKS"].includes(String(item.type ?? ""));

  if (objective && options.length > 0 && (options.length < 3 || options.length > 5)) {
    add("OPTION_COUNT_OUT_OF_RANGE", "BLOCKER", `${options.length} options on a single-response item (3–5 expected)`);
  }

  if (["GRAMMAR", "VOCABULARY"].includes(item.skill) && objective && hasNothingToAnswer(c)) {
    add("NOTHING_TO_ANSWER", "BLOCKER", "Prompt is only an instruction; no sentence, gap or question is stored");
  }

  if (/\[\s*(image|picture|photo)(\s+description)?\s*:|^\s*\**\s*(image(\s+description)?|picture)\s*:/im.test(prompt)) {
    add("IMAGE_DESCRIPTION_SHOWN", "BLOCKER", "The image-generation note is part of the prompt the candidate reads");
  }

  const hasImage = Boolean(str(c.imageUrl) || options.some((o) => str(o?.imageUrl)));
  if (!hasImage && (PICTURE_REF.test(prompt) || PICTURE_REF.test(str(c.passage)))) {
    add("PICTURE_REFERENCED_NO_IMAGE", "BLOCKER", "Prompt or passage refers to a picture, but the item has no image");
  }

  if (/https?:\/\/\S+/i.test(prompt)) {
    add("URL_IN_PROMPT", "BLOCKER", `Prompt contains a URL: ${prompt.match(/https?:\/\/\S+/i)![0].slice(0, 80)}`);
  }

  if (item.skill === "LISTENING") {
    const script = str(c.ttsScript);
    if (/^\s*\*?\(?\s*(sound of|sfx|music|noise)\b[^)\n]*\)?\*?\s*$/im.test(script)) {
      add("TTS_STAGE_DIRECTION", "BLOCKER", "ttsScript has a stage direction line; TTS reads it aloud");
    } else if (/\*/.test(script)) {
      // *emphasis* is usually rendered as stress, not read out; once audio exists a listen settles it.
      if (str(c.audioUrl)) add("TTS_SCRIPT_MARKUP", "REVIEW", "ttsScript has *markdown*; check the recording does not read it");
      else add("TTS_SCRIPT_MARKUP", "BLOCKER", "ttsScript has *markdown* and no audio yet; remove it before synthesis");
    }
  }

  if (item.skill === "VOCABULARY" && objective) {
    const key = norm(optionText(options.find((o) => o?.isCorrect === true)));
    const stemWords = new Set(norm(prompt.replace(/_{2,}/g, " ")).split(" "));
    if (key.length >= 4 && !key.includes(" ") && stemWords.has(key)) {
      add("KEY_IN_STEM", "REVIEW", `The key "${key}" also appears in the stem`);
    }
  }

  if (item.type === "FILL_IN_BLANKS" && options.length === 0) {
    const scaffold = str(c.scaffold) || [c.prompt, c.passage].map(str).find((v) => v.includes("___")) || "";
    const gaps = (scaffold.match(/_{3,}/g) ?? []).length;
    if (gaps > 3) add("MULTI_BLANK_ALL_OR_NOTHING", "REVIEW", `${gaps} blanks scored as one right/wrong response; one slip fails the item`);
  }

  const imageUrl = str(c.imageUrl);
  if (/^https?:\/\//i.test(imageUrl)) {
    let host = "";
    try { host = new URL(imageUrl).host; } catch { /* malformed URL is reported below */ }
    if (!host) add("IMAGE_URL_MALFORMED", "BLOCKER", imageUrl.slice(0, 80));
    else if (!OWN_MEDIA_HOSTS.test(host)) add("IMAGE_EXTERNAL_HOTLINK", "REVIEW", `Image served from ${host}; it breaks when the host removes it`);
  }

  return hits;
}

/** Rules that compare items with each other. */
export function crossItemRules(items: RuleItem[]): RuleHit[] {
  const hits: RuleHit[] = [];

  const bySet = new Map<string, RuleItem[]>();
  for (const item of items) {
    const options: any[] = Array.isArray((item.content as any)?.options) ? (item.content as any).options : [];
    if (options.length < 5) continue; // 4-option sets repeat legitimately (a/an/the/—)
    const key = options.map((o) => norm(optionText(o))).sort().join("|");
    bySet.set(key, [...(bySet.get(key) ?? []), item]);
  }
  for (const group of bySet.values()) {
    if (group.length < 2) continue;
    const codes = group.map((g) => g.itemCode ?? g.id.slice(0, 10)).join(", ");
    for (const item of group) hits.push({ itemId: item.id, rule: "SHARED_OPTION_SET", severity: "BLOCKER", evidence: `Same option set as: ${codes}; one item's key reveals the others'` });
  }

  const byStem = new Map<string, RuleItem[]>();
  for (const item of items) {
    const c = (item.content ?? {}) as Record<string, any>;
    const stem = stemKey(promptOf(c));
    if (stem.length < 16 || ["SPEAKING", "WRITING"].includes(item.skill)) continue;
    const key = `${item.skill}|${stem}|${stemKey(c.passage ?? c.ttsScript ?? "").slice(0, 200)}`;
    byStem.set(key, [...(byStem.get(key) ?? []), item]);
  }
  for (const group of byStem.values()) {
    if (group.length < 2) continue;
    const codes = group.map((g) => g.itemCode ?? g.id.slice(0, 10)).join(", ");
    for (const item of group) hits.push({ itemId: item.id, rule: "DUPLICATE_STEM", severity: "REVIEW", evidence: `Same stem as: ${codes}; a candidate can get the same question twice` });
  }

  return hits;
}
