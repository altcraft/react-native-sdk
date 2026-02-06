//
//  Converter.swift
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

import Foundation
import Altcraft

/// Utility namespace for bridging and normalizing values between React Native (Obj-C) and Swift.
///
/// `Converter` provides:
/// - Recursive normalization of Obj-C containers (`NSDictionary`/`NSArray`) into Swift-friendly
///   structures (`[String: Any?]`, `[Any]`).
/// - Safe conversion of RN values (`NSNull`, `NSNumber`, `NSString`) into predictable Swift types.
/// - Optional JSON parsing for strings that look like JSON objects/arrays.
/// - Helpers for building Altcraft SDK models (`AppInfo`, `UTM`, `Subscription`) from RN payloads.
/// - Conversion of arbitrary values into `UserDefaults`-compatible property list values.
///
/// All functions are stateless and intended to be used from the React Native bridge layer.
enum Converter {

  private static let iso8601: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    return f
  }()

  // MARK: - Public (Generic normalization)

  /// Converts arbitrary values into RN-safe Swift types.
  ///
  /// Rules:
  /// - `NSNull` -> `nil`
  /// - `NSNumber` -> `Bool` (if CFBoolean) or normalized numeric (`Int`/`Int64`/`Double`)
  /// - `NSString` -> `String` (and if it looks like JSON `{...}` or `[...]` it will be parsed)
  /// - `NSDictionary`/`NSArray` -> recursively converted
  /// - `Date` -> ISO8601 string
  /// - `Data` -> base64 string
  ///
  /// - Parameter value: Input value.
  /// - Returns: Normalized value.
  static func toAny(_ value: Any?) -> Any? {
    guard let value else { return nil }
    if value is NSNull { return nil }

    if let n = value as? NSNumber {
      if isCFBoolean(n) { return n.boolValue }
      return normalizeNumber(n)
    }

    if let s = value as? NSString {
      return parseJSONIfPossible(String(s))
    }

    if let d = value as? Date {
      return iso8601.string(from: d)
    }

    if let data = value as? Data {
      return data.base64EncodedString()
    }

    if let dict = value as? NSDictionary {
      return toAnyDict(dict)
    }

    if let arr = value as? NSArray {
      return toAnyArray(arr)
    }

    if let dict = value as? [String: Any?] {
      var out: [String: Any?] = [:]
      out.reserveCapacity(dict.count)
      for (k, v) in dict {
        out[k] = toAny(v)
      }
      return out
    }

    if let dict = value as? [String: Any] {
      var out: [String: Any] = [:]
      out.reserveCapacity(dict.count)
      for (k, v) in dict {
        out[k] = toAny(v) ?? NSNull()
      }
      return out
    }

    if let arr = value as? [Any] {
      var out: [Any] = []
      out.reserveCapacity(arr.count)
      for v in arr {
        out.append(toAny(v) ?? NSNull())
      }
      return out
    }

    return String(describing: value)
  }

  /// Converts `NSDictionary` into `[String: Any?]` recursively.
  ///
  /// - Parameter dict: Source dictionary.
  /// - Returns: Converted dictionary or `nil`.
  static func toAnyDict(_ dict: NSDictionary?) -> [String: Any?]? {
    guard let dict, dict.count > 0 else { return nil }
    var out: [String: Any?] = [:]
    out.reserveCapacity(dict.count)

    for (k, v) in dict {
      guard let key = k as? String else { continue }
      out[key] = toAny(v)
    }

    return out.isEmpty ? nil : out
  }

  /// Converts `NSArray` into `[Any]` recursively.
  ///
  /// - Parameter arr: Source array.
  /// - Returns: Converted array or `nil`.
  static func toAnyArray(_ arr: NSArray?) -> [Any]? {
    guard let arr, arr.count > 0 else { return nil }
    var out: [Any] = []
    out.reserveCapacity(arr.count)

    for item in arr {
      out.append(toAny(item) ?? NSNull())
    }

    return out.isEmpty ? nil : out
  }

  // MARK: - UserDefaults helpers

  /// Converts value into a type supported by UserDefaults:
  /// String/Bool/Int/Double/Data/Date/Array/Dictionary (property list).
  ///
  /// If it cannot be represented as a property list, it falls back to JSON string when possible.
  ///
  /// - Parameter value: Input value.
  /// - Returns: Property-list compatible value or `nil`.
  static func toPropertyListValue(_ value: Any?) -> Any? {
    guard let value = toAny(value) else { return nil }

    if value is String
        || value is Bool
        || value is Int
        || value is Int64
        || value is Double
        || value is Float
        || value is Data
        || value is Date {
      if let i64 = value as? Int64 { return NSNumber(value: i64) }
      if let f = value as? Float { return NSNumber(value: f) }
      return value
    }

    if let n = value as? NSNumber {
      if isCFBoolean(n) { return n.boolValue }
      return n
    }

    if let arr = value as? [Any] {
      var mapped: [Any] = []
      mapped.reserveCapacity(arr.count)
      for element in arr {
        if element is NSNull { continue }
        if let pv = toPropertyListValue(element) { mapped.append(pv) }
      }
      return mapped
    }

    if let dict = value as? [String: Any?] {
      var mapped: [String: Any] = [:]
      mapped.reserveCapacity(dict.count)
      for (k, v) in dict {
        if let pv = toPropertyListValue(v) { mapped[k] = pv }
      }
      return mapped
    }

    if let dict = value as? [String: Any] {
      var mapped: [String: Any] = [:]
      mapped.reserveCapacity(dict.count)
      for (k, v) in dict {
        if let pv = toPropertyListValue(v) { mapped[k] = pv }
      }
      return mapped
    }

    if JSONSerialization.isValidJSONObject(value) {
      if let data = try? JSONSerialization.data(withJSONObject: value, options: []),
         let json = String(data: data, encoding: .utf8) {
        return json
      }
    }

    return String(describing: value)
  }

  /// Converts `[String: Any?]` into `[String: String]` by stringifying values.
  ///
  /// - Parameter dict: Input dictionary.
  /// - Returns: A string map or `nil`.
  static func toStringMap(_ dict: [String: Any?]?) -> [String: String]? {
    guard let dict, !dict.isEmpty else { return nil }
    var out: [String: String] = [:]
    out.reserveCapacity(dict.count)
    for (k, v) in dict {
      guard let v else { continue }
      out[k] = String(describing: v)
    }
    return out.isEmpty ? nil : out
  }
  

  /// Builds `AppInfo` from a config value.
  ///
  /// - Parameter any: `NSDictionary` / `[String: Any]` / `[String: Any?]` or `nil`.
  /// - Returns: `AppInfo` or `nil` if all fields are blank.
  static func appInfo(from any: Any?) -> AppInfo? {
    guard let map = normalizeStringAnyMap(any) else { return nil }

    let appID = (map["appID"] as? String) ?? ""
    let appIID = (map["appIID"] as? String) ?? ""
    let appVer = (map["appVer"] as? String) ?? ""

    if appID.isEmpty && appIID.isEmpty && appVer.isEmpty { return nil }
    return AppInfo(appID: appID, appIID: appIID, appVer: appVer)
  }

  /// Converts an Objective-C array of category items into `[CategoryData]`.
  ///
  /// Supported item formats:
  /// - String: treated as category `name` with `active = true`
  /// - Map: supports `name`, `title`, `steady`, `active`
  ///
  /// - Parameter cats: Source array.
  /// - Returns: Category list or `nil`.
  static func toCats(_ cats: NSArray?) -> [CategoryData]? {
    guard let arr = cats, arr.count > 0 else { return nil }

    var out: [CategoryData] = []
    out.reserveCapacity(arr.count)

    for item in arr {
      if let s = item as? String, !s.isEmpty {
        out.append(CategoryData(name: s, title: nil, steady: nil, active: true))
        continue
      }

      if let m = item as? NSDictionary {
        let mm = toAnyDict(m) ?? [:]
        let name = mm["name"] as? String
        if name == nil { continue }

        let title = mm["title"] as? String
        let steady = mm["steady"] as? Bool
        let active = mm["active"] as? Bool

        out.append(CategoryData(name: name, title: title, steady: steady, active: active))
      }
    }

    return out.isEmpty ? nil : out
  }

  /// Converts `utm` dictionary into `UTM`.
  ///
  /// - Parameter utm: Source map (`NSDictionary`) from RN.
  /// - Returns: `UTM` or `nil`.
  static func toUTM(_ utm: NSDictionary?) -> UTM? {
    guard let map = toAnyDict(utm) else { return nil }
    return UTM(
      campaign: map["campaign"] as? String,
      content: map["content"] as? String,
      keyword: map["keyword"] as? String,
      medium: map["medium"] as? String,
      source: map["source"] as? String,
      temp: map["temp"] as? String
    )
  }

  /// Converts a React Native subscription map into a native `Subscription` instance.
  ///
  /// Supported `type` values:
  /// - `email`, `sms`, `push`, `cc_data`
  ///
  /// - Parameter subscriptionDict: Subscription dictionary from JS.
  /// - Returns: A native subscription object or `nil` if the input is invalid.
  static func toSubscription(_ subscriptionDict: NSDictionary?) -> Subscription? {
    guard let dict = subscriptionDict else { return nil }
    guard let type = stringFromAny(dict["type"]) else { return nil }

    let resourceId =
      intFromAny(dict["resource_id"]) ??
      intFromAny(dict["resourceId"])
    guard let resourceId else { return nil }

    let status = stringFromAny(dict["status"])
    let priority = intFromAny(dict["priority"])

    let customFields: [String: JSONValue]? =
      jsonValueDictFromAny(dict["custom_fields"]) ??
      jsonValueDictFromAny(dict["customFields"])

    let cats: [String]? = stringArrayFromAny(dict["cats"])

    switch type {
    case "email":
      guard let email = stringFromAny(
        dict["email"]
      ) else {
        return nil
      }
      return EmailSubscription(
        resourceId: resourceId,
        email: email, status: status,
        priority: priority,
        customFields: customFields,
        cats: cats
      )

    case "sms":
      guard let phone = stringFromAny(
        dict["phone"]
      ) else {
        return nil
      }
      return SmsSubscription(
        resourceId: resourceId,
        phone: phone,
        status: status,
        priority: priority,
        customFields: customFields,
        cats: cats
      )

    case "push":
      let provider = stringFromAny(dict["provider"])
      let subscriptionId =
        stringFromAny(dict["subscription_id"]) ??
        stringFromAny(dict["subscriptionId"])
      guard let provider, let subscriptionId else {
        return nil
      }
      return PushSubscription(
        resourceId: resourceId,
        provider: provider,
        subscriptionId: subscriptionId,
        status: status,
        priority: priority,
        customFields: customFields,
        cats: cats
      )

    case "cc_data":
      guard let channel = stringFromAny(
        dict["channel"]
      ), !channel.isEmpty else {
        return nil
      }
      guard let ccData = jsonValueDictFromAny(
        dict["cc_data"]
      ) ?? jsonValueDictFromAny(
        dict["ccData"]
      ) else {
        return nil
      }
      return CcDataSubscription(
        resourceId: resourceId,
        channel: channel,
        ccData: ccData,
        status: status,
        priority: priority,
        customFields: customFields,
        cats: cats
      )

    default:
      return nil
    }
  }
  
  /// Parses a JSON string into a `[String: JSONValue]` dictionary.
  ///
  /// - Parameter jsonString: JSON string representing an object.
  /// - Returns: A JSONValue dictionary or `nil` if parsing fails or the root is not an object.
  static func jsonStringToJSONValueDict(_ jsonString: String) -> [String: JSONValue]? {
    guard let data = jsonString.data(using: .utf8) else { return nil }

    do {
      let obj = try JSONSerialization.jsonObject(with: data, options: [])
      guard let dict = obj as? [String: Any] else { return nil }

      var out: [String: JSONValue] = [:]
      out.reserveCapacity(dict.count)

      for (k, v) in dict {
        out[k] = anyToJSONValuePublic(v)
      }
      return out
    } catch {
      return nil
    }
  }

  /// Parses a JSON string into a `[String]` array.
  ///
  /// - Parameter jsonString: JSON string representing an array.
  /// - Returns: A string array or `nil` if parsing fails or elements are not strings.
  static func jsonStringToStringArray(_ jsonString: String) -> [String]? {
    guard let data = jsonString.data(using: .utf8) else { return nil }

    do {
      let obj = try JSONSerialization.jsonObject(with: data, options: [])
      guard let array = obj as? [Any] else { return nil }
      if array.isEmpty { return [] }
      return array.compactMap { $0 as? String }
    } catch {
      return nil
    }
  }

  /// Converts an arbitrary Swift value into a `JSONValue` suitable for SDK APIs.
  ///
  /// - Parameter value: Input value.
  /// - Returns: Converted `JSONValue`.
  static func anyToJSONValuePublic(_ value: Any) -> JSONValue {
    if value is NSNull { return .null }
    if let s = value as? String { return .string(s) }
    if let b = value as? Bool { return .bool(b) }

    if let n = value as? NSNumber {
      if isCFBoolean(n) { return .bool(n.boolValue) }
      return .number(n.doubleValue)
    }

    if let dict = value as? [String: Any] {
      var out: [String: JSONValue] = [:]
      out.reserveCapacity(dict.count)
      for (k, v) in dict { out[k] = anyToJSONValuePublic(v) }
      return .object(out)
    }

    if let dict = value as? [String: Any?] {
      var out: [String: JSONValue] = [:]
      out.reserveCapacity(dict.count)
      for (k, v) in dict {
        if let v { out[k] = anyToJSONValuePublic(v) }
        else { out[k] = .null }
      }
      return .object(out)
    }

    if let arr = value as? [Any] {
      var out: [JSONValue] = []
      out.reserveCapacity(arr.count)
      for v in arr { out.append(anyToJSONValuePublic(v)) }
      return .array(out)
    }

    if let arr = value as? NSArray {
      var out: [JSONValue] = []
      out.reserveCapacity(arr.count)
      for v in arr { out.append(anyToJSONValuePublic(v)) }
      return .array(out)
    }

    return .string(String(describing: value))
  }

  /// Attempts to convert a value into `Int`.
  ///
  /// Supports `Int`, `NSNumber`, and numeric `String` values. Returns `nil` for `nil`/`NSNull` or
  /// non-numeric inputs.
  private static func intFromAny(_ any: Any?) -> Int? {
    guard let any else { return nil }
    if any is NSNull { return nil }
    if let i = any as? Int { return i }
    if let n = any as? NSNumber { return n.intValue }
    if let s = any as? String {
      let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
      if t.isEmpty { return nil }
      return Int(t)
    }
    return nil
  }

  /// Converts a value into `String` if possible.
  ///
  /// Supports `String`, `NSNumber`, and falls back to `String(describing:)`. Returns `nil` for
  /// `nil`/`NSNull`.
  private static func stringFromAny(_ any: Any?) -> String? {
    guard let any else { return nil }
    if any is NSNull { return nil }
    if let s = any as? String { return s }
    if let n = any as? NSNumber { return n.stringValue }
    return String(describing: any)
  }

  /// Converts a value into a `[String: JSONValue]` dictionary.
  ///
  /// Accepts a JSON object string, `NSDictionary`, `[String: Any]`, or `[String: Any?]`. Returns `nil`
  /// for `nil`/`NSNull` or incompatible inputs.
  private static func jsonValueDictFromAny(_ any: Any?) -> [String: JSONValue]? {
    guard let any else { return nil }
    if any is NSNull { return nil }

    if let s = any as? String {
      return jsonStringToJSONValueDict(s)
    }

    if let d = any as? NSDictionary {
      let dict = toAnyDict(d) ?? [:]
      var out: [String: JSONValue] = [:]
      out.reserveCapacity(dict.count)
      for (k, v) in dict {
        if let v { out[k] = anyToJSONValuePublic(v) }
        else { out[k] = .null }
      }
      return out
    }

    if let d = any as? [String: Any] {
      var out: [String: JSONValue] = [:]
      out.reserveCapacity(d.count)
      for (k, v) in d {
        out[k] = anyToJSONValuePublic(v)
      }
      return out
    }

    if let d = any as? [String: Any?] {
      var out: [String: JSONValue] = [:]
      out.reserveCapacity(d.count)
      for (k, v) in d {
        if let v { out[k] = anyToJSONValuePublic(v) }
        else { out[k] = .null }
      }
      return out
    }

    return nil
  }

  /// Converts a value into an array of `String`.
  ///
  /// Accepts a JSON array string, `[Any]`, or `NSArray`. Returns `nil` for `nil`/`NSNull` or
  /// incompatible inputs. Non-string elements are ignored.
  private static func stringArrayFromAny(_ any: Any?) -> [String]? {
    guard let any else { return nil }
    if any is NSNull { return nil }

    if let s = any as? String {
      return jsonStringToStringArray(s)
    }

    if let arr = any as? [Any] {
      if arr.isEmpty { return [] }
      return arr.compactMap { $0 as? String }
    }

    if let arr = any as? NSArray {
      if arr.count == 0 { return [] }
      return arr.compactMap { $0 as? String }
    }

    return nil
  }

  /// Normalizes a value into a `[String: Any]` map.
  ///
  /// Accepts `[String: Any]`, `[String: Any?]` (dropping `nil` values), or `NSDictionary`. Returns
  /// `nil` for `nil`/`NSNull` or incompatible inputs.
  private static func normalizeStringAnyMap(_ any: Any?) -> [String: Any]? {
    guard let any else { return nil }
    if any is NSNull { return nil }

    if let m = any as? [String: Any] { return m }

    if let mOpt = any as? [String: Any?] {
      var out: [String: Any] = [:]
      out.reserveCapacity(mOpt.count)
      for (k, v) in mOpt { if let v { out[k] = v } }
      return out.isEmpty ? nil : out
    }

    if let ns = any as? NSDictionary {
      return ns as? [String: Any]
    }

    return nil
  }

  /// Returns `true` if the given `NSNumber` represents a CoreFoundation boolean.
  private static func isCFBoolean(_ n: NSNumber) -> Bool {
    CFGetTypeID(n) == CFBooleanGetTypeID()
  }

  /// Normalizes `NSNumber` into `Int`, `Int64`, or `Double`.
  ///
  /// If the value has a fractional part, returns `Double`. If it is an integer, returns `Int` when it
  /// fits, otherwise `Int64`.
  private static func normalizeNumber(_ n: NSNumber) -> Any {
    let d = n.doubleValue
    if !d.isFinite { return d }

    let asInt64 = Int64(d)
    if d != Double(asInt64) { return d }

    if asInt64 >= Int64(Int.min) && asInt64 <= Int64(Int.max) {
      return Int(asInt64)
    } else {
      return asInt64
    }
  }

  /// Parses a string that looks like JSON (`{...}` or `[...]`) and normalizes the result.
  ///
  /// If parsing fails, returns the original string.
  private static func parseJSONIfPossible(_ s: String) -> Any {
    let trimmed = s.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty { return "" }

    guard let first = trimmed.first, first == "{" || first == "[" else {
      return s
    }

    guard let data = trimmed.data(using: .utf8) else { return s }
    guard let obj = try? JSONSerialization.jsonObject(
      with: data, options: []
    ) else { return s }

    return toAny(obj) ?? s
  }
}
