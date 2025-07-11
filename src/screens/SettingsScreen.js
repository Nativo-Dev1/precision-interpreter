// frontend/src/screens/SettingsScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import Header from '../components/Header';
import ScreenWrapper from '../components/ScreenWrapper';

export default function SettingsScreen() {
  // 1. App settings state
  const [settings, setSettings] = useState({
    speaker1Gender: 'neutral',
    speaker2Gender: 'neutral',
    formality: 'formal',
    autoplay: true,
    recordDuration: 5,
  });

  // Load persisted settings from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('nativoSettings');
        if (saved) {
          setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    })();
  }, []);

  // Helpers to cycle through gender and duration options
  // Swapped male/female so cycle is neutral → female → male → neutral
  const cycleGender = (current) =>
    current === 'neutral'
      ? 'female'
      : current === 'female'
      ? 'male'
      : 'neutral';
  const cycleDuration = (current) => (current === 5 ? 10 : 5);

  // Update a single setting in state
  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Save settings back to AsyncStorage
  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(
        'nativoSettings',
        JSON.stringify(settings)
      );
      Alert.alert('✅ Settings Saved');
    } catch (err) {
      console.error('Error saving settings:', err);
      Alert.alert('❌ Failed to Save Settings');
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Settings" />

      <View style={styles.container}>
        {/* 1. Settings Title */}
        <Text style={styles.title}>⚙️ Settings</Text>

        {/* 2. Speaker 1 Gender */}
        <View style={styles.settingRow}>
          <Text style={styles.label}>(Left) Speaker Gender</Text>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() =>
              updateSetting(
                'speaker1Gender',
                cycleGender(settings.speaker1Gender)
              )
            }
          >
            <Text style={styles.buttonText}>
              {settings.speaker1Gender}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Speaker 2 Gender */}
        <View style={styles.settingRow}>
          <Text style={styles.label}>(Right) Speaker Gender</Text>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() =>
              updateSetting(
                'speaker2Gender',
                cycleGender(settings.speaker2Gender)
              )
            }
          >
            <Text style={styles.buttonText}>
              {settings.speaker2Gender}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Formality */}
        <View style={styles.settingRow}>
          <Text style={styles.label}>Formality</Text>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() =>
              updateSetting(
                'formality',
                settings.formality === 'formal'
                  ? 'informal'
                  : 'formal'
              )
            }
          >
            <Text style={styles.buttonText}>
              {settings.formality}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 5. Autoplay Translations */}
        <View style={styles.settingRow}>
          <Text style={styles.label}>Autoplay Translations</Text>
          <Switch
            value={settings.autoplay}
            onValueChange={(v) => updateSetting('autoplay', v)}
            trackColor={{ false: '#ccc', true: '#3B82F6' }}
            thumbColor="white"
          />
        </View>

        {/* 6. Max Recording Length */}
        <View style={styles.settingRow}>
          <Text style={styles.label}>Max Recording Length</Text>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() =>
              updateSetting(
                'recordDuration',
                cycleDuration(settings.recordDuration)
              )
            }
          >
            <Text style={styles.buttonText}>
              {settings.recordDuration}s
            </Text>
          </TouchableOpacity>
        </View>

        {/* 7. Save Settings Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSettings}
        >
          <Ionicons
            name="checkmark-done-outline"
            size={20}
            color="white"
          />
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1F2937',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
  },
  settingButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  saveButton: {
    marginTop: 30,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});

