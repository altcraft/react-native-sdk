import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Image, StyleSheet } from 'react-native';
import HomeScreen from './HomeScreen';
import LogsScreen from './LogsScreen';
import ConfigScreen from './ConfigScreen';
import ExampleScreen from './ExampleScreen';

const Tab = createBottomTabNavigator();

const isAndroid = Platform.OS === 'android';

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#fff',
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
            borderWidth: 0,
            borderBottomWidth: 0,
          },
          headerShadowVisible: true,
          headerTitleAlign: isAndroid ? 'left' : 'left',
          headerTitle: () => (
            <Image
              source={require('../assets/ic_altcraft.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          ),
          tabBarActiveTintColor: '#000',
          tabBarInactiveTintColor: '#000',
          tabBarStyle: {
            paddingBottom: isAndroid ? 8 : 25,
            height: 69,
            backgroundColor: '#fff',
            borderWidth: 0,
            borderTopWidth: 0,
            elevation: 0,
            shadowColor: 'transparent',
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: 2,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerStyle: {
              backgroundColor: '#fff',
              shadowColor: 'transparent',
              elevation: 0,
              borderWidth: 0,
              borderBottomWidth: 0,
            },
            headerShadowVisible: false,
            tabBarIcon: () => (
              <Image
                source={require('../assets/tabs/ic_menu_home.png')}
                style={[styles.tabIcon, { tintColor: '#000' }]}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Logs"
          component={LogsScreen}
          options={{
            tabBarIcon: () => (
              <Image
                source={require('../assets/tabs/ic_menu_log.png')}
                style={[styles.tabIcon, { tintColor: '#000' }]}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Config"
          component={ConfigScreen}
          options={{
            tabBarIcon: () => (
              <Image
                source={require('../assets/tabs/ic_menu_config.png')}
                style={[styles.tabIcon, { tintColor: '#000' }]}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Example"
          component={ExampleScreen}
          options={{
            tabBarIcon: () => (
              <Image
                source={require('../assets/tabs/ic_menu_example.png')}
                style={[styles.tabIcon, { tintColor: '#000' }]}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerLogo: {
    height: 22,
    width: 84,
  },
  tabIcon: {
    width: 23,
    height: 23,
  },
});
