// src/screens/ConfirmEmailScreen.js

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';
import Constants from 'expo-constants';

export default function ConfirmEmailScreen({ route, navigation }) {
  const { token, email } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || !email) {
      setMessage('Invalid confirmation link.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const resp = await fetch(
          `${Constants.expoConfig.extra.BACKEND_URL}/confirm-email?token=${token}&email=${encodeURIComponent(email)}`
        );
        const json = await resp.json();
        if (json.success) {
          setMessage('✅ Email confirmed! You can now log in.');
          setTimeout(() => navigation.replace('Login'), 2000);
        } else {
          setMessage(json.error || '❌ Confirmation failed.');
        }
      } catch (err) {
        console.error('[ConfirmEmail ERROR]', err);
        setMessage('❌ Network error. Try again later.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, email]);

  return (
    <ScreenWrapper>
      <Header title="Email Confirmation" />
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <>
            <Text style={styles.text}>{message}</Text>
            <PrimaryButton label="Go to Login" onPress={() => navigation.replace('Login')} />
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  text: {
    marginBottom: 24,
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
});
