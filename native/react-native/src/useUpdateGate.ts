import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Backend } from './api';
import { updateRequired } from './appUpdate';
import { nativePlatform } from './proctoring/platform';
import { backendForBuild } from './runtimeConfig';

/** Asks the server for the minimum supported build at launch and whenever the app returns. */
export function useUpdateGate(address: string) {
  const [required, setRequired] = useState(false);
  const [checking, setChecking] = useState(false);
  const check = useCallback(async () => {
    setChecking(true);
    try {
      setRequired(updateRequired(await new Backend(backendForBuild(address)).appConfig(), nativePlatform()));
    } catch {
      // Fail open: an unreachable server must not block the exam; the last answer stands.
    } finally {
      setChecking(false);
    }
  }, [address]);
  useEffect(() => {
    void check();
    const sub = AppState.addEventListener('change', state => { if (state === 'active') void check(); });
    return () => sub.remove();
  }, [check]);
  return { required, checking, check };
}
