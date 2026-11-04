CREATE TABLE IF NOT EXISTS "AssessmentConsent" (
 "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
 "ageBand" TEXT NOT NULL, "guardianRequired" BOOLEAN NOT NULL DEFAULT false,
 "guardianEmail" TEXT, "requestHash" TEXT UNIQUE, "requestExpiresAt" TIMESTAMP(3), "requestedAt" TIMESTAMP(3),
 "guardianName" TEXT, "relationship" TEXT, "approvedAt" TIMESTAMP(3), "verifiedAt" TIMESTAMP(3),
 "verifiedBy" TEXT, "verificationReference" TEXT, "revokedAt" TIMESTAMP(3),
 "manageHash" TEXT UNIQUE, "manageExpiresAt" TIMESTAMP(3), "policyVersion" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
