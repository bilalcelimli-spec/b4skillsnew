-- Migration: 006_social_sso_lms_validity
-- Adds Social SSO fields to User, Score Reporting API key digest to Organization,
-- and 2-year validity policy field + index to Session.

-- Social SSO columns on User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "oauthProvider"   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "oauthProviderId" TEXT DEFAULT NULL;

-- Score Reporting API key digest on Organization
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "apiKeyDigest" TEXT DEFAULT NULL;

-- 2-year validity on Session
ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP(3) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS "Session_validUntil_idx" ON "Session"("validUntil");
