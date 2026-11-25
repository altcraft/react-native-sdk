//  TargetModule.mm
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

// TargetModule.mm — target TurboModule: mobile event tracking.

#import "TargetModule.h"

#import <Foundation/Foundation.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNSdkTarget/RNSdkTarget.h>
#endif

#if __has_include(<AltcraftRNTarget/AltcraftRNTarget-Swift.h>)
#import <AltcraftRNTarget/AltcraftRNTarget-Swift.h>
#else
#import "AltcraftRNTarget-Swift.h"
#endif

#pragma mark - Options -> NSDictionary

#ifdef RCT_NEW_ARCH_ENABLED

static NSDictionary *TargetConvertUtm(const JS::NativeTarget::UTM &utm) {
  NSMutableDictionary *dict = [NSMutableDictionary new];
  dict[@"campaign"] = utm.campaign() ?: (id)kCFNull;
  dict[@"content"] = utm.content() ?: (id)kCFNull;
  dict[@"keyword"] = utm.keyword() ?: (id)kCFNull;
  dict[@"medium"] = utm.medium() ?: (id)kCFNull;
  dict[@"source"] = utm.source() ?: (id)kCFNull;
  dict[@"temp"] = utm.temp() ?: (id)kCFNull;
  return dict;
}

static NSDictionary *TargetConvertMobileEventOptions(
    const JS::NativeTarget::MobileEventOptions &options) {
  NSMutableDictionary *dict = [NSMutableDictionary new];
  dict[@"sid"] = options.sid() ?: @"";
  dict[@"eventName"] = options.eventName() ?: @"";
  dict[@"sendMessageId"] = options.sendMessageId() ?: (id)kCFNull;
  dict[@"payload"] = options.payload() ?: (id)kCFNull;
  dict[@"matching"] = options.matching() ?: (id)kCFNull;
  dict[@"matchingType"] = options.matchingType() ?: (id)kCFNull;
  dict[@"profileFields"] = options.profileFields() ?: (id)kCFNull;
  dict[@"subscription"] = options.subscription() ?: (id)kCFNull;
  dict[@"utm"] = options.utm().has_value() ? TargetConvertUtm(options.utm().value()) : (id)kCFNull;
  return dict;
}

#endif  // RCT_NEW_ARCH_ENABLED

@implementation TargetModule

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeTargetSpecJSI>(params);
}
#endif  // RCT_NEW_ARCH_ENABLED

RCT_EXPORT_MODULE(Target)


#ifdef RCT_NEW_ARCH_ENABLED
- (void)sendTarget:(JS::NativeTarget::MobileEventOptions &)options
{
  [TargetBridge.shared sendTarget:TargetConvertMobileEventOptions(options)];
}
#endif  // RCT_NEW_ARCH_ENABLED

@end
