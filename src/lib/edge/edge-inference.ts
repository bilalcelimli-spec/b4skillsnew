/**
 * Edge Inference Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure-JavaScript IRT theta estimation designed to run at the CDN edge:
 *   • Cloudflare Workers (V8 isolates, no Node.js APIs)
 *   • Vercel Edge Functions
 *   • Fly.io edge nodes (lightweight pre-flight scoring)
 *
 * No external dependencies. No filesystem. No crypto API required.
 * Compatible with the Workers runtime `globalThis` environment.
 *
 * Exports a self-contained `edgeInfer()` function that:
 *   1. Accepts a response history (item params + binary scores)
 *   2. Returns EAP theta estimate + SEM
 *   3. Runs in < 1ms for typical 20-item histories
 *
 * Deploy as a Cloudflare Worker:
 *   export default { fetch: edgeWorkerHandler }
 *
 * Also usable server-side (Node.js) — zero overhead, no imports needed.
 */

// ── Types (no external deps) ──────────────────────────────────────────────────

export interface EdgeIrtItem {
  a: number;    // discrimination
  b: number;    // difficulty
  c: number;    // pseudo-guessing
  score: 0 | 1; // observed response
}

export interface EdgeIrtResult {
  theta: number;        // EAP ability estimate
  sem: number;          // Standard Error of Measurement
  info: number;         // Total Fisher information at theta
  cefrLevel: string;    // Mapped CEFR band
  convergence: "EAP" | "MAP" | "FALLBACK";
  computedInMs: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

// 41-point theta quadrature grid [-4, +4]
const GRID_SIZE = 41;
const GRID_MIN  = -4;
const GRID_MAX  =  4;
const GRID_STEP = (GRID_MAX - GRID_MIN) / (GRID_SIZE - 1);

// Pre-computed normal prior weights (standard normal)
const THETA_GRID: number[] = Array.from({ length: GRID_SIZE }, (_, i) => GRID_MIN + i * GRID_STEP);
const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);
const PRIOR: number[] = THETA_GRID.map((t) => INV_SQRT_2PI * Math.exp(-0.5 * t * t) * GRID_STEP);

// CEFR mapping: theta → band (calibrated to IRT logit scale)
const CEFR_THRESHOLDS: Array<[number, string]> = [
  [-3.5, "A1"],
  [-2.0, "A2"],
  [-0.5, "B1"],
  [ 0.8, "B2"],
  [ 2.0, "C1"],
  [ 3.0, "C2"],
];

// ── Core math ─────────────────────────────────────────────────────────────────

function iccProbability(theta: number, a: number, b: number, c: number): number {
  // 3PL ICC: P(θ) = c + (1−c) / (1 + exp(−a(θ−b)))
  const exp = Math.exp(-a * (theta - b));
  return c + (1 - c) / (1 + exp);
}

function fisherInfo(theta: number, a: number, b: number, c: number): number {
  const p = iccProbability(theta, a, b, c);
  if (p <= 1e-6 || p >= 1 - 1e-6 || c >= 1 - 1e-6) return 0;
  const q = 1 - p;
  const pc = p - c;
  const mc = 1 - c;
  return (a * a * q * pc * pc) / (p * mc * mc);
}

function logLikelihood(theta: number, items: EdgeIrtItem[]): number {
  let ll = 0;
  for (const item of items) {
    const p = Math.max(1e-6, Math.min(1 - 1e-6, iccProbability(theta, item.a, item.b, item.c)));
    ll += item.score === 1 ? Math.log(p) : Math.log(1 - p);
  }
  return ll;
}

// ── EAP Estimation ────────────────────────────────────────────────────────────

function eapEstimate(items: EdgeIrtItem[]): { theta: number; sem: number; info: number } {
  // Compute posterior weights: w(θ_k) = L(θ_k) × prior(θ_k)
  let sumW    = 0;
  let sumWt   = 0;
  let sumWt2  = 0;

  const weights: number[] = new Array(GRID_SIZE);

  for (let k = 0; k < GRID_SIZE; k++) {
    const t = THETA_GRID[k];
    const ll = logLikelihood(t, items);
    // Use log-sum-exp trick implicitly by using raw log weights
    weights[k] = PRIOR[k] * Math.exp(Math.min(ll, 0)); // clamp to avoid overflow
  }

  // Normalize
  for (let k = 0; k < GRID_SIZE; k++) sumW += weights[k];
  if (sumW < 1e-300) {
    // Degenerate case — return prior mean
    return { theta: 0, sem: 1, info: 0 };
  }
  for (let k = 0; k < GRID_SIZE; k++) {
    const w = weights[k] / sumW;
    sumWt  += w * THETA_GRID[k];
    sumWt2 += w * THETA_GRID[k] * THETA_GRID[k];
  }

  const theta = sumWt;
  const variance = Math.max(0, sumWt2 - theta * theta);
  const sem = Math.sqrt(variance);

  // Fisher info at EAP theta
  let info = 0;
  for (const item of items) info += fisherInfo(theta, item.a, item.b, item.c);

  return { theta, sem, info };
}

// ── CEFR mapping ──────────────────────────────────────────────────────────────

function thetaToCefr(theta: number): string {
  for (const [threshold, band] of CEFR_THRESHOLDS) {
    if (theta < threshold) return band;
  }
  return "C2";
}

// ── Main export ───────────────────────────────────────────────────────────────

export function edgeInfer(items: EdgeIrtItem[]): EdgeIrtResult {
  const t0 = Date.now();

  if (!items || items.length === 0) {
    return { theta: 0, sem: 1, info: 0, cefrLevel: "A2", convergence: "FALLBACK", computedInMs: 0 };
  }

  // All-correct or all-wrong — EAP handles gracefully via shrinkage toward prior
  const { theta, sem, info } = eapEstimate(items);

  return {
    theta: Math.round(theta * 1000) / 1000,
    sem:   Math.round(sem   * 1000) / 1000,
    info:  Math.round(info  * 1000) / 1000,
    cefrLevel: thetaToCefr(theta),
    convergence: "EAP",
    computedInMs: Date.now() - t0,
  };
}

// ── Cloudflare Worker handler ─────────────────────────────────────────────────
// Deploy via: wrangler deploy --name linguadapt-edge-irt

export async function edgeWorkerHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok", runtime: "edge" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: { items?: EdgeIrtItem[] };
  try {
    body = await request.json() as { items?: EdgeIrtItem[] };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (!Array.isArray(body?.items)) {
    return new Response(JSON.stringify({ error: "items[] required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Validate and clamp item parameters for safety
  const items: EdgeIrtItem[] = body.items.map((it) => ({
    a: Math.max(0.1, Math.min(4.0, Number(it.a) || 1.0)),
    b: Math.max(-6,  Math.min(6,   Number(it.b) || 0.0)),
    c: Math.max(0,   Math.min(0.5, Number(it.c) || 0.0)),
    score: it.score === 1 ? 1 : 0,
  }));

  const result = edgeInfer(items);

  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Edge-Runtime": "cloudflare-worker",
    },
  });
}

// Cloudflare Workers entry point
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof (globalThis as any).addEventListener === "function") {
  (globalThis as any).addEventListener("fetch", (event: any) => {
    event.respondWith(edgeWorkerHandler(event.request));
  });
}
