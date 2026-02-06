import { TurboModuleRegistry, type TurboModule } from 'react-native';

// ---------------- Data models ----------------

/** Subscription category metadata. */
export type CategoryData = {
  name?: string | null;
  title?: string | null;
  steady?: boolean | null;
  active?: boolean | null;
};

/** UTM parameters for event attribution. */
export type UTM = {
  campaign?: string | null;
  content?: string | null;
  keyword?: string | null;
  medium?: string | null;
  source?: string | null;
  temp?: string | null;
};

// ---------------- Subscription Types ----------------

/** Email subscription data. */
export type EmailSubscription = {
  type: 'email';
  resource_id: number;
  email: string;
  status?: string | null;
  priority?: number | null;
  custom_fields?: { [key: string]: string } | null;
  cats?: string[] | null;
};

/** SMS subscription data. */
export type SmsSubscription = {
  type: 'sms';
  resource_id: number;
  phone: string;
  status?: string | null;
  priority?: number | null;
  custom_fields?: { [key: string]: string } | null;
  cats?: string[] | null;
};

/** Push subscription data. */
export type PushSubscription = {
  type: 'push';
  resource_id: number;
  provider: string;
  subscription_id: string;
  status?: string | null;
  priority?: number | null;
  custom_fields?: { [key: string]: string } | null;
  cats?: string[] | null;
};

/** CC-data subscription (Telegram, WhatsApp, Viber, Notify). */
export type CcDataSubscription = {
  type: 'cc_data';
  resource_id: number;
  channel: string; // 'telegram_bot', 'whatsapp', 'viber', 'notify'
  cc_data: { [key: string]: string };
  status?: string | null;
  priority?: number | null;
  custom_fields?: { [key: string]: string } | null;
  cats?: string[] | null;
};

/** Union of all supported subscription types. */
export type Subscription =
  | EmailSubscription
  | SmsSubscription
  | PushSubscription
  | CcDataSubscription;

// ---------------- API models ----------------

/** Profile data returned from the API. */
export type ProfileData = {
  id?: string | null;
  status?: string | null;
  isTest?: boolean | null;
  subscription?: Subscription | null;
};

/** API response payload. */
export type Response = {
  error?: number | null;
  errorText?: string | null;
  profile?: ProfileData | null;
};

/** API response with HTTP status code. */
export type ResponseWithHttpCode = {
  httpCode: number | null;
  response: Response | null;
};

// ---------------- Config / SDK models ----------------

/** Application metadata. */
export type AppInfo = {
  appID: string;
  appIID: string;
  appVer: string;
};

/** SDK configuration object. */
export type AltcraftConfig = {
  apiUrl: string;
  rToken?: string | null;
  appInfo?: AppInfo | null;
  providerPriorityList?: string[] | null;
  enableLogging?: boolean | null;

  // -------- ANDROID-ONLY --------
  android_icon?: number | null;
  android_usingService?: boolean | null;
  android_serviceMessage?: string | null;
  android_pushReceiverModules?: string[] | null;
  android_pushChannelName?: string | null;
  android_pushChannelDescription?: string | null;
};

/** Push token data. */
export type TokenData = {
  provider: string | null;
  token: string | null;
};

/** SDK event emitted from native via NativeEventEmitter ("AltcraftSdkEvent"). */
export type SdkEvent = {
  function: string;
  code: number | null;
  message: string;
  type: 'event' | 'error' | 'retryError';
  value?: Record<string, unknown> | null;
};

// ---------------- TurboModule Spec ----------------

export interface Spec extends TurboModule {
  // init

  /** Initializes SDK with provided configuration. */
  initialize(config: AltcraftConfig): Promise<void>;

  // subscription

  /** Creates or updates push subscription. */
  pushSubscribe(
    sync: boolean | null,
    profileFields: { [key: string]: string } | null,
    customFields: { [key: string]: string } | null,
    cats: CategoryData[] | null,
    replace: boolean | null,
    skipTriggers: boolean | null
  ): void;

  /** Suspends active push subscription. */
  pushSuspend(
    sync: boolean | null,
    profileFields: { [key: string]: string } | null,
    customFields: { [key: string]: string } | null,
    cats: CategoryData[] | null,
    replace: boolean | null,
    skipTriggers: boolean | null
  ): void;

  /** Unsubscribes from push notifications. */
  pushUnSubscribe(
    sync: boolean | null,
    profileFields: { [key: string]: string } | null,
    customFields: { [key: string]: string } | null,
    cats: CategoryData[] | null,
    replace: boolean | null,
    skipTriggers: boolean | null
  ): void;

  /** Unsuspends current push subscription. */
  unSuspendPushSubscription(): Promise<ResponseWithHttpCode | null>;

  /** Returns status of the latest subscription. */
  getStatusOfLatestSubscription(): Promise<ResponseWithHttpCode | null>;

  /** Returns status of current subscription. */
  getStatusForCurrentSubscription(): Promise<ResponseWithHttpCode | null>;

  /** Returns subscription status for specific provider. */
  getStatusOfLatestSubscriptionForProvider(
    provider: string | null
  ): Promise<ResponseWithHttpCode | null>;

  // push payload (string-only)

  /** Handles incoming push payload (string-only). */
  takePush(message: { [key: string]: string } | null): void;

  // events

  /** Subscribes to SDK native events. */
  subscribeToEvents(): void;

  /** Unsubscribes from SDK native events. */
  unsubscribeFromEvent(): void;

  // required for NativeEventEmitter

  /** Required by NativeEventEmitter. */
  addListener(eventName: string): void;

  /** Required by NativeEventEmitter. */
  removeListeners(count: number): void;

  // token API

  /** Returns current push token. */
  getPushToken(): Promise<TokenData | null>;

  /** Sets push token for provider. */
  setPushToken(provider: string, token: string | null): Promise<void>;

  // sdk

  /** Clears all SDK state and stored data. */
  clear(): Promise<void>;

  /** Requests notification permission (iOS/Android). */
  requestNotificationPermission(): void;

  // mobile events

  /**
   * Sends a mobile event to the server.
   *
   */
  mobileEvent(
    sid: string,
    eventName: string,
    sendMessageId: string | null,
    payload: { [key: string]: string } | null,
    matching: { [key: string]: string } | null,
    matchingType: string | null,
    profileFields: { [key: string]: string } | null,
    subscription: { [key: string]: string } | null,
    utm: UTM | null
  ): void;

  // push event delivery

  /** Sends push delivery event. */
  deliveryEvent(
    message: { [key: string]: string } | null,
    messageUID: string | null
  ): void;

  // push event open

  /** Sends push open event. */
  openEvent(
    message: { [key: string]: string } | null,
    messageUID: string | null
  ): void;

  // set UserDefault

  /** Sets value in UserDefaults / SharedPreferences. */
  setUserDefaultsValue(
    suiteName: string | null,
    key: string,
    value: string | null
  ): void;
}

// ---------------- Export ----------------

/** Native TurboModule instance. */
const NativeSDK = TurboModuleRegistry.getEnforcing<Spec>('Sdk');
export default NativeSDK;
