//
//  JWTProvider.swift
//  PushService
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import Altcraft
import Foundation

class JWTProvider: JWTInterface {
    func getToken() -> String? {
        let jwt = UserDefaults(suiteName: NotificationService().appGroupID)?.string(forKey: "JWT_KEY")
        return jwt
    }
}
