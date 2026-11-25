/**
 * Altcraft SDK — target module for React Native.
 *
 * Provides mobile event tracking with payload, matching, subscription,
 * and UTM data.
 */
export { AltcraftTarget } from './altcraft_target';
export { AltcraftTargetPlatform } from './platform/altcraft_target_platform';
export { TurboModuleAltcraftTarget } from './platform/turbo_module_altcraft_target';
export type { MobileEventOptions } from './altcraft_target';
export { Utilities } from './altcraft_target';
export {
  emailSubscription,
  smsSubscription,
  pushSubscription,
  ccDataSubscription,
  subscriptionToNative,
  subscriptionToNativeMap,
} from './models/subscription';
export type {
  Subscription,
  EmailSubscription,
  SmsSubscription,
  PushSubscription,
  CcDataSubscription,
} from './models/subscription';
export { utmToNative, utmFromNative } from './models/utm';
export type { UTM } from './models/utm';
export { targetModuleEvents } from './module_events';
export type { TargetModuleEvents } from './module_events';
