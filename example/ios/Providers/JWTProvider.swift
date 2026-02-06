//
//  JWTProvider.swift
//  Example
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import Foundation
import Altcraft

class JWTProvider: JWTInterface {
  func getToken() -> String? {
    let jwt = UserDefaults(suiteName: "group.altcraft.react.native.example")?.string(forKey: "JWT_KEY")
    return jwt
  }
}
