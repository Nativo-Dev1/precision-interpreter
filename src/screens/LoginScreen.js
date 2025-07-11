// src/screens/LoginScreen.js
import React, { useState, useContext } from 'react';
import {
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../contexts/AuthContext';
import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';

export default function LoginScreen({ navigation }) {
  const { setUserToken } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('Error', 'Please enter both email and password.');
    }
    try {
      const response = await fetch('https://nativo-backend.onrender.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await response.json();

      if (response.status === 403 && json?.error?.includes('confirm')) {
        return Alert.alert(
          'Email Not Confirmed',
          'Please check your inbox and confirm your email before logging in.'
        );
      }

      if (json.success) {
        const token = json.token || json.data?.token;
        if (token) {
          await AsyncStorage.setItem('userToken', token);
          setUserToken(token);
        } else {
          Alert.alert('Login Failed', 'No token received.');
        }
      } else {
        Alert.alert('Login Failed', json.error || 'Invalid credentials.');
      }
    } catch (err) {
      console.error('❌ [Login] Error:', err);
      Alert.alert('Error', 'Unable to login. Please try again later.');
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Login" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotPassword}
        >
          <Text style={styles.linkHighlight}>Forgot Password?</Text>
        </TouchableOpacity>

        <PrimaryButton label="Login" onPress={handleLogin} />

        <TouchableOpacity
          style={styles.linkContainer}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>
            Don't have an account?{' '}
            <Text style={styles.linkHighlight}>Register</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
    paddingTop: 20,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
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
