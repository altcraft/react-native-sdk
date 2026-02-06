//
//  AppUserDefaults.swift
//  SdkExample
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import Foundation

private let apnsTokenKey = "apnsTokenString"
private let apnsTokenDataKey = "apnsTokenData"

/// Stores APNs token (converted from Data to hex String)
func setAPNsTokenInUserDefault(_ deviceToken: Data) {
    UserDefaults.standard.set(deviceToken, forKey: apnsTokenDataKey)
    let tokenString = deviceToken.map { String(format: "%02x", $0) }.joined()
    UserDefaults.standard.set(tokenString, forKey: apnsTokenKey)
}

/// Retrieves APNs token as String
func getAPNsTokenStringFromUserDefault() -> String? {
    return UserDefaults.standard.string(forKey: apnsTokenKey)
}

/// Retrieves APNs token as Data (если не сохранён, вернёт nil)
func getAPNsTokenDataFromUserDefaults() -> Data? {
    return UserDefaults.standard.data(forKey: apnsTokenDataKey)
}
