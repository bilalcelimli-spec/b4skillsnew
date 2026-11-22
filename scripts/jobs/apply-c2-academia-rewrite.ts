#!/usr/bin/env tsx
/**
 * Rewrites the two C2 items moved to Academia (2026-11-22) so they fit it
 * (docs/quality/rubric-item-activation-2026-11.md).
 *
 *   npx tsx scripts/jobs/apply-c2-academia-rewrite.ts            # dry run: validates and prints the plan
 *   npx tsx scripts/jobs/apply-c2-academia-rewrite.ts --apply    # writes it, in one transaction
 *
 * - SPK-C2-0009 asked the candidate to discuss "with the examiner", but
 *   speaking is a recorded monologue scored without an interlocutor. It
 *   becomes a long-turn monologue on the same proposition.
 * - WRT-C2-0010 was creative epistolary fiction. It becomes an academic
 *   argumentative essay (280–380 words, as in Academia's other C2 essays),
 *   with a new sample answer.
 *
 * Run after apply-c2-academia-retag.ts --apply: items not yet tagged
 * `academia` fail the check. The retag's reviewer note is marked resolved.
 *
 * Status, pretest flag and pipeline stage are unchanged: both items still
 * need the four editorial approvals. Previous content, tags and genre are
 * kept under metadata.revision. Items with review records are skipped,
 * because the rewrite voids the reviewed content hash.
 */
import "dotenv/config";
import { pathToFileURL } from "node:url";
import { PrismaClient, type Prisma } from "@prisma/client";
import { hasNothingToAnswer, validateItemStructure } from "../../src/lib/validation/item-schema.js";
import { itemRules } from "../../src/lib/quality/item-content-rules.js";
import { auditItemEvidence } from "../../src/lib/quality/item-evidence-audit.js";

const REVISION_ID = "c2-academia-rewrite-2026-11-22";

/** Prompts that assume someone answers back; speaking is recorded without one. */
export const INTERLOCUTOR = /\b(examiner|interlocutor|your partner|with the (teacher|interviewer))\b|\bdiscuss with\b/i;

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const C2_WRITING_DESCRIPTOR = "Can write clear, smoothly flowing, complex texts in an appropriate and effective style, with a logical structure that helps the reader find significant points.";

const ESSAY_SAMPLE = `Peer review occupies an odd position in academic life: almost everyone complains about it, yet almost no one proposes abolishing it. The charge that it rewards conformity deserves to be taken seriously, but on closer inspection it describes a tendency rather than the system's essential character.

The process was never designed to certify that a finding is true. Its more modest aim is to filter out work whose methods are unsound, whose claims outrun its evidence, or whose argument has been made before. Judged against that aim, it performs reasonably well; reviewers routinely catch statistical errors and unsupported conclusions that authors had overlooked.

The conformity charge has substance nonetheless. Reviewers are drawn from the very communities whose assumptions a novel paper may challenge, and anonymity offers little protection against an instinctive preference for the familiar. Proposals that strike reviewers as highly original are more likely to divide them, and divided panels tend to settle on the safer option. The bias, in other words, is less a matter of individual prejudice than of how collective judgement aggregates.

The alternatives each address part of the problem. Preprint servers speed up dissemination but shift the burden of evaluation onto readers who may lack the expertise to judge. Open review makes reviewers accountable, yet it may also make junior researchers reluctant to criticise senior colleagues. Registered reports, in which methods are reviewed before results exist, tackle publication bias directly, although they suit experimental research better than interpretive scholarship.

On balance, the claim overstates its case. Peer review is better understood as a necessary but insufficient safeguard: it raises the floor of published research without reliably recognising work that redefines a field. The sensible response is not to replace it but to supplement it, so that originality does not depend on the goodwill of the reviewers it unsettles.`;

export interface Rewrite {
  itemCode: string;
  note: string;
  content: Record<string, unknown>;
  /** Content keys removed (stale for the new task). */
  drop?: string[];
  tags: { from: string; to: string }[];
  genre: string;
}

export const REWRITES: readonly Rewrite[] = [
  {
    itemCode: "SPK-C2-0009",
    note: "discussion with an examiner → long-turn monologue on the same proposition",
    genre: "opinion",
    tags: [{ from: "discussion", to: "monologue" }],
    content: {
      taskType: "monologue",
      prepTime: 90,
      responseTime: 210,
      prompt: "Give a short talk on the following claim, which is meant sincerely even though it sounds paradoxical: 'The most honest thing a politician can do is to lie skilfully.' Explain how the claim could be understood, weigh the strongest case for and against it with reference to political communication, and finish with a reasoned conclusion of your own. Where it serves your argument, shift register, for example to make an ironic point.",
      rubric: "Assess near-native mastery in an extended academic monologue. Evaluate precision, nuance, control of register and irony, and the coherence of the argument from interpretation to conclusion.",
      sampleBullets: [
        "Unpacks the paradox precisely: in what sense could a skilful lie be honest?",
        "Builds the strongest case for the claim (e.g. the noble lie, diplomacy, managing public panic)",
        "Builds the strongest case against it (accountability, erosion of trust, who decides when lying is justified)",
        "Shifts register deliberately, e.g. an ironic aside, without losing control or coherence",
        "Reaches a reflective conclusion that follows from the argument",
      ],
      cefrDescriptor: "Can give a clear, smoothly flowing, well-structured talk on a complex subject, exploiting irony and register shifts at a sophisticated level.",
    },
  },
  {
    itemCode: "WRT-C2-0010",
    note: "creative epistolary fiction → academic argumentative essay",
    genre: "essay",
    tags: [{ from: "epistolary-fiction", to: "essay" }, { from: "creative", to: "research-culture" }],
    content: {
      taskType: "essay",
      minWords: 280,
      maxWords: 380,
      wordRange: { min: 280, max: 380 },
      prompt: "It has been argued that peer review, far from guaranteeing the quality of published research, mainly rewards conformity with established views. Write an essay in which you evaluate this claim. Consider what peer review is designed to achieve, where its weaknesses lie, and whether the alternatives that have been proposed would serve research better. Reach a clearly reasoned conclusion.",
      rubric: "Assess near-native mastery in academic argument. Evaluate precision, nuance, the balance and development of the argument, and a sustained academic register.",
      sampleAnswer: ESSAY_SAMPLE,
      scoringRubric: [
        { name: "Task Achievement", maxScore: 2, descriptor: "Evaluates the claim fully: purpose, weaknesses and alternatives, leading to a reasoned conclusion." },
        { name: "Grammar & Accuracy", maxScore: 2, descriptor: "Maintains consistent grammatical control across all structures." },
        { name: "Vocabulary", maxScore: 2, descriptor: "Precise and sophisticated lexical choice; near-native range." },
        { name: "Coherence & Cohesion", maxScore: 2, descriptor: "Masterful use of cohesive devices; the argument is easy to follow." },
        { name: "Communicative Effect", maxScore: 2, descriptor: "Sustained academic register suited to a scholarly reader." },
      ],
      cefrDescriptor: C2_WRITING_DESCRIPTOR,
    },
  },
];

/** Problems that block a rewrite. */
export function rewriteProblems(skill: string, type: string | null, content: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (hasNothingToAnswer(content)) problems.push("nothing to answer");
  problems.push(...validateItemStructure(skill, content));
  problems.push(...itemRules({ id: "x", skill, type, content }).filter((h) => h.severity === "BLOCKER").map((h) => `${h.rule}: ${h.evidence}`));
  problems.push(...auditItemEvidence({ id: "x", skill, type: type ?? "", status: "DRAFT", content, metadata: {} } as any)
    .filter((f) => f.severity === "BLOCKER").map((f) => f.rule));
  if (skill === "SPEAKING" && INTERLOCUTOR.test(String(content.prompt))) problems.push("prompt still assumes an interlocutor");
  if (skill === "WRITING" && typeof content.sampleAnswer === "string") {
    const n = words(content.sampleAnswer);
    if (n < Number(content.minWords) || n > Number(content.maxWords)) problems.push(`sample answer is ${n} words, outside ${content.minWords}–${content.maxWords}`);
  }
  return problems;
}

export function applyRewrite(rewrite: Rewrite, item: { tags: string[]; content: Record<string, unknown> }) {
  const content: Record<string, unknown> = { ...item.content, ...rewrite.content };
  for (const key of rewrite.drop ?? []) delete content[key];
  const tags = [...new Set(item.tags.map((tag) => rewrite.tags.find((t) => t.from === tag)?.to ?? tag))];
  return { content, tags };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const db = new PrismaClient();
  try {
    const items = await db.item.findMany({
      where: { itemCode: { in: REWRITES.map((r) => r.itemCode) } },
      include: { _count: { select: { itemReviews: true } } },
    });
    const updates: { id: string; data: Prisma.ItemUpdateInput }[] = [];
    let failed = 0;
    const revisedAt = new Date().toISOString();
    for (const rewrite of REWRITES) {
      const item = items.find((i) => i.itemCode === rewrite.itemCode);
      if (!item) { console.log(`SKIP    ${rewrite.itemCode}: not found`); continue; }
      if (item._count.itemReviews > 0) { console.log(`SKIP    ${rewrite.itemCode}: has review records; a rewrite would void them`); continue; }
      const metadata = (item.metadata ?? {}) as Record<string, unknown>;
      if ((metadata.revision as { id?: string } | undefined)?.id === REVISION_ID) { console.log(`SKIP    ${rewrite.itemCode}: already rewritten`); continue; }
      const previousContent = (item.content ?? {}) as Record<string, unknown>;
      const next = applyRewrite(rewrite, { tags: item.tags, content: previousContent });
      const problems = rewriteProblems(item.skill, item.type, next.content);
      if (problems.length) { failed++; console.log(`FAIL    ${rewrite.itemCode} — ${problems.join("; ")}`); continue; }
      if (!next.tags.includes("academia")) {
        failed++;
        console.log(`FAIL    ${rewrite.itemCode}: not tagged academia yet; run apply-c2-academia-retag.ts --apply first`);
        continue;
      }
      // The retag left a reviewer note describing the problem this rewrite fixes.
      const retag = metadata.retag as Record<string, unknown> | undefined;
      console.log(`REWRITE ${rewrite.itemCode} (${item.skill} ${item.cefrLevel}) — ${rewrite.note}\n        → ${String(next.content.prompt).slice(0, 140)}…`);
      updates.push({
        id: item.id,
        data: {
          content: next.content as Prisma.InputJsonValue,
          tags: next.tags,
          genre: rewrite.genre,
          metadata: { ...metadata, ...(retag ? { retag: { ...retag, reviewNoteResolvedBy: REVISION_ID } } : {}), revision: { id: REVISION_ID, action: "REWRITE", note: rewrite.note, revisedAt, previousContent, previousTags: item.tags, previousGenre: item.genre } } as Prisma.InputJsonValue,
        },
      });
    }
    console.log(`\n${updates.length} to rewrite, ${failed} failing validation.`);
    if (failed) { process.exitCode = 1; return; }
    if (!apply) { console.log("\nDry run. Pass --apply to write these changes."); return; }
    await db.$transaction(updates.map((u) => db.item.update({ where: { id: u.id }, data: u.data })));
    console.log(`\nApplied ${updates.length} changes (${REVISION_ID}).`);
  } finally {
    await db.$disconnect();
  }
}

// Run only when executed directly, so tests can import REWRITES.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
