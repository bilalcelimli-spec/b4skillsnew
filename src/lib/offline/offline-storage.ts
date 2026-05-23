/**
 * b4skills Offline Assessment Storage
 *
 * Uses IndexedDB to persist assessments and responses when offline.
 * Syncs pending responses when connectivity is restored.
 */

export interface OfflineAssessment {
  id: string;
  sessionId: string;
  candidateId: string;
  items: Array<{
    id: string;
    content: Record<string, unknown>;
    skill: string;
    cefrLevel: string;
  }>;
  currentItemIndex: number;
  startedAt: string;
  expiresAt: string; // ISO
}

export interface OfflineResponse {
  id: string;
  sessionId: string;
  itemId: string;
  candidateId: string;
  response: string | Record<string, unknown>;
  isCorrect?: boolean;
  latencyMs: number;
  respondedAt: string;
  synced: boolean;
}

export interface SyncQueueEntry {
  id: string;
  type: "response" | "session_complete";
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}

// ---------------------------------------------------------------------------
// DB names & versions
// ---------------------------------------------------------------------------

const DB_NAME = "b4skills_offline";
const DB_VERSION = 1;

const STORES = {
  assessments: "assessments",
  responses: "responses",
  syncQueue: "syncQueue",
} as const;

// ---------------------------------------------------------------------------
// IndexedDB wrapper
// ---------------------------------------------------------------------------

class OfflineAssessmentStorage {
  private db: IDBDatabase | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORES.assessments)) {
          db.createObjectStore(STORES.assessments, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.responses)) {
          const store = db.createObjectStore(STORES.responses, { keyPath: "id" });
          store.createIndex("sessionId", "sessionId", { unique: false });
          store.createIndex("synced", "synced", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.syncQueue)) {
          db.createObjectStore(STORES.syncQueue, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async transaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req = action(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ---------------------------------------------------------------------------
  // Assessments
  // ---------------------------------------------------------------------------

  async saveAssessmentForOffline(assessment: OfflineAssessment): Promise<void> {
    await this.transaction(STORES.assessments, "readwrite", (store) =>
      store.put(assessment)
    );
    console.log(`[Offline] Assessment ${assessment.id} saved for offline use`);
  }

  async getOfflineAssessment(id: string): Promise<OfflineAssessment | undefined> {
    return this.transaction<OfflineAssessment>(STORES.assessments, "readonly", (store) =>
      store.get(id)
    );
  }

  async updateAssessmentProgress(id: string, currentItemIndex: number): Promise<void> {
    const assessment = await this.getOfflineAssessment(id);
    if (!assessment) return;
    await this.transaction(STORES.assessments, "readwrite", (store) =>
      store.put({ ...assessment, currentItemIndex })
    );
  }

  async deleteOfflineAssessment(id: string): Promise<void> {
    await this.transaction(STORES.assessments, "readwrite", (store) => store.delete(id));
  }

  // ---------------------------------------------------------------------------
  // Responses
  // ---------------------------------------------------------------------------

  async saveResponse(response: OfflineResponse): Promise<void> {
    await this.transaction(STORES.responses, "readwrite", (store) => store.put(response));
  }

  async getSessionResponses(sessionId: string): Promise<OfflineResponse[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.responses, "readonly");
      const store = tx.objectStore(STORES.responses);
      const index = store.index("sessionId");
      const req = index.getAll(sessionId);
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  async getPendingResponses(): Promise<OfflineResponse[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.responses, "readonly");
      const store = tx.objectStore(STORES.responses);
      const index = store.index("synced");
      const req = index.getAll(false);
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  async markResponseSynced(responseId: string): Promise<void> {
    const response = await this.transaction<OfflineResponse>(STORES.responses, "readonly", (store) =>
      store.get(responseId)
    );
    if (!response) return;
    await this.transaction(STORES.responses, "readwrite", (store) =>
      store.put({ ...response, synced: true })
    );
  }

  // ---------------------------------------------------------------------------
  // Sync queue
  // ---------------------------------------------------------------------------

  async queueForSync(entry: Omit<SyncQueueEntry, "id" | "attempts" | "createdAt">): Promise<void> {
    const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const queueEntry: SyncQueueEntry = {
      id,
      ...entry,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    await this.transaction(STORES.syncQueue, "readwrite", (store) => store.put(queueEntry));
  }

  async getSyncQueue(): Promise<SyncQueueEntry[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.syncQueue, "readonly");
      const store = tx.objectStore(STORES.syncQueue);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  async removeSyncEntry(id: string): Promise<void> {
    await this.transaction(STORES.syncQueue, "readwrite", (store) => store.delete(id));
  }

  // ---------------------------------------------------------------------------
  // Sync execution (called when online)
  // ---------------------------------------------------------------------------

  async syncPendingData(apiBaseUrl: string, accessToken: string): Promise<{
    synced: number;
    failed: number;
  }> {
    const queue = await this.getSyncQueue();
    const pending = await this.getPendingResponses();
    let synced = 0;
    let failed = 0;

    // Sync queued actions
    for (const entry of queue) {
      try {
        const response = await fetch(`${apiBaseUrl}/${entry.type.replace("_", "/")}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify(entry.payload),
        });
        if (response.ok) {
          await this.removeSyncEntry(entry.id);
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    // Sync pending responses
    for (const r of pending) {
      try {
        const res = await fetch(`${apiBaseUrl}/sessions/${r.sessionId}/respond`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            itemId: r.itemId,
            response: r.response,
            latencyMs: r.latencyMs,
            respondedAt: r.respondedAt,
          }),
        });
        if (res.ok) {
          await this.markResponseSynced(r.id);
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  }

  // ---------------------------------------------------------------------------
  // Storage stats
  // ---------------------------------------------------------------------------

  async getStorageStats(): Promise<{
    assessmentCount: number;
    pendingResponses: number;
    syncQueueCount: number;
  }> {
    const [pending, queue] = await Promise.all([
      this.getPendingResponses(),
      this.getSyncQueue(),
    ]);

    const db = await this.open();
    const assessmentCount = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORES.assessments, "readonly");
      const req = tx.objectStore(STORES.assessments).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return {
      assessmentCount,
      pendingResponses: pending.length,
      syncQueueCount: queue.length,
    };
  }
}

export const offlineStorage = new OfflineAssessmentStorage();
