// App.js

import React from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

import { QuotaProvider } from './src/contexts/QuotaContext';  // ← added

import HomeScreen from './src/screens/HomeScreen';
import PhotoTranslateScreen from './src/screens/PhotoTranslateScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AboutScreen from './src/screens/AboutScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <QuotaProvider>  {/* ← wrapped entire navigator */}
        <NavigationContainer>
          <AppTabs />
        </NavigationContainer>
      </QuotaProvider>
    </SafeAreaProvider>
  );
}

function AppTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',

        tabBarStyle: {
          backgroundColor: '#fff',
          paddingBottom: insets.bottom + 10,
          paddingTop:    8,
          height:        60 + insets.bottom,
          borderTopWidth: 0,
          shadowColor:    '#000',
          shadowOpacity:  0.03,
          shadowRadius:   4,
          shadowOffset:   { width: 0, height: -1 },
          elevation:      1,
        },

        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home:     'home',
            Camera:   'camera',
            History:  'book',
            Settings: 'settings',
            About:    'information-circle',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Camera" component={PhotoTranslateScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="About" component={AboutScreen} />
    </Tab.Navigator>
  );
}
