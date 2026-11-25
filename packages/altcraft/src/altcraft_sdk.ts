import { AltcraftCore } from '@altcraft/core';
import type {
  AltcraftConfig,
  CategoryData,
  ResponseWithHttpCode,
} from '@altcraft/core';
import { AltcraftInApp } from '@altcraft/inapp';
import type {
  InAppAnimationConfig,
  InAppAnimationEasing,
  InAppAnimationSpec,
  InAppSubscribeOptions,
  JsonContentApi,
  JsonContentHandler,
} from '@altcraft/inapp';
import { AltcraftProfile } from '@altcraft/profile';
import type { UpdateProfileOptions } from '@altcraft/profile';
import { AltcraftPush } from '@altcraft/push';
import type {
  PushEventOptions,
  PushSubscribeOptions,
  TokenData,
} from '@altcraft/push';
import { AltcraftTarget } from '@altcraft/target';
import type { MobileEventOptions, Subscription, UTM } from '@altcraft/target';
import type { SdkEvent } from '@altcraft/core';

/**
 * Main entry point for the Altcraft SDK.
 *
 * All SDK operations are accessed through this class's static methods.
 * The package is a pure-JS facade: initialization is delegated to
 * `AltcraftCore.initialize`, and all other operations are delegated to the
 * module packages ({@link AltcraftCore}, {@link AltcraftPush},
 * {@link AltcraftInApp}, {@link AltcraftTarget}, {@link AltcraftProfile}).
 * There is no umbrella native module; module options are applied through
 * `AltcraftConfigBuilder` extensions.
 *
 * ```ts
 * import { AltcraftSDK } from 'altcraft';
 *
 * // Initialize
 * await AltcraftSDK.initialize({
 *   apiUrl: 'https://your-api.altcraft.com',
 *   appInfo: { appID: 'firebase-app-id', appIID: 'firebase-instance-id', appVer: '1.0.0' },
 * });
 *
 * // Subscribe to push
 * AltcraftSDK.pushSubscribe({ sync: true });
 *
 * // Listen to SDK events
 * AltcraftSDK.subscribeToEvents((event) => {
 *   console.log(`${event.function}: ${event.message}`);
 * });
 * ```
 *
 * Module-specific options are added through `AltcraftConfigBuilder` extensions
 * and applied by `AltcraftCore.initialize`:
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
export class AltcraftSDK {
  /** Provides access to In-App placements with JSON content. */
  static readonly jsonContent: JsonContentApi = AltcraftInApp.jsonContent;

  // ---- Initialization ----

  /**
   * Initializes the Altcraft SDK with the given configuration.
   *
   * Delegates to `AltcraftCore.initialize`. For module-specific options use
   * `AltcraftConfigBuilder` and the module extensions (`pushConfig`,
   * `inAppConfig`).
   */
  static initialize(config: AltcraftConfig): Promise<void> {
    return AltcraftCore.initialize(config);
  }

  // ---- Push Subscription ----

  /** Subscribes to push notifications. */
  static pushSubscribe(options: PushSubscribeOptions = {}): Promise<void> {
    return AltcraftPush.pushSubscribe(options);
  }

  /** Suspends push subscription. */
  static pushSuspend(options: PushSubscribeOptions = {}): Promise<void> {
    return AltcraftPush.pushSuspend(options);
  }

  /** Unsubscribes from push notifications. */
  static pushUnSubscribe(options: PushSubscribeOptions = {}): Promise<void> {
    return AltcraftPush.pushUnSubscribe(options);
  }

  /** UnSuspends a previously suspended push subscription. */
  static unSuspendPushSubscription(): Promise<ResponseWithHttpCode | null> {
    return AltcraftPush.unSuspendPushSubscription();
  }

  // ---- In-App Subscription ----

  /** Subscribes to In-App notifications. */
  static inAppSubscribe(options: InAppSubscribeOptions = {}): Promise<void> {
    return AltcraftInApp.inAppSubscribe(options);
  }

  /** Unsubscribes from In-App notifications. */
  static inAppUnsubscribe(options: InAppSubscribeOptions = {}): Promise<void> {
    return AltcraftInApp.inAppUnsubscribe(options);
  }

  // ---- Subscription Status ----

  /** Gets the status of the latest subscription. */
  static getStatusOfLatestSubscription(): Promise<ResponseWithHttpCode | null> {
    return AltcraftPush.getStatusOfLatestSubscription();
  }

  /** Gets the status of the current subscription. */
  static getStatusForCurrentSubscription(): Promise<ResponseWithHttpCode | null> {
    return AltcraftPush.getStatusForCurrentSubscription();
  }

  /** Gets the status of the latest subscription for a specific provider. */
  static getStatusOfLatestSubscriptionForProvider(
    provider: string | null = null
  ): Promise<ResponseWithHttpCode | null> {
    return AltcraftPush.getStatusOfLatestSubscriptionForProvider(provider);
  }

  // ---- SDK Events ----

  /** Subscribes to SDK events stream. */
  static subscribeToEvents(handler: (event: SdkEvent) => void): void {
    AltcraftCore.subscribeToEvents(handler);
  }

  /** Unsubscribes from SDK events. */
  static unsubscribeFromEvents(handler: (event: SdkEvent) => void): void {
    AltcraftCore.unsubscribeFromEvents(handler);
  }

  // ---- Mobile Events ----

  /** Sends a mobile event to the Altcraft platform. */
  static sendTarget(options: MobileEventOptions): void {
    AltcraftTarget.sendTarget(options);
  }

  // ---- Push Tokens ----

  /** Gets the current push token data. */
  static getPushToken(): Promise<TokenData | null> {
    return AltcraftPush.getPushToken();
  }

  /** Sets or clears a push token for the given provider. */
  static setPushToken(provider: string, token: string | null): void {
    AltcraftPush.setPushToken(provider, token);
  }

  // ---- State ----

  /** Clears all SDK state. */
  static clear(): Promise<void> {
    return AltcraftCore.clear();
  }

  // ---- Push Handling (Android) ----

  /** Forwards a push payload to the SDK (Android). */
  static takePush(message: Record<string, string>): void {
    AltcraftPush.takePush(message);
  }

  // ---- Permissions (Android) ----

  /** Requests notification permission (Android). Returns true if granted. */
  static requestNotificationPermission(): Promise<boolean> {
    return AltcraftPush.requestNotificationPermission();
  }

  // ---- Push Events (Android) ----

  /** Reports push delivery (Android). */
  static deliveryEvent(options: PushEventOptions = {}): void {
    AltcraftPush.deliveryEvent(options);
  }

  /** Reports push open (Android). */
  static openEvent(options: PushEventOptions = {}): void {
    AltcraftPush.openEvent(options);
  }

  // ---- UserDefaults (iOS) ----

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
    AltcraftCore.setUserDefaultsValue(suiteName, key, value);
  }

  // ---- Profile ----

  /** Updates profile fields on the server. */
  static updateProfileFields(options: UpdateProfileOptions = {}): void {
    AltcraftProfile.updateProfileFields(options);
  }

  // ---- Token Management ----

  /** Forces a token refresh. */
  static forcedTokenUpdate(): Promise<void> {
    return AltcraftPush.forcedTokenUpdate();
  }

  /** Deletes a device token for the given provider. */
  static deleteDeviceToken(provider: string): Promise<void> {
    return AltcraftPush.deleteDeviceToken(provider);
  }

  /** Changes the push provider priority list. */
  static changePushProviderPriorityList(priorityList: string[]): Promise<void> {
    return AltcraftPush.changePushProviderPriorityList(priorityList);
  }

  // ---- Push Identification ----

  /** Checks if a push message is from Altcraft. */
  static isAltcraftPush(message: Record<string, string>): boolean {
    return AltcraftPush.isAltcraftPush(message);
  }

  // ---- Session (Android) ----

  /** Unlocks initial operations in the current session (Android). */
  static unlockInitialOperationsInThisSession(): void {
    AltcraftCore.unlockInitialOperationsInThisSession();
  }

  // ---- App Group (iOS) ----

  /** Sets the App Group for UserDefaults (iOS). */
  static setAppGroup(groupName: string | null): void {
    AltcraftCore.setAppGroup(groupName);
  }

  // ---- Authentication ----

  /** Registers a JWT provider that the native SDK calls when it needs a token. */
  static setJwtProvider(provider: () => Promise<string | null>): void {
    AltcraftCore.setJwtProvider(provider);
  }

  /** Starts SDK authentication. */
  static authenticate(): void {
    AltcraftCore.authenticate();
  }

  /** Logs the user out. */
  static logOut(): void {
    AltcraftCore.logOut();
  }

  /** Returns whether the user is authenticated. */
  static isAuthenticated(): Promise<boolean> {
    return AltcraftCore.isAuthenticated();
  }

  // ---- InApp ----

  /** Sets the current screen for In-App placement matching. */
  static setScreen(screen: string): void {
    AltcraftInApp.setScreen(screen);
  }

  /** Fires an In-App trigger by name. */
  static trigger(name: string): void {
    AltcraftInApp.trigger(name);
  }

  /** Requests In-App placements. */
  static getPlacements(): void {
    AltcraftInApp.getPlacements();
  }

  /** Sets or clears the In-App show animation configuration. */
  static setAnimation(config: InAppAnimationConfig | null): void {
    AltcraftInApp.setAnimation(config);
  }

  /** Disables the In-App show animation. */
  static clearAnimation(): void {
    AltcraftInApp.clearAnimation();
  }
}

export type {
  AltcraftConfig,
  CategoryData,
  InAppAnimationConfig,
  InAppAnimationEasing,
  InAppAnimationSpec,
  InAppSubscribeOptions,
  JsonContentApi,
  JsonContentHandler,
  MobileEventOptions,
  PushEventOptions,
  PushSubscribeOptions,
  ResponseWithHttpCode,
  SdkEvent,
  Subscription,
  TokenData,
  UpdateProfileOptions,
  UTM,
};
