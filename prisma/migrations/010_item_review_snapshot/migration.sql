-- Bind new expert review actions to the inspected item; historical reviews stay unverified.
ALTER TABLE "ItemReview"
  ADD COLUMN IF NOT EXISTS "itemVersion" INTEGER,
  ADD COLUMN IF NOT EXISTS "contentHash" TEXT;
CREATE INDEX IF NOT EXISTS "ItemReview_itemId_itemVersion_idx" ON "ItemReview"("itemId", "itemVersion");
