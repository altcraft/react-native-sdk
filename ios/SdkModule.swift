import Foundation
import Altcraft
import React

/// React Native bridge module for the Altcraft iOS SDK.
///
/// This module acts as the single integration point between JS and the native SDK. It provides:
/// - Stable provider references (JWT / FCM / HMS / APNs) that must outlive individual RN calls.
/// - A single SDK initialization entry point (`initialize(...)`) matching the Android bridge behavior.
/// - A single subscriber model for SDK events, forwarded to JS via NotificationCenter.
/// - Thin wrappers around token APIs, subscription APIs, and mobile event APIs.
///
/// Thread-safety:
/// - Internal mutable state is protected by `NSLock`.
/// - Provider closures read token values under the same lock.
///
/// Notes:
/// - Exceptions are not propagated to JS. Errors are mapped to promise rejections only where required.
/// - Providers are installed once per process lifetime to keep stable references inside the SDK.
@objc(SdkModule)
@objcMembers
@available(iOSApplicationExtension, unavailable)
public final class SdkModule: NSObject {

  /// Shared singleton instance used by the ObjC++ bridge.
  public static let shared = SdkModule()

  /// A single lock protecting all mutable state in this module.
  private let lock = NSLock()

  // MARK: - JWT (stable provider reference)

  /// Current JWT value used by `jwtProvider`.
  ///
  /// Access must be protected by `lock`.
  private var jwt: String?

  /// Stable JWT provider reference.
  ///
  /// The SDK keeps a strong reference to the provider, therefore this object must live
  /// for the entire process lifetime. The provider reads `jwt` under `lock`.
  private lazy var jwtProvider: RNJWTProvider = RNJWTProvider { [weak self] in
    guard let self else { return nil }
    self.lock.lock(); defer { self.lock.unlock() }
    return self.jwt
  }

  /// Indicates whether the JWT provider has been registered in the SDK.
  ///
  /// Access must be protected by `lock`.
  private var jwtProviderInstalled = false

  /// Registers `jwtProvider` in the SDK exactly once.
  ///
  /// Uses a double-checked locking pattern:
  /// - fast path avoids locking when already installed
  /// - slow path installs provider and flips the flag under lock
  private func installJWTProviderIfNeeded() {
    // double-checked locking pattern (cheap fast-path)
    lock.lock()
    let already = jwtProviderInstalled
    lock.unlock()
    if already { return }

    AltcraftSDK.shared.setJWTProvider(provider: jwtProvider)

    lock.lock()
    jwtProviderInstalled = true
    lock.unlock()
  }

  /// Sets JWT token for requests performed by the Altcraft SDK.
  ///
  /// ObjC selector used by `Sdk.mm`: `setJWT:`
  ///
  /// Behavior:
  /// - Ensures the stable provider is installed once.
  /// - Updates the stored JWT value (provider will start returning the new token).
  @objc(setJWT:)
  public func setJWT(_ token: String?) {
    installJWTProviderIfNeeded()
    lock.lock()
    jwt = token
    lock.unlock()
  }

  // MARK: - AppGroup

  /// Sets the App Group identifier for shared storage (Core Data + UserDefaults/App Group).
  ///
  /// ObjC selector used by `Sdk.mm`: `setAppGroupWithName:`
  ///
  /// Call this before operations that rely on a shared container.
  @objc(setAppGroupWithName:)
  public func setAppGroup(name: String?) {
    AltcraftSDK.shared.setAppGroup(groupName: name)
  }

  // MARK: - Tokens / Config

  /// Stored push tokens used by token providers. Access guarded by `lock`.
  private var fcm: String?
  private var hms: String?
  private var apns: String?

  /// Last built configuration used to initialize the SDK.
  /// Stored for debugging/inspection purposes.
  private var configuration: AltcraftConfiguration?

  /// Stable FCM provider reference created once and reused.
  ///
  /// - `get` returns the current token under lock.
  /// - `del` clears the token under lock.
  private lazy var fcmProvider: RNFCMProvider = RNFCMProvider(
    get: { [weak self] completion in
      guard let self else { completion(nil); return }
      self.lock.lock(); defer { self.lock.unlock() }
      completion(self.fcm)
    },
    del: { [weak self] completion in
      guard let self else { completion(false); return }
      self.lock.lock(); self.fcm = nil; self.lock.unlock()
      completion(true)
    }
  )

  /// Stable HMS provider reference created once and reused.
  ///
  /// - `get` returns the current token under lock.
  /// - `del` clears the token under lock.
  private lazy var hmsProvider: RNHMSProvider = RNHMSProvider(
    get: { [weak self] completion in
      guard let self else { completion(nil); return }
      self.lock.lock(); defer { self.lock.unlock() }
      completion(self.hms)
    },
    del: { [weak self] completion in
      guard let self else { completion(false); return }
      self.lock.lock(); self.hms = nil; self.lock.unlock()
      completion(true)
    }
  )

  /// Stable APNs provider reference created once and reused.
  ///
  /// APNs token is read under lock and returned through completion.
  private lazy var apnsProvider: RNAPNSProvider = RNAPNSProvider { [weak self] completion in
    guard let self else { completion(nil); return }
    self.lock.lock(); defer { self.lock.unlock() }
    completion(self.apns)
  }

  /// Indicates whether token providers have been registered in the SDK.
  private var tokenProvidersInstalled = false

  // ---- Events (single subscriber like Android) ----

  /// Indicates whether the module is currently subscribed to SDK events.
  ///
  /// This is a guard to keep the subscription single (idempotent subscribe/unsubscribe).
  private var eventsSubscribed: Bool = false

  // MARK: - Install providers once (App module only)

  /// Ensures all token providers are installed in the SDK.
  ///
  /// This is called from initialization and from token setters to guarantee the SDK
  /// always has stable references.
  public func ensureProvidersInstalled() {
    installTokenProvidersIfNeeded()
  }

  /// Registers token providers (FCM/HMS/APNs) in the SDK exactly once.
  ///
  /// Uses a double-checked locking pattern to avoid repeated work.
  private func installTokenProvidersIfNeeded() {
    lock.lock()
    let already = tokenProvidersInstalled
    lock.unlock()
    if already { return }

    let push = AltcraftSDK.shared.pushTokenFunction
    push.setFCMTokenProvider(fcmProvider)
    push.setHMSTokenProvider(hmsProvider)
    push.setAPNSTokenProvider(apnsProvider)

    lock.lock()
    tokenProvidersInstalled = true
    lock.unlock()
  }

  // MARK: - ✅ RN init (ONLY initialize)

  /// Initializes Altcraft SDK using configuration received from React Native.
  ///
  /// Contract:
  /// - Resolves with `nil` on success.
  /// - Rejects with:
  ///   - `ALTCRAFT_INIT_INVALID_CONFIG` when required fields are missing or configuration build fails.
  ///   - `ALTCRAFT_INIT_ERROR` when SDK initialization reports failure.
  ///
  /// Notes:
  /// - Providers are installed before initialization to ensure stable references.
  @objc(initializeWithConfig:resolver:rejecter:)
  public func initialize(
    _ config: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ensureProvidersInstalled()

    let dict = config as? [String: Any] ?? [:]

    guard let apiUrl = dict["apiUrl"] as? String, !apiUrl.isEmpty else {
      reject("ALTCRAFT_INIT_INVALID_CONFIG", "apiUrl is required", nil)
      return
    }

    let rToken = dict["rToken"] as? String
    let enableLogging = dict["enableLogging"] as? Bool
    let providerPriorityList = dict["providerPriorityList"] as? [String]

    var appInfo: AppInfo? = nil
    if let app = dict["appInfo"] as? [String: Any] {
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

  // MARK: - ✅ NativeEventEmitter support (no-op)

  /// Required by `NativeEventEmitter` contract on the JS side.
  ///
  /// iOS bridge uses NotificationCenter forwarding instead, so this is a no-op.
  public func addListener(_ eventName: String) { _ = eventName }

  /// Required by `NativeEventEmitter` contract on the JS side.
  ///
  /// iOS bridge uses NotificationCenter forwarding instead, so this is a no-op.
  public func removeListeners(_ count: NSNumber) { _ = count }

  // MARK: - ✅ Events API (called from Sdk.mm)

  /// Subscribes to native SDK events and forwards them to JS.
  ///
  /// Single-subscription behavior:
  /// - Multiple calls are safe (idempotent).
  /// - Events are emitted via NotificationCenter using `.altcraftSdkEventNotification`.
  ///
  /// Notes:
  /// - The actual event source is `SDKEvents.shared`, consistent with the native SDK event bus.
  public func subscribeToEvents() {
    lock.lock()
    let already = eventsSubscribed
    if !already { eventsSubscribed = true }
    lock.unlock()
    if already { return }

    // Subscribe to native SDK events emitted through SDKEvents.shared.emit(event:)
    SDKEvents.shared.subscribe { [weak self] ev in
      guard let self else { return }

      print("[AltcraftSdk] \(ev.eventCode ?? 0)")

      // If unsubscribed meanwhile — ignore
      self.lock.lock()
      let subscribed = self.eventsSubscribed
      self.lock.unlock()
      if !subscribed { return }

      let payload = self.mapSdkEventToJs(ev)
      NotificationCenter.default.post(
        name: .altcraftSdkEventNotification,
        object: nil,
        userInfo: payload
      )
    }
  }

  /// Unsubscribes from the SDK event stream.
  ///
  /// After this call, events are no longer forwarded to JS.
  public func unsubscribeFromEvent() {
    lock.lock()
    eventsSubscribed = false
    lock.unlock()

    SDKEvents.shared.unsubscribe()
  }

  /// Maps a native SDK event into a JS-friendly payload.
  ///
  /// Output schema (matches Android bridge):
  /// - function: String
  /// - code: Int | null
  /// - message: String
  /// - type: "event" | "error" | "retryError"
  /// - value: Object | null
  private func mapSdkEventToJs(_ ev: Event) -> [String: Any] {
    let message = ev.message ?? String(describing: ev)
    let code: Any = ev.eventCode.map { $0 } ?? NSNull()

    let type: String
    if ev is RetryEvent {
      type = "retryError"
    } else if ev is ErrorEvent {
      type = "error"
    } else {
      type = "event"
    }

    let valueObj: Any
    if let v = ev.value, !v.isEmpty {
      valueObj = sanitizeToJsObject(v)
    } else {
      valueObj = NSNull()
    }

    return [
      "function": ev.function,
      "code": code,
      "message": message,
      "type": type,
      "value": valueObj
    ]
  }

  /// Converts a Swift dictionary into an `NSDictionary` suitable for React Native.
  ///
  /// All values are sanitized to supported JS types.
  private func sanitizeToJsObject(_ dict: [String: Any]) -> NSDictionary {
    let out = NSMutableDictionary(capacity: dict.count)
    for (k, v) in dict {
      out[k] = sanitizeAnyToJs(v)
    }
    return out
  }

  /// Sanitizes an arbitrary Swift value into a JS-compatible representation.
  ///
  /// Supported output types:
  /// - `NSString` / `NSNumber` / `NSNull`
  /// - `NSArray` / `NSDictionary` (recursively sanitized)
  ///
  /// Unsupported values are stringified via `String(describing:)`.
  private func sanitizeAnyToJs(_ v: Any) -> Any {
    if v is NSNull { return NSNull() }

    if let s = v as? String { return s }
    if let n = v as? NSNumber { return n }
    if let b = v as? Bool { return NSNumber(value: b) }
    if let i = v as? Int { return NSNumber(value: i) }
    if let d = v as? Double { return NSNumber(value: d) }
    if let f = v as? Float { return NSNumber(value: Double(f)) }

    if let arr = v as? [Any] {
      return arr.map { sanitizeAnyToJs($0) }
    }

    if let m = v as? [String: Any] {
      return sanitizeToJsObject(m)
    }

    return String(describing: v)
  }

  // MARK: - Token setters (App module)

  /// Sets (or clears) the stored FCM token and updates SDK provider registration.
  ///
  /// ObjC selector used by `Sdk.mm`: `setFCM:`
  ///
  /// Behavior:
  /// - If `token` is nil/empty: provider is unregistered (SDK won't request FCM token).
  /// - Otherwise: provider remains registered and will supply the token.
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
  ///
  /// Behavior:
  /// - If `token` is nil/empty: provider is unregistered.
  /// - Otherwise: provider remains registered and will supply the token.
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
  ///
  /// Behavior:
  /// - If `token` is nil/empty: provider is unregistered.
  /// - Otherwise: provider remains registered and will supply the token.
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

  // MARK: - clear

  /// Clears SDK state (tokens/subscriptions/cache depending on SDK implementation).
  ///
  /// Promise contract:
  /// - Resolves with `nil` after cleanup completes.
  @objc(clearWithResolver:rejecter:)
  public func clear(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ensureProvidersInstalled()
    AltcraftSDK.shared.clear {
      resolve(nil)
    }
  }

  // MARK: - Token API wrappers used by ObjC bridge

  /// Returns the currently resolved push token from the SDK.
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

  /// Deletes device token for a known provider.
  ///
  /// - Parameters:
  ///   - provider: Provider name from JS (case-insensitive, expected to match constants).
  ///   - completion: `true` if a supported provider was handled, otherwise `false`.
  @objc(deleteDeviceTokenWithProvider:completion:)
  public func deleteDeviceToken(provider: String?, completion: @escaping (Bool) -> Void) {
    ensureProvidersInstalled()
    let p = (provider ?? "").lowercased()
    _ = p // keep for potential normalization usage

    if provider == Constants.ProviderName.firebase {
      AltcraftSDK.shared.pushTokenFunction.deleteDeviceToken(provider: Constants.ProviderName.firebase) {
        completion(true)
      }
      return
    }

    if provider == Constants.ProviderName.huawei {
      AltcraftSDK.shared.pushTokenFunction.deleteDeviceToken(provider: Constants.ProviderName.huawei) {
        completion(true)
      }
      return
    }

    if provider == Constants.ProviderName.apns {
      AltcraftSDK.shared.pushTokenFunction.deleteDeviceToken(provider: Constants.ProviderName.apns) {
        completion(true)
      }
      return
    }

    completion(false)
  }

  /// Forces push token update flow in the SDK.
  ///
  /// - Parameter completion: Called when the update flow finishes.
  @objc(forcedTokenUpdateWithCompletion:)
  public func forcedTokenUpdate(_ completion: @escaping () -> Void) {
    ensureProvidersInstalled()
    AltcraftSDK.shared.pushTokenFunction.forcedTokenUpdate {
      completion()
    }
  }

  /// Updates push provider priority list.
  ///
  /// - Parameters:
  ///   - list: Provider ids ordered by preference.
  ///   - completion: Returns `true` when the list is applied.
  @objc(changePushProviderPriorityListWithList:completion:)
  public func changePushProviderPriorityList(_ list: [String]?, completion: @escaping (Bool) -> Void) {
    ensureProvidersInstalled()
    AltcraftSDK.shared.pushTokenFunction.changePushProviderPriorityList(list ?? [])
    completion(true)
  }

  /// Sets or clears push token for a specific provider.
  ///
  /// This is a direct passthrough to the SDK API. The SDK decides how to interpret `pushToken`.
  @objc(setPushTokenWithProvider:pushToken:)
  public func setPushToken(provider: String, pushToken: Any?) {
    ensureProvidersInstalled()
    AltcraftSDK.shared.pushTokenFunction.setPushToken(provider: provider, pushToken: pushToken)
  }

  // MARK: - ✅ Push Subscription (RN bridge)

  /// Converts an `NSDictionary` into a Swift `[String: Any?]` map.
  ///
  /// Returns `nil` for:
  /// - nil input
  /// - empty dictionaries
  private func toAnyDict(_ dict: NSDictionary?) -> [String: Any?]? {
    guard let dict = dict as? [String: Any] else { return nil }
    if dict.isEmpty { return nil }
    var out: [String: Any?] = [:]
    out.reserveCapacity(dict.count)
    for (k, v) in dict {
      out[k] = v
    }
    return out.isEmpty ? nil : out
  }

  /// Converts RN categories array into native `[CategoryData]`.
  ///
  /// Returns `nil` for:
  /// - nil input
  /// - empty input
  /// - when all items are invalid/unparseable
  private func toCats(_ cats: NSArray?) -> [CategoryData]? {
    guard let arr = cats as? [Any], !arr.isEmpty else { return nil }

    var out: [CategoryData] = []
    out.reserveCapacity(arr.count)

    for item in arr {
      guard let m = item as? [String: Any] else { continue }

      let name = m["name"] as? String
      let title = m["title"] as? String
      let steady = m["steady"] as? Bool
      let active = m["active"] as? Bool

      out.append(
        CategoryData(
          name: name,
          title: title,
          steady: steady,
          active: active
        )
      )
    }

    return out.isEmpty ? nil : out
  }

  /// Subscribes device/profile for push notifications.
  ///
  /// ObjC selector used by `Sdk.mm`: `pushSubscribe:profileFields:customFields:cats:replace:skipTriggers:`
  ///
  /// Parameters match the JS spec:
  /// - sync: defaults to `true` when nil
  /// - replace / skipTriggers: optional flags forwarded as `Bool?`
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

  /// Suspends current push subscription (temporarily disables).
  ///
  /// ObjC selector used by `Sdk.mm`: `pushSuspend:profileFields:customFields:cats:replace:skipTriggers:`
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
  /// ObjC selector used by `Sdk.mm`: `pushUnSubscribe:profileFields:customFields:cats:replace:skipTriggers:`
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

  // MARK: - ✅ MobileEvent (RN bridge)

  /// Sends a generic mobile event (non-push) to Altcraft via the SDK.
  ///
  /// ObjC selector used by `Sdk.mm`: `mobileEvent:eventName:sendMessageId:payload:matching:matchingType:profileFields:`
  ///
  /// Notes:
  /// - `subscription` and `utm` are not bridged from RN yet (passed as nil).
  /// - `altcraftClientID` is currently passed as an empty string to match existing native behavior.
  @objc(mobileEvent:eventName:sendMessageId:payload:matching:matchingType:profileFields:)
  public func mobileEvent(
    _ sid: String,
    eventName: String,
    sendMessageId: String?,
    payload: NSDictionary?,
    matching: NSDictionary?,
    matchingType: String?,
    profileFields: NSDictionary?
  ) {
    ensureProvidersInstalled()

    let payloadAny = toAnyDict(payload)
    let matchingAny = toAnyDict(matching)
    let profileAny = toAnyDict(profileFields)

    AltcraftSDK.shared.mobileEventFunctions.mobileEvent(
      sid: sid,
      altcraftClientID: "",
      eventName: eventName,
      sendMessageId: sendMessageId,
      payload: payloadAny,
      matching: matchingAny,
      matchingType: matchingType,
      profileFields: profileAny,
      subscription: nil,
      utm: nil
    )
  }

  // MARK: - ✅ PushSubscription promise API for RN (ResponseWithHttpCode | null)

  /// Helper: converts `nil` to `NSNull()` for JS payloads.
  private func nsNull(_ v: Any?) -> Any { v ?? NSNull() }

  /// Converts an arbitrary `[String: Any?]` map into a `[String: String]` map.
  ///
  /// Used for fields mapping in subscription-related responses.
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

  /// Maps SDK category model to JS object.
  private func mapCategory(_ c: CategoryData) -> [String: Any] {
    [
      "name": nsNull(c.name),
      "title": nsNull(c.title),
      "steady": nsNull(c.steady),
      "active": nsNull(c.active),
    ]
  }

  /// Maps SDK subscription model to JS object.
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

  /// Maps SDK profile model to JS object.
  private func mapProfile(_ p: ProfileData) -> [String: Any] {
    let subDict: [String: Any]? = p.subscription.map { mapSubscription($0) }
    return [
      "id": nsNull(p.id),
      "status": nsNull(p.status),
      "isTest": nsNull(p.isTest),
      "subscription": nsNull(subDict),
    ]
  }

  /// Maps SDK response model to JS object.
  private func mapResponse(_ r: Response) -> [String: Any] {
    let profileDict: [String: Any]? = r.profile.map { mapProfile($0) }
    return [
      "error": nsNull(r.error),
      "errorText": nsNull(r.errorText),
      "profile": nsNull(profileDict),
    ]
  }

  /// Maps SDK response-with-http model to JS object.
  private func mapResponseWithHttp(_ r: ResponseWithHttp) -> [String: Any] {
    let respDict: [String: Any]? = r.response.map { mapResponse($0) }
    return [
      "httpCode": nsNull(r.httpCode),
      "response": nsNull(respDict),
    ]
  }

  /// Attempts to un-suspend a push subscription.
  ///
  /// Promise contract:
  /// - Resolves with `null` if SDK returns nil.
  /// - Resolves with `{ httpCode, response }` if available.
  @objc(unSuspendPushSubscriptionWithResolver:rejecter:)
  public func unSuspendPushSubscription(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ensureProvidersInstalled()

    AltcraftSDK.shared.pushSubscriptionFunctions.unSuspendPushSubscription { result in
      guard let result else { resolve(NSNull()); return }
      resolve(self.mapResponseWithHttp(result))
    }
  }

  /// Returns status of the latest subscription operation.
  ///
  /// Promise contract:
  /// - Resolves with `null` if SDK returns nil.
  /// - Resolves with `{ httpCode, response }` if available.
  @objc(getStatusOfLatestSubscriptionWithResolver:rejecter:)
  public func getStatusOfLatestSubscription(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ensureProvidersInstalled()

    AltcraftSDK.shared.pushSubscriptionFunctions.getStatusOfLatestSubscription { result in
      guard let result else { resolve(NSNull()); return }
      resolve(self.mapResponseWithHttp(result))
    }
  }

  /// Returns status of the current subscription.
  ///
  /// Promise contract:
  /// - Resolves with `null` if SDK returns nil.
  /// - Resolves with `{ httpCode, response }` if available.
  @objc(getStatusForCurrentSubscriptionWithResolver:rejecter:)
  public func getStatusForCurrentSubscription(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ensureProvidersInstalled()

    AltcraftSDK.shared.pushSubscriptionFunctions.getStatusForCurrentSubscription { result in
      guard let result else { resolve(NSNull()); return }
      resolve(self.mapResponseWithHttp(result))
    }
  }

  /// Returns status of the latest subscription operation for a specific provider.
  ///
  /// Promise contract:
  /// - Resolves with `null` if SDK returns nil.
  /// - Resolves with `{ httpCode, response }` if available.
  @objc(getStatusOfLatestSubscriptionForProviderWithProvider:resolver:rejecter:)
  public func getStatusOfLatestSubscriptionForProvider(
    provider: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ensureProvidersInstalled()

    AltcraftSDK.shared.pushSubscriptionFunctions.getStatusOfLatestSubscriptionForProvider(provider: provider) { result in
      guard let result else { resolve(NSNull()); return }
      resolve(self.mapResponseWithHttp(result))
    }
  }
}

// MARK: - Notification name

extension Notification.Name {
  /// Notification posted when an SDK event is forwarded to JS.
  ///
  /// Must match ObjC++ constant: `SdkEventsNotificationName = @"AltcraftSdkEventNotification"`.
  static let altcraftSdkEventNotification = Notification.Name("AltcraftSdkEventNotification")
}
