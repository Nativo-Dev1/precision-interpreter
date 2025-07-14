// src/utils/historyStorage.js

import AsyncStorage from '@react-native-async-storage/async-storage';

export const HISTORY_KEY = 'TRANSLATION_HISTORY';

export async function getHistory() {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load history', err);
    return [];
  }
}

export async function addHistoryEntry(entry) {
  try {
    const hist = await getHistory();
    hist.unshift(entry);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  } catch (err) {
    console.error('Failed to add history entry', err);
  }
}

export async function clearHistory() {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.error('Failed to clear history', err);
  }
}
