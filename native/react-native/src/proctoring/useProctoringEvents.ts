import { useCallback, useEffect, useMemo, useState } from 'react';
import { nativePlatform } from './platform';
import { AppState } from 'react-native';
import type { Backend } from '../api';
import { B4Native } from '../native';
import { EventQueue } from './eventQueue';
import type { ExamAdmission, NativeEvent } from './protocol';

// Reuse one serialized queue per account/origin across quick sign-out/sign-in or remount.
const queues = new Map<string, EventQueue>();
export function useProctoringEvents(backend: Backend | null, uid: string | undefined, sessionId: string, admission: ExamAdmission | null | undefined, active: boolean) {
  const [warning, setWarning] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const queue = useMemo(() => {
    if (!backend || !uid) return null;
    const key = `proctoring.${backend.baseUrl}.${uid}`;
    if (queues.has(key)) return queues.get(key)!;
    const created = new EventQueue({ read: () => B4Native.secureRead(key), write: value => B4Native.secureWrite(key, value) }, event => backend.sendEvent(event), () => B4Native.newRequestId());
    queues.set(key, created); return created;
  }, [backend, uid]);
  // A fresh lease per queue: callbacks from a previous account's queue stop updating state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lease = useMemo(() => ({ active: true }), [queue]);
  const checkStorage = useCallback(async () => {
    if (!queue) throw new Error('Önce giriş yapın.');
    await queue.checkStorage(); setStorageError(null);
  }, [queue]);

  useEffect(() => {
    setWarning(null); setStorageError(null);
    if (!queue) return;
    let disposed = false;
    lease.active = true;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = async () => {
      try { await queue.flush(() => !disposed); failures = 0; if (!disposed) setWarning(null); }
      catch { failures += 1; if (!disposed) setWarning('Teknik olayların teslimi doğrulanamadı. Bağlantı ve güvenli depolamayı kontrol edin; gönderim yeniden denenecek.'); }
      if (!disposed) timer = setTimeout(flush, Math.min(60000, 5000 * 2 ** Math.min(failures, 4)));
    };
    flush();
    return () => { disposed = true; lease.active = false; if (timer) clearTimeout(timer); };
  }, [queue, lease]);

  useEffect(() => {
    // Web parity (ProctoringMonitor): lifecycle events are recorded in every exam, not only
    // when a tenant policy requires them. Policy still decides whether a failure blocks answers.
    if (!queue || !sessionId || !active) return;
    let disposed = false;
    let previous = AppState.currentState;
    const append = async (eventType: NativeEvent['eventType'], reason: string) => {
      try {
        await queue.append({ sessionId, platform: nativePlatform(), eventType, severity: 'INFO', metadata: { reason } });
        if (!disposed) setStorageError(null);
      } catch (error) { if (!disposed) setStorageError(error instanceof Error ? error.message : String(error)); }
    };
    append('OTHER', 'native-monitoring-attached');
    const sub = AppState.addEventListener('change', state => {
      if (state === previous) return;
      previous = state;
      append(state === 'active' ? 'TAB_FOCUS' : 'TAB_BLUR', `native-lifecycle-${state}`);
    });
    return () => { disposed = true; sub.remove(); };
  }, [queue, sessionId, admission?.policy.revision, active]);

  const retry = useCallback(async () => {
    if (!queue) return;
    try {
      await queue.checkStorage();
      if (active && sessionId) {
        await queue.append({ sessionId, platform: nativePlatform(), eventType: 'OTHER', severity: 'INFO', metadata: { reason: 'native-monitoring-recovery-check' } });
      }
      setStorageError(null);
      await queue.flush(() => lease.active); setWarning(null);
    } catch (error) { setWarning(error instanceof Error ? error.message : String(error)); }
  }, [queue, active, sessionId, lease]);
  const recordFace = async (eventType: 'FACE_NOT_DETECTED' | 'MULTIPLE_FACES') => {
    if (!queue || !lease.active || !active || !sessionId) return;
    try { await queue.append({ sessionId, platform: nativePlatform(), eventType, severity: 'INFO', metadata: { reason: 'native-face-count-observation-only' } }); setStorageError(null); }
    catch (e) { setStorageError(e instanceof Error ? e.message : String(e)); }
  };
  return { checkStorage, warning, storageError, retry, recordFace };
}
