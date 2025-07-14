// App.js

import React, { useState, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  Button,
  StyleSheet,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

import linking from './src/config/linking';
import { AuthContext } from './src/contexts/AuthContext';
import { QuotaProvider } from './src/contexts/QuotaContext';

import HomeScreen           from './src/screens/HomeScreen';
import PhotoTranslateScreen from './src/screens/PhotoTranslateScreen';
import HistoryScreen        from './src/screens/HistoryScreen';
import SettingsScreen       from './src/screens/SettingsScreen';
import AboutScreen          from './src/screens/AboutScreen';
import LoginScreen          from './src/screens/LoginScreen';
import RegisterScreen       from './src/screens/RegisterScreen';
import ConfirmEmailScreen   from './src/screens/ConfirmEmailScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen  from './src/screens/ResetPasswordScreen';

const AuthStack = createStackNavigator();
const RootStack = createStackNavigator();
const Tab       = createBottomTabNavigator();

export default function App() {
  const [isReady, setIsReady]   = useState(false);
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    const { SENTRY_DSN } = Constants.expoConfig.extra || {};
    if (SENTRY_DSN) {
      Sentry.init({
        dsn: SENTRY_DSN,
        enableInExpoDevelopment: false,
        debug: false,
      });
      console.log('[Sentry] initialized');
    } else {
      console.log('[Sentry] no DSN provided, skipping initialization');
    }

    (async () => {
      try {
        const AsyncStorage = (await import(
          '@react-native-async-storage/async-storage'
        )).default;
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
      } catch (e) {
        Sentry.captureException(e);
        console.error('[Auth] Error loading token', e);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Oops—something went wrong.</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
          <Button title="Try Again" onPress={resetError} />
        </View>
      )}
    >
      <SafeAreaProvider>
        <QuotaProvider>
          <AuthContext.Provider value={{ userToken, setUserToken }}>
            <NavigationContainer linking={linking} fallback={<ActivityIndicator />}>
              <RootStack.Navigator screenOptions={{ headerShown: false }}>
                {userToken == null ? (
                  <RootStack.Screen name="Auth"  component={AuthFlow} />
                ) : (
                  <RootStack.Screen name="Main" component={AppTabs} />
                )}
              </RootStack.Navigator>
            </NavigationContainer>
          </AuthContext.Provider>
        </QuotaProvider>
      </SafeAreaProvider>
    </Sentry.ErrorBoundary>
  );
}

function AuthFlow() {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}
    >
      <AuthStack.Screen name="Login"          component={LoginScreen} />
      <AuthStack.Screen name="Register"       component={RegisterScreen} />
      <AuthStack.Screen name="ConfirmEmail"   component={ConfirmEmailScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function AppTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 2,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
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
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Camera"   component={PhotoTranslateScreen} />
      <Tab.Screen name="History"  component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="About"    component={AboutScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  errorMessage: {
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
});
