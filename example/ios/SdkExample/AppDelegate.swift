import UIKit
import UserNotifications

import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

import FirebaseCore
import FirebaseMessaging

import Altcraft
import Sdk

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {

    AltcraftSDK.shared.setAppGroup(groupName: "group.altcraft.react.native.example")
    AltcraftSDK.shared.notificationManager.registerForPushNotifications(for: application)

    if FirebaseApp.app() == nil {
      FirebaseApp.configure()
    }

    UNUserNotificationCenter.current().delegate = self
    Messaging.messaging().delegate = self

    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
      if let error = error {
        print("[AppDelegate] requestAuthorization error:", error)
      }
      print("[AppDelegate] requestAuthorization granted:", granted)

      DispatchQueue.main.async {
        application.registerForRemoteNotifications()
      }
    }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(withModuleName: "SdkExample", in: window, launchOptions: launchOptions)
    
    //AltcraftSDK.shared.backgroundTasks.registerBackgroundTask()
    AltcraftSDK.shared.notificationManager.registerForPushNotifications(for: application)

    return true
  }

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    Messaging.messaging().apnsToken = deviceToken

    let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
    print("[AppDelegate] APNs token hex:", hex)

    SdkModule.shared.setAPNS(hex)
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("[AppDelegate] didFailToRegisterForRemoteNotifications:", error)
  }

  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    print("[AppDelegate] FCM registration token:", fcmToken ?? "nil")
    // если нужно:
    // SdkAppModule.shared.setFCM(fcmToken)
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.banner, .sound, .badge])
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? { self.bundleURL() }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
