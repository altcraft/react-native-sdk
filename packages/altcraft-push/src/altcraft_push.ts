import { AltcraftException, SDK_ERROR } from '@altcraft/core';
import type { CategoryData, ResponseWithHttpCode } from '@altcraft/core';
import { responseWithHttpCodeFromNative } from '@altcraft/core';
import type { TokenData } from './models/token_data';
import { tokenDataFromNative } from './models/token_data';
import type { AltcraftPushPlatform } from './platform/altcraft_push_platform';
import { TurboModuleAltcraftPush } from './platform/turbo_module_altcraft_push';
import { pushModuleEvents } from './module_events';
import type { PushModuleEvents } from './module_events';

/** Options for push subscription operations. */
export type PushSubscribeOptions = {
  /**
   * Execution mode:
   * `true` — synchronous server request returning the operation result;
   * `false` — asynchronous request returning the enqueue result;
   * `null` — native default behavior.
   */
  sync?: boolean | null;
  /** Optional profile fields to attach to the request. */
  profileFields?: Record<string, unknown> | null;
  /** Optional custom fields to attach to the request. */
  customFields?: Record<string, unknown> | null;
  /** Optional categories list. */
  cats?: CategoryData[] | null;
  /** Optional flag to replace an existing subscription. */
  replace?: boolean | null;
  /** Optional flag to skip trigger execution on the server. */
  skipTriggers?: boolean | null;
};

/** Options for push event reports. */
export type PushEventOptions = {
  /** Optional push payload (string-only). */
  message?: Record<string, string> | null;
  /** Optional Altcraft message UID. */
  messageUID?: string | null;
};

/**
 * Push module of the Altcraft SDK.
 *
 * Provides push subscription management, push token handling, provider
 * priority management, and push event reporting for Android and iOS.
 */
export class AltcraftPush {
  /** The current platform interface implementation. */
  static platform: AltcraftPushPlatform = new TurboModuleAltcraftPush();

  /** Messages of the native push module events. */
  static readonly moduleEvents: PushModuleEvents = pushModuleEvents;

  // ---- Subscription ----

  /** Subscribes to push notifications. */
  static pushSubscribe(options: PushSubscribeOptions = {}): Promise<void> {
    return AltcraftPush.platform.pushSubscribe(options);
  }

  /** Suspends push subscription. */
  static pushSuspend(options: PushSubscribeOptions = {}): Promise<void> {
    return AltcraftPush.platform.pushSuspend(options);
  }

  /** Unsubscribes from push notifications. */
  static pushUnSubscribe(options: PushSubscribeOptions = {}): Promise<void> {
    return AltcraftPush.platform.pushUnSubscribe(options);
  }

  /** Unsuspends a previously suspended push subscription. */
  static unSuspendPushSubscription(): Promise<ResponseWithHttpCode | null> {
    return AltcraftPush.platform.unSuspendPushSubscription();
  }

  // ---- Subscription Status ----

  /** Gets the status of the latest subscription. */
  static getStatusOfLatestSubscription(): Promise<ResponseWithHttpCode | null> {
    return AltcraftPush.platform.getStatusOfLatestSubscription();
  }

  /** Gets the status of the current subscription. */
  static getStatusForCurrentSubscription(): Promise<ResponseWithHttpCode | null> {
    return AltcraftPush.platform.getStatusForCurrentSubscription();
  }

  /** Gets the status of the latest subscription for a specific provider. */
  static getStatusOfLatestSubscriptionForProvider(
    provider: string | null = null
  ): Promise<ResponseWithHttpCode | null> {
    return AltcraftPush.platform.getStatusOfLatestSubscriptionForProvider(
      provider
    );
  }

  // ---- Push Tokens ----

  /** Gets the current push token data. */
  static getPushToken(): Promise<TokenData | null> {
    return AltcraftPush.platform.getPushToken();
  }

  /** Sets or clears a push token for the given provider. */
  static setPushToken(provider: string, token: string | null): void {
    AltcraftPush.platform.setPushToken(provider, token);
  }

  // ---- Token Management ----

  /** Forces a token refresh. */
  static forcedTokenUpdate(): Promise<void> {
    return AltcraftPush.platform.forcedTokenUpdate();
  }

  /** Deletes a device token for the given provider. */
  static deleteDeviceToken(provider: string): Promise<void> {
    return AltcraftPush.platform.deleteDeviceToken(provider);
  }

  /** Changes the push provider priority list. */
  static changePushProviderPriorityList(priorityList: string[]): Promise<void> {
    return AltcraftPush.platform.changePushProviderPriorityList(priorityList);
  }

  // ---- Push Handling ----

  /** Forwards a push payload to the SDK. */
  static takePush(message: Record<string, string>): void {
    AltcraftPush.platform.takePush(message);
  }

  /** Checks if a push message is from Altcraft. */
  static isAltcraftPush(message: Record<string, string>): boolean {
    return AltcraftPush.platform.isAltcraftPush(message);
  }

  // ---- Permissions ----

  /** Requests notification permission. Returns true if granted. */
  static requestNotificationPermission(): Promise<boolean> {
    return AltcraftPush.platform.requestNotificationPermission();
  }

  // ---- Push Events ----

  /** Reports push delivery. */
  static deliveryEvent(options: PushEventOptions = {}): void {
    AltcraftPush.platform.deliveryEvent(options);
  }

  /** Reports push open. */
  static openEvent(options: PushEventOptions = {}): void {
    AltcraftPush.platform.openEvent(options);
  }
}

/** Converts a native bridge error into an AltcraftException. */
export function toAltcraftException(
  e: unknown,
  fallback: string
): AltcraftException {
  if (e instanceof AltcraftException) return e;
  const code =
    e != null && typeof e === 'object' && typeof (e as { code?: unknown }).code === 'string'
      ? (e as { code: string }).code
      : SDK_ERROR;
  const message = e instanceof Error ? e.message : fallback;
  return new AltcraftException(code, message);
}

export { responseWithHttpCodeFromNative, tokenDataFromNative };
export type { CategoryData, ResponseWithHttpCode, TokenData };
