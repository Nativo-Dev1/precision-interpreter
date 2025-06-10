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
import { Ionicons } from '@expo/vector-icons';    // ← named import

import ScreenWrapper  from '../components/ScreenWrapper';       // ← fixed path
import Header         from '../components/Header';              // ← fixed path
import { AuthContext } from '../contexts/AuthContext';          // ← fixed path

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
            const decodedString  = b64decode(payloadSeg);
            const payloadObj     = JSON.parse(decodedString);
            decodedEmail         = payloadObj.email || '';
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
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1e293b',
  },
  version: {
    marginBottom: 16,
    color: '#6b7280',
  },
  text: {
    fontSize: 16,
    color: '#334155',
    marginBottom: 12,
    lineHeight: 22,
  },
  textMuted: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
