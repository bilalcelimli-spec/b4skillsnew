ALTER TABLE "Session" ADD COLUMN "privacyErasedAt" TIMESTAMP(3);
ALTER TABLE "Response" ADD COLUMN "contentErasedAt" TIMESTAMP(3);
CREATE TABLE "ErasureObject" ("id" TEXT PRIMARY KEY, "generation" TEXT NOT NULL, "reference" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "deletedAt" TIMESTAMP(3), "attempts" INTEGER NOT NULL DEFAULT 0, "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "ErasureObject_deletedAt_nextAttemptAt_idx" ON "ErasureObject"("deletedAt","nextAttemptAt");
CREATE TABLE "ErasureLedger" ("id" TEXT PRIMARY KEY, "targetType" TEXT NOT NULL, "targetId" TEXT NOT NULL, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "ErasureLedger_targetType_targetId_key" ON "ErasureLedger"("targetType","targetId");
CREATE INDEX "ErasureLedger_createdAt_idx" ON "ErasureLedger"("createdAt");
CREATE TABLE "RetentionRun" ("id" TEXT PRIMARY KEY, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "summary" JSONB NOT NULL);
CREATE INDEX "RetentionRun_createdAt_idx" ON "RetentionRun"("createdAt");
