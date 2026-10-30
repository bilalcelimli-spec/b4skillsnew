import { Platform } from 'react-native';
import type { NativePlatform } from './platformNames';

export { NATIVE_PLATFORMS, type NativePlatform } from './platformNames';
export function nativePlatform(): NativePlatform {
  return Platform.OS === 'macos' ? 'macos' : Platform.OS === 'android' ? 'android' : 'ipad';
}
