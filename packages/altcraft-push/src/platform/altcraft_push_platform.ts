import type { CategoryData, ResponseWithHttpCode } from '@altcraft/core';
import type { TokenData } from '../models/token_data';
import type { PushEventOptions, PushSubscribeOptions } from '../altcraft_push';

/**
 * Platform interface for the Altcraft push module.
 *
 * The default implementation is [TurboModuleAltcraftPush]; it can be
 * overridden for testing by assigning [AltcraftPushPlatform.instance].
 */
export abstract class AltcraftPushPlatform {
  /** The current platform interface implementation. */
  static instance: AltcraftPushPlatform = createDefaultPlatform();

  // ---- Subscription ----

  abstract pushSubscribe(options: PushSubscribeOptions): Promise<void>;
  abstract pushSuspend(options: PushSubscribeOptions): Promise<void>;
  abstract pushUnSubscribe(options: PushSubscribeOptions): Promise<void>;
  abstract unSuspendPushSubscription(): Promise<ResponseWithHttpCode | null>;
  abstract getStatusOfLatestSubscription(): Promise<ResponseWithHttpCode | null>;
  abstract getStatusForCurrentSubscription(): Promise<ResponseWithHttpCode | null>;
  abstract getStatusOfLatestSubscriptionForProvider(
    provider: string | null
  ): Promise<ResponseWithHttpCode | null>;

  // ---- Push payload ----

  abstract takePush(message: Record<string, string>): void;

  // ---- Tokens ----

  abstract getPushToken(): Promise<TokenData | null>;
  abstract setPushToken(provider: string, token: string | null): void;
  abstract forcedTokenUpdate(): Promise<void>;
  abstract deleteDeviceToken(provider: string): Promise<void>;
  abstract changePushProviderPriorityList(priorityList: string[]): Promise<void>;

  // ---- Receiver helpers ----

  abstract isAltcraftPush(message: Record<string, string>): boolean;

  // ---- Permissions ----

  abstract requestNotificationPermission(): Promise<boolean>;

  // ---- Push events ----

  abstract deliveryEvent(options: PushEventOptions): void;
  abstract openEvent(options: PushEventOptions): void;
}

/** Creates the default platform implementation. */
function createDefaultPlatform(): AltcraftPushPlatform {
  const { TurboModuleAltcraftPush } =
    require('./turbo_module_altcraft_push') as typeof import('./turbo_module_altcraft_push');
  return new TurboModuleAltcraftPush();
}

export type { CategoryData, ResponseWithHttpCode, TokenData };
