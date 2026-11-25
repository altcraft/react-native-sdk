//
//  JWTProvider.swift
//  Example
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import Foundation
import AltcraftCore

class JWTProvider: JWTInterface {
  private let suiteName = "group.altcraft.react.native.example"
  private let key = "JWT_KEY"

  func getToken() -> String? {
    let token = UserDefaults(suiteName: suiteName)?.string(forKey: key)
    return token
  }
}
