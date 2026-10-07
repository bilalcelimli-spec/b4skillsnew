# Assessment flow audit — 2026-10-07

The audit used disposable localhost PostgreSQL databases and the real bundled Express server. Production data, credentials and deployed services were not changed. CI item-bank fixtures supplied controlled objective answers. External AI credentials were deliberately blank, so productive tasks exercised integrity checks, unavailable-provider handling and human-review requirements without making paid grading calls.

## Verified flows

| Assessment | Verification |
| --- | --- |
| Primary (7–10) | Code generation/redemption, launch, every section, saved answers, reconnect, completion, report, PDF and ownership checks |
| Junior Suite (11–14) | Same, including multistage routing |
| Rapid / 15-Min Diagnostic | Same, using its adaptive six-skill profile |
| Express Assessment (30-Min) | Same, using its four objective skills |
| General English | Same, including concurrent next/answer requests |
| Academia | Same, including multistage routing |
| Corporate | Full profile flow |
| Language Schools | Full profile flow |
| Specialized / Integrated Skills | Full profile flow |
| Fixed 30-item diagnostic | All 30 responses; generic-player resume and response compatibility; incomplete scoring prevents a final report/certificate |
| Public freemium placement | Completion with all six skill breakdowns; ungraded speech is not awarded full credit |
| Özgün Kids Form A | Assigned code, resume, four sections, saved answer, 96-question accounting, provisional course guidance, restricted answer key/booklet, MP3 range streaming |

Browser regression tests cover mobile/desktop question renderers, speaking recording, writing, matching, ordering, integrated tasks, camera handling, exam analytics and confirmed exit. Özgün browser tests cover the admin key/code workflow and all four candidate sections, including listening playback and the raw-score/course report. Native PostgreSQL tests additionally verify independent human ratings, arbitration, certification, certificate verification/revocation, shared reports and fixed-form scoring.

## Corrections

1. Adaptive responses now enforce the wall-clock deadline before grading and again under the response transaction lock. The fixed diagnostic also rejects an answer if its deadline passes during grading. Late answers do not become persisted scoring evidence.
2. Redeemed codes constrain the assessment product even when the institution has an active license. An omitted product inherits the code's assigned product; the General alias remains supported. The standalone diagnostic launch now applies candidate access checks and rejects another product's code.
3. Fixed diagnostic sessions resume and accept answers through their own blueprint when opened through the generic player, rather than falling into General English CAT delivery.
4. Concurrent next requests claim one current item. A served unanswered item remains stable even when asynchronous scoring changes the section's SEM. Background scoring refresh now locks and reloads session state before updating it, preserving the current question and section metadata.
5. Completion returns the persisted recalculated ability only when the score report is verified. Pending scores emit no final ability. Warm starts use verified completed sessions, excluding unverified estimates and four-skill fixed forms without an IRT report.
6. License selection supports no-expiry licenses. Expired/exhausted licenses no longer create a replacement trial. Last-credit consumption is serialized, and credit deduction plus adaptive session creation commit or roll back together. Insufficient credits return an operational HTTP 402 response.
7. Practice instructions no longer promise the same 30-minute duration for every assessment profile.

## Results

- Standard suite: **2,049 passed**, 43 skipped, 2 todo. Skips include explicitly opt-in native/database tests; they are not counted as successes.
- Native regression run: **21 passed** (18 PostgreSQL cases and 3 access/deadline rules).
- Browser renderer suite: **29 passed**.
- Real-server assessment matrix: **18 passed**.
- TypeScript check and complete production build: passed. The server bundle was rebuilt after the final operational-error adjustment.
- Route audit: 296 routes, 227 frontend call sites, **0 reachable missing routes**, **0 duplicates**. Existing unused components still reference 38 absent endpoints, and three legacy router modules are unmounted; these are recorded by the route audit and were not exposed as new product functionality.

These checks validate application behavior with controlled items, not psychometric calibration or the accuracy/availability of a live third-party grader. Production item-bank quality, deployed database capacity and live provider integrations require their own environment-specific checks. Özgün remains a four-skill placement aid, not a general CEFR certification exam.

## Repeat the assessment matrix

Use a fresh disposable PostgreSQL database whose name starts with `all_exams_`. The audit rejects remote hosts and other database names, creates disposable users/organizations/licenses, launches its own local server on port 39482 and stops that server afterward. It leaves fixtures in the disposable database for inspection. It never reads the normal `DATABASE_URL` as its target.

```sh
export B4SKILLS_FLOW_AUDIT_DATABASE_URL='postgresql://LOCAL_USER@127.0.0.1:LOCAL_PORT/all_exams_audit?connection_limit=3'
DATABASE_URL="$B4SKILLS_FLOW_AUDIT_DATABASE_URL" DIRECT_URL="$B4SKILLS_FLOW_AUDIT_DATABASE_URL" npx prisma migrate deploy
DATABASE_URL="$B4SKILLS_FLOW_AUDIT_DATABASE_URL" DIRECT_URL="$B4SKILLS_FLOW_AUDIT_DATABASE_URL" npm run db:seed:ci
npm run build:server
npm run audit:assessment-flows
```

Detailed results are written to `/tmp/b4skills-all-exams-flow-results.json`; the local server log is `/tmp/b4skills-all-exams-server.log`.
