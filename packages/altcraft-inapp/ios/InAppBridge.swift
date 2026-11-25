//  InAppBridge.swift
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

import Foundation
import AltcraftRNCore
import AltcraftCore
import AltcraftInApp

/// Bridges RN In-App module calls to the native Altcraft In-App SDK.
///
/// Handles In-App subscription management, screen tracking, triggers,
/// and placement requests.
@objcMembers
public final class InAppBridge: NSObject, @unchecked Sendable {

  /// Shared singleton instance used by the React Native bridge.
  public static let shared = InAppBridge()

  /// Registers the In-App configuration contributor with the core registry.
  ///
  /// Called when the React Native In-App module is instantiated, before JS
  /// initializes the SDK.
  @objc public class func registerInitContributor() {
    AltcraftInitRegistry.shared.register(InAppInitContributor())
  }

  private override init() { super.init() }

  // MARK: - Subscription

  /// Subscribes to In-App notifications through the native SDK.
  ///
  /// - Parameter options: Subscription operation options.
  public func inAppSubscribe(_ options: NSDictionary?) {
    let args = Converter.toAnyDict(options) ?? [:]
    AltcraftSDK.inApp.subscription.subscribe(
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

  /// Unsubscribes from In-App notifications through the native SDK.
  ///
  /// - Parameter options: Subscription operation options.
  public func inAppUnsubscribe(_ options: NSDictionary?) {
    let args = Converter.toAnyDict(options) ?? [:]
    AltcraftSDK.inApp.subscription.unsubscribe(
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

  // MARK: - Screen / triggers / placements

  /// Sets the current screen for In-App placement matching.
  ///
  /// - Parameter screen: Screen identifier.
  public func setScreen(_ screen: String) {
    AltcraftSDK.inApp.setScreen(screen: screen)
  }

  /// Fires an In-App trigger by name.
  ///
  /// - Parameter name: In-App event used as a trigger.
  public func trigger(_ name: String) {
    AltcraftSDK.inApp.trigger(name: name)
  }

  /// Requests In-App placements.
  public func getPlacements() {
    AltcraftSDK.inApp.getPlacements()
  }

  // MARK: - Animation

  /// Sets or clears the animation applied when an In-App view is shown.
  ///
  /// - Parameter config: Animation configuration, or `nil` to disable it.
  public func setAnimation(_ config: NSDictionary?) {
    InAppAnimationBridge.shared.set(config: config)
  }

  // MARK: - JSON content

  /// Subscribes to In-App placements with JSON content.
  ///
  /// JSON-type campaigns are not displayed by the SDK; the raw campaign JSON
  /// is forwarded to JavaScript through the shared SDK event emitter.
  public func jsonContentSubscribe() {
    AltcraftSDK.inApp.jsonContent.subscribe { json in
      SDKEventEmitter.emit(
        withName: InAppBridge.jsonContentEvent,
        body: json
      )
    }
  }

  /// Removes the JSON content subscriber.
  public func jsonContentUnsubscribe() {
    AltcraftSDK.inApp.jsonContent.unsubscribe()
  }

  /// Native event name used to deliver JSON In-App content to JavaScript.
  private static let jsonContentEvent = "AltcraftInAppJsonContent"
}
