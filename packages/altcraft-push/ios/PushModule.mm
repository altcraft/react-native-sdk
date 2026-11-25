//  PushModule.mm
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

// PushModule.mm — push TurboModule: subscription management, token handling,
// provider priority management, and push event reporting.

#import "PushModule.h"

#import <Foundation/Foundation.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNSdkPush/RNSdkPush.h>
#endif

#if __has_include(<AltcraftRNPush/AltcraftRNPush-Swift.h>)
#import <AltcraftRNPush/AltcraftRNPush-Swift.h>
#else
#import "AltcraftRNPush-Swift.h"
#endif

#pragma mark - Options -> NSDictionary

#ifdef RCT_NEW_ARCH_ENABLED

static NSDictionary *PushCategoryToDict(const JS::NativePush::CategoryData &cat) {
  NSMutableDictionary *dict = [NSMutableDictionary new];
  dict[@"name"] = cat.name() ?: (id)kCFNull;
  dict[@"title"] = cat.title() ?: (id)kCFNull;
  dict[@"steady"] = cat.steady().has_value() ? @(cat.steady().value()) : (id)kCFNull;
  dict[@"active"] = cat.active().has_value() ? @(cat.active().value()) : (id)kCFNull;
  return dict;
}

static void PushFillSubscribeOptions(
    NSMutableDictionary *dict,
    const JS::NativePush::PushSubscribeOptions &options) {
  dict[@"sync"] = options.sync().has_value() ? @(options.sync().value()) : (id)kCFNull;
  dict[@"profileFields"] = options.profileFields() ?: (id)kCFNull;
  dict[@"customFields"] = options.customFields() ?: (id)kCFNull;
  if (options.cats().has_value()) {
    const auto &cats = options.cats().value();
    NSMutableArray *arr = [NSMutableArray arrayWithCapacity:cats.size()];
    for (const auto &cat : cats) {
      [arr addObject:PushCategoryToDict(cat)];
    }
    dict[@"cats"] = arr;
  } else {
    dict[@"cats"] = (id)kCFNull;
  }
  dict[@"replace"] = options.replace().has_value() ? @(options.replace().value()) : (id)kCFNull;
  dict[@"skipTriggers"] = options.skipTriggers().has_value()
      ? @(options.skipTriggers().value())
      : (id)kCFNull;
}

static NSDictionary *PushConvertSubscribeOptions(
    const JS::NativePush::PushSubscribeOptions &options) {
  NSMutableDictionary *dict = [NSMutableDictionary new];
  PushFillSubscribeOptions(dict, options);
  return dict;
}

static NSDictionary *PushConvertEventOptions(
    const JS::NativePush::PushEventOptions &options) {
  NSMutableDictionary *dict = [NSMutableDictionary new];
  dict[@"message"] = options.message() ?: (id)kCFNull;
  dict[@"messageUID"] = options.messageUID() ?: (id)kCFNull;
  return dict;
}

#endif  // RCT_NEW_ARCH_ENABLED

@implementation PushModule

- (instancetype)init
{
  if (self = [super init]) {
    // Contribute the push configuration to the shared SDK builder used by the
    // core module during initialization.
    [PushBridge registerInitContributor];
  }
  return self;
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativePushSpecJSI>(params);
}
#endif  // RCT_NEW_ARCH_ENABLED

RCT_EXPORT_MODULE(Push)


#pragma mark - Subscription

#ifdef RCT_NEW_ARCH_ENABLED
- (void)pushSubscribe:(JS::NativePush::PushSubscribeOptions &)options
{
  [PushBridge.shared pushSubscribe:PushConvertSubscribeOptions(options)];
}

- (void)pushSuspend:(JS::NativePush::PushSubscribeOptions &)options
{
  [PushBridge.shared pushSuspend:PushConvertSubscribeOptions(options)];
}

- (void)pushUnSubscribe:(JS::NativePush::PushSubscribeOptions &)options
{
  [PushBridge.shared pushUnSubscribe:PushConvertSubscribeOptions(options)];
}
#endif  // RCT_NEW_ARCH_ENABLED

- (void)unSuspendPushSubscription:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject
{
  [PushBridge.shared unSuspendPushSubscriptionWithResolver:resolve rejecter:reject];
}

- (void)getStatusOfLatestSubscription:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject
{
  [PushBridge.shared getStatusOfLatestSubscriptionWithResolver:resolve rejecter:reject];
}

- (void)getStatusForCurrentSubscription:(RCTPromiseResolveBlock)resolve
                                 reject:(RCTPromiseRejectBlock)reject
{
  [PushBridge.shared getStatusForCurrentSubscriptionWithResolver:resolve rejecter:reject];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (void)getStatusOfLatestSubscriptionForProvider:
            (JS::NativePush::SpecGetStatusOfLatestSubscriptionForProviderOptions &)options
                                         resolve:(RCTPromiseResolveBlock)resolve
                                          reject:(RCTPromiseRejectBlock)reject
{
  NSDictionary *opts = @{ @"provider": options.provider() ?: (id)kCFNull };
  [PushBridge.shared getStatusOfLatestSubscriptionForProvider:opts
                                                     resolver:resolve
                                                     rejecter:reject];
}
#endif  // RCT_NEW_ARCH_ENABLED

#pragma mark - Push payload (string-only)

- (void)takePush:(NSDictionary * _Nullable)message
{
  [PushBridge.shared takePush:message];
}

#pragma mark - Token API

- (void)getPushToken:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject
{
  [PushBridge.shared getPushTokenWithResolver:resolve];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (void)setPushToken:(JS::NativePush::SpecSetPushTokenOptions &)options
{
  NSDictionary *opts = @{
    @"provider": options.provider() ?: @"",
    @"token": options.token() ?: (id)kCFNull,
  };
  [PushBridge.shared setPushToken:opts];
}
#endif  // RCT_NEW_ARCH_ENABLED

#pragma mark - Token management

- (void)forcedTokenUpdate:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
  [PushBridge.shared forcedTokenUpdateWithResolver:resolve rejecter:reject];
}

- (void)deleteDeviceToken:(NSString *)provider
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
  [PushBridge.shared deleteDeviceToken:provider resolver:resolve rejecter:reject];
}

- (void)changePushProviderPriorityList:(NSArray *)priorityList
                               resolve:(RCTPromiseResolveBlock)resolve
                                reject:(RCTPromiseRejectBlock)reject
{
  [PushBridge.shared changePushProviderPriorityList:priorityList
                                           resolver:resolve
                                           rejecter:reject];
}

#pragma mark - Push receiver helpers

- (NSNumber *)isAltcraftPush:(NSDictionary * _Nullable)message
{
  return @([PushBridge.shared isAltcraftPush:message]);
}

#pragma mark - Permissions

- (void)requestNotificationPermission:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject
{
  [PushBridge.shared requestNotificationPermissionWithResolver:resolve];
}

#pragma mark - Push events

#ifdef RCT_NEW_ARCH_ENABLED
- (void)deliveryEvent:(JS::NativePush::PushEventOptions &)options
{
  [PushBridge.shared deliveryEvent:PushConvertEventOptions(options)];
}

- (void)openEvent:(JS::NativePush::PushEventOptions &)options
{
  [PushBridge.shared openEvent:PushConvertEventOptions(options)];
}
#endif  // RCT_NEW_ARCH_ENABLED

@end
