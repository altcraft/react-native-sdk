//  TargetBridge.swift
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

import Foundation
import AltcraftRNCore
import AltcraftCore
import AltcraftTarget

/// Bridges RN target module calls to the native Altcraft target SDK.
///
/// Handles mobile event tracking.
@objcMembers
public final class TargetBridge: NSObject, @unchecked Sendable {

  /// Shared singleton instance used by the React Native bridge.
  public static let shared = TargetBridge()

  private override init() { super.init() }

  // MARK: - Target events

  /// Sends a target event through the native Altcraft SDK.
  ///
  /// - Parameter options: Target event options.
  public func sendTarget(_ options: NSDictionary?) {
    let args = Converter.toAnyDict(options) ?? [:]

    guard let sid = args["sid"] as? String,
          !sid.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
    guard let eventName = args["eventName"] as? String,
          !eventName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

    let utmMap = args["utm"] as? [String: Any?]
    let utm: UTM? = utmMap.map {
      UTM(
        campaign: $0["campaign"] as? String,
        content: $0["content"] as? String,
        keyword: $0["keyword"] as? String,
        medium: $0["medium"] as? String,
        source: $0["source"] as? String,
        temp: $0["temp"] as? String
      )
    }

    let subscription: (any Subscription)? = (args["subscription"] as? [String: Any?])
      .flatMap { toSubscription(dict: $0) }

    AltcraftSDK.target.sendTarget(
      sid: sid,
      eventName: eventName,
      sendMessageId: args["sendMessageId"] as? String,
      payload: Converter.jsonCompatible(args["payload"] as? [String: Any?]),
      matching: Converter.jsonCompatible(args["matching"] as? [String: Any?]),
      matchingType: args["matchingType"] as? String,
      profileFields: Converter.jsonCompatible(args["profileFields"] as? [String: Any?]),
      subscription: subscription,
      utm: utm
    )
  }

  // MARK: - Helpers

  /// Creates a native subscription model from an RN subscription dictionary.
  ///
  /// Supports email, SMS, push, and cc_data subscription payloads. Returns
  /// `nil` when the channel is unknown or required fields for the selected
  /// channel are missing.
  private func toSubscription(dict: [String: Any?]) -> (any Subscription)? {
    let channel = (dict["channel"] as? String) ?? (dict["type"] as? String) ?? ""
    guard !channel.isEmpty else { return nil }

    let rid = asInt(dict["resourceId"]) ?? asInt(dict["resource_id"]) ?? 0
    guard rid > 0 else { return nil }

    let st = dict["status"] as? String
    let pr = asInt(dict["priority"])
    let cf = Converter.toJV(
      (dict["customFields"] as? [String: Any?])
        ?? (dict["custom_fields"] as? [String: Any?])
    )
    let cats = dict["cats"] as? [String]

    switch channel {
    case "email":
      guard let email = dict["email"] as? String, !email.isEmpty else { return nil }
      return EmailSubscription(
        resourceId: rid,
        email: email,
        status: st,
        priority: pr,
        customFields: cf,
        cats: cats
      )

    case "sms":
      guard let phone = dict["phone"] as? String, !phone.isEmpty else { return nil }
      return SmsSubscription(
        resourceId: rid,
        phone: phone,
        status: st,
        priority: pr,
        customFields: cf,
        cats: cats
      )

    case "push":
      guard let provider = dict["provider"] as? String, !provider.isEmpty,
            let subscriptionId = (dict["subscriptionId"] as? String)
              ?? (dict["subscription_id"] as? String),
            !subscriptionId.isEmpty else { return nil }
      return PushSubscription(
        resourceId: rid,
        provider: provider,
        subscriptionId: subscriptionId,
        status: st,
        priority: pr,
        customFields: cf,
        cats: cats
      )

    case "cc_data":
      guard let ccChannel = (dict["ccChannel"] as? String)
        ?? (dict["cc_channel"] as? String),
            !ccChannel.isEmpty,
            let ccDataRaw = (dict["ccData"] as? [String: Any?])
              ?? (dict["cc_data"] as? [String: Any?]),
            let ccDataDict = Converter.toJV(ccDataRaw) else { return nil }
      return CcDataSubscription(
        resourceId: rid,
        channel: ccChannel,
        ccData: ccDataDict,
        status: st,
        priority: pr,
        customFields: cf,
        cats: cats
      )

    default:
      return nil
    }
  }

  /// Safely converts a dynamic value to Int.
  private func asInt(_ value: Any?) -> Int? {
    if let n = value as? Int { return n }
    if let n = value as? NSNumber { return n.intValue }
    if let s = value as? String { return Int(s.trimmingCharacters(in: .whitespaces)) }
    return nil
  }
}
