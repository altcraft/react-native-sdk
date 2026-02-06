import UIKit
import UserNotifications

import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

import FirebaseCore
import FirebaseMessaging

import Altcraft
import Sdk

private let APP_GROUP_SUITE = "group.your.id"

private let jwtProvider = JWTProvider()
private let apnsProvider = APNSProvider()
private let fcmProvider = FCMProvider()

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  private let apnsProvider = APNSProvider()

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    if FirebaseApp.app() == nil {
      FirebaseApp.configure()
    }
    
    // MARK: - Alctarft setting
    
    let altcraftSDK = AltcraftSDK.shared
    altcraftSDK.setAppGroup(groupName: APP_GROUP_SUITE)
    altcraftSDK.backgroundTasks.registerBackgroundTask()
    altcraftSDK.setJWTProvider(provider: jwtProvider)
    altcraftSDK.pushTokenFunction.setAPNSTokenProvider(
      apnsProvider
    )
    altcraftSDK.pushTokenFunction.setFCMTokenProvider(
      fcmProvider
    )
    altcraftSDK.notificationManager.registerForPushNotifications(
      for: application
    )
    
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

