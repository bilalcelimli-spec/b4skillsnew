-- Add itemCode column: human-readable unique identifier for each item
-- Format: {SKILL_ABBREV}-{CEFR}-{SEQNUM}  e.g. VOC-B1-0042, GRM-A2-0007

ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "itemCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Item_itemCode_key" ON "Item"("itemCode");
