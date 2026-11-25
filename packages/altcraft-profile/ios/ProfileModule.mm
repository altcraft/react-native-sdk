//  ProfileModule.mm
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

// ProfileModule.mm — profile TurboModule: profile field updates.

#import "ProfileModule.h"

#import <Foundation/Foundation.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNSdkProfile/RNSdkProfile.h>
#endif

#if __has_include(<AltcraftRNProfile/AltcraftRNProfile-Swift.h>)
#import <AltcraftRNProfile/AltcraftRNProfile-Swift.h>
#else
#import "AltcraftRNProfile-Swift.h"
#endif

@implementation ProfileModule

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeProfileSpecJSI>(params);
}
#endif  // RCT_NEW_ARCH_ENABLED

RCT_EXPORT_MODULE(Profile)


#ifdef RCT_NEW_ARCH_ENABLED
- (void)updateProfileFields:(JS::NativeProfile::UpdateProfileOptions &)options
{
  NSDictionary *opts = @{
    @"profileFields": options.profileFields() ?: (id)kCFNull,
    @"skipTriggers": options.skipTriggers().has_value()
        ? @(options.skipTriggers().value())
        : (id)kCFNull,
  };
  [ProfileBridge.shared updateProfileFields:opts];
}
#endif  // RCT_NEW_ARCH_ENABLED

@end
