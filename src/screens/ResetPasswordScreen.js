// src/screens/ResetPasswordScreen.js

import React, { useState } from 'react';
import { View, Text, TextInput, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';
import Constants from 'expo-constants';

export default function ResetPasswordScreen({ route, navigation }) {
  const { token, email } = route.params || {};
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!newPassword || newPassword !== confirm) {
      Alert.alert('Error', 'Passwords must match and not be empty.');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(
        `${Constants.expoConfig.extra.BACKEND_URL}/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token, newPassword }),
        }
      );
      const json = await resp.json();
      if (json.success) {
        Alert.alert('Success', json.message, [
          { text: 'OK', onPress: () => navigation.replace('Login') },
        ]);
      } else {
        Alert.alert('Error', json.error || 'Reset failed.');
      }
    } catch (err) {
      console.error('[ResetPassword ERROR]', err);
      Alert.alert('Error', 'Network error—please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <ScreenWrapper>
        <Header title="Reset Password" />
        <View style={styles.center}>
          <Text style={styles.errorText}>
            Invalid reset link. Please request a new one.
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header title="Reset Password" />

      <View style={styles.form}>
        <Text style={styles.instructions}>
          Set a new password for {email}.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="New Password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          editable={!loading}
        />

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <PrimaryButton label="Reset Password" onPress={handleReset} />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  form: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 20,
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 16,
  },
});

