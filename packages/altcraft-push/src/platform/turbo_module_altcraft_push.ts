import type { CategoryData, ResponseWithHttpCode } from '@altcraft/core';
import {
  categoryDataToNative,
  responseWithHttpCodeFromNative,
  Utilities,
} from '@altcraft/core';
import type { TokenData } from '../models/token_data';
import { tokenDataFromNative } from '../models/token_data';
import NativePush from '../native/NativePush';
import type {
  AltcraftPushPlatform,
} from './altcraft_push_platform';
import type { PushEventOptions, PushSubscribeOptions } from '../altcraft_push';
import { toAltcraftException } from '../altcraft_push';

/**
 * Default push platform implementation backed by the native TurboModule.
 *
 * Mirrors `MethodChannelAltcraftPush` from the Flutter SDK.
 */
export class TurboModuleAltcraftPush implements AltcraftPushPlatform {
  // ---- Subscription ----

  /** Creates or updates a push subscription. */
  async pushSubscribe(options: PushSubscribeOptions): Promise<void> {
    try {
      NativePush.pushSubscribe(toNativeSubscribeOptions(options, true));
    } catch (e) {
      throw toAltcraftException(e, 'pushSubscribe failed');
    }
  }

  /** Suspends the current push subscription. */
  async pushSuspend(options: PushSubscribeOptions): Promise<void> {
    try {
      NativePush.pushSuspend(toNativeSubscribeOptions(options, true));
    } catch (e) {
      throw toAltcraftException(e, 'pushSuspend failed');
    }
  }

  /** Unsubscribes the current push subscription. */
  async pushUnSubscribe(options: PushSubscribeOptions): Promise<void> {
    try {
      NativePush.pushUnSubscribe(toNativeSubscribeOptions(options, true));
    } catch (e) {
      throw toAltcraftException(e, 'pushUnSubscribe failed');
    }
  }

  /** Restores a suspended push subscription. */
  async unSuspendPushSubscription(): Promise<ResponseWithHttpCode | null> {
    try {
      return responseWithHttpCodeFromNative(
        await NativePush.unSuspendPushSubscription()
      );
    } catch (e) {
      throw toAltcraftException(e, 'unSuspendPushSubscription failed');
    }
  }

  /** Requests the status of the latest push subscription operation. */
  async getStatusOfLatestSubscription(): Promise<ResponseWithHttpCode | null> {
    try {
      return responseWithHttpCodeFromNative(
        await NativePush.getStatusOfLatestSubscription()
      );
    } catch (e) {
      throw toAltcraftException(e, 'getStatusOfLatestSubscription failed');
    }
  }

  /** Requests the current push subscription status. */
  async getStatusForCurrentSubscription(): Promise<ResponseWithHttpCode | null> {
    try {
      return responseWithHttpCodeFromNative(
        await NativePush.getStatusForCurrentSubscription()
      );
    } catch (e) {
      throw toAltcraftException(e, 'getStatusForCurrentSubscription failed');
    }
  }

  /** Requests the latest subscription status for a specific provider. */
  async getStatusOfLatestSubscriptionForProvider(
    provider: string | null
  ): Promise<ResponseWithHttpCode | null> {
    try {
      return responseWithHttpCodeFromNative(
        await NativePush.getStatusOfLatestSubscriptionForProvider({
          provider,
        })
      );
    } catch (e) {
      throw toAltcraftException(
        e,
        'getStatusOfLatestSubscriptionForProvider failed'
      );
    }
  }

  // ---- Push payload ----

  /** Forwards a push payload to the SDK. */
  takePush(message: Record<string, string>): void {
    if (!message || Object.keys(message).length === 0) return;
    NativePush.takePush({ ...message });
  }

  // ---- Tokens ----

  /** Reads the currently stored native push token. */
  async getPushToken(): Promise<TokenData | null> {
    try {
      return tokenDataFromNative(await NativePush.getPushToken());
    } catch (e) {
      throw toAltcraftException(e, 'getPushToken failed');
    }
  }

  /** Saves or clears a push token for a specific provider. */
  setPushToken(provider: string, token: string | null): void {
    NativePush.setPushToken({ provider, token });
  }

  /** Forces a push token update. */
  async forcedTokenUpdate(): Promise<void> {
    try {
      await NativePush.forcedTokenUpdate();
    } catch (e) {
      throw toAltcraftException(e, 'forcedTokenUpdate failed');
    }
  }

  /** Deletes a stored device token for a specific provider. */
  async deleteDeviceToken(provider: string): Promise<void> {
    try {
      await NativePush.deleteDeviceToken(provider);
    } catch (e) {
      throw toAltcraftException(e, 'deleteDeviceToken failed');
    }
  }

  /** Changes the native push provider priority list. */
  async changePushProviderPriorityList(
    priorityList: string[]
  ): Promise<void> {
    if (!priorityList || priorityList.length === 0) return;
    try {
      await NativePush.changePushProviderPriorityList(priorityList);
    } catch (e) {
      throw toAltcraftException(e, 'changePushProviderPriorityList failed');
    }
  }

  // ---- Receiver helpers ----

  /** Checks whether a push payload belongs to Altcraft. */
  isAltcraftPush(message: Record<string, string>): boolean {
    if (!message || Object.keys(message).length === 0) return false;
    return NativePush.isAltcraftPush({ ...message });
  }

  // ---- Permissions ----

  /** Requests notification permission. */
  async requestNotificationPermission(): Promise<boolean> {
    try {
      return await NativePush.requestNotificationPermission();
    } catch (e) {
      throw toAltcraftException(e, 'requestNotificationPermission failed');
    }
  }

  // ---- Push events ----

  /** Reports a push delivery event. */
  deliveryEvent(options: PushEventOptions): void {
    NativePush.deliveryEvent({
      message: emptyToNull(options.message),
      messageUID: options.messageUID ?? null,
    });
  }

  /** Reports a push open event. */
  openEvent(options: PushEventOptions): void {
    NativePush.openEvent({
      message: emptyToNull(options.message),
      messageUID: options.messageUID ?? null,
    });
  }
}

/** Converts subscription options into the native options object. */
function toNativeSubscribeOptions(
  options: PushSubscribeOptions,
  defaultSync: boolean
): {
  sync: boolean | null;
  profileFields: Record<string, string> | null;
  customFields: Record<string, string> | null;
  cats: CategoryData[] | null;
  replace: boolean | null;
  skipTriggers: boolean | null;
} {
  return {
    sync: options.sync != null ? options.sync : defaultSync,
    profileFields: Utilities.toNativeStringMap(options.profileFields),
    customFields: Utilities.toNativeStringMap(options.customFields),
    cats: options.cats?.map(categoryDataToNative) ?? null,
    replace: options.replace ?? null,
    skipTriggers: options.skipTriggers ?? null,
  };
}

/** Converts an empty object payload into null for the native bridge. */
function emptyToNull(
  message: Record<string, string> | null | undefined
): Record<string, string> | null {
  if (message == null) return null;
  return Object.keys(message).length > 0 ? { ...message } : null;
}

export type { CategoryData, ResponseWithHttpCode, TokenData };
