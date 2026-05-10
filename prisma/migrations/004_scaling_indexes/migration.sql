-- Migration: 004_scaling_indexes
-- Adds composite indexes needed for 100-concurrent-user performance.
-- See docs/scaling-100-concurrent-users.md §Priority 3 for rationale.

-- Response: (sessionId, isPretest) — submitResponse usedItemIds lookup
CREATE INDEX IF NOT EXISTS "Response_sessionId_isPretest_idx"
  ON "Response" ("sessionId", "isPretest");

-- Response: (createdAt) — SLO monitor rolling-window session counts
CREATE INDEX IF NOT EXISTS "Response_createdAt_idx"
  ON "Response" ("createdAt");

-- Session: (status, updatedAt) — SLO monitor IN_PROGRESS/COMPLETED lookups
CREATE INDEX IF NOT EXISTS "Session_status_updatedAt_idx"
  ON "Session" ("status", "updatedAt");
