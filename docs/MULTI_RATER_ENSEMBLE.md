# Multi-Rater Ensemble Scoring Integration

## Overview

The multi-rater ensemble replaces the single-model Gemini scoring with a **consensus-based approach** using three independent LLM raters (Gemini, Claude, GPT-4o). This reduces hallucination, increases inter-rater agreement, and provides automatic QA gating via variance detection.

**Target**: Inter-rater agreement (Cohen's κ) > 0.85, automatic flagging for human review when agreement drops below thresholds.

---

## Architecture

### Components

1. **Rater Services** (three independent scorers)
   - `src/lib/scoring/gemini-scoring-service.ts` — Google Gemini 2.5 Flash
   - `src/lib/scoring/claude-scoring-service.ts` — Anthropic Claude 3.5 Sonnet
   - `src/lib/scoring/gpt4-scoring-service.ts` — OpenAI GPT-4o

2. **Ensemble Orchestrator** (aggregates results)
   - `src/lib/scoring/multi-rater-ensemble.ts` — Parallel scoring, variance detection, consensus logic
   - `src/lib/scoring/ensemble-adapter.ts` — Converts ensemble results to OrchestratedScore format

3. **Integration Points**
   - `src/lib/scoring/scoring-orchestrator.ts` — Routes to ensemble or primary-verifier mode
   - `src/lib/scoring/scoring-queue.ts` — Fire-and-forget queue (unchanged)
   - `src/lib/scoring/rating-queue.ts` — Human review routing (unchanged)

### Flow

```
User submits WRITING/SPEAKING response
  ↓
scoring-queue.enqueue() → processJob()
  ↓
ScoringOrchestrator.scoreWriting/scoreSpeaking()
  ↓
[IF USE_ENSEMBLE_SCORING]
  Parallel call: Gemini + Claude + GPT-4o
    ↓
  multi-rater-ensemble aggregates:
    - Median score aggregation
    - Majority-vote CEFR level
    - Variance/agreement metrics
    - Human review flagging
  ↓
  ensemble-adapter converts to OrchestratedScore
    ↓
[ELSE]
  Primary + Verifier (existing flow)
    ↓
scoring-queue persists result + enqueue for review if needed
```

---

## Metrics

### Consensus Levels

| Level | Condition | Meaning |
|-------|-----------|---------|
| **high** | stdDev < 0.1 && κ > 0.8 | All raters agree closely → accept without review |
| **medium** | stdDev < 0.2 && κ > 0.6 | Raters mostly agree → flag if other factors present |
| **low** | Otherwise | Significant disagreement → human review required |

### Automatic Review Triggers

- `stdDev > 0.25` — Score variance too high
- `averageConfidence < 0.65` — Raters' average confidence below threshold
- `raterAgreement < 0.6` — Inter-rater agreement poor (Cohen's κ proxy)
- `consensusLevel = "low"` — Low consensus + any of above

### Recommended Actions

| Action | Condition | Next Step |
|--------|-----------|-----------|
| **accept** | High consensus, no flags | Score saved as `ai_auto` |
| **flag** | Medium consensus OR borderline metrics | Score saved as `ai_flagged`, enqueue for human review |
| **review** | Low consensus OR high variance (> 0.3) | Auto-enqueue human review, score withheld |

---

## Enabling Ensemble Scoring

### Option 1: Environment Variable

```bash
# Enable multi-rater ensemble for all WRITING/SPEAKING scoring
USE_ENSEMBLE_SCORING=true npm start

# Or in .env / docker-compose.yml
USE_ENSEMBLE_SCORING=true
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

### Option 2: Gradual Rollout (A/B Testing)

Modify `src/lib/scoring/scoring-orchestrator.ts`:

```typescript
const USE_ENSEMBLE_SCORING = 
  process.env.USE_ENSEMBLE_SCORING === "true" ||
  (Math.random() < 0.1); // 10% of requests

// Later, increase to 50%, then 100%
```

### Option 3: Feature Flag Per Organization

```typescript
const orgFeatureFlags = await prisma.organization.findUnique({
  where: { id: session.organizationId },
  select: { featureFlags: true }
});

const USE_ENSEMBLE_SCORING = orgFeatureFlags?.featureFlags?.useEnsembleScoring === true;
```

---

## Configuration

### Environment Variables

```bash
# API Keys (all three required for ensemble mode)
GEMINI_API_KEY=        # Google Cloud
ANTHROPIC_API_KEY=     # Anthropic (formerly "ANTHROPIC_API_KEY")
OPENAI_API_KEY=        # OpenAI

# Ensemble control
USE_ENSEMBLE_SCORING=true  # Enable ensemble (default: false)

# Concurrency (scoring-queue limits simultaneous API calls)
AI_SCORE_CONCURRENCY=8     # Max parallel scoring jobs
```

### Thresholds (in `multi-rater-ensemble.ts`)

```typescript
// Consensus level determination
if (stdDev < 0.1 && raterAgreement > 0.8) {
  consensusLevel = "high";
} else if (stdDev < 0.2 && raterAgreement > 0.6) {
  consensusLevel = "medium";
} else {
  consensusLevel = "low";
}

// Human review flagging
const flagForHumanReview =
  stdDev > 0.25 ||                    // High variance
  averageConfidence < 0.65 ||         // Low confidence
  raterAgreement < 0.6;               // Poor agreement
```

---

## Data Flow & Persistence

### Response Metadata

When a response is scored with ensemble, the result is persisted as:

```typescript
// In response.metadata:
{
  asyncScored: true,
  scoreSource: "ai_auto" | "ai_flagged" | "ai_unavailable",
  
  // From primary rater (all have same interpretation)
  aiFeedback: string,
  cefrLevel: "A1" | "A2" | ... | "C2",
  rubricScores: {
    grammar: 0-10,
    vocabulary: 0-10,
    coherence: 0-10,
    taskRelevance: 0-10,
    fluency?: 0-10  // Speaking only
  },
  
  // From ensemble (multi-rater consensus)
  ensembleMetadata: {
    consensusLevel: "high" | "medium" | "low",
    variance: number,
    stdDev: number,
    raterAgreement: number,     // Cohen's κ proxy
    raterCount: 3,
    recommendedAction: "accept" | "flag" | "review",
    diagnosticFeedback: string  // Score range, CEFR consensus, avg confidence
  },
  
  // Scoring passes (all three raters)
  scoringPasses: [
    { role: "rater", model: "gemini", score: 0.60, confidence: 0.8, cefrLevel: "B1", latencyMs: 2100 },
    { role: "rater", model: "claude", score: 0.68, confidence: 0.85, cefrLevel: "B1", latencyMs: 2300 },
    { role: "rater", model: "gpt4", score: 0.75, confidence: 0.88, cefrLevel: "B2", latencyMs: 2500 },
  ],
}
```

### Human Review Queue

Responses are auto-enqueued with:

```typescript
// If flagForHumanReview || consensusLevel === "low"
RatingQueueService.enqueue({
  sessionId,
  itemId,
  type: "WRITING" | "SPEAKING",
  content: candidateResponse,
  aiResult: {
    ...ensembleResult,
    reviewReasons: ["LOW_RATER_CONSENSUS", "HIGH_SCORE_VARIANCE"],
    scoreSource: "ai_flagged",
  }
});
```

Reviewers see:
- All three rater scores and rationales
- Variance metrics and agreement level
- Recommended action ("accept" / "flag" / "review")
- Diagnostic feedback

---

## Testing

### Unit Tests

```bash
# Run ensemble tests
npm test -- test/multi-rater-ensemble.test.ts

# Expected: ~10 tests covering:
#  - Median score aggregation
#  - Consensus level detection
#  - Human review flagging
#  - CEFR majority voting
#  - Rater failure handling
#  - Diagnostic feedback generation
#  - Recommended action selection
```

### Integration Tests

```bash
# Test with scoring-queue
npm test -- test/scoring-queue.test.ts

# Manual test with staging:
USE_ENSEMBLE_SCORING=true npm run dev
# Submit a WRITING/SPEAKING response
# Verify response.metadata.ensembleMetadata is populated
# Verify human review queue is correct for flagged responses
```

### Load Test

```bash
# Check API rate limits and concurrency
# With ensemble, each response triggers 3 concurrent LLM calls
# Verify AI_SCORE_CONCURRENCY settings don't overload APIs

MAX_CONCURRENT_AI=4  # 4 jobs × 3 raters = 12 parallel API calls
npm run dev
# Load test with 50+ concurrent WRITING submissions
```

---

## Migration & Rollback

### Initial Deployment

1. **Stage 1: Shadow Mode** (1-2 weeks)
   - Enable ensemble on staging only
   - Verify metadata, latency, API costs
   - Test human review queue routing
   - Monitor agreement metrics

2. **Stage 2: Canary** (1 week)
   - Enable for 10% of real traffic (A/B split)
   - Monitor: latency, costs, agreement, review rate
   - Compare ensemble vs. primary-verifier scoring

3. **Stage 3: Gradual Rollout**
   - Increase to 50%, then 100%
   - Keep environment variable for quick disable

### Fallback

If ensemble scoring causes issues:

```bash
# Immediate rollback
USE_ENSEMBLE_SCORING=false npm restart

# Or set per-organization:
UPDATE organizations SET feature_flags = '{"useEnsembleScoring": false}' ...
```

---

## Cost Analysis

### API Calls per Response

| Mode | Gemini Calls | Claude Calls | GPT-4 Calls | Total Cost |
|------|--------------|--------------|-------------|-----------|
| **Primary-Verifier** | 2 | 0 | 0 | ~$0.01 |
| **Ensemble** | 1 | 1 | 1 | ~$0.03-0.05* |

*Actual cost depends on token usage. Typical response = 800 tokens.

### Monthly Cost (10k WRITING/SPEAKING responses)

- **Primary-Verifier**: ~$100
- **Ensemble**: ~$300-500

### Cost Mitigation

1. **Selective Activation**
   - Enable ensemble only for higher-value assessments
   - Disable for low-stakes practice items
   - Use feature flags per organization

2. **Token Optimization**
   - Reduce prompt verbosity
   - Cache CEFR rubric blocks
   - Batch similar prompts

3. **Fallback Logic**
   - If any rater times out → ensemble becomes 2-rater (reduced cost)
   - If all 3 succeed but cost too high → run only on weekends

---

## Monitoring & Observability

### Key Metrics to Track

```typescript
// In scoring-orchestrator:
logger.info({
  responseId,
  skill: "WRITING" | "SPEAKING",
  scoreSource: "ai_auto" | "ai_flagged" | "ai_unavailable",
  consensusLevel: "high" | "medium" | "low",
  stdDev,
  raterAgreement,
  finalScore,
  latencyMs: {
    gemini: 2100,
    claude: 2300,
    gpt4: 2500,
    ensemble: 2500,  // Max of three
  },
  requiresHumanReview: boolean,
}, "ensemble-scoring-result");
```

### Dashboards

```sql
-- Daily agreement metrics
SELECT
  DATE(created_at) AS day,
  AVG(ensemble_metadata->>'stdDev')::float AS avg_std_dev,
  AVG(ensemble_metadata->>'raterAgreement')::float AS avg_agreement,
  COUNT(*) FILTER (WHERE consensus_level = 'high') * 100.0 / COUNT(*) AS pct_high_consensus,
  COUNT(*) FILTER (WHERE requires_human_review) * 100.0 / COUNT(*) AS pct_flagged
FROM responses
WHERE metadata->>'asyncScored' = 'true'
GROUP BY day
ORDER BY day DESC;

-- Cost analysis
SELECT
  DATE(created_at) AS day,
  COUNT(*) AS responses_scored,
  COUNT(DISTINCT session_id) AS sessions,
  COUNT(*) * 3 AS total_api_calls  -- 3 raters per response
FROM responses
WHERE metadata->>'scoreSource' IS NOT NULL
GROUP BY day;
```

---

## Troubleshooting

### All three raters timeout

```
Error: Insufficient raters succeeded: only 0/3 available
```

**Causes**: API rate limits, network issues, endpoint down

**Mitigation**:
```typescript
// Circuit breaker with exponential backoff
const geminiScoringBreaker = new CircuitBreaker(
  scoreWithGemini,
  { threshold: 5, timeout: 60_000, resetTimeout: 120_000 }
);

// Falls back to single rater if ensemble fails
try {
  return await scoreWithEnsemble(...);
} catch (err) {
  logger.warn("Ensemble failed, falling back to Gemini only", err);
  return await ScoringOrchestrator.scoreWriting(...);
}
```

### High variance (stdDev > 0.3)

**Causes**: Raters disagree on difficulty / CEFR level

**Investigation**:
- Check if prompt is ambiguous
- Verify content doesn't trigger different interpretations
- Check if one rater is biased toward higher/lower scores

**Fix**: Refine CEFR rubric or item content

### Low confidence (avg < 0.65)

**Causes**: Item is genuinely ambiguous or response is borderline

**Action**: Human review is appropriate

---

## Future Enhancements

1. **Weighted Averaging**
   - Weight rater scores by historical accuracy
   - Reduce weight for off-target raters

2. **Domain-Specific Raters**
   - Train custom models for specific skills (READING, LISTENING)
   - Replace GPT-4 with domain-optimized option

3. **Distractor Analysis**
   - Use ensemble disagreement to identify problematic MCQ options
   - Flag items with unusual rater agreement patterns

4. **Inter-Rater Reliability (IRR) Calibration**
   - Periodic gold-standard annotations
   - Compute actual Cohen's κ instead of proxy
   - Adjust thresholds based on performance

---

## References

- **Original Issue**: Reduce hallucination, increase inter-rater agreement target (κ > 0.85)
- **Architecture**: Three independent raters (Gemini, Claude, GPT-4o) + variance detection
- **Prior Art**: Cambridge Assessment (multiple rater consensus), ETS (scoring engine with item-response pooling)

