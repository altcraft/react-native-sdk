// src/SDKTests.ts

import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AltcraftSDK from 'react-native-sdk';

const API_URL = 'your api url';
const JWT_TOKEN: string | null = null
const JWT_KEY = 'JWT_KEY';
const APP_GROUP_SUITE = 'group.altcraft.react.native.example';

type AltcraftConfigFromSdk = Parameters<typeof AltcraftSDK.initialize>[0];

const MOBILE_EVENT_SID = 'your sid';

const iosConfig = {
  apiUrl: API_URL,
  rToken: null,
  appInfo: {
    appID: 'firebase-app-id-ios',
    appIID: 'firebase-instance-id-ios',
    appVer: '1.0.0',
  },
  providerPriorityList: ['ios-apns'],
  enableLogging: true,
} satisfies AltcraftConfigFromSdk;

const androidConfig = {
  apiUrl: API_URL,
  rToken: null,
  appInfo: {
    appID: 'firebase-app-id-android',
    appIID: 'firebase-instance-id-android',
    appVer: '1.0.0',
  },
  providerPriorityList: ['android-firebase'],
  enableLogging: true,

  // ANDROID-ONLY
  android_icon: null,
  android_usingService: true,
  android_serviceMessage: 'Altcraft foreground service is running',
  android_pushReceiverModules: null,
  android_pushChannelName: 'Altcraft notifications',
  android_pushChannelDescription: 'Messages from Altcraft platform',
} satisfies AltcraftConfigFromSdk;

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForIosApnsToken(maxAttempts: number): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const token = await AltcraftSDK.getPushToken();
    const provider = token?.provider ?? null;
    const value = token?.token ?? null;

    if (provider && value && String(value).length > 0) return;
    await sleep(400);
  }
}

export type InitializationSDKResult = {
  platform: 'ios' | 'android' | 'other';
  fcmToken: string | null;
};

export type SdkEventForTests = {
  function: string;
  code: number | null;
  message: string;
  type: 'event' | 'error' | 'retryError';
  value?: Record<string, unknown> | unknown[] | string | number | boolean | null;
};

let lastSdkEvent: SdkEventForTests | null = null;

/**
 * Subscribes to SDK events and stores the latest received payload.
 * The handler is invoked on each incoming event.
 */
export function subscribeToSdkEventsForTests(
  handler?: (event: SdkEventForTests) => void
): void {
  AltcraftSDK.subscribeToEvents((event: any) => {
    const e = (event ?? null) as SdkEventForTests | null;
    if (!e) return;

    lastSdkEvent = e;

    // eslint-disable-next-line no-console
    console.log(
      `[AltcraftSDK][Event] type=${e.type} function=${e.function} code=${String(
        e.code
      )} message=${e.message}`
    );

    try {
      handler?.(e);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[AltcraftSDK][Event] handler error:', err);
    }
  });
}

/** Unsubscribes from native SDK events. */
export function unsubscribeFromSdkEventsForTests(): void {
  AltcraftSDK.unsubscribeFromEvent();
}

/** Returns the last received SDK event. */
export function getLastSdkEventForTests(): SdkEventForTests | null {
  return lastSdkEvent;
}

/** Returns the code of the last received SDK event. */
export function getLastSdkEventCodeForTests(): number | null {
  return lastSdkEvent?.code ?? null;
}

/**
 * Initializes SDK and sets auth/token prerequisites:
 * - requestPermission (Firebase)
 * - setJwt
 * - (iOS) store JWT to UserDefaults App Group
 * - (Android) fetch FCM token and setAndroidFcmToken
 * - initialize with platform config
 */
export async function initializationSDK(): Promise<InitializationSDKResult> {
  // Firebase permission
  await messaging().requestPermission();

  // JWT
  AltcraftSDK.setJwt(JWT_TOKEN);

  if (Platform.OS === 'ios') {
    AltcraftSDK.setUserDefaultsValue(APP_GROUP_SUITE, JWT_KEY, JWT_TOKEN);
  }

  // iOS
  if (Platform.OS === 'ios') {
    await AltcraftSDK.initialize(iosConfig);
    return { platform: 'ios', fcmToken: null };
  }

  // Android
  if (Platform.OS === 'android') {
    const token = await messaging().getToken();
    AltcraftSDK.setAndroidFcmToken(token);

    await AltcraftSDK.initialize(androidConfig);

    // Android 13+ permission flow
    AltcraftSDK.requestNotificationPermission();

    return { platform: 'android', fcmToken: token };
  }

  return { platform: 'other', fcmToken: null };
}

/**
 * Sends pushSubscribe (scenario step only).
 * IMPORTANT: assumes initializationSDK() was already executed.
 */
export async function pushSubscribe(): Promise<void> {
  if (Platform.OS === 'ios') {
    await waitForIosApnsToken(25);

    AltcraftSDK.pushSubscribe(
      true,
      { _fname: 'RN', _lname: 'IOS' },
      null,
      null,
      null,
      null
    );

    // eslint-disable-next-line no-console
    console.log('[AltcraftSDK][LastEventCode]', getLastSdkEventCodeForTests());

    return;
  }

  if (Platform.OS === 'android') {
    AltcraftSDK.pushSubscribe(
      true,
      { _fname: 'RN', _lname: 'Android' },
      null,
      null,
      null,
      null
    );

    // eslint-disable-next-line no-console
    console.log('[AltcraftSDK][LastEventCode]', getLastSdkEventCodeForTests());

    return;
  }

  // Other platforms: no-op
}

/**
 * Sends mobileEvent (scenario step only).
 * IMPORTANT: assumes initializationSDK() was already executed.
 */
export async function sendMobileEvent(): Promise<void> {
  const eventName = `rn_${Platform.OS}_mobile_event`;

  AltcraftSDK.mobileEvent(
    MOBILE_EVENT_SID,
    eventName,
    null,
    null,
    null,
    null,
    null // utm
  );

  // eslint-disable-next-line no-console
  console.log('[AltcraftSDK][LastEventCode]', getLastSdkEventCodeForTests());
}
