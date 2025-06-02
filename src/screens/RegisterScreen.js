// frontend/src/screens/RegisterScreen.js

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = 'https://nativo-backend.onrender.com'; // replace if different

export default function RegisterScreen({ navigation, setUserToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const { success, data, error } = await response.json();

      if (success) {
        // 1) Save the JWT in AsyncStorage
        await AsyncStorage.setItem('userToken', data.token);
        // 2) Update App.js state so it switches to the tab navigator
        setUserToken(data.token);
        // No navigation.replace needed—App.js will re-render automatically
      } else {
        Alert.alert('Registration failed', error || 'Unable to create account');
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to connect to server.');
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button title="Sign Up" onPress={handleRegister} />
      <TouchableOpacity
        style={styles.linkContainer}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    padding: 10,
  },
  title: { fontSize: 24, marginBottom: 24, textAlign: 'center' },
  linkContainer: { marginTop: 16 },
  link: { color: '#007AFF', textAlign: 'center' },
});
