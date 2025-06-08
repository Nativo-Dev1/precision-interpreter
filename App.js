// App.js

import React, { createContext, useState, useEffect } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Sentry from '@sentry/react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

import { QuotaProvider } from './src/contexts/QuotaContext';

import HomeScreen from './src/screens/HomeScreen';
import PhotoTranslateScreen from './src/screens/PhotoTranslateScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AboutScreen from './src/screens/AboutScreen';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ConfirmEmailScreen from './src/screens/ConfirmEmailScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';

Sentry.init({
  dsn: process.env.SENTRY_DSN || 'https://YOUR_SENTRY_DSN',
  tracesSampleRate: 0.1,
});

export const AuthContext = createContext(null);

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const RootStack = createStackNavigator();

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
        console.error('Error loading token', e);
      }
      setIsLoading(false);
    })();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const linking = {
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
            <NavigationContainer linking={linking} fallback={<ActivityIndicator />}>
              <RootStack.Navigator screenOptions={{ headerShown:false }}>
                {userToken == null ? (
                  <RootStack.Screen name="Auth"  component={AuthStack}  />
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

function AuthStack() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown:false }}>
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Register"       component={RegisterScreen} />
      <Stack.Screen name="ConfirmEmail"   component={ConfirmEmailScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}

function AppTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown:       false,
        tabBarActiveTintColor:   '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#fff',
          paddingBottom:   insets.bottom + 10,
          paddingTop:      8,
          height:          60 + insets.bottom,
          borderTopWidth:  0,
          shadowColor:     '#000',
          shadowOpacity:   0.03,
          shadowRadius:    4,
          shadowOffset:    { width:0, height:-1 },
          elevation:       1,
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
