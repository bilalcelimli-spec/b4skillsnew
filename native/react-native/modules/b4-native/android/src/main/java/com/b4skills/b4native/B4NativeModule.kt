package com.b4skills.b4native

import android.content.Context
import android.webkit.CookieManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import java.util.UUID

/**
 * Android counterpart of modules/b4-native/apple/B4Native.m. Same JS interface (src/native.ts).
 *
 * Phase 0: preferences, request ids and cookies work. Audio, camera and secure storage
 * reject with E_ANDROID_PENDING until phases 1–2 (see ANDROID_ROADMAP.md).
 */
class B4NativeModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  companion object {
    const val NAME = "B4Native"
    private const val PREFS = "b4skills.prefs"
    private const val PENDING = "E_ANDROID_PENDING"
  }

  override fun getName() = NAME

  private val prefs by lazy { reactApplicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE) }

  private fun pending(promise: Promise, feature: String) =
      promise.reject(PENDING, "$feature is not available on Android yet.")

  // Preferences (UserDefaults on Apple).

  @ReactMethod
  fun getPref(key: String, promise: Promise) = promise.resolve(prefs.getString(key, null))

  @ReactMethod
  fun setPref(key: String, value: String) = prefs.edit().putString(key, value).apply()

  @ReactMethod
  fun setPrefAsync(key: String, value: String, promise: Promise) {
    // commit() so the value is on disk before JS continues (launch receipts depend on it).
    if (prefs.edit().putString(key, value).commit()) promise.resolve(null)
    else promise.reject("E_PREF_WRITE", "Could not save preference.")
  }

  @ReactMethod
  fun removePref(key: String) = prefs.edit().remove(key).apply()

  @ReactMethod
  fun newRequestId(promise: Promise) = promise.resolve(UUID.randomUUID().toString())

  // Cookies: React Native's Android networking stores them in the WebView CookieManager.

  @ReactMethod
  fun clearCookies(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val cookies = CookieManager.getInstance()
      cookies.removeAllCookies { _ ->
        cookies.flush()
        promise.resolve(null)
      }
    }
  }

  // Secure storage and photo vault (phase 2: Android Keystore + AES-GCM).

  @ReactMethod fun secureRead(key: String, promise: Promise) = pending(promise, "Secure storage")

  @ReactMethod fun secureWrite(key: String, value: String, promise: Promise) = pending(promise, "Secure storage")

  @ReactMethod fun photoRead(scope: String, promise: Promise) = pending(promise, "Photo vault")

  @ReactMethod fun photoWrite(scope: String, value: String, promise: Promise) = pending(promise, "Photo vault")

  // Microphone and recording (phase 1: MediaRecorder, AAC in MPEG-4).

  @ReactMethod fun requestMicrophone(promise: Promise) = pending(promise, "Microphone")

  @ReactMethod fun startRecording(maxSeconds: Double, promise: Promise) = pending(promise, "Recording")

  @ReactMethod fun stopRecording(promise: Promise) = pending(promise, "Recording")

  @ReactMethod fun cancelRecording() = Unit

  @ReactMethod fun recordingLevel(promise: Promise) = pending(promise, "Recording")

  // Listening playback (phase 1: Media3 ExoPlayer).

  @ReactMethod fun play(url: String, promise: Promise) = pending(promise, "Playback")

  @ReactMethod fun stopPlayback() = Unit

  // Camera (phase 2: CameraX + ML Kit face detection).

  @ReactMethod fun startCamera(promise: Promise) = pending(promise, "Camera")

  @ReactMethod fun stopCamera() = Unit

  @ReactMethod fun captureCamera(promise: Promise) = pending(promise, "Camera")

  // Required by NativeEventEmitter on Android.

  @ReactMethod fun addListener(eventName: String) = Unit

  @ReactMethod fun removeListeners(count: Double) = Unit
}
