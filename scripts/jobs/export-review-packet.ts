#!/usr/bin/env tsx

/**
 * Read-only. Exports the generated DRAFT items awaiting expert review into one
 * self-contained HTML file with the content, the automated gate results and a
 * review checklist.
 *
 *   npx tsx scripts/jobs/export-review-packet.ts
 * Output: scripts/jobs/.out/review-packet.html
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { prisma } from "../../src/lib/prisma.js";
import { positionalHeadings } from "../../src/lib/content-factory/matching-items.js";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const out = "scripts/jobs/.out";
const readIds = (f: string): string[] => (existsSync(`${out}/${f}`) ? JSON.parse(readFileSync(`${out}/${f}`, "utf8")).map((x: any) => x.id) : []);

const SOURCES: Array<{ file: string; label: string }> = [
  { file: "matching-listening-ids.json", label: "Listening — matching" },
  { file: "reading-headings-ids.json", label: "Reading — paragraph headings" },
  { file: "listening-expansion-ids.json", label: "Listening — MCQ (inference / attitude / synthesis)" },
];

const CHECKLIST = [
  "Key is correct and no other answer is defensible",
  "Cannot be answered well without the source (cover it and try)",
  "Level (CEFR) matches the thinking required, not just the vocabulary",
  "No cultural, gender or topic bias; no sensitive content",
  "Wording is natural; options are similar in length and tone",
];

function renderItem(it: any, label: string): string {
  const c = it.content ?? {};
  const g = it.metadata?.generationGates ?? {};
  const td = g.textDependency ?? {};
  const source = String(c.passage ?? c.ttsScript ?? "");
  let body = "";
  if (Array.isArray(c.correctMapping ? c.dropZones : null)) {
    const items: string[] = c.draggableItems;
    body = `<table><tr><th>Row</th><th>Key answer</th></tr>${c.dropZones.map((z: string, i: number) => `<tr><td>${esc(z)}</td><td>${esc(items[c.correctMapping[String(i)]])}</td></tr>`).join("")}</table>
      <p class="muted">Unused answers: ${esc(items.filter((_: string, i: number) => !Object.values(c.correctMapping).includes(i)).join(" | "))}</p>`;
  } else if (Array.isArray(c.options)) {
    body = `<ol type="A">${c.options.map((o: any) => `<li class="${o.isCorrect ? "key" : ""}">${esc(o.text ?? o)}${o.isCorrect ? " <b>(key)</b>" : ""}</li>`).join("")}</ol>`;
  }
  const flags: string[] = [...(g.flags ?? [])];
  const isHeadings = Array.isArray(c.dropZones) && c.dropZones.every((z: string) => /^paragraph\s+\d+$/i.test(String(z).trim()));
  if (isHeadings && positionalHeadings(c.draggableItems ?? []).length) flags.push("POSITIONAL_HEADINGS");
  const blind = typeof td.blindExact === "boolean" ? td.blindExact : td.blindOk;
  const guided = typeof td.guidedExact === "boolean" ? td.guidedExact : td.guidedOk;
  return `<details class="item" data-id="${esc(it.id)}" data-code="${esc(it.itemCode ?? "")}"><summary><b>${esc(it.itemCode ?? it.id)}</b> · ${esc(it.cefrLevel)} · ${esc(it.subskill ?? "")} · demand: ${esc(it.metadata?.cognitiveDemand ?? "?")}
      <span class="tag ${blind ? "warn" : "ok"}">${blind ? "solvable without source" : "needs source"}</span>${guided === false ? '<span class="tag bad">key unconfirmed</span>' : ""}${flags.length ? `<span class="tag warn">${esc(flags.join(", "))}</span>` : ""}</summary>
    <p><b>Prompt:</b> ${esc(c.question ?? c.stem ?? c.prompt)}</p>
    ${body}
    <details><summary>${label.startsWith("Listening") ? "Recording script" : "Passage"}</summary><pre>${esc(source)}</pre></details>
    <p class="muted">Review: ${CHECKLIST.map((q) => `<label><input type="checkbox" data-check> ${esc(q)}</label>`).join(" ")}</p>
    <p><label>Decision: <select data-decision><option>—</option><option>Approve</option><option>Revise</option><option>Reject</option></select></label> <input type="text" data-notes placeholder="Notes (required for Reject)" size="60"></p>
  </details>`;
}

async function main() {
  let sections = "";
  let total = 0;
  for (const src of SOURCES) {
    const ids = readIds(src.file);
    if (!ids.length) continue;
    const items = await prisma.item.findMany({
      where: { id: { in: ids }, status: "DRAFT" as any },
      select: { id: true, itemCode: true, cefrLevel: true, subskill: true, content: true, metadata: true },
      orderBy: { itemCode: "asc" },
    });
    total += items.length;
    sections += `<h2>${esc(src.label)} <small>(${items.length})</small></h2>${items.map((it) => renderItem(it, src.label)).join("")}`;
  }
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Item review packet</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#1b1f23;background:#fff}
h1{margin-bottom:0}h2{margin-top:32px;border-bottom:1px solid #ddd;padding-bottom:4px}.muted{color:#586069;font-size:13px}
details.item{border:1px solid #ddd;border-radius:6px;padding:8px 12px;margin:8px 0}summary{cursor:pointer}pre{white-space:pre-wrap;background:#f6f8fa;padding:10px;border-radius:4px}
.tag{font-size:12px;border-radius:10px;padding:1px 8px;margin-left:6px;border:1px solid}.ok{color:#116329;border-color:#116329}.warn{color:#9a6700;border-color:#9a6700}.bad{color:#cf222e;border-color:#cf222e}
table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:4px 8px;text-align:left}li.key{font-weight:600}label{display:block}.bar{position:sticky;top:0;background:inherit;padding:8px 0;border-bottom:1px solid #ddd;display:flex;gap:12px;align-items:center}button{padding:4px 10px}
@media(prefers-color-scheme:dark){body{background:#0d1117;color:#e6edf3}pre{background:#161b22}details.item,td,th{border-color:#30363d}.muted{color:#8b949e}}</style></head><body>
<h1>Item review packet</h1><p class="muted">${total} DRAFT items · generated ${new Date().toISOString().slice(0, 10)} · "solvable without source" is an LLM solver result, not proof for human candidates.</p><div class="bar"><span id="count">0 decided</span> <button id="download" type="button">Download decisions (JSON)</button> <button id="clear" type="button">Clear saved</button></div>${sections}
<script>
(function () {
  var KEY = "item-review:" + document.title;
  var store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  function read(d) {
    return { id: d.dataset.id, code: d.dataset.code, decision: d.querySelector("[data-decision]").value, notes: d.querySelector("[data-notes]").value,
      checks: Array.prototype.map.call(d.querySelectorAll("[data-check]"), function (c) { return c.checked; }) };
  }
  function count() { document.getElementById("count").textContent = Object.keys(store).filter(function (k) { return store[k].decision !== "—"; }).length + " decided"; }
  document.querySelectorAll("details.item").forEach(function (d) {
    var s = store[d.dataset.id];
    if (s) {
      d.querySelector("[data-decision]").value = s.decision; d.querySelector("[data-notes]").value = s.notes || "";
      d.querySelectorAll("[data-check]").forEach(function (c, i) { c.checked = !!(s.checks && s.checks[i]); });
    }
    d.addEventListener("input", function () { store[d.dataset.id] = read(d); save(); count(); });
  });
  count();
  document.getElementById("download").onclick = function () {
    var rows = Object.keys(store).map(function (k) { return store[k]; }).filter(function (r) { return r.decision !== "—"; });
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }));
    a.download = "review-decisions.json"; a.click();
  };
  document.getElementById("clear").onclick = function () { if (confirm("Clear all saved decisions?")) { store = {}; save(); location.reload(); } };
})();
</script></body></html>`;
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/review-packet.html`, html);
  console.log(`wrote ${out}/review-packet.html with ${total} items (${(html.length / 1024).toFixed(0)} KB)`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
