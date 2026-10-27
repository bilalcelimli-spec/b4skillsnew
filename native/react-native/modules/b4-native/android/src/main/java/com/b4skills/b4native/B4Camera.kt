package com.b4skills.b4native

import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.SystemClock
import android.util.Base64
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import java.io.ByteArrayOutputStream
import java.security.MessageDigest
import java.time.Instant
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Android counterpart of the Apple camera bridge (B4Native.m): front camera preview, on-device
 * face counting about once a second (B4FaceCount, same payload as Apple), and a still photo with
 * the same encoding (longest side 1024 px, JPEG quality 75, no metadata). Frames never leave
 * the device; ML Kit's bundled face model runs locally.
 */
class B4Camera private constructor(private val context: ReactApplicationContext) {
  companion object {
    private val instances = java.util.WeakHashMap<ReactApplicationContext, B4Camera>()
    /** One camera per React context, shared by the module and every <B4CameraPreview>. */
    fun of(context: ReactApplicationContext): B4Camera = synchronized(instances) { instances.getOrPut(context) { B4Camera(context) } }
  }

  private val analysisExecutor = Executors.newSingleThreadExecutor()
  private val detector = FaceDetection.getClient(
      FaceDetectorOptions.Builder()
          .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
          .setMinFaceSize(0.12f)
          .build())

  private var provider: ProcessCameraProvider? = null
  private var preview: Preview? = null
  private var capture: ImageCapture? = null
  private var previewView: PreviewView? = null
  @Volatile private var generation = 0
  @Volatile private var running = false
  @Volatile private var lastSample = 0L

  /** Preview views can mount before or after the camera starts; attach whichever is current. */
  fun attach(view: PreviewView) {
    previewView = view
    preview?.setSurfaceProvider(view.surfaceProvider)
  }

  fun detach(view: PreviewView) {
    if (previewView === view) { previewView = null; preview?.setSurfaceProvider(null) }
  }

  fun start(owner: LifecycleOwner, promise: Promise) {
    val future = ProcessCameraProvider.getInstance(context)
    future.addListener({
      try {
        val cameraProvider = future.get()
        cameraProvider.unbindAll()
        val run = ++generation
        val selector = if (cameraProvider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA)) CameraSelector.DEFAULT_FRONT_CAMERA
            else CameraSelector.DEFAULT_BACK_CAMERA
        val newPreview = Preview.Builder().build().also { p -> previewView?.let { p.setSurfaceProvider(it.surfaceProvider) } }
        val newCapture = ImageCapture.Builder().setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY).build()
        val analysis = ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
        analysis.setAnalyzer(analysisExecutor) { image -> analyze(image, run) }
        cameraProvider.bindToLifecycle(owner, selector, newPreview, newCapture, analysis)
        provider = cameraProvider; preview = newPreview; capture = newCapture
        running = true; lastSample = 0L
        promise.resolve(run)
      } catch (e: Exception) {
        running = false
        promise.reject("camera_start", "Kamera başlatılamadı.", e)
      }
    }, ContextCompat.getMainExecutor(context))
  }

  fun stop() {
    generation++
    running = false
    ContextCompat.getMainExecutor(context).execute {
      provider?.unbindAll()
      preview?.setSurfaceProvider(null)
      preview = null; capture = null
    }
  }

  // About one detection per second, like Vision on Apple. Failures emit null, never zero faces.
  @androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
  private fun analyze(image: ImageProxy, run: Int) {
    val now = SystemClock.elapsedRealtime()
    val media = image.image
    if (!running || run != generation || now - lastSample < 1000 || media == null) { image.close(); return }
    lastSample = now
    detector.process(InputImage.fromMediaImage(media, image.imageInfo.rotationDegrees))
        .addOnSuccessListener { faces -> emitFaces(faces.size, now, run) }
        .addOnFailureListener { emitFaces(null, now, run) }
        .addOnCompleteListener { image.close() }
  }

  private fun emitFaces(count: Int?, monotonicMs: Long, run: Int) {
    if (!running || run != generation) return
    val body = Arguments.createMap().apply {
      if (count == null) putNull("count") else putInt("count", count)
      putDouble("monotonicMs", monotonicMs.toDouble())
      putInt("runId", run)
    }
    context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit("B4FaceCount", body)
  }

  fun capture(promise: Promise) {
    val still = capture
    if (!running || still == null) { promise.reject("camera_not_ready", "Kamera fotoğraf için hazır değil."); return }
    val run = generation
    still.takePicture(analysisExecutor, object : ImageCapture.OnImageCapturedCallback() {
      override fun onCaptureSuccess(image: ImageProxy) {
        try {
          if (run != generation) { promise.reject("camera_photo", "Kamera kapatıldı."); return }
          val upright = upright(image)
          val bounded = bound(upright, 1024)
          val jpeg = ByteArrayOutputStream().use { out -> bounded.compress(Bitmap.CompressFormat.JPEG, 75, out); out.toByteArray() }
          if (jpeg.isEmpty() || jpeg.size > 1_000_000) { promise.reject("camera_photo", "Fotoğraf veya yüz sayımı tamamlanamadı. Yeniden deneyin."); return }
          val sha = MessageDigest.getInstance("SHA-256").digest(jpeg).joinToString("") { "%02x".format(it) }
          val capturedAt = Instant.now().toString()
          detector.process(InputImage.fromBitmap(bounded, 0))
              .addOnSuccessListener { faces ->
                promise.resolve(Arguments.createMap().apply {
                  putString("base64", Base64.encodeToString(jpeg, Base64.NO_WRAP))
                  putInt("bytes", jpeg.size)
                  putString("sha256", sha)
                  putInt("faceCount", faces.size)
                  putString("capturedAt", capturedAt)
                })
              }
              .addOnFailureListener { e -> promise.reject("camera_photo", "Fotoğraf veya yüz sayımı tamamlanamadı. Yeniden deneyin.", e) }
        } catch (e: Exception) {
          promise.reject("camera_photo", "Fotoğraf veya yüz sayımı tamamlanamadı. Yeniden deneyin.", e)
        } finally {
          image.close()
        }
      }

      override fun onError(exception: ImageCaptureException) {
        promise.reject("camera_photo", "Bu kamera fotoğraf çekimini tamamlayamadı. Kamerayı yeniden açın.", exception)
      }
    })
  }

  private fun upright(image: ImageProxy): Bitmap {
    val bitmap = image.toBitmap()
    val degrees = image.imageInfo.rotationDegrees
    if (degrees == 0) return bitmap
    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, Matrix().apply { postRotate(degrees.toFloat()) }, true)
  }

  private fun bound(bitmap: Bitmap, maxSide: Int): Bitmap {
    val side = max(bitmap.width, bitmap.height)
    if (side <= maxSide) return bitmap
    val scale = maxSide.toFloat() / side
    return Bitmap.createScaledBitmap(bitmap, (bitmap.width * scale).roundToInt(), (bitmap.height * scale).roundToInt(), true)
  }
}
