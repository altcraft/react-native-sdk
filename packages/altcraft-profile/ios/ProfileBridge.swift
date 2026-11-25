//  ProfileBridge.swift
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

import Foundation
import AltcraftRNCore
import AltcraftCore
import AltcraftProfile

/// Bridges RN profile module calls to the native Altcraft profile SDK.
///
/// Handles profile field updates.
@objcMembers
public final class ProfileBridge: NSObject, @unchecked Sendable {

  /// Shared singleton instance used by the React Native bridge.
  public static let shared = ProfileBridge()

  private override init() { super.init() }

  // MARK: - Profile

  /// Updates profile fields on the server.
  ///
  /// - Parameter options: Profile update options.
  public func updateProfileFields(_ options: NSDictionary?) {
    let args = Converter.toAnyDict(options) ?? [:]
    AltcraftSDK.profile.updateProfileFields(
      profileFields: Converter.toJV(args["profileFields"] as? [String: Any?]),
      skipTriggers: args["skipTriggers"] as? Bool
    )
  }
}
