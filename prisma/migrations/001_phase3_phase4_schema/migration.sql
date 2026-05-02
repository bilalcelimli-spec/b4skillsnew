-- Phase 3: Item Retirement & DIF Detection Schema Updates

-- Add Item Retirement columns (if they don't exist)
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "difStatus" TEXT;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "latestDifReviewAt" TIMESTAMP(3);
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "retirementReason" TEXT;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "retiredAt" TIMESTAMP(3);
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "retiredBy" TEXT;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "retirementScore" DOUBLE PRECISION;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "retirementScoreHistory" JSONB;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "canBeReactivated" BOOLEAN NOT NULL DEFAULT true;

-- Create RetirementAuditLog table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS "RetirementAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "reason" TEXT,
    "triggeredBy" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvalDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE
);

-- Create DifReportArchive table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS "DifReportArchive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupVariable" TEXT NOT NULL,
    "referenceGroup" TEXT NOT NULL,
    "focalGroup" TEXT NOT NULL,
    "mhOddsRatio" DOUBLE PRECISION,
    "mhDelta" DOUBLE PRECISION NOT NULL,
    "chiSquared" DOUBLE PRECISION,
    "pValue" DOUBLE PRECISION,
    "classification" TEXT NOT NULL,
    "referenceN" INTEGER NOT NULL,
    "focalN" INTEGER NOT NULL,
    "logisticUniformDif" DOUBLE PRECISION,
    "logisticNonUniformDif" DOUBLE PRECISION,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE
);

-- Create DifFlaggedItem table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS "DifFlaggedItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL UNIQUE,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "worstClassification" TEXT NOT NULL,
    "totalDifResults" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE
);

-- Add CandidateProfile demographic columns (if they don't exist)
ALTER TABLE "CandidateProfile" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "CandidateProfile" ADD COLUMN IF NOT EXISTS "nativeLanguage" TEXT;
ALTER TABLE "CandidateProfile" ADD COLUMN IF NOT EXISTS "ageGroup" TEXT;
ALTER TABLE "CandidateProfile" ADD COLUMN IF NOT EXISTS "educationLevel" TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_RetirementAuditLog_itemId" ON "RetirementAuditLog"("itemId");
CREATE INDEX IF NOT EXISTS "idx_RetirementAuditLog_action" ON "RetirementAuditLog"("action");
CREATE INDEX IF NOT EXISTS "idx_RetirementAuditLog_approvalStatus_createdAt" ON "RetirementAuditLog"("approvalStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_DifReportArchive_itemId" ON "DifReportArchive"("itemId");
CREATE INDEX IF NOT EXISTS "idx_DifReportArchive_classification_runDate" ON "DifReportArchive"("classification", "runDate");
CREATE INDEX IF NOT EXISTS "idx_DifReportArchive_isReviewed" ON "DifReportArchive"("isReviewed");
CREATE INDEX IF NOT EXISTS "idx_DifFlaggedItem_status_flaggedAt" ON "DifFlaggedItem"("status", "flaggedAt");
CREATE INDEX IF NOT EXISTS "idx_Item_difStatus_latestDifReviewAt" ON "Item"("difStatus", "latestDifReviewAt");
CREATE INDEX IF NOT EXISTS "idx_Item_retirementScore" ON "Item"("retirementScore");
