//  Converter.swift
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

import Foundation
import AltcraftCore

/// RN bridge converters for the modular Altcraft SDK.
@objcMembers
public final class Converter: NSObject {

  /// Converts an arbitrary NSDictionary into `[String: Any?]`.
  public static func toAnyDict(_ dict: NSDictionary?) -> [String: Any?]? {
    guard let dict else { return nil }
    var result: [String: Any?] = [:]
    for (k, v) in dict {
      result[k as? String ?? String(describing: k)] = toAny(v)
    }
    return result
  }

  /// Converts an arbitrary value into a JSON-like Swift value.
  public static func toAny(_ value: Any?) -> Any? {
    if value == nil || value is NSNull { return nil }
    if let s = value as? String { return s }
    if let b = value as? Bool { return b }
    if let n = value as? NSNumber { return normalizeNumber(n) }
    if let dict = value as? NSDictionary { return toAnyDict(dict) }
    if let arr = value as? NSArray { return arr.map { toAny($0) } }
    return value
  }

  /// Normalizes an NSNumber into Int / Double / Bool.
  private static func normalizeNumber(_ n: NSNumber) -> Any {
    let objCType = String(cString: n.objCType)
    if objCType == "c" { return n.boolValue }
    if objCType == "i" || objCType == "l" || objCType == "q" { return n.intValue }
    if objCType == "f" || objCType == "d" {
      let d = n.doubleValue
      if d == d.rounded() && abs(d) < 9_007_199_254_740_992 {
        return Int(d)
      }
      return d
    }
    return n
  }

  /// Creates an `AppInfo` from a configuration dictionary entry.
  public static func appInfo(from value: Any?) -> AppInfo? {
    guard let dict = value as? NSDictionary else { return nil }
    return AppInfo(
      appID: dict["appID"] as? String ?? "",
      appIID: dict["appIID"] as? String ?? "",
      appVer: dict["appVer"] as? String ?? "1.0.0"
    )
  }

  /// Converts a Dart-style category dictionary into native `CategoryData`.
  public static func categoryData(from dict: [String: Any]) -> CategoryData {
    CategoryData(
      name: dict["name"] as? String,
      title: dict["title"] as? String,
      steady: dict["steady"] as? Bool,
      active: dict["active"] as? Bool
    )
  }

  /// Converts a native category model into an RN-safe dictionary.
  public static func categoryToDict(_ category: CategoryData) -> [String: Any?] {
    [
      "name": category.name as Any?,
      "title": category.title as Any?,
      "steady": category.steady as Any?,
      "active": category.active as Any?
    ]
  }

  /// Converts a native subscription model into an RN-safe dictionary.
  public static func subscriptionToDict(_ subscription: SubscriptionData) -> [String: Any?] {
    [
      "subscriptionId": subscription.subscriptionId as Any?,
      "hashId": subscription.hashId as Any?,
      "provider": subscription.provider as Any?,
      "status": subscription.status as Any?,
      "fields": subscription.fields.map { $0.mapValues { jsonValueToCompatible($0) } } as Any?,
      "cats": subscription.cats.map { $0.map { categoryToDict($0) } } as Any?
    ]
  }

  /// Converts a native profile model into an RN-safe dictionary.
  public static func profileToDict(_ profile: ProfileData) -> [String: Any?] {
    [
      "id": profile.id as Any?,
      "status": profile.status as Any?,
      "acid": profile.acid as Any?,
      "isTest": profile.isTest as Any?,
      "subscription": profile.subscription.map { subscriptionToDict($0) } as Any?
    ]
  }

  /// Converts a native response model into an RN-safe dictionary.
  public static func responseToDict(
    _ response: ResponseModel.ResponseWithHttpCode<ResponseModel.ResponseWithProfile>?
  ) -> [String: Any?]? {
    guard let response else { return nil }
    let resp: Any? = response.response.map { body -> [String: Any?] in
      [
        "error": body.error as Any?,
        "errorText": body.errorText as Any?,
        "profile": body.profile.map { profileToDict($0) } as Any?
      ]
    } ?? NSNull()
    return [
      "httpCode": response.httpCode as Any?,
      "response": resp
    ]
  }

  /// Converts a native Altcraft event into an RN-safe dictionary.
  public static func eventToDict(_ event: Event) -> [String: Any?] {
    let type: String
    if event is RetryEvent { type = "retryError" }
    else if event is ErrorEvent { type = "error" }
    else { type = "event" }

    let code = (event.value?["http_code"] as? NSNumber)?.intValue

    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS"
    formatter.locale = Locale(identifier: "en_US")
    formatter.timeZone = TimeZone.current
    let timestamp = formatter.string(from: event.date)

    return [
      "function": event.function,
      "code": code.map { NSNumber(value: $0) } ?? NSNull(),
      "message": event.message ?? "",
      "type": type,
      "value": sanitizeValue(event.value) ?? NSNull(),
      "timestamp": timestamp
    ]
  }

  /// Converts nested SDK event values into RN-safe values.
  public static func sanitizeValue(_ value: [String: Any?]?) -> [String: Any?]? {
    guard let value else { return nil }
    var sanitized: [String: Any?] = [:]
    for (key, val) in value {
      sanitized[key] = jsonCompatibleValue(val)
    }
    return sanitized
  }

  /// Converts a single value to a JSON-compatible type.
  public static func jsonCompatibleValue(_ value: Any?) -> Any? {
    if value == nil || value is NSNull { return NSNull() }
    if value is String { return value }
    if value is Bool { return value }
    if value is Int { return value }
    if value is Double { return value }
    if let f = value as? Float { return Double(f) }
    if let arr = value as? [Any] { return arr.map { jsonCompatibleValue($0) } }
    if let dict = value as? [String: Any?] {
      var result: [String: Any?] = [:]
      for (k, v) in dict { result[k] = jsonCompatibleValue(v) }
      return result
    }
    if let dict = value as? [String: Any] {
      var result: [String: Any?] = [:]
      for (k, v) in dict { result[k] = jsonCompatibleValue(v) }
      return result
    }
    if let profile = value as? ProfileData { return profileToDict(profile) }
    if let subscription = value as? SubscriptionData { return subscriptionToDict(subscription) }
    if let category = value as? CategoryData { return categoryToDict(category) }
    if let json = value as? JSONValue { return jsonValueToCompatible(json) }
    return String(describing: value)
  }

  /// Converts a dictionary into JSON-compatible `[String: Any?]`.
  public static func jsonCompatible(_ dict: [String: Any?]?) -> [String: Any?]? {
    guard let dict else { return nil }
    var result: [String: Any?] = [:]
    for (k, v) in dict {
      result[k] = jsonCompatibleValue(v)
    }
    return result
  }

  /// Converts a native `JSONValue` into a JSON-compatible value.
  public static func jsonValueToCompatible(_ value: JSONValue) -> Any? {
    switch value {
    case .string(let string): return string
    case .number(let number): return number
    case .bool(let bool): return bool
    case .null: return NSNull()
    case .array(let array): return array.map { jsonValueToCompatible($0) }
    case .object(let object): return object.mapValues { jsonValueToCompatible($0) }
    }
  }

  /// Converts a Swift dictionary into an Altcraft `JSONValue` dictionary.
  public static func toJV(_ dict: [String: Any?]?) -> [String: JSONValue]? {
    guard let dict else { return nil }
    var r: [String: JSONValue] = [:]
    for (k, v) in dict { r[k] = toJV(v) }
    return r
  }

  /// Converts a Swift value into an Altcraft `JSONValue`.
  public static func toJV(_ value: Any?) -> JSONValue {
    if let s = value as? String { return .string(s) }
    if let b = value as? Bool { return .bool(b) }
    if let n = value as? Int { return .number(Double(n)) }
    if let n = value as? Double { return .number(n) }
    if let a = value as? [Any] { return .array(a.map { toJV($0) }) }
    if let d = value as? [String: Any?] { return .object(toJV(d) ?? [:]) }
    if value is NSNull { return .null }
    return .string(String(describing: value))
  }
}
