import { useSyncExternalStore } from 'react';
import { B4Native } from '../native';
import { commitLanguage, getLanguage, Language, languages, resolveLanguage } from './core';

type Snapshot = { language: Language; ready: boolean; pending: boolean; failed: boolean };
let snapshot: Snapshot = { language: getLanguage(), ready: false, pending: false, failed: false };
const listeners = new Set<() => void>();
let hydration: Promise<void> | null = null;
let revision = 0;
function publish(next: Snapshot) {
  snapshot = next; commitLanguage(next.language); listeners.forEach(listener => listener());
}
export function hydrateLanguage(): Promise<void> {
  if (hydration) return hydration;
  const generation = revision;
  hydration = (async () => {
    let preferred: Language = 'tr';
    try { preferred = resolveLanguage(Intl.DateTimeFormat().resolvedOptions().locale) ?? 'tr'; } catch { /* Keep Turkish fallback. */ }
    try { preferred = resolveLanguage(await B4Native.getPref('ui-language')) ?? preferred; } catch { /* Device language still works without preferences. */ }
    if (generation === revision) publish({ language: preferred, ready: true, pending: false, failed: false });
  })();
  return hydration;
}
export async function selectLanguage(language: Language): Promise<boolean> {
  if (snapshot.pending || !languages.includes(language)) return false;
  revision += 1;
  publish({ ...snapshot, pending: true, failed: false });
  try {
    if (B4Native.setPrefAsync) await B4Native.setPrefAsync('ui-language', language);
    else B4Native.setPref('ui-language', language);
    publish({ language, ready: true, pending: false, failed: false });
    return true;
  } catch {
    publish({ ...snapshot, ready: true, pending: false, failed: true });
    return false;
  }
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function useLanguage() {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  return { ...state, rtl: state.language === 'ar', selectLanguage };
}
