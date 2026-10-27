import release from '../release.json';
import { ApiError, normaliseBaseUrl } from './api';

export const PRODUCTION_BACKEND = release.apiOrigin;
export const DEVELOPMENT_BACKEND = 'http://localhost:3001';

/** Release never restores a developer's persisted loopback or staging origin. */
export function backendForBuild(saved?: string | null, development = __DEV__): string {
  return development ? normaliseBaseUrl(saved || DEVELOPMENT_BACKEND) : PRODUCTION_BACKEND;
}
export function editableBackend(value: string, development = __DEV__): string {
  const origin = normaliseBaseUrl(value);
  if (!development && origin !== PRODUCTION_BACKEND) throw new ApiError('Bu sürümün sunucu adresi değiştirilemez.');
  return origin;
}
