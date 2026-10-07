-- Additive fields for independent third-rater arbitration; no existing grades change.
ALTER TABLE "RatingTask"
  ADD COLUMN IF NOT EXISTS "arbitratorId" TEXT,
  ADD COLUMN IF NOT EXISTS "arbitrationScore" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "arbitrationFeedback" TEXT;
CREATE INDEX IF NOT EXISTS "RatingTask_arbitratorId_idx" ON "RatingTask"("arbitratorId");
