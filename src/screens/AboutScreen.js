// frontend/src/screens/AboutScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';

// Use require() so jwtDecode is defined
const jwtDecode = require('jwt-decode');

export default function AboutScreen({ navigation }) {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        setToken(storedToken || '');
        if (storedToken) {
          // Try/catch in case decode fails
          let decodedEmail = '';
          try {
            decodedEmail = jwtDecode(storedToken).email;
          } catch (err) {
            console.warn('⚠️ [About] jwtDecode failed:', err);
          }
          setEmail(decodedEmail);
        }
      } catch (err) {
        console.error('Failed to load token in AboutScreen:', err);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      navigation.replace('Login');
    } catch (err) {
      console.error('Error during logout in AboutScreen:', err);
      Alert.alert('❌ Logout Failed');
    }
  };

  return (
    <ScreenWrapper>
      <Header title="About Nativo" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* 1. If we have a decoded email, show it + Log Out */}
        {email ? (
          <View style={styles.authRow}>
            <View>
              <Text style={styles.authLabel}>Logged in as:</Text>
              <Text style={styles.authEmail}>{email}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="white" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* 2. About content */}
        <Text style={styles.title}>Nativo Interpreter</Text>
        <Text style={styles.version}>Version 1.0.42</Text>
        <Text style={styles.text}>
          Nativo is a real-time bilingual voice and visual interpreter designed for clarity, speed, and cross-cultural communication.
        </Text>
        <Text style={styles.text}>
          • 🎤 Translate spoken language live{'\n'}
          • 📷 Translate text from photos (menus, signs, etc.){'\n'}
          • 🎧 Hear translated speech aloud in native voice{'\n'}
          • 📚 Review recent translations in History{'\n'}
        </Text>
        <Text style={styles.text}>
          Built with Expo, React Native, Google Cloud, and OpenAI.
        </Text>
        <Text style={styles.textMuted}>© 2025 Nativo Labs. All rights reserved.</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 80,
    backgroundColor: '#fff',
  },
  authRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  authLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  authEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
    color: '#007AFF',
  },
  version: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 14,
    lineHeight: 22,
  },
  textMuted: {
    fontSize: 14,
    color: 'gray',
    marginTop: 30,
    textAlign: 'center',
  },
});
