#!/usr/bin/env tsx

/**
 * Primary / Junior content repairs from the October 2026 manual read of both
 * pools, plus the same defect classes found bank-wide by the audit rules that
 * read produced. Dry-run by default.
 *
 *   npx tsx scripts/jobs/repair-young-learner-items.ts                      # plan only
 *   npx tsx scripts/jobs/repair-young-learner-items.ts --apply=quarantine   # ACTIVE -> REVIEW
 *   npx tsx scripts/jobs/repair-young-learner-items.ts --apply=revisions    # content fixes
 *
 * Quarantine: items whose defect needs new content or a new picture. Status
 * goes to REVIEW (reversible); the reason is kept in metadata.statusChange.
 *
 * Revisions: items with more than one defensible answer, or whose question was
 * never shown. Only the prompt or an option's wording changes; the keyed option never moves.
 * The previous prompt/options are kept in metadata.editorialRevision and the
 * item version is incremented. These edits were written by an AI reviewer and
 * are NOT expert-approved; the review contract still applies to the new version.
 *
 * Both steps skip anything that no longer matches what was reviewed, so a
 * second run changes nothing.
 */

import { prisma } from "../../src/lib/prisma.js";

const APPLY = process.argv.find((a) => a.startsWith("--apply="))?.slice("--apply=".length);
const ACTOR = "claude-code:young-learner-review-2026-10";

const QUARANTINE: Record<string, string> = {
  // variant
  "cmovnrbi30000nur8ptc06oag": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmovnrbl10001nur89yfveli1": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmovnrbmf0002nur80q8xqrt5": "Wrong key: text says \"two children\"; no alternative is correct (key was \"windows\"). Also has a \"(variant)\" placeholder option",
  "cmovnrbnt0003nur8rkna2n6d": "Wrong key: text says the dress is red; key was \"yellow\". Also has a \"(variant)\" placeholder option",
  "cmovnrbp80004nur8cqa3iqau": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmovnv69h0000nunkwm5zm1yh": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmovnv6cm0001nunknl4mdjm0": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmovnv6gw0004nunkers4aqf5": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmovnv6ib0005nunkgeb70mil": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmovnw58y0006nunkh4whly3s": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmovo4s6m002knunk62hyurrp": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmovo4s8b002lnunklq5hacdh": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmovo4s9p002mnunkzuga02fk": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmovo4sb2002nnunkesxlluk9": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmovo4scg002onunkoy0remu0": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmovo4sdu002pnunkry7cyb9p": "Generator placeholder option \"(variant)\" duplicates another alternative",
  // image
  "cmogdv1z90002nuk0ygzddbmv": "Picture does not show what the task asks about (or none is attached)",
  "cmogdv311000nnuk0rv1514en": "Picture does not show what the task asks about (or none is attached)",
  "cmogdv3w10014nuk0tl0w1c7c": "Picture does not show what the task asks about (or none is attached)",
  "cmogdv4zr001onuk032yrjvwf": "Picture does not show what the task asks about (or none is attached)",
  "cmogdv6aq002enuk0wdb3t5vs": "Picture does not show what the task asks about (or none is attached)",
  "cmogdv1v70001nuk0ddfohzyp": "Picture does not show what the task asks about (or none is attached)",
  "cmogdv32o000onuk0qkc3u1uk": "Picture does not show what the task asks about (or none is attached)",
  "cmogdv4050015nuk0scbe2re0": "Picture does not show what the task asks about (or none is attached)",
  "cmogdv4y6001nnuk0hnmp09oh": "Picture does not show what the task asks about (or none is attached)",
  "cmogdv8q5003pnuk05g0kr9j5": "Picture does not show what the task asks about (or none is attached)",
  // speaking
  "cmoukee8p0002nu2j9wo7knzq": "Task depends on a human examiner or a stimulus that is not shown",
  "cmoukeea30003nu2j8lb0l5lc": "Task depends on a human examiner or a stimulus that is not shown",
  "cmoukeeeh0005nu2jimxup3wb": "Task depends on a human examiner or a stimulus that is not shown",
  "cmoukeek90009nu2jbohlyicx": "Task depends on a human examiner or a stimulus that is not shown",
  "cmoukef2x000lnu2jxsgfe5lk": "Task depends on a human examiner or a stimulus that is not shown",
  // writing
  "cmoukeld4000cnu8baxiaqgn4": "Pictures are missing and the bracketed descriptions give the answers",
  // found bank-wide by the audit rules added after the Primary/Junior read (2026-10-14)
  "cmogdv2180003nuk0cccn4ia2": "Picture comes from a placeholder service and does not show what the task asks about",
  "cmogdv24g0005nuk0apgna3e6": "Picture comes from a placeholder service and does not show what the task asks about",
  "cmogdv27v0007nuk07d59tv9j": "Picture comes from a placeholder service and does not show what the task asks about",
  "cmogdv29l0008nuk0gtjodgq8": "Picture comes from a placeholder service and does not show what the task asks about",
  "cmorsvo810008nuf7mocz7fr2": "Task refers to a picture but none is attached",
  "cmoukeels000anu2ji7a311zs": "Prompt shows instructions written for a human examiner",
  "cmoukeeom000cnu2jspik1vjj": "Prompt shows instructions written for a human examiner",
  "cmoukeeyt000inu2jqpwgg9py": "Prompt shows instructions written for a human examiner",
  "cmoukekwr0002nu8b767zo8fr": "Task refers to a picture but none is attached",
  "cmoukekyb0003nu8btlg4r6oh": "Task refers to a picture but none is attached",
  "cmoukel150005nu8bv7t7627b": "Task refers to a picture but none is attached",
  "cmovnrbqn0005nur8pcq90d3q": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmovnv6e20002nunkef55zidz": "Generator placeholder option \"(variant)\" duplicates another alternative",
  "cmp085abw0011nuc6tmql49l8": "Task refers to a picture but none is attached",
  "cmp087sl80015nuc6nvnxtoc0": "Task refers to a picture but none is attached",
  "cmp08icoh001mnuc66tbytqgh": "Task refers to a picture but none is attached",
  "cmp08icu4001onuc6fam4byqq": "Task refers to a picture but none is attached",
  "cmp08nt78001vnuc6ksz04jwd": "Task refers to a picture but none is attached",
  "cmp08tfgh0024nuc6tsthvh9v": "Task refers to a picture but none is attached",
  "cmp0al73k004tnuc6pmamsrfo": "Task refers to a picture but none is attached",
  "cmp0bygma006onuc6yaemlg0a": "Prompt shows instructions written for a human examiner",
  "cmp4ji4xv0006o7c4tqjez5yr": "Generator placeholder option \"(variant)\" duplicates another alternative",
};

interface Revision {
  reason: string;
  /** Guard: the prompt as reviewed. A different prompt means someone edited the item since. */
  from: string;
  prompt?: string;
  options?: Record<string, { text: string; rationale: string }>;
  /** The keyed option's wording is corrected; which option is keyed still does not change. */
  rewordsKey?: boolean;
}

const REVISIONS: Record<string, Revision> = {
  cmorsutkh000gnuyiosplk02a: { // GRM-PA1-0025
    reason: "With no picture, 'in', 'on' and 'under' were all correct.",
    from: "The cat is ___ the box.", prompt: "The water is ___ the bottle." },
  cmorsutm1000hnuyiiwv0mkkn: { // GRM-PA1-0026
    reason: "'under' was also correct.",
    from: "The book is ___ the table.",
    options: { B: { text: "to", rationale: "'To' shows movement towards a place; it does not say where something is." } } },
  cmorsutix000fnuyilp8uk4ff: { // GRM-PA1-0024
    reason: "'could' also makes a correct sentence.",
    from: "She ___ swim.",
    options: { D: { text: "can to", rationale: "A modal verb is followed by the base verb without 'to'." } } },
  cmorsuu0k000pnuyikk199w4q: { // GRM-PA1-0034
    reason: "'liked' also makes a correct sentence.",
    from: "I ___ pizza.",
    options: { B: { text: "am like", rationale: "'Am' is not used before the base verb 'like' to say what you enjoy." } } },
  cmogduudw0053nu77i1mzpbfz: { // GRM-A1-0030
    reason: "British 'at the weekend' and American 'on the weekend' were both offered; the key was the American form.",
    from: "I’ll see you ___ the weekend.", prompt: "I’ll see you ___ Saturday." },
  cmogduuu2005cnu77kfahtvz8: { // GRM-A1-0031
    reason: "'opens' was also correct ('The door opens with a key').",
    from: "The door ___ with a key.",
    options: { B: { text: "is opens", rationale: "'Is' cannot be followed by the present simple form 'opens'." } } },
  cmouj7gjb0016numgvi3ne8c5: { // primary-grammar-a1-can-043
    reason: "'doesn't' was also correct.",
    from: "My baby brother ___ walk yet.",
    options: { A: { text: "don't", rationale: "'Don't' is not used with he/she/it." } } },
  cmouj7h64001knumgrvxilvgb: { // primary-grammar-a2-past-simple-irregular-057
    reason: "Without a time reference 'build' and 'are building' were also correct.",
    from: "The children ___ a sandcastle at the beach.", prompt: "Yesterday, the children ___ a sandcastle at the beach." },
  cmouj7832000gnuw7tesepyuh: { // primary-vocabulary-a1-weather-017
    reason: "'rains heavily' and 'becomes windy' are also true of winter.",
    from: "In winter, it sometimes ___.", prompt: "When it ___, the ground is white and we can make a snowman.",
    options: {
      B: { text: "rains", rationale: "Rain does not make the ground white and you cannot make a snowman from it." },
      C: { text: "is sunny", rationale: "Sunny weather does not make the ground white." },
      D: { text: "is windy", rationale: "Wind does not make the ground white." } } },
  cmouj77yt000enuw7umv8h3mm: { // primary-vocabulary-a1-food-015
    reason: "A tomato does not grow in the ground, and a red onion does.",
    from: "A healthy red vegetable that grows in the ground is a ___.", prompt: "A ___ is red and round. We often put it in salads.",
    options: { A: { text: "cucumber", rationale: "A cucumber is green and long, not red and round." } } },
  cmouj8f330013nub8f5beab0u: { // junior-grammar-a1-possessives-040
    reason: "The teacher's gender was not given, so 'his' was as correct as 'her'.",
    from: "That is the teacher's desk. It is ___ desk.", prompt: "That is Mrs Green's desk. It is ___ desk." },
  cmouj8dmr0009nub86k5kh7ia: { // junior-vocabulary-a1-music-010
    reason: "'ensemble' also fits the definition and the article 'an'.",
    from: "A group of musicians who play together is called an ___.",
    options: { B: { text: "instrument", rationale: "An instrument is the object a musician plays, not a group of musicians." } } },
  cmorthext002mnu6njztk5w50: { // VOC-B1-0065
    reason: "'find', 'create' and 'build a balance' are all acceptable collocations.",
    from: "It is important to ___ a balance between studying and relaxing.",
    options: {
      B: { text: "remain", rationale: "'Remain' cannot take an object, so 'remain a balance' is not possible." },
      C: { text: "contain", rationale: "'Contain' means to hold something inside; it does not collocate with 'balance'." },
      D: { text: "entertain", rationale: "'Entertain' means to amuse; it does not collocate with 'balance'." } } },
  cmouj8eor000vnub8ggd82axz: { // junior-vocabulary-b1-science-tech-032
    reason: "'application' matched the old definition ('a type of computer program') at least as well as the key.",
    from: "An ___ is a type of computer program that can perform tasks without constant human input.",
    prompt: "An ___ is a set of step-by-step instructions that a computer follows to solve a problem." },
  cmogduraa003hnu77dd8a3gqo: { // GRM-A2-0029
    reason: "The sentence was illogical (her email in my inbox) and 'received' was also acceptable.",
    from: "I think she ___ the email — it’s in my inbox now.", prompt: "I think she ___ the email — it’s in her inbox now.",
    options: { D: { text: "has receive", rationale: "The present perfect needs the past participle 'received'." } } },
  cmovo2tlm0024nunktymucx79: {
    reason: "British English accepts a plural verb after 'a flock', and 'were' was also grammatical.",
    from: "A flock of birds ___ migrating south for the winter season to find warmer climates.",
    prompt: "Right now, each bird in the flock ___ flying south to find a warmer climate." },
  cmouj8jwc001knub8av15nihc: { // junior-grammar-a2-passive-057
    reason: "'is written by' was also correct.",
    from: "The book ___ written by J.K. Rowling.", prompt: "This book ___ written in 1997." },
  cmovo0lv7001fnunkvfncjm45: {
    reason: "The notice says 16+, which is not the same as being an adult.",
    from: "Park Gym Equipment: Only for users aged 16+. Please read safety instructions before use.",
    rewordsKey: true,
    options: { B: { text: "You must be at least sixteen to use this equipment.", rationale: "'Only for users aged 16+' means users must be sixteen or older." } } },
};

/** The question was stored in content.questionStem, which no renderer shows. */
const UNSHOWN_STEMS = [
  "cmovo43fl002bnunkfznv0jtc",
  "cmovo43h6002cnunkl6g8v6w1",
  "cmovo43il002dnunkvv4j4nlr",
  "cmovo43k3002enunknnsti6fn",
  "cmovo43lh002fnunk4q4bj7ji",
  "cmovo43mw002gnunko85zgqxo",
  "cmovo43od002hnunkmaclux0o",
  "cmovo43pu002inunk59p3b15u",
  "cmovo43ra002jnunkb5kfkhh9"
];

const unquote = (s: string) => s.replace(/`([^`]+)`/g, "'$1'");

type Row = { id: string; itemCode: string | null; status: string; version: number; isAnchor: boolean; content: any; metadata: any };

function revised(item: Row): { content: any; reason: string } | { skip: string } {
  const c = item.content ?? {};
  if (UNSHOWN_STEMS.includes(item.id)) {
    const stem = typeof c.questionStem === "string" ? c.questionStem.trim() : "";
    if (!stem) return { skip: "no questionStem" };
    if (String(c.prompt).includes(unquote(stem))) return { skip: "already revised" };
    return { content: { ...c, prompt: `${unquote(String(c.prompt)).trim()}\n\n${unquote(stem)}` }, reason: "The question (content.questionStem) was never shown to candidates; it is now part of the prompt." };
  }
  const r = REVISIONS[item.id];
  if (c.prompt === (r.prompt ?? r.from) && Object.entries(r.options ?? {}).every(([id, o]) => c.options?.find((x: any) => x.id === id)?.text === o.text))
    return { skip: "already revised" };
  if (c.prompt !== r.from) return { skip: "prompt changed since review" };
  const options = (c.options as any[]).map((o) => {
    const patch = r.options?.[o.id];
    if (!patch) return o;
    if (!r.rewordsKey && (o.isCorrect === true || c.correctAnswer === o.id)) throw new Error(`${item.id}: revision would touch the key`);
    return { ...o, text: patch.text, rationale: patch.rationale };
  });
  if (Object.keys(r.options ?? {}).some((id) => !options.some((o) => o.id === id))) return { skip: "option id not found" };
  return { content: { ...c, prompt: r.prompt ?? c.prompt, options }, reason: r.reason };
}

async function main() {
  if (APPLY && !["quarantine", "revisions"].includes(APPLY)) throw new Error("--apply must be quarantine or revisions");
  const select = { id: true, itemCode: true, status: true, version: true, isAnchor: true, content: true, metadata: true } as const;
  const at = new Date().toISOString();

  const pull = (await prisma.item.findMany({ where: { id: { in: Object.keys(QUARANTINE) } }, select })) as Row[];
  console.log(`QUARANTINE: listed=${Object.keys(QUARANTINE).length} found=${pull.length}`);
  let pulled = 0;
  for (const item of pull) {
    const eligible = ["ACTIVE", "PRETEST"].includes(item.status) && !item.isAnchor;
    console.log(`  ${eligible ? "pull" : "skip"} ${(item.itemCode ?? item.id.slice(0, 10)).padEnd(34)} ${item.status.padEnd(7)}${item.isAnchor ? " ANCHOR" : ""} | ${QUARANTINE[item.id]}`);
    if (!eligible || APPLY !== "quarantine") continue;
    await prisma.item.update({ where: { id: item.id }, data: { status: "REVIEW" as any,
      metadata: { ...(item.metadata ?? {}), statusChange: { from: item.status, to: "REVIEW", reason: QUARANTINE[item.id], by: ACTOR, at } } as any } });
    pulled++;
  }

  const edit = (await prisma.item.findMany({ where: { id: { in: [...Object.keys(REVISIONS), ...UNSHOWN_STEMS] } }, select })) as Row[];
  console.log(`\nREVISIONS: listed=${Object.keys(REVISIONS).length + UNSHOWN_STEMS.length} found=${edit.length}`);
  let edited = 0;
  for (const item of edit) {
    const result = revised(item);
    const label = (item.itemCode ?? item.id.slice(0, 10)).padEnd(46);
    if ("skip" in result) { console.log(`  skip ${label} ${result.skip}`); continue; }
    const before = item.content, after = result.content;
    console.log(`  edit ${label} v${item.version} -> v${item.version + 1} | ${result.reason}`);
    if (before.prompt !== after.prompt) console.log(`         prompt: ${JSON.stringify(before.prompt)}\n             ->  ${JSON.stringify(after.prompt)}`);
    for (const o of after.options ?? []) {
      const old = before.options.find((x: any) => x.id === o.id);
      if (old.text !== o.text) console.log(`         ${o.id}: ${JSON.stringify(old.text)} -> ${JSON.stringify(o.text)}`);
    }
    if (APPLY !== "revisions") continue;
    const previous = { prompt: before.prompt, options: before.options };
    await prisma.item.update({ where: { id: item.id }, data: { content: after, version: { increment: 1 },
      metadata: { ...(item.metadata ?? {}), editorialRevision: { reason: result.reason, by: ACTOR, at, fromVersion: item.version, expertApproved: false, previous } } as any } });
    edited++;
  }

  console.log(APPLY ? `\napplied ${APPLY}: pulled=${pulled} edited=${edited}` : "\ndry-run: nothing written. Re-run with --apply=quarantine or --apply=revisions.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
