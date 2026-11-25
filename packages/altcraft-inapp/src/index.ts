/**
 * Altcraft SDK — In-App module for React Native.
 *
 * Provides In-App subscription management, screen tracking, triggers,
 * placement requests and animation configuration.
 */
import './config_builder';

export { AltcraftInApp } from './altcraft_inapp';
export { AltcraftInAppPlatform } from './platform/altcraft_inapp_platform';
export { TurboModuleAltcraftInApp } from './platform/turbo_module_altcraft_inapp';
export * from './config_builder';
export * from './models/in_app_config';
export type {
  InAppAnimationConfig,
  InAppAnimationEasing,
  InAppAnimationSpec,
  InAppSubscribeOptions,
  JsonContentApi,
  JsonContentHandler,
} from './altcraft_inapp';
export type { CategoryData } from './altcraft_inapp';
export { inAppModuleEvents } from './module_events';
export type { InAppModuleEvents } from './module_events';
