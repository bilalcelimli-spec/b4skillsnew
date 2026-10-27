import SwiftUI
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
struct B4SkillsApp: App {
  @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

  var body: some Scene {
    Window("B4Skills", id: "main") {
      ReactNativeView(factory: appDelegate.reactNativeFactory)
    }
    .defaultSize(width: 1280, height: 820)
    .windowResizability(.contentMinSize)
  }
}

// MARK: - App Delegate

class AppDelegate: NSObject, NSApplicationDelegate {
  private let reactNativeDelegate: ReactNativeDelegate
  let reactNativeFactory: RCTReactNativeFactory

  override init() {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    super.init()
  }
}

// MARK: - React Native Delegate

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    if UserDefaults.standard.bool(forKey: "b4skills.useMetro") {
      return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    }
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

// MARK: - React Native SwiftUI View

struct ReactNativeView: NSViewRepresentable {
  let factory: RCTReactNativeFactory

  func makeNSView(context: Context) -> NSView {
    let view = factory.rootViewFactory.view(withModuleName: "B4Skills")
    // Welcome-screen background (#1E0820) while the JS bundle loads, instead of a white window.
    view.wantsLayer = true
    view.layer?.backgroundColor = NSColor(srgbRed: 0x1E / 255.0, green: 0x08 / 255.0, blue: 0x20 / 255.0, alpha: 1).cgColor
    return view
  }

  func updateNSView(_ nsView: NSView, context: Context) {}
}
