//  NotificationService.swift
//  PushService
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import Altcraft
import UserNotifications

class NotificationService: UNNotificationServiceExtension {
    let appGroupID =  "group.altcraft.react.native.example"
    
    let jwtProvider = JWTProvider()
    
    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        AltcraftNSE.shared.setAppGroup(groupName: appGroupID)
        AltcraftNSE.shared.setJWTProvider(provider: jwtProvider)
      
        let jwt = UserDefaults(suiteName: NotificationService().appGroupID)?.string(forKey: "JWT_KEY")

      print("[AltcraftSDK-RN]: jwt:\(jwt?.suffix(4))")
      
        testSendMessage(request: request)
        testMobileEvent(request: request)
        
        if AltcraftNSE.shared.isAltcraftPush(request) {
            AltcraftNSE.shared.handleNotificationRequest(request: request, contentHandler: contentHandler)
        } else {
            contentHandler(request.content)
        }
    }
    override func serviceExtensionTimeWillExpire() {
        AltcraftNSE.shared.serviceExtensionTimeWillExpire()
    }
}
