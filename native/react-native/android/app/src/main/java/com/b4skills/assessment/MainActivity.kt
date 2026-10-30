package com.b4skills.assessment

import android.os.Bundle
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /** Name registered in index.js (app.json "name"). */
  override fun getMainComponentName(): String = "B4Skills"

  override fun onCreate(savedInstanceState: Bundle?) {
    // Must run before super.onCreate: swaps the splash theme for AppTheme.
    installSplashScreen()
    super.onCreate(savedInstanceState)
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
