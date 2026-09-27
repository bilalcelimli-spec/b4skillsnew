# B4Skills World-Class Execution Baseline — 2026-09-27

This document is the evidence-based starting point for the platform improvement programme. A capability is considered complete only when its acceptance evidence is linked here; source code or a roadmap checkbox alone is not completion evidence.

## Verified baseline

| Area | Evidence | Result | Release meaning |
|---|---|---:|---|
| Automated tests | `npm test` | 85 files, 1,504 passed, 2 skipped, 2 todo | Regression baseline is green |
| Item-bank coverage | `npm run verify:coverage` | 0 configured profile gaps | Current delivery profiles can draw their configured minimums |
| IRT numerical safety | `npm run verify:irt` | 2,096 ACTIVE; 0 with discrimination ≤ 0 | CAT selector receives non-zero information |
| Empirical IRT calibration | Item metadata audit | 0/2,096 calibrated | No empirical production-readiness claim yet |
| IQS metadata | `npm run verify:irt` | 2,096/2,096 populated; average 93.1 | Automated content-quality metadata is present |
| CEFR standard setting | `docs/standard-setting-report.md` | Template, not a completed study report | Cut-score evidence remains open |
| Live-data volume | Database read-only audit | 99 sessions; 9 completed; 1,314 responses | Too little completed-session evidence for platform-level validity claims |
| Pretest calibration volume | Database read-only audit | 996 PRETEST items; 90 pretest responses; maximum 3 responses on one item | No item currently reaches even the lowest calibration trigger |
| Critical public flows | Targeted Playwright run after harness repair | Login/register routes, invalid login, anonymous protection, health/auth API, marketing JS and JSON-LD checks pass in Chromium | Public baseline is reproducible; authenticated exam flow still requires isolated seeded E2E execution |
| Frontend production build | `npm run build:client` | Pass; PWA generated | Several output chunks exceed the 600 kB warning threshold |

## Customer and commercial baseline

The connected database currently contains 4 organizations, 47 users (46 candidates and 1 super-admin), 6 license records, and 9 completed sessions. It also contains 100 `COMPLETED` USD transaction rows totalling USD 100. These numbers are not yet accepted as customer or revenue KPIs because the environment has not been classified and test/demo records are not tagged separately.

There are no feedback records. The human-rating queue contains 80 pending and 13 claimed tasks, with no completed task group in the baseline query. This is insufficient evidence for customer satisfaction or human–AI agreement claims.

Per-request AI tokens, provider/model version, retries, media storage cost, human-review minutes, support effort and allocated infrastructure cost are not recorded in a common cost ledger. Cost per completed assessment and gross margin are therefore **not measurable** from current telemetry.

## Claim evidence register

| Claim | Status | Required evidence |
|---|---|---|
| The item bank can drive the CAT selector | Supported for numerical delivery | No zero-information ACTIVE items and profile coverage gate |
| ACTIVE items are empirically calibrated | Unsupported | Calibrated item metadata, sample sizes, fit and uncertainty by skill × level |
| CEFR cut scores are defensible | Unsupported | Completed standard-setting report and decision log |
| AI scoring agrees with trained raters | Unsupported | Held-out double ratings and dimension-level agreement statistics |
| Critical browser flows are protected by E2E | Partial | Public/auth subset passes; full seeded exam/report flow and all target browsers must pass |
| Platform has paying customers or sustainable unit economics | Unverified | Production/test data classification, recognized revenue, provider costs and support allocation |
| WCAG 2.2 AA is met | Unverified | Automated checks plus manual keyboard and assistive-technology audit |

## Release gates

### Gate A — delivery safety

- Full test suite passes.
- No ACTIVE item has discrimination ≤ 0.
- Every enabled profile has enough eligible items for its configured delivery blueprint.
- Session recovery, idempotent response submission, audio upload and scoring failure paths pass end-to-end tests.

### Gate B — psychometric production readiness

- `npm run verify:irt:production` passes (initial threshold: at least 80% empirically calibrated ACTIVE items).
- A completed standard-setting study replaces the current template and synthetic/approximate cut-score evidence.
- Writing and speaking agreement studies meet their preregistered acceptance thresholds on held-out responses.
- Reliability, conditional SEM, classification consistency and DIF are reported with sample sizes and confidence intervals.

### Gate C — international launch readiness

- Critical candidate journeys pass WCAG 2.2 AA manual and automated checks.
- Tenant isolation and critical authorization paths pass an independent security review.
- Restore-from-backup and rollback exercises succeed within documented recovery objectives.
- Target-market language, support, privacy and payment journeys pass native-speaker/user acceptance testing.

## First 30 days

| Priority | Deliverable | Acceptance evidence |
|---:|---|---|
| P0 | Correct quality gates and evidence labels | Delivery-safe and empirically validated states cannot be confused |
| P0 | Candidate-session failure audit | Automated tests for retry, refresh, disconnect, duplicate submit and AI outage |
| P0 | Calibration migration plan | Response counts and calibrated coverage reported by skill × CEFR level |
| P0 | One canonical calibration policy | The current 30/50/80/150/200-response thresholds are reconciled by assessment purpose and enforced from one configuration source |
| P1 | Standard-setting study execution pack | Named panel roles, blinded data, protocol, analysis output and signed decision log |
| P1 | Writing/speaking agreement study | Held-out human ratings, QWK by rubric dimension, drift and rollback rule |
| P1 | Production SLO validation | Synthetic monitoring and alert evidence for live/readiness and exam APIs |

## Known production observation

The 2026-09-27 request sample includes `HEAD /` returning 403 on the apex host after a redirect involving `www`. Express automatically supports HEAD for GET routes, so the application log alone does not establish an application defect. Capture the redirect `Location`, proxy/CDN rule and response headers before changing routing.

Calibration thresholds currently conflict across implementations: the pretest manager triggers at 30 and promotes at 50, the production pipeline defaults to 80 and 150, and the AI item-generation pipeline requires 200. Until these are unified and justified for each assessment use, no single threshold should be presented as the platform standard.

The previous E2E setup used three inconsistent origins/ports (5173, 3000 and 3001), waited on a non-existent `/health` endpoint and ignored failure to create test users. The harness now uses the integrated application on port 3001, waits on `/api/health`, and deterministically creates candidate and administrator fixtures in CI.
