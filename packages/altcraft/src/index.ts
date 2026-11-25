/**
 * Altcraft SDK for React Native.
 *
 * Umbrella package for the Altcraft push notification platform. Provides the
 * full `AltcraftSDK` API as a pure-JS facade over the connected modules
 * (initialization is delegated to `@altcraft/core`).
 *
 * For modular usage, depend on the individual module packages instead:
 * `@altcraft/core`, `@altcraft/push`, `@altcraft/inapp`, `@altcraft/target`,
 * `@altcraft/profile`.
 */
export { AltcraftSDK } from './altcraft_sdk';

export {
  AltcraftCore,
  AltcraftCorePlatform,
  TurboModuleAltcraftCore,
  AltcraftChannels,
  actionField,
  ActionFieldBuilder,
  Utilities,
  AltcraftException,
  coreModuleEvents,
} from '@altcraft/core';
export type { CoreModuleEvents } from '@altcraft/core';

export {
  AltcraftPush,
  AltcraftPushPlatform,
  TurboModuleAltcraftPush,
  pushModuleEvents,
} from '@altcraft/push';
export type {
  PushSubscribeOptions,
  PushEventOptions,
  PushModuleEvents,
  TokenData,
} from '@altcraft/push';

export {
  AltcraftInApp,
  AltcraftInAppPlatform,
  TurboModuleAltcraftInApp,
  inAppModuleEvents,
} from '@altcraft/inapp';
export type {
  InAppAnimationConfig,
  InAppAnimationEasing,
  InAppAnimationSpec,
  InAppSubscribeOptions,
  InAppModuleEvents,
  JsonContentApi,
  JsonContentHandler,
} from '@altcraft/inapp';

export {
  AltcraftTarget,
  AltcraftTargetPlatform,
  TurboModuleAltcraftTarget,
  targetModuleEvents,
  emailSubscription,
  smsSubscription,
  pushSubscription,
  ccDataSubscription,
} from '@altcraft/target';
export type {
  MobileEventOptions,
  TargetModuleEvents,
  Subscription,
  EmailSubscription,
  SmsSubscription,
  PushSubscription,
  CcDataSubscription,
  UTM,
} from '@altcraft/target';

export {
  AltcraftProfile,
  AltcraftProfilePlatform,
  TurboModuleAltcraftProfile,
  profileModuleEvents,
} from '@altcraft/profile';
export type { UpdateProfileOptions, ProfileModuleEvents } from '@altcraft/profile';

export type {
  AltcraftConfig,
  AppInfo,
  CategoryData,
  ResponseWithHttpCode,
  SdkEvent,
} from '@altcraft/core';
