// SdkModule.swift
import Foundation
import Altcraft
import React

/// React Native bridge module for Altcraft iOS SDK.
///
/// Responsibilities:
/// - Provide stable token provider references (JWT / FCM / HMS / APNs) that outlive individual RN calls.
/// - Expose a single SDK initialization entry point matching Android bridge behavior.
/// - Forward SDK events to JS via a single `RCTEventEmitter`.
///
/// Thread-safety:
/// - All mutable state is protected by `NSLock`.
/// - Provider callbacks read token values under the same lock.
@objc(SdkModule)
@objcMembers
@available(iOSApplicationExtension, unavailable)
public final class SdkModule: NSObject {

  // MARK: - Singleton & State

  /// Shared singleton instance used by the ObjC++ bridge.
  public static let shared = SdkModule()

  /// Protects all mutable state in this module.
  private let lock = NSLock()

  /// Last configuration used to initialize the SDK.
  private var configuration: AltcraftConfiguration?

  // MARK: - JWT Provider

  /// Current JWT value used by `jwtProvider`. Access under `lock`.
  private var jwt: String?

  /// Indicates whether the JWT provider has been installed in the SDK.
  private var jwtProviderInstalled = false

  /// Stable JWT provider reference stored by the SDK for the process lifetime.
  private lazy var jwtProvider: RNJWTProvider = RNJWTProvider { [weak self] in
    guard let self else { return nil }
    self.lock.lock(); defer { self.lock.unlock() }
    return self.jwt
  }

  /// Installs JWT provider into the SDK once.
  private func installJWTProviderIfNeeded() {
    lock.lock()
    let alreadyInstalled = jwtProviderInstalled
    lock.unlock()
    if alreadyInstalled { return }

    AltcraftSDK.shared.setJWTProvider(provider: jwtProvider)

    lock.lock()
    jwtProviderInstalled = true
    lock.unlock()
  }

  /// Sets JWT token used by SDK requests.
  ///
  /// ObjC selector used by `Sdk.mm`: `setJWT:`
  @objc(setJWT:)
  public func setJWT(_ token: String?) {
    installJWTProviderIfNeeded()
    lock.lock()
    jwt = token
    lock.unlock()
  }

  // MARK: - App Group

  /// Sets the App Group identifier for shared storage.
  ///
  /// ObjC selector used by `Sdk.mm`: `setAppGroupWithName:`
  @objc(setAppGroupWithName:)
  public func setAppGroup(name: String?) {
    AltcraftSDK.shared.setAppGroup(groupName: name)
  }

  // MARK: - Push Tokens

  /// Stored push tokens used by token providers. Access under `lock`.
  private var fcm: String?
  private var hms: String?
  private var apns: String?

  // MARK: - Token Providers

  /// Indicates whether token providers have been installed in the SDK.
  private var tokenProvidersInstalled = false

  /// FCM provider backed by stored `fcm` token.
  private lazy var fcmProvider: RNFCMProvider = RNFCMProvider(
    get: { [weak self] completion in
      guard let self else { completion(nil); return }
      self.lock.lock(); defer { self.lock.unlock() }
      completion(self.fcm)
    },
    del: { [weak self] completion in
      guard let self else { completion(false); return }
      self.lock.lock()
      self.fcm = nil
      self.lock.unlock()
      completion(true)
    }
  )

  /// HMS provider backed by stored `hms` token.
  private lazy var hmsProvider: RNHMSProvider = RNHMSProvider(
    get: { [weak self] completion in
      guard let self else { completion(nil); return }
      self.lock.lock(); defer { self.lock.unlock() }
      completion(self.hms)
    },
    del: { [weak self] completion in
      guard let self else { completion(false); return }
      self.lock.lock()
      self.hms = nil
      self.lock.unlock()
      completion(true)
    }
  )

  /// APNs provider backed by stored `apns` token.
  private lazy var apnsProvider: RNAPNSProvider = RNAPNSProvider { [weak self] completion in
    guard let self else { completion(nil); return }
    self.lock.lock(); defer { self.lock.unlock() }
    completion(self.apns)
  }

  /// Ensures token providers are installed in the SDK once.
  public func ensureProvidersInstalled() {
    installTokenProvidersIfNeeded()
  }

  /// Installs token providers using a double-checked locking pattern.
  private func installTokenProvidersIfNeeded() {
    lock.lock()
    let alreadyInstalled = tokenProvidersInstalled
    lock.unlock()
    if alreadyInstalled { return }

    let push = AltcraftSDK.shared.pushTokenFunction
    push.setFCMTokenProvider(fcmProvider)
    push.setHMSTokenProvider(hmsProvider)
    push.setAPNSTokenProvider(apnsProvider)

    lock.lock()
    tokenProvidersInstalled = true
    lock.unlock()
  }

  // MARK: - SDK Initialization (RN Promise)

  /// Initializes Altcraft SDK using configuration received from React Native.
  ///
  /// Promise contract:
  /// - Resolves with `nil` on success.
  /// - Rejects with:
  ///   - `ALTCRAFT_INIT_INVALID_CONFIG` when required fields are missing or config cannot be built.
  ///   - `ALTCRAFT_INIT_ERROR` when SDK initialization reports failure.
  ///
  /// Notes:
  /// - Token providers are installed before initialization.
  @objc(initializeWithConfig:resolver:rejecter:)
  public func initialize(
    _ config: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ensureProvidersInstalled()

    // Normalizes numbers/bools, parses JSON strings, and recursively converts nested structures.
    let dict: [String: Any?] = Converter.toAnyDict(config) ?? [:]

    guard let apiUrl = dict["apiUrl"] as? String, !apiUrl.isEmpty else {
      reject("ALTCRAFT_INIT_INVALID_CONFIG", "apiUrl is required", nil)
      return
    }

    let rToken = dict["rToken"] as? String
    let enableLogging = dict["enableLogging"] as? Bool
    let providerPriorityList = dict["providerPriorityList"] as? [String]

    var appInfo: AppInfo? = nil
    if let app = dict["appInfo"] as? [String: Any?] {
      let appID = (app["appID"] as? String) ?? ""
      let appIID = (app["appIID"] as? String) ?? ""
      let appVer = (app["appVer"] as? String) ?? ""
      if !appID.isEmpty || !appIID.isEmpty || !appVer.isEmpty {
        appInfo = AppInfo(appID: appID, appIID: appIID, appVer: appVer)
      }
    } else if let app = dict["appInfo"] as? [String: Any] {
      let appID = (app["appID"] as? String) ?? ""
      let appIID = (app["appIID"] as? String) ?? ""
      let appVer = (app["appVer"] as? String) ?? ""
      if !appID.isEmpty || !appIID.isEmpty || !appVer.isEmpty {
        appInfo = AppInfo(appID: appID, appIID: appIID, appVer: appVer)
      }
    }

    guard let built = AltcraftConfiguration.Builder()
      .setApiUrl(apiUrl)
      .setRToken(rToken)
      .setAppInfo(appInfo)
      .setProviderPriorityList(providerPriorityList)
      .setEnableLogging(enableLogging)
      .build()
    else {
      reject("ALTCRAFT_INIT_INVALID_CONFIG", "Invalid Altcraft configuration", nil)
      return
    }

    lock.lock()
    self.configuration = built
    lock.unlock()

    AltcraftSDK.shared.initialization(configuration: built) { ok in
      if ok { resolve(nil) }
      else { reject("ALTCRAFT_INIT_ERROR", "Altcraft initialization failed", nil) }
    }
  }

  // MARK: - NativeEventEmitter compatibility

  /// Required by `NativeEventEmitter` (no-op on iOS).
  public func addListener(_ eventName: String) { _ = eventName }

  /// Required by `NativeEventEmitter` (no-op on iOS).
  public func removeListeners(_ count: NSNumber) { _ = count }

  // MARK: - RCTEventEmitter

  /// Event emitter used by RN to receive Altcraft SDK events.
  ///
  /// Emits: `"AltcraftSdkEvent"`.
  @objc(SDKEventEmitter)
  final class SDKEventEmitter: RCTEventEmitter {

    /// Active emitter instance created by React Native.
    private static weak var _shared: SDKEventEmitter?

    /// Events buffered before React Native subscribes.
    private static var pending: [(String, Any?)] = []
    private static let pendingLock = NSLock()

    override init() {
      super.init()
      SDKEventEmitter._shared = self
      SDKEventEmitter.flushPendingIfPossible()
    }

    override func supportedEvents() -> [String]! {
      ["AltcraftSdkEvent"]
    }

    @objc override static func requiresMainQueueSetup() -> Bool {
      true
    }

    /// Emits a single integer code as an Altcraft event payload.
    @objc static func emitAltcraft(code: Int) {
      emit(name: "AltcraftSdkEvent", body: ["code": code])
    }

    /// Sends an event to JS. If emitter is not ready, buffers it.
    @objc static func emit(name: String, body: Any?) {
      let deliver = {
        if let emitter = _shared {
          emitter.sendEvent(withName: name, body: body)
        } else {
          buffer(name: name, body: body)
        }
      }

      if Thread.isMainThread {
        deliver()
      } else {
        DispatchQueue.main.async { deliver() }
      }
    }

    private static func buffer(name: String, body: Any?) {
      pendingLock.lock()
      pending.append((name, body))
      pendingLock.unlock()
    }

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

  /// Indicates whether this module is currently subscribed to SDK events.
  private var eventsSubscribed: Bool = false

  /// Subscribes to SDK events and forwards them to JS.
  public func subscribeToEvents() {
    lock.lock()
    let already = eventsSubscribed
    if !already { eventsSubscribed = true }
    lock.unlock()
    if already { return }

    SDKEvents.shared.subscribe { [weak self] event in
      guard let self else { return }
      SDKEventEmitter.emit(name: "AltcraftSdkEvent", body: self.toPayload(event))
    }
  }

  /// Unsubscribes from SDK events.
  public func unsubscribeFromEvent() {
    lock.lock()
    eventsSubscribed = false
    lock.unlock()
    SDKEvents.shared.unsubscribe()
  }

  // MARK: - Event payload mapping

  /// Converts an SDK `Event` into a JS-friendly payload.
  private func toPayload(_ event: Event) -> [String: Any] {
    let type: String
    if event is RetryEvent {
      type = "retryError"
    } else if event is ErrorEvent {
      type = "error"
    } else {
      type = "event"
    }

    return [
      "function": event.function,
      "code": event.eventCode as Any? ?? NSNull(),
      "message": event.message ?? "",
      "type": type,
      "value": Converter.toAny(event.value) ?? NSNull()
    ]
  }

  // MARK: - Token setters

  /// Sets (or clears) the stored FCM token and updates SDK provider registration.
  ///
  /// ObjC selector used by `Sdk.mm`: `setFCM:`
  @objc(setFCM:)
  public func setFCM(_ token: String?) {
    ensureProvidersInstalled()
    lock.lock(); fcm = token; lock.unlock()

    let push = AltcraftSDK.shared.pushTokenFunction
    if token == nil || token?.isEmpty == true {
      push.setFCMTokenProvider(nil)
    } else {
      push.setFCMTokenProvider(fcmProvider)
    }
  }

  /// Sets (or clears) the stored HMS token and updates SDK provider registration.
  ///
  /// ObjC selector used by `Sdk.mm`: `setHMS:`
  @objc(setHMS:)
  public func setHMS(_ token: String?) {
    ensureProvidersInstalled()
    lock.lock(); hms = token; lock.unlock()

    let push = AltcraftSDK.shared.pushTokenFunction
    if token == nil || token?.isEmpty == true {
      push.setHMSTokenProvider(nil)
    } else {
      push.setHMSTokenProvider(hmsProvider)
    }
  }

  /// Sets (or clears) the stored APNs token and updates SDK provider registration.
  ///
  /// ObjC selector used by `Sdk.mm`: `setAPNS:`
  @objc(setAPNS:)
  public func setAPNS(_ token: String?) {
    ensureProvidersInstalled()
    lock.lock(); apns = token; lock.unlock()

    let push = AltcraftSDK.shared.pushTokenFunction
    if token == nil || token?.isEmpty == true {
      push.setAPNSTokenProvider(nil)
    } else {
      push.setAPNSTokenProvider(apnsProvider)
    }
  }

  // MARK: - SDK Clear (RN Promise)

  /// Clears SDK state (tokens/subscriptions/cache depending on SDK implementation).
  @objc(clearWithResolver:rejecter:)
  public func clear(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    _ = reject
    ensureProvidersInstalled()
    AltcraftSDK.shared.clear { resolve(nil) }
  }

  // MARK: - Token API wrappers

  /// Returns the current push token from the SDK.
  ///
  /// - Parameter completion: Called with `{ provider, token }` or `nil` if not available.
  @objc(getPushTokenWithCompletion:)
  public func getPushToken(_ completion: @escaping ([String: Any]?) -> Void) {
    ensureProvidersInstalled()
    AltcraftSDK.shared.pushTokenFunction.getPushToken { tokenData in
      guard let tokenData else { completion(nil); return }
      completion([
        "provider": tokenData.provider,
        "token": tokenData.token
      ])
    }
  }

  /// Deletes device token for a supported provider.
  ///
  /// - Parameters:
  ///   - provider: Provider name from JS (case-insensitive).
  ///   - completion: `true` if a supported provider was handled, otherwise `false`.
  @objc(deleteDeviceTokenWithProvider:completion:)
  public func deleteDeviceToken(provider: String?, completion: @escaping (Bool) -> Void) {
    ensureProvidersInstalled()

    let p = (provider ?? "").lowercased()

    if p == Constants.ProviderName.firebase.lowercased() {
      AltcraftSDK.shared.pushTokenFunction.deleteDeviceToken(provider: Constants.ProviderName.firebase) {
        completion(true)
      }
      return
    }

    if p == Constants.ProviderName.huawei.lowercased() {
      AltcraftSDK.shared.pushTokenFunction.deleteDeviceToken(provider: Constants.ProviderName.huawei) {
        completion(true)
      }
      return
    }

    if p == Constants.ProviderName.apns.lowercased() {
      AltcraftSDK.shared.pushTokenFunction.deleteDeviceToken(provider: Constants.ProviderName.apns) {
        completion(true)
      }
      return
    }

    completion(false)
  }

  /// Forces push token update flow in the SDK.
  @objc(forcedTokenUpdateWithCompletion:)
  public func forcedTokenUpdate(_ completion: @escaping () -> Void) {
    ensureProvidersInstalled()
    AltcraftSDK.shared.pushTokenFunction.forcedTokenUpdate { completion() }
  }

  /// Updates push provider priority list.
  @objc(changePushProviderPriorityListWithList:completion:)
  public func changePushProviderPriorityList(_ list: [String]?, completion: @escaping (Bool) -> Void) {
    ensureProvidersInstalled()
    AltcraftSDK.shared.pushTokenFunction.changePushProviderPriorityList(list ?? [])
    completion(true)
  }

  /// Sets push token for a specific provider.
  @objc(setPushTokenWithProvider:pushToken:)
  public func setPushToken(provider: String, pushToken: Any?) {
    ensureProvidersInstalled()
    AltcraftSDK.shared.pushTokenFunction.setPushToken(provider: provider, pushToken: pushToken)
  }

  // MARK: - Push Subscription

  /// Converts `NSDictionary` into `[String: Any?]` with normalization.
  private func toAnyDict(_ dict: NSDictionary?) -> [String: Any?]? {
    Converter.toAnyDict(dict)
  }

  /// Converts categories into native `[CategoryData]`.
  private func toCats(_ cats: NSArray?) -> [CategoryData]? {
    guard let arr = cats, arr.count > 0 else { return nil }

    var out: [CategoryData] = []
    out.reserveCapacity(arr.count)

    for item in arr {
      if let s = item as? String, !s.isEmpty {
        out.append(CategoryData(name: s, title: nil, steady: nil, active: true))
        continue
      }

      if let m = item as? NSDictionary {
        let mm = Converter.toAnyDict(m) ?? [:]
        let name = mm["name"] as? String
        let title = mm["title"] as? String
        let steady = mm["steady"] as? Bool
        let active = mm["active"] as? Bool

        if name != nil {
          out.append(CategoryData(name: name, title: title, steady: steady, active: active))
        }
      }
    }

    return out.isEmpty ? nil : out
  }

  /// Subscribes device/profile for push notifications.
  ///
  /// ObjC selector used by `Sdk.mm`:
  /// `pushSubscribe:profileFields:customFields:cats:replace:skipTriggers:`
  @objc(pushSubscribe:profileFields:customFields:cats:replace:skipTriggers:)
  public func pushSubscribe(
    _ sync: NSNumber?,
    profileFields: NSDictionary?,
    customFields: NSDictionary?,
    cats: NSArray?,
    replace: NSNumber?,
    skipTriggers: NSNumber?
  ) {
    ensureProvidersInstalled()

    let s = sync?.boolValue ?? true
    let r: Bool? = (replace != nil) ? replace!.boolValue : nil
    let st: Bool? = (skipTriggers != nil) ? skipTriggers!.boolValue : nil

    AltcraftSDK.shared.pushSubscriptionFunctions.pushSubscribe(
      sync: s,
      profileFields: toAnyDict(profileFields),
      customFields: toAnyDict(customFields),
      cats: toCats(cats),
      replace: r,
      skipTriggers: st
    )
  }

  /// Suspends current push subscription.
  ///
  /// ObjC selector used by `Sdk.mm`:
  /// `pushSuspend:profileFields:customFields:cats:replace:skipTriggers:`
  @objc(pushSuspend:profileFields:customFields:cats:replace:skipTriggers:)
  public func pushSuspend(
    _ sync: NSNumber?,
    profileFields: NSDictionary?,
    customFields: NSDictionary?,
    cats: NSArray?,
    replace: NSNumber?,
    skipTriggers: NSNumber?
  ) {
    ensureProvidersInstalled()

    let s = sync?.boolValue ?? true
    let r: Bool? = (replace != nil) ? replace!.boolValue : nil
    let st: Bool? = (skipTriggers != nil) ? skipTriggers!.boolValue : nil

    AltcraftSDK.shared.pushSubscriptionFunctions.pushSuspend(
      sync: s,
      profileFields: toAnyDict(profileFields),
      customFields: toAnyDict(customFields),
      cats: toCats(cats),
      replace: r,
      skipTriggers: st
    )
  }

  /// Unsubscribes (disables) current push subscription.
  ///
  /// ObjC selector used by `Sdk.mm`:
  /// `pushUnSubscribe:profileFields:customFields:cats:replace:skipTriggers:`
  @objc(pushUnSubscribe:profileFields:customFields:cats:replace:skipTriggers:)
  public func pushUnSubscribe(
    _ sync: NSNumber?,
    profileFields: NSDictionary?,
    customFields: NSDictionary?,
    cats: NSArray?,
    replace: NSNumber?,
    skipTriggers: NSNumber?
  ) {
    ensureProvidersInstalled()

    let s = sync?.boolValue ?? true
    let r: Bool? = (replace != nil) ? replace!.boolValue : nil
    let st: Bool? = (skipTriggers != nil) ? skipTriggers!.boolValue : nil

    AltcraftSDK.shared.pushSubscriptionFunctions.pushUnSubscribe(
      sync: s,
      profileFields: toAnyDict(profileFields),
      customFields: toAnyDict(customFields),
      cats: toCats(cats),
      replace: r,
      skipTriggers: st
    )
  }

  // MARK: - Mobile Events

  /// Sends a mobile event to Altcraft via SDK.
  ///
  /// ObjC selector used by `Sdk.mm`:
  /// `mobileEvent:eventName:sendMessageId:payload:matching:matchingType:profileFields:utm:`
  @objc(mobileEvent:eventName:sendMessageId:payload:matching:matchingType:profileFields:utm:)
  public func mobileEvent(
    _ sid: String,
    eventName: String,
    sendMessageId: String?,
    payload: NSDictionary?,
    matching: NSDictionary?,
    matchingType: String?,
    profileFields: NSDictionary?,
    utm: NSDictionary?
  ) {
    ensureProvidersInstalled()

    let payloadNorm = toAnyDict(payload)
    let matchingNorm = toAnyDict(matching)
    let profileNorm = toAnyDict(profileFields)
    let utmNorm = Converter.toAnyDict(utm)

    let utmObj: UTM? = utmNorm.flatMap {
      UTM(
        campaign: $0["campaign"] as? String,
        content: $0["content"] as? String,
        keyword: $0["keyword"] as? String,
        medium: $0["medium"] as? String,
        source: $0["source"] as? String,
        temp: $0["temp"] as? String
      )
    }

    AltcraftSDK.shared.mobileEventFunctions.mobileEvent(
      sid: sid,
      altcraftClientID: "",
      eventName: eventName,
      sendMessageId: sendMessageId,
      payload: payloadNorm,
      matching: matchingNorm,
      matchingType: matchingType,
      profileFields: profileNorm,
      subscription: nil,
      utm: utmObj
    )
  }

  // MARK: - Promise API: PushSubscription status/results

  /// Converts `nil` to `NSNull()` for JS payloads.
  private func nsNull(_ v: Any?) -> Any { v ?? NSNull() }

  /// Converts `[String: Any?]` to `[String: String]`.
  private func toStringMap(_ dict: [String: Any?]?) -> [String: String]? {
    guard let dict, !dict.isEmpty else { return nil }
    var out: [String: String] = [:]
    out.reserveCapacity(dict.count)
    for (k, v) in dict {
      guard let v else { continue }
      out[k] = String(describing: v)
    }
    return out.isEmpty ? nil : out
  }

  private func mapCategory(_ c: CategoryData) -> [String: Any] {
    [
      "name": nsNull(c.name),
      "title": nsNull(c.title),
      "steady": nsNull(c.steady),
      "active": nsNull(c.active),
    ]
  }

  private func mapSubscription(_ s: SubscriptionData) -> [String: Any] {
    let fieldsString = toStringMap(s.fields)
    let catsArr: [[String: Any]]? = s.cats?.map { mapCategory($0) }

    return [
      "subscriptionId": nsNull(s.subscriptionId),
      "hashId": nsNull(s.hashId),
      "provider": nsNull(s.provider),
      "status": nsNull(s.status),
      "fields": nsNull(fieldsString),
      "cats": nsNull(catsArr),
    ]
  }

  private func mapProfile(_ p: ProfileData) -> [String: Any] {
    let subDict: [String: Any]? = p.subscription.map { mapSubscription($0) }
    return [
      "id": nsNull(p.id),
      "status": nsNull(p.status),
      "isTest": nsNull(p.isTest),
      "subscription": nsNull(subDict),
    ]
  }

  private func mapResponse(_ r: Response) -> [String: Any] {
    let profileDict: [String: Any]? = r.profile.map { mapProfile($0) }
    return [
      "error": nsNull(r.error),
      "errorText": nsNull(r.errorText),
      "profile": nsNull(profileDict),
    ]
  }

  private func mapResponseWithHttp(_ r: ResponseWithHttp) -> [String: Any] {
    let respDict: [String: Any]? = r.response.map { mapResponse($0) }
    return [
      "httpCode": nsNull(r.httpCode),
      "response": nsNull(respDict),
    ]
  }

  /// Attempts to un-suspend a push subscription.
  @objc(unSuspendPushSubscriptionWithResolver:rejecter:)
  public func unSuspendPushSubscription(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    _ = reject
    ensureProvidersInstalled()

    AltcraftSDK.shared.pushSubscriptionFunctions.unSuspendPushSubscription { result in
      guard let result else { resolve(NSNull()); return }
      resolve(self.mapResponseWithHttp(result))
    }
  }

  /// Returns status of the latest subscription operation.
  @objc(getStatusOfLatestSubscriptionWithResolver:rejecter:)
  public func getStatusOfLatestSubscription(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    _ = reject
    ensureProvidersInstalled()

    AltcraftSDK.shared.pushSubscriptionFunctions.getStatusOfLatestSubscription { result in
      guard let result else { resolve(NSNull()); return }
      resolve(self.mapResponseWithHttp(result))
    }
  }

  /// Returns status of the current subscription.
  @objc(getStatusForCurrentSubscriptionWithResolver:rejecter:)
  public func getStatusForCurrentSubscription(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    _ = reject
    ensureProvidersInstalled()

    AltcraftSDK.shared.pushSubscriptionFunctions.getStatusForCurrentSubscription { result in
      guard let result else { resolve(NSNull()); return }
      resolve(self.mapResponseWithHttp(result))
    }
  }

  /// Returns status of the latest subscription operation for a specific provider.
  @objc(getStatusOfLatestSubscriptionForProviderWithProvider:resolver:rejecter:)
  public func getStatusOfLatestSubscriptionForProvider(
    provider: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    _ = reject
    ensureProvidersInstalled()

    AltcraftSDK.shared.pushSubscriptionFunctions.getStatusOfLatestSubscriptionForProvider(provider: provider) { result in
      guard let result else { resolve(NSNull()); return }
      resolve(self.mapResponseWithHttp(result))
    }
  }

  // MARK: - UserDefaults

  /// Stores a value into UserDefaults.
  ///
  /// - suiteName != nil: uses UserDefaults(suiteName:) (App Group)
  /// - suiteName == nil: uses UserDefaults.standard
  /// - nil/NSNull: removes the key
  /// - values are normalized and stored as property list types when possible
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
