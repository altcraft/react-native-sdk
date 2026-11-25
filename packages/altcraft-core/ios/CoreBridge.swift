//  CoreBridge.swift
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

import Foundation
import AltcraftCore
import React

/// Bridges RN core module calls to the native Altcraft core SDK.
///
/// Handles core initialization, native SDK events, JWT authentication, and
/// data management. The bridge guarantees that every method call is completed
/// with either a success value or an error, preventing JS-side await calls
/// from hanging.
@objcMembers
public final class CoreBridge: NSObject, @unchecked Sendable {

  /// Shared singleton instance used by the React Native bridge.
  public static let shared = CoreBridge()

  private let lock = NSLock()
  private var eventsSubscribed = false

  private override init() { super.init() }

  // MARK: - Initialization

  /// Initializes the native Altcraft SDK core using configuration received
  /// from JS. Module configurations (push, in-app) are contributed by module
  /// packages through ``AltcraftInitRegistry`` and applied to the shared
  /// builder before native initialization starts.
  ///
  /// - Parameters:
  ///   - config: RN configuration map.
  ///   - resolver: Promise resolver called with `nil` on success.
  ///   - rejecter: Promise rejecter called on failure.
  public func initialize(
    _ config: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let dict = Converter.toAnyDict(config) ?? [:]

    guard let apiUrl = dict["apiUrl"] as? String, !apiUrl.isEmpty else {
      reject("ALTCRAFT_INIT_INVALID_CONFIG", "config/apiUrl missing", nil)
      return
    }

    let appInfo = Converter.appInfo(from: dict["appInfo"] ?? nil)
    let enableLogging = dict["enableLogging"] as? Bool
    let rToken = dict["rToken"] as? String

    let builder = AltcraftConfiguration.Builder(
      apiUrl: apiUrl,
      rToken: rToken,
      appInfo: appInfo,
      enableLogging: enableLogging
    )
    AltcraftInitRegistry.shared.applyAll(
      builder: builder,
      moduleConfigs: Self.moduleConfigs(from: dict["moduleConfigs"] as? String)
    )
    let altcraftConfig = builder.build()

    let resolveBox = UncheckedSendableBox(resolve)
    let rejectBox = UncheckedSendableBox(reject)

    AltcraftSDK.initialization(configuration: altcraftConfig) { success in
      DispatchQueue.main.async {
        if success {
          resolveBox.get()(nil)
        } else {
          rejectBox.get()(
            "ALTCRAFT_INIT_ERROR",
            "Altcraft SDK initialization failed",
            nil as (any Error)?
          )
        }
      }
    }
  }

  // MARK: - State

  /// Parses serialized module configurations produced by JS builder
  /// extensions.
  private static func moduleConfigs(
    from json: String?
  ) -> [String: [String: Any]] {
    guard let json,
          let data = json.data(using: .utf8),
          let object = try? JSONSerialization.jsonObject(with: data),
          let modules = object as? [String: Any] else {
      return [:]
    }
    var result: [String: [String: Any]] = [:]
    for (moduleId, value) in modules {
      if let options = value as? [String: Any] {
        result[moduleId] = options
      }
    }
    return result
  }

  /// Clears data managed by the native Altcraft SDK.
  ///
  /// - Parameters:
  ///   - resolver: Promise resolver called after native clear callback.
  ///   - rejecter: Promise rejecter.
  public func clear(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let resolveBox = UncheckedSendableBox(resolve)
    AltcraftSDK.clear {
      DispatchQueue.main.async { resolveBox.get()(nil) }
    }
  }

  /// No-op on iOS: initial operations are not locked in the current session.
  public func unlockInitialOperationsInThisSession() {
    // no-op on iOS
  }

  // MARK: - App Group

  /// Sets the App Group name used by the native SDK for shared storage.
  ///
  /// - Parameter groupName: App Group identifier.
  public func setAppGroup(_ groupName: String?) {
    AltcraftSDK.setAppGroup(groupName: groupName)
  }

  // MARK: - UserDefaults

  /// Writes or removes a string value in UserDefaults.
  ///
  /// Uses `suiteName` when provided, otherwise writes to standard UserDefaults.
  ///
  /// - Parameters:
  ///   - suiteName: Optional suite name (App Group).
  ///   - key: Storage key.
  ///   - value: Value to store or `nil` to remove.
  public func setUserDefaultsValue(suiteName: String?, key: String, value: String?) {
    let defaults: UserDefaults
    if let suiteName, let suiteDefaults = UserDefaults(suiteName: suiteName) {
      defaults = suiteDefaults
    } else {
      defaults = UserDefaults.standard
    }

    if let value {
      defaults.setValue(value, forKey: key)
    } else {
      defaults.removeObject(forKey: key)
    }
  }

  // MARK: - SDK Events

  /// Subscribes to native SDK events and forwards them to JS via the event
  /// emitter. Multiple calls are safe; the subscription is activated only once.
  public func subscribeToEvents() {
    lock.lock()
    let already = eventsSubscribed
    eventsSubscribed = true
    lock.unlock()
    if already { return }

    SDKEvents.shared.subscribe { [weak self] event in
      guard self != nil else { return }
      let dict = Converter.eventToDict(event)
      let boxedDict = UncheckedSendableBox(dict as Any?)
      DispatchQueue.main.async {
        SDKEventEmitter.emit(withName: "AltcraftSdkEvent", body: boxedDict.get())
      }
    }
  }

  /// Unsubscribes from native SDK events.
  public func unsubscribeFromEvents() {
    SDKEvents.shared.unsubscribe()
    lock.lock()
    eventsSubscribed = false
    lock.unlock()
  }

  // MARK: - Authentication

  /// Registers a JWT provider that the native SDK calls when it needs a token.
  /// The provider requests the token from JS over the "altcraftJwtRequest" event.
  public func setJwtProvider() {
    AltcraftSDK.auth.setJWTProvider(provider: RnJwtProvider())
  }

  /// Resolves a pending JWT request issued by the native provider.
  ///
  /// - Parameters:
  ///   - requestId: Identifier of the pending request.
  ///   - token: JWT token or `nil` if unavailable.
  public func resolveJwt(_ requestId: NSNumber, token: String?) {
    JwtRequestStore.resolve(requestId: requestId.intValue, token: token)
  }

  /// Starts SDK authentication.
  public func authenticate() {
    AltcraftSDK.auth.authenticate()
  }

  /// Logs the user out.
  public func logOut() {
    AltcraftSDK.auth.logOut()
  }

  /// Returns whether the user is authenticated.
  ///
  /// - Parameter resolver: Promise resolver returning a boolean.
  public func isAuthenticated(resolver resolve: @escaping RCTPromiseResolveBlock) {
    let resolveBox = UncheckedSendableBox(resolve)
    Task {
      let authenticated = await AltcraftSDK.auth.isAuthenticated()
      DispatchQueue.main.async {
        resolveBox.get()(authenticated)
      }
    }
  }
}

/// Pending JWT request bridge between the native SDK and JS.
@objcMembers
public final class JwtRequestStore: NSObject, @unchecked Sendable {

  private static let lock = NSLock()
  private nonisolated(unsafe) static var requestSequence = 0
  private nonisolated(unsafe) static var pending: [Int: DispatchSemaphore] = [:]
  private nonisolated(unsafe) static var resolved: [Int: String?] = [:]

  private override init() { super.init() }

  /// Generates the next request identifier.
  static func nextRequestId() -> Int {
    lock.lock()
    defer { lock.unlock() }
    requestSequence += 1
    return requestSequence
  }

  /// Registers a pending request semaphore.
  static func register(_ requestId: Int, _ semaphore: DispatchSemaphore) {
    lock.lock()
    defer { lock.unlock() }
    pending[requestId] = semaphore
  }

  /// Blocks the calling thread until JS resolves the request or timeout.
  static func await(_ semaphore: DispatchSemaphore, timeout seconds: Int64 = 10) {
    semaphore.wait(timeout: .now() + .seconds(Int(seconds)))
  }

  /// Completes the request and returns the resolved token (or `nil`).
  static func take(_ requestId: Int) -> String? {
    lock.lock()
    defer { lock.unlock() }
    pending.removeValue(forKey: requestId)
    let token = resolved[requestId]
    resolved.removeValue(forKey: requestId)
    return token ?? nil
  }

  /// Resolves the pending request with the token from JS.
  static func resolve(requestId: Int, token: String?) {
    lock.lock()
    resolved[requestId] = token
    let semaphore = pending.removeValue(forKey: requestId)
    lock.unlock()
    semaphore?.signal()
  }
}

/// Bridges the native JWT provider to JS: the SDK requests a token
/// synchronously, the bridge emits an "altcraftJwtRequest" event and blocks
/// until JS replies via resolveJwt (bounded by a timeout).
final class RnJwtProvider: NSObject, JWTInterface, @unchecked Sendable {

  /// Returns a JWT token (synchronously).
  func getToken() -> String? {
    if Thread.isMainThread { return nil }

    let requestId = JwtRequestStore.nextRequestId()
    let semaphore = DispatchSemaphore(value: 0)
    JwtRequestStore.register(requestId, semaphore)

    let requestBox = UncheckedSendableBox(["requestId": requestId] as [String: Any])
    DispatchQueue.main.async {
      SDKEventEmitter.emit(withName: "altcraftJwtRequest", body: requestBox.get())
    }

    JwtRequestStore.await(semaphore)
    return JwtRequestStore.take(requestId)
  }
}
