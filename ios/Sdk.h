#pragma once

#ifdef __OBJC__

#import <Foundation/Foundation.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <Sdk/Sdk.h>

NS_EXTENSION_UNAVAILABLE_IOS("Altcraft RN bridge is unavailable in app extensions.")
@interface Sdk : NSObject <NativeSdkSpec>
#else
NS_EXTENSION_UNAVAILABLE_IOS("Altcraft RN bridge is unavailable in app extensions.")
@interface Sdk : NSObject
#endif

@end

#endif // __OBJC__
