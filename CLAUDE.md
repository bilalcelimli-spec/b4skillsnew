# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (single process — Express + Vite HMR on :3001)
npm run dev

# Type checking (no emit — used as lint)
npm run type-check

# Run all unit tests once
npm run test

# Run a single test file
npx vitest run test/irt-cefr-critical.test.ts

# Run tests matching a name pattern
npx vitest run --reporter=verbose -t "EAP estimator"

# Watch mode
npm run test:watch

# Coverage (psychometric/engine/scoring modules, thresholds enforced)
npm run test:coverage

# E2E (Playwright)
npm run test:e2e

# Build (client + server + prisma generate)
npm run build

# Database
npm run db:migrate          # apply pending migrations (production safe)
npm run db:push             # push schema without migration file (dev only)
npm run db:studio           # Prisma Studio GUI

# Item bank operations
npm run iqs:batch           # run IQS quality scores on unscored items
npm run iqs:batch:all       # re-score all items
npm run db:job:calibrate-pretest    # promote calibrated pretest items
npm run db:job:detect-dif           # batch DIF detection
npm run db:seed:anchors             # seed anchor/equating items
npm run verify:irt          # check IRT parameter health across bank
npm run verify:coverage     # check skill/CEFR coverage gaps
```

## Architecture

### Server (monolith)

`server.ts` is the single Express entry point. It embeds Vite as middleware in dev (no separate frontend dev server needed). In production `npm run build` compiles client to `dist/` and server to `dist/server.js`. All API routes are defined inline in `server.ts` rather than in route files — the files under `src/routes/` contain only a few focused handlers (items, proctoring, billing, score-report) that `server.ts` imports.

The server starts in **mock/demo mode** if `DATABASE_URL` is unset or unreachable; most assessment endpoints fall back to in-memory stubs so the UI still renders. The admin seed (`admin@b4skills.com` / `Admin@b4skills2025`) is upserted on every startup.

### Client (React SPA)

`src/App.tsx` drives the entire application via a single `activeTab` state variable synced bidirectionally to the URL with `useNavigate`. There is **no React Router `<Route>` component tree** — views are conditionally rendered based on `activeTab`. Deep-link support is handled by parsing `location.pathname` in a `useEffect` on mount.

Role-based rendering: `isAdmin`, `isRater`, `isOrgAdmin` booleans derived from `userProfile.role` control which tabs/views appear.

### Assessment Engine

The CAT engine lives entirely in `src/lib/assessment-engine/`:

- **`engine.ts`** — `AssessmentEngine` class: pure psychometric logic (no DB). Processes responses → updates θ via `estimator.ts` (EAP), selects next item via `selector.ts` (Max Fisher Information), checks stopping rules.
- **`server-engine.ts`** — DB-backed orchestrator used by API routes. Wraps `engine.ts`, reads/writes Postgres sessions, calls `ScoringOrchestrator` for speaking/writing, runs all psychometric side-effects (person-fit, clickstream, MIRT-4D, CDM-DINA, collusion detection).
- **`irt.ts`** — 3PL probability and Fisher information.
- **`estimator.ts`** — EAP θ estimation.
- **`selector.ts`** — Max Fisher Information selection.
- **`mst-routing.ts`** — Multistage adaptive routing for non-MC sections.
- **`sympson-heter.ts`** — Sympson-Hetter exposure control.
- **`item-bank-cache.ts`** — In-process LRU cache for items; cache is warmed on session start.

### Product Lines

`src/lib/product-lines/profiles.ts` is the single source of truth for all assessment modes (General English, Academia, Corporate, Primary, 15-Min Diagnostic, etc.). Each profile defines section order, min/max items per skill, SEM stopping thresholds, and MST configuration. **Changing item counts here has direct psychometric consequences** — all counts are justified against IRT information targets documented in the file header.

### Psychometrics Layer (`src/lib/psychometrics/`)

40+ standalone modules. Key ones:

| Module | Role |
|---|---|
| `canonical-cut-scores.ts` | CEFR ↔ θ thresholds (provisional — do not change without justification) |
| `graded-response-model.ts` | Samejima GRM for speaking/writing polytomous scoring |
| `mirt-4d.ts` / `mirt-2b.ts` | Multidimensional IRT for multi-skill items |
| `cdm-dina.ts` | Cognitive Diagnostic Model for grammar attribute mastery |
| `equating-cineg.ts` | CINEG equating for form comparability |
| `dif-analysis.ts` / `batch-dif-detection.ts` | Mantel-Haenszel DIF |
| `item-quality-score.ts` | IQS (0–100) — run via `npm run iqs:batch` |
| `person-fit.ts` | Lz statistic for aberrant response patterns |
| `shadow-test-solver.ts` | LP-based shadow test for blueprint enforcement |
| `classification-consistency.ts` | Decision consistency / accuracy estimation |

### Scoring (`src/lib/scoring/`)

AI scoring uses a multi-provider ensemble (`scoring-orchestrator.ts`, `multi-rater-ensemble.ts`). Providers: Gemini (`gemini-scoring-service.ts`), GPT-4 (`gpt4-scoring-service.ts`), Claude (`claude-scoring-service.ts`). Low-confidence responses route to the human rater queue (`rating-queue.ts`). Speaking audio is transcribed via `whisper-pipeline.ts` then scored on 7 rubric dimensions using GRM. **`GEMINI_API_KEY` must never appear in client-side code** — all AI calls are server-side only.

### CEFR Framework (`src/lib/cefr/`)

`cefr-framework.ts` exports `thetaToCefr(θ)` and `CEFR_THETA_THRESHOLDS`. These thresholds are the canonical cut scores that flow through every report and certificate. The tests in `test/irt-cefr-critical.test.ts` lock these values — if they change, the tests will fail intentionally.

### Multi-tenancy

Every `Organization` (tenant) has its own `id` scoped to all `User`, `Session`, and cohort records. Branding (logo, colors, welcome message) is stored as JSON on `Organization.branding` and fetched at login. Item bank is shared across tenants; tenant-specific items are future scope.

### Auth

Custom JWT auth (no Firebase at runtime). `server.ts` issues `accessToken` (15 min) and `refreshToken` (7 days) as `httpOnly` cookies. The `/api/auth/refresh` endpoint rotates both tokens. `authMiddleware` validates the access token on all protected routes.

### Key Environment Variables

Required at startup: `JWT_SECRET`, `REFRESH_SECRET`, `DATABASE_URL`.
Optional but needed for full functionality: `GEMINI_API_KEY` (AI scoring), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (payments), `REDIS_URL` (rate-limit backing store, falls back to memory), `SENTRY_DSN`, `AWS_*` (S3 audio storage).

Copy `.env.example` to `.env` and fill in at minimum `DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`.

### Item Lifecycle

Items in Postgres flow through: `DRAFT → REVIEW → PILOT → CALIBRATION → ACTIVE → WATCHLIST → RETIRED`. Only `ACTIVE` items are served in scored sessions. `PILOT` items are silently embedded as unscored pretests (max 10% of session). Promotion from `CALIBRATION → ACTIVE` requires ≥ 200 scored responses and IQS ≥ 65.

### Scripts

`scripts/` contains operational tooling. Scripts prefixed `_` are one-off audit/diagnostic tools. Permanent maintenance jobs live in `scripts/jobs/`. All scripts use `tsx` for direct TypeScript execution without compilation.
