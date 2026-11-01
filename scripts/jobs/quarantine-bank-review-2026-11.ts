#!/usr/bin/env tsx

/**
 * Pulls the items the 2026-11-01 bank review found unservable out of service.
 * Dry-run by default; --apply sets status REVIEW (reversible) and records the
 * reason in metadata.statusChange. A second --apply changes nothing.
 *
 *   npx tsx scripts/jobs/quarantine-bank-review-2026-11.ts
 *   npx tsx scripts/jobs/quarantine-bank-review-2026-11.ts --apply
 *   npx tsx scripts/jobs/quarantine-bank-review-2026-11.ts --set images [--apply]
 *   npx tsx scripts/jobs/quarantine-bank-review-2026-11.ts --set content [--apply]
 *   npx tsx scripts/jobs/quarantine-bank-review-2026-11.ts --set images-2 [--apply]
 *
 * Sets: default = 6 KET Part 1 items + 4 picture items without an image
 * (applied 2026-11-01); "images" = 30 items whose attached image is broken
 * (404) or unrelated to the task (checked by eye against the downloaded
 * image, 2026-11-01; scripts/jobs/.out/image-mismatch-ids.json);
 * "content" = 23 PRETEST grammar items whose sentence was never stored (the
 * candidate sees only "Complete the sentence."), 5 items with the key in the
 * stem or two defensible keys, and one item of each of 4 exact-duplicate
 * pairs (the copy at the less fitting level or in the larger pool).
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

const NO_SENTENCE = "only an instruction is stored ('Complete the sentence.'); the sentence with the gap was lost at generation";
const CONTENT_BY_CODE: Record<string, string> = {
  "GRM-A1-0011": "two defensible keys ('The research' / zero article 'Research suggests…'); sentence is not A1",
  "VOC-A1-0040": "key in the stem ('We eat ___ and chips at the fish restaurant')",
  "VOC-B2-0066": "key in the stem ('In formal writing … more ___ synonyms', key 'formal')",
  "VOC-C2-0050": "key in the stem ('… appropriate epistemic uncertainty', key 'epistemic')",
  "GRM-B2-0096": "two defensible keys (general truth in reported speech: 'rises' and 'rose')",
  "GRM-B1-0122": "exact duplicate of junior-grammar-a2-zero-conditional-055; zero conditional is A2, keep the A2 copy",
  "VOC-A2-0030": "exact duplicate stem of VOC-A1-0057 ('The opposite of cheap'); A1 word, keep the A1 copy",
  "VOC-A1-0039": "exact duplicate stem of primary-vocabulary-prea1-family-006; keep the copy in the small Primary pool",
  "GRM-A2-0083": "exact duplicate stem of junior-grammar-b1-passive-past-071 (also open to General profiles); keep one",
};
const CONTENT_BY_ID: Record<string, string> = {
  "cmp4g3tbz001io76li1mafggo": NO_SENTENCE, // A1 "Drag the correct words to complete the sentence."
  "cmp4k26ux0014o7c42kb07oga": NO_SENTENCE, // PRE_A1 "Drag the correct word to complete the sentence."
  "cmp4f8gf50001o76lib5jdpp8": NO_SENTENCE, // A1 "Choose the correct word to complete the sentence."
  "cmp4fkc6f000lo76lsl0f3mpv": NO_SENTENCE, // A1 "Drag the correct phrase to complete the sentence."
  "cmp4fkc6c000ko76l6i8ntjq4": NO_SENTENCE, // A1 "Drag and drop the correct words to complete the sentence."
  "cmp4k26v00015o7c4q3761bow": NO_SENTENCE, // PRE_A1 "Complete the sentence by dragging the correct word into the "
  "cmp4gbcj3001so76lxyy9c03t": NO_SENTENCE, // A1 "Complete the sentence."
  "cmp4g9ax6001ro76lroxop0gl": NO_SENTENCE, // A1 "Drag the correct word to complete the sentence."
  "cmp4hurf6000wo7ap13n9oofb": NO_SENTENCE, // A2 "Choose the best option to complete the sentence."
  "cmp4ieiku001mo7apz964nop2": NO_SENTENCE, // A2 "Choose the best word to complete the gap."
  "cmp4is76y0021o7apw3g6a7la": NO_SENTENCE, // A2 "Choose the best word for the gap."
  "cmp4izkjz002co7apvm59ntzc": NO_SENTENCE, // A2 "Choose the correct option to fill the blank."
  "cmp4h95xc0007o7apu7mhujs4": NO_SENTENCE, // A2 "Choose the best word to complete the sentence."
  "cmp4i7qa8001fo7apn15h2ouw": NO_SENTENCE, // A2 "Choose the best option to complete the blank."
  "cmp4g5mvr001jo76l6ftfkmff": NO_SENTENCE, // A1 "Choose the correct option to complete the sentence."
  "cmp4h48kh0001o7apo65f7023": NO_SENTENCE, // A2 "Choose the correct option to complete the sentence."
  "cmp4hgmwq000jo7aphda3obg2": NO_SENTENCE, // A2 "Choose the correct word to complete the sentence."
  "cmp4jwzjf000wo7c4vprfttti": NO_SENTENCE, // PRE_A1 "Drag the correct word into the gap."
  "cmp4jc3ds002so7ap49zhdiax": NO_SENTENCE, // A2 "Choose the best option for gap (4)."
  "cmp4i0h2j0015o7ap110scxag": NO_SENTENCE, // A2 "Choose the best word for gap (1)."
  "cmp4h95xf0008o7apxwkmije5": NO_SENTENCE, // A2 "Choose the best option to complete blank (1)."
  "cmp4is7740023o7ap1jxgak0x": NO_SENTENCE, // A2 "Choose the best word to fill gap (1)."
  "cmp4jc3di002qo7apor34h1ar": NO_SENTENCE, // A2 "Choose the best word for [[GAP_1]]."
};

// Second image pass (2026-11-01, all 38 hotlinked live images viewed): to REVIEW,
// or the picture removed where the item is complete without it.
const IMAGES2_REVIEW: Record<string, string> = {
  "VOC-PA1-0007": "the photo (a beach at sunset) contradicts the key 'library' of 'The photo looks like a ___'",
  "SPE-A2-0059-MVX1NDCI": "task asks about two pictures (city / countryside); one unrelated placeholder photo is attached",
  "SPE-B1-0070": "task asks about two pictures; a single photo of a phone is attached",
};
const IMAGES2_DROP_IMAGE: Record<string, string> = {
  "GRM-B1-0002": "photo shows rain already falling, which supports the distractor 'is raining'; the sentence works without it",
  "primary-vocabulary-prea1-colors-001": "placeholder photo (hand writing) next to 'Look at this color: 🔴'; the emoji is the stimulus",
};

async function images2() {
  await quarantine(IMAGES2_REVIEW, {});
  const items = await prisma.item.findMany({ where: { itemCode: { in: Object.keys(IMAGES2_DROP_IMAGE) } }, select: { id: true, itemCode: true, status: true, content: true, metadata: true } });
  for (const it of items) {
    const c = (it.content ?? {}) as Record<string, any>;
    if (!c.imageUrl) { console.log(`${it.itemCode!.padEnd(26)} image already removed`); continue; }
    console.log(`${it.itemCode!.padEnd(26)} ${it.status} → remove image: ${IMAGES2_DROP_IMAGE[it.itemCode!]}`);
    if (!APPLY) continue;
    const { imageUrl, ...rest } = c;
    await prisma.item.update({ where: { id: it.id }, data: { content: rest, version: { increment: 1 },
      metadata: { ...((it.metadata as object) ?? {}), editorialRevision: { at: new Date().toISOString(), by: ACTOR, reason: IMAGES2_DROP_IMAGE[it.itemCode!], previous: { imageUrl } } } } });
  }
}

const SET = process.argv.includes("--set") ? process.argv[process.argv.indexOf("--set") + 1] : "default";

async function main() {
  if (SET === "images") return quarantine({}, IMAGE_BY_ID);
  if (SET === "content") return quarantine(CONTENT_BY_CODE, CONTENT_BY_ID);
  if (SET === "images-2") return images2();
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
