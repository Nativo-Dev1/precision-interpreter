// src/screens/RegisterScreen.js
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../contexts/AuthContext';
import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';

export default function RegisterScreen({ navigation }) {
  const { setUserToken } = useContext(AuthContext);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      return Alert.alert('Error', 'Please enter both email and password.');
    }
    setLoading(true);
    try {
      const response = await fetch(
        'https://nativo-backend.onrender.com/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        }
      );
      const { success, data, message, error } = await response.json();

      if (success) {
        if (data?.token) {
          await AsyncStorage.setItem('userToken', data.token);
          setUserToken(data.token);
        } else {
          Alert.alert(
            'Check Your Email',
            message || 'Please confirm your email before logging in.',
            [{ text: 'OK', onPress: () => navigation.replace('Login') }]
          );
        }
      } else {
        Alert.alert('Registration Failed', error || 'Unable to create account');
      }
    } catch (err) {
      console.error('❌ [Register] Error:', err);
      Alert.alert('Error', 'Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Register" />
      <View style={styles.container}>
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
          <ActivityIndicator style={styles.loader} />
        ) : (
          <PrimaryButton label="Sign Up" onPress={handleRegister} />
        )}

        <Text style={styles.footer}>
          Already have an account?{' '}
          <Text
            style={styles.link}
            onPress={() => navigation.replace('Login')}
          >
            Log in
          </Text>
        </Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 30,
  },
  input: {
    height: 48,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  loader: {
    marginVertical: 20,
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    color: '#4B5563',
  },
  link: {
    color: '#2563EB',
    fontWeight: '600',
  },
});

