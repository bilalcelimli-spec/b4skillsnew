/**
 * OfflineAssessment — Offline-capable assessment wrapper
 * Uses IndexedDB (offlineStorage) for local persistence, detects connectivity,
 * auto-syncs on reconnect via Background Sync API (with polling fallback).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OfflineAssessmentSession {
  id: string;
  title: string;
  skill: string;
  cefrLevel: string;
  currentItemIndex: number;
  items: OfflineItem[];
  startedAt: string; // ISO
  expiresAt?: string;
}

export interface OfflineItem {
  id: string;
  type: string;
  content: Record<string, unknown>;
}

export interface OfflineResponse {
  sessionId: string;
  itemId: string;
  response: string;
  timeSpentMs: number;
  answeredAt: string;
}

interface OfflineAssessmentProps {
  sessionId?: string;
  onComplete?: (sessionId: string) => void;
  renderQuestion: (
    item: OfflineItem,
    index: number,
    total: number,
    onAnswer: (value: string) => void,
    selectedAnswer: string,
    isOnline: boolean,
  ) => React.ReactNode;
}

// ─── IndexedDB layer (inline for zero external deps in this component) ────────

const DB_NAME = "b4skills_offline";
const DB_VERSION = 1;
const STORE_ASSESSMENTS = "assessments";
const STORE_RESPONSES = "responses";
const STORE_SYNC_QUEUE = "syncQueue";

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ASSESSMENTS)) {
        db.createObjectStore(STORE_ASSESSMENTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_RESPONSES)) {
        const rs = db.createObjectStore(STORE_RESPONSES, { keyPath: "id", autoIncrement: true });
        rs.createIndex("sessionId", "sessionId", { unique: false });
        rs.createIndex("synced", "synced", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: "id" });
      }
    };
  });
}

function idbGet<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((res, rej) => {
    const r = store.get(key);
    r.onsuccess = () => res(r.result as T);
    r.onerror = () => rej(r.error);
  });
}

function idbPut(store: IDBObjectStore, value: unknown): Promise<IDBValidKey> {
  return new Promise((res, rej) => {
    const r = store.put(value);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function idbGetAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((res, rej) => {
    const r = store.getAll();
    r.onsuccess = () => res(r.result as T[]);
    r.onerror = () => rej(r.error);
  });
}

async function saveSession(session: OfflineAssessmentSession): Promise<void> {
  const db = await openOfflineDB();
  const tx = db.transaction(STORE_ASSESSMENTS, "readwrite");
  await idbPut(tx.objectStore(STORE_ASSESSMENTS), session);
  db.close();
}

async function loadSession(id: string): Promise<OfflineAssessmentSession | undefined> {
  const db = await openOfflineDB();
  const tx = db.transaction(STORE_ASSESSMENTS, "readonly");
  const result = await idbGet<OfflineAssessmentSession>(tx.objectStore(STORE_ASSESSMENTS), id);
  db.close();
  return result;
}

async function saveResponse(response: OfflineResponse & { synced: boolean }): Promise<void> {
  const db = await openOfflineDB();
  const tx = db.transaction(STORE_RESPONSES, "readwrite");
  await idbPut(tx.objectStore(STORE_RESPONSES), response);
  db.close();
}

async function getPendingResponses(sessionId: string): Promise<(OfflineResponse & { synced: boolean })[]> {
  const db = await openOfflineDB();
  const tx = db.transaction(STORE_RESPONSES, "readonly");
  const all = await idbGetAll<OfflineResponse & { synced: boolean }>(tx.objectStore(STORE_RESPONSES));
  db.close();
  return all.filter((r) => r.sessionId === sessionId && !r.synced);
}

async function flushToServer(sessionId: string, accessToken?: string): Promise<number> {
  const pending = await getPendingResponses(sessionId);
  if (pending.length === 0) return 0;

  let synced = 0;
  const db = await openOfflineDB();

  for (const resp of pending) {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          itemId: resp.itemId,
          response: resp.response,
          timeSpentMs: resp.timeSpentMs,
          answeredAt: resp.answeredAt,
        }),
      });
      if (res.ok) {
        const tx = db.transaction(STORE_RESPONSES, "readwrite");
        await idbPut(tx.objectStore(STORE_RESPONSES), { ...resp, synced: true });
        synced++;
      }
    } catch {
      // Will retry next time
    }
  }

  db.close();
  return synced;
}

// ─── Hook: online/offline detection ──────────────────────────────────────────

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online",  up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  return isOnline;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const OfflineAssessment: React.FC<OfflineAssessmentProps> = ({
  sessionId,
  onComplete,
  renderQuestion,
}) => {
  const isOnline = useOnlineStatus();

  const [session, setSession] = useState<OfflineAssessmentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [itemStartTime, setItemStartTime] = useState(Date.now());

  const syncAttemptRef = useRef(false);

  // ── Load / hydrate session ─────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    (async () => {
      try {
        // Try to load from IndexedDB first
        let sess = await loadSession(sessionId);

        if (!sess) {
          // Fetch from server if online
          if (navigator.onLine) {
            const res = await fetch(`/api/sessions/${sessionId}`, { credentials: "include" });
            if (res.ok) {
              const data = await res.json();
              sess = {
                id: data.id ?? sessionId,
                title: data.title ?? "Assessment",
                skill: data.skill ?? "GENERAL",
                cefrLevel: data.cefrLevel ?? "B1",
                currentItemIndex: data.currentItemIndex ?? 0,
                items: data.items ?? [],
                startedAt: data.startedAt ?? new Date().toISOString(),
                expiresAt: data.expiresAt,
              };
              await saveSession(sess);
            }
          }
        }

        if (sess) {
          setSession(sess);
          setCurrentIndex(sess.currentItemIndex);
          // Restore already-saved answers
          const pending = await getPendingResponses(sess.id);
          const restored: Record<string, string> = {};
          for (const r of pending) restored[r.itemId] = r.response;
          setAnswers(restored);
          setPendingCount(pending.length);
        }
      } catch (err) {
        console.error("[OfflineAssessment] Failed to load session:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  // ── Auto-sync when coming back online ─────────────────────────────────────
  useEffect(() => {
    if (!isOnline || !session || syncAttemptRef.current) return;
    if (pendingCount === 0) return;

    syncAttemptRef.current = true;
    setSyncStatus("syncing");

    flushToServer(session.id)
      .then((n) => {
        setSyncStatus(n > 0 ? "synced" : "idle");
        setPendingCount((c) => Math.max(0, c - n));
      })
      .catch(() => setSyncStatus("error"))
      .finally(() => { syncAttemptRef.current = false; });

    // Register background sync if supported
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      navigator.serviceWorker.ready
        .then((reg) => (reg as any).sync?.register("sync-responses"))
        .catch(() => {});
    }
  }, [isOnline, session, pendingCount]);

  // ── Handle answer ──────────────────────────────────────────────────────────
  const handleAnswer = useCallback(
    async (value: string) => {
      if (!session) return;
      const item = session.items[currentIndex];
      if (!item) return;

      const timeSpentMs = Date.now() - itemStartTime;
      const response: OfflineResponse & { synced: boolean } = {
        sessionId: session.id,
        itemId: item.id,
        response: value,
        timeSpentMs,
        answeredAt: new Date().toISOString(),
        synced: false,
      };

      setAnswers((prev) => ({ ...prev, [item.id]: value }));
      await saveResponse(response);
      setPendingCount((c) => c + 1);

      // If online, try immediate sync
      if (navigator.onLine) {
        flushToServer(session.id).then((n) => {
          if (n > 0) setPendingCount((c) => Math.max(0, c - n));
        }).catch(() => {});
      }
    },
    [session, currentIndex, itemStartTime],
  );

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    if (!session) return;
    const nextIndex = currentIndex + 1;

    // Persist progress
    const updated: OfflineAssessmentSession = { ...session, currentItemIndex: nextIndex };
    await saveSession(updated);
    setSession(updated);

    if (nextIndex >= session.items.length) {
      // Try final sync before completing
      if (navigator.onLine) {
        setSyncStatus("syncing");
        await flushToServer(session.id).catch(() => {});
        setSyncStatus("synced");
      }
      onComplete?.(session.id);
      return;
    }

    setCurrentIndex(nextIndex);
    setItemStartTime(Date.now());
  }, [session, currentIndex, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setItemStartTime(Date.now());
    }
  }, [currentIndex]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div role="status" aria-live="polite" style={centeredStyle}>
        <Spinner />
        <p style={{ color: "#64748b", marginTop: "12px" }}>Loading assessment…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div role="alert" style={{ padding: "24px", textAlign: "center", color: "#dc2626" }}>
        {navigator.onLine
          ? "Assessment not found. Please check your session link."
          : "You are offline and no local copy of this assessment is available. Please reconnect to continue."}
      </div>
    );
  }

  const currentItem = session.items[currentIndex];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* ── Online/offline banner ── */}
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          background: isOnline ? "#f0fdf4" : "#fffbeb",
          border: `1px solid ${isOnline ? "#bbf7d0" : "#fde68a"}`,
          borderRadius: "8px",
          marginBottom: "16px",
          fontSize: "13px",
          color: isOnline ? "#166534" : "#92400e",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: isOnline ? "#22c55e" : "#f59e0b",
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        {isOnline ? (
          <span>
            Online{" "}
            {syncStatus === "syncing" && "— syncing answers…"}
            {syncStatus === "synced" && "— answers synced ✓"}
            {syncStatus === "error" && "— sync failed, will retry"}
          </span>
        ) : (
          <span>
            Offline mode — your answers are saved locally
            {pendingCount > 0 && ` (${pendingCount} answer${pendingCount > 1 ? "s" : ""} pending sync)`}
          </span>
        )}
      </div>

      {/* ── Question ── */}
      {currentItem && renderQuestion(
        currentItem,
        currentIndex,
        session.items.length,
        handleAnswer,
        answers[currentItem.id] ?? "",
        isOnline,
      )}

      {/* ── Navigation ── */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          aria-label="Previous question"
          style={{
            ...btnStyle,
            opacity: currentIndex === 0 ? 0.4 : 1,
            cursor: currentIndex === 0 ? "not-allowed" : "pointer",
          }}
        >
          ← Previous
        </button>
        <button
          onClick={handleNext}
          aria-label={currentIndex === session.items.length - 1 ? "Finish assessment" : "Next question"}
          style={{ ...btnStyle, background: "#3b82f6", color: "#fff", borderColor: "#3b82f6" }}
        >
          {currentIndex === session.items.length - 1 ? "Finish" : "Next →"}
        </button>
      </div>

      {/* ── Offline info ── */}
      {!isOnline && (
        <details style={{ marginTop: "20px", fontSize: "13px", color: "#64748b" }}>
          <summary style={{ cursor: "pointer" }}>About offline mode</summary>
          <div style={{ marginTop: "8px", lineHeight: "1.6" }}>
            <p>Your answers are saved automatically in your browser's local storage. When you reconnect to the internet, they will be uploaded automatically.</p>
            <p>Do not clear your browser data while offline, as this may result in loss of your answers.</p>
          </div>
        </details>
      )}
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const centeredStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "48px",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 600,
  border: "2px solid #e2e8f0",
  background: "#f8fafc",
  color: "#334155",
  cursor: "pointer",
};

const Spinner: React.FC = () => (
  <svg
    aria-hidden="true"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#3b82f6"
    strokeWidth="2.5"
    strokeLinecap="round"
    style={{ animation: "spin 0.8s linear infinite" }}
  >
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default OfflineAssessment;
