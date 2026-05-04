# Adaptive Assessment Platform — Complete Plan
## Pedagogy, Psychometrics & Engineering

---

## 1. Pedagogical Framework

### 1.1 CEFR Alignment

All items are anchored to the Common European Framework of Reference for Languages (CEFR). The platform covers the full range including an extended PRE_A1 level for young learners and beginner adults.

| CEFR Level | IRT θ (theta) Range | Description |
|------------|-------------------|-------------|
| PRE_A1     | θ < −3.0          | Breakthrough — basic familiarity |
| A1         | −3.0 ≤ θ < −1.5   | Waystage — simple familiar topics |
| A2         | −1.5 ≤ θ < −0.5   | Elementary — everyday interaction |
| B1         | −0.5 ≤ θ < 0.5    | Threshold — independent user begins |
| B2         | 0.5 ≤ θ < 1.5     | Vantage — independent user |
| C1         | 1.5 ≤ θ < 2.5     | Effective Operational Proficiency |
| C2         | θ ≥ 2.5           | Mastery |

### 1.2 Age Groups & Product Lines

| Product Line       | Age Range | Focus |
|--------------------|-----------|-------|
| Primary (7-10)     | 7–10      | Simple vocabulary/grammar, visual prompts, familiar contexts (home, school, animals) |
| Junior Suite (11-14)| 11–14    | School, hobbies, friendship, technology, social issues |
| 15-Min Diagnostic  | All       | Rapid level placement; max 15 items; SEM ≤ 0.35 stopping rule |
| Language Schools   | 16+       | General English, travel, culture, everyday professional |
| Academia           | 17+       | Academic register, research topics, critical thinking, academic writing/speaking |
| Corporate          | 18+       | Business communication, negotiation, data presentation, professional register |
| SPECIALIZED        | 18+       | Domain-specific (legal, medical, technical) — future expansion |

### 1.3 Item Design Principles (State of the Art)

1. **Authenticity** — Items use real-world task types (emails, reports, discussions, narratives) not decontextualised exercises.
2. **Cognitive Challenge Gradient** — Lower levels test recognition/reproduction; higher levels test production, inference, critical analysis, and synthesis.
3. **Cultural Inclusivity** — Prompts draw from diverse cultural contexts; avoid culturally biased content.
4. **Distractor Plausibility** (MULTIPLE_CHOICE) — Each distractor represents a principled error type (phonological confusion, over-generalisation, semantic confusion, register mismatch).
5. **Passage Authenticity** (READING/LISTENING) — Passages represent authentic text types with genuine language variation.
6. **Holistic Scoring** (WRITING/SPEAKING) — AI-scored on 5-criterion rubric aligned to CEFR band descriptors.

---

## 2. Current Item Bank Status

### 2.1 Live Item Counts (as of current seed run)

| Skill      | PRE_A1 | A1 | A2 | B1 | B2 | C1 | C2 | **Total** |
|------------|--------|----|----|----|----|----|----|-----------|
| GRAMMAR    | 37     | 65 | 83 | 72 | 60 | 53 | 34 | **404**   |
| VOCABULARY | 20     | 35 | 40 | 40 | 30 | 25 | 10 | **200**   |
| READING    | –      | 5  | 9  | 8  | 9  | 12 | 15 | **58**    |
| LISTENING  | 10     | 10 | 29 | 23 | 46 | 25 | –  | **143**   |
| WRITING    | –      | –  | 10 | 14 | 14 | 12 | 5  | **55**    |
| SPEAKING   | –      | –  | 10 | 15 | 15 | 15 | 5  | **60**    |
| **Total**  | **67** | **115** | **181** | **172** | **174** | **142** | **69** | **920** |

### 2.2 Target Item Bank (for Robust Adaptive Operation)

CAT theory recommends ≥20 items per θ-unit; for a 7-level CEFR scale with 15-item tests, 50–80 items per level per tested skill is the minimum for adequate item exposure control.

| Skill      | Current | Target | Priority Gap |
|------------|---------|--------|-------------|
| GRAMMAR    | 404     | 600    | Add B1-C1 variety; add specialised contexts |
| VOCABULARY | 200     | 500    | +300 items, especially B2–C2 |
| READING    | 58      | 200    | +14 passages B1–C2 (passages have ~8 items each) |
| LISTENING  | 143     | 200    | +5 C1–C2 audio modules |
| WRITING    | 55      | 100    | +45 items (B1–C1 mainly) |
| SPEAKING   | 60      | 100    | +40 items (A1–B2 mainly) |

---

## 3. IRT Model & Psychometric Architecture

### 3.1 Item Models

| Skill Type | IRT Model | Score Scale | Parameters |
|-----------|-----------|-------------|------------|
| GRAMMAR | 3PL (Three-Parameter Logistic) | 0/1 | a (discrimination), b (difficulty), c (guessing) |
| VOCABULARY | 3PL | 0/1 | a, b, c |
| READING | 3PL | 0/1 | a, b, c |
| LISTENING | 3PL | 0/1 | a, b, c |
| WRITING | GRM (Graded Response Model) | 0–10 | a, b-vector (10 thresholds), c=0 |
| SPEAKING | GRM | 0–10 | a, b-vector (10 thresholds), c=0 |

### 3.2 Typical IRT Parameter Ranges

| CEFR | b (difficulty) | a (discrimination) | c (guessing, MC only) |
|------|---------------|--------------------|-----------------------|
| PRE_A1 | −3.5 to −2.5 | 0.9–1.1 | 0.20–0.25 |
| A1 | −2.8 to −1.5 | 1.0–1.2 | 0.20–0.25 |
| A2 | −1.8 to −0.5 | 1.1–1.3 | 0.20–0.25 |
| B1 | −0.5 to 0.5  | 1.2–1.4 | 0.20–0.25 |
| B2 | 0.4 to 1.2   | 1.3–1.5 | 0.15–0.20 |
| C1 | 1.0 to 2.0   | 1.4–1.6 | 0.15–0.20 |
| C2 | 1.5 to 3.0   | 1.4–1.6 | 0.10–0.15 |

### 3.3 Theta Estimation

- **Algorithm**: Expected A Posteriori (EAP) — numerically stable for short tests
- **Prior distribution**: N(0, 1) — updated after each response
- **Termination criteria**:
  1. SEM (standard error of measurement) ≤ 0.28 (primary)
  2. Maximum 15 items administered
  3. Maximum 45 minutes elapsed (safety cap)
- **Polytomous response integration**: For Writing/Speaking, AI score (0–10) is mapped to a polytomous likelihood contribution via GRM before EAP integration.

### 3.4 Item Selection

- **Algorithm**: Maximum Fisher Information (MFI)
- **Constraint**: Sympson-Hetter exposure control (target maximum exposure rate r ≤ 0.50)
- **Content blueprint** (enforced per-session):
  - No single sub-topic may contribute > 3 items
  - At least 2 CEFR levels must be represented in any test > 6 items
- **Shadow test** (future): Mixed-Integer Programming for full blueprint enforcement at scale

---

## 4. Adaptive Engine — Component Architecture

### 4.1 Core Components

```
src/
  services/
    adaptiveEngine.ts       ← Main CAT loop (theta est., item selection, stopping rules)
  lib/
    psychometrics/
      irt.ts                ← 3PL ICC, Fisher information, item characteristic functions
      graded-response-model.ts ← GRM for Writing/Speaking polytomous scoring
    scoring/
      gemini-scoring-service.ts ← AI scoring for Speaking (multimodal) + Writing
```

### 4.2 Session Flow

```
[Start Session]
     │
     ▼
[Fetch active items for skill]
     │
     ▼
[Select item (MFI + exposure filter + blueprint)]
     │
     ▼
[Present item to candidate]
     │
     ├─ MULTIPLE_CHOICE ──→ [Record 0/1 response]
     ├─ WRITING_PROMPT ───→ [Candidate submits text] → [GeminiScoringService.scoreWriting()] → [score 0–10]
     └─ SPEAKING_PROMPT ──→ [Candidate records audio] → [GeminiScoringService.scoreSpeaking()] → [score 0–10]
     │
     ▼
[EAP theta update (adaptiveEngine.updateEstimate)]
     │
     ▼
[Check stopping rules: SEM ≤ 0.28 OR n = 15]
     │
     ├─ CONTINUE ──→ [Back to item selection]
     └─ STOP ──────→ [Map theta → CEFR level] → [Generate report]
```

### 4.3 CEFR Classification Thresholds

```typescript
const CEFR_THRESHOLDS: Record<string, number> = {
  A1: -2.5,
  A2: -1.5,
  B1: -0.5,
  B2:  0.5,
  C1:  1.5,
  C2:  2.5,
};
// candidate is classified at the highest level whose threshold θ exceeds
```

---

## 5. Skill-Specific Adaptive Plans

### 5.1 Grammar (CAT — fully operational)

**Status**: ✅ Ready (404 items)

- Test length: 10–15 items
- Typical test duration: 12–18 minutes
- Blueprint: Sample across at minimum 3 CEFR levels
- Reliability target: α ≥ 0.85 at B1–B2 peak

**Next steps**:
- Add B1–C1 contextual grammar (business/academic register variants): +100 items
- Add PRE_A1 visual grammar items (for Primary product line): +20 items

### 5.2 Vocabulary (CAT — operational)

**Status**: ✅ Ready (200 items — marginal at high levels)

- Test length: 10–15 items
- Typical duration: 8–12 minutes
- Blueprint: Balanced across word frequency bands (high-frequency A1–B1; academic B2–C1; low-frequency/technical C1–C2)

**Next steps**:
- Expand to 500 items, with 150+ items at B2–C2 (currently only 35 items covering these bands)
- Add collocations and phrasal verbs as separate sub-type tags
- Add academic word list (AWL) items for Academia product line

### 5.3 Reading (CAT — partial)

**Status**: ⚠️ Needs expansion (58 items — minimum viable)

- Test structure: Passage (200–600 words) + 4–8 MC questions per passage
- Current: 10 passages; need ~25 passages for reliable CAT

**Next steps**:
- Seed 15+ new reading passages (B1–C2 range)
- Add A1–A2 passages for Primary/Junior
- Tag items with passage ID to enable passage-grouping constraint in selector

### 5.4 Listening (CAT — operational)

**Status**: ✅ Ready (143 items — adequate)

- Test structure: Audio clip (30–120 seconds) + 3–6 MC questions per clip
- All 25 audio files generated and deployed

**Next steps**:
- Add 5–8 C1–C2 clips (academic lectures, professional presentations)
- Add monologue-style clips for speaking-adjacent listening tasks

### 5.5 Writing (AI-Scored — new, needs calibration)

**Status**: 🟡 Newly seeded (55 items — operational but uncalibrated)

- Scoring: Gemini 2.5 Flash dual-scorer + GRM theta estimation
- Rubric: 5 criteria × max 2 = 10 points per criterion, total 10
- Test length: 1 Writing task per session (standalone) or integrated with reading/listening
- **Calibration required**: Run Gemini scoring on 20+ anchor responses per level to empirically validate IRT b-parameters

**Next steps**:
- Create anchor response set (5 per level × 7 levels = 35 anchors per item type)
- Run anchor calibration script to validate/adjust b-parameters
- Implement writing sub-type adaptive: email → report → essay gradient within a session

### 5.6 Speaking (AI-Scored — new, needs calibration)

**Status**: 🟡 Newly seeded (60 items — operational but uncalibrated)

- Scoring: Gemini 2.5 Flash multimodal scorer (audio input)
- Rubric: 5 criteria × max 2 = 10 total
- Test length: 1–2 speaking tasks per session
- **Requires**: Browser microphone capture → base64 WAV → `/api/ai/score/speaking-multimodal`

**Next steps**:
- Implement frontend `<SpeakingTask />` component with recording UI
- Add A1 speaking items (currently minimum is A2)
- Run Gemini calibration on anchor responses

---

## 6. Multi-Skill Assessment Design

### 6.1 Integrated Assessments (by product line)

| Product Line | Skills Tested | Duration | CEFR Output |
|-------------|--------------|----------|-------------|
| 15-Min Diagnostic | Grammar + Vocabulary | 15 min | Single composite level |
| Language Schools | Grammar + Vocabulary + Reading + Listening | 35–45 min | 4-skill profile |
| Academia | All 6 skills | 60–90 min | Full 6-skill CEFR profile |
| Corporate | Grammar + Vocabulary + Writing + Speaking | 45–60 min | Professional skills profile |
| Primary (7-10) | Grammar + Vocabulary | 15–20 min | Simple A–C labels |
| Junior Suite | Grammar + Vocabulary + Reading + Listening | 25–35 min | 4-skill profile |

### 6.2 Composite Score Calculation

For multi-skill sessions, the composite theta is a weighted average:

```
θ_composite = Σ(w_s × θ_s) / Σ(w_s)
```

Recommended weights:
- Grammar: 20%
- Vocabulary: 20%
- Reading: 25%
- Listening: 25%
- Writing: 5% (integrated sessions only)
- Speaking: 5% (integrated sessions only)

---

## 7. Calibration & Quality Pipeline

### 7.1 Initial Item Calibration

Seeded items use **synthetic IRT parameters** derived from CEFR level heuristics. These must be empirically calibrated once sufficient response data is collected.

**Minimum response data for calibration**:
- 3PL items: ≥ 200 responses per item
- GRM items (Writing/Speaking): ≥ 50 scored responses per item

**Calibration tools** (to build):
- `scripts/calibrate-irt-3pl.ts` — MML estimation via `ltm` or `mirt` (R bridge) for dichotomous items
- `scripts/calibrate-grm.ts` — GRM parameter recovery for polytomous items

### 7.2 Ongoing Quality Metrics

Track per-item:
- **p-value** (observed proportion correct) vs. expected from 3PL ICC
- **Point-biserial correlation** (discrimination proxy)
- **Fit statistics**: S-X² or G² for misfit detection
- **Exposure rate**: flag items with rate > 0.50

Flag for review:
- p-value deviates >0.15 from ICC prediction
- Point-biserial < 0.20
- Exposure rate > 0.60

### 7.3 AI Scoring Quality (Writing/Speaking)

- **Consistency check**: Score same response with two Gemini calls; alert if deviation > 2/10
- **Anchor validation**: Monthly re-score of known anchor responses
- **Human override workflow**: Examiners can override AI scores; log for model improvement

---

## 8. Implementation Roadmap

### Phase 1: Foundation ✅ (Complete)
- [x] IRT engine (EAP, MFI, 3PL, GRM)
- [x] Item bank: Grammar (404), Vocabulary (200), Reading (58), Listening (143)
- [x] AI scoring service (Gemini 2.5 Flash)
- [x] Writing prompts (55 items A2–C2)
- [x] Speaking prompts (60 items A2–C2)
- [x] Audio files for all 25 listening modules

### Phase 2: Expansion (Priority)
- [ ] Vocabulary expansion: +300 items → total 500
- [ ] Reading expansion: +15 passages → total ~200 items
- [ ] Listening expansion: +5 C1–C2 modules
- [ ] Writing: +45 items (A1 simple → B1 variety) → total 100
- [ ] Speaking: +40 items (A1 expansion) → total 100
- [ ] Grammar specialisation: Corporate/Academic register variants

### Phase 3: Calibration & Validation
- [ ] Collect 200+ responses per Grammar/Vocabulary item
- [ ] Re-calibrate IRT parameters from real response data
- [ ] Validate CEFR classifications against external benchmarks
- [ ] Writing/Speaking: Collect anchor responses + validate AI scoring

### Phase 4: Advanced Adaptive Features
- [ ] Shadow test algorithm for full blueprint enforcement
- [ ] Multi-dimensional IRT (MIRT) for correlated skill estimation
- [ ] Adaptive difficulty trajectory visualisation for candidates
- [ ] Automated item generation (AIG) using LLMs with IRT target parameters
- [ ] Real-time exposure control dashboard

### Phase 5: Product Line Differentiation
- [ ] Primary: Age-appropriate visual interface + vocabulary/grammar only
- [ ] Corporate: Writing/Speaking-heavy profile with business domain items
- [ ] Academia: Academic register vocabulary + integrated skills
- [ ] SPECIALIZED: Domain-specific item banks (legal, medical, technical)

---

## 9. API Reference (Current)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/adaptive/start` | POST | Start adaptive session |
| `/api/adaptive/answer` | POST | Submit answer, get next item |
| `/api/adaptive/end` | POST | End session, retrieve results |
| `/api/ai/score/speaking-multimodal` | POST | Score speaking audio with Gemini |
| `/api/ai/score/writing` | POST | Score writing text with Gemini |
| `/api/psychometrics/grm-scores` | GET | Get GRM scoring parameters |
| `/api/ai/generate-item` | POST | AI item generation |

---

## 10. Seed Scripts Reference

| Script | Items | Skill | CEFR | Tag |
|--------|-------|-------|------|-----|
| `seed-grammar-phase1` through `phase10` | ~304 | GRAMMAR | B1–C1 | per-phase |
| `seed-grammar-300-sota` | ~96 | GRAMMAR | B1–C1 | `seed-grammar-300-sota` |
| `seed-grammar-early-levels` | 104 | GRAMMAR | PRE_A1–A2, C2 | `seed-grammar-early-levels` |
| `seed-vocab-200-sota` | 200 | VOCABULARY | PRE_A1–C2 | `seed-vocab-200-sota` |
| `seed-listening-phase1` through `phase25` | 143 | LISTENING | PRE_A1–C1 | per-phase |
| `seed-writing-phase1` | 55 | WRITING | A2–C2 | `seed-writing-phase1` |
| `seed-speaking-phase1` | 60 | SPEAKING | A2–C2 | `seed-speaking-phase1` |

---

*Last updated: Phase 1 completion — 920 items in live database*
