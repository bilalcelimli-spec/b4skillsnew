import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * b4skills Proctoring & Fraud Detection Service
 * Tracks session telemetry and calculates candidate trust scores using Firestore.
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
  trustScore: number; // 0.0 to 1.0
  events: ProctoringEvent[];
  status: "CLEAN" | "FLAGGED" | "FAILED";
  summary: string;
}

export const ProctoringService = {
  /**
   * Log a proctoring event to Firestore
   */
  async logEvent(sessionId: string, event: Omit<ProctoringEvent, "id" | "timestamp">) {
    try {
      const payload: any = {
        ...event,
        sessionId,
        timestamp: serverTimestamp()
      };
      if (payload.metadata === undefined) {
        delete payload.metadata;
      }
      
      const docRef = await addDoc(collection(db, "proctoring_events"), payload);
      return { id: docRef.id, ...event };
    } catch (error) {
      console.warn("Failed to log proctoring event to Firestore (Permission Denied/Offline). Event swallowed:", error);
      return { id: "offline-" + Date.now(), ...event };
    }
  },

  /**
   * Generate a trust report for a session from Firestore events
   */
  async getTrustReport(sessionId: string): Promise<SessionTrustReport> {
    try {
      const q = query(collection(db, "proctoring_events"), where("sessionId", "==", sessionId));
      const querySnapshot = await getDocs(q);
      
      const events: ProctoringEvent[] = [];
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() } as ProctoringEvent);
      });
      
      // Calculate trust score based on event severity
      let penalty = 0;
      events.forEach(e => {
        if (e.severity === "HIGH") penalty += 0.3;
        if (e.severity === "MEDIUM") penalty += 0.1;
        if (e.severity === "LOW") penalty += 0.02;
      });

      const trustScore = Math.max(0, 1 - penalty);
      let status: SessionTrustReport["status"] = "CLEAN";
      let summary = "No significant proctoring issues detected.";

      if (trustScore < 0.5) {
        status = "FAILED";
        summary = "Critical proctoring violations detected. Session integrity compromised.";
      } else if (trustScore < 0.85) {
        status = "FLAGGED";
        summary = "Multiple minor violations detected. Manual review recommended.";
      }

      return {
        sessionId,
        trustScore,
        events,
        status,
        summary
      };
    } catch (error) {
      console.error("Failed to fetch trust report from Firestore:", error);
      throw error;
    }
  }
};
