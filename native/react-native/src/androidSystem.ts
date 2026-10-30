import { useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, Platform } from 'react-native';

/**
 * Android back button/gesture. While `active`, `handler` runs first; return true when it
 * handled the press, false to let the next handler (or Android: leave the app) take it.
 * The most recently activated handler wins, so an open sheet beats the screen beneath it.
 * No-op on iPad and Mac, which have no system back.
 */
export function useAndroidBack(active: boolean, handler: () => boolean) {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (Platform.OS !== 'android' || !active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => latest.current());
    return () => sub.remove();
  }, [active]);
}

/**
 * Height of the on-screen keyboard on Android, 0 elsewhere. With edge-to-edge (forced from
 * Android 15) the window no longer shrinks for the keyboard, so screens pad their bottom by
 * this amount to keep the focused field visible. The value includes the navigation bar area.
 */
export function useAndroidKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const shown = Keyboard.addListener('keyboardDidShow', e => setHeight(e.endCoordinates.height));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => { shown.remove(); hidden.remove(); };
  }, []);
  return height;
}
