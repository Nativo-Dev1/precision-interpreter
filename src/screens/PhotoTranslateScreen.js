// src/screens/PhotoTranslateScreen.js

import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sentry from '@sentry/react-native';
import { useIsFocused } from '@react-navigation/native';
import Header from '../components/Header';
import ScreenWrapper from '../components/ScreenWrapper';
import { uploadImageForOcr } from '../services/api';
import { QuotaContext } from '../contexts/QuotaContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGPAIR_KEY } from '../constants/storageKeys';
import { addHistoryEntry } from '../utils/historyStorage';

export default function PhotoTranslateScreen() {
  const isFocused = useIsFocused();
  const {
    remainingScans,
    loading: quotaLoading,
    refreshQuota,
  } = useContext(QuotaContext);

  const [sourceLang, setSourceLang] = useState(null);
  const [targetLang, setTargetLang] = useState(null);
  const [imageUri, setImageUri]     = useState('');
  const [showImage, setShowImage]   = useState(true);
  const [original, setOriginal]     = useState('');
  const [translated, setTranslated] = useState('');
  const [loading, setLoading]       = useState(false);

  // Load locked language pair from HomeScreen
  const loadLangPair = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(LANGPAIR_KEY);
      if (raw) {
        const { source, target } = JSON.parse(raw);
        setSourceLang(source);
        setTargetLang(target);
      }
    } catch (e) {
      console.warn('Failed to load lang pair', e);
      Sentry.captureException(e);
    }
  }, []);

  useEffect(() => {
    loadLangPair();
  }, [loadLangPair, isFocused]);

  // Fetch quota on mount
  useEffect(() => {
    (async () => {
      try {
        await refreshQuota();
      } catch (e) {
        console.warn('Quota fetch failed', e);
        Sentry.captureException(e);
      }
    })();
  }, []);

  if (quotaLoading && !remainingScans) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  const pickImage = async () => {
    if (!sourceLang || !targetLang) {
      return Alert.alert(
        'Select language first',
        'Go back to Home and lock your language pair.'
      );
    }
    if (remainingScans <= 0) {
      return Alert.alert(
        'Out of scans',
        'You have no remaining scans. Tap “Buy More” to top up.'
      );
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission required', 'Camera access is needed.');
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.cancelled || !result.assets?.length) {
      return Alert.alert('Error', 'Could not get image.');
    }
    const uri = result.assets[0].uri;
    setImageUri(uri);
    setShowImage(true);
    setOriginal('');
    setTranslated('');
    processImage(uri);
  };

  const processImage = async (uri) => {
    setLoading(true);
    const fileUri =
      Platform.OS === 'android' && !uri.startsWith('file://')
        ? `file://${uri}`
        : uri;

    try {
      // ← fix: sourceLang first, then targetLang
      const resp = await uploadImageForOcr(fileUri, sourceLang, targetLang);

      if (!resp.success) {
        const msg = resp.error || '';
        if (msg.toLowerCase().includes('quota')) {
          Alert.alert('Out of scans', 'Tap “Buy More” to top up.');
        } else {
          Alert.alert('OCR error', resp.error || 'Scan failed.');
        }
        return;
      }

      if (!resp.original?.trim()) {
        Alert.alert('No text found', 'Try another photo with clearer text.');
        return;
      }

      setOriginal(resp.original);
      setTranslated(resp.translated);

      // Save locally
      await addHistoryEntry({
        id: Date.now().toString(),
        type: 'photo',
        original: resp.original,
        translated: resp.translated,
        timestamp: Date.now(),
        from: targetLang,
        to: sourceLang,
      });

      await refreshQuota();
    } catch (err) {
      Sentry.captureException(err);
      Alert.alert('OCR error', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Photo Translate" />
      <Text style={styles.scanCount}>📷 {remainingScans} scans left</Text>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={pickImage}
        >
          <Text style={styles.cameraText}>Take Photo</Text>
        </TouchableOpacity>
      )}

      {imageUri && showImage && (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      )}

      {(original || translated) && (
        <ScrollView style={styles.translationCard}>
          {original && (
            <>
              <Text style={styles.label}>Extracted Text</Text>
              <Text style={styles.text}>{original}</Text>
            </>
          )}
          {translated && (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>Translated Text</Text>
              <Text style={styles.text}>{translated}</Text>
            </>
          )}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scanCount: {
    textAlign:      'center',
    fontSize:       16,
    marginVertical: 8,
    color:          '#1e293b',
  },
  langFlowLabel: {
    textAlign:    'center',
    fontSize:     16,
    fontWeight:   '600',
    color:        '#3b82f6',
    marginBottom: 12,
  },
  container: {
    flex:           1,
    padding:        16,
    alignItems:     'stretch',
  },
  cameraButton: {
    flexDirection:     'row',
    backgroundColor:   '#3b82f6',
    paddingVertical:   8,
    paddingHorizontal: 16,
    borderRadius:      6,
    alignItems:        'center',
    alignSelf:         'center',
  },
  disabledButton: {
    opacity: 0.4,
  },
  cameraText: {
    color:      'white',
    marginLeft: 6,
    fontWeight: '600',
    fontSize:   14,
  },
  toggleButton: {
    marginTop:         8,
    alignSelf:         'center',
    paddingVertical:   4,
    paddingHorizontal: 8,
    borderRadius:      4,
  },
  toggleText: {
    color:      '#1e293b',
    fontSize:   12,
    fontWeight: '600',
  },
  preview: {
    width:        '100%',
    height:       '35%',
    marginTop:    16,
    borderRadius: 8,
  },

  // ---------- Translation Card Styles ----------
  translationScrollContainer: {
    flex:       1,
    width:      '100%',
    marginTop:  16,
  },
  translationCard: {
    backgroundColor: '#fff9c4',  // pale-yellow card
    padding:         20,
    borderRadius:    18,
  },
  translationLabel: {
    fontSize:      13,
    fontWeight:    '700',
    color:         '#475569',
    textTransform: 'uppercase',
  },
  translationText: {
    fontSize:   16,
    color:      '#1e293b',
    marginTop:  4,
    lineHeight: 22,
  },
  // ------------------------------------------------

  center: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
    padding:        16,
  },
  error: {
    color:        'red',
    textAlign:    'center',
    marginBottom: 12,
  },
});
