import { TurboModuleRegistry, type TurboModule } from 'react-native';

// ---------------- Data models ----------------

export type CategoryData = {
  name?: string | null;
  title?: string | null;
  steady?: boolean | null;
  active?: boolean | null;
}

export type SubscriptionData = {
  subscriptionId?: string | null;
  hashId?: string | null;
  provider?: string | null;
  status?: string | null;

  fields?: { [key: string]: string } | null;

  cats?: CategoryData[] | null;
}

export interface ProfileData {
  id?: string | null;
  status?: string | null;
  isTest?: boolean | null;
  subscription?: SubscriptionData | null;
}

export interface Response {
  error?: number | null;
  errorText?: string | null;
  profile?: ProfileData | null;
}

export interface ResponseWithHttpCode {
  httpCode: number | null;
  response: Response | null;
}

export interface AppInfo {
  appID: string;
  appIID: string;
  appVer: string;
}

export interface AltcraftConfig {
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
}

export interface TokenData {
  provider: string | null;
  token: string | null;
}

// ---------------- TurboModule Spec ----------------

export interface Spec extends TurboModule {
  // init
  initialize(config: AltcraftConfig): Promise<void>;

  // auth
  setJwt(token: string | null): void;

  // platform-specific token setters
  setAndroidFcmToken(token: string | null): void;
  setAndroidHmsToken(token: string | null): void;

  setIosFcmToken(token: string | null): void;
  setIosHmsToken(token: string | null): void;

  // other tokens
  setApnsToken(token: string | null): void; // iOS-only (no-op on Android)
  setRustoreToken(token: string | null): void; // Android-only (no-op on iOS)

  // subscription (✅ string maps in spec)
  pushSubscribe(
    sync: boolean | null,
    profileFields: { [key: string]: string } | null,
    customFields: { [key: string]: string } | null,
    cats: CategoryData[] | null,
    replace: boolean | null,
    skipTriggers: boolean | null
  ): void;

  pushSuspend(
    sync: boolean | null,
    profileFields: { [key: string]: string } | null,
    customFields: { [key: string]: string } | null,
    cats: CategoryData[] | null,
    replace: boolean | null,
    skipTriggers: boolean | null
  ): void;

  pushUnSubscribe(
    sync: boolean | null,
    profileFields: { [key: string]: string } | null,
    customFields: { [key: string]: string } | null,
    cats: CategoryData[] | null,
    replace: boolean | null,
    skipTriggers: boolean | null
  ): void;

  unSuspendPushSubscription(): Promise<ResponseWithHttpCode | null>;
  getStatusOfLatestSubscription(): Promise<ResponseWithHttpCode | null>;
  getStatusOfLatestSubscriptionForProvider(
    provider: string | null
  ): Promise<ResponseWithHttpCode | null>;
  getStatusForCurrentSubscription(): Promise<ResponseWithHttpCode | null>;

  // push payload (string-only)
  takePush(message: { [key: string]: string } | null): void;

  // events
  subscribeToEvents(): void;
  unsubscribeFromEvent(): void;

  // required for NativeEventEmitter
  addListener(eventName: string): void;
  removeListeners(count: number): void;

  // token API
  getPushToken(): Promise<TokenData | null>;
  deleteDeviceToken(provider: string | null): Promise<void>;
  forcedTokenUpdate(): Promise<void>;
  changePushProviderPriorityList(priorityList: string[] | null): Promise<void>;
  setPushToken(provider: string, token: string | null): Promise<void>;

  // sdk
  clear(): Promise<void>;
  reinitializeRetryControlInThisSession(): void;
  requestNotificationPermission(): void;

  // mobile events (✅ string maps in spec)
  mobileEvent(
    sid: string,
    eventName: string,
    sendMessageId: string | null,
    payload: { [key: string]: string } | null,
    matching: { [key: string]: string } | null,
    matchingType: string | null,
    profileFields: { [key: string]: string } | null
  ): void;

  deliveryEvent(
    message: { [key: string]: string } | null,
    messageUID: string | null
  ): void;

  openEvent(
    message: { [key: string]: string } | null,
    messageUID: string | null
  ): void;
}

// ---------------- Export ----------------

const NativeSDK = TurboModuleRegistry.getEnforcing<Spec>('Sdk');
export default NativeSDK;
