// src/screens/HistoryScreen.js

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ToastAndroid,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import Header        from '../components/Header';
import ScreenWrapper from '../components/ScreenWrapper';

const HISTORY_KEY = 'nativoHistory';

export default function HistoryScreen() {
  const isFocused = useIsFocused();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      setHistory(raw ? JSON.parse(raw) : []);
    } catch (err) {
      console.error('❌ Error loading history:', err);
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

  const copyBubble = async (orig, trans) => {
    const textToCopy = `${orig}\n\n${trans}`;
    try {
      await Clipboard.setStringAsync(textToCopy);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Copied translation!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Copied translation!');
      }
    } catch (e) {
      console.error('❌ Clipboard error:', e);
      Alert.alert('Error copying to clipboard');
    }
  };

  return (
    <ScreenWrapper>
      <Header title="History" />

      {/* Content container: header + scroll + footer */}
      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContainer}
        >
          <Text style={styles.title}>📜 Translation History</Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#0ea5e9"
              style={styles.loader}
            />
          ) : history.length === 0 ? (
            <Text style={styles.empty}>No saved conversations yet.</Text>
          ) : (
            history.map(item => {
              const time = new Date(item.timestamp).toLocaleString();
              const isPhoto = item.type === 'photo';
              return (
                <TouchableOpacity
                  key={item.timestamp}
                  activeOpacity={0.8}
                  onLongPress={() =>
                    copyBubble(item.original, item.translated)
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

        {/* Footer pinned at bottom */}
        <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
              <Ionicons name="trash-outline" size={18} color="white" />
              <Text style={styles.clearButtonText}>Clear History</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,               // fill below header
  },
  scrollView: {
    flex: 1,               // occupy all space above footer
  },
  scrollContainer: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
    textAlign: 'center',
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
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 16,
    color: '#0ea5e9',
    flex: 1,
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
  footerSafe: {
    backgroundColor: 'transparent',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  clearButton: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});
