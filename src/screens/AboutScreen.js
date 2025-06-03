// frontend/src/screens/AboutScreen.js

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jwtDecode from 'jwt-decode'; // <-- ES import

export default function AboutScreen() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('userToken');
        setToken(stored || '');
        if (stored) {
          let decodedEmail = '';
          try {
            const payload = jwtDecode(stored);
            decodedEmail = payload.email || '';
          } catch (err) {
            decodedEmail = '<decode failed>';
          }
          setEmail(decodedEmail);
        }
      } catch (err) {
        console.error('Error reading token from AsyncStorage:', err);
        setToken('');
        setEmail('');
      }
    })();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>🔍 Raw token from AsyncStorage:</Text>
      <Text selectable style={[styles.value, token ? {} : styles.none]}>
        {token || '<none>'}
      </Text>

      <Text style={styles.label}>📧 Decoded email:</Text>
      <Text selectable style={[styles.value, email ? {} : styles.none]}>
        {email || '<none>'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
    color: '#333',
  },
  value: {
    fontSize: 16,
    marginTop: 4,
    color: '#111',
  },
  none: {
    color: 'red',
  },
});
