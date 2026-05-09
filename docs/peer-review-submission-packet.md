# Peer-Review / Psychometrician Audit Submission Packet

**Target Venue Options (priority order):**
1. *Language Testing* (SAGE / ILTA) — IF 3.2, double-blind peer review
2. *Language Assessment Quarterly* (Taylor & Francis) — IF 2.8
3. *Applied Linguistics* (Oxford) — IF 4.1 (broader applied linguistics readership)
4. LTRC 2027 (Language Testing Research Colloquium) — conference paper pathway

**Document Version:** 1.0  
**Prepared:** 2026-05-09  
**Status:** Pre-submission draft — empirical data placeholders marked `[DATA NEEDED]`

---

## Part I: Proposed Manuscript Abstract

### Title
*Adaptive CEFR Assessment at Scale: A CAT Architecture for Multi-Skill English Proficiency Testing with AI-Assisted Constructed-Response Scoring*

### Abstract (250 words — journal limit)

This paper presents the psychometric architecture of b4skills, a production adaptive English proficiency platform serving corporate and educational assessment contexts. The system integrates a 3-Parameter Logistic (3PL) IRT engine with Expected A Posteriori (EAP) ability estimation using hierarchical organizational priors, a shadow-test item assembly algorithm ensuring blueprint feasibility under van der Linden's (2005) constraints, Sympson–Hetter exposure control, and a six-dimensional Multidimensional IRT (MIRT) model for skill-level diagnostic reporting.

Constructed-response tasks (speaking and writing) are scored by a calibrated large language model (Gemini 1.5 Pro) with a nine-detector integrity guard, rolling AI–human agreement monitoring (QWK, MAE, Pearson-r), and automatic escalation to human review when agreement drops below acceptance thresholds. Sequential Probability Ratio Test (SPRT) stopping rules provide statistically grounded classification confidence at CEFR band boundaries.

Psychometric validation follows Kane's (2013) argument-based validity framework across five inferences: scoring, generalization, extrapolation, theory-based, and utilization. We report [DATA NEEDED: parameter recovery simulation results, IRR statistics, and classification accuracy from the live deployment pilot]. Common-item CINEG equating links test forms across non-equivalent groups using Tucker and Levine–True-Score methods.

The platform's open psychometric engine (vitest-certified, 489 automated tests) offers a reproducible, auditable reference implementation for institutions seeking CEFR-aligned adaptive assessment beyond traditional paper-based or fixed-form testing.

**Keywords:** computerized adaptive testing, CEFR, IRT, constructed-response scoring, AI assessment, language testing validity

---

## Part II: Manuscript Outline

### 1. Introduction
- Gap: existing adaptive English assessment (IELTS Indicator, Linguaskill, Duolingo English Test) treat CAT as a black box; no published psychometric architecture with open implementation
- Contribution: full validity argument + open test engine as reproducible artifact
- Scope: placement, progress, and certification-adjacent use cases

### 2. Theoretical Framework
- 2.1 CEFR as construct definition (Council of Europe 2001, 2020 Companion Volume)
- 2.2 Kane (2013) argument-based validity
- 2.3 3PL IRT and EAP estimation (Baker & Kim 2004; Mislevy 1991)
- 2.4 CAT design principles (van der Linden & Glas 2010)
- 2.5 AI-assisted scoring in high-stakes assessment (review: Ramineni & Williamson 2013; Bejar 2011)

### 3. System Architecture
- 3.1 Item bank structure (6 skills × 7 CEFR levels × item types)
- 3.2 EAP estimator with hierarchical priors
- 3.3 Shadow-test assembly and blueprint constraints
- 3.4 Multi-Stage Testing (MST) hybrid with CAT fallback
- 3.5 Exposure control (Sympson–Hetter, α-stratification)
- 3.6 Stopping rules: test information ≥ 12, conditional SEM, SPRT, classification confidence
- 3.7 MIRT 6D model and diagnostic sub-scoring
- 3.8 AI-scoring pipeline (Gemini + integrity guard + human review escalation)

### 4. Validity Evidence

#### 4.1 Scoring Inference
- AI–human QWK: `[DATA NEEDED: QWK ≥ 0.80?]` (target: N ≥ 100 paired ratings per skill)
- Integrity guard performance: `[DATA NEEDED: false positive / negative rates]`
- RT-IRT rapid-guess detection: `[DATA NEEDED: flagging rate vs. random-response simulation]`

#### 4.2 Generalization Inference
- Item bank coverage: `[DATA NEEDED: items per skill × CEFR cell from bank-report API]`
- Conditional SEM curves across θ: `[DATA NEEDED: from live session data]`
- Marginal reliability: `[DATA NEEDED: from 500-candidate pilot]`

#### 4.3 Extrapolation Inference
- CEFR construct map congruence: `[DATA NEEDED: expert panel rating]`
- DIF analysis: `[DATA NEEDED: Mantel–Haenszel, N ≥ 200 per focal group]`

#### 4.4 Theory-Based (Construct) Inference
- MIRT factor structure: `[DATA NEEDED: CFA loadings, inter-factor correlations]`
- Item fit: `[DATA NEEDED: infit/outfit distribution]`

#### 4.5 Utilization Inference
- CEFR classification accuracy: `[DATA NEEDED: % correct at band centres]`
- Standard-setting report (docs/standard-setting-report.md): Modified Angoff

### 5. Monte Carlo Simulation Study
- Parameter recovery: bias < 0.10 θ, RMSE < 0.50 θ (N = 200 simulees, 30-item test, seed 424242) — **COMPLETED** ✅
- CEFR classification accuracy > 70% at band centres — **COMPLETED** ✅
- Hierarchical prior superiority on short tests — **COMPLETED** ✅

### 6. Discussion
- Contributions to CAT / language assessment literature
- Limitations: AI scorer versioning, CEFR construct operationalization gaps
- Future directions: eye-tracking study, concurrent validity vs. IELTS

### 7. Conclusion

### References (APA 7th)
> Key references to include:
> - Baker, F. B., & Kim, S.-H. (2004). *Item response theory: Parameter estimation techniques* (2nd ed.). Marcel Dekker.
> - Council of Europe. (2001). *Common European framework of reference for languages*. Cambridge University Press.
> - Council of Europe. (2020). *CEFR companion volume*. Council of Europe Publishing.
> - Kane, M. T. (2013). Validating the interpretations and uses of test scores. *Journal of Educational Measurement, 50*(1), 1–73.
> - Kolen, M. J., & Brennan, R. L. (2014). *Test equating, scaling, and linking* (3rd ed.). Springer.
> - Mislevy, R. J. (1991). Randomization-based inference about latent variables from complex samples. *Psychometrika, 56*(2), 177–196.
> - Ramineni, C., & Williamson, D. M. (2013). Automated essay scoring: Psychometric guidelines and practices. *Assessing Writing, 18*(1), 25–39.
> - Sympson, J. B., & Hetter, R. D. (1985). Controlling item-exposure rates in computerized adaptive testing. *Proceedings of the 27th Annual Conference of the Military Testing Association*, 973–977.
> - van der Linden, W. J. (2005). *Linear models for optimal test design*. Springer.
> - van der Linden, W. J., & Glas, C. A. W. (Eds.). (2010). *Elements of adaptive testing*. Springer.

---

## Part III: Independent Psychometrician Audit Checklist

The following checklist is suitable for providing to an independent psychometrician reviewer (e.g., via ILTA's network or a licensed Assessment Specialist).

### A. Item Bank Audit
- [ ] Item bank inventory report (`GET /api/items/bank-report`) — verify ≥ 30 active items per skill × CEFR cell
- [ ] IRT parameter distribution review: discrimination (a) range, difficulty (b) coverage, guessing (c) < 0.35
- [ ] At-risk items (low discrimination, high guessing) — action plan required
- [ ] CEFR tagging accuracy: random sample of 50 items checked against official CEFR descriptors

### B. Calibration and Equating Audit
- [ ] Anchor calibration report (last 3 runs): drift flagging rate, items retired for parameter instability
- [ ] CINEG equating study: Tucker + Levine results, anchor RMSD ≤ 0.20
- [ ] DIF audit: Mantel–Haenszel by L1 and gender; no large DIF (> 0.426 logits) in deployed items

### C. Scoring Validity Audit
- [ ] AI–human agreement: QWK ≥ 0.80 for speaking and writing (provide sample data)
- [ ] Rolling agreement windows: no drift flagged in last 30 days
- [ ] Integrity guard: false-positive rate ≤ 5% on known-good responses

### D. CAT Engine Audit
- [ ] Shadow-test blueprint: verify items span all target content domains
- [ ] Exposure control: max item exposure rate ≤ 0.20 in live data
- [ ] Stopping rule validation: `test/simulation/parameter-recovery.test.ts` passes
- [ ] SPRT type-I and type-II error rates within configured α, β bounds

### E. Validity Documentation Audit
- [ ] `docs/validity-argument.md`: all Phase I evidence fields populated
- [ ] `docs/standard-setting-report.md`: Angoff panel convened, minutes recorded
- [ ] `docs/alte-code-of-practice.md`: all applicable clauses addressed
- [ ] `docs/kvkk-gdpr-compliance.md`: reviewed by legal/DPO

### F. Code and Test Audit
- [ ] `npm run type-check`: zero errors ✅
- [ ] `npm test`: ≥ 489 passing tests ✅
- [ ] `npm run test:coverage`: lines ≥ 75%, functions ≥ 78%, branches ≥ 65%
- [ ] CI pipeline: all jobs pass on `main` branch

---

## Part IV: Data Collection Plan for Full Submission

The following data are required before manuscript submission. Estimated timeline assumes platform launch with 50+ daily active test sessions.

| Evidence | Source | N Required | Est. Timeline |
|---|---|---|---|
| AI–human IRR (QWK) for speaking | Score logs + human rater panel | 150 pairs per skill | 3–4 months post-launch |
| Conditional SEM across θ range | Live session data | 500+ sessions | 3 months post-launch |
| MIRT factor structure (CFA) | Live response data | 500+ candidates | 4 months post-launch |
| DIF analysis (Mantel–Haenszel) | Live response data | ≥ 200 per focal group | 6 months post-launch |
| Concurrent validity vs. IELTS/Linguaskill | Recruited sample | 100+ paired candidates | 12 months post-launch |
| Standard setting study | Expert panel | ≥ 8 raters | Pre-launch (Q3 2026) |
| Classification accuracy at band centres | Simulation + live | Simulated: done ✅ Live: 200+ | 3 months post-launch |

---

## Part V: Submission Checklist (*Language Testing*)

- [ ] Title page with all author affiliations (anonymized for peer review)
- [ ] Abstract ≤ 250 words
- [ ] Keywords 5–8 terms
- [ ] Word count within 8,000 words (excl. references, tables, figures)
- [ ] APA 7th style references
- [ ] All figures submitted as separate TIFF/PDF (300 dpi)
- [ ] Ethics statement: data collected under institutional approval / KVKK consent
- [ ] Supplementary materials: `vitest.config.ts`, simulation test results, item bank snapshot
- [ ] Cover letter addressing *Language Testing* editor on novel contribution
- [ ] Conflict of interest statement
- [ ] Data availability statement (open code; data available upon request)
