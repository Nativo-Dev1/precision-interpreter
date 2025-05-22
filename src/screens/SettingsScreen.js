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
  const [settings, setSettings] = useState({
    speaker1Gender: 'neutral',
    speaker2Gender: 'neutral',
    formality: 'formal',
    autoplay: true,
    recordDuration: 5,
  });

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('nativoSettings');
      if (saved) {
        setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      }
    })();
  }, []);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const cycleGender = current =>
    current === 'neutral' ? 'male' : current === 'male' ? 'female' : 'neutral';

  const cycleDuration = current => (current === 5 ? 10 : 5);

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('nativoSettings', JSON.stringify(settings));
      Alert.alert('✅ Settings Saved');
    } catch (err) {
      console.error('❌ Error saving settings', err);
      Alert.alert('❌ Failed to Save');
    }
  };

  return (
    <ScreenWrapper>
      <Header />
      <View style={styles.container}>
        <Text style={styles.title}>⚙️ Settings</Text>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Speaker 1 Gender</Text>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() =>
              updateSetting(
                'speaker1Gender',
                cycleGender(settings.speaker1Gender)
              )
            }
          >
            <Text style={styles.buttonText}>{settings.speaker1Gender}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Speaker 2 Gender</Text>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() =>
              updateSetting(
                'speaker2Gender',
                cycleGender(settings.speaker2Gender)
              )
            }
          >
            <Text style={styles.buttonText}>{settings.speaker2Gender}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Formality</Text>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() =>
              updateSetting(
                'formality',
                settings.formality === 'formal' ? 'informal' : 'formal'
              )
            }
          >
            <Text style={styles.buttonText}>{settings.formality}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Autoplay Translations</Text>
          <Switch
            value={settings.autoplay}
            onValueChange={v => updateSetting('autoplay', v)}
            trackColor={{ false: '#ccc', true: '#3b82f6' }}
            thumbColor="white"
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}> Max Recording Length</Text>
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

        <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
          <Ionicons name="checkmark-done-outline" size={20} color="white" />
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
    // backgroundColor removed so the ScreenWrapper background shows through
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1f2937',
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
    backgroundColor: '#3b82f6', // consistent button color
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
    backgroundColor: '#3b82f6',
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
