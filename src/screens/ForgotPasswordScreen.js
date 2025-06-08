// frontend/src/screens/ForgotPasswordScreen.js

import React, { useState } from 'react';
import { View, Text, TextInput, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendLink = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(
        'https://nativo-backend.onrender.com/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        }
      );
      const json = await resp.json();
      if (json.success) {
        Alert.alert(
          'Check Your Email',
          'If that account exists, you’ll receive a reset link shortly.',
          [{ text: 'OK', onPress: () => navigation.replace('Login') }]
        );
      } else {
        Alert.alert('Error', json.error || 'Something went wrong.');
      }
    } catch (err) {
      console.error('[ForgotPassword ERROR]', err);
      Alert.alert('Error', 'Network error—please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Forgot Password" />

      <View style={styles.form}>
        <Text style={styles.instructions}>
          Enter your email and we’ll send you a link to reset your password.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <PrimaryButton label="Send Reset Link" onPress={handleSendLink} />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  form: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 30,
  },
  instructions: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
});
