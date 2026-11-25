import React, { useEffect, useRef } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { SdkEvent } from '@altcraft/core';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppState } from '../services/app_state';

const K_LOG_BLUE = '#3678E2';

/** SDK events log screen. */
export function LogsScreen(): React.JSX.Element {
  const [, setTick] = React.useState(0);
  const listRef = useRef<FlatList<SdkEvent> | null>(null);

  useEffect(() => {
    const unsubscribe = AppState.instance.subscribe(() => setTick((t) => t + 1));
    return unsubscribe;
  }, []);

  const events = AppState.instance.events;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader />
      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No events yet</Text>
        </View>
      ) : (
        <View style={styles.listPadding}>
          <FlatList
            ref={listRef}
            data={events}
            keyExtractor={(_, i) => String(i)}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Text style={styles.timestamp}>
                  {item.timestamp ? item.timestamp : '—'}
                </Text>
                <Text style={styles.message}>
                  {item.message && item.message.length > 0
                    ? item.message
                    : 'No message'}
                </Text>
              </View>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#999999',
    fontSize: 14,
  },
  listPadding: {
    flex: 1,
    padding: 16,
  },
  separator: {
    height: 8,
    borderBottomWidth: 0.8,
    borderBottomColor: '#CCCCCC',
  },
  item: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  timestamp: {
    color: K_LOG_BLUE,
    fontSize: 10,
    fontWeight: '700',
  },
  message: {
    color: '#000000',
    fontSize: 10,
    marginTop: 5,
  },
});
