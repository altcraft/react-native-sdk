import { NativeEventEmitter, NativeModules } from 'react-native';

import NativeSDK, {
  type AltcraftConfig,
  type CategoryData,
  type ResponseWithHttpCode,
  type TokenData,
  type EmailSubscription,
  type SmsSubscription,
  type PushSubscription,
  type CcDataSubscription,
  type Subscription,
  type UTM,
  type SdkEvent,
} from './NativeSdk';

import { Utilities, ActionFieldBuilder, actionField } from './Utilities';

// ---------------- SDK API ----------------

/**
 * Initializes the Altcraft SDK.
 *
 * @param config SDK configuration.
 *              `apiUrl` is required.
 *              Other fields are optional and depend on platform features.
 * @returns Promise that resolves on successful initialization.
 */
export function initialize(config: AltcraftConfig): Promise<void> {
  return NativeSDK.initialize(config);
}

// ---------------- Push subscription ----------------

/**
 * Sends a push subscribe request.
 *
 * @param sync Execution mode:
 *            `true`  — sends a synchronous request to the server and returns
 *                      the result of the operation execution.
 *            `false` — sends an asynchronous request and returns
 *                      the result of task enqueueing on the server.
 *            `null`  — native default behavior.
 * @param profileFields Optional profile fields to attach to the request.
 * @param customFields Optional custom fields to attach to the request.
 * @param cats Optional categories list.
 * @param replace Optional flag to replace an existing subscription.
 * @param skipTriggers Optional flag to skip trigger execution on the server.
 */
export function pushSubscribe(
  sync: boolean | null = true,
  profileFields: Record<string, unknown> | null = null,
  customFields: Record<string, unknown> | null = null,
  cats: CategoryData[] | null = null,
  replace: boolean | null = null,
  skipTriggers: boolean | null = null
): void {
  NativeSDK.pushSubscribe(
    sync,
    Utilities.toNativeStringMap(profileFields),
    Utilities.toNativeStringMap(customFields),
    cats,
    replace,
    skipTriggers
  );
}

/**
 * Sends a push suspend request.
 *
 * @param sync Execution mode (see {@link pushSubscribe}).
 * @param profileFields Optional profile fields.
 * @param customFields Optional custom fields.
 * @param cats Optional categories list.
 * @param replace Optional flag to replace an existing subscription.
 * @param skipTriggers Optional flag to skip trigger execution on the server.
 */
export function pushSuspend(
  sync: boolean | null = true,
  profileFields: Record<string, unknown> | null = null,
  customFields: Record<string, unknown> | null = null,
  cats: CategoryData[] | null = null,
  replace: boolean | null = null,
  skipTriggers: boolean | null = null
): void {
  NativeSDK.pushSuspend(
    sync,
    Utilities.toNativeStringMap(profileFields),
    Utilities.toNativeStringMap(customFields),
    cats,
    replace,
    skipTriggers
  );
}

/**
 * Sends a push unsubscribe request.
 *
 * @param sync Execution mode (see {@link pushSubscribe}).
 * @param profileFields Optional profile fields.
 * @param customFields Optional custom fields.
 * @param cats Optional categories list.
 * @param replace Optional flag to replace an existing subscription.
 * @param skipTriggers Optional flag to skip trigger execution on the server.
 */
export function pushUnSubscribe(
  sync: boolean | null = true,
  profileFields: Record<string, unknown> | null = null,
  customFields: Record<string, unknown> | null = null,
  cats: CategoryData[] | null = null,
  replace: boolean | null = null,
  skipTriggers: boolean | null = null
): void {
  NativeSDK.pushUnSubscribe(
    sync,
    Utilities.toNativeStringMap(profileFields),
    Utilities.toNativeStringMap(customFields),
    cats,
    replace,
    skipTriggers
  );
}

// ---------------- Promise APIs ----------------

/**
 * Unsuspends push subscriptions based on native matching rules.
 *
 * @returns Promise resolving to response with HTTP code or `null` if unavailable.
 */
export function unSuspendPushSubscription(): Promise<ResponseWithHttpCode | null> {
  return NativeSDK.unSuspendPushSubscription();
}

/**
 * Returns the status of the latest subscription in profile.
 *
 * @returns Promise resolving to response with HTTP code or `null` if unavailable.
 */
export function getStatusOfLatestSubscription(): Promise<ResponseWithHttpCode | null> {
  return NativeSDK.getStatusOfLatestSubscription();
}

/**
 * Returns the status of the subscription matching the current push token and provider context.
 *
 * @returns Promise resolving to response with HTTP code or `null` if unavailable.
 */
export function getStatusForCurrentSubscription(): Promise<ResponseWithHttpCode | null> {
  return NativeSDK.getStatusForCurrentSubscription();
}

/**
 * Returns the status of the latest subscription for the given provider.
 *
 * If `provider` is `null`, native side may use the current provider context.
 *
 * @param provider Optional provider identifier (platform-dependent).
 * @returns Promise resolving to response with HTTP code or `null` if unavailable.
 */
export function getStatusOfLatestSubscriptionForProvider(
  provider: string | null = null
): Promise<ResponseWithHttpCode | null> {
  return NativeSDK.getStatusOfLatestSubscriptionForProvider(provider);
}

// ---------------- Token API ----------------

/**
 * Returns the current push token data from native side.
 *
 * @returns Promise resolving to token info or `null` if token is not available.
 */
export function getPushToken(): Promise<TokenData | null> {
  return NativeSDK.getPushToken();
}

/**
 * Sets or clears the push token for a specific provider.
 *
 * @param provider Provider identifier (e.g. platform push provider name).
 * @param token Token string or `null` to clear.
 * @returns Promise that resolves when the token is saved on native side.
 */
export function setPushToken(
  provider: string,
  token: string | null
): Promise<void> {
  return NativeSDK.setPushToken(provider, token);
}

// ---------------- SDK wrappers ----------------

/**
 * Clears SDK local state (native).
 *
 * @returns Promise that resolves after cleanup.
 */
export function clear(): Promise<void> {
  return NativeSDK.clear();
}

// ---------------- MobileEvent ----------------

/**
 * Sends a mobile event to the server.
 *
 * @param sid Pixel identifier.
 * @param eventName Event name.
 * @param sendMessageId Optional message identifier to link the event.
 * @param payload Optional event payload.
 * @param matching Optional matching parameters.
 * @param matchingType Optional matching mode/type.
 * @param profileFields Optional profile fields.
 * @param subscription Optional subscription info to attach (email/sms/push/cc_data).
 * @param utm Optional UTM tags for attribution.
 */
export function mobileEvent(
  sid: string,
  eventName: string,
  sendMessageId: string | null = null,
  payload: Record<string, unknown> | null = null,
  matching: Record<string, unknown> | null = null,
  matchingType: string | null = null,
  profileFields: Record<string, unknown> | null = null,
  subscription: Subscription | null = null,
  utm: UTM | null = null
): void {
  NativeSDK.mobileEvent(
    sid,
    eventName,
    sendMessageId,
    Utilities.toNativeStringMap(payload),
    Utilities.toNativeStringMap(matching),
    matchingType,
    Utilities.toNativeStringMap(profileFields),
    Utilities.subscriptionToNativeMap(subscription),
    utm ?? { campaign: null, content: null, keyword: null, medium: null, source: null, temp: null }
  );
}

// ---------------- SDK Event API ----------------

type EventsSubscription = { remove: () => void } | null;
const ALTCRAFT_SDK_EVENT_NAME = 'AltcraftSdkEvent' as const;
const nativeEventEmitter = new NativeEventEmitter(
  NativeModules.SDKEventEmitter
);

let eventsSubscription: EventsSubscription = null;
const eventHandlers = new Set<(event: SdkEvent) => void>();

function ensureNativeSubscription(): void {
  if (eventsSubscription === null) {
    NativeSDK.subscribeToEvents();
    eventsSubscription = nativeEventEmitter.addListener(
      ALTCRAFT_SDK_EVENT_NAME,
      (...args: unknown[]) => {
        const event = (args[0] ?? null) as SdkEvent | null;
        if (!event) return;

        const handlers = Array.from(eventHandlers);
        for (const handler of handlers) {
          try {
            handler(event);
          } catch (e) {
            console.warn('[AltcraftSDK] subscribeToEvents handler error:', e);
          }
        }
      }
    );
  }
}

/**
 * Subscribes to native SDK events and routes them to the provided handler.
 *
 * Multiple callers can subscribe independently — each handler receives every event.
 * The native subscription is activated only once (first caller).
 *
 * @param handler Callback invoked for each incoming SDK event.
 *               The event object is produced by native and follows {@link SdkEvent}.
 */
export function subscribeToEvents(handler: (event: SdkEvent) => void): void {
  eventHandlers.add(handler);
  ensureNativeSubscription();
}

/**
 * Unsubscribes a specific handler from native SDK events.
 *
 * When the last handler is removed, the native subscription is also released.
 * Safe to call even if not subscribed.
 */
export function unsubscribeFromEvent(
  handler?: (event: SdkEvent) => void
): void {
  if (handler) {
    eventHandlers.delete(handler);
  }

  if (eventHandlers.size === 0) {
    if (eventsSubscription) {
      eventsSubscription.remove();
      eventsSubscription = null;
    }
    NativeSDK.unsubscribeFromEvent();
  }
}

//Android-only behavior

// ---------------- Push payload bridge ----------------

/**
 * Forwards a push payload to native SDK (Android-only behavior).
 *
 * @param message Push payload map (string-only).
 */
export function takePush(message: Record<string, string>): void {
  if (!message || Object.keys(message).length === 0) return;
  NativeSDK.takePush({ ...message });
}

/**
 * Requests notification permission (Android-only behavior).
 * On Android it may trigger runtime permission flow,
 * n iOS it can be a no-op or routed to native implementation.
 */
export function requestNotificationPermission(): void {
  return NativeSDK.requestNotificationPermission();
}

// ---------------- Manual push events ----------------

/**
 * Reports an Altcraft push delivery event (Android-only behavior).
 *
 * @param message Optional push payload (string-only).
 * @param messageUID Optional Altcraft message UID.
 */
export function deliveryEvent(
  message: Record<string, string> | null = null,
  messageUID: string | null = null
): void {
  const nativePayload =
    message && Object.keys(message).length > 0 ? { ...message } : null;

  (
    NativeSDK as unknown as {
      deliveryEvent: (
        m: Record<string, string> | null,
        uid: string | null
      ) => void;
    }
  ).deliveryEvent(nativePayload, messageUID);
}

/**
 * Reports an Altcraft push open event (Android-only behavior).
 *
 * @param message Optional push payload (string-only).
 * @param messageUID Optional Altcraft message UID.
 */
export function openEvent(
  message: Record<string, string> | null = null,
  messageUID: string | null = null
): void {
  const nativePayload =
    message && Object.keys(message).length > 0 ? { ...message } : null;

  (
    NativeSDK as unknown as {
      openEvent: (m: Record<string, string> | null, uid: string | null) => void;
    }
  ).openEvent(nativePayload, messageUID);
}

// ---------------- UserDefaults ----------------
/**
 * Stores a value into native UserDefaults (IOS-only behavior).
 *
 * @param suiteName iOS App Group suite name or `null` to use standard UserDefaults.
 * @param key Storage key.
 * @param value Any JS value; will be converted to string or removed when `null/undefined`.
 */
export function setUserDefaultsValue(
  suiteName: string | null,
  key: string,
  value: unknown
): void {
  const str = Utilities.toUserDefaultsString(value);
  return NativeSDK.setUserDefaultsValue(suiteName, key, str);
}

// ---------------- Profile API ----------------

/**
 * Updates profile fields on the server.
 *
 * @param profileFields Optional profile fields to update.
 * @param skipTriggers Optional flag to skip trigger execution on the server.
 */
export function updateProfileFields(
  profileFields: Record<string, unknown> | null = null,
  skipTriggers: boolean | null = null
): void {
  NativeSDK.updateProfileFields(
    Utilities.toNativeStringMap(profileFields),
    skipTriggers
  );
}

// ---------------- Token management API ----------------

/**
 * Forces a push token refresh (delete current token + re-register).
 *
 * @returns Promise that resolves when the token update flow completes.
 */
export function forcedTokenUpdate(): Promise<void> {
  return NativeSDK.forcedTokenUpdate();
}

/**
 * Deletes the device token for a given provider.
 *
 * @param provider Provider identifier (e.g. `android-firebase`, `ios-firebase`).
 * @returns Promise that resolves when the delete call completes.
 */
export function deleteDeviceToken(provider: string): Promise<void> {
  return NativeSDK.deleteDeviceToken(provider);
}

/**
 * Changes the push provider priority list at runtime.
 *
 * @param priorityList Ordered list of provider identifiers.
 * @returns Promise that resolves when the priority list is updated.
 */
export function changePushProviderPriorityList(
  priorityList: string[] | null
): Promise<void> {
  if (!priorityList || priorityList.length === 0) {
    return Promise.resolve();
  }
  return NativeSDK.changePushProviderPriorityList(priorityList);
}

// ---------------- PushReceiver helpers ----------------

/**
 * Checks whether a push payload belongs to Altcraft.
 *
 * @param message Push payload map (string-only).
 * @returns `true` if the message contains the Altcraft marker key.
 */
export function isAltcraftPush(message: Record<string, string>): boolean {
  if (!message || Object.keys(message).length === 0) return false;
  return NativeSDK.isAltcraftPush({ ...message });
}

// ---------------- SDK lifecycle ----------------

/**
 * Allows re-running initial retry/scheduling/token-check logic
 * in this process on the next initialization (Android only).
 * No-op on iOS.
 */
export function unlockInitialOperationsInThisSession(): void {
  NativeSDK.unlockInitialOperationsInThisSession();
}

// ---------------- iOS-only ----------------

/**
 * Sets the App Group name for shared UserDefaults and Core Data (iOS only).
 * Must be called before SDK initialization.
 *
 * @param groupName App Group identifier or `null` to clear.
 */
export function setAppGroup(groupName: string | null): void {
  NativeSDK.setAppGroup(groupName);
}

// ---------------- Default export ----------------

/**
 * Public React Native facade for the Altcraft SDK.
 *
 * Provides:
 * - SDK initialization
 * - Push subscription operations
 * - Subscription status queries
 * - SDK event stream via NativeEventEmitter
 * - Mobile events
 * - Push token access
 * - Local storage bridge (UserDefaults/SharedPreferences)
 */
const AltcraftSDK = {
  // SDK initialization
  initialize,

  // Push subscription
  pushSubscribe,
  pushSuspend,
  pushUnSubscribe,
  unSuspendPushSubscription,

  // Profile status
  getStatusOfLatestSubscription,
  getStatusOfLatestSubscriptionForProvider,
  getStatusForCurrentSubscription,

  // SDK events
  subscribeToEvents,
  unsubscribeFromEvent,

  // Mobile events
  mobileEvent,

  // Push token
  setPushToken,
  getPushToken,

  // Clear SDK data
  clear,

  // Set UserDefault / SharedPreferenses
  setUserDefaultsValue,

  // Android only
  takePush,
  deliveryEvent,
  openEvent,
  requestNotificationPermission,
  unlockInitialOperationsInThisSession,

  // Profile API
  updateProfileFields,

  // Token management
  forcedTokenUpdate,
  deleteDeviceToken,
  changePushProviderPriorityList,

  // PushReceiver helpers
  isAltcraftPush,

  // iOS only
  setAppGroup,
};

export default AltcraftSDK;

export { ActionFieldBuilder, actionField };

export type {
  AltcraftConfig,
  CategoryData,
  ResponseWithHttpCode,
  TokenData,
  EmailSubscription,
  SmsSubscription,
  PushSubscription,
  CcDataSubscription,
  Subscription,
  UTM,
  SdkEvent,
};
