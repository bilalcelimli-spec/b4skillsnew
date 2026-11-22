#!/usr/bin/env tsx
/**
 * Rewrites the speaking items whose prompt assumed an examiner, interlocutor
 * or partner as monologues (docs/quality/rubric-item-activation-2026-11.md).
 *
 *   npx tsx scripts/jobs/apply-speaking-monologue-rewrite.ts            # dry run: validates and prints the plan
 *   npx tsx scripts/jobs/apply-speaking-monologue-rewrite.ts --apply    # writes it, in one transaction
 *
 * Speaking in b4skills is a recorded monologue, scored by the AI ensemble
 * and human raters with nobody present. On 2026-11-22, 76 of 491 speaking
 * prompts matched INTERLOCUTOR and 10 more (all pretest) matched only
 * REPLY_EXPECTED. SPK-C2-0009 is rewritten by apply-c2-academia-rewrite.ts;
 * the other 85 are in speaking-monologue-rewrites.ts.
 *
 * Each rewrite keeps CEFR level, topic, prepTime and responseTime, and
 * changes prompt, taskType, sampleBullets and, where they described an
 * interaction, rubric, cefrDescriptor and the junior items' purpose and
 * contextNote. A string scoringRubric that duplicated the old rubric
 * follows the new one. Tags, genre and two shared seed band descriptors
 * that named the old format are mapped (discussion → monologue, …).
 *
 * After the rewrite no content string may match INTERLOCUTOR or
 * REPLY_EXPECTED, and the C2 rewrite's rewriteProblems checks must pass.
 *
 * Status, pretest flag, stage and parameters are unchanged. 46 of the items
 * are live, so --apply changes what candidates see. version is incremented
 * and every update is guarded on the version and updatedAt read here; a
 * concurrent edit rolls the whole batch back. Previous content, tags and
 * genre are kept under metadata.revision. Items with review records are
 * skipped, because the rewrite voids the reviewed content hash.
 */
import "dotenv/config";
import { pathToFileURL } from "node:url";
import { PrismaClient, type Prisma } from "@prisma/client";
import { INTERLOCUTOR, rewriteProblems } from "./apply-c2-academia-rewrite.js";
import { MONOLOGUE_REWRITES, type MonologueRewrite } from "./speaking-monologue-rewrites.js";

export { INTERLOCUTOR, MONOLOGUE_REWRITES };

const REVISION_ID = "speaking-monologue-rewrite-2026-11-22";

/** Rewritten by apply-c2-academia-rewrite.ts, not here. */
export const HANDLED_ELSEWHERE = new Set(["SPK-C2-0009"]);

/**
 * Wording INTERLOCUTOR misses that still needs somebody to answer back:
 * a listener's follow-up questions, a conversation someone starts, a turn
 * the candidate waits for. An imagined listener who only hears the
 * candidate ("Tell your friend Alex…") does not match.
 */
export const REPLY_EXPECTED = /\b(?:follow-up questions?|(?:examiner|interviewer|interlocutor|partner|panel member)'s\b|will ask you|asks? you (?:some |more )?questions|starts? the conversation|will (?:start|initiate) the|have a conversation|engage in a conversation|take turns|turn-taking|decide together|agree together|listen to (?:\w+'s|their|his|her) (?:suggestion|idea|opinion|view|concern)s?|respond(?:s|ing)? to (?:their|his|her) (?:questions|ideas|opinions|views|challenges))\b/i;

/** Tags and genres that named the interactive format. */
export const TAG_MAP: Record<string, string> = {
  discussion: "monologue",
  debate: "monologue",
  roleplay: "monologue",
  collaborative: "monologue",
  "format:speaking_role_play": "format:speaking_monologue",
};
export const GENRE_MAP: Record<string, string> = { discussion: "opinion" };

/** Shared seed band descriptors (scoringRubric[].descriptor) that describe an interaction. */
export const DESCRIPTOR_MAP: Record<string, string> = {
  "Maintains interaction on familiar topics; can express main points.": "Addresses the task on familiar topics; can express main points clearly.",
  "Limited but adequate repertoire for basic interactions.": "Limited but adequate repertoire for basic transactions.",
};

/** Every string anywhere in the content, with its path. */
export function contentStrings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => contentStrings(v, `${path}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => contentStrings(v, path ? `${path}.${k}` : k));
  return [];
}

/** Content fields that still assume somebody answers back. */
export function interlocutorFields(content: Record<string, unknown>): string[] {
  return contentStrings(content).filter(([, text]) => INTERLOCUTOR.test(text) || REPLY_EXPECTED.test(text)).map(([path]) => path);
}

/** Problems that block a monologue rewrite: the C2 rewrite's checks plus every content field. */
export function monologueProblems(type: string | null, content: Record<string, unknown>): string[] {
  const problems = rewriteProblems("SPEAKING", type, content);
  const fields = interlocutorFields(content);
  if (fields.length) problems.push(`still assumes an interlocutor in ${fields.join(", ")}`);
  return problems;
}

export function applyMonologueRewrite(rewrite: MonologueRewrite, item: { tags: string[]; genre: string | null; content: Record<string, unknown> }) {
  const previous = item.content;
  const content: Record<string, unknown> = { ...previous, ...rewrite.content };
  // A string scoringRubric that duplicated the rubric follows the new rubric.
  if ("rubric" in rewrite.content && !("scoringRubric" in rewrite.content) && typeof previous.scoringRubric === "string" && previous.scoringRubric === previous.rubric)
    content.scoringRubric = rewrite.content.rubric;
  if (Array.isArray(content.scoringRubric))
    content.scoringRubric = content.scoringRubric.map((band) => {
      const descriptor = (band as { descriptor?: unknown })?.descriptor;
      return typeof descriptor === "string" && DESCRIPTOR_MAP[descriptor] ? { ...band, descriptor: DESCRIPTOR_MAP[descriptor] } : band;
    });
  for (const key of rewrite.drop ?? []) delete content[key];
  const tags = [...new Set(item.tags.map((tag) => TAG_MAP[tag] ?? tag))];
  const genre = item.genre ? GENRE_MAP[item.genre] ?? item.genre : item.genre;
  return { content, tags, genre };
}

const isLive = (item: { status: string; isPretest: boolean }) => item.status === "ACTIVE" && !item.isPretest;

async function main() {
  const apply = process.argv.includes("--apply");
  const db = new PrismaClient();
  try {
    // Re-scan the bank so a newly added interlocutor prompt is reported, not silently missed.
    const speaking = await db.item.findMany({ where: { skill: "SPEAKING" }, select: { id: true, itemCode: true, content: true } });
    const known = new Set(MONOLOGUE_REWRITES.map((r) => r.id));
    const unlisted = speaking.filter((i) => {
      const prompt = String((i.content as Record<string, unknown> | null)?.prompt ?? "");
      return (INTERLOCUTOR.test(prompt) || REPLY_EXPECTED.test(prompt)) && !known.has(i.id) && !HANDLED_ELSEWHERE.has(i.itemCode ?? "");
    });

    const items = await db.item.findMany({
      where: { id: { in: [...known] } },
      include: { _count: { select: { itemReviews: true } } },
    });
    const updates: { id: string; version: number; updatedAt: Date; data: Prisma.ItemUpdateManyMutationInput }[] = [];
    let failed = 0;
    let live = 0;
    const revisedAt = new Date().toISOString();
    for (const rewrite of MONOLOGUE_REWRITES) {
      const label = rewrite.itemCode ?? rewrite.id;
      const item = items.find((i) => i.id === rewrite.id);
      if (!item) { console.log(`SKIP    ${label}: not found`); continue; }
      if (item.skill !== "SPEAKING") { failed++; console.log(`FAIL    ${label}: not a speaking item`); continue; }
      if (item._count.itemReviews > 0) { console.log(`SKIP    ${label}: has review records; a rewrite would void them`); continue; }
      const metadata = (item.metadata ?? {}) as Record<string, unknown>;
      if ((metadata.revision as { id?: string } | undefined)?.id === REVISION_ID) { console.log(`SKIP    ${label}: already rewritten`); continue; }
      const previousContent = (item.content ?? {}) as Record<string, unknown>;
      const next = applyMonologueRewrite(rewrite, { tags: item.tags, genre: item.genre, content: previousContent });
      const problems = monologueProblems(item.type, next.content);
      if (problems.length) { failed++; console.log(`FAIL    ${label} — ${problems.join("; ")}`); continue; }
      if (isLive(item)) live++;
      console.log(`REWRITE ${label} (${item.cefrLevel} ${item.status}${item.isPretest ? " pretest" : ""}) — ${rewrite.note}\n        → ${String(next.content.prompt).replace(/\s+/g, " ").slice(0, 140)}…`);
      updates.push({
        id: item.id,
        version: item.version,
        updatedAt: item.updatedAt,
        data: {
          content: next.content as Prisma.InputJsonValue,
          tags: next.tags,
          genre: next.genre,
          version: { increment: 1 },
          metadata: { ...metadata, revision: { id: REVISION_ID, action: "REWRITE", note: rewrite.note, revisedAt, previousVersion: item.version, previousContent, previousTags: item.tags, previousGenre: item.genre } } as Prisma.InputJsonValue,
        },
      });
    }
    for (const i of unlisted) {
      failed++;
      console.log(`FAIL    ${i.itemCode ?? i.id}: prompt assumes an interlocutor but has no rewrite`);
    }
    console.log(`\n${updates.length} to rewrite (${live} live), ${failed} failing validation.`);
    if (failed) { process.exitCode = 1; return; }
    if (!apply) { console.log("\nDry run. Pass --apply to write these changes."); return; }
    await db.$transaction(async (tx) => {
      for (const u of updates) {
        const result = await tx.item.updateMany({ where: { id: u.id, version: u.version, updatedAt: u.updatedAt }, data: u.data });
        if (result.count !== 1) throw new Error(`Item ${u.id} changed since it was read; nothing was written.`);
      }
    }, { timeout: 60_000 });
    console.log(`\nApplied ${updates.length} changes (${REVISION_ID}).`);
  } finally {
    await db.$disconnect();
  }
}

// Run only when executed directly, so tests can import the rewrites.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
