import { TurboModuleRegistry, type TurboModule } from 'react-native';

/** Subscription category metadata. */
export type CategoryData = {
  name?: string | null;
  title?: string | null;
  steady?: boolean | null;
  active?: boolean | null;
};

/** Push token data returned from the SDK. */
export type TokenData = {
  /** Push provider identifier (e.g. 'android-firebase', 'ios-apns'). */
  provider: string;
  /** Push token value. */
  token: string;
};

/** HTTP response with status code from the Altcraft API. */
export type ResponseWithHttpCode = {
  /** HTTP status code. */
  httpCode: number | null;
  /** Response body. */
  response: Object | null;
};

/** Subscription operation options. */
export type PushSubscribeOptions = {
  sync: boolean | null;
  profileFields: { [key: string]: string } | null;
  customFields: { [key: string]: string } | null;
  cats: CategoryData[] | null;
  replace: boolean | null;
  skipTriggers: boolean | null;
};

/** Push event report options. */
export type PushEventOptions = {
  message: { [key: string]: string } | null;
  messageUID: string | null;
};

/**
 * Push module TurboModule spec.
 *
 * Provides push subscription management, push token handling, provider
 * priority management, and push event reporting.
 */
export interface Spec extends TurboModule {
  // ---- Subscription ----

  /** Creates or updates push subscription. */
  pushSubscribe(options: PushSubscribeOptions | null): void;

  /** Suspends active push subscription. */
  pushSuspend(options: PushSubscribeOptions | null): void;

  /** Unsubscribes from push notifications. */
  pushUnSubscribe(options: PushSubscribeOptions | null): void;

  /** Unsuspends current push subscription. */
  unSuspendPushSubscription(): Promise<ResponseWithHttpCode | null>;

  /** Returns status of the latest subscription. */
  getStatusOfLatestSubscription(): Promise<ResponseWithHttpCode | null>;

  /** Returns status of current subscription. */
  getStatusForCurrentSubscription(): Promise<ResponseWithHttpCode | null>;

  /** Returns subscription status for specific provider. */
  getStatusOfLatestSubscriptionForProvider(
    options: { provider: string | null } | null
  ): Promise<ResponseWithHttpCode | null>;

  // ---- Push payload (string-only) ----

  /** Handles incoming push payload (string-only). */
  takePush(message: { [key: string]: string } | null): void;

  // ---- Token API ----

  /** Returns current push token. */
  getPushToken(): Promise<TokenData | null>;

  /** Sets push token for provider. */
  setPushToken(options: { provider: string; token: string | null }): void;

  // ---- Token management ----

  /** Forces a push token refresh (delete + re-register). */
  forcedTokenUpdate(): Promise<void>;

  /** Deletes the device token for a given provider. */
  deleteDeviceToken(provider: string): Promise<void>;

  /** Changes the push provider priority list at runtime. */
  changePushProviderPriorityList(priorityList: string[]): Promise<void>;

  // ---- Push receiver helpers ----

  /** Checks whether a push payload belongs to Altcraft. */
  isAltcraftPush(message: { [key: string]: string } | null): boolean;

  // ---- Permissions ----

  /** Requests notification permission; resolves to granted flag. */
  requestNotificationPermission(): Promise<boolean>;

  // ---- Push events ----

  /** Sends push delivery event. */
  deliveryEvent(options: PushEventOptions | null): void;

  /** Sends push open event. */
  openEvent(options: PushEventOptions | null): void;
}

/** Native push TurboModule instance. */
const NativePush = TurboModuleRegistry.getEnforcing<Spec>('Push');
export default NativePush;
