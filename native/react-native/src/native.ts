import { NativeEventEmitter, NativeModules } from 'react-native';

type Recording = { base64: string; bytes: number; durationMs: number };

type B4NativeModule = {
  requestMicrophone(): Promise<boolean>;
  startRecording(maxSeconds: number): Promise<void>;
  stopRecording(): Promise<Recording>;
  cancelRecording(): void;
  recordingLevel(): Promise<{ level: number; seconds: number }>;
  play(url: string): Promise<void>;
  stopPlayback(): void;
  getPref(key: string): Promise<string | null>;
  setPref(key: string, value: string): void;
  removePref(key: string): void;
  clearCookies(): Promise<void>;
};

const module = NativeModules.B4Native as B4NativeModule | undefined;
if (!module) {
  throw new Error('B4Native native module is not linked. Run pod install for ios/ and macos/, or rebuild the Android app.');
}

export const B4Native = module;
export const nativeEvents = new NativeEventEmitter(NativeModules.B4Native);
export type { Recording };
