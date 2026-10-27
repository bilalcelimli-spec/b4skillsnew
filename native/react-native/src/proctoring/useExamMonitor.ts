// Always-on exam monitoring, the native counterpart of the web ProctoringMonitor: the camera starts
// with the exam, faces are counted on the device, and a baseline photo is taken automatically once
// a single face is steady. Frames never leave the device; only the baseline JPEG is uploaded
// (server quota: 3 per session, single face only). Observations are evidence, not verdicts.
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { Backend } from '../api';
import { B4Native, nativeEvents } from '../native';
import { proctoringCoordinator } from './coordinator';
import { preparationDeadline } from './deadline';
import { FaceMonitor, type FaceObservation } from './faceMonitor';
import { nativePlatform } from './platform';
import type { PhotoDelivery } from './usePhotoQueue';

export type MonitorStatus = 'checking' | 'starting' | 'active' | 'paused' | 'off' | 'unavailable';

const STEADY_FACE_MS = 2000;
const MAX_BASELINE_ATTEMPTS = 3;
const WARNING_MS = 6000;

export function useExamMonitor(
  backend: Backend | null,
  sessionId: string,
  delivery: Pick<PhotoDelivery, 'enqueue'>,
  recordFace: (event: FaceObservation) => Promise<void>,
  active: boolean,
) {
  const [status, setStatus] = useState<MonitorStatus>('checking');
  const [faceCount, setFaceCount] = useState<number | null>(null);
  const [warning, setWarning] = useState<FaceObservation | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [baselineSent, setBaselineSent] = useState(false);

  const enabled = useRef(false);
  const runId = useRef<number | null>(null);
  const generation = useRef(0);
  const lastFrameAt = useRef(0);
  const steadySince = useRef<number | null>(null);
  const baselineState = useRef<'idle' | 'capturing' | 'done'>('idle');
  const attempts = useRef(0);
  const monitor = useRef(new FaceMonitor());
  const release = useRef<(() => void) | null>(null);
  const owner = useRef(Symbol('exam-monitor'));
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const live = useRef({ backend, sessionId, delivery, recordFace });
  live.current = { backend, sessionId, delivery, recordFace };
  const baselineKey = `monitor.baseline.${sessionId}`;

  const stopCamera = () => {
    generation.current += 1;
    runId.current = null;
    monitor.current.reset();
    steadySince.current = null;
    try { B4Native.stopCamera(); } catch { /* Nothing running. */ }
    release.current?.();
    release.current = null;
    setFaceCount(null);
  };

  const startCamera = async () => {
    if (!enabled.current || AppState.currentState !== 'active') return;
    stopCamera();
    const current = generation.current;
    setStatus('starting');
    try {
      release.current = proctoringCoordinator.acquire('camera', owner.current, stopCamera);
      const id = await preparationDeadline(B4Native.startCamera(), 20000, 'Kamera açılamadı.');
      if (current !== generation.current) { B4Native.stopCamera(); return; }
      runId.current = id;
      lastFrameAt.current = Date.now();
      setDetail(null);
      setStatus('active');
    } catch (e) {
      release.current?.(); release.current = null;
      if (current !== generation.current) return;
      setDetail(e instanceof Error ? e.message : String(e));
      setStatus('unavailable');
    }
  };

  const captureBaseline = async () => {
    if (baselineState.current !== 'idle' || attempts.current >= MAX_BASELINE_ATTEMPTS) return;
    baselineState.current = 'capturing';
    attempts.current += 1;
    const current = generation.current;
    try {
      const photo = await preparationDeadline(B4Native.captureCamera(), 15000, 'Fotoğraf çekilemedi.');
      if (current !== generation.current) { baselineState.current = 'idle'; return; }
      if (photo.faceCount !== 1) { baselineState.current = 'idle'; steadySince.current = null; return; }
      const evidenceId = await B4Native.newRequestId();
      const { sessionId: session, delivery: queue } = live.current;
      await queue.enqueue({ ...photo, evidenceId, sessionId: session, platform: nativePlatform() });
      await B4Native.setPrefAsync(baselineKey, '1');
      baselineState.current = 'done';
      setBaselineSent(true);
    } catch {
      // Quota, rejection or a transient camera error: retry on the next steady face, bounded.
      baselineState.current = 'idle';
      steadySince.current = null;
    }
  };

  // Is the camera allowed for this session (tenant policy, on by default)?
  useEffect(() => {
    let current = true;
    enabled.current = false;
    if (!active || !backend || !sessionId) { setStatus('checking'); return; }
    (async () => {
      baselineState.current = (await B4Native.getPref(baselineKey).catch(() => null)) === '1' ? 'done' : 'idle';
      if (current) setBaselineSent(baselineState.current === 'done');
      attempts.current = 0;
      try {
        const policy = await backend.cameraPolicy(sessionId);
        if (!current) return;
        if (!policy.enabled) { setStatus('off'); return; }
        enabled.current = true;
        await startCamera();
      } catch (e) {
        if (!current) return;
        setDetail(e instanceof Error ? e.message : String(e));
        setStatus('unavailable');
      }
    })();
    return () => { current = false; enabled.current = false; stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, backend, sessionId]);

  // Face counts from the native camera; foreground/background handling; frame watchdog.
  useEffect(() => {
    const faces = nativeEvents.addListener('B4FaceCount', ({ count, monotonicMs, runId: id }: { count: number | null; monotonicMs: number; runId: number }) => {
      if (id !== runId.current || AppState.currentState !== 'active') return;
      lastFrameAt.current = Date.now();
      setFaceCount(count);
      const observation = monitor.current.sample(count, monotonicMs);
      if (observation) {
        void live.current.recordFace(observation);
        setWarning(observation);
        if (warningTimer.current) clearTimeout(warningTimer.current);
        warningTimer.current = setTimeout(() => setWarning(null), WARNING_MS);
      }
      if (count === 1) {
        steadySince.current ??= Date.now();
        if (Date.now() - steadySince.current >= STEADY_FACE_MS) void captureBaseline();
      } else {
        steadySince.current = null;
      }
    });
    const app = AppState.addEventListener('change', state => {
      if (state === 'active') { if (enabled.current) void startCamera(); }
      else if (enabled.current) { stopCamera(); setStatus('paused'); }
    });
    const watchdog = setInterval(() => {
      if (runId.current !== null && Date.now() - lastFrameAt.current > 3500) { monitor.current.reset(); setFaceCount(null); }
    }, 1000);
    return () => {
      faces.remove(); app.remove(); clearInterval(watchdog);
      if (warningTimer.current) clearTimeout(warningTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, faceCount, warning, detail, baselineSent, retry: startCamera };
}

export type ExamMonitorState = ReturnType<typeof useExamMonitor>;
