-- Migration: 007_faz1_anchor_iqs
-- Adds Faz 1 anchor item and Item Quality Score (IQS) fields to Item table.
-- isAnchor: marks items that must appear in every test form for equating.
-- iqScore:  composite 0-100 quality score gate (IQS ≥ 90 → ACTIVE eligible).
-- cefrLinguisticRange: Axis 1 vocabulary+grammar CEFR range for item tagging.

ALTER TABLE "Item"
  ADD COLUMN IF NOT EXISTS "isAnchor"           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "iqScore"            DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "cefrLinguisticRange" TEXT DEFAULT NULL;

-- Indexes for anchor equating queries and IQS gate queries
CREATE INDEX IF NOT EXISTS "Item_isAnchor_skill_cefrLevel_idx" ON "Item"("isAnchor", "skill", "cefrLevel");
CREATE INDEX IF NOT EXISTS "Item_iqScore_idx" ON "Item"("iqScore");
