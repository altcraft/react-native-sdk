// Push.ts

import { Platform } from 'react-native';
import AltcraftSDK from 'react-native-sdk';

// FCM
import messaging from '@react-native-firebase/messaging';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';


export type PushPayload = Record<string, string>;

// ---------- Utils ----------

// Конвертация data payload в Record<string, string>
export function RemoteMessagetoStringMap(input: unknown): Record<string, string> | null {
  if (input == null) return null;

  let obj: unknown = input;

  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj);
    } catch {
      return null;
    }
  }

  if (typeof obj !== 'object') return null;

  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v == null) continue;
    out[k] = String(v);
  }

  return Object.keys(out).length ? out : null;
}

// ---------- Flags ----------

let fcmBg = false;
let fcmFg = false;
let fcmToken = false;

// ---------- FCM ----------

// Синхронизация FCM-токена
export function registerFCMPushTokenSync(): void {
  if (fcmToken || Platform.OS !== 'android') return;
  fcmToken = true;

  (async () => {
    try {
      await messaging().requestPermission();
      const token = await messaging().getToken();
      //await AltcraftSDK.setPushToken('android-firebase', token);
    } catch {
      //await AltcraftSDK.setPushToken('android-firebase', null);
    }
  })();

  messaging().onTokenRefresh((t) => {
    AltcraftSDK.setPushToken('android-firebase', t).catch(() => {});
  });
}

// Background FCM
export function registerFCMBackgroundPush(): void {
  if (fcmBg || Platform.OS !== 'android') return;
  fcmBg = true;

  messaging().setBackgroundMessageHandler(async (rm) => {
    // const payload = RemoteMessagetoStringMap(rm?.data);
    // if (payload) AltcraftSDK.takePush(payload);
  });
}

// Foreground FCM
export function registerFCMForegroundPush(): void {
  if (fcmFg || Platform.OS !== 'android') return;
  fcmFg = true;

  messaging().onMessage(async (rm: FirebaseMessagingTypes.RemoteMessage) => {
    // const payload = RemoteMessagetoStringMap(rm?.data);
    // if (payload) AltcraftSDK.takePush(payload);
  });
}

// ---------- Facade ----------

export const Push = {
  registerFCMPushTokenSync,
  registerFCMBackgroundPush,
  registerFCMForegroundPush,
} as const;