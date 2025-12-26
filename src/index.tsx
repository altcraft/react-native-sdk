import { NativeEventEmitter } from 'react-native';
import NativeSDK, {
  type AltcraftConfig,
  type CategoryData,
  type ResponseWithHttpCode,
  type TokenData,
} from './NativeSdk';

/**
 * SDK event payload emitted from the native layer via NativeEventEmitter.
 *
 * Native sources (conceptually):
 * - Android (Kotlin): SDK Events module -> emits "AltcraftSdkEvent"
 * - iOS (Swift): SDKEvents.shared -> bridge -> emits "AltcraftSdkEvent"
 *
 * Fields:
 * - function: origin function/context name in the SDK
 * - code: optional numeric code (HTTP/internal/etc.)
 * - message: human-readable message
 * - type: event category ("event" | "error" | "retryError")
 * - value: optional extra data/context
 */
export type SdkEvent = {
  function: string;
  code: number | null;
  message: string;
  type: 'event' | 'error' | 'retryError';
  value?: { [key: string]: any } | null;
};

/**
 * Converts a JS object to a string-to-string map suitable for passing through the RN bridge.
 *
 * Why:
 * - TurboModules/bridges often prefer primitive types and predictable structures.
 * - Native SDK public APIs frequently accept Map<String, String> (Android) / bridged dictionaries (iOS).
 *
 * Behavior:
 * - null/undefined values are skipped
 * - all other values are coerced via `String(v)`
 * - returns `null` if the resulting map is empty (native side can treat it as "not provided")
 */
function toNativeStringMap(
  input: { [key: string]: any } | null
): { [key: string]: string } | null {
  if (!input) return null;

  const out: { [key: string]: string } = {};
  for (const [k, v] of Object.entries(input)) {
    if (v == null) continue;
    out[k] = String(v);
  }

  return Object.keys(out).length > 0 ? out : null;
}

/**
 * JS-side abstraction for handling incoming push payloads.
 *
 * Native analogy:
 * - Android: `AltcraftSDK.PushReceiver` + `PushReceiver.takePush(context, message)`
 *
 * In RN:
 * - `takePush(...)` always forwards the payload to native (`NativeSdk.takePush`)
 * - then optionally dispatches it to registered JS receivers (`PushReceiver`)
 *
 * This provides:
 * - centralized forwarding to the Altcraft native SDK (parsing/internal flows)
 * - optional additional JS-level handling (logging, routing, analytics, debugging)
 */
export abstract class PushReceiver {
  /**
   * Called when the JS facade receives a push payload.
   *
   * @param message Flat `Record<string, string>` (matches typical data payload shape).
   */
  abstract pushHandler(message: { [key: string]: string }): void;
}

/**
 * Registered JS receivers for push payload dispatch.
 * If none are registered, a DefaultPushReceiver will log the payload.
 */
const registeredPushReceivers: PushReceiver[] = [];

/**
 * Registers a JS receiver for incoming push payloads.
 *
 * Typically called once during app startup.
 *
 * @param receiver Implementation of `PushReceiver`.
 */
export function registerPushReceiver(receiver: PushReceiver): void {
  registeredPushReceivers.push(receiver);
}

/**
 * Clears all registered push receivers.
 *
 * Useful for tests or reinitializing the integration layer.
 */
export function clearPushReceivers(): void {
  registeredPushReceivers.length = 0;
}

/**
 * Default receiver used when no custom receivers are registered.
 * Prevents silent drops during integration and provides visibility via console logs.
 */
class DefaultPushReceiver extends PushReceiver {
  override pushHandler(message: { [key: string]: string }): void {
    // eslint-disable-next-line no-console
    console.log('[AltcraftSDK] Default push handler:', message);
  }
}

/**
 * Forwards an incoming push payload to the native Altcraft SDK and then to JS receivers.
 *
 * Native analogy:
 * - Android: `AltcraftSDK.PushReceiver.takePush(context, message)`
 *
 * Important:
 * - This method does NOT intercept notifications by itself.
 *   Platform-level interception must be implemented separately:
 *   - Android: FCM/HMS service -> call `takePush(message.data)`
 *   - iOS: AppDelegate / UNUserNotificationCenter / Notification Service Extension -> call `takePush(userInfo)`
 *
 * @param message Flat push payload map. Empty payloads are ignored.
 */
export function takePush(message: { [key: string]: string }): void {
  if (!message || Object.keys(message).length === 0) {
    return;
  }

  // 1) Always forward to native SDK for parsing/internal processing
  NativeSDK.takePush({ ...message });

  // 2) Optionally forward to JS receivers (custom logic/analytics/debug)
  const receivers =
    registeredPushReceivers.length > 0
      ? registeredPushReceivers
      : [new DefaultPushReceiver()];

  for (const receiver of receivers) {
    try {
      receiver.pushHandler(message);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[AltcraftSDK] PushReceiver error:', e);
    }
  }
}

// ---------------- Events API for RN ----------------

/** RN subscription handle type (NativeEventEmitter). */
type EventsSubscription = { remove: () => void } | null;

/**
 * Native event emitter used to receive SDK events from the native bridge.
 * Event name: "AltcraftSdkEvent"
 */
const nativeEventEmitter = new NativeEventEmitter(NativeSDK as any);

/**
 * Current active subscription to native SDK events.
 * Only one subscription is maintained; re-subscribing replaces the previous one.
 */
let eventsSubscription: EventsSubscription = null;

/**
 * Subscribes to Altcraft SDK events and starts streaming them from native to JS.
 *
 * Contract:
 * - If a previous subscription exists, it is removed.
 * - Calls `NativeSdk.subscribeToEvents()` so the native side starts emitting events.
 *
 * @param handler JS handler invoked for each SDK event.
 */
export function subscribeToEvents(handler: (event: SdkEvent) => void): void {
  if (eventsSubscription) {
    eventsSubscription.remove();
    eventsSubscription = null;
  }

  NativeSDK.subscribeToEvents();

  eventsSubscription = nativeEventEmitter.addListener(
    'AltcraftSdkEvent',
    (...args: any[]) => {
      const event = (args[0] ?? null) as SdkEvent | null;
      if (!event) return;

      try {
        handler(event);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[AltcraftSDK] subscribeToEvents handler error:', e);
      }
    }
  );
}

/**
 * Unsubscribes from Altcraft SDK events.
 *
 * Behavior:
 * - removes the JS listener
 * - calls `NativeSdk.unsubscribeFromEvent()` to stop native emissions
 */
export function unsubscribeFromEvent(): void {
  if (eventsSubscription) {
    eventsSubscription.remove();
    eventsSubscription = null;
  }

  NativeSDK.unsubscribeFromEvent();
}

// ---------------- existing public SDK API ----------------

/**
 * Initializes the Altcraft SDK.
 *
 * Native equivalents:
 * - Android: `AltcraftSDK.initialization(context, configuration, complete)`
 * - iOS: `AltcraftSDK.shared.initialization(configuration, completion)`
 *
 * Promise:
 * - resolves on success
 *
 * ⚠️ Can throw (reject):
 * - configuration mapping/validation errors on native side
 * - native initialization failure (e.g. missing required fields, internal init error)
 *
 * @param config SDK configuration (apiUrl is required).
 */
export function initialize(config: AltcraftConfig): Promise<void> {
  return NativeSDK.initialize(config);
}

/**
 * Sets/clears the JWT used by the SDK for authenticated requests.
 *
 * Native concept:
 * - Android/iOS register a JWT provider; RN uses an internal provider backed by this token.
 *
 * Semantics:
 * - token === null -> clear JWT provider/token
 * - token !== null -> store token and enable provider
 *
 * @param token JWT string or null to clear.
 */
export function setJwt(token: string | null): void {
  return NativeSDK.setJwt(token);
}

// platform-specific token setters

/**
 * Android-only: sets the FCM token to be used by the SDK.
 *
 * Typical usage:
 * - after `messaging().getToken()`
 * - when the token refreshes
 *
 * @param token FCM token or null to clear/unset.
 */
export function setAndroidFcmToken(token: string | null): void {
  return NativeSDK.setAndroidFcmToken(token);
}

/**
 * iOS-only: kept for API symmetry (may be a no-op on other platforms).
 *
 * @param token iOS FCM token or null.
 */
export function setIosFcmToken(token: string | null): void {
  return NativeSDK.setIosFcmToken(token);
}

/**
 * Android-only: sets the HMS token.
 *
 * @param token HMS token or null.
 */
export function setAndroidHmsToken(token: string | null): void {
  return NativeSDK.setAndroidHmsToken(token);
}

/**
 * iOS-only: kept for API symmetry (may be a no-op on other platforms).
 *
 * @param token iOS HMS token or null.
 */
export function setIosHmsToken(token: string | null): void {
  return NativeSDK.setIosHmsToken(token);
}

// other tokens

/**
 * iOS-only: sets the APNs token (usually forwarded from AppDelegate).
 *
 * Note:
 * - APNs token is commonly represented as a hex string on native side.
 *
 * @param token APNs token as hex string or null.
 */
export function setApnsToken(token: string | null): void {
  return NativeSDK.setApnsToken(token);
}

/**
 * Android-only: sets the RuStore token.
 *
 * @param token RuStore token or null.
 */
export function setRustoreToken(token: string | null): void {
  return NativeSDK.setRustoreToken(token);
}

// ---------------- subscription (public: any, native: string) ----------------

/**
 * Performs a push subscribe request.
 *
 * Notes:
 * - fire-and-forget: results/errors are delivered via the SDK Events stream
 * - `sync` is forwarded to the SDK/server semantics
 */
export function pushSubscribe(
  sync: boolean | null = true,
  profileFields: { [key: string]: any } | null = null,
  customFields: { [key: string]: any } | null = null,
  cats: CategoryData[] | null = null,
  replace: boolean | null = null,
  skipTriggers: boolean | null = null
): void {
  NativeSDK.pushSubscribe(
    sync,
    toNativeStringMap(profileFields),
    toNativeStringMap(customFields),
    cats,
    replace,
    skipTriggers
  );
}

/**
 * Suspends push notifications for the current profile/subscription.
 *
 * Same parameter semantics as `pushSubscribe`.
 * Results/errors are delivered via the SDK Events stream.
 */
export function pushSuspend(
  sync: boolean | null = true,
  profileFields: { [key: string]: any } | null = null,
  customFields: { [key: string]: any } | null = null,
  cats: CategoryData[] | null = null,
  replace: boolean | null = null,
  skipTriggers: boolean | null = null
): void {
  NativeSDK.pushSuspend(
    sync,
    toNativeStringMap(profileFields),
    toNativeStringMap(customFields),
    cats,
    replace,
    skipTriggers
  );
}

/**
 * Performs a push unsubscribe request.
 *
 * Same parameter semantics as `pushSubscribe`.
 * Results/errors are delivered via the SDK Events stream.
 */
export function pushUnSubscribe(
  sync: boolean | null = true,
  profileFields: { [key: string]: any } | null = null,
  customFields: { [key: string]: any } | null = null,
  cats: CategoryData[] | null = null,
  replace: boolean | null = null,
  skipTriggers: boolean | null = null
): void {
  NativeSDK.pushUnSubscribe(
    sync,
    toNativeStringMap(profileFields),
    toNativeStringMap(customFields),
    cats,
    replace,
    skipTriggers
  );
}

/**
 * Sends an "unSuspend" request and returns the response wrapped with HTTP status code.
 *
 * ⚠️ Can throw (reject):
 * - native validation failure (missing data to create request)
 * - request creation/sending failures
 * - unexpected native exceptions
 *
 * @returns `ResponseWithHttpCode | null`
 */
export function unSuspendPushSubscription(): Promise<ResponseWithHttpCode | null> {
  return NativeSDK.unSuspendPushSubscription();
}

/**
 * Returns the status of the latest subscription request stored in the profile.
 *
 * ⚠️ Can throw (reject) on native request creation/sending failures or unexpected exceptions.
 */
export function getStatusOfLatestSubscription(): Promise<ResponseWithHttpCode | null> {
  return NativeSDK.getStatusOfLatestSubscription();
}

/**
 * Returns the status of the latest subscription for the specified provider.
 * If provider is null, native SDK may use the current provider (SDK-specific).
 *
 * ⚠️ Can throw (reject):
 * - invalid provider
 * - native request creation/sending failures
 * - unexpected native exceptions
 *
 * @param provider Provider identifier or null.
 */
export function getStatusOfLatestSubscriptionForProvider(
  provider: string | null = null
): Promise<ResponseWithHttpCode | null> {
  return NativeSDK.getStatusOfLatestSubscriptionForProvider(provider);
}

/**
 * Returns the status for the "current subscription context" (current provider + current token),
 * according to native SDK rules.
 *
 * ⚠️ Can throw (reject) on native request creation/sending failures or unexpected exceptions.
 */
export function getStatusForCurrentSubscription(): Promise<ResponseWithHttpCode | null> {
  return NativeSDK.getStatusForCurrentSubscription();
}

// ---------------- token public API ----------------

/**
 * Returns the current push token selected/managed by the SDK.
 *
 * ⚠️ Can throw (reject) on unexpected native errors.
 *
 * May resolve `null` if token is not yet available or providers are not configured.
 */
export function getPushToken(): Promise<TokenData | null> {
  return NativeSDK.getPushToken();
}

/**
 * Deletes the device token for a given provider.
 *
 * ⚠️ Can throw (reject):
 * - provider is null/invalid
 * - native deletion flow fails
 * - unexpected native exceptions
 *
 * @param provider Provider identifier (or null; native may treat this as invalid).
 */
export function deleteDeviceToken(provider: string | null): Promise<void> {
  return NativeSDK.deleteDeviceToken(provider);
}

/**
 * Forces a token refresh flow.
 *
 * ⚠️ Can throw (reject) on native failures or unexpected exceptions.
 */
export function forcedTokenUpdate(): Promise<void> {
  return NativeSDK.forcedTokenUpdate();
}

/**
 * Updates the provider priority list used by the SDK to select a push provider.
 *
 * ⚠️ Can throw (reject):
 * - invalid provider list (unknown identifiers)
 * - native update flow failure
 * - unexpected native exceptions
 *
 * @param priorityList Ordered list of provider IDs, or null.
 */
export function changePushProviderPriorityList(
  priorityList: string[] | null
): Promise<void> {
  return NativeSDK.changePushProviderPriorityList(priorityList);
}

/**
 * Sets (or clears) a token for a specific provider.
  
 * 
 * ⚠️ Can throw (reject):
 * - provider is invalid/blank (native validation)
 * - native set/delete flow fails
 * - unexpected native exceptions
 *
 * @param provider Provider identifier.
 * @param token Token string or null to clear.
 */
export function setPushToken(provider: string, token: string | null): Promise<void> {
  return NativeSDK.setPushToken(provider, token);
}

// ---------------- sdk wrappers ----------------

/**
 * Clears SDK local state and stops active SDK background work (SDK-specific).
 *
 * ⚠️ Can throw (reject) on unexpected native errors.
 */
export function clear(): Promise<void> {
  return NativeSDK.clear();
}

/**
 * Resets retry-control state in the current session to allow retry/re-init flows again.
 * This is a session-level unlock, not a full SDK reset.
 */
export function reinitializeRetryControlInThisSession(): void {
  return NativeSDK.reinitializeRetryControlInThisSession();
}

/**
 * Requests notification permission (where applicable).
 *
 * Note:
 * - Usually no Promise here; native may silently no-op if not supported.
 */
export function requestNotificationPermission(): void {
  return NativeSDK.requestNotificationPermission();
}

// ---------------- MobileEvent (public: any, native: string) ----------------

/**
 * Sends a "mobile event" (non-push event) to Altcraft backend.
 *
 * Note:
 * - This is fire-and-forget and does not return a Promise.
 * - Any errors are expected to be surfaced via SDK Events stream (if enabled) or native logs.
 */
export function mobileEvent(
  sid: string,
  eventName: string,
  sendMessageId: string | null = null,
  payload: { [key: string]: any } | null = null,
  matching: { [key: string]: any } | null = null,
  matchingType: string | null = null,
  profileFields: { [key: string]: any } | null = null
): void {
  NativeSDK.mobileEvent(
    sid,
    eventName,
    sendMessageId,
    toNativeStringMap(payload),
    toNativeStringMap(matching),
    matchingType,
    toNativeStringMap(profileFields)
  );
}

/**
 * Manually registers a "delivery" event for a push notification.
 *
 * Note:
 * - Fire-and-forget (no Promise). Native errors should be emitted as SDK events or logs.
 */
export function deliveryEvent(
  message: { [key: string]: string } | null = null,
  messageUID: string | null = null
): void {
  const nativePayload =
    message && Object.keys(message).length > 0 ? { ...message } : null;

  (NativeSDK as any).deliveryEvent(nativePayload, messageUID);
}

/**
 * Manually registers an "open" event for a push notification.
 *
 * Note:
 * - Fire-and-forget (no Promise). Native errors should be emitted as SDK events or logs.
 */
export function openEvent(
  message: { [key: string]: string } | null = null,
  messageUID: string | null = null
): void {
  const nativePayload =
    message && Object.keys(message).length > 0 ? { ...message } : null;

  (NativeSDK as any).openEvent(nativePayload, messageUID);
}

// ---------------- Default export ----------------

/**
 * Public React Native facade for the Altcraft SDK.
 *
 * Promise-returning methods (can throw on `await` / reject):
 * - initialize
 * - unSuspendPushSubscription
 * - getStatusOfLatestSubscription
 * - getStatusOfLatestSubscriptionForProvider
 * - getStatusForCurrentSubscription
 * - getPushToken
 * - deleteDeviceToken
 * - forcedTokenUpdate
 * - changePushProviderPriorityList
 * - setPushToken
 * - clear
 */
const AltcraftSDK = {
  initialize,
  setJwt,

  setAndroidFcmToken,
  setIosFcmToken,
  setAndroidHmsToken,
  setIosHmsToken,

  setApnsToken,
  setRustoreToken,

  pushSubscribe,
  pushSuspend,
  pushUnSubscribe,

  unSuspendPushSubscription,
  getStatusOfLatestSubscription,
  getStatusOfLatestSubscriptionForProvider,
  getStatusForCurrentSubscription,

  getPushToken,
  deleteDeviceToken,
  forcedTokenUpdate,
  changePushProviderPriorityList,
  setPushToken,

  clear,
  reinitializeRetryControlInThisSession,
  requestNotificationPermission,

  mobileEvent,

  PushReceiver,
  registerPushReceiver,
  clearPushReceivers,
  takePush,

  subscribeToEvents,
  unsubscribeFromEvent,

  deliveryEvent,
  openEvent,
};

export default AltcraftSDK;
