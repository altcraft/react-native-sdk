import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import './services/config_extensions';
import { AltcraftInApp } from '@altcraft/inapp';
import { HomeScreen } from './screens/HomeScreen';
import { ExampleScreen } from './screens/ExampleScreen';
import { LogsScreen } from './screens/LogsScreen';
import { InAppScreen } from './screens/InAppScreen';
import { ConfigScreen } from './screens/ConfigScreen';
import { AppState } from './services/app_state';
import { EventBus } from './services/event_bus';
import { AppStateHolder, SdkTests } from './services/sdk_tests';
import { Store } from './services/store';

const TABS: Array<{ key: string; label: string; icon: number }> = [
  { key: 'home', label: 'Home', icon: require('../assets/ic_menu_home.png') },
  {
    key: 'example',
    label: 'Example',
    icon: require('../assets/ic_menu_example.png'),
  },
  { key: 'logs', label: 'Logs', icon: require('../assets/ic_menu_log.png') },
  { key: 'inapp', label: 'InApp', icon: require('../assets/ic_in_app.png') },
  {
    key: 'config',
    label: 'Config',
    icon: require('../assets/ic_menu_config.png'),
  },
];

/** Initializes the SDK with the previously saved configuration.
 *
 * Mirrors Android Application.onCreate and SDKFunctions.initAltcraft. */
async function bootstrap(): Promise<void> {
  await AppState.instance.init();

  const config = await Store.instance.getConfig();

  if (config.apiUrl != null && config.apiUrl.trim().length > 0) {
    try {
      await SdkTests.initializationSDK(config);
    } catch {
      // SDK initialization errors are handled by the event system.
    }
  }
}

/** Root application component. */
export default function App(): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    EventBus.instance.init();
    AppStateHolder.bind(AppState.instance.updateTokenUi);
    void bootstrap().finally(() => setReady(true));
  }, []);

  const onTabTap = useCallback((index: number) => {
    setCurrentIndex(index);

    if (index === 0) {
      AltcraftInApp.setScreen('home');
    } else if (index === 3) {
      AltcraftInApp.setScreen('inapp');
    }
  }, []);

  if (!ready) {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {/* All five screens remain mounted. Switching tabs does not
            recreate their state, mirroring the Flutter IndexedStack. */}
        <View
          style={[styles.screen, currentIndex === 0 ? null : styles.hidden]}
        >
          <HomeScreen />
        </View>
        <View
          style={[styles.screen, currentIndex === 1 ? null : styles.hidden]}
        >
          <ExampleScreen />
        </View>
        <View
          style={[styles.screen, currentIndex === 2 ? null : styles.hidden]}
        >
          <LogsScreen />
        </View>
        <View
          style={[styles.screen, currentIndex === 3 ? null : styles.hidden]}
        >
          <InAppScreen />
        </View>
        <View
          style={[styles.screen, currentIndex === 4 ? null : styles.hidden]}
        >
          <ConfigScreen />
        </View>
      </View>

      <View style={styles.bottomBar}>
        {TABS.map((tab, index) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.navButton}
            activeOpacity={0.9}
            accessibilityLabel={tab.label}
            accessibilityRole="button"
            onPress={() => onTabTap(index)}
          >
            <Image
              source={tab.icon}
              style={styles.navIcon}
              resizeMode="contain"
            />
            <Text style={styles.navLabel}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  screen: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
  bottomBar: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  navButton: {
    padding: 8,
    alignItems: 'center',
  },
  navIcon: {
    width: 23,
    height: 23,
  },
  navLabel: {
    fontSize: 10,
    color: '#000000',
    textAlign: 'center',
  },
});
