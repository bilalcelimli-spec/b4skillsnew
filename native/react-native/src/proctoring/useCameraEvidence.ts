import { useEffect, useRef, useState } from 'react';
import { nativePlatform } from './platform';
import { AppState } from 'react-native';
import { B4Native, nativeEvents, type CameraPhoto } from '../native';
import type { Backend } from '../api';
import { proctoringCoordinator } from './coordinator';
import { preparationDeadline } from './deadline';
import { FaceMonitor, type FaceObservation } from './faceMonitor';
import type { PhotoDelivery } from './usePhotoQueue';

export function useCameraEvidence(backend: Backend, sessionId: string, delivery: Pick<PhotoDelivery, 'enqueue'>, recordFace?: (event: FaceObservation) => Promise<void>) {
  const [faceCount, setFaceCount] = useState<number | null>(null);
  const lastFrameAt = useRef(0);
  const cameraRun = useRef<number | null>(null);
  const monitor = useRef(new FaceMonitor());
  const record = useRef(recordFace); record.current = recordFace;
  const [preview, setPreview] = useState(false);
  const [photo, setPhoto] = useState<(CameraPhoto & { evidenceId: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delivered, setDelivered] = useState(false);
  const mounted = useRef(true), generation = useRef(0), working = useRef(false);
  const showing = useRef(false), foreground = useRef(AppState.currentState || 'active');
  const release = useRef<(() => void) | null>(null), owner = useRef(Symbol('candidate-camera'));
  const stop = () => {
    generation.current += 1; cameraRun.current = null; monitor.current.reset();
    if (mounted.current) setFaceCount(null);
    B4Native.stopCamera(); release.current?.(); release.current = null;
    showing.current = false;
    if (mounted.current) setPreview(false);
  };
  useEffect(() => {
    mounted.current = true;
    const faces = nativeEvents.addListener('B4FaceCount', ({ count, monotonicMs, runId }: { count: number | null; monotonicMs: number; runId: number }) => {
      if (!showing.current || foreground.current !== 'active' || runId !== cameraRun.current) return;
      lastFrameAt.current = Date.now(); setFaceCount(count);
      const observation = monitor.current.sample(count, monotonicMs);
      if (observation) void record.current?.(observation);
    });
    const watchdog = setInterval(() => {
      if (showing.current && Date.now() - lastFrameAt.current > 3500) { monitor.current.reset(); setFaceCount(null); }
    }, 1000);
    const sub = AppState.addEventListener('change', state => {
      foreground.current = state;
      // Permission sheets make the app inactive before a camera exists. Preserve
      // that permission attempt; an actual background transition always cancels it.
      if (state === 'background' || (state !== 'active' && showing.current)) stop();
    });
    return () => { mounted.current = false; stop(); sub.remove(); faces.remove(); clearInterval(watchdog); };
  }, []);
  const run = async (work: () => Promise<void>) => {
    if (working.current) return;
    working.current = true; setBusy(true); setError(null);
    try { await work(); } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : String(e)); }
    finally { working.current = false; if (mounted.current) setBusy(false); }
  };
  const start = () => run(async () => {
    stop(); setPhoto(null); setDelivered(false);
    const current = generation.current;
    release.current = proctoringCoordinator.acquire('camera', owner.current, stop);
    try {
      const runId = await preparationDeadline(B4Native.startCamera(), 20000, 'Kamera kontrolü zaman aşımına uğradı. Yeniden deneyin.');
      if (!mounted.current || current !== generation.current) return;
      if (foreground.current !== 'active') { stop(); throw new Error('Kamera için uygulamaya geri dönüp yeniden deneyin.'); }
      lastFrameAt.current = Date.now(); cameraRun.current = runId;
      showing.current = true;
      setPreview(true);
    } catch (e) { stop(); throw e; }
  });
  const capture = () => run(async () => {
    const current = generation.current;
    let image: CameraPhoto;
    try { image = await preparationDeadline(B4Native.captureCamera(), 15000, 'Fotoğraf çekilemedi. Kamerayı yeniden açın.'); }
    catch (e) { stop(); throw e; }
    if (!mounted.current || current !== generation.current) return;
    // Keep one bounded image in memory. It never enters the technical event Keychain queue.
    const evidenceId = await B4Native.newRequestId();
    if (!mounted.current || current !== generation.current) return;
    setPhoto({ ...image, evidenceId }); stop();
  });
  const send = () => run(async () => {
    if (!photo) return;
    await delivery.enqueue({ ...photo, sessionId, platform: nativePlatform() });
    if (mounted.current) { setPhoto(null); setDelivered(true); }
  });
  return { faceCount, preview, photo, busy, error, delivered, start, capture, send, stop };
}
