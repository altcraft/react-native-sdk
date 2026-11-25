//  InAppAnimationBridge.swift
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

import Foundation
import UIKit
import AltcraftCore
import AltcraftInApp

/// Easing curves supported by the In-App show animation bridge.
enum InAppAnimationEasing: Sendable {
  case linear
  case easeIn
  case easeOut
  case easeInOut

  /// Parses an easing name sent from JavaScript.
  init?(rawValue: String) {
    switch rawValue {
    case "linear": self = .linear
    case "easeIn": self = .easeIn
    case "easeOut": self = .easeOut
    case "easeInOut": self = .easeInOut
    default: return nil
    }
  }

  /// Maps the easing curve to UIKit animation options.
  var options: UIView.AnimationOptions {
    switch self {
    case .linear: return [.curveLinear]
    case .easeIn: return [.curveEaseIn]
    case .easeOut: return [.curveEaseOut]
    case .easeInOut: return [.curveEaseInOut]
    }
  }
}

/// Parsed animation parameters for a single In-App campaign.
///
/// Neutral values are `alpha` 1, `translate` 0, `scale` 1 and `rotation` 0.
struct InAppAnimationSpec: Sendable {

  var duration: TimeInterval = 0.35
  var delay: TimeInterval = 0
  var easing: InAppAnimationEasing = .easeInOut
  var alphaFrom: CGFloat?
  var alphaTo: CGFloat?
  var translateXFrom: CGFloat?
  var translateXTo: CGFloat?
  var translateYFrom: CGFloat?
  var translateYTo: CGFloat?
  var scaleXFrom: CGFloat?
  var scaleXTo: CGFloat?
  var scaleYFrom: CGFloat?
  var scaleYTo: CGFloat?
  var rotationFrom: CGFloat?
  var rotationTo: CGFloat?

  init(dictionary: NSDictionary) {
    if let durationMs = dictionary.number("durationMs") {
      duration = TimeInterval(truncating: durationMs) / 1000
    }
    if let delayMs = dictionary.number("delayMs") {
      delay = TimeInterval(truncating: delayMs) / 1000
    }
    if let rawEasing = dictionary.string("easing"),
       let parsedEasing = InAppAnimationEasing(rawValue: rawEasing) {
      easing = parsedEasing
    }
    alphaFrom = dictionary.cgFloat("alphaFrom")
    alphaTo = dictionary.cgFloat("alphaTo")
    translateXFrom = dictionary.cgFloat("translateXFrom")
    translateXTo = dictionary.cgFloat("translateXTo")
    translateYFrom = dictionary.cgFloat("translateYFrom")
    translateYTo = dictionary.cgFloat("translateYTo")
    scaleXFrom = dictionary.cgFloat("scaleXFrom")
    scaleXTo = dictionary.cgFloat("scaleXTo")
    scaleYFrom = dictionary.cgFloat("scaleYFrom")
    scaleYTo = dictionary.cgFloat("scaleYTo")
    rotationFrom = dictionary.cgFloat("rotationFrom")
    rotationTo = dictionary.cgFloat("rotationTo")
  }

  /// Whether the spec changes opacity or the transform matrix.
  var hasAnimatedProperties: Bool {
    alphaFrom != nil || alphaTo != nil || hasTransform
  }

  /// Whether the spec animates any transform channel.
  private var hasTransform: Bool {
    translateXFrom != nil || translateXTo != nil ||
      translateYFrom != nil || translateYTo != nil ||
      scaleXFrom != nil || scaleXTo != nil ||
      scaleYFrom != nil || scaleYTo != nil ||
      rotationFrom != nil || rotationTo != nil
  }

  /// Applies the starting state without running an animation.
  @MainActor
  func prepare(_ view: UIView) {
    if alphaFrom != nil || alphaTo != nil {
      view.alpha = alphaFrom ?? 1
    }
    if hasTransform {
      view.transform = transform(from: true)
    }
  }

  /// Applies the target state; must run inside a `UIView` animation block.
  @MainActor
  func animate(_ view: UIView) {
    if alphaFrom != nil || alphaTo != nil {
      view.alpha = alphaTo ?? 1
    }
    if hasTransform {
      view.transform = transform(from: false)
    }
  }

  /// Builds the transform matrix from either the starting or the target values.
  private func transform(from: Bool) -> CGAffineTransform {
    var transform = CGAffineTransform.identity
    transform = transform.translatedBy(
      x: from ? translateXFrom ?? 0 : translateXTo ?? 0,
      y: from ? translateYFrom ?? 0 : translateYTo ?? 0
    )
    transform = transform.scaledBy(
      x: from ? scaleXFrom ?? 1 : scaleXTo ?? 1,
      y: from ? scaleYFrom ?? 1 : scaleYTo ?? 1
    )
    let rotation = from ? rotationFrom ?? 0 : rotationTo ?? 0
    transform = transform.rotated(by: rotation * .pi / 180)
    return transform
  }
}

/// Stores the In-App animation configuration and applies it on every show.
///
/// The native SDK keeps a single global animation listener, therefore the
/// bridge registers exactly one listener and resolves the configuration by
/// campaign identifier for each presented In-App view.
final class InAppAnimationBridge: @unchecked Sendable {

  /// Shared singleton instance used by the React Native bridge.
  static let shared = InAppAnimationBridge()

  private let lock = NSLock()
  private var defaultSpec: InAppAnimationSpec?
  private var campaignSpecs: [String: InAppAnimationSpec] = [:]
  private var isRegistered = false

  private init() {}

  /// Sets or clears the animation configuration.
  ///
  /// - Parameter config: Animation configuration, or `nil` to disable it.
  func set(config: NSDictionary?) {
    let parsed = InAppAnimationBridge.parse(config)
    lock.lock()
    defaultSpec = parsed.default
    campaignSpecs = parsed.campaigns
    lock.unlock()
    registerListenerIfNeeded()
  }

  /// Parses the configuration dictionary sent from JavaScript.
  private static func parse(
    _ config: NSDictionary?
  ) -> (default: InAppAnimationSpec?, campaigns: [String: InAppAnimationSpec]) {
    guard let config else {
      return (nil, [:])
    }
    let defaultSpec = (config["default"] as? NSDictionary)
      .map { InAppAnimationSpec(dictionary: $0) }
    var campaigns: [String: InAppAnimationSpec] = [:]
    if let entries = config["campaigns"] as? [String: Any] {
      for (key, value) in entries {
        campaigns[key] = InAppAnimationSpec(
          dictionary: (value as? NSDictionary) ?? NSDictionary()
        )
      }
    }
    return (defaultSpec, campaigns)
  }

  /// Registers the global native animation listener once.
  private func registerListenerIfNeeded() {
    lock.lock()
    let shouldRegister = !isRegistered
    isRegistered = true
    lock.unlock()
    guard shouldRegister else { return }
    AltcraftSDK.inApp.animation { [weak self] animator in
      self?.handle(animator)
    }
  }

  /// Applies the resolved configuration to a presented In-App view.
  @MainActor
  private func handle(_ animator: InAppAnimator) {
    guard let spec = resolve(companyId: animator.companyId),
          spec.hasAnimatedProperties else {
      return
    }
    animator.prepare { view in
      spec.prepare(view)
    }
    animator.animate(
      duration: spec.duration,
      delay: spec.delay,
      options: spec.easing.options,
      animations: { view in
        spec.animate(view)
      },
      completion: nil
    )
  }

  /// Resolves the spec for a campaign, falling back to the default spec.
  private func resolve(companyId: Int) -> InAppAnimationSpec? {
    lock.lock()
    defer { lock.unlock() }
    if let spec = campaignSpecs[String(companyId)] {
      return spec
    }
    return defaultSpec
  }
}

// MARK: - Dictionary accessors

private extension NSDictionary {

  /// Returns a string value, treating `NSNull` as missing.
  func string(_ key: String) -> String? {
    self[key] as? String
  }

  /// Returns a number value, treating `NSNull` as missing.
  func number(_ key: String) -> NSNumber? {
    self[key] as? NSNumber
  }

  /// Returns a `CGFloat` value, treating `NSNull` as missing.
  func cgFloat(_ key: String) -> CGFloat? {
    number(key).map { CGFloat(truncating: $0) }
  }
}
