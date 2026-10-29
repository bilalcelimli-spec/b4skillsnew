// Minimum supported build (server: GET /api/native/app-config, contract: NativeAppConfig in
// shared/contracts/native-protocol.ts). Fail open: an unreachable server or an unexpected answer
// never blocks an exam; only an explicit, higher minimum for this platform does.
import { Platform } from 'react-native';
import release from '../release.json';
import type { NativePlatform } from './proctoring/platformNames';

/** The build number the stores see: CFBundleVersion on Apple, versionCode on Android. */
export const APP_BUILD = Platform.OS === 'android' ? Number(release.androidVersionCode) : Number(release.buildNumber);

export function updateRequired(config: unknown, platform: NativePlatform, build: number = APP_BUILD): boolean {
  const minimum = (config as { version?: unknown; minimumBuild?: Record<string, unknown> } | null)?.minimumBuild?.[platform];
  if ((config as { version?: unknown } | null)?.version !== 1) return false;
  return typeof minimum === 'number' && Number.isInteger(minimum) && Number.isFinite(build) && build < minimum;
}
