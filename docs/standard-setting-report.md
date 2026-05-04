# Standard Setting Report — b4skills CEFR Cut Scores

> **Method**: Modified Angoff  
> **Status**: TEMPLATE — populate after Phase I panel study  
> **Required**: N ≥ 8 trained panelists  
> **API endpoints**: `POST /api/psychometrics/standard-setting/studies`  

---

## Purpose

This document records the process and outcomes of the standard-setting study that establishes the CEFR cut scores for the b4skills adaptive assessment. Current cut scores are hardcoded approximations derived from IRT theory; this report documents their replacement with panel-based, empirically-justified thresholds.

---

## Study Design

| Parameter | Value |
|-----------|-------|
| Method | Modified Angoff |
| Panel size | ≥ 8 (target 10–12) |
| Panelist profile | CEFR-certified EFL/ESL teachers with ≥ 3 years testing experience |
| Training | 2-hour orientation: CEFR descriptors, 3PL IRT, Angoff procedure |
| Anchor items per boundary | ≥ 10 items (seeded via AnchorSetService) |
| Boundaries covered | PRE_A1/A1, A1/A2, A2/B1, B1/B2, B2/C1, C1/C2 |
| Skills | READING, LISTENING, GRAMMAR (Phase I); extend to WRITING, SPEAKING in Phase II |
| Round-table discussion | 1 round of discussion after initial ratings, 1 re-rating round |

---

## Procedure

### Step 1 — Anchor Item Seed
Run:
```bash
curl -X POST /api/psychometrics/anchor-set/seed \
  -H "Content-Type: application/json" \
  -d '{"targetPerCell": 10, "requireMinN": 50}'
```
Verify coverage: `GET /api/psychometrics/anchor-set/summary`

### Step 2 — Create Study
```bash
curl -X POST /api/psychometrics/standard-setting/studies \
  -H "Content-Type: application/json" \
  -d '{"name": "Phase I Standard Setting — May 2026", "method": "ANGOFF"}'
```

### Step 3 — Panelist Training
Each panelist receives:
- CEFR Companion Volume 2020, Annex A (proficiency scale)
- Anchor item booklet (printed + digital) with CEFR descriptors per item
- Training video: "How to estimate Angoff probabilities"
- Practice round on 5 training items (not in final study)

### Step 4 — Round 1 Ratings
Panelists estimate: *"What is the probability that a candidate who just barely meets the [BOUNDARY] threshold would answer this item correctly?"*

Ratings submitted via:
```bash
curl -X POST /api/psychometrics/standard-setting/{studyId}/ratings \
  -d '{"ratings": [{"itemId": "...", "probability": 0.65}, ...]}'
```

### Step 5 — Round-Table Discussion
Facilitator presents:
- Item-level distribution of ratings across panelists
- Items with high inter-rater variability (SD > 0.20)
- CEFR descriptor for the boundary being discussed

### Step 6 — Round 2 Ratings (optional)
Panelists may revise ratings after discussion.

### Step 7 — Compute Cut Scores
```bash
curl -X POST /api/psychometrics/standard-setting/{studyId}/compute
```

### Step 8 — Review & Publish
Assessment Director reviews:
- Recommended θ cut vs. current hardcoded value
- 95% confidence interval on the cut
- Inter-rater reliability (κ ≥ 0.70 acceptable)

If accepted:
```bash
curl -X POST /api/psychometrics/standard-setting/{studyId}/publish
```

---

## Results (TEMPLATE — fill in after study)

| Boundary | Panelists | Items | Raw Cut | θ Cut | 95% CI | Panel SD | IRR (κ) | Status |
|----------|-----------|-------|---------|-------|--------|----------|---------|--------|
| PRE_A1/A1 | — | — | — | — | — | — | — | PENDING |
| A1/A2 | — | — | — | — | — | — | — | PENDING |
| A2/B1 | — | — | — | — | — | — | — | PENDING |
| B1/B2 | — | — | — | — | — | — | — | PENDING |
| B2/C1 | — | — | — | — | — | — | — | PENDING |
| C1/C2 | — | — | — | — | — | — | — | PENDING |

### Current vs. Proposed Cut Scores

| Boundary | Current (hardcoded) | Proposed (Angoff) | Δ |
|----------|--------------------|--------------------|---|
| PRE_A1/A1 | -3.0 | TBD | — |
| A1/A2 | -2.0 | TBD | — |
| A2/B1 | -1.0 | TBD | — |
| B1/B2 | 0.0 | TBD | — |
| B2/C1 | 1.0 | TBD | — |
| C1/C2 | 2.0 | TBD | — |

---

## Inter-Rater Reliability

| Boundary | ICC | Cronbach α | Decision |
|----------|-----|-----------|----------|
| PRE_A1/A1 | TBD | TBD | PENDING |
| A1/A2 | TBD | TBD | PENDING |
| A2/B1 | TBD | TBD | PENDING |
| B1/B2 | TBD | TBD | PENDING |
| B2/C1 | TBD | TBD | PENDING |
| C1/C2 | TBD | TBD | PENDING |

**Minimum acceptable ICC: 0.70** (Cicchetti 1994 — fair agreement).

---

## Panelist Roster (template — do not store credentials here)

| # | Role | CEFR cert | Years testing exp. | L1 | Signed NDA |
|---|------|-----------|-------------------|----|-----------|
| 1 | — | — | — | — | ☐ |
| 2 | — | — | — | — | ☐ |
| … | … | … | … | … | ☐ |

---

## Validity Linkage

This report provides evidence for **Inference 5 (Utilization)** in the b4skills Validity Argument (see [docs/validity-argument.md](validity-argument.md)):

> *"Cut scores are set using Modified Angoff method with a trained rater panel (N ≥ 8)."*

After publication:
- Update [docs/validity-argument.md](validity-argument.md) Inference 5 evidence table
- Retain raw rating data for audit (stored in SystemConfig JSON)
- Schedule annual re-study or after any major item bank revision (≥ 20% turnover)

---

## References

- Angoff, W. H. (1971). Scales, norms, and equivalent scores. In R. L. Thorndike (Ed.), *Educational Measurement* (2nd ed., pp. 508–600). Washington, DC: ACE.
- Hambleton, R. K., & Pitoniak, M. J. (2006). Setting performance standards. In R. L. Brennan (Ed.), *Educational Measurement* (4th ed., pp. 433–470). Westport, CT: ACE/Praeger.
- Cizek, G. J., & Bunch, M. B. (2007). *Standard Setting: A Guide to Establishing and Evaluating Performance Standards on Tests*. Thousand Oaks, CA: Sage.
- Council of Europe (2020). *CEFR Companion Volume*. Strasbourg: Council of Europe Publishing.
