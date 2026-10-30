# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed
- **Measurement model (Faz 4)** — RT-IRT is on by default as a flag-only diagnostic (`Response.rtFlag`/`rtZScore`; scores are never adjusted, `adjustedScore` is no longer written); MIRT is off by default and reported as `mirtStatus: "EXPLORATORY"`; the per-skill report re-estimates each skill under the profile prior; reports gain `compositeProfile` (equal-weight skill mean, SEM lower bound, dispersion χ² and an `uneven` flag). A cross-skill informative prior (`profile.crossSkillPrior`, harness `--cross-skill`) is implemented but off: it saves 6–10 items when the assumed correlation is right and degrades skill profiles when it is too high.
- **Evidence-backed section stop rules (Faz 3)** — every profile now stops a section on `SEM_THRESHOLD` or `CLASSIFICATION_CONFIDENCE` (P(band) ≥ 0.90); Rapid Diagnostic adds Wald SPRT (35 → 27 items in simulation with unchanged accuracy). `BOUNDARY_SEM` and section budget flex were measured and left off. The harness takes `--stop-rules`, `--confidence`, `--sprt`, `--budget-flex` for A/B runs.
- **One cut-score set (Faz 3)** — `classification-consistency.ts` classifies with the operational `cefr-framework` cuts instead of hard-coded Angoff values that disagreed with the reported CEFR level; alternative cuts and a cut standard error are explicit options. Reports carry `cutScores: { status: "PROVISIONAL", … }` and `classificationConsistency.withCutUncertainty` (cut SE 0.10 assumed until standard setting).
- **Calibration writes are drafts only (Faz 2)** — `pretest-calibration-pipeline`, `CalibrationService.recalibrateItem` and the pretest manager no longer write `Item.discrimination/difficulty/guessing` or promote items; they record DRAFT versions. `verify:irt` counts "calibrated" from published versions; the legacy `metadata.paramSource` tag is reported but not counted. Pretest selection prefers finishing partly-exposed items (focus set) over spreading responses thinly.
- **Single selection path (Faz 1, 2026-10-30)** — `CATSelector` is the only item selector; the never-called `AssessmentEngine.getNextItem/shouldStop`, `selector.ts`, `mst-routing.ts` and the `SystemConfig` keys `useShadowTest`, `sprt`, `mst`, `classificationConfidenceThreshold` were removed (stored values are ignored). The smooth KL/MFI blend (`hybridAlpha`) replaces the binary switch; the always-zero recency weight was dropped. Greedy shadow test stays the default after a greedy-vs-LP A/B showed no measurable difference.
- **Profile-centred ability prior** — EAP and section-start priors now come from `profileAbilityPrior` (SystemConfig org prior → `profile.abilityPrior` → centre of the profile's CEFR range, SD 1) via `getEngineForProfile`; the SystemConfig `priorMean`/`priorSd` keys are finally read. Simulation showed the population N(0,1) prior biased Primary by +0.15 and Academia/Specialized by −0.11/−0.14 logit; the profile prior removes it.
- **Exposure control fix** — Davey–Parshall rates now count candidates per θ stratum (session-keyed) instead of item administrations, the α-gate runs before shadow-test assembly, and α updates every 25 sessions. In simulation the most-exposed item fell from ~0.96 to ~0.54 of candidates (productive sections 0.96 → 0.36–0.39).
- **Adaptive engine (Faz 0 locks, 2026-10-30)** — live sessions no longer rewrite item IRT parameters after each response; `CalibrationService.recalibrateItem` runs only when `SystemConfig.useOnlineRecalibration` is true (default off). Class-C parameter drift now moves an item to `REVIEW` instead of auto-retiring it, and the duplicate `exposureCount` increment inside recalibration was removed.
- **Rapid-guess handling** — the legacy partial-score penalty (0.3/0.5 fed into the 3PL likelihood) was removed. Fast answers are recorded as `Response.rtFlag = "RAPID_GUESS"` (when RT-IRT is off) and feed person-fit/RGI; scores are never altered.
- **Admin engine parameters** — the SystemConfig form now states that item counts and SEM thresholds for live exams come from product-line profiles; `system-config-zod.ts` documents which keys the live flow reads.

### Added
- **Shared Davey–Parshall α tables (Faz 5)** — exposure-control acceptance probabilities are now per profile and persisted in `SystemConfig/dp-alpha-tables`; `npm run db:job:alpha-table` computes them from observed sessions and, with `--simulate N`, pre-warms them from the simulation harness; instances load them at startup and refresh every 10 minutes.
- **Job lease and external runner (Faz 5)** — `job-lease.ts` (Postgres advisory lock) guards the calibration and exposure API endpoints and all CLI jobs; `npm run job -- <name>` runs any maintenance job from an external scheduler. `startScheduledJobs` (never wired) is now opt-in via `SCHEDULED_JOBS_MODE=in-process`.
- **Operational reports (Faz 5)** — `npm run report:skill-correlation` (disattenuated inter-skill correlations and a `crossSkillPrior` recommendation) and `npm run report:exam-health` (stop reasons, SEM distributions, pretest accumulation, draft versions, exposure, behaviour flags).
- **GRM threshold calibration (Faz 4)** — `grm-item-calibration.ts` estimates Samejima thresholds for writing/speaking tasks from graded responses (penalised ML, seed ridge, ordered thresholds, SEs); the calibration sweep records `GRM_PML` drafts with `thresholds` (migration `012_parameter_version_thresholds`) and publishing copies them to `Item.metadata.grm`, replacing the synthetic `rubricToGrmParams` fallback.
- **Pretest delivery in live sections (Faz 2)** — one unscored calibration item is embedded after every 4th operational item (`shouldAdministerPretest`, bounded by `SystemConfig.pretestRatio × profile.globalMaxItems`, never in writing/speaking); the pretest pool comes from `pretestItemWhere`; the candidate payload no longer exposes `isPretest`/`status`. The simulation harness simulates the slots and reports calibration accumulation.
- **Versioned item parameters (Faz 2)** — `ItemParameterVersion` model + migration `011_item_parameter_version`; `item-parameter-versions.ts` (draft → publish/reject, Item cache refresh, PRETEST → ACTIVE on publish, drift vs published version); admin endpoints `GET /api/psychometrics/calibration/{policy,versions}` and `POST …/versions/:id/{publish,reject}`; `npm run db:job:calibrate` (sweep → drafts; `--publish-eligible --yes` publishes gate-passing drafts).
- **Single calibration policy** — `calibration-policy.ts` replaces the three conflicting threshold sets (30/50, 80/150, 200): estimate at n ≥ 80, publish at n ≥ 200 with SE(b) ≤ 0.25, parameter ranges, fit/point-biserial/IQS checks, |Δb| ≤ 0.30 and a Class-C drift block. `calibratePretestItem` now returns standard errors.
- **Production-path simulation harness (Faz 1)** — `src/lib/assessment-engine/simulation-harness.ts` runs simulated candidates through the live selection path; `npm run sim:adaptive` (offline report, greedy/LP A/B), `npm run bank:snapshot` (anonymised bank export), `test/simulation/production-path.test.ts` (CI gate: bias, SEM calibration, CEFR accuracy, length, exposure, latency per profile); `npm run audit:adaptive` now wraps the harness.
- **Explicit section stop rules** — `stop-rules.ts` / `section-flow.ts`; profiles declare `stopRules` (default `SEM_THRESHOLD`, identical to previous live behaviour) with opt-in `BOUNDARY_SEM`, `CLASSIFICATION_CONFIDENCE`, `SPRT`.
- **CAT observability** — `cat_selection_duration_seconds`, `cat_pool_size`, `cat_pool_fallback_total`, `cat_stop_reason_total`, `cat_final_sem`, `cat_item_exposure_rate`, `cat_rapid_guess_total` Prometheus metrics; `GET /metrics` endpoint (SUPER_ADMIN session or `METRICS_TOKEN` bearer) and HTTP request metrics middleware wired in `server.ts`.
- `docs/ADAPTIVE_ENGINE_ROADMAP_2026_10.md` — adaptive engine roadmap with evidence-based findings and phases.

## [1.0.0] — 2026-04-07

### Added
- **Adaptive Test Engine** — IRT-based (3PL model) item selection with real-time θ (ability) estimation via a modified EAP estimator.
- **Gemini AI Scoring** — multimodal Speaking evaluation and essay Writing scoring aligned to CEFR A1–C2 rubrics.
- **Multi-Tenant B2B** — organisation scoping, custom branding (logo, colour palette), and per-org candidate management.
- **Proctoring System** — camera-based anomaly detection, tab-switch tracking, audit log persistence, and admin review dashboard.
- **CEFR Certification** — auto-generated PDF certificates with `jsPDF`/`html2canvas`.
- **Psychometric Tools** — calibration study runner, item promotion workflow, item bank manager.
- **Analytics Dashboard** — cohort reports, domain-level scoring breakdowns, and recharts visualisations.
- **Stripe Billing** — checkout sessions, subscription management, and webhook handler.
- **Bulk Onboarding** — CSV import of candidates via `papaparse`.
- **Webhook Ecosystem** — outbound webhook configuration per organisation.
- **i18n** — multi-language support via `react-i18next`.
- **Docker support** — multi-stage `Dockerfile`, `docker-compose.yml`.
- **CI/CD** — GitHub Actions workflows for type-check, build, and deploy.
- **Cloud Deploy** — `render.yaml` (Render) and `fly.toml` (Fly.io) configs.
