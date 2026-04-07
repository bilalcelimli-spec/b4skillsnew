import { prisma } from "../prisma";
import { UserRole } from "@prisma/client";

/**
 * Bulk Onboarding Service
 * Handles mass creation of candidate accounts and profiles.
 */

export interface OnboardingCandidate {
  email: string;
  name: string;
  organizationId: string;
  nativeLanguage?: string;
  metadata?: any;
}

export const BulkOnboardingService = {
  /**
   * Process a list of candidates for onboarding
   */
  async onboardingCandidates(candidates: OnboardingCandidate[]) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as { email: string; error: string }[]
    };

    for (const candidate of candidates) {
      try {
        // Check if user already exists
        const existing = await prisma.user.findUnique({
          where: { email: candidate.email }
        });

        if (existing) {
          results.failed++;
          results.errors.push({ email: candidate.email, error: "User already exists" });
          continue;
        }

        // Create User and Candidate Profile in a transaction
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: candidate.email,
              name: candidate.name,
              role: UserRole.CANDIDATE,
              organizationId: candidate.organizationId
            }
          });

          await tx.candidateProfile.create({
            data: {
              userId: user.id,
              nativeLanguage: candidate.nativeLanguage,
              metadata: candidate.metadata
            }
          });
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ email: candidate.email, error: (error as Error).message });
      }
    }

    return results;
  }
};
