import { Platform } from 'react-native';

/** Platform names on the proctoring wire protocol (server: exam-policy.ts, native-evidence.ts). */
export type NativePlatform = 'ipad' | 'macos' | 'android';
export const NATIVE_PLATFORMS: readonly NativePlatform[] = ['ipad', 'macos', 'android'];
export function nativePlatform(): NativePlatform {
  return Platform.OS === 'macos' ? 'macos' : Platform.OS === 'android' ? 'android' : 'ipad';
}
