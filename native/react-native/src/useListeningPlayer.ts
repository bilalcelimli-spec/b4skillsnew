import { proctoringCoordinator } from './proctoring/coordinator';
import { useCallback, useEffect, useRef, useState } from 'react';
import { B4Native, nativeEvents } from './native';

export const MAX_PLAYS = 2;

export function useListeningPlayer(url: string) {
  const [plays, setPlays] = useState(0);
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false);
  const charged = useRef(false);
  const generation = useRef(0);
  const used = useRef(0);
  const owner = useRef(Symbol("listening"));
  const release = useRef<(() => void) | null>(null);
  const releaseMedia = () => { release.current?.(); release.current = null; };

  const stop = useCallback(() => {
    releaseMedia();
    generation.current += 1;
    active.current = false;
    charged.current = false;
    B4Native.stopPlayback();
    setState('idle');
  }, []);

  useEffect(() => {
    const ended = nativeEvents.addListener('B4PlaybackEnded', () => {
      releaseMedia(); active.current = false; charged.current = false; setState('idle');
    });
    const failed = nativeEvents.addListener('B4PlaybackFailed', (event: { message: string }) => {
      if (!active.current) return;
      releaseMedia();
      generation.current += 1;
      active.current = false;
      if (charged.current) {
        used.current = Math.max(0, used.current - 1);
        setPlays(used.current);
        charged.current = false;
      }
      setState('idle'); setError(event.message);
    });
    const interrupted = nativeEvents.addListener('B4Interrupted', stop);
    return () => { ended.remove(); failed.remove(); interrupted.remove(); stop(); };
  }, [stop]);

  const play = useCallback(async () => {
    if (active.current || used.current >= MAX_PLAYS) return;
    active.current = true;
    const attempt = ++generation.current;
    setError(null); setState('loading');
    try {
      release.current = proctoringCoordinator.acquire('playback', owner.current, stop);
      await B4Native.play(url);
      if (attempt !== generation.current) return;
      charged.current = true;
      used.current += 1;
      setPlays(used.current); setState('playing');
    } catch (e) {
      if (attempt !== generation.current) return;
      releaseMedia();
      active.current = false;
      setState('idle'); setError(e instanceof Error ? e.message : String(e));
    }
  }, [url, stop]);

  return { plays, state, error, play, stop, left: MAX_PLAYS - plays };
}
