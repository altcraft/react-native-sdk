import UIKit
import UserNotifications

import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

import AltcraftCore
import AltcraftInApp
import AltcraftPush

private let APP_GROUP_SUITE = "group.altcraft.react.native.example"

private let jwtProvider = JWTProvider()
private let apnsProvider = APNSProvider()

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // MARK: - Altcraft setting

    AltcraftSDK.setAppGroup(groupName: APP_GROUP_SUITE)
    AltcraftSDK.backgroundTasks.registerBackgroundTask()
    AltcraftSDK.auth.setJWTProvider(provider: jwtProvider)
    AltcraftSDK.push.token.setAPNSTokenProvider(apnsProvider)
    AltcraftSDK.push.notificationManager.registerForPushNotifications(
      for: application
    )
    // Registers lifecycle tracking used by In-App campaigns: fires the
    // default `open_app` trigger once the app becomes active.
    AltcraftSDK.inApp.registerLifecycleTracking()

    // MARK: -

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "SdkExample", in: window, launchOptions: launchOptions
    )
    return true
  }

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    setAPNsTokenInUserDefault(deviceToken)
    AltcraftSDK.push.token.getToken()
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .list, .sound, .badge])
    } else {
      completionHandler([.alert, .sound, .badge])
    }
  }
}

// MARK: - React Native delegate

final class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? { self.bundleURL() }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
