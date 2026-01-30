import { NativeEventEmitter, NativeModules } from 'react-native';

import NativeSDK, {
  type AltcraftConfig,
  type CategoryData,
  type ResponseWithHttpCode,
  type TokenData,
} from './NativeSdk';

/** SDK event payload emitted from native via NativeEventEmitter ("AltcraftSdkEvent"). */
export type SdkEvent = {
  function: string;
  code: number | null;
  message: string;
  type: 'event' | 'error' | 'retryError';
  value?: Record<string, unknown> | null;
};

/** UTM tags for mobileEvent attribution. */
export type UTM = {
  campaign?: string | null;
  content?: string | null;
  keyword?: string | null;
  medium?: string | null;
  source?: string | null;
  temp?: string | null;
};

// ---------------- Utilities ----------------

/** Converts a JS object to { [key: string]: string } for the RN bridge; drops null/undefined. */
function toNativeStringMap(
  input: Record<string, unknown> | null
): Record<string, string> | null {
  if (input == null) return null;

  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue; 

    switch (typeof value) {
      case 'string':
        out[key] = value;
        break;

      case 'number':
      case 'boolean':
      case 'bigint':
        out[key] = String(value);
        break;

      default:
        try {
          out[key] = JSON.stringify(value);
        } catch {
          out[key] = String(value);
        }
        break;
    }
  }

  return Object.keys(out).length > 0 ? out : null;
}

/**
 * New Arch safe:
 * TurboModule codegen does NOT support `any`.
 * Therefore, we serialize any value for UserDefaults into `string`:
 * - string -> as-is
 * - number/boolean -> String(...)
 * - object/array -> JSON.stringify(...)
 * - null/undefined -> null (native side can treat it as “remove key”)
 */
function toUserDefaultsString(value: unknown): string | null {
  if (value == null) return null;

  const t = typeof value;

  if (t === 'string') return String(value);
  if (t === 'number' || t === 'boolean') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// ---------------- PushReceiver API (JS-side) ----------------

/** JS handler interface for incoming push payloads. */
export abstract class PushReceiver {
  /** Called with a flat push payload map. */
  abstract pushHandler(message: Record<string, string>): void;
}

/** Registered JS receivers for push payloads. */
const registeredPushReceivers: PushReceiver[] = [];

/** Registers a JS push receiver. */
export function registerPushReceiver(receiver: PushReceiver): void {
  registeredPushReceivers.push(receiver);
}

/** Clears all JS push receivers. */
export function clearPushReceivers(): void {
  registeredPushReceivers.length = 0;
}

/** Default receiver used when none are registered. */
class DefaultPushReceiver extends PushReceiver {
  override pushHandler(message: Record<string, string>): void {
    // eslint-disable-next-line no-console
    console.log('[AltcraftSDK] Default push handler:', message);
  }
}

/**
 * Forwards a push payload to native SDK and then to JS receivers.
 * This does not intercept system notifications by itself.
 */
export function takePush(message: Record<string, string>): void {
  if (!message || Object.keys(message).length === 0) return;

  NativeSDK.takePush({ ...message });

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

/** RN subscription handle (NativeEventEmitter). */
type EventsSubscription = { remove: () => void } | null;

/** Native emitter for "AltcraftSdkEvent". */
const nativeEventEmitter = new NativeEventEmitter(NativeModules.SDKEventEmitter);

/** Current JS-side subscription. */
let eventsSubscription: EventsSubscription = null;

/** Subscribes to native SDK events and routes them to the handler. */
export function subscribeToEvents(handler: (event: SdkEvent) => void): void {
  if (eventsSubscription) {
    eventsSubscription.remove();
    eventsSubscription = null;
  }

  NativeSDK.subscribeToEvents();

  eventsSubscription = nativeEventEmitter.addListener(
    'AltcraftSdkEvent',
    (...args: unknown[]) => {
      const event = (args[0] ?? null) as SdkEvent | null;
      if (!event) return;

      try {
        handler(event);
      } catch (e) {
        console.warn('[AltcraftSDK] subscribeToEvents handler error:', e);
      }
    }
  );
}

/** Unsubscribes from native SDK events. */
export function unsubscribeFromEvent(): void {
  if (eventsSubscription) {
    eventsSubscription.remove();
    eventsSubscription = null;
  }

  NativeSDK.unsubscribeFromEvent();
}

// ---------------- SDK API ----------------

/** Initializes the Altcraft SDK. */
export function initialize(config: AltcraftConfig): Promise<void> {
  return NativeSDK.initialize(config);
}

/** Sets or clears the JWT used by the SDK. */
export function setJwt(token: string | null): void {
  return NativeSDK.setJwt(token);
}

// platform-specific token setters

/** Android-only: sets FCM token. */
export function setAndroidFcmToken(token: string | null): void {
  return NativeSDK.setAndroidFcmToken(token);
}

/** iOS-only: sets FCM token. */
export function setIosFcmToken(token: string | null): void {
  return NativeSDK.setIosFcmToken(token);
}

/** Android-only: sets HMS token. */
export function setAndroidHmsToken(token: string | null): void {
  return NativeSDK.setAndroidHmsToken(token);
}

/** iOS-only: sets HMS token. */
export function setIosHmsToken(token: string | null): void {
  return NativeSDK.setIosHmsToken(token);
}

/** iOS-only: sets APNs token. */
export function setApnsToken(token: string | null): void {
  return NativeSDK.setApnsToken(token);
}

/** Android-only: sets RuStore token. */
export function setRustoreToken(token: string | null): void {
  return NativeSDK.setRustoreToken(token);
}

// ---------------- subscription (public: unknown, native: string) ----------------

/** Push subscribe (fire-and-forget). */
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
    toNativeStringMap(profileFields),
    toNativeStringMap(customFields),
    cats,
    replace,
    skipTriggers
  );
}

/** Push suspend (fire-and-forget). */
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
    toNativeStringMap(profileFields),
    toNativeStringMap(customFields),
    cats,
    replace,
    skipTriggers
  );
}

/** Push unsubscribe (fire-and-forget). */
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
    toNativeStringMap(profileFields),
    toNativeStringMap(customFields),
    cats,
    replace,
    skipTriggers
  );
}

/** Un-suspends push subscription and returns response (if any). */
export function unSuspendPushSubscription(): Promise<ResponseWithHttpCode | null> {
  return NativeSDK.unSuspendPushSubscription();
}

/** Returns latest subscription status (if any). */
export function getStatusOfLatestSubscription(): Promise<ResponseWithHttpCode | null> {
  return NativeSDK.getStatusOfLatestSubscription();
}

/** Returns latest subscription status for a provider (if any). */
export function getStatusOfLatestSubscriptionForProvider(
  provider: string | null = null
): Promise<ResponseWithHttpCode | null> {
  return NativeSDK.getStatusOfLatestSubscriptionForProvider(provider);
}

/** Returns current subscription status (if any). */
export function getStatusForCurrentSubscription(): Promise<ResponseWithHttpCode | null> {
  return NativeSDK.getStatusForCurrentSubscription();
}

// ---------------- token public API ----------------

/** Returns current push token (or null). */
export function getPushToken(): Promise<TokenData | null> {
  return NativeSDK.getPushToken();
}

/** Deletes device token for provider. */
export function deleteDeviceToken(provider: string | null): Promise<void> {
  return NativeSDK.deleteDeviceToken(provider);
}

/** Forces token refresh flow. */
export function forcedTokenUpdate(): Promise<void> {
  return NativeSDK.forcedTokenUpdate();
}

/** Updates provider priority list. */
export function changePushProviderPriorityList(
  priorityList: string[] | null
): Promise<void> {
  return NativeSDK.changePushProviderPriorityList(priorityList);
}

/** Sets or clears token for a specific provider. */
export function setPushToken(provider: string, token: string | null): Promise<void> {
  return NativeSDK.setPushToken(provider, token);
}

// ---------------- sdk wrappers ----------------

/** Clears SDK local state. */
export function clear(): Promise<void> {
  return NativeSDK.clear();
}

/** Resets session init-control state (platform-dependent). */
export function unlockInitOperationsInThisSession(): void {
  return NativeSDK.unlockInitOperationsInThisSession();
}

/** Requests notification permission (platform-dependent). */
export function requestNotificationPermission(): void {
  return NativeSDK.requestNotificationPermission();
}

// ---------------- UserDefaults / SharedPreferences ----------------

/** Stores a value into native UserDefaults / SharedPreferences (platform-dependent). */
export function setUserDefaultsValue(
  suiteName: string | null,
  key: string,
  value: unknown
): void {
  const str = toUserDefaultsString(value);
  return NativeSDK.setUserDefaultsValue(suiteName, key, str);
}

// ---------------- MobileEvent (public: unknown, native: string) ----------------

/** Sends a mobile event (fire-and-forget). */
export function mobileEvent(
  sid: string,
  eventName: string,
  sendMessageId: string | null = null,
  payload: Record<string, unknown> | null = null,
  matching: Record<string, unknown> | null = null,
  matchingType: string | null = null,
  profileFields: Record<string, unknown> | null = null,
  utm: UTM | null = null
): void {
  NativeSDK.mobileEvent(
    sid,
    eventName,
    sendMessageId,
    toNativeStringMap(payload),
    toNativeStringMap(matching),
    matchingType,
    toNativeStringMap(profileFields),
    utm
  );
}

/** Manually records a push delivery event (fire-and-forget). */
export function deliveryEvent(
  message: Record<string, string> | null = null,
  messageUID: string | null = null
): void {
  const nativePayload =
    message && Object.keys(message).length > 0 ? { ...message } : null;

  // Kept as runtime call for backward-compat if some platform exposes it outside codegen.
  (NativeSDK as unknown as { deliveryEvent: (m: Record<string, string> | null, uid: string | null) => void })
    .deliveryEvent(nativePayload, messageUID);
}

/** Manually records a push open event (fire-and-forget). */
export function openEvent(
  message: Record<string, string> | null = null,
  messageUID: string | null = null
): void {
  const nativePayload =
    message && Object.keys(message).length > 0 ? { ...message } : null;

  // Kept as runtime call for backward-compat if some platform exposes it outside codegen.
  (NativeSDK as unknown as { openEvent: (m: Record<string, string> | null, uid: string | null) => void })
    .openEvent(nativePayload, messageUID);
}

// ---------------- Default export ----------------

/** Public React Native facade for the Altcraft SDK. */
const AltcraftSDK = {
  initialize,
  setJwt,

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


  mobileEvent,

  subscribeToEvents,
  unsubscribeFromEvent,

  clear,

  //ios only
  setIosFcmToken,
  setIosHmsToken,
  setApnsToken,
  setUserDefaultsValue,

  //android only
  setAndroidFcmToken,
  setAndroidHmsToken,
  setRustoreToken,
  PushReceiver,
  registerPushReceiver,
  clearPushReceivers,
  takePush,
  deliveryEvent,
  openEvent,
  unlockInitOperationsInThisSession,
  requestNotificationPermission,

};

export default AltcraftSDK;
