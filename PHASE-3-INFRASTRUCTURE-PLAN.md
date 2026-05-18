# Phase 3: Infrastructure & Test Coverage
**Start Date**: 2026-05-18 | **Duration**: 3-5 days | **Status**: Ready to start

---

## Overview

Phase 2 stabilized the item bank (95% health). Phase 3 hardens the codebase by:
1. **Expanding test coverage** from 0.8% to 15%+
2. **Adding pre-save validation** to prevent regressions
3. **Documenting critical schemas** (SPEAKING assessment)
4. **Establishing CI/CD gates** for quality

---

## Priority 1: Test Coverage Expansion (High Impact)

### Current State
- **354** TypeScript source files
- **3** test files (0.8% coverage) — critically low
- **0** integration tests for assessment flow
- **0** tests for psychometrics module
- **0** validation tests for item structure

### Target
- **60** test files (15%+ coverage by file count)
- ✅ Assessment delivery flow (item rendering → scoring)
- ✅ Item bank integrity (options, rationales, audio)
- ✅ Psychometrics engine (3PL, MIRT, DIF)
- ✅ API mutation endpoints (create/update item, submit answer)

### Implementation Strategy

#### Tier 1 (Foundation, 1-2 days)
Focus on critical paths that would break production.

**1.1 Assessment Delivery Tests** (8-10 tests)
- File: `test/assessment-delivery.test.ts`
- Scope:
  - Load item by skill/CEFR
  - Render MCQ item with options
  - Render READING item with passage
  - Render LISTENING item with audio
  - Submit answer → update assessment state
  - Handle scoring (SPEAKING rubric vs. MCQ correct answer)

**1.2 Item Bank Integrity Tests** (6-8 tests)
- File: `test/item-bank.test.ts`
- Scope:
  - Create item with required fields
  - Validate option structure (text, isCorrect, rationale)
  - Validate READING item has passage
  - Validate LISTENING item has audio or TTS script
  - Validate SPEAKING item has prompt + scoringRubric
  - Prevent save if constraints violated

**1.3 API Mutation Tests** (4-6 tests)
- File: `test/api-mutations.test.ts`
- Scope:
  - POST /api/items (create with validation)
  - PATCH /api/items/:id (update with integrity checks)
  - POST /api/respond (submit answer with type-safe parsing)
  - Error handling for malformed payloads

**Template**: Use existing audit scripts as fixtures:
```typescript
import { prisma } from "../src/lib/prisma.js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("Assessment Delivery", () => {
  it("should load and render MCQ item with options", async () => {
    const item = await prisma.item.findFirst({
      where: { skill: "GRAMMAR", status: "ACTIVE" },
    });
    expect(item).toBeDefined();
    expect((item.content as any).options).toHaveLength(4);
    expect((item.content as any).options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: expect.any(String), isCorrect: expect.any(Boolean) }),
      ])
    );
  });
});
```

#### Tier 2 (Psychometrics, 1-2 days)
- File: `test/psychometrics.test.ts`
- Scope:
  - 3PL model estimation
  - MIRT dimensionality
  - DIF detection
  - Shadow testing algorithm
  - Equating chains
- Leverage `src/lib/psychometrics/` structure

#### Tier 3 (UI Components, 1 day)
- Vitest + React Testing Library
- Focus: Item display, option selection, feedback rendering
- Use existing audit fixtures for test data

### Test Data Strategy
Use audit scripts to populate test database:
```bash
# Seed test DB with real items
npx tsx audit-comprehensive.ts --seed-test-db

# Or directly query production samples
ITEMS=$(npx tsx inspect-speaking.ts --json | jq '.items[0:10]')
```

---

## Priority 2: Pre-Save Validation (Medium Impact)

### Current Risk
- No validation prevents malformed items from reaching database
- Serialization bugs ([object Object]) slip through
- Items missing required fields accepted (e.g., no prompt, no options)
- Results in downstream audit failures

### Solution: Create Validation Layer

**File**: `src/lib/validation/item-schema.ts`

```typescript
import z from "zod";

export const optionSchema = z.object({
  text: z.string().min(2, "Option text must be at least 2 chars"),
  isCorrect: z.boolean().optional(),
  rationale: z.string().min(5, "Rationale must be at least 5 chars").optional(),
});

export const itemContentSchema = z
  .object({
    prompt: z.string().min(5).optional(),
    stem: z.string().min(5).optional(),
    question: z.string().min(5).optional(),
    options: z.array(optionSchema).min(2, "Item must have at least 2 options").optional(),
  })
  .refine(
    (data) => data.prompt || data.stem || data.question,
    "Item must have prompt, stem, or question"
  )
  .superRefine((data, ctx) => {
    if (["GRAMMAR", "VOCABULARY", "READING"].includes(data.skill)) {
      if (!data.options || data.options.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "MCQ items must have 4+ options",
        });
      }
      if (!data.options?.some((o) => o.isCorrect === true)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "MCQ items must have 1 correct option (isCorrect: true)",
        });
      }
    }
    if (data.skill === "READING" && (!data.passage || data.passage.trim().length < 30)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "READING items must have passage with 30+ chars",
      });
    }
    if (data.skill === "SPEAKING" && !data.scoringRubric) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SPEAKING items must have scoringRubric",
      });
    }
  });

export async function validateItemBeforeSave(item: Item): Promise<z.SafeParseReturnType<any, any>> {
  return itemContentSchema.safeParseAsync(item.content);
}
```

**Integration**: Add to Prisma middleware or API handlers
```typescript
// In POST /api/items handler
const validation = await validateItemBeforeSave(item);
if (!validation.success) {
  return res.status(400).json({ errors: validation.error.format() });
}
```

---

## Priority 3: Documentation (Low Impact, High Clarity)

### 3.1 SPEAKING Assessment Schema
**File**: `docs/SPEAKING-ASSESSMENT-SCHEMA.md`
```markdown
# SPEAKING Item Assessment Structure

## Field Structure
```json
{
  "prompt": "Describe a recent decision you made...",
  "responseTime": 120,      // seconds to respond
  "prepTime": 30,           // seconds to prepare
  "scoringRubric": {        // NOT correctAnswer
    "fluency": { "levels": 4, "descriptor": "Native-like fluency" },
    "accuracy": { "levels": 4, "descriptor": "Near-native grammar" },
    "coherence": { "levels": 4, "descriptor": "Well-organized ideas" }
  }
}
```

## Why No `correctAnswer`?
- SPEAKING is scored holistically via rubric
- Not multiple-choice; human/AI rater applies 4-point scale per dimension
- `scoringRubric` replaces MCQ concept of single "correct" answer
```

### 3.2 TODO Marker Resolution
```bash
grep -rn "TODO" src/ --include="*.ts" --include="*.tsx"
```
Once located, create issue or resolve in dedicated PR.

---

## Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Test files | 3 | 60+ | Phase 3 |
| Coverage by file | 0.8% | 15%+ | Phase 3 |
| Assessment tests | 0 | 8+ | Tier 1 |
| Item validation layer | No | Yes | Tier 2 |
| SPEAKING schema doc | No | Yes | Tier 3 |
| Pre-save validation gates | No | All mutating endpoints | Phase 3 |

---

## Implementation Order

1. **Day 1-2**: Tier 1 tests (assessment delivery, item bank, API mutations)
2. **Day 2-3**: Tier 2 tests (psychometrics)
3. **Day 3-4**: Tier 3 tests + pre-save validation layer
4. **Day 4-5**: Documentation + CI/CD gate setup

---

## Risk Mitigation

**Risk**: Test database differs from production structure
- **Mitigation**: Use real item samples from audit fixtures, test against shadow DB

**Risk**: Validation layer breaks existing items
- **Mitigation**: Run validation dry-run on all 3,402 items before enforcing

**Risk**: Test coverage doesn't increase proportionally to effort
- **Mitigation**: Focus on critical paths first (assessment delivery); secondary tests can be added incrementally

---

## Next Steps

1. Create `test/` directory structure
2. Start with assessment delivery tests
3. Integrate validation layer into item creation endpoints
4. Establish pre-commit hook to run test suite
5. Add CI workflow to enforce coverage thresholds

**Estimated completion**: 2026-05-21 to 2026-05-22
