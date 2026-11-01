#!/usr/bin/env tsx

/**
 * Pulls the items the 2026-11-01 bank review found unservable out of service.
 * Dry-run by default; --apply sets status REVIEW (reversible) and records the
 * reason in metadata.statusChange. A second --apply changes nothing.
 *
 *   npx tsx scripts/jobs/quarantine-bank-review-2026-11.ts
 *   npx tsx scripts/jobs/quarantine-bank-review-2026-11.ts --apply
 *   npx tsx scripts/jobs/quarantine-bank-review-2026-11.ts --set images [--apply]
 *
 * Sets: default = 6 KET Part 1 items + 4 picture items without an image
 * (applied 2026-11-01); "images" = 30 items whose attached image is broken
 * (404) or unrelated to the task (checked by eye against the downloaded
 * image, 2026-11-01; scripts/jobs/.out/image-mismatch-ids.json).
 *
 * Report: scripts/jobs/.out/bank-review-2026-11-01.md
 */

import { prisma } from "../../src/lib/prisma.js";

const APPLY = process.argv.includes("--apply");
const ACTOR = "claude-code:bank-review-2026-11-01";

const KET = "Cambridge KET Part 1 task flattened into an MCQ: 8 options, no question stored, option set shared across the task's items";
const PICTURE = "asks about a picture that does not exist (no imageUrl; picture described in text)";

const BY_CODE: Record<string, string> = {
  "REA-A2-0150-MVX1N7S2": KET, "REA-A2-0150-MVX1N7VY": KET, "REA-A2-0150-MVX1N7QX": KET,
  "REA-A2-0150-MVX1N7UG": KET, "REA-A2-0150-MVX1N7T6": KET, "REA-A2-0150-MVX1N7XJ": KET,
  "WRI-PRE_A1-0031": PICTURE,
};
const BY_ID: Record<string, string> = {
  cmp4fgw580002o79b4x90pzva: PICTURE, cmp4fgw5b0003o79byupa4ggk: PICTURE, cmp4fk18k0005o79bl9kp7o3e: PICTURE,
};

const BROKEN = "attached image is gone (HTTP 404 at the image host); the task depends on it";
const MISMATCH = "attached image does not show what the task asks about (stock placeholder or unrelated photo; checked by eye)";
const IMAGE_BY_ID: Record<string, string> = {
  "cmp07hmey0000nuc6tdfmv127": MISMATCH, //                            
  "cmp07zbkb000rnuc6mrqtazsl": MISMATCH, //                            
  "cmp085a9g0010nuc6momcrt77": MISMATCH, //                            
  "cmp08cttx001fnuc6l6vqcox0": MISMATCH, //                            
  "cmp0adhy4004gnuc6z0k17jsh": MISMATCH, //                            
  "cmp0bvyi6006knuc6wlt07man": MISMATCH, //                            
  "cmp0bvyn1006mnuc65tph10qg": MISMATCH, //                            
  "cmp08nt8y001wnuc6utlb63hk": MISMATCH, //                            
  "cmp0bne4t0069nuc6ck8ff8el": MISMATCH, //                            
  "cmp07hmko0001nuc6zbfoxqmk": MISMATCH, //                            
  "cmp07nrvr0009nuc6bky9kvgt": MISMATCH, //                            
  "cmp07t6tg000knuc64rk5611v": MISMATCH, //                            
  "cmp07zbot000tnuc68ths1rmh": MISMATCH, //                            
  "cmp087sib0014nuc63iyffzy7": MISMATCH, //                            
  "cmp08ctsc001enuc6wdaw83t4": MISMATCH, //                            
  "cmp08ntao001xnuc68ys3ogoq": MISMATCH, //                            
  "cmp08tfi10025nuc649abvmdz": MISMATCH, //                            
  "cmp0axhvc005cnuc6no46q4r1": MISMATCH, //                            
  "cmp0axhpn005anuc6ks9fa3eb": MISMATCH, //                            
  "cmp0adi1e004hnuc6nhzfg64f": MISMATCH, //                            
  "cmp0agxdy004onuc6i2wjuo5b": MISMATCH, //                            
  "cmp0apmkh0050nuc6azrsoavm": MISMATCH, //                            
  "cmp07ns1e000bnuc6545tfplq": MISMATCH, //                            
  "cmp07zbna000snuc64ftxizqp": MISMATCH, //                            
  "cmp08tfjn0026nuc6zfwqh1sn": MISMATCH, //                            
  "cmp0bhxgq0062nuc67yh1dqyj": BROKEN, //                            
  "cmp087so10016nuc6liw5smrl": BROKEN, //                            
  "cmp0bhxia0063nuc6qz20f39j": BROKEN, //                            
  "cmouj7hzn0022numgml7vgwxf": BROKEN, // primary-speaking-a1-a1-075 Look at a picture of a family at the park. Describe what you see. Use 
  "cmogdurn1003onu775seo3v88": BROKEN, // GRM-A2-0031                The train ___ be delayed; look at the board.
};

const SET = process.argv.includes("--set") ? process.argv[process.argv.indexOf("--set") + 1] : "default";

async function main() {
  if (SET === "images") return quarantine({}, IMAGE_BY_ID);
  if (SET !== "default") throw new Error(`unknown set "${SET}"`);
  return quarantine(BY_CODE, BY_ID);
}

async function quarantine(BY_CODE: Record<string, string>, BY_ID: Record<string, string>) {
  const items = await prisma.item.findMany({
    where: { OR: [{ itemCode: { in: Object.keys(BY_CODE) } }, { id: { in: Object.keys(BY_ID) } }] },
    select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true, content: true, metadata: true },
  });
  const expected = Object.keys(BY_CODE).length + Object.keys(BY_ID).length;
  console.log(`${items.length}/${expected} items found${APPLY ? "" : " (dry run)"}`);
  let changed = 0;
  for (const it of items) {
    const reason = BY_ID[it.id] ?? BY_CODE[it.itemCode ?? ""];
    const opts = Array.isArray((it.content as any)?.options) ? (it.content as any).options.length : "-";
    const line = `${(it.itemCode ?? it.id).padEnd(26)} ${it.skill} ${it.cefrLevel} ${it.status} options=${opts}`;
    if (!["ACTIVE", "PRETEST"].includes(it.status)) { console.log(`${line}  skip (not in service)`); continue; }
    console.log(`${line}  → REVIEW: ${reason}`);
    if (!APPLY) continue;
    await prisma.item.update({ where: { id: it.id }, data: {
      status: "REVIEW",
      metadata: { ...((it.metadata as object) ?? {}), statusChange: { from: it.status, to: "REVIEW", at: new Date().toISOString(), by: ACTOR, reason } },
    } });
    changed++;
  }
  console.log(APPLY ? `moved ${changed} items to REVIEW` : "no changes written");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
