#!/usr/bin/env tsx
/**
 * Applies the 2026-11-22 age-suitability review of the pretest items that no
 * product line could serve (see docs/quality/pre-a1-age-review-2026-11.md).
 *
 *   npx tsx scripts/jobs/apply-pre-a1-age-review.ts            # dry run: checks and prints the plan
 *   npx tsx scripts/jobs/apply-pre-a1-age-review.ts --apply    # writes it, in one transaction
 *
 * APPROVE  → suitable for Primary (7-10): add the `primary` source tag and set
 *            ageSuitability YOUNG_LEARNER (status stays PRETEST), so Primary
 *            sessions can embed them for calibration. Two items also get a
 *            small wording fix.
 * REVISE   → not usable as written (missing or unsuitable stimulus, broken
 *            model language, two correct answers, duplicate): status REVIEW
 *            with the reason, so they leave the pretest pool and show up in
 *            the editorial queue.
 *
 * Every change stores the previous values under metadata.ageReview so it can
 * be reversed. Items whose state differs from what the review saw (no longer
 * in the pretest pool — PRETEST, or ACTIVE with isPretest — or already
 * answered as pretest) are skipped and reported.
 */
import "dotenv/config";
import { pathToFileURL } from "node:url";
import { PrismaClient, type Prisma } from "@prisma/client";

type Decision =
  | { id: string; decision: "APPROVE"; fix?: { field: "prompt"; from: string; to: string } }
  | { id: string; decision: "REVISE"; reason: string };

const REVIEW_ID = "pre-a1-age-review-2026-11-22";

const APPROVE = (id: string, fix?: { field: "prompt"; from: string; to: string }): Decision => ({ id, decision: "APPROVE", ...(fix ? { fix } : {}) });
const REVISE = (id: string, reason: string): Decision => ({ id, decision: "REVISE", reason });

export const DECISIONS: readonly Decision[] = [
  // Grammar PRE_A1 — everyday family, pets, toys and home: suitable for 7–10.
  ...[
    "cmp4jgge10003o7c4cojyg6ot", "cmp4k807o001io7c493708uhl", "cmp4jyfxu000zo7c4jhdbstsk", "cmp4k9a8g001ko7c4qmy57so4",
    "cmp4ji4xs0005o7c4588gqbpu", "cmp4je9690002o7c4yal4xzto", "cmp4jv54w000uo7c46fcs8s2e", "cmp4jwzji000xo7c4bmehs1b0",
    "cmp4js2hi000no7c4vj01wfdn", "cmp4k06sy0012o7c4bylkcsx2", "cmp4k6pws001fo7c4hcjtmm4r", "cmp4k3hez0019o7c4h9w4lprh",
    "cmp4jmkbm000fo7c4by0h2cql", "cmp4je9660001o7c4rw88losj", "cmp4je9600000o7c4hex9xj9l", "cmp4ji4xy0007o7c4y31gzl1a",
    "cmp4jgge60004o7c4gewtyxs7", "cmp4jky53000bo7c4slqioalx", "cmp4jjr2u000ao7c4tfocg1nw", "cmp4jmkbp000go7c4lkg5skg8",
    "cmp4jky56000co7c48zi1xfdn", "cmp4jky59000do7c4o8gg7563", "cmp4jmkbi000eo7c4x703bap5", "cmp4jow1i000ho7c43sv4hczl",
    "cmp4jow1o000jo7c484rebhec", "cmp4jqgwe000lo7c4n0tappxy", "cmp4jv54q000so7c4cr0ptki7", "cmp4jt9z9000qo7c4npatnlq3",
    "cmp4jt9zc000ro7c4tuvy6e5c", "cmp4jwzin000vo7c4vd9u1dwe", "cmp4jv54t000to7c4q9o4qb0b", "cmp4jyfxr000yo7c4ecne1ok8",
    "cmp4jyfxx0010o7c4f4ncf5vq", "cmp4k06su0011o7c4t8nmpcgk", "cmp4k06t00013o7c4u204v1hz", "cmogduky20001nu77rkiy30te",
    "cmp4k3hew0018o7c4c53roh1h", "cmp4k58af001ao7c44gqwea0w", "cmp4k58aj001bo7c4eksqbh6k", "cmp4k58an001co7c4t7rvzykk",
    "cmp4k6pwm001do7c4favdb0xc", "cmp4k6pwq001eo7c40kzl7mbf", "cmp4k9a8d001jo7c4vfvtsbel",
  ].map((id) => APPROVE(id)),
  REVISE("cmp4js2hl000oo7c4yvfhxqax", "duplicate of cmp4js2hi000no7c4vj01wfdn (\"This ___ a pen.\")"),

  // Speaking PRE_A1 — usable as written.
  APPROVE("cmp0bpsan006bnuc6p4cq55t7"),
  APPROVE("cmp0bpscb006cnuc6fmwcsc02"),
  APPROVE("cmp0bygnv006pnuc62yixfzvd", { field: "prompt", from: "Imagine you are at a new class.", to: "Imagine you are in a new class." }),
  APPROVE("cmp0btn3e006hnuc6yvg8suni"),
  APPROVE("cmp0bky0z0065nuc6k6u2ey4z"),
  APPROVE("cmp0bky4e0067nuc6ilgezmyf"),
  // Speaking PRE_A1 — not answerable or not suitable as written.
  REVISE("cmp0bne1u0068nuc6jkcqhruy", "asks \"What is this?\" but has no picture"),
  REVISE("cmp0brlr4006enuc6kwetwqp0", "asks \"What do you see?\" but has no picture"),
  REVISE("cmp0brlu7006gnuc64gzoqgzw", "asks about food and drink \"you see\" but has no picture"),
  REVISE("cmp0btn6u006inuc600os49ux", "refers to pictures the friend shows, but has none"),
  REVISE("cmp0bpse3006dnuc6nt4rap4y", "refers to two pictures (city, countryside), but has none"),
  REVISE("cmp0byg8o006nnuc60ei66ayr", "asks \"Which one do you like?\" with nothing to choose from"),
  REVISE("cmp0btn8f006jnuc6yl3vg3eu", "says the friend will ask questions about the park, but the questions are missing"),
  REVISE("cmp0bky2s0066nuc6jq5giaus", "models ungrammatical English to children (\"What you like?\")"),
  REVISE("cmp0bhxjv0064nuc6fps3ymjw", "picture is an adult desk photo (hand writing next to a coffee mug), not a child-oriented scene"),
  REVISE("cmp0brlso006fnuc6fya8nqkw", "picture is an adult desk photo (hand writing next to a coffee mug), not a child-oriented scene"),
  REVISE("cmp0bne6b006anuc6u9srskv7", "prompt says the person draws, but the picture shows someone writing at an adult desk"),

  // Reading PRE_A1.
  APPROVE("cmp4fmhsp0008o79blcqca6ol"),
  APPROVE("cmp4fog8m000bo79b8bvh4sur"),
  REVISE("cmp4fe3hn0001o79bqbpnzhi0", "\"What is green?\" has two defensible answers (the park and the trees)"),

  // Vocabulary PRE_A1 — classroom and object words, suitable for 7–10.
  APPROVE("cmogdv2kw000enuk00pwmf5wn", { field: "prompt", from: "I sit on a ___. at school.", to: "I sit on a ___ at school." }),
  APPROVE("cmogdv2dx000anuk0day3e4l3"),
];

async function main() {
  const apply = process.argv.includes("--apply");
  const ids = DECISIONS.map((d) => d.id);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate item in DECISIONS");

  const db = new PrismaClient();
  try {
    const [items, answered] = await Promise.all([
      db.item.findMany({ where: { id: { in: ids } }, select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true, isPretest: true, tags: true, ageSuitability: true, content: true, metadata: true } }),
      db.response.groupBy({ by: ["itemId"], where: { itemId: { in: ids }, isPretest: true }, _count: { id: true } }),
    ]);
    const byId = new Map(items.map((item) => [item.id, item]));
    const answeredIds = new Set(answered.map((row) => row.itemId));

    const updates: { id: string; label: string; data: Prisma.ItemUpdateInput }[] = [];
    const skipped: string[] = [];
    const reviewedAt = new Date().toISOString();

    for (const decision of DECISIONS) {
      const item = byId.get(decision.id);
      if (!item) { skipped.push(`${decision.id}: not found`); continue; }
      const inPretestPool = item.status === "PRETEST" || (item.status === "ACTIVE" && item.isPretest);
      if (!inPretestPool) { skipped.push(`${decision.id}: status is ${item.status}, not in the pretest pool`); continue; }
      if (answeredIds.has(item.id)) { skipped.push(`${decision.id}: already has pretest responses`); continue; }
      const label = `${item.itemCode ?? item.id} (${item.skill} ${item.cefrLevel})`;
      const metadata = (item.metadata ?? {}) as Record<string, unknown>;
      const previous = { status: item.status, isPretest: item.isPretest, tags: item.tags, ageSuitability: item.ageSuitability };

      if (decision.decision === "APPROVE") {
        const content = { ...(item.content as Record<string, unknown>) };
        let fixed: { field: string; from: string; to: string } | undefined;
        if (decision.fix) {
          const current = String(content[decision.fix.field] ?? "");
          if (!current.includes(decision.fix.from)) { skipped.push(`${decision.id}: wording fix target not found`); continue; }
          content[decision.fix.field] = current.replace(decision.fix.from, decision.fix.to);
          fixed = decision.fix;
        }
        updates.push({
          id: item.id,
          label: `APPROVE ${label}${fixed ? ` — "${fixed.from}" → "${fixed.to}"` : ""}`,
          data: {
            tags: item.tags.includes("primary") ? item.tags : [...item.tags, "primary"],
            ageSuitability: "YOUNG_LEARNER",
            ...(fixed ? { content: content as Prisma.InputJsonValue } : {}),
            metadata: { ...metadata, ageReview: { id: REVIEW_ID, decision: "APPROVE", reviewedAt, previous, ...(fixed ? { wordingFix: fixed } : {}) } } as Prisma.InputJsonValue,
          },
        });
      } else {
        updates.push({
          id: item.id,
          label: `REVISE  ${label} — ${decision.reason}`,
          data: {
            status: "REVIEW",
            metadata: { ...metadata, ageReview: { id: REVIEW_ID, decision: "REVISE", reason: decision.reason, reviewedAt, previous } } as Prisma.InputJsonValue,
          },
        });
      }
    }

    for (const update of updates) console.log(update.label);
    const approve = updates.filter((u) => u.label.startsWith("APPROVE")).length;
    console.log(`\n${approve} to approve for Primary, ${updates.length - approve} to send to REVIEW, ${skipped.length} skipped.`);
    for (const line of skipped) console.log(`  skipped ${line}`);

    if (!apply) {
      console.log("\nDry run. Pass --apply to write these changes.");
      return;
    }
    await db.$transaction(updates.map((update) => db.item.update({ where: { id: update.id }, data: update.data })));
    console.log(`\nApplied ${updates.length} changes (${REVIEW_ID}).`);
  } finally {
    await db.$disconnect();
  }
}

// Run only when executed directly, so tests can import DECISIONS.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
