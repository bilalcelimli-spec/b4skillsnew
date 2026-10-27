package com.b4skills.b4native

import android.content.Context
import android.webkit.CookieManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import android.Manifest
import android.content.pm.PackageManager
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import java.util.UUID

/**
 * Android counterpart of modules/b4-native/apple/B4Native.m. Same JS interface (src/native.ts).
 *
 * Works: preferences, request ids, cookies, microphone/camera permission, camera preview with
 * on-device face counting and baseline photo, encrypted secure storage and photo vault.
 * Recording and listening playback still reject with E_ANDROID_PENDING (ANDROID_ROADMAP.md, phase 1).
 */
class B4NativeModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  companion object {
    const val NAME = "B4Native"
    private const val PREFS = "b4skills.prefs"
    private const val PENDING = "E_ANDROID_PENDING"
  }

  override fun getName() = NAME

  private val prefs by lazy { reactApplicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE) }

  private val camera by lazy { B4Camera.of(reactApplicationContext) }
  private val secure by lazy { B4Vault(reactApplicationContext, "b4skills-secure", "b4skills.secure.v1") }
  private val photos by lazy { B4Vault(reactApplicationContext, "b4skills-photos", "b4skills.photos.v1") }
  private var nextPermissionRequest = 4100

  /** Runtime permission through React Native's activity, like the Apple permission sheets. */
  private fun withPermission(permission: String, done: (Boolean) -> Unit) {
    if (ContextCompat.checkSelfPermission(reactApplicationContext, permission) == PackageManager.PERMISSION_GRANTED) { done(true); return }
    val activity = reactApplicationContext.currentActivity as? PermissionAwareActivity
    if (activity == null) { done(false); return }
    val code = nextPermissionRequest++
    UiThreadUtil.runOnUiThread {
      activity.requestPermissions(arrayOf(permission), code, PermissionListener { requestCode, _, results ->
        if (requestCode != code) return@PermissionListener false
        done(results.isNotEmpty() && results[0] == PackageManager.PERMISSION_GRANTED)
        true
      })
    }
  }

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

  @ReactMethod fun secureRead(key: String, promise: Promise) =
      vault(promise) { secure.read(key) }

  @ReactMethod fun secureWrite(key: String, value: String, promise: Promise) =
      vault(promise) { secure.write(key, value); null }

  @ReactMethod fun photoRead(scope: String, promise: Promise) =
      vault(promise) { require(scope.startsWith("photo.") && scope.length <= 2048) { "Geçersiz fotoğraf kapsamı." }; photos.read(scope) }

  @ReactMethod fun photoWrite(scope: String, value: String, promise: Promise) =
      vault(promise) {
        require(scope.startsWith("photo.") && scope.length <= 2048) { "Geçersiz fotoğraf kapsamı." }
        require(value.length <= 5_500_000) { "Fotoğraf kuyruğu sınırı aşıldı." }
        photos.write(scope, value); null
      }

  private fun vault(promise: Promise, work: () -> String?) {
    Thread {
      try { promise.resolve(work()) }
      catch (e: Exception) { promise.reject("E_SECURE_STORAGE", e.message ?: "Güvenli kayıt kullanılamıyor.", e) }
    }.start()
  }

  // Microphone and recording (phase 1: MediaRecorder, AAC in MPEG-4).

  @ReactMethod fun requestMicrophone(promise: Promise) =
      withPermission(Manifest.permission.RECORD_AUDIO) { granted -> promise.resolve(granted) }

  @ReactMethod fun startRecording(maxSeconds: Double, promise: Promise) = pending(promise, "Recording")

  @ReactMethod fun stopRecording(promise: Promise) = pending(promise, "Recording")

  @ReactMethod fun cancelRecording() = Unit

  @ReactMethod fun recordingLevel(promise: Promise) = pending(promise, "Recording")

  // Listening playback (phase 1: Media3 ExoPlayer).

  @ReactMethod fun play(url: String, promise: Promise) = pending(promise, "Playback")

  @ReactMethod fun stopPlayback() = Unit

  // Camera (phase 2: CameraX + ML Kit face detection).

  @ReactMethod fun startCamera(promise: Promise) =
      withPermission(Manifest.permission.CAMERA) { granted ->
        val owner = reactApplicationContext.currentActivity as? LifecycleOwner
        when {
          !granted -> promise.reject("camera_denied", "Kamera izni verilmedi. Ayarlar'dan B4Skills için kamerayı açın.")
          owner == null -> promise.reject("camera_start", "Kamera başlatılamadı.")
          else -> UiThreadUtil.runOnUiThread { camera.start(owner, promise) }
        }
      }

  @ReactMethod fun stopCamera() = camera.stop()

  @ReactMethod fun captureCamera(promise: Promise) = camera.capture(promise)

  // Required by NativeEventEmitter on Android.

  @ReactMethod fun addListener(eventName: String) = Unit

  @ReactMethod fun removeListeners(count: Double) = Unit
}
