//  PushModule.h
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

#pragma once

#ifdef __OBJC__

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNSdkPush/RNSdkPush.h>
#endif

NS_EXTENSION_UNAVAILABLE_IOS("Altcraft RN bridge is unavailable in app extensions.")
#ifdef RCT_NEW_ARCH_ENABLED
@interface PushModule : NSObject <NativePushSpec>
#else
@interface PushModule : NSObject
#endif
@end

#endif // __OBJC__
