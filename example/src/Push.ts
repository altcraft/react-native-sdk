// Push.ts

import { Platform } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import AltcraftSDK from 'react-native-sdk';

import { RemoteMessagetoStringMap } from './Utilities';

export type PushPayload = Record<string, string>;

let backgroundRegistered = false;
let foregroundRegistered = false;

/**
 * Background handler:
 */
export function registerBackgroundPush(): void {
  if (backgroundRegistered) return;
  backgroundRegistered = true;

  if (Platform.OS !== 'android') return;

  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    const data = remoteMessage?.data ?? null;
    const payload = RemoteMessagetoStringMap(data);

    if (!payload) {
      console.log('[Push/background] no data payload, notification:', remoteMessage?.notification);
      return;
    }

    AltcraftSDK.takePush(payload);
  });
}

/**
 * Foreground handler:
 */
export function registerForegroundPush(): void {
  if (foregroundRegistered) return;
  foregroundRegistered = true;

  if (Platform.OS !== 'android') return;

  messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    const data = remoteMessage?.data ?? null;
    const payload = RemoteMessagetoStringMap(data);

    if (!payload) {
      console.log('[Push/foreground] no data payload, notification:', remoteMessage?.notification);
      return;
    }

    AltcraftSDK.takePush(payload);
  });
}

/**
 * Optional facade (handy if you prefer Push.registerX() style).
 */
export const Push = {
  registerBackgroundPush,
  registerForegroundPush,
} as const;
