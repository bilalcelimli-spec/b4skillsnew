# World-Class Adaptive Test Engine — Gap Analysis & Roadmap

> **Target:** Operational parity with GMAT (Pearson VUE PROCTOR), Cambridge Linguaskill,
> Duolingo English Test (DET), GRE, PTE Academic, and ETS POWERPREP.
>
> **Duration:** 18 months across three phases.
>
> **Psychometric references:**
> - van der Linden & Glas (2010) *Computerized Adaptive Testing: Theory and Practice*
> - Wainer et al. (2007) *Computerized Adaptive Testing: A Primer*, 2nd ed.
> - Yan, vonDavier & Lewis (2014) *Computerized Multistage Testing*
> - Drasgow, Levine & Williams (1985) "Appropriateness measurement with polychotomous item
>   response models and standardized indices"
> - Wollack (1997) "A nominal response model approach for detecting answer copying"
> - Davey & Parshall (1995) "New algorithms for item selection and exposure control"
> - Stocking (1990) "Specifying optimum examinees for summary item statistics"
> - Lord (1980) *Applications of Item Response Theory to Practical Testing Problems*
>
> **Owner:** Assessment Director / Engineering Lead
> **Last updated:** 2026-05

---

## 1. Current State — What Exists

| Module | File | Maturity |
|--------|------|----------|
| 3PL IRT + EAP estimator | `assessment-engine/estimator.ts` | ✅ Mature |
| MIRT 2B (compensatory) | `psychometrics/mirt-2b.ts` | ✅ Mature |
| GRM (polytomous IRT) | `psychometrics/graded-response-model.ts` | ✅ Mature |
| MST router (Junior Suite) | `selection/mst-router.ts` | 🟡 Partial |
| Shadow test solver | `psychometrics/shadow-test-solver.ts` | 🟡 Partial |
| Sympson-Hetter exposure | `selection/cat-selector.ts` | 🟡 Stub |
| Mantel-Haenszel DIF | `psychometrics/dif-analysis.ts` | ✅ Mature |
| Alpha-stratification | `psychometrics/alpha-stratification.ts` | ✅ Mature |
| CINEG equating | `psychometrics/equating-cineg.ts` | ✅ Mature |
| Bayesian calibration | `psychometrics/bayesian-calibration.ts` | ✅ Mature |
| Response-time IRT | `psychometrics/response-time-irt.ts` | ✅ Mature |
| CDM/DINA | `psychometrics/cdm-dina.ts` | ✅ Mature |
| Livingston-Lewis consistency | `psychometrics/classification-consistency.ts` | ✅ New |
| BCa bootstrap cut scores | `psychometrics/canonical-cut-scores.ts` | ✅ Mature |
| Subscore reliability | `psychometrics/subscore-reliability.ts` | ✅ New |
| Vocabulary profiler | `language-skills/vocabulary-profiler.ts` | ✅ New |
| Person-fit (Lz/ECI4/Wollack) | `psychometrics/person-fit.ts` | ✅ **Sprint 1** |
| Davey-Parshall exposure | `selection/exposure-control-davey-parshall.ts` | ✅ **Sprint 1** |
| Item Parameter Drift (IPD) | `psychometrics/item-parameter-drift.ts` | ✅ **Sprint 1** |

---

## 2. World-Class Benchmark

### 2.1 Algorithmic Depth

| Component | GMAT | DET | Linguaskill | b4skills (target) |
|-----------|------|-----|-------------|-------------------|
| Item selection | KL-info + content balance | MFI + RL | MFI + Sympson-Hetter | MFI → KL (Phase 2) |
| Stopping | Fixed 76q + SEM | Variable, Bayesian | SEM ≤ 0.32 | SEM ✅ |
| Exposure control | Davey-Parshall + α-strat | Sympson-Hetter + RL | Sympson-Hetter | **D-P Sprint 1** ✅ |
| Content balancing | 0-1 LP (Stocking-Lewis) | WDM real-time | Shadow test | Shadow → 0-1 LP (Phase 2) |
| Aberrance detection | Lz + RT | Lz + RT + CV | Lz + RT | **Lz Sprint 1** ✅ |
| Online calibration | Stocking 1990 | RL concurrent | OCM | Partial → Phase 2 |
| Person-fit | Lz, ECI4 | Lz | Lz | **Sprint 1** ✅ |
| Cheating detection | Wollack EDA | DET-CHECK | Wollack | Phase 2 |
| Process data | Click + RT | Full clickstream | RT | Phase 3 |

### 2.2 Critical Gaps

#### 🔴 RED — Validity Threat (6 months)

| ID | Gap | Impact |
|----|-----|--------|
| R1 | Item bank size (~200 vs 10 500 target) | Exposure control impossible |
| R2 | Sympson-Hetter stub → Davey-Parshall real | Biased item selection |
| R3 | No person-fit / aberrance detection | Cheating/guessing undetected |
| R4 | Greedy → 0-1 LP form assembly | Content balance suboptimal |
| R5 | No Item Parameter Drift monitoring | Parameter error accumulation |
| R6 | AI-scoring drift no auto-rollback | Classification accuracy drift |

#### 🟡 YELLOW — Quality Gap (6-12 months)

| ID | Gap |
|----|-----|
| Y1 | MIRT 2D → 4D (receptive/productive/grammar/strategic) |
| Y2 | MFI only → KL-info + MPWI hybrid |
| Y3 | Offline → online pretest calibration (Stocking 1990) |
| Y4 | No cheating detection (Wollack EDA, K-index, collusion graph) |
| Y5 | No vertical linking (PRE_A1 ↔ C2 single scale) |
| Y6 | DINA stub → G-DINA with Q-matrix |

---

## 3. Three-Phase Roadmap

### Phase 1 — Algorithmic Core (Months 1–6)

#### Month 1–2: Item bank scaling (R1)
- **Target:** 200 operational + 50 pretest × 6 skills × 7 levels = 10 500 items
- **Method:** Bulk AI generation pipeline → 100 items/day → 90 days to target
- **Gate:** Each item: 3-persona pipeline + MH pretest + expert sign-off
- **Module:** `language-skills/ai-item-generator.ts` (already has bulk API)

#### Month 2–3: Davey-Parshall exposure control (R2) ✅ Sprint 1
- **File:** `selection/exposure-control-davey-parshall.ts`
- **Algorithm:** Conditional multinomial — per-stratum α probabilities
- **Target:** No item > 20% exposure rate in any θ stratum
- **Validation:** A/B vs Sympson-Hetter: exposure variance, content overlap Jaccard < 0.30

#### Month 3–4: Person-fit / aberrance (R3) ✅ Sprint 1
- **File:** `psychometrics/person-fit.ts`
- **Statistics:** Lz (Drasgow 1985), ECI (Tatsuoka 1984), Wollack ω
- **Cutoffs:** Lz < −2.0 → FLAGGED; Lz < −3.0 → INVALID
- **Integration:** `finalizeSession` → `diagnosticReport.personFit`; admin review queue

#### Month 4–5: 0-1 LP form assembly (R4)
- **Tool:** `javascript-lp-solver` + WDM constraint generation
- **Constraints:** Content (skill blueprint), statistical (TIF target), exposure (k_max per item)
- **File:** `psychometrics/shadow-test-solver.ts` → LP upgrade
- **Reference:** van der Linden (2005) *Linear Models for Optimal Test Design*

#### Month 5–6: IPD monitoring (R5) ✅ Sprint 1 + AI-scoring drift (R6)
- **File:** `psychometrics/item-parameter-drift.ts`
- **Algorithm:** Lord chi-square + robust z-score per item (a, b, c over rolling windows)
- **Cron:** `.github/workflows/item-parameter-drift.yml` — monthly
- **Action:** |z| > 2.0 → retire queue; > 3.0 → immediate retire
- **AI-scoring:** QWK SLO + concurrent recalibration with auto-rollback at QWK < 0.75

### Phase 2 — Operational Maturity (Months 7–12)

#### Month 7–8: KL-information selection (Y2)
- **File:** `psychometrics/kl-information.ts`
- **Algorithm:** Chang & Ying (1996) KL divergence between prior and posterior
- **Hybrid rule:** First 5 items → KL; remaining → MFI
- **Benefit:** More robust at low n with high θ uncertainty

#### Month 8–9: Online pretest calibration (Y3)
- **Algorithm:** Stocking (1990) marginal MLE concurrent estimation
- **Schedule:** Nightly batch after 200+ new pretest responses per item
- **Module:** `assessment-engine/calibration-service.ts` upgrade with concurrent EM

#### Month 9–10: Cheating detection (Y4)
- **Directory:** `psychometrics/test-security/`
- **Modules:** K-index (Sotaridona 2002), Wollack ω, S2 statistic (van der Linden 2003)
- **Collusion:** Shared IP + RT pattern + response pattern overlap scoring
- **Admin:** Flagged sessions → admin review queue + escalation workflow

#### Month 10–12: Vertical scaling (Y5)
- **Design:** Common-item non-equivalent groups across PRE_A1 ↔ C2
- **Method:** Stocking-Lord or Haebara characteristic curve linking
- **Output:** Growth reports — one candidate's two exams on same θ scale
- **Value:** "Learner grew +0.8 θ units (B1→B2) in 6 months"

### Phase 3 — AI Augmentation (Months 13–18)

#### Month 13–14: MIRT 4D (Y1)
- **Dimensions:** θ = (θ_receptive, θ_productive, θ_grammatical, θ_strategic)
- **Item params:** 4D a-vector + scalar b per item
- **Estimation:** Variational EM or MCMC (PyMC service)
- **Value:** "Strong grammar, weak receptive" — precise subscore profiles

#### Month 14–15: Process data analytics
- **Data:** Full clickstream — keystrokes, focus events, idle time, navigation
- **Model:** HMM-based behavioral segmentation → test-taking strategy profile
- **Output:** Low-effort flag, rapid-guessing detection, cheating signal

#### Month 15–16: G-DINA diagnostic feedback (Y6)
- **Q-matrix:** 6 skills × 7 levels × n attributes
- **Model:** G-DINA (de la Torre 2011) replaces DINA stub
- **Output:** Per-attribute mastery probability in candidate report
- **Example:** "Past simple — 87% mastery; Reported speech — 41%"

#### Month 16–18: RL-based item selection (experimental)
- **Inspired by:** DET 2023+ approach
- **State:** (θ, SEM, item_history, time_elapsed, content_gaps)
- **Action:** Next item from top-k MFI candidates
- **Reward:** −SEM_final − exposure_penalty − content_imbalance_penalty
- **Algorithm:** PPO or REINFORCE; offline policy learning on historical data

---

## 4. Key Performance Indicators

### Psychometric Targets

| KPI | Current | World-class | 12-month target |
|-----|---------|-------------|-----------------|
| Marginal reliability | ~0.78 | ≥ 0.92 | **≥ 0.90** |
| Conditional SEM @ cuts | ~0.45 | ≤ 0.30 | **≤ 0.35** |
| Test information @ θ=0 | ~5 | ≥ 12 | **≥ 10** |
| Decision consistency (κ) | ~0.65 | ≥ 0.85 | **≥ 0.82** |
| Classification accuracy | ~0.75 | ≥ 0.92 | **≥ 0.88** |
| AI-human QWK (W+S) | 0.80 | ≥ 0.85 | **≥ 0.84** |
| Concurrent validity (vs Linguaskill) | — | r ≥ 0.78 | **r ≥ 0.80** |

### Operational Targets

| KPI | Target |
|-----|--------|
| Item selection latency | < 50ms p99 |
| Max item exposure rate | ≤ 20% per stratum |
| Item bank size | ≥ 10 500 items |
| Pretest renewal rate | 15% / year |
| Form diversity (seed-Jaccard) | < 0.30 |
| IPD detection lag | ≤ 30 days |

### Test Security Targets

| KPI | Target |
|-----|--------|
| Person-fit Lz outlier rate | < 5% (legitimate examinees) |
| Cheating flag precision | ≥ 80% |
| Max exposure to single candidate | 0% (never repeat) |
| RT aberrance detection sensitivity | ≥ 85% |

---

## 5. Investment Estimate

| Phase | Duration | Resources | Cost (USD) |
|-------|----------|-----------|-----------|
| Phase 1 (Algorithmic core) | 6 months | 1 senior dev + 0.3 psychometrician | ~$60K |
| Phase 2 (Operational maturity) | 6 months | 1 dev + 0.5 SRE | ~$70K |
| Phase 3 (AI augmentation) | 6 months | 1 dev + 0.5 ML engineer | ~$80K |
| **Total 18 months** | | | **~$210K** |

---

## 6. Sprint 1 — Immediate 30-Day Deliverables

| Day | Task | File | Status |
|-----|------|------|--------|
| 1–3 | Person-fit Lz + ECI4 + Wollack ω | `psychometrics/person-fit.ts` | ✅ Done |
| 4–8 | Davey-Parshall exposure control | `selection/exposure-control-davey-parshall.ts` | ✅ Done |
| 9–11 | Item Parameter Drift monitoring | `psychometrics/item-parameter-drift.ts` | ✅ Done |
| 12–14 | IPD monthly cron workflow | `.github/workflows/item-parameter-drift.yml` | ✅ Done |
| 15–20 | Wire person-fit into finalizeSession | `assessment-engine/server-engine.ts` | ✅ Done |
| 21–25 | Wire D-P into CAT selector | `selection/cat-selector.ts` | ✅ Done |
| 26–30 | Full test suite + commit + push | all test files | ✅ Done |

---

## 7. Revision History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-05 | Initial gap analysis + 18-month roadmap |
| — | 2026-Q3 | Phase 1 completion review (planned) |
| — | 2026-Q4 | Phase 2 kick-off (planned) |
| — | 2027-Q2 | Phase 3 kick-off (planned) |
