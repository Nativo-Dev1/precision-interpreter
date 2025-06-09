
// src/screens/RegisterScreen.js

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  StyleSheet 
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';
import { register } from '../services/api';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const json = await register(email.trim(), password);
      // Expect { success: true, message: "Registration successful. Please check your email to confirm." }
      if (json.success) {
        Alert.alert(
          'Check Your Email',
          json.message,
          [{ text: 'OK', onPress: () => navigation.replace('Login') }]
        );
      } else {
        console.warn('[Register] API returned success:false', json);
        Alert.alert('Registration Failed', json.error || 'Unknown error');
      }
    } catch (err) {
      // Log full error for debugging
      console.error('[Register] Network or server error:', err);
      // Show the actual message if available
      const msg = err.message?.replace(/^[^{]*\{/, '{') || err.toString();
      Alert.alert('Registration Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Register" />

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
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
          <ActivityIndicator style={styles.indicator} />
        ) : (
          <PrimaryButton label="Sign Up" onPress={handleRegister} />
        )}

        <Text style={styles.bottomText}>
          Already have an account?{' '}
          <Text 
            style={styles.link} 
            onPress={() => navigation.replace('Login')}
          >
            Log In
          </Text>
        </Text>
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
  input: {
    height: 48,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
  indicator: {
    marginVertical: 20,
  },
  bottomText: {
    marginTop: 24,
    textAlign: 'center',
    color: '#4B5563',
  },
  link: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
