package com.b4skills.b4native

import androidx.camera.view.PreviewView
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

/** <B4CameraPreview> on Android: a CameraX PreviewView bound to the module's running camera. */
class B4CameraPreviewManager : SimpleViewManager<PreviewView>() {
  override fun getName() = "B4CameraPreview"

  override fun createViewInstance(context: ThemedReactContext): PreviewView =
      PreviewView(context).apply {
        // TextureView-backed, so React Native clipping and rounded corners apply to the preview.
        implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        scaleType = PreviewView.ScaleType.FILL_CENTER
        B4Camera.of(context.reactApplicationContext).attach(this)
      }

  override fun onDropViewInstance(view: PreviewView) {
    B4Camera.of((view.context as ThemedReactContext).reactApplicationContext).detach(view)
    super.onDropViewInstance(view)
  }
}
