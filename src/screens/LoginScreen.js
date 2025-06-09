// src/screens/LoginScreen.js

import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../contexts/AuthContext';
import ScreenWrapper from '../components/ScreenWrapper';
import Header        from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';

const { BACKEND_URL } = Constants.expoConfig.extra;

export default function LoginScreen({ navigation }) {
  const { setUserToken } = useContext(AuthContext);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  // debug: ensure BACKEND_URL is correct
  useEffect(() => {
    console.log('🔗 BACKEND_URL is:', BACKEND_URL);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 403 && json.error.toLowerCase().includes('confirm')) {
          Alert.alert(
            'Email Not Confirmed',
            'Please confirm your email first. Check your inbox for the confirmation link.'
          );
        } else {
          Alert.alert('Login Failed', json.error || 'Invalid credentials.');
        }
        return;
      }

      // success → store & switch to main app
      await AsyncStorage.setItem('userToken', json.data.token);
      setUserToken(json.data.token);

    } catch (err) {
      console.error('❌ [Login] Network or server error:', err);
      Alert.alert('Network Error', 'Unable to login. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Login" />

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={{ marginTop: 20 }}
          />
        ) : (
          <PrimaryButton label="Login" onPress={handleLogin} />
        )}

        <TouchableOpacity
          style={styles.linkContainer}
          onPress={() => navigation.navigate('Register')}
          disabled={loading}
        >
          <Text style={styles.linkText}>
            Don't have an account?{' '}
            <Text style={styles.linkHighlight}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'ios' ? '20%' : '15%',
  },
  input: {
    height: 48,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  linkContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#6B7280',
  },
  linkHighlight: {
    color: '#2563EB',
    fontWeight: '600',
  },
});
