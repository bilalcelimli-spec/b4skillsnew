#!/usr/bin/env tsx
/**
 * Read-only. Age-review packet for the general-core items a Junior Suite
 * (11-14) session could draw if `generalCoreAccess` were turned on.
 *
 * The context backfill derived ageSuitability from product tags, and the
 * general core carries none, so every core item is still UNIVERSAL and the
 * under-16 ADULT filter removes nothing. A reviewer marks each item:
 *   UNIVERSAL  suitable for 11-14 as well as adults
 *   ADULT      not for under-16 candidates (the filter then excludes it)
 *
 * Section 1: operational items (ACTIVE, scored), listening first.
 * Section 2: pretest items (unscored, but still shown to the candidate).
 * Within a section, items with an adult-context keyword hit come first; the
 * hit is a hint for the reviewer, never a decision.
 *
 *   npx tsx scripts/jobs/export-core-age-review.ts [--profile "Junior Suite (11-14)"]
 *   → scripts/jobs/.out/core-age-review/packet.html
 * Decisions download as JSON from the page; import with apply-core-age-review.ts.
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { getProfile } from "../../src/lib/product-lines/profiles.js";
import { isAdaptiveEligible, isGeneralCoreItem, isPretestEligible } from "../../src/lib/assessment-engine/adaptive-policy.js";
import type { SkillType } from "../../src/lib/assessment-engine/types.js";

const i = process.argv.indexOf("--profile");
const PROFILE = getProfile(i >= 0 ? process.argv[i + 1]! : "Junior Suite (11-14)");
const OUT = "scripts/jobs/.out/core-age-review";
const SKILL_ORDER = ["LISTENING", "READING", "GRAMMAR", "VOCABULARY", "SPEAKING", "WRITING"];

/** Adult-life contexts that are unusual for 11-14 year olds. A hint only: "post office" also matches. */
export const ADULT_HINT = /\b(universit\w*|lecture[rs]?|professor|postgraduate|undergraduate|degree|thesis|dissertation|mortgage|salar(y|ies)|wage|wine|beer|alcohol\w*|pub|bar|nightclub|divorc\w*|employer|employees?|colleagues?|manager|office|boss|job interview|interview|tax\w*|rent|landlord|loan|debt|invest\w*|stock market|husband|wife|marri\w*|pension|retire\w*|redundan\w*|contract|clients?|meeting|career|recruit\w*|crime|murder|violence|war|politic\w*|election|gambl\w*|cigarette|smok\w*|dating|pregnan\w*)\b/gi;

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const mark = (s: unknown) => esc(s).replace(ADULT_HINT, (m) => `<mark>${m}</mark>`);

function textOf(content: any): string {
  const c = content ?? {};
  const options = Array.isArray(c.options) ? c.options.map((o: any) => (typeof o === "string" ? o : o?.text ?? "")).join(" ") : "";
  return [c.passage, c.ttsScript, c.transcript, c.context, c.question, c.stem, c.prompt, options].filter(Boolean).join("\n");
}

function render(it: any): string {
  const c = it.content ?? {};
  const hits = [...new Set((textOf(c).match(ADULT_HINT) ?? []).map((h) => h.toLowerCase()))];
  const source = c.passage ?? c.ttsScript ?? c.transcript ?? "";
  const options = Array.isArray(c.options) ? `<ol type="A">${c.options.map((o: any) => `<li>${mark(typeof o === "string" ? o : o?.text)}</li>`).join("")}</ol>` : "";
  return `<details class="item" data-id="${esc(it.id)}" data-code="${esc(it.itemCode ?? "")}"${hits.length ? " open" : ""}>
  <summary><b>${esc(it.itemCode ?? it.id)}</b> · ${esc(it.skill)} · ${esc(it.cefrLevel)} · ${esc(it.status)}${it.topic ? ` · ${esc(it.topic)}` : ""}${hits.length ? `<span class="tag warn">${esc(hits.join(", "))}</span>` : ""}</summary>
  ${source ? `<pre>${mark(source)}</pre>` : ""}
  ${c.context ? `<p>${mark(c.context)}</p>` : ""}
  <p><b>${mark(c.question ?? c.stem ?? c.prompt)}</b></p>${options}
  <p class="choice"><label><input type="radio" name="d-${esc(it.id)}" value="UNIVERSAL"> Suitable for 11-14</label>
  <label><input type="radio" name="d-${esc(it.id)}" value="ADULT"> Adult only (exclude under 16)</label>
  <input type="text" data-notes placeholder="Note (optional)" size="40"></p>
</details>`;
}

async function main(): Promise<void> {
  const db = new PrismaClient();
  try {
    const rows = await db.item.findMany({
      where: { status: { in: ["ACTIVE", "PRETEST"] }, isSuspended: false, isCompromised: false, ageSuitability: "UNIVERSAL" },
      select: { id: true, itemCode: true, skill: true, cefrLevel: true, status: true, isPretest: true, discrimination: true,
        guessing: true, tags: true, content: true, ageSuitability: true, topic: true },
    });
    const view = (r: (typeof rows)[number]) => ({ ...r, content: r.content as unknown });
    const core = rows.filter((r) => isGeneralCoreItem(view(r)));
    const asCore = { ...PROFILE, examSources: ["general"], generalCoreAccess: false };
    const operational = core.filter((r) => isAdaptiveEligible(view(r), asCore, r.skill as SkillType));
    const pretest = core.filter((r) => !operational.includes(r) && isPretestEligible(view(r), asCore, r.skill as SkillType));
    const sort = (list: typeof rows) => [...list].sort((a, b) =>
      SKILL_ORDER.indexOf(a.skill) - SKILL_ORDER.indexOf(b.skill)
      || Number(!textOf(a.content).match(ADULT_HINT)) - Number(!textOf(b.content).match(ADULT_HINT))
      || (a.itemCode ?? a.id).localeCompare(b.itemCode ?? b.id));
    const section = (title: string, note: string, list: typeof rows) => {
      const bySkill = SKILL_ORDER.map((s) => [s, list.filter((r) => r.skill === s).length] as const).filter(([, n]) => n);
      return `<h2>${esc(title)} <small>(${list.length})</small></h2><p class="muted">${esc(note)} ${bySkill.map(([s, n]) => `${s} ${n}`).join(" · ")}</p>${sort(list).map(render).join("")}`;
    };
    const total = operational.length + pretest.length;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Core age review</title>
<style>:root{--bg:#fff;--fg:#1b1f23;--muted:#586069;--line:#ddd;--pre:#f6f8fa;--warn:#9a6700;--mark:#fff1a8}
@media(prefers-color-scheme:dark){:root{--bg:#0d1117;--fg:#e6edf3;--muted:#8b949e;--line:#30363d;--pre:#161b22;--warn:#d29922;--mark:#5a4a00}}
body{font:15px/1.5 system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:var(--fg);background:var(--bg)}
h2{margin-top:32px;border-bottom:1px solid var(--line);padding-bottom:4px}.muted{color:var(--muted);font-size:13px}
details.item{border:1px solid var(--line);border-radius:6px;padding:8px 12px;margin:8px 0}details.done{opacity:.6}summary{cursor:pointer}
pre{white-space:pre-wrap;background:var(--pre);padding:10px;border-radius:4px}mark{background:var(--mark);color:inherit}
.tag{font-size:12px;border-radius:10px;padding:1px 8px;margin-left:6px;border:1px solid var(--warn);color:var(--warn)}
.choice label{margin-right:16px}.bar{position:sticky;top:0;background:var(--bg);padding:8px 0;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:12px;align-items:center}button{padding:4px 10px}input[type=text]{max-width:100%}</style></head><body>
<h1>General-core age review — ${esc(PROFILE.name)}</h1>
<p>${total} general-core items carry no age label. If ${esc(PROFILE.name)} draws on the general core, each could reach an 11-14 year old.
Mark every item: <b>Suitable for 11-14</b> keeps it eligible; <b>Adult only</b> excludes it for candidates under 16 (adult products are unaffected).
Judge the setting and theme (work, money, relationships, alcohol, violence…), not the difficulty. Highlighted words are a keyword hint, not a decision; items with a hit are listed first and open.</p>
<div class="bar"><label>Reviewer <input type="text" id="reviewer" placeholder="your name" size="18"></label><span id="count">0 / ${total}</span>
<button type="button" id="download">Download decisions (JSON)</button><button type="button" id="clear">Clear saved</button></div>
${section("1 · Operational (scored)", "ACTIVE items a session would score.", operational)}
${section("2 · Pretest (unscored, still shown)", "PRETEST items a session would embed for calibration.", pretest)}
<script>
(function () {
  var KEY = "core-age-review:${esc(PROFILE.name)}", store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  var reviewer = document.getElementById("reviewer");
  reviewer.value = store.__reviewer || "";
  reviewer.addEventListener("input", function () { store.__reviewer = reviewer.value; save(); });
  function count() {
    var n = Object.keys(store).filter(function (k) { return k !== "__reviewer" && store[k].decision; }).length;
    document.getElementById("count").textContent = n + " / ${total}";
  }
  document.querySelectorAll("details.item").forEach(function (d) {
    var s = store[d.dataset.id], notes = d.querySelector("[data-notes]");
    if (s) { var r = d.querySelector('input[value="' + s.decision + '"]'); if (r) r.checked = true; notes.value = s.notes || ""; d.classList.add("done"); }
    d.addEventListener("input", function () {
      var picked = d.querySelector("input[type=radio]:checked");
      if (!picked) return;
      store[d.dataset.id] = { id: d.dataset.id, code: d.dataset.code, decision: picked.value, notes: notes.value };
      d.classList.add("done"); save(); count();
    });
  });
  count();
  document.getElementById("download").onclick = function () {
    if (!reviewer.value.trim()) { alert("Enter your name first."); reviewer.focus(); return; }
    var rows = Object.keys(store).filter(function (k) { return k !== "__reviewer"; }).map(function (k) { return store[k]; });
    var body = { profile: "${esc(PROFILE.name)}", reviewer: reviewer.value.trim(), exportedAt: new Date().toISOString(), decisions: rows };
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2)], { type: "application/json" }));
    a.download = "core-age-decisions.json"; a.click();
  };
  document.getElementById("clear").onclick = function () { if (confirm("Clear all saved decisions?")) { store = {}; save(); location.reload(); } };
})();
</script></body></html>`;
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/packet.html`, html);
    const hits = (list: typeof rows) => list.filter((r) => textOf(r.content).match(ADULT_HINT)).length;
    const bySkill = (list: typeof rows) => Object.fromEntries(SKILL_ORDER.map((s) => [s, list.filter((r) => r.skill === s).length]).filter(([, n]) => n));
    console.log(JSON.stringify({ profile: PROFILE.name, operational: { n: operational.length, keywordHits: hits(operational), bySkill: bySkill(operational) },
      pretest: { n: pretest.length, keywordHits: hits(pretest), bySkill: bySkill(pretest) } }, null, 1));
    console.log(`wrote ${OUT}/packet.html (${(html.length / 1024).toFixed(0)} KB)`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("Core age review export failed; the database was only read.", error);
  process.exitCode = 1;
});
