//  CoreModule.mm
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

// CoreModule.mm — core TurboModule: initialization, SDK events, JWT
// authentication, and data management.

#import "CoreModule.h"

#import <Foundation/Foundation.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNSdkCore/RNSdkCore.h>
#endif

#if __has_include(<AltcraftRNCore/AltcraftRNCore-Swift.h>)
#import <AltcraftRNCore/AltcraftRNCore-Swift.h>
#else
#import "AltcraftRNCore-Swift.h"
#endif

@implementation CoreModule

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeCoreSpecJSI>(params);
}
#endif  // RCT_NEW_ARCH_ENABLED

RCT_EXPORT_MODULE(Core)


#ifdef RCT_NEW_ARCH_ENABLED
- (void)initialize:(JS::NativeCore::AltcraftConfig &)config
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject
{
  NSMutableDictionary *cfg = [NSMutableDictionary new];
  cfg[@"apiUrl"] = config.apiUrl() ?: @"";
  cfg[@"rToken"] = config.rToken() ?: (id)kCFNull;
  cfg[@"enableLogging"] = config.enableLogging().has_value()
      ? @(config.enableLogging().value())
      : (id)kCFNull;
  cfg[@"moduleConfigs"] = config.moduleConfigs() ?: (id)kCFNull;
  if (config.appInfo().has_value()) {
    const auto &info = config.appInfo().value();
    cfg[@"appInfo"] = @{
      @"appID": info.appID() ?: (id)kCFNull,
      @"appIID": info.appIID() ?: (id)kCFNull,
      @"appVer": info.appVer() ?: (id)kCFNull,
    };
  } else {
    cfg[@"appInfo"] = (id)kCFNull;
  }

  [CoreBridge.shared initialize:cfg resolver:resolve rejecter:reject];
}
#endif  // RCT_NEW_ARCH_ENABLED

- (void)addListener:(NSString *)eventName { (void)eventName; }
- (void)removeListeners:(double)count { (void)count; }

- (void)subscribeToEvents
{
  [CoreBridge.shared subscribeToEvents];
}

- (void)unsubscribeFromEvents
{
  [CoreBridge.shared unsubscribeFromEvents];
}

- (void)clear:(RCTPromiseResolveBlock)resolve
       reject:(RCTPromiseRejectBlock)reject
{
  [CoreBridge.shared clearWithResolver:resolve rejecter:reject];
}

- (void)unlockInitialOperationsInThisSession
{
  [CoreBridge.shared unlockInitialOperationsInThisSession];
}

- (void)setUserDefaultsValue:(NSString * _Nullable)suiteName
                         key:(NSString *)key
                       value:(NSString * _Nullable)value
{
  [CoreBridge.shared setUserDefaultsValueWithSuiteName:suiteName key:key value:value];
}

- (void)setAppGroup:(NSString * _Nullable)groupName
{
  [CoreBridge.shared setAppGroup:groupName];
}

- (void)setJwtProvider
{
  [CoreBridge.shared setJwtProvider];
}

- (void)resolveJwt:(double)requestId
             token:(NSString * _Nullable)token
{
  [CoreBridge.shared resolveJwt:@(requestId) token:token];
}

- (void)authenticate
{
  [CoreBridge.shared authenticate];
}

- (void)logOut
{
  [CoreBridge.shared logOut];
}

- (void)isAuthenticated:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
  [CoreBridge.shared isAuthenticatedWithResolver:resolve];
}

@end
