# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed
- **Single selection path (Faz 1, 2026-10-30)** — `CATSelector` is the only item selector; the never-called `AssessmentEngine.getNextItem/shouldStop`, `selector.ts`, `mst-routing.ts` and the `SystemConfig` keys `useShadowTest`, `sprt`, `mst`, `classificationConfidenceThreshold` were removed (stored values are ignored). The smooth KL/MFI blend (`hybridAlpha`) replaces the binary switch; the always-zero recency weight was dropped. Greedy shadow test stays the default after a greedy-vs-LP A/B showed no measurable difference.
- **Profile-centred ability prior** — EAP and section-start priors now come from `profileAbilityPrior` (SystemConfig org prior → `profile.abilityPrior` → centre of the profile's CEFR range, SD 1) via `getEngineForProfile`; the SystemConfig `priorMean`/`priorSd` keys are finally read. Simulation showed the population N(0,1) prior biased Primary by +0.15 and Academia/Specialized by −0.11/−0.14 logit; the profile prior removes it.
- **Exposure control fix** — Davey–Parshall rates now count candidates per θ stratum (session-keyed) instead of item administrations, the α-gate runs before shadow-test assembly, and α updates every 25 sessions. In simulation the most-exposed item fell from ~0.96 to ~0.54 of candidates (productive sections 0.96 → 0.36–0.39).
- **Adaptive engine (Faz 0 locks, 2026-10-30)** — live sessions no longer rewrite item IRT parameters after each response; `CalibrationService.recalibrateItem` runs only when `SystemConfig.useOnlineRecalibration` is true (default off). Class-C parameter drift now moves an item to `REVIEW` instead of auto-retiring it, and the duplicate `exposureCount` increment inside recalibration was removed.
- **Rapid-guess handling** — the legacy partial-score penalty (0.3/0.5 fed into the 3PL likelihood) was removed. Fast answers are recorded as `Response.rtFlag = "RAPID_GUESS"` (when RT-IRT is off) and feed person-fit/RGI; scores are never altered.
- **Admin engine parameters** — the SystemConfig form now states that item counts and SEM thresholds for live exams come from product-line profiles; `system-config-zod.ts` documents which keys the live flow reads.

### Added
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
