import type { AltcraftConfig } from '../models/altcraft_config';
import type { SdkEvent } from '../models/sdk_event';

/**
 * Platform interface for the Altcraft core module.
 *
 * The default implementation is [TurboModuleAltcraftCore]; it can be
 * overridden for testing by assigning [AltcraftCorePlatform.instance].
 */
export abstract class AltcraftCorePlatform {
  /** The current platform interface implementation. */
  static instance: AltcraftCorePlatform = createDefaultPlatform();

  // ---- Initialization ----

  /** Initializes the Altcraft SDK core with the given configuration. */
  abstract initialize(config: AltcraftConfig): Promise<void>;

  // ---- SDK Events ----

  /** Subscribes a handler to native SDK events. */
  abstract subscribeToEvents(handler: (event: SdkEvent) => void): void;

  /** Unsubscribes a handler from native SDK events. */
  abstract unsubscribeFromEvents(handler: (event: SdkEvent) => void): void;

  // ---- State ----

  /** Clears all SDK data. */
  abstract clear(): Promise<void>;

  // ---- Session (Android) ----

  /** Unlocks initial operations in the current session (Android). */
  abstract unlockInitialOperationsInThisSession(): void;

  // ---- UserDefaults ----

  /** Stores a string value in native storage. */
  abstract setUserDefaultsValue(
    suiteName: string | null,
    key: string,
    value: string | null
  ): void;

  /** Sets the App Group for UserDefaults (iOS). */
  abstract setAppGroup(groupName: string | null): void;

  // ---- Authentication ----

  /** Registers a JWT provider invoked by the native SDK when it needs a token. */
  abstract setJwtProvider(provider: () => Promise<string | null>): void;

  /** Starts SDK authentication. */
  abstract authenticate(): void;

  /** Logs the user out. */
  abstract logOut(): void;

  /** Returns whether the user is authenticated. */
  abstract isAuthenticated(): Promise<boolean>;
}

/** Creates the default platform implementation. */
function createDefaultPlatform(): AltcraftCorePlatform {
  // Lazy import to avoid a hard cycle with the TurboModule binding module.
  const { TurboModuleAltcraftCore } =
    require('./turbo_module_altcraft_core') as typeof import('./turbo_module_altcraft_core');
  return new TurboModuleAltcraftCore();
}
