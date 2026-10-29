/** Platform names on the proctoring wire protocol (server: exam-policy.ts, native-evidence.ts).
 *  Kept free of react-native imports so the server type-check can share it. */
export type NativePlatform = 'ipad' | 'macos' | 'android';
export const NATIVE_PLATFORMS: readonly NativePlatform[] = ['ipad', 'macos', 'android'];
