import { z } from 'zod';
import { NATIVE_PLATFORMS, type NativeAppConfig } from '../../../shared/contracts/native-protocol.js';

/**
 * Minimum supported native app builds, from NATIVE_MIN_BUILD (JSON), for example
 *   NATIVE_MIN_BUILD={"ipad":8,"macos":8,"android":1}
 * Missing platforms are 0 (no minimum). A malformed value is ignored rather than locking every
 * candidate out of the app: it is logged and treated as "no minimum".
 */
const Raw = z.object({
  ipad: z.number().int().nonnegative(), macos: z.number().int().nonnegative(), android: z.number().int().nonnegative(),
}).partial().strict();

export function nativeAppConfig(raw: string | undefined = process.env.NATIVE_MIN_BUILD): NativeAppConfig {
  const minimumBuild = { ipad: 0, macos: 0, android: 0 };
  if (raw?.trim()) {
    let parsed: ReturnType<typeof Raw.safeParse> | null = null;
    try { parsed = Raw.safeParse(JSON.parse(raw)); } catch { parsed = null; }
    if (parsed?.success) {
      for (const platform of NATIVE_PLATFORMS) minimumBuild[platform] = parsed.data[platform] ?? 0;
    } else {
      console.warn('[native-app-config] NATIVE_MIN_BUILD is not valid JSON of build numbers; no minimum enforced.');
    }
  }
  return { version: 1, minimumBuild };
}
