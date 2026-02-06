//
//  SdkModule.swift
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.


import Foundation
import Altcraft
import React

// MARK: - Constants

private enum RnConstants {

  // Module / events
  static let jsEventName: String = "AltcraftSdkEvent"

  // Promise reject codes
  static let errInitInvalidConfig: String = "ALTCRAFT_INIT_INVALID_CONFIG"
  static let errInitError: String = "ALTCRAFT_INIT_ERROR"

  // Promise reject messages
  static let msgApiUrlRequired: String = "apiUrl is required"
  static let msgInvalidConfiguration: String = "Invalid Altcraft configuration"
  static let msgInitializationFailed: String = "Altcraft initialization failed"

  // Config keys
  static let keyApiUrl: String = "apiUrl"
  static let keyRToken: String = "rToken"
  static let keyEnableLogging: String = "enableLogging"
  static let keyProviderPriorityList: String = "providerPriorityList"
  static let keyAppInfo: String = "appInfo"

  // TokenData keys
  static let keyProvider: String = "provider"
  static let keyToken: String = "token"

  // SDK event payload keys
  static let keyFunction: String = "function"
  static let keyCode: String = "code"
  static let keyMessage: String = "message"
  static let keyType: String = "type"
  static let keyValue: String = "value"

  // Event types for JS
  static let typeEvent: String = "event"
  static let typeError: String = "error"
  static let typeRetryError: String = "retryError"

  // ResponseWithHttp mapping keys (outgoing)
  static let keyHttpCode: String = "httpCode"
  static let keyResponse: String = "response"
  static let keyError: String = "error"
  static let keyErrorText: String = "errorText"
  static let keyProfile: String = "profile"
  static let keyId: String = "id"
  static let keyStatus: String = "status"
  static let keyIsTest: String = "isTest"
  static let keySubscription: String = "subscription"
  static let keySubscriptionId: String = "subscriptionId"
  static let keyHashId: String = "hashId"
  static let keyFields: String = "fields"
  static let keyCats: String = "cats"
}

// MARK: - Module

@objc(SdkModule)
@objcMembers
@available(iOSApplicationExtension, unavailable)
public final class SdkModule: NSObject {

  // MARK: - Singleton & State

  /// Shared singleton instance used by the React Native bridge.
  public static let shared = SdkModule()

  private let lock = NSLock()
  private var configuration: AltcraftConfiguration?

  // MARK: - SDK Initialization (RN Promise)

  /// Initializes the Altcraft SDK using a React Native configuration object.
  ///
  /// The configuration dictionary supports:
  /// - Required: `apiUrl` (String)
  /// - Optional: `rToken` (String), `enableLogging` (Bool), `providerPriorityList` ([String]),
  ///   `appInfo` (Map with `appID`, `appIID`, `appVer`)
  ///
  /// - Parameters:
  ///   - config: React Native configuration map (`NSDictionary`).
  ///   - resolve: Promise resolver called with `nil` on success.
  ///   - reject: Promise rejecter called with an error code and message on failure.
  @objc(initializeWithConfig:resolver:rejecter:)
  public func initialize(
    _ config: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let dict: [String: Any?] = Converter.toAnyDict(config) ?? [:]

    guard let apiUrl = dict[RnConstants.keyApiUrl] as? String, !apiUrl.isEmpty else {
      reject(RnConstants.errInitInvalidConfig, RnConstants.msgApiUrlRequired, nil)
      return
    }
    let providerPriorityList = dict[RnConstants.keyProviderPriorityList] as? [String]
    let appInfo = Converter.appInfo(from: dict[RnConstants.keyAppInfo] ?? nil)
    let enableLogging = dict[RnConstants.keyEnableLogging] as? Bool
    let rToken = dict[RnConstants.keyRToken] as? String
   
  
    guard let built = AltcraftConfiguration.Builder()
      .setApiUrl(apiUrl)
      .setRToken(rToken)
      .setAppInfo(appInfo)
      .setProviderPriorityList(providerPriorityList)
      .setEnableLogging(enableLogging)
      .build()
    else {
      reject(
        RnConstants.errInitInvalidConfig,
        RnConstants.msgInvalidConfiguration,
        nil
      )
      return
    }

    lock.lock()
    configuration = built
    lock.unlock()

    AltcraftSDK.shared.initialization(configuration: built) { ok in
      if ok { resolve(nil) }
      else {
        reject(
          RnConstants.errInitError,
          RnConstants.msgInitializationFailed, nil
        )
      }
    }
  }

  // MARK: - NativeEventEmitter compatibility

  /// Required by `NativeEventEmitter` on the JS side. No-op on iOS.
  ///
  /// - Parameter eventName: Event name from JS.
  public func addListener(_ eventName: String) { _ = eventName }

  /// Required by `NativeEventEmitter` on the JS side. No-op on iOS.
  ///
  /// - Parameter count: Number of listeners removed on JS side.
  public func removeListeners(_ count: NSNumber) { _ = count }

  // MARK: - RCTEventEmitter

  @objc(SDKEventEmitter)
  final class SDKEventEmitter: RCTEventEmitter {

    private static weak var _shared: SDKEventEmitter?
    private static var pending: [(String, Any?)] = []
    private static let pendingLock = NSLock()

    /// Creates the event emitter instance and flushes any buffered events.
    override init() {
      super.init()
      SDKEventEmitter._shared = self
      SDKEventEmitter.flushPendingIfPossible()
    }

    /// Returns the list of supported event names for React Native.
    override func supportedEvents() -> [String]! {
      [RnConstants.jsEventName]
    }

    /// Indicates that this module must be initialized on the main thread.
    @objc override static func requiresMainQueueSetup() -> Bool {
      true
    }

    /// Emits an Altcraft event with an integer code to JS.
    ///
    /// - Parameter code: Event code.
    @objc static func emitAltcraft(code: Int) {
      emit(name: RnConstants.jsEventName, body: [RnConstants.keyCode: code])
    }

    /// Emits an event to JS. If the emitter is not ready, the event is buffered.
    ///
    /// - Parameters:
    ///   - name: Event name.
    ///   - body: Event payload.
    @objc static func emit(name: String, body: Any?) {
      let deliver = {
        if let emitter = _shared {
          emitter.sendEvent(withName: name, body: body)
        } else {
          buffer(name: name, body: body)
        }
      }

      if Thread.isMainThread { deliver() }
      else { DispatchQueue.main.async { deliver() } }
    }

    /// Buffers an event until the emitter becomes available.
    private static func buffer(name: String, body: Any?) {
      pendingLock.lock()
      pending.append((name, body))
      pendingLock.unlock()
    }

    /// Flushes buffered events if the emitter is available, always on the main thread.
    private static func flushPendingIfPossible() {
      guard Thread.isMainThread else {
        DispatchQueue.main.async { flushPendingIfPossible() }
        return
      }
      guard let emitter = _shared else { return }

      pendingLock.lock()
      let toSend = pending
      pending.removeAll()
      pendingLock.unlock()

      for (name, body) in toSend {
        emitter.sendEvent(withName: name, body: body)
      }
    }
  }

  // MARK: - SDK Events subscription

  private var eventsSubscribed: Bool = false

  /// Subscribes to native SDK events and forwards them to JS via the event emitter.
  ///
  /// Multiple calls are safe; the subscription is activated only once.
  public func subscribeToEvents() {
    lock.lock()
    let already = eventsSubscribed
    if !already { eventsSubscribed = true }
    lock.unlock()
    if already { return }

    SDKEvents.shared.subscribe { [weak self] event in
      guard let self else { return }
      SDKEventEmitter.emit(
        name: RnConstants.jsEventName,
        body: toPayload(event)
      )
    }
  }

  /// Unsubscribes from native SDK events.
  public func unsubscribeFromEvent() {
    lock.lock()
    eventsSubscribed = false
    lock.unlock()
    SDKEvents.shared.unsubscribe()
  }

  // MARK: - Event payload mapping

  /// Maps a native SDK event to a JS-friendly payload dictionary.
  ///
  /// - Parameter event: Native event.
  /// - Returns: Dictionary containing `function`, `code`, `message`, `type`, and `value`.
  private func toPayload(_ event: Event) -> [String: Any] {
    let type: String
    if event is RetryEvent { type = RnConstants.typeRetryError }
    else if event is ErrorEvent { type = RnConstants.typeError }
    else { type = RnConstants.typeEvent }

    return [
      RnConstants.keyFunction: event.function,
      RnConstants.keyCode: event.eventCode as Any? ?? NSNull(),
      RnConstants.keyMessage: event.message ?? "",
      RnConstants.keyType: type,
      RnConstants.keyValue: Converter.toAny(event.value) ?? NSNull()
    ]
  }

  // MARK: - SDK Clear (RN Promise)

  /// Clears SDK local state and stored data.
  ///
  /// - Parameters:
  ///   - resolve: Promise resolver called with `nil` when cleanup finishes.
  ///   - reject: Promise rejecter (unused; kept for RN signature compatibility).
  @objc(clearWithResolver:rejecter:)
  public func clear(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    _ = reject
    AltcraftSDK.shared.clear { resolve(nil) }
  }

  // MARK: - Token API wrappers (ONLY getPushToken / setPushToken)

  /// Returns the current push token data from the native SDK.
  ///
  /// - Parameter completion: Called with `{ provider, token }` or `nil` if unavailable.
  @objc(getPushTokenWithCompletion:)
  public func getPushToken(_ completion: @escaping ([String: Any]?) -> Void) {
    AltcraftSDK.shared.pushTokenFunction.getPushToken { tokenData in
      guard let tokenData else { completion(nil); return }
      completion([
        RnConstants.keyProvider: tokenData.provider,
        RnConstants.keyToken: tokenData.token
      ])
    }
  }

  /// Sets (or clears) the push token for a given provider.
  ///
  /// - Parameters:
  ///   - provider: Provider identifier (e.g., `apns`, `fcm`).
  ///   - pushToken: Token value. `nil` / `NSNull` clears the token. Non-string values are stringified.
  @objc(setPushTokenWithProvider:pushToken:)
  public func setPushToken(provider: String, pushToken: Any?) {
    let tokenStr: String? = {
      if pushToken == nil || pushToken is NSNull { return nil }
      if let s = pushToken as? String { return s }
      return String(describing: pushToken!)
    }()

    AltcraftSDK.shared.pushTokenFunction.setPushToken(
      provider: provider,
      pushToken: (tokenStr ?? "")
    )
  }

  // MARK: - Push Subscription (void)

  /// Sends a push subscribe request (fire-and-forget).
  ///
  /// - Parameters:
  ///   - sync: Execution mode. Defaults to `true` when `nil`.
  ///   - profileFields: Optional profile fields map.
  ///   - customFields: Optional custom fields map.
  ///   - cats: Optional categories array.
  ///   - replace: Optional replace flag.
  ///   - skipTriggers: Optional flag to skip trigger execution on the server.
  @objc(pushSubscribe:profileFields:customFields:cats:replace:skipTriggers:)
  public func pushSubscribe(
    _ sync: NSNumber?,
    profileFields: NSDictionary?,
    customFields: NSDictionary?,
    cats: NSArray?,
    replace: NSNumber?,
    skipTriggers: NSNumber?
  ) {
    let s = sync?.boolValue ?? true
    let r: Bool? = (replace != nil) ? replace!.boolValue : nil
    let st: Bool? = (skipTriggers != nil) ? skipTriggers!.boolValue : nil

    AltcraftSDK.shared.pushSubscriptionFunctions.pushSubscribe(
      sync: s,
      profileFields: Converter.toAnyDict(profileFields),
      customFields: Converter.toAnyDict(customFields),
      cats: Converter.toCats(cats),
      replace: r,
      skipTriggers: st
    )
  }

  /// Sends a push suspend request (fire-and-forget).
  ///
  /// - Parameters:
  ///   - sync: Execution mode. Defaults to `true` when `nil`.
  ///   - profileFields: Optional profile fields map.
  ///   - customFields: Optional custom fields map.
  ///   - cats: Optional categories array.
  ///   - replace: Optional replace flag.
  ///   - skipTriggers: Optional flag to skip trigger execution on the server.
  @objc(pushSuspend:profileFields:customFields:cats:replace:skipTriggers:)
  public func pushSuspend(
    _ sync: NSNumber?,
    profileFields: NSDictionary?,
    customFields: NSDictionary?,
    cats: NSArray?,
    replace: NSNumber?,
    skipTriggers: NSNumber?
  ) {
    let s = sync?.boolValue ?? true
    let r: Bool? = (replace != nil) ? replace!.boolValue : nil
    let st: Bool? = (skipTriggers != nil) ? skipTriggers!.boolValue : nil

    AltcraftSDK.shared.pushSubscriptionFunctions.pushSuspend(
      sync: s,
      profileFields: Converter.toAnyDict(profileFields),
      customFields: Converter.toAnyDict(customFields),
      cats: Converter.toCats(cats),
      replace: r,
      skipTriggers: st
    )
  }

  /// Sends a push unsubscribe request (fire-and-forget).
  ///
  /// - Parameters:
  ///   - sync: Execution mode. Defaults to `true` when `nil`.
  ///   - profileFields: Optional profile fields map.
  ///   - customFields: Optional custom fields map.
  ///   - cats: Optional categories array.
  ///   - replace: Optional replace flag.
  ///   - skipTriggers: Optional flag to skip trigger execution on the server.
  @objc(pushUnSubscribe:profileFields:customFields:cats:replace:skipTriggers:)
  public func pushUnSubscribe(
    _ sync: NSNumber?,
    profileFields: NSDictionary?,
    customFields: NSDictionary?,
    cats: NSArray?,
    replace: NSNumber?,
    skipTriggers: NSNumber?
  ) {
    let s = sync?.boolValue ?? true
    let r: Bool? = (replace != nil) ? replace!.boolValue : nil
    let st: Bool? = (skipTriggers != nil) ? skipTriggers!.boolValue : nil

    AltcraftSDK.shared.pushSubscriptionFunctions.pushUnSubscribe(
      sync: s,
      profileFields: Converter.toAnyDict(profileFields),
      customFields: Converter.toAnyDict(customFields),
      cats: Converter.toCats(cats),
      replace: r,
      skipTriggers: st
    )
  }

  // MARK: - Mobile Events bridge

  /// Sends a mobile event to the server (fire-and-forget).
  ///
  /// - Parameters:
  ///   - sid: Pixel identifier.
  ///   - eventName: Event name.
  ///   - sendMessageId: Optional message identifier to link the event.
  ///   - payload: Optional event payload map.
  ///   - matching: Optional matching parameters map.
  ///   - matchingType: Optional matching type/mode.
  ///   - profileFields: Optional profile fields map.
  ///   - subscription: Optional subscription definition (email/sms/push/cc_data).
  ///   - utm: Optional UTM tags for attribution.
  @objc(mobileEvent:eventName:sendMessageId:payload:matching:matchingType:profileFields:subscription:utm:)
  public func mobileEvent(
    _ sid: String,
    eventName: String,
    sendMessageId: String?,
    payload: NSDictionary?,
    matching: NSDictionary?,
    matchingType: String?,
    profileFields: NSDictionary?,
    subscription: NSDictionary?,
    utm: NSDictionary?
  ) {
    let utmObj = Converter.toUTM(utm)
    let subscriptionObj = Converter.toSubscription(subscription)

    AltcraftSDK.shared.mobileEventFunctions.mobileEvent(
      sid: sid,
      altcraftClientID: "",
      eventName: eventName,
      sendMessageId: sendMessageId,
      payload: Converter.toAnyDict(payload),
      matching: Converter.toAnyDict(matching),
      matchingType: matchingType,
      profileFields: Converter.toAnyDict(profileFields),
      subscription: subscriptionObj,
      utm: utmObj
    )
  }

  // MARK: - Promise API: PushSubscription status/results

  private func nsNull(_ v: Any?) -> Any { v ?? NSNull() }

  /// Unsuspends push subscriptions based on native matching rules.
  ///
  /// - Parameters:
  ///   - resolve: Promise resolver called with a mapped `{ httpCode, response }` or `null`.
  ///   - reject: Promise rejecter (unused; kept for RN signature compatibility).
  @objc(unSuspendPushSubscriptionWithResolver:rejecter:)
  public func unSuspendPushSubscription(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    _ = reject
    AltcraftSDK.shared.pushSubscriptionFunctions.unSuspendPushSubscription { [weak self] result in
      guard let self else { resolve(NSNull()); return }
      guard let result else { resolve(NSNull()); return }
      resolve(mapResponseWithHttp(result))
    }
  }

  /// Returns the status of the latest subscription in profile.
  ///
  /// - Parameters:
  ///   - resolve: Promise resolver called with a mapped `{ httpCode, response }` or `null`.
  ///   - reject: Promise rejecter (unused; kept for RN signature compatibility).
  @objc(getStatusOfLatestSubscriptionWithResolver:rejecter:)
  public func getStatusOfLatestSubscription(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    _ = reject
    AltcraftSDK.shared.pushSubscriptionFunctions.getStatusOfLatestSubscription { [weak self] result in
      guard let self else { resolve(NSNull()); return }
      guard let result else { resolve(NSNull()); return }
      resolve(mapResponseWithHttp(result))
    }
  }

  /// Returns the status for current subscription (by current provider/token context).
  ///
  /// - Parameters:
  ///   - resolve: Promise resolver called with a mapped `{ httpCode, response }` or `null`.
  ///   - reject: Promise rejecter (unused; kept for RN signature compatibility).
  @objc(getStatusForCurrentSubscriptionWithResolver:rejecter:)
  public func getStatusForCurrentSubscription(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    _ = reject
    AltcraftSDK.shared.pushSubscriptionFunctions.getStatusForCurrentSubscription { [weak self] result in
      guard let self else { resolve(NSNull()); return }
      guard let result else { resolve(NSNull()); return }
      resolve(mapResponseWithHttp(result))
    }
  }

  /// Returns the status of the latest subscription for the given provider.
  ///
  /// - Parameters:
  ///   - provider: Optional provider identifier.
  ///   - resolve: Promise resolver called with a mapped `{ httpCode, response }` or `null`.
  ///   - reject: Promise rejecter (unused; kept for RN signature compatibility).
  @objc(getStatusOfLatestSubscriptionForProviderWithProvider:resolver:rejecter:)
  public func getStatusOfLatestSubscriptionForProvider(
    provider: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    _ = reject
    AltcraftSDK.shared.pushSubscriptionFunctions
      .getStatusOfLatestSubscriptionForProvider(
        provider: provider
      ) { [weak self] result in
        guard let self else { resolve(NSNull()); return }
        guard let result else { resolve(NSNull()); return }
        resolve(mapResponseWithHttp(result))
      }
  }

  /// Maps a native `ResponseWithHttp` into a JS-friendly dictionary.
  ///
  /// - Parameter r: Response with HTTP object.
  /// - Returns: Dictionary with HTTP code and response payload.
  private func mapResponseWithHttp(_ r: ResponseWithHttp) -> [String: Any] {
    let respDict: [String: Any]? = r.response.map { mapResponse($0) }
    return [
      RnConstants.keyHttpCode: nsNull(r.httpCode),
      RnConstants.keyResponse: nsNull(respDict)
    ]
  }

  /// Maps a native `Response` into a JS-friendly dictionary.
  ///
  /// - Parameter r: Response object.
  /// - Returns: Dictionary with response fields.
  private func mapResponse(_ r: Response) -> [String: Any] {
    let profileDict: [String: Any]? = r.profile.map { mapProfile($0) }
    return [
      RnConstants.keyError: nsNull(r.error),
      RnConstants.keyErrorText: nsNull(r.errorText),
      RnConstants.keyProfile: nsNull(profileDict)
    ]
  }

  /// Maps a native `ProfileData` into a JS-friendly dictionary.
  ///
  /// - Parameter p: Profile data.
  /// - Returns: Dictionary with profile fields.
  private func mapProfile(_ p: ProfileData) -> [String: Any] {
    let subDict: [String: Any]? = p.subscription.map { mapSubscription($0) }
    return [
      RnConstants.keyId: nsNull(p.id),
      RnConstants.keyStatus: nsNull(p.status),
      RnConstants.keyIsTest: nsNull(p.isTest),
      RnConstants.keySubscription: nsNull(subDict)
    ]
  }

  /// Maps a native `SubscriptionData` into a JS-friendly dictionary.
  ///
  /// - Parameter s: Subscription data.
  /// - Returns: Dictionary with subscription fields.
  private func mapSubscription(_ s: SubscriptionData) -> [String: Any] {
    let fieldsString = Converter.toStringMap(s.fields)
    let catsArr: [[String: Any]]? = s.cats?.map { mapCategory($0) }
    return [
      RnConstants.keySubscriptionId: nsNull(s.subscriptionId),
      RnConstants.keyHashId: nsNull(s.hashId),
      RnConstants.keyProvider: nsNull(s.provider),
      RnConstants.keyStatus: nsNull(s.status),
      RnConstants.keyFields: nsNull(fieldsString),
      RnConstants.keyCats: nsNull(catsArr)
    ]
  }

  /// Maps a native `CategoryData` into a JS-friendly dictionary.
  ///
  /// - Parameter c: Category data.
  /// - Returns: Dictionary with category fields.
  private func mapCategory(_ c: CategoryData) -> [String: Any] {
    [
      "name": nsNull(c.name),
      "title": nsNull(c.title),
      "steady": nsNull(c.steady),
      "active": nsNull(c.active)
    ]
  }

  // MARK: - UserDefaults

  /// Stores a key-value pair in persistent storage.
  ///
  /// Platform behavior:
  /// - iOS: Uses `UserDefaults` (optionally scoped by `suiteName` / App Group).
  ///
  /// Supported value types:
  /// - Property list compatible values (Bool, Number, String, Data, Date, Arrays/Dictionaries of those)
  /// - Complex values may be converted to a property list representation by `Converter`
  /// - `nil`/`NSNull` removes the stored value
  ///
  /// - Parameters:
  ///   - suiteName: Optional suite name (App Group) for scoped `UserDefaults`.
  ///   - key: Storage key (trimmed; empty keys are ignored).
  ///   - value: Value to store or `nil`/`NSNull` to remove.
  @objc(setUserDefaultsValueWithSuiteName:key:value:)
  public func setUserDefaultsValue(
    suiteName: String?,
    key: String,
    value: Any?
  ) {
    let k = key.trimmingCharacters(in: .whitespacesAndNewlines)
    if k.isEmpty { return }

    let sn = suiteName?.trimmingCharacters(in: .whitespacesAndNewlines)
    let ud: UserDefaults = {
      if let sn, !sn.isEmpty, let g = UserDefaults(suiteName: sn) { return g }
      return .standard
    }()

    if value == nil || value is NSNull {
      ud.removeObject(forKey: k)
      return
    }

    if let plist = Converter.toPropertyListValue(value) {
      ud.set(plist, forKey: k)
    } else {
      ud.removeObject(forKey: k)
    }
  }
}