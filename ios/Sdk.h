#pragma once

#ifdef __OBJC__

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <Sdk/Sdk.h>
#endif

NS_EXTENSION_UNAVAILABLE_IOS("Altcraft RN bridge is unavailable in app extensions.")
#ifdef RCT_NEW_ARCH_ENABLED
@interface Sdk : NSObject <NativeSdkSpec>
#else
@interface Sdk : NSObject
#endif
@end

#endif // __OBJC__