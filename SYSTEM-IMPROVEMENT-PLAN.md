# LinguaAdapt System Improvement Plan
**Generated**: 2026-05-18 | **Total Items Scanned**: 3,402

## Executive Summary
- **Critical Issues**: 3 broken items + 35 malformed options requiring immediate remediation
- **Audit Findings**: 72 total issues across integrity, content quality, and codebase health
- **Test Coverage**: 0.8% (3 tests / 354 source files) — critical gap
- **SPEAKING Skill**: 613 items flagged for "missing correct answer" — likely schema design (rubric-based) requiring clarification

---

## Issue Breakdown by Category & Priority

### 🔴 CRITICAL — Immediate Action Required

#### 1. Object Serialization Errors (3 items)
**Items**: cmp4hf8af000, cmp4ieikq001, cmp4j5mru002 (all GRAMMAR A2)
**Issue**: Content contains `[object Object]` placeholders instead of serialized data
**Root Cause**: Likely JSON serialization failure during item creation or migration
**Impact**: Items render incorrectly in assessments; wrong options marked as duplicates
**Remediation**:
1. Inspect content field in database for these 3 items
2. Attempt to recover from backup or recreate from source data
3. If unrecoverable, retire items (add to fix script as batch operation)
4. Implement pre-save validation to prevent future occurrences

**Estimated Effort**: 30 minutes

---

#### 2. Duplicate/Malformed Options (35 items)
**Issue**: 35 items have options with <2 character text or exact duplicates
**Severity**: High — breaks MCQ logic and reduces item reliability
**Most Likely Cause**: Related to serialization errors above; items with [object Object] options
**Sample**: cmp4hf8af000 has 5 options but only 1 unique text
**Remediation**:
1. Identify all 35 affected items
2. Categorize by cause (serialization vs. intentional duplicates)
3. Fix serialization issues (see #1)
4. Manual review for intentional duplicates (if any)
5. Retire unrecoverable items

**Estimated Effort**: 45 minutes

---

#### 3. Missing Passage — ACTIVE READING Item (1 item)
**Item**: cmovo0lwm001 (A2 ACTIVE)
**Issue**: READING item with no passage, no readingText, no text field
**Impact**: Question is unanswerable; student will fail despite correct reading comprehension
**Remediation**:
1. Locate source content (check import logs, prior versions)
2. Add passage to item
3. If passage unavailable, retire item
4. Add database constraint to prevent future READING items without passage

**Estimated Effort**: 15 minutes

---

### 🟠 HIGH — Address Within 1-2 Days

#### 4. Items Missing Options (9 items)
**Issue**: 9 items have no `options` array or empty array
**Skills Affected**: Primarily GRAMMAR, VOCABULARY, READING
**Impact**: Item fails to render in assessment UI
**Remediation**:
1. Query items where `content.options` is null/empty
2. Attempt to recover options from source data or audit logs
3. If unavailable, retire items
4. Add pre-save validation: MCQ-type items must have ≥3 options

**Estimated Effort**: 20 minutes (discovery + triage)

---

#### 5. Items Missing Correct Answer Marker (12 items, excluding SPEAKING)
**Issue**: 12 non-SPEAKING items have no `correctAnswer` field and no `isCorrect:true` option
**Note**: 613 SPEAKING items also flag this — these may be intended (rubric-based scoring)
**Remediation**:
1. Verify SPEAKING items are intentionally rubric-scored (check schema)
2. For non-SPEAKING items: identify which option is correct
3. Set `isCorrect: true` or populate `correctAnswer` field
4. Add database constraint: all MCQ items must have 1 correct answer

**Estimated Effort**: 25 minutes

---

#### 6. Items Missing Rationale Text (9 items)
**Issue**: 9 items have options with no rationale or generic placeholder rationale
**Context**: Part of broader 799-item rationale generation effort (scripts exist)
**Remediation**:
1. Include in `generate-rationales.ts` batch processing
2. Run full rationale generation for all skills
3. Monitor for Gemini API stability (previous partial failures)

**Estimated Effort**: 4-6 hours (full batch with Gemini API rate limits)

---

#### 7. SPEAKING Skill Missing Correct Answers (613 items)
**Issue**: All 613 SPEAKING items flagged for missing correct answer
**Hypothesis**: SPEAKING items use rubric-based scoring, not multiple-choice
**Remediation**:
1. **Verify schema**: Check if `Item.content` has a rubric field or if correctness is determined differently
2. If rubric-based, update audit script to skip SPEAKING items for correctAnswer check
3. If correctAnswer is required, modify all 613 items to populate this field

**Estimated Effort**: Depends on schema verification (5 min verification + 2-3 hours if changes needed)

---

#### 8. Items with Invalid/Corrupted Content (3 items)
**Issue**: 3 items have content that JSON.stringify() reveals as malformed
**Likely Cause**: Same as serialization errors (items #1-2)
**Remediation**: Same as #1 (fix serialization, retire if unrecoverable)

**Estimated Effort**: Included in #1

---

### 🟡 MEDIUM — Schedule Within 1 Week

#### 9. Items Missing Prompt/Question (1 item)
**Item**: cmp4h48kc000 (A2 PRETEST) — should already be RETIRED
**Issue**: Item has no prompt, stem, or question field
**Remediation**:
1. Verify item is actually RETIRED in database
2. If not, retire it immediately
3. Check for similar items with empty prompts

**Estimated Effort**: 5 minutes

---

#### 10. Critically Low Test Coverage (0.8%)
**Issue**: 354 source files with only 3 test files
**Impact**: 
- Regressions undetected
- API breaking changes ship to production
- Quality drift over time
**Remediation**:
1. Establish test baseline (target: 60% within 3 months)
2. Start with critical paths: authentication, assessment delivery, item rendering
3. Use existing audit scripts as guides for integration tests
4. Add pre-commit hooks to enforce minimum coverage

**Estimated Effort**: 10-15 hours (Phase 1: critical path coverage)

**Priority**: Schedule after item bank stabilization

---

#### 11. Code Quality Debt (1 TODO marker)
**Issue**: 1 TODO item in codebase
**Remediation**:
1. Locate and review TODO
2. Prioritize or resolve

**Estimated Effort**: 10 minutes (once located)

---

### 🟢 LOW — Backlog

#### 12. Audio File Validation
**Note**: Audit found 0 missing audio files, but 54 DRAFT LISTENING items await audio generation
**Status**: In progress (scripts created and tested)
**Remediation**: Complete generate-draft-listening-audio.ts batch (retry 13 failed items)

---

---

## Implementation Roadmap

### Phase 1: Stabilize (Today → 2026-05-19, ~2 hours)
1. ✅ Create fix script for #1-3 (serialization, missing passage)
2. ✅ Run fix script and verify database state
3. Retry audio generation for 13 failed items (#12)
4. Verify SPEAKING schema for #7

**Expected Outcome**: 
- 3 broken items fixed or retired
- 1 ACTIVE READING item repaired
- 13 audio files successfully generated
- SPEAKING items clarified

### Phase 2: Content Quality (2026-05-19 → 2026-05-21, ~6-8 hours)
1. Run full `generate-rationales.ts` for all skills
2. Fix 12 items with missing correct answers
3. Triage 9 items with missing options
4. Retire or fix 3 items with invalid content

**Expected Outcome**:
- 799 items with improved rationales
- 100% of MCQ items have correct answer marked
- Item bank integrity >99%

### Phase 3: Infrastructure (2026-05-22 → ongoing)
1. Establish test baseline
2. Add pre-save validation to prevent regressions
3. Document SPEAKING assessment schema
4. Schedule code quality improvements

---

## Key Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Broken items | 12 | 0 | Phase 1 |
| Malformed options | 35 | 0 | Phase 1 |
| Items with rationales | ~2,600 | 3,402 | Phase 2 |
| Test coverage | 0.8% | 15% | Phase 3 |
| ACTIVE items | 2,132 | 2,150+ | Phase 2 |
| RETIRED items | 151 | <140 | Phase 1 |

---

## Risk Assessment

**High Risk**:
- Gemini API stability during batch rationale generation (mitigated: retry logic, rate limiting)
- SPEAKING schema confusion (mitigated: immediate schema review)

**Medium Risk**:
- Data loss if backups unavailable for serialization recovery
- Unintended item retirement if triage is insufficient

**Mitigation**:
- All fix scripts use DRY_RUN mode for preview
- Database backups taken before batch operations
- Manual verification of high-impact decisions

---

## Success Criteria

- ✅ Zero items with [object Object] content
- ✅ All ACTIVE items have complete, valid structure
- ✅ Item bank integrity audit shows zero critical issues
- ✅ SPEAKING schema is documented and verified
- ✅ 13 failed audio items successfully generated or triaged
