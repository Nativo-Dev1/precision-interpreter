import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_SETTINGS = {
  speaker1Gender: 'neutral',
  speaker2Gender: 'neutral',
  formality: 'formal',
  autoplay: true,
};

export async function loadSettings() {
  try {
    const stored = await AsyncStorage.getItem('nativoSettings');
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (err) {
    console.warn('[⚠️ settingsLoader] Failed to load settings', err);
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem('nativoSettings', JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error('[❌ settingsLoader] Failed to save settings', err);
    return false;
  }
}
