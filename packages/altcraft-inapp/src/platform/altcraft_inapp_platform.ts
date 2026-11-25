import type { CategoryData } from '@altcraft/core';
import type {
  InAppAnimationConfig,
  InAppSubscribeOptions,
  JsonContentHandler,
} from '../altcraft_inapp';

/**
 * Platform interface for the Altcraft In-App module.
 *
 * The default implementation is [TurboModuleAltcraftInApp]; it can be
 * overridden for testing by assigning [AltcraftInAppPlatform.instance].
 */
export abstract class AltcraftInAppPlatform {
  /** The current platform interface implementation. */
  static instance: AltcraftInAppPlatform = createDefaultPlatform();

  abstract inAppSubscribe(options: InAppSubscribeOptions): Promise<void>;
  abstract inAppUnsubscribe(options: InAppSubscribeOptions): Promise<void>;
  abstract setScreen(screen: string): void;
  abstract trigger(name: string): void;
  abstract getPlacements(): void;
  abstract setAnimation(config: InAppAnimationConfig | null): void;
  abstract jsonContentSubscribe(handler: JsonContentHandler): void;
  abstract jsonContentUnsubscribe(): void;
}

/** Creates the default platform implementation. */
function createDefaultPlatform(): AltcraftInAppPlatform {
  const { TurboModuleAltcraftInApp } =
    require('./turbo_module_altcraft_inapp') as typeof import('./turbo_module_altcraft_inapp');
  return new TurboModuleAltcraftInApp();
}

export type { CategoryData };
