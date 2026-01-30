// App.tsx

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { initializationSDK, pushSubscribe, sendMobileEvent, subscribeToSdkEventsForTests, unsubscribeFromSdkEventsForTests, type SdkEventForTests } from './SDKTests';
import { Push } from './Push';

export default function App() {
  const [pushSubscribeRunning, setPushSubscribeRunning] = useState<boolean>(false);
  const [mobileEventRunning, setMobileEventRunning] = useState<boolean>(false);

  const [lastSdkEvent, setLastSdkEvent] = useState<SdkEventForTests | null>(null);

  // Run App
  useEffect(() => {
    // Push listeners
    Push.registerBackgroundPush();
    Push.registerForegroundPush();

    // SDK events
    subscribeToSdkEventsForTests((e) => {
      setLastSdkEvent(e);
    });

    let cancelled = false;

    // SDK initialization on each app start
    (async () => {
      try {
        await initializationSDK();
      } catch (e) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.warn('[initializationSDK] error:', e);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeFromSdkEventsForTests();
    };
  }, []);

  const onPressPushSubscribe = useCallback(async () => {
    if (pushSubscribeRunning) return;
    setPushSubscribeRunning(true);
    try {
      await pushSubscribe();
    } catch (e) {
      console.warn('[pushSubscribe] error:', e);
    } finally {
      setPushSubscribeRunning(false);
    }
  }, [pushSubscribeRunning]);

  const onPressSendMobileEvent = useCallback(async () => {
    if (mobileEventRunning) return;
    setMobileEventRunning(true);
    try {
      await sendMobileEvent();
    } catch (e) {
      console.warn('[sendMobileEvent] error:', e);
    } finally {
      setMobileEventRunning(false);
    }
  }, [mobileEventRunning]);

  const lastCode = lastSdkEvent?.code ?? null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* SDKEvent */}
      <View style={styles.box}>
        <Text style={styles.sectionTitle}>SDKEvent</Text>

        <Text style={styles.mono}>last code: {lastCode === null ? 'null' : String(lastCode)}</Text>

        <Text style={styles.mono}>type: {lastSdkEvent?.type ?? 'null'}</Text>

        <Text style={styles.mono}>function: {lastSdkEvent?.function ?? 'null'}</Text>

        <Text style={styles.mono}>message: {lastSdkEvent?.message ?? 'null'}</Text>
      </View>

      {/* Push subscribe */}
      <Pressable
        onPress={onPressPushSubscribe}
        disabled={pushSubscribeRunning}
        style={({ pressed }) => [
          styles.button,
          { marginTop: 16 },
          pushSubscribeRunning ? styles.buttonDisabled : null,
          pressed && !pushSubscribeRunning ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.buttonText}>{pushSubscribeRunning ? 'Subscribing...' : 'Push subscribe'}</Text>
      </Pressable>

      {/* Send mobile event */}
      <Pressable
        onPress={onPressSendMobileEvent}
        disabled={mobileEventRunning}
        style={({ pressed }) => [
          styles.button,
          { marginTop: 12 },
          mobileEventRunning ? styles.buttonDisabled : null,
          pressed && !mobileEventRunning ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.buttonText}>{mobileEventRunning ? 'Sending...' : 'Send mobile event'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 64, paddingHorizontal: 16, paddingBottom: 48 },

  box: { borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 16 },

  sectionTitle: { fontWeight: '800', marginBottom: 8 },

  mono: { fontFamily: 'Menlo', fontSize: 12 },

  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.7 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontWeight: '700' },
});
