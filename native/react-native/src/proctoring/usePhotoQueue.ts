import { useEffect, useMemo, useState } from 'react';
import type { Backend } from '../api';
import { B4Native } from '../native';
import { PhotoQueue, type QueuedPhoto } from './photoQueue';
const queues = new Map<string, PhotoQueue>();
export function usePhotoQueue(backend: Backend | null, uid?: string) {
  const [pending, setPending] = useState<Awaited<ReturnType<PhotoQueue['status']>>>([]);
  const [error, setError] = useState<string | null>(null);
  const queue = useMemo(() => {
    if (!backend || !uid) return null;
    const scope = `photo.${backend.baseUrl}.${uid}`;
    let q = queues.get(scope);
    if (!q) {
      q = new PhotoQueue({ read: () => B4Native.photoRead(scope), write: value => B4Native.photoWrite(scope, value) },
        (p, current) => backend.sendCameraPhoto(p.sessionId, p.evidenceId, p, p.platform, current));
      queues.set(scope, q);
    }
    return q;
  }, [backend, uid]);
  const lease = useMemo(() => ({ active: true }), [queue]);
  const refresh = async () => { if (queue && lease.active) { const state = await queue.status(); if (lease.active) setPending(state); } };
  useEffect(() => {
    let disposed = false, checked = false, failures = 0, timer: ReturnType<typeof setTimeout>;
    lease.active = true; setPending([]); setError(null);
    if (!queue) return;
    const flush = async () => {
      try { if (!checked) { await queue.checkStorage(); checked = true; } await refresh(); await queue.flush(() => !disposed); failures = 0; if (!disposed) setError(null); }
      catch (e) { failures++; if (!disposed) setError(e instanceof Error ? e.message : String(e)); }
      if (!disposed) {
        try { await refresh(); } catch { /* The delivery error is retained. */ }
        timer = setTimeout(flush, Math.min(60000, 5000 * 2 ** Math.min(failures, 4)));
      }
    };
    void flush();
    return () => { disposed = true; lease.active = false; clearTimeout(timer); };
  }, [queue, lease]);
  const enqueue = async (photo: QueuedPhoto) => {
    if (!queue || !lease.active) throw new Error('Fotoğraf için yeniden giriş yapın.');
    await queue.append(photo); await refresh();
    // Persistence is the approval boundary; network delivery is retried independently.
    void (async () => {
      try { await queue.flush(() => lease.active); if (lease.active) setError(null); await refresh(); }
      catch (e) { if (lease.active) setError(e instanceof Error ? e.message : String(e)); }
    })();
  };
  const retry = async () => {
    if (!queue) return;
    try { await queue.checkStorage(); await queue.flush(() => lease.active); if (lease.active) setError(null); await refresh(); }
    catch (e) { if (lease.active) setError(e instanceof Error ? e.message : String(e)); }
  };
  const discard = async (id: string) => {
    try { await queue?.discard(id); await refresh(); setError(null); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  return { enqueue, pending, error, retry, discard };
}
export type PhotoDelivery = ReturnType<typeof usePhotoQueue>;
