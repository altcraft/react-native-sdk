// example/App.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import AltcraftSDK from 'react-native-sdk';
import messaging from '@react-native-firebase/messaging';

const API_URL = "your api url";

const JWT_TOKEN = null

type AltcraftConfigFromSdk = Parameters<typeof AltcraftSDK.initialize>[0];

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

function toStringMap(input: unknown): { [key: string]: string } | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return null;

  const out: { [key: string]: string } = {};
  for (const k of keys) {
    const v = obj[k];
    if (v == null) continue;
    out[k] = String(v);
  }
  return Object.keys(out).length > 0 ? out : null;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * iOS: APNS token приходит НЕ из JS, а из AppDelegate -> SdkModule.shared.setAPNS(hex) / SdkAppModule.shared.setAPNS(hex)
 * Поэтому в JS мы ждём, пока SDK увидит токен (getPushToken()).
 */
async function waitForIosApnsToken(maxAttempts: number): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const token = await AltcraftSDK.getPushToken();
    const provider = token?.provider ?? null;
    const value = token?.token ?? null;

    if (provider && value && String(value).length > 0) {
      return true;
    }
    await sleep(400);
  }
  return false;
}

/**
 * ✅ Тестовые custom fields
 */
const testCustomFields: { [key: string]: any } = {
  test_double: 123.45,
  test_str: 'Строковое значение',
  test_int: 12345,
  test_bool: true,
};

// ✅ Mobile Event constants
const MOBILE_EVENT_SID = '2gFE1SuJ4eJj-08a78b7b3baddce7';

type SubscriptionStatusUi = {
  httpCode: string;
  error: string;
  errorText: string;
  profileStatus: string;
  subscriptionStatus: string;
  provider: string;
  subscriptionId: string;
  hashId: string;
};

function s(v: any): string {
  if (v == null) return '—';
  const t = String(v);
  return t.length > 0 ? t : '—';
}

function mapStatusToUi(current: any): SubscriptionStatusUi {
  const httpCode = s(current?.httpCode);

  const resp = current?.response ?? null;
  const error = s(resp?.error);
  const errorText = s(resp?.errorText);

  const profile = resp?.profile ?? null;
  const profileStatus = s(profile?.status);

  const sub = profile?.subscription ?? null;
  const subscriptionStatus = s(sub?.status);
  const provider = s(sub?.provider);
  const subscriptionId = s(sub?.subscriptionId);
  const hashId = s(sub?.hashId);

  return {
    httpCode,
    error,
    errorText,
    profileStatus,
    subscriptionStatus,
    provider,
    subscriptionId,
    hashId,
  };
}

export default function App() {
  const [status, setStatus] = useState<string>('initializing...');
  const [iosTokenState, setIosTokenState] = useState<string>('unknown');

  // ✅ short status instead of full subscription JSON
  const [subStatusUi, setSubStatusUi] = useState<SubscriptionStatusUi | null>(null);

  // android extras
  const [fcmToken, setFcmToken] = useState<string>('no token yet');
  const [lastPushData, setLastPushData] = useState<string>('no pushes yet');

  const subStatusText = useMemo(() => {
    if (!subStatusUi) return 'not requested yet';
    return [
      `httpCode: ${subStatusUi.httpCode}`,
      `error: ${subStatusUi.error}`,
      `errorText: ${subStatusUi.errorText}`,
      `profile.status: ${subStatusUi.profileStatus}`,
      `subscription.status: ${subStatusUi.subscriptionStatus}`,
      `subscription.provider: ${subStatusUi.provider}`,
      `subscriptionId: ${subStatusUi.subscriptionId}`,
      `hashId: ${subStatusUi.hashId}`,
    ].join('\n');
  }, [subStatusUi]);

  useEffect(() => {
    let cancelled = false;
    let foregroundUnsubscribe: (() => void) | undefined;

    async function run() {
      try {
        // ---------------- iOS ----------------
        if (Platform.OS === 'ios') {
          await messaging().requestPermission();

          AltcraftSDK.setJwt(JWT_TOKEN);
          await AltcraftSDK.initialize(iosConfig);

          const ok = await waitForIosApnsToken(25);
          if (!cancelled) {
            setIosTokenState(ok ? 'apns token ready' : 'apns token NOT ready');
          }

          AltcraftSDK.pushSubscribe(
            true,
            { _fname: 'RN', _lname: 'IOS' },
            testCustomFields,
            null,
            null,
            null
          );

          AltcraftSDK.mobileEvent(
            MOBILE_EVENT_SID,
            `rn_${Platform.OS}_mobile_event`,
            null,
            {
              platform: Platform.OS,
              ts: Date.now(),
              source: 'example_app',
              note: 'after_push_subscribe',
            },
            null,
            null,
            { _fname: 'RN', _lname: 'IOS' }
          );

          // ✅ subscription status (short)
          await sleep(800);
          const current = await AltcraftSDK.getStatusForCurrentSubscription();

          if (!cancelled) {
            setSubStatusUi(mapStatusToUi(current));
          }

          if (!cancelled) setStatus('ok');
          return;
        }

        // ---------------- Android ----------------
        if (Platform.OS !== 'android') {
          if (!cancelled) setStatus('unsupported platform');
          return;
        }

        await messaging().requestPermission();
        const token = await messaging().getToken();
        if (!cancelled) setFcmToken(token);

        AltcraftSDK.setJwt(JWT_TOKEN);
        AltcraftSDK.setAndroidFcmToken(token);

        await AltcraftSDK.initialize(androidConfig);

        AltcraftSDK.requestNotificationPermission();

        AltcraftSDK.pushSubscribe(
          true,
          { _fname: 'RN', _lname: 'Android' },
          testCustomFields,
          null,
          null,
          null
        );

        AltcraftSDK.mobileEvent(
          MOBILE_EVENT_SID,
          `rn_${Platform.OS}_mobile_event`,
          null,
          {
            platform: Platform.OS,
            ts: Date.now(),
            source: 'example_app',
            note: 'after_push_subscribe',
          },
          null,
          null,
          { _fname: 'RN', _lname: 'Android' }
        );

        // foreground push → takePush(data)
        foregroundUnsubscribe = messaging().onMessage(async (remoteMessage) => {
          const data = remoteMessage?.data ?? null;
          const payload = toStringMap(data);

          if (!cancelled) {
            setLastPushData(JSON.stringify(remoteMessage, null, 2));
          }

          if (payload) {
            AltcraftSDK.takePush(payload);
          }
        });

        if (!cancelled) setStatus('ok');
      } catch (e) {
        if (!cancelled) setStatus(`error: ${String(e)}`);
      }
    }

    run();

    return () => {
      cancelled = true;
      if (foregroundUnsubscribe) foregroundUnsubscribe();
      AltcraftSDK.unsubscribeFromEvent();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AltcraftSDK init:</Text>
      <View style={styles.box}>
        <Text style={styles.mono}>{status}</Text>
      </View>

      {Platform.OS === 'ios' ? (
        <>
          <Text style={styles.title}>iOS token state:</Text>
          <View style={styles.box}>
            <Text style={styles.mono}>{iosTokenState}</Text>
          </View>

          <Text style={styles.title}>Sent customFields:</Text>
          <View style={styles.box}>
            <Text style={styles.mono}>
              {JSON.stringify(testCustomFields, null, 2)}
            </Text>
          </View>

          <Text style={styles.title}>Subscription status:</Text>
          <View style={styles.box}>
            <Text style={styles.mono}>{subStatusText}</Text>
          </View>
        </>
      ) : null}

      {Platform.OS === 'android' ? (
        <>
          <Text style={styles.title}>FCM token:</Text>
          <View style={styles.box}>
            <Text style={styles.mono}>{fcmToken}</Text>
          </View>

          <Text style={styles.title}>Sent customFields:</Text>
          <View style={styles.box}>
            <Text style={styles.mono}>
              {JSON.stringify(testCustomFields, null, 2)}
            </Text>
          </View>

          <Text style={styles.title}>Last foreground push:</Text>
          <View style={styles.box}>
            <Text style={styles.mono}>{lastPushData}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 64, paddingHorizontal: 16 },
  title: { fontWeight: '600', marginBottom: 12, marginTop: 16 },
  box: { borderWidth: 1, borderRadius: 8, padding: 12 },
  mono: { fontFamily: 'Menlo', fontSize: 12 },
});
