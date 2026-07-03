import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AltcraftSDK from '@altcraft/react-native-sdk';
import { Store } from './Store';
import type { SdkEventItem } from './Store';

export default function LogsScreen() {
  const [events, setEvents] = useState<SdkEventItem[]>([]);
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    Store.getEventList().then(setEvents);

    const handler = (event: any) => {
      if (!event) return;
      const item: SdkEventItem = {
        function: event.function ?? '',
        code: event.code ?? null,
        message: event.message ?? '',
        type: event.type ?? 'event',
        value: event.value ?? null,
        timestamp: Date.now(),
      };
      setEvents((prev) => {
        const next = [...prev, item];
        if (next.length > 200) next.splice(0, next.length - 200);
        Store.saveEventList(next);
        return next;
      });
    };

    AltcraftSDK.subscribeToEvents(handler);
    return () => {
      AltcraftSDK.unsubscribeFromEvent(handler);
    };
  }, []);

  useEffect(() => {
    if (events.length > 0 && scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: false });
    }
  }, [events.length]);

  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No events yet</Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {events.map((ev, i) => {
        const dateStr = new Date(ev.timestamp).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const timeStr = new Date(ev.timestamp).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });

        return (
          <View key={i}>
            <View style={styles.eventItem}>
              <Text style={styles.eventTimestamp}>
                {dateStr} {timeStr}
              </Text>
              <View style={styles.spacer} />
              <Text style={styles.eventMessage}>
                {ev.message || 'No message'}
              </Text>
            </View>
            {i < events.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: { color: '#999', fontSize: 14 },
  eventItem: { paddingHorizontal: 4 },
  eventTimestamp: { color: '#3678E2', fontSize: 10, fontWeight: '700' },
  spacer: { height: 5 },
  eventMessage: { color: '#000', fontSize: 10 },
  divider: { height: 0.8, backgroundColor: '#CCC', marginVertical: 8 },
});
