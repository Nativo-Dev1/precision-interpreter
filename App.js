// App.js

import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';                   // ← re-enabled
import * as Linking from 'expo-linking';
import {
  SafeAreaProvider,
  useSafeAreaInsets
} from 'react-native-safe-area-context';
import { NavigationContainer }       from '@react-navigation/native';
import { createStackNavigator }      from '@react-navigation/stack';
import { createBottomTabNavigator }  from '@react-navigation/bottom-tabs';
import { Ionicons }                  from '@expo/vector-icons';

import { AuthContext }   from './src/contexts/AuthContext';
import { QuotaProvider } from './src/contexts/QuotaContext';

import LoginScreen          from './src/screens/LoginScreen';
import RegisterScreen       from './src/screens/RegisterScreen';
import ConfirmEmailScreen   from './src/screens/ConfirmEmailScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen  from './src/screens/ResetPasswordScreen';

import HomeScreen           from './src/screens/HomeScreen';
import PhotoTranslateScreen from './src/screens/PhotoTranslateScreen';
import HistoryScreen        from './src/screens/HistoryScreen';
import SettingsScreen       from './src/screens/SettingsScreen';
import AboutScreen          from './src/screens/AboutScreen';

const AuthStack = createStackNavigator();
const RootStack = createStackNavigator();
const Tab       = createBottomTabNavigator();

// Initialize Sentry only when you’ve set a real DSN
const SENTRY_DSN = Constants.expoConfig.extra?.SENTRY_DSN;
if (SENTRY_DSN && !SENTRY_DSN.includes('YOUR_SENTRY_DSN')) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
      } catch (e) {
        Sentry.captureException(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const linkingConfig = {
    prefixes: [Linking.createURL('/'), 'nativo://'],
    config: {
      screens: {
        Auth: {
          screens: {
            Login:          'login',
            Register:       'register',
            ConfirmEmail:   'confirm-email',
            ForgotPassword: 'forgot-password',
            ResetPassword:  'reset-password',
          },
        },
        Main: {
          screens: {
            Home:     'home',
            Camera:   'camera',
            History:  'history',
            Settings: 'settings',
            About:    'about',
          },
        },
      },
    },
  };

  return (
    <Sentry.ErrorBoundary fallback={<Text>Something went wrong</Text>}>
      <SafeAreaProvider>
        <QuotaProvider>
          <AuthContext.Provider value={{ userToken, setUserToken }}>
            <NavigationContainer linking={linkingConfig} fallback={<ActivityIndicator />}>
              <RootStack.Navigator screenOptions={{ headerShown: false }}>
                {userToken == null ? (
                  <RootStack.Screen name="Auth" component={AuthFlow} />
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
    <AuthStack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
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
          position:      'absolute',
          height:        60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop:    8,
          backgroundColor: '#fff',
          borderTopWidth:  0,
          elevation:       2,
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
