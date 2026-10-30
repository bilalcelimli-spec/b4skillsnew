import { NativeEventEmitter, NativeModules } from 'react-native';

type Recording = { base64: string; bytes: number; durationMs: number };
export type CameraPhoto = { base64: string; bytes: number; sha256: string; faceCount: number; capturedAt: string };

type B4NativeModule = {
  photoRead(scope: string): Promise<string | null>;
  photoWrite(scope: string, value: string): Promise<void>;
  secureRead(key: string): Promise<string | null>;
  secureWrite(key: string, value: string): Promise<void>;
  requestMicrophone(): Promise<boolean>;
  startCamera(): Promise<number>;
  stopCamera(): void;
  captureCamera(): Promise<CameraPhoto>;
  startRecording(maxSeconds: number): Promise<void>;
  stopRecording(): Promise<Recording>;
  cancelRecording(): void;
  recordingLevel(): Promise<{ level: number; seconds: number }>;
  play(url: string): Promise<void>;
  stopPlayback(): void;
  getPref(key: string): Promise<string | null>;
  setPref(key: string, value: string): void;
  setPrefAsync(key: string, value: string): Promise<void>;
  newRequestId(): Promise<string>;
  removePref(key: string): void;
  clearCookies(): Promise<void>;
  /** Exam on screen: Android FLAG_SECURE; iPad reports capture as B4ScreenCapture events. */
  setExamProtection(on: boolean): void;
};

const module = NativeModules.B4Native as B4NativeModule | undefined;
if (!module) {
  throw new Error('B4Native native module is not linked. Run pod install for ios/ and macos/, or rebuild the Android app.');
}

export const B4Native = module;
export const nativeEvents = new NativeEventEmitter(NativeModules.B4Native);
export type { Recording };
