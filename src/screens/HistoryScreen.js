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
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import ScreenWrapper from '../components/ScreenWrapper';
import { getHistory, clearHistory } from '../utils/historyStorage';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const h = await getHistory();
    setHistory(h);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, []);

  const confirmClear = () => {
    Alert.alert(
      'Clear History?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  const copyBubble = async (orig, trans) => {
    const text = `${orig}\n\n${trans}`;
    await Clipboard.setStringAsync(text);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Copied translation!', ToastAndroid.SHORT);
    } else {
      Alert.alert('Copied translation!');
    }
  };

  return (
    <ScreenWrapper>
      <Header title="History" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📜 Translation History</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#0ea5e9" style={styles.loader} />
        ) : history.length === 0 ? (
          <Text style={styles.empty}>No saved translations yet.</Text>
        ) : (
          history.map(item => (
            <TouchableOpacity
              key={item.timestamp.toString()}
              activeOpacity={0.8}
              onLongPress={() => copyBubble(item.original, item.translated)}
            >
              <View style={styles.card}>
                <View style={styles.header}>
                  <Text style={styles.langs}>{item.from} → {item.to}</Text>
                  <Text style={styles.time}>
                    {new Date(item.timestamp).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.label}>Original:</Text>
                <Text style={styles.text}>{item.original}</Text>
                <Text style={[styles.label, { marginTop: 8 }]}>Translated:</Text>
                <Text style={styles.text}>{item.translated}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity style={styles.clearBtn} onPress={confirmClear}>
          <Text style={styles.clearTxt}>Clear History</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 0,
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
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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
    color: '#3b82f6',
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
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
