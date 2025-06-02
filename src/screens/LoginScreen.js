// frontend/src/screens/LoginScreen.js

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

const BACKEND_URL = 'https://nativo-backend.onrender.com'; // adjust if your backend URL differs

export default function LoginScreen({ navigation, setUserToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const { success, data, error } = await response.json();

      if (success) {
        // 1) Store the JWT in AsyncStorage
        await AsyncStorage.setItem('userToken', data.token);
        // 2) Update App.js state to switch to the tab navigator
        setUserToken(data.token);
        // No need to call navigation.replace; App.js will re-render to AppTabs
      } else {
        Alert.alert('Login failed', error || 'Check your credentials');
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to connect to server.');
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log In</Text>
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
      <Button title="Log In" onPress={handleLogin} />
      <TouchableOpacity
        style={styles.linkContainer}
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.link}>Don't have an account? Sign up</Text>
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
