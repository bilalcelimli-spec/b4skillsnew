const fs = require('fs');
let code = `
/**
 * b4skills Proctoring & Fraud Detection Service
 * Tracks session telemetry and calculates candidate trust scores via REST.
 */

export enum ProctoringEventType {
  TAB_SWITCH = "TAB_SWITCH",
  WINDOW_BLUR = "WINDOW_BLUR",
  MULTIPLE_FACES = "MULTIPLE_FACES",
  NO_FACE = "NO_FACE",
  HIGH_NOISE = "HIGH_NOISE",
  COPY_PASTE = "COPY_PASTE",
  UNUSUAL_LATENCY = "UNUSUAL_LATENCY",
  FULLSCREEN_EXIT = "FULLSCREEN_EXIT",
  SCREENSHOT = "SCREENSHOT"
}

export interface ProctoringEvent {
  id: string;
  sessionId: string;
  type: ProctoringEventType;
  timestamp: any;
  metadata?: any;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export interface SessionTrustReport {
  sessionId: string;
  trustScore: number;
  events: ProctoringEvent[];
  status: "CLEAN" | "FLAGGED" | "FAILED";
  summary: string;
}

export const ProctoringService = {
  async logEvent(sessionId: string, event: Omit<ProctoringEvent, "id" | "timestamp">) {
    try {
      const res = await fetch('/api/proctoring/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...event, sessionId })
      });
      if (!res.ok) throw new Error('API error logEvent');
      const data = await res.json();
      return data;
    } catch (error) {
      console.warn("Failed to log proctoring event to API. Event swallowed:", error);
      return { id: "offline-" + Date.now(), ...event };
    }
  },

  async getTrustReport(sessionId: string): Promise<SessionTrustReport> {
    try {
      const res = await fetch(\`/api/proctoring/report?sessionId=\${sessionId}\`);
      if (!res.ok) throw new Error('API error getTrustReport');
      const report = await res.json();
      return report;
    } catch (error) {
      console.error("Failed to fetch trust report from API:", error);
      throw error;
    }
  }
};
`;

fs.writeFileSync('src/lib/proctoring/proctoring-service.ts', code.trim());
