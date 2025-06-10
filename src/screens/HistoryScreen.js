// src/screens/HistoryScreen.js

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ToastAndroid,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ← import this
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import ScreenWrapper from '../components/ScreenWrapper';
import Header        from '../components/Header';

const HISTORY_KEY    = 'nativoHistory';
const FOOTER_HEIGHT  = 50;  // adjust if you want a taller button row

export default function HistoryScreen() {
  const insets    = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      setHistory(raw ? JSON.parse(raw) : []);
    } catch (e) {
      console.error('Error loading history:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFocused) loadHistory();
  }, [isFocused, loadHistory]);

  const clearHistory = () => {
    Alert.alert(
      'Clear History?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(HISTORY_KEY);
            setHistory([]);
          },
        },
      ]
    );
  };

  const copyToClipboard = async (orig, trans) => {
    const text = `${orig}\n\n${trans}`;
    try {
      await Clipboard.setStringAsync(text);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Copied!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Copied to clipboard!');
      }
    } catch (e) {
      console.error('Clipboard error:', e);
      Alert.alert('Error copying to clipboard');
    }
  };

  return (
    <ScreenWrapper>
      <Header title="History" />

      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: FOOTER_HEIGHT + insets.bottom + 20 },
          ]}
        >
          <Text style={styles.title}>📜 Translation History</Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#0ea5e9"
              style={styles.loader}
            />
          ) : history.length === 0 ? (
            <Text style={styles.empty}>No saved translations yet.</Text>
          ) : (
            history.map(item => {
              const time = new Date(item.timestamp).toLocaleString();
              const isPhoto = item.type === 'photo';
              return (
                <TouchableOpacity
                  key={item.timestamp}
                  activeOpacity={0.8}
                  onLongPress={() =>
                    copyToClipboard(item.original, item.translated)
                  }
                >
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Ionicons
                        name={isPhoto ? 'camera-outline' : 'mic-outline'}
                        size={20}
                        color="#0ea5e9"
                      />
                      <Text style={styles.cardTitle}>
                        {item.from} → {item.to}
                      </Text>
                      <Text style={styles.cardTime}>{time}</Text>
                    </View>
                    <Text style={styles.label}>Original:</Text>
                    <Text style={styles.text}>{item.original}</Text>
                    <Text style={[styles.label, { marginTop: 8 }]}>
                      Translated:
                    </Text>
                    <Text style={styles.text}>{item.translated}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Absolute-position footer above nav bar */}
        <View
          style={[
            styles.footer,
            {
              bottom: insets.bottom + 10, 
              height: FOOTER_HEIGHT,
            },
          ]}
        >
          <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.clearText}>Clear History</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative', // so footer absolute is relative to this
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1f2937',
  },
  loader: {
    marginTop: 40,
  },
  empty: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6b7280',
    marginTop: 32,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  cardTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  label: {
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  text: {
    color: '#1f2937',
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});
