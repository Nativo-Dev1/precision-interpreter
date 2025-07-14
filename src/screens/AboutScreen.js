// src/screens/AboutScreen.js

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode as b64decode } from 'base-64';
import { Ionicons } from '@expo/vector-icons';

import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import { AuthContext } from '../contexts/AuthContext';

export default function AboutScreen() {
  const { setUserToken } = useContext(AuthContext);
  const [email, setEmail] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          let decodedEmail = '';
          try {
            const [, payloadSeg] = token.split('.');
            const decodedString = b64decode(payloadSeg);
            const payloadObj = JSON.parse(decodedString);
            decodedEmail = payloadObj.email || '';
          } catch {}
          setEmail(decodedEmail);
        }
      } catch {}
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      setUserToken(null);
    } catch (err) {
      console.error('❌ [Logout] Error:', err);
      Alert.alert('Logout Failed');
    }
  };

  return (
    <ScreenWrapper>
      <Header title="About Nativo" />

      <ScrollView contentContainerStyle={styles.container}>
        {email ? (
          <View style={styles.authRow}>
            <Text style={styles.authLabel}>Logged in as:</Text>
            <Text style={styles.authEmail}>{email}</Text>
          </View>
        ) : null}

        <Text style={styles.title}>Nativo Interpreter</Text>
        <Text style={styles.version}>Version 1.0.54</Text>
        <Text style={styles.text}>
          Nativo is a real-time bilingual voice and visual interpreter designed for clarity, speed, and cross-cultural communication.
        </Text>
        <Text style={styles.text}>
          • 🎤 Translate spoken language live{'\n'}
          • 📷 Translate text from photos{'\n'}
          • 🎧 Hear translated speech aloud{'\n'}
          • 📚 Review recent translations
        </Text>
        <Text style={styles.textMuted}>© 2025 Nativo Labs. All rights reserved.</Text>

        {email ? (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="white" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  authRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
    marginBottom: 20,
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
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
  logoutButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
});
