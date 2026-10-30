-- Faz 2: versioned item parameters. Item.difficulty/discrimination/guessing become a
-- cache of the PUBLISHED version; calibration jobs write DRAFT rows only.
DO $$ BEGIN
  CREATE TYPE "ParameterVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ItemParameterVersion" (
  "id"            TEXT NOT NULL,
  "itemId"        TEXT NOT NULL,
  "version"       INTEGER NOT NULL,
  "status"        "ParameterVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "a"             DOUBLE PRECISION NOT NULL,
  "b"             DOUBLE PRECISION NOT NULL,
  "c"             DOUBLE PRECISION NOT NULL,
  "aSe"           DOUBLE PRECISION,
  "bSe"           DOUBLE PRECISION,
  "cSe"           DOUBLE PRECISION,
  "n"             INTEGER NOT NULL,
  "method"        TEXT NOT NULL,
  "infit"         DOUBLE PRECISION,
  "outfit"        DOUBLE PRECISION,
  "pointBiserial" DOUBLE PRECISION,
  "deltaB"        DOUBLE PRECISION,
  "driftClass"    TEXT,
  "gateReasons"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sourceRunId"   TEXT,
  "supersedesId"  TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy"     TEXT,
  "publishedAt"   TIMESTAMP(3),
  "publishedBy"   TEXT,
  "notes"         TEXT,
  CONSTRAINT "ItemParameterVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ItemParameterVersion_supersedesId_key" ON "ItemParameterVersion"("supersedesId");
CREATE UNIQUE INDEX IF NOT EXISTS "ItemParameterVersion_itemId_version_key" ON "ItemParameterVersion"("itemId", "version");
CREATE INDEX IF NOT EXISTS "ItemParameterVersion_itemId_status_idx" ON "ItemParameterVersion"("itemId", "status");
CREATE INDEX IF NOT EXISTS "ItemParameterVersion_status_createdAt_idx" ON "ItemParameterVersion"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ItemParameterVersion_method_idx" ON "ItemParameterVersion"("method");

DO $$ BEGIN
  ALTER TABLE "ItemParameterVersion"
    ADD CONSTRAINT "ItemParameterVersion_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
