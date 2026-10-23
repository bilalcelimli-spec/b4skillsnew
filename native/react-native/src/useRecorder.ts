import { useCallback, useEffect, useRef, useState } from 'react';
import { B4Native, nativeEvents, Recording } from './native';

export const MAX_RECORDING_SECONDS = 180;

export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [clip, setClip] = useState<Recording | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const recordingRef = useRef(false);

  const stop = useCallback(async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    setLevel(0);
    try {
      setClip(await B4Native.stopRecording());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const start = useCallback(async () => {
    if (recordingRef.current || preparing) return;
    setPreparing(true);
    setError(null);
    setClip(null);
    setSeconds(0);
    try {
      await B4Native.startRecording(MAX_RECORDING_SECONDS);
      recordingRef.current = true;
      setRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPreparing(false);
    }
  }, [preparing]);

  const clear = useCallback(() => {
    recordingRef.current = false;
    B4Native.cancelRecording();
    setRecording(false);
    setClip(null);
    setLevel(0);
    setSeconds(0);
    setError(null);
  }, []);

  useEffect(() => {
    const finished = nativeEvents.addListener('B4RecordingFinished', (e: { successfully: boolean }) => {
      if (!recordingRef.current) return;
      if (e.successfully) {
        stop();
      } else {
        clear();
        setError('Ses kaydı kesildi. Yeniden kaydedin.');
      }
    });
    const interrupted = nativeEvents.addListener('B4Interrupted', (e: { wasRecording: boolean }) => {
      if (e.wasRecording) stop();
    });
    return () => { finished.remove(); interrupted.remove(); };
  }, [clear, stop]);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(async () => {
      try {
        const sample = await B4Native.recordingLevel();
        setLevel(previous => previous * 0.4 + sample.level * 0.6);
        setSeconds(sample.seconds);
      } catch {
        // Metering is cosmetic.
      }
    }, 120);
    return () => clearInterval(timer);
  }, [recording]);

  useEffect(() => () => B4Native.cancelRecording(), []);

  return { recording, preparing, clip, error, level, seconds, start, stop, clear };
}

export type RecorderState = ReturnType<typeof useRecorder>;

export function formatSeconds(total: number) {
  const s = Math.max(0, Math.floor(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
