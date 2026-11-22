#!/usr/bin/env tsx
/**
 * Revises the 13 PRE_A1 items the 2026-11-22 age review sent to REVIEW
 * (docs/quality/pre-a1-age-review-2026-11.md, revision section).
 *
 *   npx tsx scripts/jobs/apply-pre-a1-revisions.ts            # dry run: validates and prints the plan
 *   npx tsx scripts/jobs/apply-pre-a1-revisions.ts --apply    # writes it, in one transaction
 *
 * - 11 speaking prompts that depended on a missing or unsuitable picture, or
 *   modelled broken English, are rewritten so a 7–10-year-old can answer
 *   them without any picture. The picture is removed. Rubric and accepted
 *   answers are rewritten to match.
 * - The reading item with two defensible answers gets a question with one.
 * - The exact grammar duplicate is RETIRED.
 *
 * Revised items return to their pre-review status (PRETEST, isPretest) as
 * Primary items (`primary` tag, ageSuitability YOUNG_LEARNER), so they can
 * be calibrated. Previous content is kept under metadata.revision.
 * Only items still in REVIEW from the age review are touched.
 */
import "dotenv/config";
import { pathToFileURL } from "node:url";
import { PrismaClient, type Prisma } from "@prisma/client";
import { hasNothingToAnswer, validateItemStructure } from "../../src/lib/validation/item-schema.js";
import { itemRules } from "../../src/lib/quality/item-content-rules.js";
import { ageContextViolations } from "../../src/lib/content-factory/age-context.js";

const AGE_REVIEW_ID = "pre-a1-age-review-2026-11-22";
const REVISION_ID = "pre-a1-revisions-2026-11-22";

const speaking = (prompt: string, target: string, accepted: string) => {
  const rubric = `PRE_A1 spoken production for ages 7–10, answerable without a picture. ${target} The expected response is single words or very short phrases from high-frequency vocabulary; any short, relevant answer meets the task.`;
  return { prompt, rubric, scoringRubric: rubric, acceptableAnswers: [accepted] };
};

export interface Revision {
  id: string;
  action: "REWRITE" | "RETIRE";
  content?: Record<string, unknown>;
  /** Content keys to drop (picture, stale rationale). */
  drop?: string[];
  note: string;
}

export const REVISIONS: readonly Revision[] = [
  { id: "cmp4js2hl000oo7c4yvfhxqax", action: "RETIRE", note: "exact duplicate of cmp4js2hi000no7c4vj01wfdn" },
  {
    id: "cmp0bne1u0068nuc6jkcqhruy", action: "REWRITE", drop: ["imageUrl", "distractorRationale"], note: "was \"What is this?\" with no picture",
    content: speaking("What is in your pencil case? Say two or three things. For example: 'A pen.' 'A ruler.'",
      "The candidate names school objects they own.", "Names two or three school objects, e.g. 'A pencil.', 'A rubber.', 'Pens.'"),
  },
  {
    id: "cmp0brlr4006enuc6kwetwqp0", action: "REWRITE", drop: ["imageUrl", "distractorRationale"], note: "was \"What do you see?\" with no picture",
    content: speaking("Look around your room. What can you see? Say two or three things. For example: 'A door.' 'A chair.'",
      "The candidate names objects around them.", "Names two or three things in the room, e.g. 'A table.', 'A window.', 'My bag.'"),
  },
  {
    id: "cmp0brlu7006gnuc64gzoqgzw", action: "REWRITE", drop: ["imageUrl", "distractorRationale"], note: "asked about food and drink in a missing picture",
    content: speaking("What food do you like? What do you like to drink? Say one or two words for each. For example: 'Pizza.' 'Milk.'",
      "The candidate names food and drink they like.", "Names at least one food and one drink, e.g. 'Apples. Juice.', 'Rice and water.'"),
  },
  {
    id: "cmp0btn6u006inuc600os49ux", action: "REWRITE", drop: ["imageUrl", "distractorRationale"], note: "referred to market pictures that were missing",
    content: speaking("You are at a market with your friend. Your friend asks: 'What fruit do you like?' Say two or three fruits. For example: 'Apples.' 'Bananas.'",
      "The candidate names fruit.", "Names two or three fruits, e.g. 'Oranges.', 'Grapes and bananas.'"),
  },
  {
    id: "cmp0bpse3006dnuc6nt4rap4y", action: "REWRITE", drop: ["imageUrl", "distractorRationale"], note: "referred to two missing pictures (city, countryside)",
    content: speaking("Your friend asks: 'Where do you live? In a city or in a village?' Answer your friend. Then say one thing about your home. For example: 'A city. My home is small.'",
      "The candidate says where they live and gives one simple detail.", "Says city, town or village and one detail, e.g. 'A village. Big house.', 'City. I have a garden.'"),
  },
  {
    id: "cmp0byg8o006nnuc60ei66ayr", action: "REWRITE", drop: ["imageUrl", "distractorRationale"], note: "asked \"Which one do you like?\" with nothing to choose from",
    content: speaking("Your friend asks: 'Do you like cats or dogs?' Answer your friend. Then say why in one or two words. For example: 'Dogs. They are fun.'",
      "The candidate states a preference and gives a very simple reason.", "Chooses cats or dogs (or both / neither) with a simple reason, e.g. 'Cats. Soft.', 'Dogs. I like play.'"),
  },
  {
    id: "cmp0btn8f006jnuc6yl3vg3eu", action: "REWRITE", drop: ["imageUrl", "distractorRationale"], note: "said the friend would ask questions that were missing",
    content: speaking("You are at a park with your friend. Your friend asks you three questions. Answer each one with one word or a short sentence. 1. 'Do you like the park?' 2. 'What colour is the grass?' 3. 'Can you see a bird?'",
      "The candidate answers three simple yes/no and colour questions.", "Answers all three questions, e.g. 'Yes.', 'Green.', 'Yes, I can.'"),
  },
  {
    id: "cmp0bky2s0066nuc6jq5giaus", action: "REWRITE", drop: ["imageUrl", "distractorRationale"], note: "modelled \"What you like?\"",
    content: speaking("Your friend says: 'Hello! I like football. What do you like?' Tell your friend one or two things you like. For example: 'I like music.'",
      "The candidate says one or two things they like.", "Names one or two things they like, e.g. 'I like books.', 'Swimming. Games.'"),
  },
  {
    id: "cmp0bhxjv0064nuc6fps3ymjw", action: "REWRITE", drop: ["imageUrl", "distractorRationale"], note: "used an adult desk stock photo",
    content: speaking("Tell me about your best friend. What is your friend's name? How old is your friend? Say one or two short sentences.",
      "The candidate gives a name and an age.", "Gives a name and an age, e.g. 'Ali. He is eight.', 'My friend is Sara. Nine.'"),
  },
  {
    id: "cmp0brlso006fnuc6fya8nqkw", action: "REWRITE", drop: ["imageUrl", "distractorRationale"], note: "used an adult desk stock photo",
    content: speaking("Who is in your family? Say two or three people. For example: 'My mum.' 'My brother.'",
      "The candidate names family members.", "Names two or three family members, e.g. 'Mum, dad and sister.', 'My grandma.'"),
  },
  {
    id: "cmp0bne6b006anuc6u9srskv7", action: "REWRITE", drop: ["imageUrl", "distractorRationale"], note: "prompt said drawing, picture showed adult writing",
    content: speaking("Do you like drawing? What do you like to draw? Say one or two things. For example: 'Yes. Cats.'",
      "The candidate answers yes or no and names something they draw.", "Answers yes or no and names one or two things, e.g. 'Yes. Houses.', 'Yes, flowers and cars.'"),
  },
  {
    id: "cmp4fe3hn0001o79bqbpnzhi0", action: "REWRITE", note: "\"What is green?\" had two defensible answers",
    content: {
      prompt: "What is big?",
      passage: "This is a park. It is green. Trees are big. People are happy.",
      options: [
        { id: "A", text: "The park", isCorrect: false, rationale: "The text says the park is green. It does not say it is big." },
        { id: "B", text: "Trees", isCorrect: true, rationale: "The text says \"Trees are big.\"" },
        { id: "C", text: "People", isCorrect: false, rationale: "The text says people are happy, not big." },
        { id: "D", text: "Grass", isCorrect: false, rationale: "The text does not talk about grass." },
      ],
      correctAnswer: "B",
      distractorRationale: {
        A: "\"Park\" is the first thing in the text, so careless readers may pick it; the text describes it as green.",
        C: "\"People\" is in the text but is described as happy.",
        D: "Grass is often linked with parks, but it is not in the text.",
      },
    },
  },
];

type Hit = string;

/** Problems that block a revision. */
export function revisionProblems(skill: string, type: string | null, content: Record<string, unknown>): Hit[] {
  const problems: Hit[] = [];
  if (hasNothingToAnswer(content)) problems.push("nothing to answer");
  problems.push(...validateItemStructure(skill, content));
  problems.push(...itemRules({ id: "x", skill, type, content }).filter((h) => h.severity === "BLOCKER").map((h) => `${h.rule}: ${h.evidence}`));
  problems.push(...ageContextViolations(content, "YOUNG_LEARNER").map((v) => `age context: ${v}`));
  if (skill === "SPEAKING" && /\b(picture|photo|image)\b/i.test(String(content.prompt))) problems.push("prompt still refers to a picture");
  return problems;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const ids = REVISIONS.map((r) => r.id);
  const db = new PrismaClient();
  try {
    const items = await db.item.findMany({ where: { id: { in: ids } }, select: { id: true, itemCode: true, skill: true, type: true, cefrLevel: true, status: true, isPretest: true, tags: true, content: true, metadata: true } });
    const byId = new Map(items.map((item) => [item.id, item]));
    const updates: { id: string; data: Prisma.ItemUpdateInput }[] = [];
    let failed = 0;
    const revisedAt = new Date().toISOString();

    for (const revision of REVISIONS) {
      const item = byId.get(revision.id);
      const metadata = (item?.metadata ?? {}) as Record<string, any>;
      if (!item || item.status !== "REVIEW" || metadata.ageReview?.id !== AGE_REVIEW_ID) {
        console.log(`SKIP    ${revision.id}: not in REVIEW from ${AGE_REVIEW_ID} (status ${item?.status ?? "missing"})`);
        continue;
      }
      const label = `${item.itemCode ?? item.id} (${item.skill} ${item.cefrLevel})`;
      if (revision.action === "RETIRE") {
        console.log(`RETIRE  ${label} — ${revision.note}`);
        updates.push({ id: item.id, data: { status: "RETIRED", metadata: { ...metadata, revision: { id: REVISION_ID, action: "RETIRE", note: revision.note, revisedAt } } as Prisma.InputJsonValue } });
        continue;
      }
      const previousContent = item.content as Record<string, unknown>;
      const content: Record<string, unknown> = { ...previousContent, ...revision.content };
      for (const key of revision.drop ?? []) delete content[key];
      const problems = revisionProblems(item.skill, item.type, content);
      if (problems.length) {
        failed++;
        console.log(`FAIL    ${label} — ${problems.join("; ")}`);
        continue;
      }
      const back = metadata.ageReview?.previous ?? { status: "PRETEST", isPretest: true };
      console.log(`REWRITE ${label} — ${revision.note}\n        → ${String(content.prompt).slice(0, 110)}`);
      updates.push({
        id: item.id,
        data: {
          content: content as Prisma.InputJsonValue,
          status: back.status === "ACTIVE" ? "ACTIVE" : "PRETEST",
          isPretest: true,
          tags: item.tags.includes("primary") ? item.tags : [...item.tags, "primary"],
          ageSuitability: "YOUNG_LEARNER",
          metadata: { ...metadata, revision: { id: REVISION_ID, action: "REWRITE", note: revision.note, revisedAt, previousContent } } as Prisma.InputJsonValue,
        },
      });
    }

    const rewrites = updates.filter((u) => u.data.status !== "RETIRED").length;
    console.log(`\n${rewrites} to rewrite and return to the pretest pool, ${updates.length - rewrites} to retire, ${failed} failing validation.`);
    if (failed) { process.exitCode = 1; return; }
    if (!apply) { console.log("\nDry run. Pass --apply to write these changes."); return; }
    await db.$transaction(updates.map((update) => db.item.update({ where: { id: update.id }, data: update.data })));
    console.log(`\nApplied ${updates.length} changes (${REVISION_ID}).`);
  } finally {
    await db.$disconnect();
  }
}

// Run only when executed directly, so tests can import REVISIONS.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
