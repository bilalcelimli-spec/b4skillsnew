# Q2.3: MIRT Multi-Skill Linking

**Status**: Planning Phase  
**Phase**: Q2 — Advanced SPEAKING Assessment  
**Estimated Duration**: 15-20 days  
**Dependencies**: Q2.1 ✅ Q2.2 ✅ (Acoustic analysis & audio quality)

---

## Overview

Q2.3 implements multi-skill IRT linking to unify WRITING, READING, LISTENING, SPEAKING, GRAMMAR, and VOCABULARY into a single, interpretable ability scale (0-5, anchored to CEFR).

**Current State**:
- Each skill assessed independently on 0-1 scale
- No cross-skill correlation or unified ability estimate
- Scores reported per-skill in isolation

**Target State**:
- Single θ (theta) estimate spanning all six skills
- Unified CEFR-anchored reporting scale (0-5 with decimals)
- Compensation across skills (e.g., strong SPEAKING compensates for weaker LISTENING)
- Calibrated against EF SET benchmark data

---

## Architecture Overview

### 1. Four-Dimensional MIRT Model

**Latent trait vector** θ = (θ₁, θ₂, θ₃, θ₄) where:
- **θ₁ (Receptive)**: READING + LISTENING (comprehension)
- **θ₂ (Productive)**: WRITING + SPEAKING (expression)
- **θ₃ (Grammatical)**: GRAMMAR + VOCABULARY (linguistic knowledge)
- **θ₄ (Strategic)**: Discourse coherence, pragmatic inference, rhetorical awareness

### 2. Skill → Dimension Loading Matrix

| Skill | θ₁ | θ₂ | θ₃ | θ₄ | Description |
|-------|----|----|----|----|-------------|
| READING | 0.80 | 0.05 | 0.10 | 0.05 | Receptive primary, grammatical secondary |
| LISTENING | 0.80 | 0.05 | 0.10 | 0.05 | Receptive primary, strategic secondary |
| WRITING | 0.05 | 0.80 | 0.10 | 0.05 | Productive primary, grammatical secondary |
| SPEAKING | 0.05 | 0.80 | 0.10 | 0.05 | Productive primary, strategic secondary |
| GRAMMAR | 0.05 | 0.05 | 0.85 | 0.05 | Grammatical dominant |
| VOCABULARY | 0.10 | 0.10 | 0.75 | 0.05 | Grammatical primary, receptive secondary |

**Implementation**: Already exists in `src/lib/psychometrics/mirt-4d.ts`

### 3. Linking Equations

#### Vertical Linking (Stocking-Lord or Haebara)
Calibration forms of different difficulty are linked via anchor items:
```
θ_reference = A · θ_form + B
```

**Implemented in**: `src/lib/psychometrics/vertical-linking.ts`

#### CINEG Equating (Tucker or Levine)
Non-equivalent groups equating for administrations with different item subsets:
```
Score_reference = Linear equating function(Score_form)
```

**Implemented in**: `src/lib/psychometrics/equating-cineg.ts`

### 4. Reporting Scale Transformation

Final step: Convert θ → CEFR-anchored 0-5 scale

```
CEFR_Score = intercept + slope · θ
```

Where intercept and slope are calibrated via EF SET anchor data.

---

## Implementation Plan

### Phase 1: Skill-Level Calibration

**1.1 Skill-to-Dimension Mapping (Days 1-2)**
- Extend scoring pipeline to emit 4D item parameters per skill
- Item response likelihood factored across dimensions per skill's loading vector
- Test: Verify θ estimates align with current single-skill scores (r > 0.95)

**File**: `src/lib/psychometrics/skill-mirt-mapping.ts` (NEW)

```typescript
export interface SkillMirtMapping {
  skill: SkillType;
  loadingVector: [number, number, number, number];
  /** 4D item params for this skill's items */
  itemParams: Record<string, Mirt4DItemParams>;
}

/** Transform 4D response pattern to skill-specific likelihood */
export function skillResponseLikelihood(
  response: 0 | 1,
  theta4d: [number, number, number, number],
  skillMapping: SkillMirtMapping
): number;
```

**Test Suite**: `src/lib/psychometrics/__tests__/skill-mirt-mapping.test.ts`
- Verify each skill loads primarily on its primary dimension
- Check that secondary loadings don't exceed 0.15
- Validate 4D parameters are consistent across skill assessments

---

### Phase 2: 4D Theta Estimation

**2.1 EAP (Expected A Posteriori) Estimation (Days 3-4)**
- Implements 9-point Gauss-Hermite quadrature on 4D grid (~6,561 nodes)
- Posterior mean (EAP) for each examinee's 4D ability vector
- Posterior standard errors (SEM) for all four dimensions

**File**: `src/lib/psychometrics/mirt-theta-estimation.ts` (NEW)

```typescript
export interface Mirt4DEstimate {
  theta: [number, number, number, number];
  sem: [number, number, number, number];
  /** Trace of posterior covariance matrix */
  traceCovariance: number;
  logLikelihood: number;
  /** Per-dimension credible intervals */
  credibleIntervals: {
    [key in 'receptive' | 'productive' | 'grammatical' | 'strategic']: [number, number];
  };
}

export async function estimate4DTheta(
  sessionId: string,
  responses: SessionResponse[],
  itemParams: Record<string, Mirt4DItemParams>
): Promise<Mirt4DEstimate>;
```

**Integration**: Extend `ScoringOrchestratorEnsemble.scoreSession()` to compute 4D theta after final response.

**Test Suite**: `src/lib/psychometrics/__tests__/mirt-theta-estimation.test.ts`
- Known-response patterns (all correct, all incorrect, mixed)
- Verify 4D theta recovers simulated ability
- Check SEM decreases with more responses (information accumulation)

---

### Phase 3: Linking to Reference Scale

**3.1 EF SET Benchmark Anchoring (Days 5-7)**
- Calibrate `θ_reference = scale · θ_internal + intercept`
- Use EF SET samples (A1/A2/B1/B2/C1/C2) as reference
- Minimize RMSD of predicted vs. observed EF SET CEFR score

**File**: `src/lib/psychometrics/ef-set-linking.ts` (NEW)

```typescript
export interface EfSetAnchorData {
  respondentId: string;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  /** 4D theta from LinguAdapt assessment */
  theta4d: [number, number, number, number];
  /** EF SET total score (1-100) */
  efSetScore: number;
}

export interface EfSetLinkingResult {
  /** Linear transformation θ_internal → θ_reference */
  A: number;
  B: number;
  /** Overall correlation with EF SET */
  correlation: number;
  /** RMSD of predicted vs. observed CEFR level */
  cefrRmsd: number;
  /** Per-level residual analysis */
  perLevelAccuracy: Record<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2', number>;
}

export async function linkToEfSet(
  anchorData: EfSetAnchorData[]
): Promise<EfSetLinkingResult>;
```

**Data Requirements**:
- 50+ EF SET respondents across 6 CEFR levels (≈100+ total)
- Match respondents on same skill assessments (READING, WRITING, LISTENING, SPEAKING, GRAMMAR, VOCABULARY)
- EF SET official score mapping (A1=10-19, A2=20-39, B1=40-59, B2=60-74, C1=75-89, C2=90-100)

**Test Suite**: `src/lib/psychometrics/__tests__/ef-set-linking.test.ts`
- Simulate EF SET-like data (n=100, 6 levels)
- Verify Spearman correlation with CEFR levels > 0.90
- Check accuracy per CEFR level > 85%

---

### Phase 4: CEFR Reporting Scale

**4.1 θ → CEFR Score Transformation (Days 8)**
- Convert 4D theta to unified 0-5 scale (matching CEFR difficulty)
- Composite score = weighted average across 4D (weights TBD from factor analysis)
- Map to CEFR band (A1: 0.0-0.5, A2: 0.5-1.5, B1: 1.5-2.5, B2: 2.5-3.5, C1: 3.5-4.5, C2: 4.5-5.0)

**File**: `src/lib/psychometrics/cefr-reporting-scale.ts` (NEW)

```typescript
export interface CefrReportingParams {
  /** Weights for compositing θ₁, θ₂, θ₃, θ₄ */
  weights: [number, number, number, number];
  /** θ_reference scale bounds [-4, +4] mapped to [0, 5] CEFR scale */
  scale: { min: number; max: number; };
  /** Per-dimension contributions to overall score */
  breakdowns: Record<'receptive' | 'productive' | 'grammatical' | 'strategic', number>;
}

export interface CefrReport {
  /** Unified 0-5 score */
  cefrScore: number;
  /** Assigned CEFR level */
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  /** Confidence interval (90%) */
  confidenceInterval: [number, number];
  /** Per-dimension scores (0-5) */
  dimensionScores: {
    receptive: number;
    productive: number;
    grammatical: number;
    strategic: number;
  };
  /** Skill-level contributions (0-5 per skill) */
  skillScores: Record<SkillType, number>;
  /** Compensatory analysis: which dimensions drove the overall score */
  compensationAnalysis: {
    primaryDriver: string; // e.g., "receptive (0.92)"
    secondaryDriver: string;
    balanceIndicator: number; // How balanced vs. unbalanced (0-1)
  };
}

export function transformToCefrReport(
  theta4d: [number, number, number, number],
  sem4d: [number, number, number, number],
  skillScores: Record<SkillType, number>,
  params: CefrReportingParams
): CefrReport;
```

---

### Phase 5: Integration with Scoring Pipeline

**5.1 Orchestrator Extension (Days 9-10)**
- Extend `ScoringOrchestratorEnsemble.scoreSession()` to call 4D linking after final response
- Store 4D theta estimates in session metadata
- Emit CEFR report in API response alongside skill scores

**File**: Modify `src/lib/scoring/scoring-orchestrator.ts`

```typescript
// In ScoringOrchestratorEnsemble.scoreSession():

// After all responses scored per-skill:
const theta4d = await estimate4DTheta(sessionId, responses, itemParamsBySkill);

// Link to reference scale:
const efSetLink = await loadEfSetLinkingParams(); // Cached from Q2.3 calibration
const theta_reference = [
  efSetLink.A * theta4d[0] + efSetLink.B,
  efSetLink.A * theta4d[1] + efSetLink.B,
  efSetLink.A * theta4d[2] + efSetLink.B,
  efSetLink.A * theta4d[3] + efSetLink.B,
];

// Generate CEFR report:
const cefrReport = transformToCefrReport(
  theta_reference as [number, number, number, number],
  sem4d,
  skillScores,
  CEFR_REPORTING_PARAMS
);

return {
  ...orchestratedScore,
  aiResult: {
    ...aiResult,
    mirtEstimates: { theta4d, sem4d, theta_reference },
    cefrReport
  }
};
```

---

### Phase 6: Testing & Calibration

**6.1 Validation Suite (Days 11-12)**
- Cross-skill consistency (r > 0.85 between skill scores and corresponding dimensions)
- Dimension independence check (correlation between dimensions | < 0.3)
- CEFR accuracy on holdout EF SET data
- Extrapolation to unseen CEFR levels (leave-one-out validation)

**6.2 Calibration Study (Days 13-14)**
- Administer full assessment battery to 200+ candidates with known CEFR level
- Split 80% calibration / 20% holdout
- Optimize per-dimension weights for maximum CEFR prediction accuracy
- Generate final EF SET linking parameters

**6.3 Documentation & API Integration (Days 15-20)**
- Update API spec (POST /api/assess/session/final-report)
- Dashboard visualization of 4D ability space
- Interpretation guide for test takers and administrators

---

## Technical Dependencies

### Existing (Already Implemented)
- `src/lib/psychometrics/mirt-4d.ts` — 4D compensatory IRT
- `src/lib/psychometrics/vertical-linking.ts` — Stocking-Lord & Haebara methods
- `src/lib/psychometrics/equating-cineg.ts` — Tucker & Levine equating
- `src/lib/assessment-engine/irt.js` — 3PL IRT probability function
- `src/lib/cefr/cefr-framework.ts` — CEFR level mappings

### New (To Be Created)
| Module | Lines | Purpose |
|--------|-------|---------|
| `skill-mirt-mapping.ts` | 200 | Skill→4D dimension loading |
| `mirt-theta-estimation.ts` | 350 | EAP + quadrature integration |
| `ef-set-linking.ts` | 300 | Calibration against EF SET |
| `cefr-reporting-scale.ts` | 250 | θ → CEFR score transformation |
| `mirt-multi-skill-integration.ts` | 400 | Orchestrator extension + coordinator |

### Test Files (New)
- `skill-mirt-mapping.test.ts` (50 tests)
- `mirt-theta-estimation.test.ts` (40 tests)
- `ef-set-linking.test.ts` (35 tests)
- `cefr-reporting-scale.test.ts` (30 tests)
- `mirt-multi-skill-integration.test.ts` (45 tests)

---

## API Changes

### Session Final Report

**Endpoint**: `POST /api/assess/session/:sessionId/finalize`

**Response** (extended):
```json
{
  "sessionId": "...",
  "finalTheta": 2.5,
  "finalSem": 0.35,
  
  "skillScores": {
    "READING": { "score": 0.82, "sem": 0.08 },
    "WRITING": { "score": 0.79, "sem": 0.09 },
    ...
  },
  
  "mirtEstimates": {
    "theta4d": [2.1, 2.3, 2.5, 2.4],
    "sem4d": [0.30, 0.32, 0.28, 0.33],
    "theta_reference": [2.45, 2.55, 2.65, 2.50]
  },
  
  "cefrReport": {
    "cefrScore": 2.54,
    "cefrLevel": "B1",
    "confidenceInterval": [2.35, 2.73],
    "dimensionScores": {
      "receptive": 2.1,
      "productive": 2.3,
      "grammatical": 2.65,
      "strategic": 2.5
    },
    "skillScores": {
      "READING": 2.05,
      "LISTENING": 2.15,
      "WRITING": 2.30,
      "SPEAKING": 2.28,
      "GRAMMAR": 2.65,
      "VOCABULARY": 2.62
    },
    "compensationAnalysis": {
      "primaryDriver": "Grammatical (2.65)",
      "secondaryDriver": "Strategic (2.50)",
      "balanceIndicator": 0.78
    }
  }
}
```

---

## Success Criteria

| Criterion | Baseline | Q2.3 Target |
|-----------|----------|------------|
| Cross-skill linking correlation | N/A (unlinked) | r > 0.85 |
| 4D dimensional independence | N/A | Avg pairwise correlation < 0.30 |
| EF SET agreement | N/A | r_Spearman(θ, EF SET) > 0.90 |
| Per-level CEFR accuracy | N/A | > 85% (A1–C1, ≥ 80% C2) |
| Reporting scale stability | N/A | SEM on unified scale ≤ 0.35 |
| Skill-to-dimension alignment | N/A | r(skill, primary dim) > 0.88 |

---

## Rollout Plan

### Staging Deployment (Week 3)
1. Deploy 4D theta estimation (internal only)
2. Run calibration study on 100+ candidates
3. Validate CEFR accuracy on holdout data

### Production Deployment (Week 4)
1. Activate EF SET linking
2. Return CEFR report in API (alongside legacy skill scores)
3. Monitor prediction accuracy in production
4. Adjust weights if needed (rolling basis)

### Legacy Compatibility ✅
- Skill scores remain unchanged
- CEFR report is optional query parameter (`?includeUnifiedScale=true`)
- Existing integrations unaffected
- Gradual migration to unified reporting

---

## Troubleshooting

| Issue | Root Cause | Resolution |
|-------|-----------|-----------|
| 4D theta unstable (erratic estimates) | Too few responses (<10) | Require minimum 15 responses before 4D estimation |
| Low correlation with EF SET | Dimension loadings incorrect | Re-calibrate loadings on EF SET sample |
| CEFR level jumping (non-monotonic) | Weight imbalance | Reweight per-dimension contributions via factor analysis |
| High SEM on unified scale | Dimensions uncorrelated | Check correlation matrix; may indicate multidimensionality |
| Ceiling/floor effects in reporting scale | Scale bounds too narrow | Expand bounds if >5% of population hits extremes |

---

## Next Steps (After Q2.3)

### Q2.4: Real-Time Transcription (10-15 days)
- WebSocket streaming of audio → Gemini
- Incremental transcript delivery to candidate
- Live waveform + acoustic feature visualization

### Q2.5: Person-Fit Statistics (8-12 days)
- Outfit & Infit indices for aberrant response patterns
- Guttman scalogram analysis
- Cheating detection via collusion graph analysis

---

## References

### IRT Linking
- Kolen, M.J. & Brennan, R.L. (2014). *Test Equating, Scaling, and Linking* (3rd ed.). Springer.
- Stocking, M.L. & Lord, F.M. (1983). Developing a common metric in item response theory. *Applied Psychological Measurement*, 7(2), 201-210.
- Haebara, T. (1980). Equating logistic ability scales by a weighted least-squares method. *Japanese Psychological Research*, 22(3), 144-149.

### MIRT
- Reckase, M.D. (2009). *Multidimensional Item Response Theory*. Springer.
- Segall, D.O. (1996). Multidimensional adaptive testing. *Psychometrika*, 61(2), 331-354.

### CEFR Calibration
- Council of Europe. (2020). *Common European Framework of Reference for Languages (CEFR)*.
- EF (2022). *EF SET Benchmark Study*: Correlations with CEFR levels across 6 languages.

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-23  
**Status**: Planning Phase → Ready for Implementation
