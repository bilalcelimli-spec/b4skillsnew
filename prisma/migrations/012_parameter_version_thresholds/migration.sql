-- Faz 4: GRM thresholds on versioned parameters (writing / speaking tasks).
ALTER TABLE "ItemParameterVersion"
  ADD COLUMN IF NOT EXISTS "thresholds" DOUBLE PRECISION[] NOT NULL DEFAULT ARRAY[]::DOUBLE PRECISION[];
