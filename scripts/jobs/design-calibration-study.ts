#!/usr/bin/env tsx

/**
 * Read-only. Assembles linked calibration forms from the item bank.
 *
 *   npx tsx scripts/jobs/design-calibration-study.ts \
 *     [--skills READING,LISTENING] [--cefr B2,C1,C2] [--form-length 30] \
 *     [--anchor-share 0.2] [--target-se 0.25]
 *
 * Output: scripts/jobs/.out/calibration-study/{design.json,forms.csv}
 */

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma.js";
import { assembleForms, planSample, type DesignItem } from "../../src/lib/calibration-study/form-design.js";

const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
};
const skills = arg("skills", "READING,LISTENING").split(",");
const cefr = arg("cefr", "B2,C1,C2").split(",");
const formLength = Number(arg("form-length", "30"));
const anchorShare = Number(arg("anchor-share", "0.2"));
const targetSe = Number(arg("target-se", "0.25"));

async function main() {
  const rows = await prisma.item.findMany({
    where: { status: "ACTIVE" as any, type: "MULTIPLE_CHOICE" as any, skill: { in: skills as any }, cefrLevel: { in: cefr as any } },
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, difficulty: true, content: true },
    orderBy: { id: "asc" },
  });

  const items: DesignItem[] = rows.map((r) => {
    const c: any = r.content ?? {};
    const text = String(c.passage ?? c.ttsScript ?? c.transcript ?? c.audioScript ?? "").trim();
    const groupKey = text ? "t:" + createHash("sha1").update(text).digest("hex").slice(0, 12) : "i:" + r.id;
    return { id: r.id, itemCode: r.itemCode, groupKey, b: r.difficulty, skill: r.skill, cefr: r.cefrLevel };
  });

  const design = assembleForms(items, { formLength, anchorShare });
  const plan = planSample(design, targetSe);
  const byId = new Map(items.map((i) => [i.id, i]));
  const anchors = new Set(design.anchorItemIds);

  const dir = "scripts/jobs/.out/calibration-study";
  mkdirSync(dir, { recursive: true });
  const csv = ["formId,itemId,itemCode,isAnchor,groupKey,seedB,skill,cefr"];
  for (const f of design.forms) for (const id of f.itemIds) {
    const it = byId.get(id)!;
    csv.push([f.formId, id, it.itemCode ?? "", anchors.has(id) ? 1 : 0, it.groupKey, it.b.toFixed(3), it.skill, it.cefr].join(","));
  }
  writeFileSync(`${dir}/forms.csv`, csv.join("\n"));
  writeFileSync(`${dir}/design.json`, JSON.stringify({ options: { skills, cefr, formLength, anchorShare, targetSe }, plan, design }, null, 2));

  const groups = new Set(items.map((i) => i.groupKey)).size;
  console.log(`items=${items.length} units(passages/standalone)=${groups}`);
  console.log(`forms=${design.forms.length} anchors=${design.anchorItemIds.length} (in every form)`);
  console.log("form sizes:", design.forms.map((f) => f.itemIds.length).join(", "));
  console.log(`target SE(b) ≤ ${targetSe}: ${plan.personsPerForm} persons per form → ${plan.totalPersons} persons total`);
  console.log(`each regular item answered by ~${plan.personsPerRegularItem}, each anchor by ~${plan.personsPerAnchor}`);
  const perCell: Record<string, number> = {};
  for (const i of items) perCell[`${i.skill}/${i.cefr}`] = (perCell[`${i.skill}/${i.cefr}`] ?? 0) + 1;
  console.log("items per cell:", JSON.stringify(perCell));
  console.log(`written to ${dir}/`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
