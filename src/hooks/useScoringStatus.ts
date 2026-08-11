/**
 * useScoringStatus
 *
 * Subscribes to the /api/sessions/:sessionId/scoring-status SSE stream.
 * Returns live status for each async-scored response (Writing / Speaking).
 * Falls back gracefully when SSE is unsupported or the session has no async items.
 */
import { useEffect, useRef, useState } from "react";

export type ScoringItemStatus = {
  responseId: string;
  status: "pending" | "scored";
  cefrLevel?: string;
  score?: number;
};

export type ScoringSessionStatus =
  | { state: "connecting" }
  | { state: "streaming"; items: ScoringItemStatus[] }
  | { state: "complete" }
  | { state: "timeout"; message: string }
  | { state: "error" };

export function useScoringStatus(sessionId: string | null): ScoringSessionStatus {
  // Default to "complete" so buttons are enabled when there is no active session.
  // The effect transitions to "connecting" only when a real sessionId is provided.
  const [status, setStatus] = useState<ScoringSessionStatus>({ state: "complete" });
  const itemsRef = useRef<Map<string, ScoringItemStatus>>(new Map());
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus({ state: "complete" });
      itemsRef.current.clear();
      return;
    }
    if (typeof EventSource === "undefined") {
      setStatus({ state: "error" });
      return;
    }
    setStatus({ state: "connecting" });

    const es = new EventSource(`/api/sessions/${sessionId}/scoring-status`, {
      withCredentials: true,
    });
    esRef.current = es;

    es.addEventListener("status", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as ScoringItemStatus;
        itemsRef.current.set(data.responseId, { ...data });
        setStatus({ state: "streaming", items: [...itemsRef.current.values()] });
      } catch { /* ignore malformed events */ }
    });

    es.addEventListener("complete", () => {
      setStatus({ state: "complete" });
      es.close();
    });

    es.addEventListener("timeout", (e: MessageEvent) => {
      try {
        const { message } = JSON.parse(e.data);
        setStatus({ state: "timeout", message });
      } catch {
        setStatus({ state: "timeout", message: "Scoring timed out." });
      }
      es.close();
    });

    es.onerror = () => {
      setStatus({ state: "error" });
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [sessionId]);

  return status;
}
