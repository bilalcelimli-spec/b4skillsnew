# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
