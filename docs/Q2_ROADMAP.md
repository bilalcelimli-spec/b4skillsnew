# Q2 Roadmap: Speech/Audio & Psychometric Excellence

**Timeline**: Months 3-6 (May-July 2026)

## Q2 Priority Matrix

| Phase | Component | Priority | Est. Days | Status |
|-------|-----------|----------|-----------|--------|
| **Q2.1** | **Speech Acoustic Analysis** | 1 | 12-15 | ✅ COMPLETE |
| **Q2.2** | Audio Quality Baseline | 1 | 8-10 | ⏳ Starting Next |
| **Q2.3** | MIRT Multi-Skill Linking | 2 | 15-20 | Queued |
| **Q2.4** | Real-Time Transcription | 2 | 10-15 | Queued |
| **Q2.5** | Person-Fit Statistics | 3 | 8-12 | Queued |

---

## Q2.1: Speech Acoustic Analysis (Starting Now)

### Goal
Extract and analyze prosodic features from speech responses (SPEAKING task):
- Speech rate (words/min)
- Pause patterns (frequency, duration)
- Pitch variation (mean, range, std dev)
- Voice quality (clarity, breathiness)
- Stress patterns (emphasis on keywords)

### Components

#### 1. Audio Feature Extraction (`src/lib/scoring/acoustic-analyzer.ts`)
```typescript
interface AudioFeatures {
  speechRate: number;              // Words per minute
  pauseDuration: number;           // Total pause seconds
  pauseFrequency: number;          // Count of pauses
  pauseDistribution: {             // Pauses by interval
    before1min: number;
    1to3min: number;
    after3min: number;
  };
  
  // Pitch analysis
  pitchMean: number;               // Hz
  pitchRange: number;              // Semitones (Hz_max / Hz_min)
  pitchStdDev: number;
  pitchVariation: "flat" | "moderate" | "expressive";
  
  // Voice quality
  voiceClarity: number;            // 0-10 (signal-to-noise ratio)
  articulation: number;            // 0-10 (pronunciation distinctness)
  voiceQualityFlags: string[];     // ["breathiness", "nasality", "harshness"]
  
  // Temporal
  speakingDuration: number;        // Total speaking time (seconds)
  silenceDuration: number;         // Total silence (excluding pauses)
  fillerWords: number;             // Um, uh, like, you know
  fillerWordsFlag: boolean;        // > 5% threshold
  
  // Stress & intonation
  stressPattern: {
    keywordEmphasis: number;       // 0-10 (prominence on content words)
    sentenceIntonation: "falling" | "rising" | "flat" | "varied";
    naturalFlow: number;           // 0-10 (prosodic naturalness)
  };
}
```

#### 2. Audio Processing Pipeline
- **Input**: Base64-encoded WAV/MP3 (from Gemini transcription)
- **Processing**:
  1. Convert to standardized format (mono, 16kHz)
  2. Segment into phonemes using alignment from transcript
  3. Detect pauses (silent > 200ms)
  4. Extract pitch contour (fundamental frequency, F0)
  5. Analyze formants for voice quality
  6. Match stress patterns to transcript

- **Libraries**:
  - `librosa` (Python backend) or `tone-analyzer` (Node)
  - Web Audio API for client-side visualization
  - Librosa Python script (fork process via `child_process`)

#### 3. Scoring Integration
```typescript
// Add to multi-rater ensemble
const ensembleResult = await scoreWithEnsemble(
  candidateResponse,
  taskPrompt,
  cefrLevel,
  "SPEAKING",
  transcript,
  audioFeatures  // ← NEW parameter
);

// Acoustic features factor into fluency scoring:
// fluency = 0.5 * (llmFluencyScore) + 
//           0.3 * (acousticNaturalness) + 
//           0.2 * (pauseAppropriacy)
```

### Deliverables
- `src/lib/scoring/acoustic-analyzer.ts` (350 lines)
- `scripts/extract-acoustic-features.ts` (batch processing)
- Test suite: 12+ cases (pause detection, pitch analysis, stress patterns)
- Integration with multi-rater ensemble
- Dashboard visualization (waveform + features)

### Success Criteria
- ✅ Extract 8+ acoustic features per response
- ✅ Agreement with SIL/PRAAT (reference tool) > 0.90
- ✅ < 5s processing time per 2-minute response
- ✅ Acoustic features improve fluency scoring F1 by 0.05+

---

## Q2.2: Audio Quality Baseline

### Goal
Flag low-quality audio before scoring (prevent garbage-in):
- Background noise ratio
- Audio clipping/distortion
- Low volume (< -20dB RMS)
- High background noise (SNR < 3dB)

### Components
- Audio preprocessing (noise reduction, normalization)
- SNR (Signal-to-Noise Ratio) calculation
- Detection of recording artifacts
- Automatic quality recommendation (ACCEPT / WARN / REJECT)

---

## Q2.3: MIRT Multi-Skill Linking

### Goal
Link MIRT estimates across skills to a single reporting scale (like CEFR):
- Current: Each skill independently scored 0-1
- Target: Cross-skill correlation & unified ability estimate

### Implementation
- Equating study with EF SET benchmark
- IRT linking functions (mean/sigma, Haebara, Stocking-Lord)
- Continuous reporting scale (e.g., 0-5 with decimals)

---

## Q2.4: Real-Time Transcription

### Goal
Stream audio chunks to Gemini for live transcript feedback:
- WebSocket for audio streaming
- Incremental transcript delivery
- Candidate sees transcript as they speak

---

## Q2.5: Person-Fit Statistics

### Goal
Detect aberrant response patterns (cheating, guessing):
- Outfit/Infit indices (IRT person-fit)
- Guttman scalogram analysis
- Flag sessions with low person-fit

---

## Development Sequence

**Week 1 (Q2.1 Acoustic Analysis)**
- Day 1-2: Research & prototype audio feature extraction
- Day 3-4: Implement acoustic-analyzer.ts
- Day 5-6: Integration testing + multi-rater ensemble hookup
- Day 7: Documentation & dashboard visualization

**Week 2 (Q2.2 Audio Quality)**
- Day 1-2: Quality metrics implementation
- Day 3-4: Integration with scoring queue
- Day 5: Testing & thresholds calibration

**Weeks 3-4 (Q2.3-Q2.5 Parallel)**
- MIRT linking study design
- Real-time transcription WebSocket
- Person-fit statistics

---

## Collaboration Points

- **With Q1 Item Generation**: Use speech data to generate better SPEAKING rubrics
- **With Admin Dashboard**: Add speech acoustic visualization
- **With Human Reviewers**: Flag low-quality audio + acoustic anomalies

---

## Success Metrics

| Metric | Current | Q2 Target |
|--------|---------|-----------|
| SPEAKING fluency agreement | 0.70 (2-rater) | 0.82 (acoustic + 3-rater) |
| Audio quality detection | None | 95% accuracy |
| Response latency | 30s avg | < 5s for acoustics |
| Cross-skill MIRT linking | N/A | r > 0.85 with EF SET |

