//  PushBridge.swift
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

import Foundation
import AltcraftRNCore
import AltcraftCore
import AltcraftPush
import React
import UserNotifications

/// Bridges RN push module calls to the native Altcraft push SDK.
///
/// Handles push subscription management, push token handling, provider
/// priority management, and push event reporting. The bridge guarantees that
/// every promise-based call is completed with either a success value or an
/// error, preventing JS-side await calls from hanging.
@objcMembers
public final class PushBridge: NSObject, @unchecked Sendable {

  /// Shared singleton instance used by the React Native bridge.
  public static let shared = PushBridge()

  /// Registers the push configuration contributor with the core registry.
  ///
  /// Called when the React Native push module is instantiated, before JS
  /// initializes the SDK.
  @objc public class func registerInitContributor() {
    AltcraftInitRegistry.shared.register(PushInitContributor())
  }

  private override init() { super.init() }

  // MARK: - Subscription

  /// Creates or updates the push subscription through the native SDK.
  ///
  /// - Parameter options: Subscription operation options.
  public func pushSubscribe(_ options: NSDictionary?) {
    let args = Converter.toAnyDict(options) ?? [:]
    AltcraftSDK.push.subscription.subscribe(
      sync: args["sync"] as? Bool ?? true,
      profileFields: Converter.jsonCompatible(args["profileFields"] as? [String: Any?]),
      customFields: Converter.jsonCompatible(args["customFields"] as? [String: Any?]),
      cats: (args["cats"] as? [Any])?.compactMap {
        ($0 as? [String: Any?]).map { Converter.categoryData(from: $0) }
      },
      replace: args["replace"] as? Bool,
      skipTriggers: args["skipTriggers"] as? Bool
    )
  }

  /// Suspends the current push subscription through the native SDK.
  ///
  /// - Parameter options: Subscription operation options.
  public func pushSuspend(_ options: NSDictionary?) {
    let args = Converter.toAnyDict(options) ?? [:]
    AltcraftSDK.push.subscription.suspend(
      sync: args["sync"] as? Bool ?? true,
      profileFields: Converter.jsonCompatible(args["profileFields"] as? [String: Any?]),
      customFields: Converter.jsonCompatible(args["customFields"] as? [String: Any?]),
      cats: (args["cats"] as? [Any])?.compactMap {
        ($0 as? [String: Any?]).map { Converter.categoryData(from: $0) }
      },
      replace: args["replace"] as? Bool,
      skipTriggers: args["skipTriggers"] as? Bool
    )
  }

  /// Unsubscribes the current push subscription through the native SDK.
  ///
  /// - Parameter options: Subscription operation options.
  public func pushUnSubscribe(_ options: NSDictionary?) {
    let args = Converter.toAnyDict(options) ?? [:]
    AltcraftSDK.push.subscription.unsubscribe(
      sync: args["sync"] as? Bool ?? true,
      profileFields: Converter.jsonCompatible(args["profileFields"] as? [String: Any?]),
      customFields: Converter.jsonCompatible(args["customFields"] as? [String: Any?]),
      cats: (args["cats"] as? [Any])?.compactMap {
        ($0 as? [String: Any?]).map { Converter.categoryData(from: $0) }
      },
      replace: args["replace"] as? Bool,
      skipTriggers: args["skipTriggers"] as? Bool
    )
  }

  // MARK: - Status

  /// Restores a suspended push subscription and returns the native response.
  ///
  /// - Parameters:
  ///   - resolver: Promise resolver returning a response map or `nil`.
  ///   - rejecter: Promise rejecter.
  public func unSuspendPushSubscription(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let resolveBox = UncheckedSendableBox(resolve)
    AltcraftSDK.push.subscription.unSuspend { (response: ResponseModel
      .ResponseWithHttpCode<ResponseModel.ResponseWithProfile>?) in
      DispatchQueue.main.async {
        resolveBox.get()(Converter.responseToDict(response) ?? NSNull())
      }
    }
  }

  /// Requests the status of the latest push subscription operation.
  ///
  /// - Parameters:
  ///   - resolver: Promise resolver returning a response map or `nil`.
  ///   - rejecter: Promise rejecter.
  public func getStatusOfLatestSubscription(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let resolveBox = UncheckedSendableBox(resolve)
    AltcraftSDK.push.subscription.latest { (response: ResponseModel
      .ResponseWithHttpCode<ResponseModel.ResponseWithProfile>?) in
      DispatchQueue.main.async {
        resolveBox.get()(Converter.responseToDict(response) ?? NSNull())
      }
    }
  }

  /// Requests the latest push subscription status for a specific provider.
  ///
  /// - Parameters:
  ///   - options: Options with the optional `provider` identifier.
  ///   - resolver: Promise resolver returning a response map or `nil`.
  ///   - rejecter: Promise rejecter.
  public func getStatusOfLatestSubscriptionForProvider(
    _ options: NSDictionary?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let args = Converter.toAnyDict(options) ?? [:]
    let provider = args["provider"] as? String
    let resolveBox = UncheckedSendableBox(resolve)
    AltcraftSDK.push.subscription.latestForProvider(
      provider: provider
    ) { (response: ResponseModel
      .ResponseWithHttpCode<ResponseModel.ResponseWithProfile>?) in
      DispatchQueue.main.async {
        resolveBox.get()(Converter.responseToDict(response) ?? NSNull())
      }
    }
  }

  /// Requests the current push subscription status.
  ///
  /// - Parameters:
  ///   - resolver: Promise resolver returning a response map or `nil`.
  ///   - rejecter: Promise rejecter.
  public func getStatusForCurrentSubscription(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let resolveBox = UncheckedSendableBox(resolve)
    AltcraftSDK.push.subscription.current { (response: ResponseModel
      .ResponseWithHttpCode<ResponseModel.ResponseWithProfile>?) in
      DispatchQueue.main.async {
        resolveBox.get()(Converter.responseToDict(response) ?? NSNull())
      }
    }
  }

  // MARK: - Token API

  /// Reads the currently stored native push token and returns it to JS.
  ///
  /// - Parameter resolver: Promise resolver returning a token map or `nil`.
  public func getPushToken(resolver resolve: @escaping RCTPromiseResolveBlock) {
    let resolveBox = UncheckedSendableBox(resolve)
    AltcraftSDK.push.token.getToken { tokenData in
      let dict: Any? = tokenData.map { ["provider": $0.provider, "token": $0.token] }
      DispatchQueue.main.async {
        resolveBox.get()(dict ?? NSNull())
      }
    }
  }

  /// Saves or clears a push token for a specific provider.
  ///
  /// - Parameter options: Options with `provider` and optional `token`.
  public func setPushToken(_ options: NSDictionary?) {
    let args = Converter.toAnyDict(options) ?? [:]
    guard let provider = args["provider"] as? String, !provider.isEmpty else { return }
    let token = args["token"] as? String
    AltcraftSDK.push.token.setToken(provider: provider, pushToken: token)
  }

  // MARK: - Token management

  /// Forces push token update through the native SDK.
  ///
  /// - Parameters:
  ///   - resolver: Promise resolver called after native update callback.
  ///   - rejecter: Promise rejecter.
  public func forcedTokenUpdate(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let resolveBox = UncheckedSendableBox(resolve)
    AltcraftSDK.push.token.forcedTokenUpdate {
      DispatchQueue.main.async { resolveBox.get()(nil) }
    }
  }

  /// Deletes a stored device token for a specific provider.
  ///
  /// - Parameters:
  ///   - provider: Provider identifier.
  ///   - resolver: Promise resolver called after native delete callback.
  ///   - rejecter: Promise rejecter.
  public func deleteDeviceToken(
    _ provider: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let resolveBox = UncheckedSendableBox(resolve)
    AltcraftSDK.push.token.deleteToken(provider: provider) {
      DispatchQueue.main.async { resolveBox.get()(nil) }
    }
  }

  /// Changes the native push provider priority list.
  ///
  /// - Parameters:
  ///   - priorityList: Ordered list of provider identifiers.
  ///   - resolver: Promise resolver called after the priority update.
  ///   - rejecter: Promise rejecter.
  public func changePushProviderPriorityList(
    _ priorityList: NSArray,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let list = ((priorityList as? [Any]) ?? []).compactMap { $0 as? String }
    AltcraftSDK.push.token.changeProviderPriority(list)
    resolve(nil)
  }

  // MARK: - Push receiver helpers

  /// Checks whether a push payload belongs to Altcraft.
  ///
  /// APNs payloads are not handled natively; always returns `false`.
  ///
  /// - Parameter message: Push payload map.
  /// - Returns: `false` on iOS.
  public func isAltcraftPush(_ message: NSDictionary?) -> Bool {
    return false
  }

  /// Schedules a local test push built from the supplied payload.
  ///
  /// - Parameter message: Push payload map.
  public func takePush(_ message: NSDictionary?) {
    guard let message else { return }

    var userInfo: [String: Any] = [:]
    for (key, value) in message {
      guard let key = key as? String else { continue }
      userInfo[key] = value is NSNull ? "" : value
    }

    let content = UNMutableNotificationContent()
    content.title = userInfo["_title"] as? String ?? ""
    content.body = userInfo["_body"] as? String ?? ""
    content.sound = .default
    content.categoryIdentifier = "Altcraft"
    content.userInfo = userInfo

    let request = UNNotificationRequest(
      identifier: UUID().uuidString,
      content: content,
      trigger: UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
    )

    AltcraftNSE.handleNotificationRequest(request: request) { modifiedContent in
      let finalRequest = UNNotificationRequest(
        identifier: request.identifier,
        content: modifiedContent,
        trigger: request.trigger
      )
      UNUserNotificationCenter.current().add(finalRequest) { error in
        if let error {
          NSLog("[altcraft-push] takePush failed: \(error.localizedDescription)")
        }
      }
    }
  }

  // MARK: - Permissions / events

  /// Requests notification authorization from the system.
  ///
  /// - Parameter resolve: Promise resolver receiving the granted flag.
  public func requestNotificationPermission(resolver resolve: @escaping RCTPromiseResolveBlock) {
    UNUserNotificationCenter.current().requestAuthorization(
      options: [.alert, .badge, .sound]
    ) { granted, _ in
      DispatchQueue.main.async {
        resolve(granted)
      }
    }
  }

  /// Sends push delivery event (no-op on iOS).
  ///
  /// - Parameter options: Push event report options.
  public func deliveryEvent(_ options: NSDictionary?) {
    // no-op on iOS
  }

  /// Sends push open event (no-op on iOS).
  ///
  /// - Parameter options: Push event report options.
  public func openEvent(_ options: NSDictionary?) {
    // no-op on iOS
  }
}
