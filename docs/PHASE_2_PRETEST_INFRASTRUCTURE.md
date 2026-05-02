# Phase 2: Pretest Infrastructure

> **Status**: Complete — integrated with CAT engine and live sessions
> **Deployed**: Automatic pretest injection on session launch + nightly auto-calibration

---

## Architecture

The pretest infrastructure is a 3-stage system for collecting live calibration data:

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Session Launch] → [Injection] → [Response Collection] → [Calibration]│
│                                                                      │
│ Stage 1: Session starts         Stage 3: Nightly batch job          │
│          2-3 PRETEST items      counts responses, fits IRT,        │
│          auto-added to pool     checks quality, promotes ACTIVE     │
│                                                                      │
│ Stage 2: Live test              Stage 4 (future): Monitoring        │
│          Candidate answers       DIF analysis, exposure control     │
│          PRETEST items          item bank metrics dashboard        │
│          (invisible to CAT)                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Aspect | Design | Rationale |
|---|---|---|
| **Visibility** | Invisible to CAT (flow through normal pool) | Prevents distortion of theta estimates |
| **Tagging** | `Response.isPretest = true` | Excludes from classical stats, included in IRT only |
| **Injection timing** | At session launch | Ensures every test gets pretest coverage |
| **Injection count** | 2-3 per session | Balances data collection speed vs test burden |
| **Calibration threshold** | 30 responses | Statistical minimum for reliable 2PL fit |
| **Promotion threshold** | 50 responses | Confidence threshold before auto-promotion |
| **Scheduling** | Nightly batch job | Captures diurnal patterns, predictable latency |

---

## Components

### 1. Pretest Manager (`src/lib/assessment-engine/pretest-manager.ts`)

Core module managing the full pretest lifecycle.

**Key exports:**

- `injectPretestItems(sessionId)` — called at session launch
  - Filters PRETEST items by session skill (if specified)
  - Prefers lower-exposure items (fair distribution)
  - Stores injected item IDs in session metadata
  - Returns array of injected item IDs

- `markPretestResponse(responseId, itemId)` — called on response submit
  - Checks if item is PRETEST status
  - Sets Response.isPretest = true if so
  - Used by `submitResponse()` in server-engine

- `autoCalibratePretestItems()` — nightly job
  - Finds all PRETEST items
  - Counts pretest responses per item
  - Fits IRT parameters via `CalibrationService`
  - Checks activation criteria (discrimination, difficulty, response count)
  - Promotes to ACTIVE if acceptable
  - Logs results for monitoring

- `getPretestStatistics()` — dashboard support
  - Returns pretest item count
  - Responses per item
  - Items ready for calibration
  - Items ready for promotion

**Criteria for promotion:**

```typescript
MIN_DISCRIMINATION = 0.5
MAX_DISCRIMINATION = 3.0
MIN_ACTIVATION_RESPONSES = 50
```

### 2. Server Engine Integration (`src/lib/assessment-engine/server-engine.ts`)

Two integration points:

**In `launchSession()`:**
```typescript
const { injectPretestItems } = await import("./pretest-manager.js");
await injectPretestItems(session.id).catch((err) => {
  logger.warn({ err }, "pretest injection failed — non-blocking");
});
```

**In `submitResponse()`:**
```typescript
isPretest: item.isPretest || dbItem.status === "PRETEST" || requiresHumanReview || false,
```

### 3. Nightly Job (`scripts/jobs/auto-calibrate-pretest.ts`)

Executable script that runs `autoCalibratePretestItems()`.

**Usage:**
```bash
# Manual run
npm run db:job:calibrate-pretest

# Cron schedule (recommended)
0 2 * * * cd /app && npm run db:job:calibrate-pretest
```

**Output:**
```
Starting nightly PRETEST auto-calibration job...
Before: 142 PRETEST items, 18 ready

Processed: 142 items, Promoted: 5, Failed: 0

After: 137 PRETEST items (5 moved to ACTIVE), 13 ready

Detailed results:
  cuid_abc: 78 responses → ✓ PROMOTED
  cuid_def: 52 responses → ✓ PROMOTED
  cuid_ghi: 31 responses → ✗ Discrimination too low (0.42)
  ...
```

---

## Workflow Examples

### Example 1: Session Launch with Pretest Injection

```
1. POST /api/sessions/launch { candidateId, organizationId }
   ↓
2. Server creates Session (status=IN_PROGRESS, theta=0.0)
   ↓
3. injectPretestItems(sessionId) is called
   ↓
4. Query: SELECT * FROM Item WHERE status='PRETEST' AND skill=productLine
   ↓
5. Sort by exposureCount, take top 2-3
   ↓
6. Update session.metadata.injectedPretestItemIds = [id1, id2, id3]
   ↓
7. Return { sessionId, status: "IN_PROGRESS" }
   ↓
8. Client calls GET /api/sessions/:id/next
   ↓
9. CAT engine selects from pool (which includes ACTIVE + PRETEST)
      → Candidate might get a PRETEST item on question 3, 7, 12 (random)
      → Candidate has no idea it's pretest (invisible)
```

### Example 2: Candidate Answers Pretest Item

```
1. POST /api/sessions/:id/respond { itemId, value, latencyMs }
   ↓
2. Fetch dbItem (has status='PRETEST')
   ↓
3. Calculate score (MCQ, AI scoring, etc)
   ↓
4. In submitResponse:
      Response.isPretest = true (because dbItem.status === "PRETEST")
   ↓
5. prisma.response.create({
      sessionId, itemId, value, score, isPretest: true, ...
   })
   ↓
6. Response is saved, but theta estimation SKIPS pretest responses
      → theta doesn't shift based on pretest answers
      → only real ACTIVE items train the ability estimate
   ↓
7. Return response result to client (same UI as normal item)
```

### Example 3: Nightly Auto-Calibration

```
Cron: 0 2 * * * (2 AM daily)
   ↓
npm run db:job:calibrate-pretest
   ↓
Query: SELECT * FROM Item WHERE status='PRETEST'
   ↓
For each PRETEST item:
   - COUNT responses WHERE isPretest=true
   - If count < 30: skip (not ready)
   - If count >= 30:
       * Call CalibrationService.recalibrateItem(itemId)
       * Fetch fitted params: a, b, c
       * Check criteria:
           a ∈ [0.5, 3.0]
           responses >= 50
           p_value ∈ [0.1, 0.95]
       * If all pass: UPDATE Item SET status='ACTIVE'
       * Else: log reason, stay PRETEST
   ↓
Log summary:
   Processed: 142 items
   Promoted: 5 items → ACTIVE
   Failed: 0 items
   ↓
Candidate experience unchanged:
   - Next session will see fewer PRETEST items (more ACTIVE ones available)
   - No retroactive rescoring of previous tests
   - Test data remains valid (no theta recalibration)
```

---

## Monitoring & Observability

### Metrics to Track

**Session-level:**
- % of sessions with pretest injection successful
- % of responses marked as pretest
- Distribution of injected item counts

**Item-level:**
- PRETEST → ACTIVE conversion rate (promotion rate)
- Average time-to-promotion (days from PRETEST creation)
- Discrimination distribution before/after calibration
- Fit statistics (infit, outfit, by CEFR level)

**Job-level:**
- Job runtime (minutes)
- Items processed per run
- Promotion count per run
- Job error rate

### Log Lines

All actions are logged to Sentry + pino:

```json
{
  "event": "pretest.items.injected",
  "sessionId": "clm_xyz",
  "count": 3,
  "itemIds": ["cuid_1", "cuid_2", "cuid_3"],
  "timestamp": "2026-05-02T08:15:23.456Z"
}
```

```json
{
  "event": "pretest.promoted.to.active",
  "itemId": "cuid_123",
  "discrimination": 1.23,
  "difficulty": 0.45,
  "responseCount": 67
}
```

```json
{
  "event": "pretest.auto.calibration.completed",
  "total": 142,
  "promoted": 5,
  "failed": 0,
  "durationMs": 12456
}
```

### Dashboard Queries

Example Prisma/SQL queries for monitoring:

```sql
-- PRETEST item status
SELECT status, COUNT(*) as count FROM Item WHERE status IN ('PRETEST', 'ACTIVE') GROUP BY status;

-- Items ready for calibration
SELECT id, COUNT(r.id) as responses FROM Item i
LEFT JOIN Response r ON i.id = r.itemId AND r.isPretest = true
WHERE i.status = 'PRETEST' AND COUNT(r.id) >= 30
GROUP BY i.id;

-- Promotion rate (last 30 days)
SELECT 
  DATE(updatedAt) as day,
  COUNT(*) as promotions
FROM Item 
WHERE status = 'ACTIVE' AND createdAt >= NOW() - INTERVAL 30 DAY
GROUP BY DATE(updatedAt);

-- Time to promotion
SELECT 
  AVG(DATEDIFF(DAY, createdAt, updatedAt)) as avg_days_to_promotion
FROM Item 
WHERE status = 'ACTIVE' AND tags LIKE '%_pretest_origin_%';
```

---

## Configuration

Edit thresholds in `src/lib/assessment-engine/pretest-manager.ts`:

```typescript
const PRETEST_INJECTION_COUNT = 2;              // Items per session
const PRETEST_CALIBRATION_THRESHOLD = 30;       // Min responses to start fit
const PRETEST_ACTIVATION_THRESHOLD = 50;        // Min responses before auto-promote
const ACTIVATION_MIN_DISCRIMINATION = 0.5;      // a-parameter bounds
const ACTIVATION_MAX_DISCRIMINATION = 3.0;
```

---

## Troubleshooting

| Issue | Diagnosis | Fix |
|---|---|---|
| No PRETEST items injected | No PRETEST items exist in bank | Create PRETEST items via Phase 1 validation gates |
| High failure rate in job | IRT fit instability | Check response count; increase CALIBRATION_THRESHOLD |
| Items promoted too slow | Conservative thresholds | Lower ACTIVATION_THRESHOLD (e.g., 30 instead of 50) |
| PRETEST responses distorting theta | Marking failed | Verify `dbItem.status === "PRETEST"` check in submitResponse |
| Job crashes | CalibrationService error | Check Sentry logs; verify data quality in responses table |

---

## Future Enhancements (Phase 3+)

- **DIF detection** — flag items with differential item functioning by L1, gender
- **Exposure control** — Sympson-Hetter capping per CEFR-skill-topic
- **Multi-dimensional IRT** — MIRT for correlated skills
- **Adaptive bank management** — retire underperforming items
- **Cold-start optimization** — priority injection for rare skill/topic combos
- **Real-time monitoring dashboard** — live pretest metrics
