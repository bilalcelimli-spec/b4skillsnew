import { prisma } from "../prisma";

/**
 * Anomaly Detection Service
 * Analyzes proctoring events to calculate a "Trust Score".
 */
export const AnomalyDetectionService = {
  /**
   * Calculate a trust score for a session based on proctoring events
   */
  async calculateTrustScore(sessionId: string) {
    const events = await prisma.proctoringEvent.findMany({
      where: { sessionId },
    });

    if (events.length === 0) return 100; // Perfect trust

    let penalty = 0;

    for (const event of events) {
      switch (event.type) {
        case "TAB_SWITCH":
          penalty += 10 * event.severity;
          break;
        case "FACE_LOST":
          penalty += 15 * event.severity;
          break;
        case "NOISE_DETECTED":
          penalty += 5 * event.severity;
          break;
        case "MULTIPLE_FACES":
          penalty += 30 * event.severity;
          break;
        case "UNAUTHORIZED_DEVICE":
          penalty += 50 * event.severity;
          break;
        default:
          penalty += 2 * event.severity;
      }
    }

    const score = Math.max(0, 100 - penalty);

    // Update session status if score is too low
    if (score < 40) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: "FLAGGED" },
      });
    }

    return score;
  },

  /**
   * Audit a session for anomalies
   */
  async auditSession(sessionId: string) {
    const trustScore = await this.calculateTrustScore(sessionId);
    
    // Log audit result (only when a real user context is available; SYSTEM actions are console-logged)
    console.log("[AnomalyDetection] auditSession", { sessionId, trustScore });

    return trustScore;
  },
};
