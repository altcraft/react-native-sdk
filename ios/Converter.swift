// Converter.swift
import Foundation

enum Converter {

  // MARK: - Public

  /// Any? -> Any?
  /// - NSNull -> nil
  /// - NSNumber -> Bool / Int / Int64 / Double
  /// - NSString -> String (and if it looks like JSON "{...}" or "[...]" it will be parsed into object)
  /// - NSDictionary/NSArray -> recursively converted
  /// - Date -> ISO8601 string
  /// - Data -> base64 string
  static func toAny(_ value: Any?) -> Any? {
    guard let value else { return nil }
    if value is NSNull { return nil }

    // Bool may come as NSNumber, detect it explicitly.
    if let b = value as? NSNumber, isCFBoolean(b) {
      return b.boolValue
    }

    if let n = value as? NSNumber {
      return normalizeNumber(n)
    }

    if let s = value as? NSString {
      return parseJSONIfPossible(String(s))
    }

    if let d = value as? Date {
      return ISO8601DateFormatter().string(from: d)
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

    // Swift-native containers (defensive).
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
      return arr.map { toAny($0) ?? NSNull() }
    }

    // Fallback: keep it safe for logging/bridge, but avoid relying on this.
    return String(describing: value)
  }

  /// NSDictionary? -> [String: Any?]?
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

  /// NSArray? -> [Any]?
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
  /// If it cannot be represented as a property list, it falls back to JSON string when possible.
  static func toPropertyListValue(_ value: Any?) -> Any? {
    guard let value = toAny(value) else { return nil }

    // Supported plist primitives.
    if value is String || value is Bool || value is Int || value is Int64 || value is Double || value is Float || value is Data || value is Date {
      // Int64 is stored as NSNumber in UserDefaults.
      if let i64 = value as? Int64 { return NSNumber(value: i64) }
      if let f = value as? Float { return NSNumber(value: f) }
      return value
    }

    if let n = value as? NSNumber {
      if isCFBoolean(n) { return n.boolValue }
      return n
    }

    if let arr = value as? [Any] {
      let mapped: [Any] = arr.compactMap { element in
        if element is NSNull { return nil }
        return toPropertyListValue(element)
      }
      return mapped
    }

    if let dict = value as? [String: Any?] {
      var mapped: [String: Any] = [:]
      mapped.reserveCapacity(dict.count)
      for (k, v) in dict {
        if let pv = toPropertyListValue(v) {
          mapped[k] = pv
        }
      }
      return mapped
    }

    if let dict = value as? [String: Any] {
      var mapped: [String: Any] = [:]
      mapped.reserveCapacity(dict.count)
      for (k, v) in dict {
        if let pv = toPropertyListValue(v) {
          mapped[k] = pv
        }
      }
      return mapped
    }

    // Fallback: JSON string.
    if JSONSerialization.isValidJSONObject(value) {
      if let data = try? JSONSerialization.data(withJSONObject: value, options: []),
         let json = String(data: data, encoding: .utf8) {
        return json
      }
    }

    return String(describing: value)
  }

  // MARK: - Internals

  private static func isCFBoolean(_ n: NSNumber) -> Bool {
    CFGetTypeID(n) == CFBooleanGetTypeID()
  }

  /// NSNumber(JS number) -> Int / Int64 / Double
  /// - If it has fractional part -> Double
  /// - Else Int if it fits, otherwise Int64
  private static func normalizeNumber(_ n: NSNumber) -> Any {
    let d = n.doubleValue
    if !d.isFinite { return d }

    let asInt64 = Int64(d)
    let isInteger = d == Double(asInt64)
    if !isInteger { return d }

    if asInt64 >= Int64(Int.min) && asInt64 <= Int64(Int.max) {
      return Int(asInt64)
    } else {
      return asInt64
    }
  }

  /// If a string looks like a JSON object/array, tries to parse and recursively normalize it.
  private static func parseJSONIfPossible(_ s: String) -> Any {
    let trimmed = s.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return "" }

    guard let first = trimmed.first, first == "{" || first == "[" else {
      return s
    }

    guard let data = trimmed.data(using: .utf8) else { return s }
    guard let obj = try? JSONSerialization.jsonObject(with: data, options: []) else { return s }

    // obj will be NSArray/NSDictionary -> normalize through the same converter.
    return toAny(obj) ?? s
  }
}