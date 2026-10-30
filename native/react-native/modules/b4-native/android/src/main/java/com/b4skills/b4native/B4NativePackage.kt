package com.b4skills.b4native

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class B4NativePackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      if (name == B4NativeModule.NAME) B4NativeModule(reactContext) else null

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
      listOf(B4CameraPreviewManager())

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
        B4NativeModule.NAME to
            ReactModuleInfo(
                B4NativeModule.NAME,
                B4NativeModule::class.java.name,
                false, // canOverrideExistingModule
                false, // needsEagerInit
                false, // isCxxModule
                false, // isTurboModule: legacy bridge module, served through the interop layer
            ))
  }
}
