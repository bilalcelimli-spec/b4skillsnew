# Validity Argument — b4skills Adaptive English Assessment Platform

> **Framework**: Kane (2013) — Validity as Argument  
> **Version**: 0.1 (Phase I draft — populate with empirical evidence as data accumulates)  
> **Status**: Template — claims require supporting evidence from standard-setting and calibration studies  
> **Owner**: Assessment Director / Psychometrician  
> **Last updated**: 2026-05

---

## Overview

This document maps the b4skills assessment to Michael Kane's (2013) argument-based approach to validity. The approach requires specifying the **Interpretive/Use Argument (IUA)** — the chain of inferences from observed performance to intended decision — and then building an **Validity Argument** that supports or challenges each link.

The five inferences below correspond to the scoring, generalization, extrapolation, theory-based, and utilization claims identified in Kane's framework, adapted here for a CEFR-referenced CAT.

---

## Intended Interpretation and Use

> **Score interpretation**: A candidate's final θ estimate, mapped to a CEFR level (Pre-A1 → C2), reflects their general English language proficiency on the six CEFR macro-skills (reading, listening, writing, speaking, grammar, vocabulary).

> **Intended use**: (1) Placement decisions in educational programs; (2) B2B hiring/screening certificates; (3) Progress monitoring.

---

## Inference 1 — Scoring

**Claim**: The observed item scores are a faithful reflection of the construct being measured.

### Warrants
- W1.1: Items are scored using a calibrated 3PL IRT model with EAP ability estimator and hierarchical prior.
- W1.2: Constructed-response items (speaking, writing) are scored by a calibrated AI rubric (Claude Sonnet) cross-checked against human rater anchor sets.
- W1.3: Response-time outlier detection (RT-IRT; van der Linden 2007) flags rapid-guess responses; flagged items receive adjusted scores.
- W1.4: The pre-scoring integrity guard detects copy-paste, keyboard-junk, and adversarial inputs before scoring.

### Rebuttals (acknowledged threats)
| Threat | Severity | Mitigation |
|--------|----------|------------|
| AI scorer drift between model versions | Medium | Anchor-set recalibration on every model update |
| Construct-irrelevant variance from test anxiety | Low | Standard CAT design; session time-limit guards |
| Response-time manipulation (deliberate slowdown) | Low | RT z-score distribution audit |

### Evidence needed (Phase I)
- [ ] Inter-rater reliability report (IRR) for speaking/writing: QWK ≥ 0.80 against trained human raters
- [ ] AI scorer anchor-set calibration report (N ≥ 30 anchor items per skill)
- [ ] RT-IRT parameter recovery study (simulation)

---

## Inference 2 — Generalization

**Claim**: The observed performance on the specific set of items administered during one CAT session generalizes to the broader domain of English language proficiency at the claimed CEFR level.

### Warrants
- W2.1: CAT shadow-test assembly uses a blueprint that samples across CEFR descriptors and content domains (van der Linden 2005).
- W2.2: Sympson-Hetter exposure control (ψ ≤ 0.20 default) prevents over-reliance on a subset of items.
- W2.3: Test reliability: conditional SEM near CEFR band boundaries ≤ 0.45 θ units; marginal reliability ρ ≥ 0.93.
- W2.4: Subscore reliability of difference scores is calculated and reported for diagnostic use.

### Rebuttals
| Threat | Severity | Mitigation |
|--------|----------|------------|
| Small item bank → exposure → item pre-knowledge | High | Target ≥ 30 active items per skill × CEFR cell; Phase I priority |
| Blueprint coverage gaps (low-frequency CEFR descriptors) | Medium | Annual blueprint audit against CEFR Companion Volume 2020 |
| Test-form variability before equating | Medium | CINEG equating across forms (Phase II) |

### Evidence needed (Phase I → II)
- [ ] Item bank inventory showing ≥ 30 active items per skill × CEFR cell (see Admin → Item Inventory)
- [ ] Exposure rate distribution: max ψ per item ≤ 0.20
- [ ] Conditional SEM curve across θ range (−4 to +4)
- [ ] Subscore reliability report (Livingston-Lewis classification consistency)

---

## Inference 3 — Extrapolation

**Claim**: Performance on the b4skills test reflects real-world English language ability in non-testing contexts (i.e., the construct as defined by the CEFR descriptors).

### Warrants
- W3.1: Item specifications (item-writing-framework.ts) are mapped to CEFR Can-Do descriptors in the CEFR Companion Volume 2020.
- W3.2: Cognitive Diagnostic Model (DINA/G-DINA, Phase III) provides fine-grained construct map aligned to CEFR skill sub-components.
- W3.3: Readability analysis (readability-engine.ts) ensures passage complexity matches CEFR lexical and syntactic norms.
- W3.4: MIRT 6-dimensional model captures skill-specific variance; composite θ is a weighted combination.

### Rebuttals
| Threat | Severity | Mitigation |
|--------|----------|------------|
| CEFR construct operationalized only in MC and FIB formats | High | Extend to speaking (ASR + rubric) and writing (AI + human) |
| Test method effect (CAT format vs. paper) | Medium | Comparative validity study (Phase IV; n ≥ 100 vs. Cambridge Linguaskill) |
| Cultural bias in stimuli | Medium | Annual DIF audit by native language and cultural background |

### Evidence needed (Phase II → IV)
- [ ] CEFR construct map document (docs/cefr-construct-map.md)
- [ ] Content coverage audit: items tagged against CEFR A-level and Companion Volume descriptors
- [ ] Concurrent validity: Pearson r ≥ 0.80 with Linguaskill / IELTS scores on paired sample (Phase IV)
- [ ] Kane-style alignment study: expert panel rates item-descriptor congruence

---

## Inference 4 — Theory-Based (Theoretical / Construct Inference)

**Claim**: The construct measured — "general English language proficiency" — is theoretically well-defined, distinguishable from related constructs, and operationalized in a way that supports score interpretation.

### Warrants
- W4.1: The construct is defined per the Council of Europe CEFR (2001/2020), the most widely adopted international framework for English proficiency.
- W4.2: MIRT 6D model provides discriminant validity evidence across skills (skill intercorrelations r = 0.55–0.82 expected; to be measured empirically).
- W4.3: IRT item fit statistics (infit/outfit) provide model-data fit evidence for each item.
- W4.4: Item Review pipeline (3-persona Writer/Reviewer/Reviser + QA Gate) ensures cognitive alignment with target proficiency level before deployment.

### Rebuttals
| Threat | Severity | Mitigation |
|--------|----------|------------|
| "General proficiency" conflates productive and receptive skills | Medium | Separate theta estimates for receptive (R+L) and productive (W+S) dimensions reported in DiagnosticReport |
| Cognitive processes not verified (only products) | High | Phase III: Cognitive Diagnostic Models; eye-tracking study (future) |
| AI-generated items may lack ecological construct validity | Medium | Pretest pipeline: item survives only if empirical b aligns within ±0.5 of LLM-estimated b |

### Evidence needed (Phase II → III)
- [ ] Factor structure report: MIRT confirmatory factor analysis on response data (N ≥ 500 candidates)
- [ ] Item fit report: infit/outfit ≤ 1.5 for ≥ 90% of active items
- [ ] LLM b-estimate vs. empirical b correlation: r ≥ 0.75 (Phase II pretest study)

---

## Inference 5 — Utilization (Decision Validity)

**Claim**: The CEFR-level classifications and score reports produced by b4skills lead to appropriate decisions for the intended uses.

### Warrants
- W5.1: CEFR cut scores are set using Modified Angoff method with a trained rater panel (N ≥ 8); see docs/standard-setting-report.md (Phase I deliverable).
- W5.2: Classification confidence is reported (posterior probability of CEFR level assignment); decisions near band boundaries are flagged as "borderline."
- W5.3: SPRT-based early stopping triggers classification certainty (β ≤ 0.05, α ≤ 0.05) at CEFR boundaries.
- W5.4: Score reports include Can-Do descriptors and diagnostic skill breakdowns to support actionable use.

### Rebuttals
| Threat | Severity | Mitigation |
|--------|----------|------------|
| Cut scores set without empirical data (Phase I bootstrapped) | Critical | Replace hardcoded thresholds with Angoff-based cuts by Phase I completion |
| Misuse: hiring decision based solely on b4skills score | Medium | Score report includes confidence interval and explicit "not a standalone hiring credential" disclaimer |
| Score inflation via test prep on exposed items | Medium | Exposure control; item bank rotation |

### Evidence needed (Phase I)
- [ ] Standard setting report (docs/standard-setting-report.md): Modified Angoff, N ≥ 8 panelists, documented cut-score justification
- [ ] Classification accuracy study: % correct CEFR classification ≥ 92% at band centers
- [ ] Decision consistency: Livingston-Lewis κ ≥ 0.80

---

## Summary of Priority Actions (Phase I)

| Priority | Inference | Action | Effort |
|----------|-----------|--------|--------|
| P1 | Scoring | IRR study for speaking/writing (AI vs human) | 40h |
| P1 | Utilization | Standard setting workshop (Modified Angoff) | 80h |
| P1 | Generalization | Item bank: reach ≥ 30 active/cell (6 skills × 7 CEFR) | Ongoing |
| P2 | Generalization | CINEG form equating (Phase II) | 60h |
| P2 | Extrapolation | CEFR construct map document | 20h |
| P2 | Theory | MIRT CFA on first 500-candidate dataset | 40h |
| P3 | Extrapolation | Concurrent validity study vs. Linguaskill (Phase IV) | 120h |
| P3 | Theory | Pretest pipeline: LLM b vs. empirical b correlation | 32h |

---

## References

- Kane, M. T. (2013). Validating the interpretations and uses of test scores. *Journal of Educational Measurement, 50*(1), 1–73.
- AERA/APA/NCME. (2014). *Standards for Educational and Psychological Testing*. Washington, DC.
- Council of Europe. (2020). *Common European Framework of Reference for Languages: Learning, Teaching, Assessment — Companion Volume*. Strasbourg.
- Bachman, L. F., & Palmer, A. (2010). *Language Assessment in Practice*. Oxford University Press.
- van der Linden, W. J. (2005). *Linear Models for Optimal Test Design*. Springer.
- Livingston, S. A., & Lewis, C. (1995). Estimating the consistency and accuracy of classifications based on test scores. *Journal of Educational Measurement, 32*(2), 179–197.
