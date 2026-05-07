# ALTE Code of Practice — b4skills Compliance Mapping

> **Standard**: ALTE (Association of Language Testers in Europe) Code of Practice (2001, revised 2016)  
> **Framework version**: 2016  
> **b4skills version**: Phase I  
> **Status**: Self-assessment / gap analysis — NOT yet externally verified  
> **Owner**: Assessment Director  
> **Last updated**: 2026-05

---

## Overview

The ALTE Code of Practice establishes minimum quality standards for language test developers and providers in Europe. It covers six areas:

1. Test Development and Revision
2. Test Production
3. Test Administration
4. Marking and Grading
5. Test Analysis, Reporting, and Feedback
6. Relationships with Test Takers

This document maps each area to b4skills' current implementation and identifies gaps requiring remediation before any ALTE Q-Mark application.

---

## Area 1 — Test Development and Revision

| Requirement | b4skills Implementation | Status | Gap / Action |
|-------------|------------------------|--------|--------------|
| 1.1 Tests are developed by or with input from qualified personnel | All items reviewed by CEFR knowledge base with Gemini AI examiner persona + human director oversight | ⚠️ PARTIAL | Formal credentials documentation needed; recommend recruiting one qualified EFL examiner for human validation |
| 1.2 Construct is explicitly defined and operationalised | CEFR levels Pre-A1 → C2 with can-do descriptors in `src/lib/cefr/cefr-knowledge-base.ts` | ✅ | Publish `docs/cefr-construct-map.md` |
| 1.3 Content specifications exist and are documented | Item writing framework in `src/lib/ai/item-writing-framework.ts`; CEFR KB grammar/vocab/topic constraints | ✅ | Formalise as external document |
| 1.4 Specifications include item format, length, timing guidelines | CAT blueprint in shadow-test assembly; test time ≈ 20–40 mins adaptive | ✅ | Document standard-form blueprint |
| 1.5 Systematic pre-test and field-trial procedures exist | Pretest pilot service in `src/lib/calibration/pretest-pilot-service.ts` | ✅ | Require n ≥ 50 responses before promotion |
| 1.6 Standard-setting procedures are documented | Modified Angoff scaffold in `src/lib/psychometrics/standard-setting.ts`; report in `docs/standard-setting-report.md` | ⚠️ PARTIAL | Panel of N ≥ 8 qualified judges required (human panelists not yet recruited) |
| 1.7 Test revision follows documented procedures | `triage-review-items.ts` + `regenerate-flagged-items.ts` pipeline | ✅ | Document version control policy |

---

## Area 2 — Test Production

| Requirement | b4skills Implementation | Status | Gap / Action |
|-------------|------------------------|--------|--------------|
| 2.1 Items are reviewed for accuracy, appropriateness, and bias | `src/lib/ai/validation/gates/bias-fairness.ts` + CEFR quality review per item | ✅ | Add human bias review for sensitive content items |
| 2.2 Secure item banking procedures exist | Items stored in Prisma/PostgreSQL; `isPretest`, `status`, `version` fields; role-based access (`CONTENT_ADMIN` only) | ✅ | Add audit log for item edits |
| 2.3 Test forms are assembled according to specifications | CAT shadow-test assembly with blueprint constraints | ✅ | — |
| 2.4 Proofreading and quality checking before live use | CEFR QA review pipeline (3-stage: generator, reviewer, approver) | ✅ | — |
| 2.5 Test materials are protected before and after administration | Server-side item delivery; no bulk export endpoint for items | ✅ | Review CDN caching policies for audio |
| 2.6 Procedures exist for handling test security breaches | `src/lib/security/fraud-detection.ts` (RT+similarity+IP); incident response in `docs/OPERATIONS_RUNBOOK.md` | ✅ | Publish public security disclosure policy (`SECURITY.md` exists) |

---

## Area 3 — Test Administration

| Requirement | b4skills Implementation | Status | Gap / Action |
|-------------|------------------------|--------|--------------|
| 3.1 Standard administration conditions are documented | Session flow documented; time limits enforced server-side | ✅ | Publish candidate handbook |
| 3.2 Test takers receive adequate instructions | In-app instructions before each section | ✅ | Translate instructions to Turkish, Arabic, Spanish |
| 3.3 Special arrangements for candidates with disabilities | Not yet implemented | ❌ GAP | Require: extended time, font size, high-contrast mode (WCAG 2.2 AA) |
| 3.4 Procedures for handling irregularities during testing | Session interrupt/resume not yet implemented | ❌ GAP | Add session pause/resume with fraud check on resume |
| 3.5 Data protection and privacy procedures | GDPR: `DELETE /api/user/:id` with cascade, data export endpoint | ⚠️ PARTIAL | Add data retention policy; KVKK compliance for Turkish candidates |

---

## Area 4 — Marking and Grading

| Requirement | b4skills Implementation | Status | Gap / Action |
|-------------|------------------------|--------|--------------|
| 4.1 Marking criteria are explicit and available to markers | IRT 3PL scoring; AI rubric with CEFR-level anchors for speaking/writing | ✅ | Publish rubrics publicly |
| 4.2 Markers are trained and standardised | AI scorer anchor calibration pipeline; human QA for anchor items | ⚠️ PARTIAL | Document anchor calibration procedure; IRR ≥ 0.80 QWK target |
| 4.3 Marking reliability is monitored | `src/lib/psychometrics/reliability-metrics.ts` with Cronbach α, SEM, classification accuracy | ✅ | Run post-hoc reliability report per cohort |
| 4.4 Grade boundaries are set using validated procedures | Modified Angoff standard setting scaffold | ⚠️ PARTIAL | Human panel required (see 1.6) |
| 4.5 Procedures for re-marking | Admin can trigger score recomputation via `POST /api/sessions/:id/recompute` (if implemented) | ⚠️ PARTIAL | Implement formal appeal workflow |

---

## Area 5 — Test Analysis, Reporting, and Feedback

| Requirement | b4skills Implementation | Status | Gap / Action |
|-------------|------------------------|--------|--------------|
| 5.1 Classical and IRT item analyses are conducted | `distractor-analytics.ts`; `irt-calibration-runner.ts`; distractor analysis service | ✅ | Schedule via weekly health cron |
| 5.2 DIF analyses are conducted | `src/lib/psychometrics/dif-analysis.ts` + `batch-dif-detection.ts`; weekly GitHub Actions cron | ✅ | — |
| 5.3 Test scores and interpretations are reported clearly | Score report with CEFR level, θ ± SEM, can-do summary | ✅ | Add confidence band visualisation to PDF report |
| 5.4 Subscore reliability is assessed before reporting | `src/lib/psychometrics/subscore-reliability.ts` (Livingston-Lewis + Haberman) | ✅ | Wire into score report pipeline |
| 5.5 Test documentation is maintained and available | `docs/validity-argument.md`, `docs/standard-setting-report.md` | ✅ | Annual review cycle |
| 5.6 Feedback to test takers is constructive and actionable | Post-session can-do feedback by CEFR level | ✅ | Add skill-level feedback breakdown |

---

## Area 6 — Relationships with Test Takers

| Requirement | b4skills Implementation | Status | Gap / Action |
|-------------|------------------------|--------|--------------|
| 6.1 Information about test purpose, format, and scoring is available | In-app descriptions; README | ⚠️ PARTIAL | Publish public-facing candidate guide |
| 6.2 Fair access to test preparation | Practice mode available | ✅ | Add free public sample items |
| 6.3 Reasonable arrangements for special needs | ❌ GAP | See 3.3 above |
| 6.4 Appeals procedure is documented and accessible | Not yet formalised | ❌ GAP | Create appeals policy document |
| 6.5 Results are reported promptly | Immediate adaptive results | ✅ | — |
| 6.6 Data protection rights are respected | GDPR delete/export; terms of service | ⚠️ PARTIAL | Publish full privacy notice with lawful basis |

---

## Gap Summary and Remediation Roadmap

### Critical Gaps (must fix before any external certification)

| ID | Gap | Owner | Target Phase |
|----|-----|-------|--------------|
| G-1 | Qualified EFL examiner involvement in item development | Assessment Director | Faz I |
| G-2 | Human standard-setting panel (N ≥ 8 judges) | Assessment Director | Faz I |
| G-3 | WCAG 2.2 AA accessibility (extended time, font size, high-contrast) | Engineering | Faz I |
| G-4 | Session pause/resume with fraud check on resume | Engineering | Faz II |
| G-5 | Formal appeals procedure | Assessment Director + Legal | Faz II |
| G-6 | Candidate handbook and public-facing test guide | Assessment Director | Faz I |

### Moderate Gaps (fix before Q-Mark application)

| ID | Gap | Owner | Target Phase |
|----|-----|-------|--------------|
| G-7 | KVKK + GDPR data retention policy document | Legal | Faz II |
| G-8 | IRR report (QWK ≥ 0.80) for AI writing/speaking scorer | Psychometrics | Faz II |
| G-9 | Anchor calibration procedure documentation | Psychometrics | Faz I |
| G-10 | Item audit trail for manual edits | Engineering | Faz II |
| G-11 | Public privacy notice with lawful basis statements | Legal | Faz I |

---

## EALTA Good Practice Guidelines Cross-reference

The European Association for Language Assessment (EALTA) guidelines overlap significantly with the ALTE Code of Practice. Key additions:

| EALTA Principle | b4skills Note |
|----------------|---------------|
| Washback: test should promote beneficial learning | CAT provides level-appropriate items; post-test can-do feedback ✅ |
| Transparency: scoring criteria published | Rubrics exist but not yet publicly accessible ⚠️ |
| Authenticity: tasks reflect real-world language use | Reading/listening passages from authentic domains; speaking tasks target real scenarios ✅ |
| Practicality: test is feasible for target context | Online delivery, ~30 min; mobile-compatible ✅ |
| Impact: monitoring test use and consequences | Usage analytics in Admin dashboard ✅; societal impact study pending 🔲 |

---

## ALTE Q-Mark Application Prerequisites

To apply for the ALTE Q-Mark, the following must be complete:

- [ ] Self-assessment completed against all 17 ALTE Q-Mark criteria
- [ ] External audit by ALTE-approved auditor scheduled
- [ ] Validity argument published and peer-reviewed
- [ ] Standard-setting report with human panel data
- [ ] DIF audit covering gender, L1, age group
- [ ] Equating study across at least 2 test forms
- [ ] Candidate handbook published
- [ ] Appeals procedure published and tested

**Estimated earliest application date**: Phase IV (12–18 months from Phase I start)

---

## References

- ALTE (2016). *Code of Practice for Language Test Developers and Providers*. Cambridge: ALTE. https://www.alte.org/resources/Documents/ALTE%20Code%20of%20Practice%20EN.pdf
- EALTA (2006). *EALTA Guidelines for Good Practice in Language Testing and Assessment*. https://www.ealta.eu.org/guidelines.htm
- Council of Europe (2020). *Common European Framework of Reference for Languages: Learning, Teaching, Assessment — Companion Volume*. Strasbourg.
- AERA/APA/NCME (2014). *Standards for Educational and Psychological Testing*. Washington, DC.
