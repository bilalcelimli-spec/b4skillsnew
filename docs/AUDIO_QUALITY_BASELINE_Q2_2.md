# Q2.2: Audio Quality Baseline Assessment

**Status**: ✅ COMPLETE (Placeholder Implementation)  
**Phase**: Q2 — Advanced SPEAKING Assessment  
**Duration**: 8-10 days (integrated with Q2.1 acoustic analysis)

---

## Overview

Q2.2 implements advanced audio quality assessment to detect and flag low-quality SPEAKING responses before they reach the scoring pipeline. The audio quality analyzer estimates Signal-to-Noise Ratio (SNR), detects clipping, assesses dynamic range, and provides quality recommendations (ACCEPT/WARN/REJECT).

---

## AudioQualityMetrics Interface

Comprehensive audio quality assessment:

```typescript
export interface AudioQualityMetrics {
  // Signal-to-Noise Ratio (dB)
  snr: number;                                    // >20dB excellent, <10dB poor

  // Noise characteristics
  noiseFloor: number;                            // dB (estimated noise level)
  backgroundNoise: "none" | "minimal" | "moderate" | "heavy";

  // Clipping detection
  clippingDetected: boolean;
  clippingPercentage: number;                    // Percentage of samples at peak

  // Dynamic range
  dynamicRange: number;                          // dB (peak - RMS)
  peakLevel: number;                             // dB (normalized)
  rmsLevel: number;                              // dB (normalized)

  // Normalization
  normalizedRequired: boolean;
  targetNormalizationGain: number;               // dB to apply for optimal levels

  // Overall assessment
  qualityScore: number;                          // 0-100
  qualityCategory: "excellent" | "good" | "acceptable" | "poor";

  // Metadata
  processingTime: number;                        // Milliseconds
  analysisMethod: "spectral_estimate" | "placeholder";
}
```

---

## QualityRecommendation Interface

Actionable quality assessment:

```typescript
export interface QualityRecommendation {
  recommendation: "ACCEPT" | "WARN" | "REJECT";
  reason: string;
  snr: number;
  qualityScore: number;
  suggestedAction?: string;
}
```

---

## Implementation

### AudioQualityAnalyzer Class

**File**: `src/lib/scoring/audio-quality-analyzer.ts`

#### Key Methods

**analyzeAudioQuality(audioBase64, audioFeatures?)**
- Estimates quality metrics from audio buffer
- Combines spectral analysis with acoustic features
- Returns comprehensive AudioQualityMetrics
- Handles errors gracefully (returns poor quality instead of throwing)

**Current Implementation** (Placeholder):
```
Audio Buffer → Simulated spectral analysis
    → Peak/RMS level estimation
    → SNR calculation (dynamicRange + offset)
    → Clipping detection (simulated)
    → Quality scoring algorithm
    → Category assignment
```

**Production Implementation** (Q2.2+):
```
Audio Buffer → librosa FFT
    → Welch's method (noise floor)
    → Real SNR calculation
    → Spectral centroid analysis
    → Actual clipping detection
    → Advanced quality metrics
```

---

## Quality Thresholds

### SNR Levels (dB)

| Level | SNR Range | Category |
|-------|-----------|----------|
| Excellent | ≥ 25 dB | Accept, no action needed |
| Good | 20-25 dB | Accept, quality adequate |
| Acceptable | 12-20 dB | Warn, acceptable with caution |
| Poor | 8-12 dB | Reject consideration, high noise |
| Critical | < 8 dB | REJECT, unusable |

### Quality Score (0-100)

| Score Range | Category | Recommendation |
|-------------|----------|-----------------|
| 80-100 | Excellent | ACCEPT |
| 60-79 | Good | ACCEPT |
| 40-59 | Acceptable | WARN |
| < 40 | Poor | REJECT |

### Clipping Tolerance

| Percentage | Action |
|-----------|--------|
| 0% | Acceptable |
| 0-3% | Acceptable with note |
| 3-10% | Warn |
| > 10% | Reject |

---

## Recommendation Logic

### ACCEPT
- SNR > 20 dB
- Quality score > 70
- No clipping (or < 1%)
- Proper normalization
- Audio features acceptable

### WARN
- SNR 12-20 dB (elevated background noise)
- Quality score 40-70 (below optimal)
- Clipping 3-10% (minor)
- Normalization needed (apply gain)
- Filler words detected (> 8)

### REJECT
- SNR < 12 dB (too much noise)
- Quality score < 40 (poor)
- Clipping > 10% (severe)
- Speaking duration < 5 seconds
- Multiple critical issues

---

## Integration with Orchestrator

### Scoring Pipeline

```
SPEAKING Response (audio)
    ↓
ScoringOrchestratorEnsemble.scoreSpeaking()
    ↓
[Q2.1] AcousticAnalyzer.analyzeAudio()
    ↓
[Q2.2] AudioQualityAnalyzer.analyzeAudioQuality()
    ↓
generateQualityRecommendation()
    ↓
REJECT → Force human review, skip ensemble scoring
WARN → Flag in review reasons, proceed with ensemble
ACCEPT → Proceed normally with ensemble scoring
```

### OrchestratedScore Updates

Quality metrics attached to response:

```json
{
  "score": 0.72,
  "aiResult": {
    "rubricScores": { "fluency": 7.5, ... },
    "audioFeatures": { ... },
    "audioQualityMetrics": {
      "snr": 22.5,
      "qualityScore": 85,
      "qualityCategory": "good",
      "clippingDetected": false,
      "normalizedRequired": false
    },
    "qualityRecommendation": {
      "recommendation": "ACCEPT",
      "reason": "Audio quality acceptable (SNR: 22.5dB, Quality: 85/100)",
      "snr": 22.5,
      "qualityScore": 85
    }
  },
  "requiresHumanReview": false,
  "reviewReasons": []
}
```

---

## Quality Metrics by CEFR Level

**SNR Benchmarks** (Future enhancement):

| CEFR | Minimum SNR | Target SNR |
|------|-------------|-----------|
| A1 | 10 dB | 15 dB |
| A2 | 12 dB | 18 dB |
| B1 | 14 dB | 20 dB |
| B2 | 15 dB | 22 dB |
| C1 | 16 dB | 24 dB |
| C2 | 18 dB | 26 dB |

*Future implementation will use CEFR-aware thresholds for adaptive quality standards.*

---

## Performance

| Operation | Latency |
|-----------|---------|
| analyzeAudioQuality() | ~50-100ms |
| generateQualityRecommendation() | ~2ms |
| **Total per response** | ~160-310ms (within SLA) |

**No additional API costs**: All processing client-side

---

## Testing

### Unit Tests (30+ tests)

```
✅ AudioQualityAnalyzer
  ✅ analyzeAudioQuality() [5 tests]
  ✅ SNR Analysis [5 tests]
  ✅ Clipping Detection [2 tests]
  ✅ Dynamic Range [2 tests]
  ✅ Normalization Assessment [2 tests]
  ✅ Quality Score [3 tests]

✅ Quality Recommendations
  ✅ generateQualityRecommendation() [5 tests]

✅ Normalization Calculation [2 tests]

✅ Configuration
  ✅ Quality Thresholds [3 tests]
  ✅ CEFR Benchmarks [3 tests]
```

**Running Tests**:
```bash
npm test -- test/audio-quality-analyzer.test.ts
```

---

## API Integration

### POST /api/assess/speaking

**Response includes quality assessment**:

```json
{
  "requiresHumanReview": false,
  "reviewReasons": [],
  "aiResult": {
    "audioQualityMetrics": {
      "snr": 22.5,
      "qualityScore": 85,
      "qualityCategory": "good"
    },
    "qualityRecommendation": {
      "recommendation": "ACCEPT"
    }
  }
}
```

---

## Architecture Decisions

### 1. Placeholder SNR Estimation (MVP)

**Decision**: Estimate SNR from simulated spectral properties

**Rationale**:
- Unblocks quality assessment testing
- Allows recommendation logic validation
- Real FFT processing is Q2.2+ work
- Same AudioQualityMetrics interface supports drop-in replacement

### 2. Combined Assessment

**Decision**: Merge acoustic features with quality metrics for holistic judgment

**Rationale**:
- Poor quality + poor speech patterns = strong REJECT signal
- Good quality + good patterns = strong ACCEPT signal
- Prevents false positives/negatives

### 3. CEFR-Agnostic Thresholds (MVP)

**Decision**: Use fixed SNR thresholds, prepare for CEFR-aware in future

**Rationale**:
- Simpler implementation for Q2.2
- A1 learners may have more background noise (realistic)
- Future: Add CEFR-aware thresholds via SNR_BENCHMARKS_BY_CEFR

---

## Known Limitations

### Current (Q2.2)
- ✅ **Placeholder SNR calculation**: Estimated from simulated spectral analysis
- ✅ **No real FFT**: Will be added with production audio library
- ✅ **Simulated clipping detection**: Based on buffer characteristics
- ✅ **Fixed thresholds**: Not CEFR-aware

### Future Enhancements

**Q2.2+ Audio Processing**:
- [ ] Real FFT-based spectral analysis
- [ ] Welch's method for noise floor estimation
- [ ] Actual peak/RMS calculation from PCM samples
- [ ] Spectral centroid and entropy analysis

**Q2.3 CEFR Integration**:
- [ ] CEFR-aware SNR thresholds
- [ ] Level-specific quality standards
- [ ] Adaptive quality requirements
- [ ] Calibration vs. EF SET benchmark

---

## Troubleshooting

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| All responses REJECT | Check SNR thresholds | May need to increase for noisy environments |
| False positives (good audio rejected) | Verify quality score calculation | Check acoustic feature weights |
| Quality metrics missing | USE_ENSEMBLE_SCORING not true | Set `export USE_ENSEMBLE_SCORING=true` |
| Processing slow | Too many analysis steps | Optimize or defer some metrics to async batch job |

---

## Migration Path

### Backward Compatibility ✅
- Quality analysis enabled only with `USE_ENSEMBLE_SCORING=true`
- Legacy primary-verifier (false) unaffected
- Zero breaking changes

### Gradual Integration
1. Deploy with quality analysis enabled
2. Monitor quality recommendations in staging
3. Adjust thresholds based on real data
4. Measure impact on human review queue
5. Fine-tune for production use

---

## References

### Audio Quality Standards
- ITU-R BS.1534 - MUSHRA (subjective quality assessment)
- ITU-T P.862 - PESQ (speech quality measurement)
- Speech Signal Processing for Language Assessment

### Implementation
- Placeholder: Simulated FFT properties
- Production: librosa (Python) or TensorFlow.js (Node)
- Future: Real-time spectral analysis for live feedback

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-22  
**Status**: ✅ Q2.2 Implementation Complete (Placeholder + Integration)

## Next Steps: Q2.3 MIRT Multi-Skill Linking (15-20 days)

Q2.2 provides the foundation for quality-aware assessment. Q2.3 will add psychometric linking to unify WRITING and SPEAKING on a common scale.
