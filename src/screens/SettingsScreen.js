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
import jwtDecode from 'jwt-decode';
import { Ionicons } from '@expo/vector-icons';

import Header from '../components/Header';
import ScreenWrapper from '../components/ScreenWrapper';

export default function SettingsScreen({ navigation }) {
  // 1. Authentication state
  const [email, setEmail] = useState('');

  // 2. App settings state
  const [settings, setSettings] = useState({
    speaker1Gender: 'neutral',
    speaker2Gender: 'neutral',
    formality: 'formal',
    autoplay: true,
    recordDuration: 5,
  });

  // Load JWT-based email and persisted settings
  useEffect(() => {
    (async () => {
      // Load token and decode email
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const { email: userEmail } = jwtDecode(token);
          setEmail(userEmail);
        }
      } catch (err) {
        console.error('Failed to load user token', err);
      }

      // Load saved settings from AsyncStorage
      try {
        const saved = await AsyncStorage.getItem('nativoSettings');
        if (saved) {
          setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    })();
  }, []);

  // Helpers to cycle through gender and duration options
  const cycleGender = current =>
    current === 'neutral' ? 'male' : current === 'male' ? 'female' : 'neutral';

  const cycleDuration = current => (current === 5 ? 10 : 5);

  // Update a single setting in state
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Save settings back to AsyncStorage
  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('nativoSettings', JSON.stringify(settings));
      Alert.alert('✅ Settings Saved');
    } catch (err) {
      console.error('Error saving settings:', err);
      Alert.alert('❌ Failed to Save Settings');
    }
  };

  // Handle user logout
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      navigation.replace('Login');
    } catch (err) {
      console.error('Error during logout:', err);
      Alert.alert('❌ Logout Failed');
    }
  };

  return (
    <ScreenWrapper>
      <Header />

      <View style={styles.container}>
        {/* 1. Display logged-in email and Logout button */}
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

        {/* 2. Settings Title */}
        <Text style={styles.title}>⚙️ Settings</Text>

        {/* 3. Speaker 1 Gender */}
        <View style={styles.settingRow}>
          <Text style={styles.label}>(Left) Speaker gender</Text>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() =>
              updateSetting('speaker1Gender', cycleGender(settings.speaker1Gender))
            }
          >
            <Text style={styles.buttonText}>{settings.speaker1Gender}</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Speaker 2 Gender */}
        <View style={styles.settingRow}>
          <Text style={styles.label}>(Right) Speaker gender</Text>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() =>
              updateSetting('speaker2Gender', cycleGender(settings.speaker2Gender))
            }
          >
            <Text style={styles.buttonText}>{settings.speaker2Gender}</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Formality */}
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

        {/* 6. Autoplay Translations */}
        <View style={styles.settingRow}>
          <Text style={styles.label}>Autoplay Translations</Text>
          <Switch
            value={settings.autoplay}
            onValueChange={v => updateSetting('autoplay', v)}
            trackColor={{ false: '#ccc', true: '#3b82f6' }}
            thumbColor="white"
          />
        </View>

        {/* 7. Max Recording Length */}
        <View style={styles.settingRow}>
          <Text style={styles.label}>Max Recording Length</Text>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() =>
              updateSetting('recordDuration', cycleDuration(settings.recordDuration))
            }
          >
            <Text style={styles.buttonText}>{settings.recordDuration}s</Text>
          </TouchableOpacity>
        </View>

        {/* 8. Save Settings Button */}
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
  },
  authRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
    color: '#1F2937',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
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
