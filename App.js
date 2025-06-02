// App.js

import React, { useState, useEffect } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { QuotaProvider } from './src/contexts/QuotaContext';

import HomeScreen from './src/screens/HomeScreen';
import PhotoTranslateScreen from './src/screens/PhotoTranslateScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AboutScreen from './src/screens/AboutScreen';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
      } catch (e) {
        console.error('Error loading token', e);
      }
      setIsLoading(false);
    };
    checkToken();
  }, []);

  if (isLoading) {
    return null; // or a splash/loading component if you have one
  }

  return (
    <SafeAreaProvider>
      <QuotaProvider>
        <NavigationContainer>
          {userToken == null ? (
            <AuthStack setUserToken={setUserToken} />
          ) : (
            <AppTabs />
          )}
        </NavigationContainer>
      </QuotaProvider>
    </SafeAreaProvider>
  );
}

function AuthStack({ setUserToken }) {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen
        name="Login"
        options={{ headerShown: false }}
      >
        {(props) => <LoginScreen {...props} setUserToken={setUserToken} />}
      </Stack.Screen>
      <Stack.Screen
        name="Register"
        options={{ headerShown: false }}
      >
        {(props) => <RegisterScreen {...props} setUserToken={setUserToken} />}
      </Stack.Screen>
    </Stack.Navigator>
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
          paddingTop: 8,
          height: 60 + insets.bottom,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOpacity: 0.03,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -1 },
          elevation: 1,
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'home',
            Camera: 'camera',
            History: 'book',
            Settings: 'settings',
            About: 'information-circle',
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
