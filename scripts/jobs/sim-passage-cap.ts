#!/usr/bin/env tsx

/** Read-only: simulates max-information selection on the real bank with and without the per-passage cap. */

import { PrismaClient } from "@prisma/client";
import { capItemsPerPassage, passageKey } from "../../src/lib/assessment-engine/passage-cap.js";
const p = new PrismaClient();
let seed = 5; const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const normal = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const info = (th: number, a: number, b: number, c: number) => { const P = c + (1 - c) / (1 + Math.exp(-a * (th - b))); const q = 1 - P; return a * a * (q / P) * ((P - c) / (1 - c)) ** 2; };

(async () => {
  for (const skill of ["READING", "LISTENING"] as const) {
    const rows = await p.item.findMany({ where: { status: "ACTIVE" as any, skill: skill as any, type: "MULTIPLE_CHOICE" as any }, select: { id: true, difficulty: true, discrimination: true, guessing: true, content: true } });
    const pool = rows.map((r) => ({ id: r.id, a: r.discrimination, b: r.difficulty, c: r.guessing, metadata: r.content as any }));
    const N = 12, SIM = 400;
    const run = (cap: boolean) => {
      let repeatShare = 0, maxPer = 0, totalInfo = 0, effShare = 0;
      const RHO = 0.2; // assumed within-text residual correlation (not measured)
      for (let s = 0; s < SIM; s++) {
        const th = normal(); const used: any[] = []; let inf = 0;
        for (let k = 0; k < N; k++) {
          let cand = pool.filter((i) => !used.includes(i));
          if (cap) cand = capItemsPerPassage(cand, used);
          let best = cand[0], bi = -1;
          for (const it of cand) { const v = info(th, it.a, it.b, it.c); if (v > bi) { bi = v; best = it; } }
          used.push(best); inf += bi;
        }
        const counts: Record<string, number> = {}; for (const u of used) { const k = passageKey(u) ?? u.id; counts[k] = (counts[k] ?? 0) + 1; }
        repeatShare += Object.values(counts).filter((v) => v > 1).reduce((a, b) => a + b, 0) / N;
        maxPer = Math.max(maxPer, ...Object.values(counts)); totalInfo += inf;
        effShare += Object.values(counts).reduce((a, m) => a + m / (1 + (m - 1) * RHO), 0) / N;
      }
      return { repeatShare: repeatShare / SIM, maxPer, info: totalInfo / SIM, eff: effShare / SIM };
    };
    const off = run(false), on = run(true);
    console.log(`${skill} (pool ${pool.length}, ${N} items/candidate, ${SIM} simulated candidates)`);
    console.log(`  no cap : items from repeated texts ${(100 * off.repeatShare).toFixed(0)}% | max items from one text ${off.maxPer} | mean total information ${off.info.toFixed(2)} | effective items at ρ=0.2: ${(100 * off.eff).toFixed(0)}%`);
    console.log(`  cap = 2: items from repeated texts ${(100 * on.repeatShare).toFixed(0)}% | max items from one text ${on.maxPer} | mean total information ${on.info.toFixed(2)}  (${(100 * (on.info / off.info - 1)).toFixed(1)}%) | effective items at ρ=0.2: ${(100 * on.eff).toFixed(0)}% → effective information gain ${(100 * ((on.info * on.eff) / (off.info * off.eff) - 1)).toFixed(1)}%`);
  }
  await p.$disconnect();
})();
