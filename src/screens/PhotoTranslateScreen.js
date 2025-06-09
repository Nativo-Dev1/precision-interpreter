// frontend/src/screens/PhotoTranslateScreen.js

import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Button,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';

import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import { QuotaContext } from '../contexts/QuotaContext';
import { uploadImageForOcr } from '../services/api';

const LANGPAIR_KEY = 'nativoLangPair';
const HISTORY_KEY  = 'nativoHistory';

/** Capitalize the first letter of a language string */
function capitalize(str) {
  if (typeof str !== 'string' || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function PhotoTranslateScreen() {
  const [imageUri, setImageUri]       = useState(null);
  const [showImage, setShowImage]     = useState(true);
  const [original, setOriginal]       = useState('');
  const [translated, setTranslated]   = useState('');
  const [loading, setLoading]         = useState(false);      // ← tracks network calls
  const [sourceLang, setSourceLang]   = useState(null);
  const [targetLang, setTargetLang]   = useState(null);
  const [error, setError]             = useState(null);

  const isFocused = useIsFocused();
  const { quota: rawQuota, loading: quotaLoading, refreshQuota } = useContext(QuotaContext);
  const quota = rawQuota || {};

  // Only show scans here
  const remainingScans = quota.remainingScans ?? 0;

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

  // Initial and on-focus load of lang pair
  useEffect(() => {
    loadLangPair();
  }, [loadLangPair]);

  useEffect(() => {
    if (isFocused) loadLangPair();
  }, [isFocused, loadLangPair]);

  // Fetch quota on mount, handle error
  useEffect(() => {
    (async () => {
      try {
        await refreshQuota();
      } catch (e) {
        console.warn('Quota fetch failed', e);
        Sentry.captureException(e);
        setError('Unable to load scan quota. Tap retry.');
      }
    })();
  }, []);

  // Show spinner while the initial quota is loading
  if (quotaLoading && !rawQuota) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  // Error retry UI
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Button
          title="Retry"
          onPress={async () => {
            setError(null);
            try {
              await refreshQuota();
            } catch (e) {
              console.warn('Quota retry failed', e);
              Sentry.captureException(e);
              setError('Still unable to load quota.');
            }
          }}
        />
      </View>
    );
  }

  // Handler to launch camera
  const pickImage = async () => {
    if (loading) return; // Prevent if already processing

    if (!sourceLang || !targetLang) {
      return Alert.alert(
        'Select language first',
        'Go back to Home and lock your language pair.'
      );
    }

    if (remainingScans <= 0) {
      return Alert.alert(
        'Out of scans',
        'You’ve used all of your free scans. Tap “Buy More” to add more.'
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
    setShowImage(true);       // Reset to show image when a new one is picked
    setOriginal('');
    setTranslated('');
    processImage(uri);
  };

  // Handler to upload and process OCR
  const processImage = async (uri) => {
    setLoading(true);
    const fileUri =
      Platform.OS === 'android' && !uri.startsWith('file://')
        ? `file://${uri}`
        : uri;
    try {
      // Reverse direction: target → source
      const resp = await uploadImageForOcr(fileUri, targetLang, sourceLang);

      if (!resp.success) {
        const msg = resp.error || '';
        if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('remaining')) {
          Alert.alert(
            'Out of scans',
            'You have no remaining scans. Tap “Buy More” to top up.'
          );
        } else if (msg.toLowerCase().includes('file') || msg.toLowerCase().includes('image')) {
          Alert.alert(
            'Invalid image',
            'Could not process the photo. Please try again with a different image.'
          );
        } else {
          Alert.alert(
            'OCR error',
            'Something went wrong while scanning. Check your connection and try again.'
          );
        }
        throw new Error(msg);
      }

      // If no text extracted
      if (!resp.original || !resp.original.trim()) {
        Alert.alert('No text found', 'Try another photo with clearer text.');
        setLoading(false);
        return;
      }

      setOriginal(resp.original);
      setTranslated(resp.translated);

      // Save to history
      try {
        const entry = {
          original:   resp.original,
          translated: resp.translated,
          timestamp:  Date.now(),
          from:       targetLang,
          to:         sourceLang,
          type:       'photo',
        };
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        arr.unshift(entry);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
      } catch (e) {
        console.warn('Failed to save photo history', e);
        Sentry.captureException(e);
      }

      // Refresh quota
      await refreshQuota();
    } catch (err) {
      Sentry.captureException(err);
      if (!err.message.toLowerCase().includes('quota')) {
        // If quota error already alerted above, skip
        Alert.alert(
          'OCR error',
          err.message || 'Unable to scan. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Determine disabled state: loading or no language selected
  const isDisabled = loading || !sourceLang;

  return (
    <ScreenWrapper>
      <Header title="Photo Translate" />

      {/* Scan count */}
      <Text style={styles.scanCount}>📷 {remainingScans} scans left</Text>

      {sourceLang && targetLang && (
        <Text style={styles.langFlowLabel}>
          {capitalize(targetLang)} → {capitalize(sourceLang)}
        </Text>
      )}

      <View style={styles.container}>
        {/* Camera button */}
        <TouchableOpacity
          style={[styles.cameraButton, isDisabled && styles.disabledButton]}
          onPress={pickImage}
          disabled={isDisabled}
        >
          <Ionicons name="camera-outline" size={28} color="white" />
          <Text style={styles.cameraText}>
            {loading ? 'Scanning…' : 'Take Photo'}
          </Text>
        </TouchableOpacity>

        {/* Spinner while OCR/translate is in progress */}
        {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

        {/* Show/Hide toggle (only when imageUri exists) */}
        {imageUri ? (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowImage(prev => !prev)}
          >
            <Text style={styles.toggleText}>
              {showImage ? 'Hide Photo' : 'Show Photo'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Image preview (only when showImage is true) */}
        {imageUri && showImage && (
          <Image
            source={{ uri: imageUri }}
            style={styles.preview}
            resizeMode="contain"
          />
        )}

        {/* ---------- Translation Card ---------- */}
        {(original || translated) && (
          <ScrollView style={styles.translationScrollContainer} nestedScrollEnabled>
            <View style={styles.translationCard}>
              {original ? (
                <>
                  <Text style={styles.translationLabel}>Extracted Text</Text>
                  <Text style={styles.translationText}>{original}</Text>
                </>
              ) : null}

              {translated ? (
                <>
                  <Text style={[styles.translationLabel, { marginTop: 12 }]}>
                    Translated Text
                  </Text>
                  <Text style={styles.translationText}>{translated}</Text>
                </>
              ) : null}
            </View>
          </ScrollView>
        )}
        {/* -------- end Translation Card -------- */}
      </View>
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
