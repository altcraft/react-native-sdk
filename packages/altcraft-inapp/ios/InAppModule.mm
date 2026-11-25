//  InAppModule.mm
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

// InAppModule.mm — In-App TurboModule: subscription management, screen
// tracking, triggers, and placement requests.

#import "InAppModule.h"

#import <Foundation/Foundation.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNSdkInApp/RNSdkInApp.h>
#endif

#if __has_include(<AltcraftRNInApp/AltcraftRNInApp-Swift.h>)
#import <AltcraftRNInApp/AltcraftRNInApp-Swift.h>
#else
#import "AltcraftRNInApp-Swift.h"
#endif

#pragma mark - Options -> NSDictionary

#ifdef RCT_NEW_ARCH_ENABLED

static NSDictionary *InAppCategoryToDict(const JS::NativeInApp::CategoryData &cat) {
  NSMutableDictionary *dict = [NSMutableDictionary new];
  dict[@"name"] = cat.name() ?: (id)kCFNull;
  dict[@"title"] = cat.title() ?: (id)kCFNull;
  dict[@"steady"] = cat.steady().has_value() ? @(cat.steady().value()) : (id)kCFNull;
  dict[@"active"] = cat.active().has_value() ? @(cat.active().value()) : (id)kCFNull;
  return dict;
}

static NSDictionary *InAppConvertSubscribeOptions(
    const JS::NativeInApp::InAppSubscribeOptions &options) {
  NSMutableDictionary *dict = [NSMutableDictionary new];
  dict[@"sync"] = options.sync().has_value() ? @(options.sync().value()) : (id)kCFNull;
  dict[@"profileFields"] = options.profileFields() ?: (id)kCFNull;
  dict[@"customFields"] = options.customFields() ?: (id)kCFNull;
  if (options.cats().has_value()) {
    const auto &cats = options.cats().value();
    NSMutableArray *arr = [NSMutableArray arrayWithCapacity:cats.size()];
    for (const auto &cat : cats) {
      [arr addObject:InAppCategoryToDict(cat)];
    }
    dict[@"cats"] = arr;
  } else {
    dict[@"cats"] = (id)kCFNull;
  }
  dict[@"replace"] = options.replace().has_value() ? @(options.replace().value()) : (id)kCFNull;
  dict[@"skipTriggers"] = options.skipTriggers().has_value()
      ? @(options.skipTriggers().value())
      : (id)kCFNull;
  return dict;
}

#endif  // RCT_NEW_ARCH_ENABLED

@implementation InAppModule

- (instancetype)init
{
  if (self = [super init]) {
    // Contribute the In-App configuration to the shared SDK builder used by
    // the core module during initialization.
    [InAppBridge registerInitContributor];
  }
  return self;
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeInAppSpecJSI>(params);
}
#endif  // RCT_NEW_ARCH_ENABLED

RCT_EXPORT_MODULE(InApp)


#ifdef RCT_NEW_ARCH_ENABLED
- (void)inAppSubscribe:(JS::NativeInApp::InAppSubscribeOptions &)options
{
  [InAppBridge.shared inAppSubscribe:InAppConvertSubscribeOptions(options)];
}

- (void)inAppUnsubscribe:(JS::NativeInApp::InAppSubscribeOptions &)options
{
  [InAppBridge.shared inAppUnsubscribe:InAppConvertSubscribeOptions(options)];
}
#endif  // RCT_NEW_ARCH_ENABLED

RCT_EXPORT_METHOD(setScreen:(NSString *)screen)
{
  [InAppBridge.shared setScreen:screen];
}

RCT_EXPORT_METHOD(trigger:(NSString *)name)
{
  [InAppBridge.shared trigger:name];
}

RCT_EXPORT_METHOD(getPlacements)
{
  [InAppBridge.shared getPlacements];
}

RCT_EXPORT_METHOD(setAnimation:(NSDictionary *)config)
{
  [InAppBridge.shared setAnimation:config];
}

RCT_EXPORT_METHOD(jsonContentSubscribe)
{
  [InAppBridge.shared jsonContentSubscribe];
}

RCT_EXPORT_METHOD(jsonContentUnsubscribe)
{
  [InAppBridge.shared jsonContentUnsubscribe];
}

@end
