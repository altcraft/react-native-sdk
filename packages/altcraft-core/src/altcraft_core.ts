import { AltcraftCorePlatform } from './platform/altcraft_core_platform';
import { TurboModuleAltcraftCore } from './platform/turbo_module_altcraft_core';
import { AltcraftChannels } from './channel_names';
import { actionField, ActionFieldBuilder } from './action_field_builder';
import { Utilities } from './utilities';
import {
  AltcraftException,
  SDK_ERROR,
  toAltcraftException,
} from './exceptions/altcraft_exception';
import type { AltcraftConfig, AppInfo } from './models/altcraft_config';
import type { CategoryData } from './models/category_data';
import type { ResponseWithHttpCode } from './models/response_with_http_code';
import type { SdkEvent } from './models/sdk_event';
import { coreModuleEvents } from './module_events';
import type { CoreModuleEvents } from './module_events';

/**
 * Core module of the Altcraft SDK.
 *
 * Provides SDK initialization, native SDK events, JWT authentication, and
 * data management. All other Altcraft modules depend on this module.
 *
 * ```ts
 * import { AltcraftCore, AltcraftConfig } from '@altcraft/core';
 *
 * await AltcraftCore.initialize({ apiUrl: 'https://your-api.altcraft.com' });
 *
 * AltcraftCore.subscribeToEvents((event) => {
 *   console.log(`${event.function}: ${event.message}`);
 * });
 * ```
 *
 * Module-specific options are added through `AltcraftConfigBuilder` extensions
 * provided by the module packages:
 *
 * ```ts
 * import { AltcraftConfigBuilder, AltcraftCore } from '@altcraft/core';
 * import '@altcraft/inapp';
 * import '@altcraft/push';
 *
 * await AltcraftCore.initialize(
 *   new AltcraftConfigBuilder({ apiUrl: 'https://your-api.altcraft.com' })
 *     .pushConfig({ providerPriority: ['android-firebase'] })
 *     .inAppConfig({ maxPlacements: 50 })
 *     .build()
 * );
 * ```
 */
export class AltcraftCore {
  /** The current platform interface implementation. */
  static platform: AltcraftCorePlatform = new TurboModuleAltcraftCore();

  /** Messages of the native core module events. */
  static readonly moduleEvents: CoreModuleEvents = coreModuleEvents;

  // ---- Initialization ----

  /**
   * Initializes the Altcraft SDK core with the given configuration.
   *
   * Module-specific options are contributed by module packages through
   * `AltcraftConfigBuilder` extensions (for example `pushConfig`). The core
   * module forwards them to the native SDK without depending on concrete
   * modules.
   */
  static initialize(config: AltcraftConfig): Promise<void> {
    return AltcraftCore.platform.initialize(config);
  }

  // ---- SDK Events ----

  /**
   * Subscribes to native SDK events.
   *
   * Multiple listeners can subscribe to the same underlying native event
   * source. Call {@link unsubscribeFromEvents} to stop event delivery for
   * the given handler.
   */
  static subscribeToEvents(handler: (event: SdkEvent) => void): void {
    AltcraftCore.platform.subscribeToEvents(handler);
  }

  /** Unsubscribes a handler from native SDK events. */
  static unsubscribeFromEvents(handler: (event: SdkEvent) => void): void {
    AltcraftCore.platform.unsubscribeFromEvents(handler);
  }

  // ---- State ----

  /** Clears all SDK data. */
  static clear(): Promise<void> {
    return AltcraftCore.platform.clear();
  }

  // ---- Session (Android) ----

  /** Unlocks initial operations in the current session (Android). */
  static unlockInitialOperationsInThisSession(): void {
    AltcraftCore.platform.unlockInitialOperationsInThisSession();
  }

  // ---- UserDefaults ----

  /**
   * Stores a string value in native storage (UserDefaults on iOS,
   * SharedPreferences on Android).
   *
   * On iOS, `suiteName` selects the App Group UserDefaults suite.
   * On Android, `suiteName` is ignored.
   */
  static setUserDefaultsValue(
    suiteName: string | null,
    key: string,
    value: string | null
  ): void {
    AltcraftCore.platform.setUserDefaultsValue(suiteName, key, value);
  }

  /** Sets the App Group for UserDefaults (iOS). */
  static setAppGroup(groupName: string | null): void {
    AltcraftCore.platform.setAppGroup(groupName);
  }

  // ---- Authentication ----

  /**
   * Registers a JWT provider that the native SDK calls when it needs a token.
   */
  static setJwtProvider(provider: () => Promise<string | null>): void {
    AltcraftCore.platform.setJwtProvider(provider);
  }

  /** Starts SDK authentication. */
  static authenticate(): void {
    AltcraftCore.platform.authenticate();
  }

  /** Logs the user out. */
  static logOut(): void {
    AltcraftCore.platform.logOut();
  }

  /** Returns whether the user is authenticated. */
  static isAuthenticated(): Promise<boolean> {
    return AltcraftCore.platform.isAuthenticated();
  }
}

export {
  AltcraftCorePlatform,
  TurboModuleAltcraftCore,
  AltcraftChannels,
  actionField,
  ActionFieldBuilder,
  Utilities,
  AltcraftException,
  SDK_ERROR,
  toAltcraftException,
};

export type {
  AltcraftConfig,
  AppInfo,
  CategoryData,
  ResponseWithHttpCode,
  SdkEvent,
};
