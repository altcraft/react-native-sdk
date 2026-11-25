//
//  APNSProvider.swift
//  Example
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import Foundation
import AltcraftPush

class APNSProvider: APNSInterface {
    func getToken(completion: @escaping (String?) -> Void) {
        let token = getAPNsTokenStringFromUserDefault()
        completion(token)
    }
}
