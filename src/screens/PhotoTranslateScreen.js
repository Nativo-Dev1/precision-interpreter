// src/screens/PhotoTranslateScreen.js

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

import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import { QuotaContext } from '../contexts/QuotaContext';
import { uploadImageForOcr } from '../services/api';

const LANGPAIR_KEY = 'nativoLangPair';
const HISTORY_KEY  = 'nativoHistory';

function capitalize(str) {
  return typeof str === 'string' && str.length > 0
    ? str.charAt(0).toUpperCase() + str.slice(1)
    : str;
}

export default function PhotoTranslateScreen() {
  const [imageUri, setImageUri]       = useState(null);
  const [showImage, setShowImage]     = useState(true);
  const [original, setOriginal]       = useState('');
  const [translated, setTranslated]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [sourceLang, setSourceLang]   = useState(null);
  const [targetLang, setTargetLang]   = useState(null);
  const [error, setError]             = useState(null);

  const isFocused = useIsFocused();
  const { quota: rawQuota, loading: quotaLoading, refreshQuota } = useContext(QuotaContext);
  const remainingScans = (rawQuota?.remainingScans ?? 0);

  // Load locked lang pair
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
    }
  }, []);

  useEffect(() => { loadLangPair(); }, [loadLangPair]);
  useEffect(() => { if (isFocused) loadLangPair(); }, [isFocused, loadLangPair]);

  // Fetch initial quota
  useEffect(() => {
    (async () => {
      try {
        await refreshQuota();
      } catch (e) {
        console.warn('Quota fetch failed', e);
        setError('Unable to load scan quota. Tap retry.');
      }
    })();
  }, [refreshQuota]);

  // Retry UI
  if (quotaLoading && rawQuota == null) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Button
          title="Retry"
          onPress={async () => {
            setError(null);
            try { await refreshQuota(); }
            catch { setError('Still unable to load quota.'); }
          }}
        />
      </View>
    );
  }

  // Launch camera
  const pickImage = async () => {
    if (!sourceLang || !targetLang) {
      return Alert.alert(
        'Select language first',
        'Lock your language pair on Home screen.'
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

  // Upload & process OCR
  const processImage = async (uri) => {
    setLoading(true);
    const fileUri = Platform.OS === 'android' && !uri.startsWith('file://')
      ? `file://${uri}`
      : uri;

    try {
      const resp = await uploadImageForOcr(fileUri, targetLang, sourceLang);
      if (!resp.success) {
        throw new Error(resp.error || 'Server returned an error');
      }
      setOriginal(resp.original);
      setTranslated(resp.translated);

      // Save history
      try {
        const entry = { original: resp.original, translated: resp.translated,
          timestamp: Date.now(), from: targetLang, to: sourceLang, type: 'photo' };
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        arr.unshift(entry);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
      } catch (e) {
        console.warn('Failed to save photo history', e);
      }

      await refreshQuota();
    } catch (err) {
      console.error('[PhotoTranslate ERROR]', err);
      // Show raw error if JSON parse failed
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || !sourceLang;

  return (
    <ScreenWrapper>
      <Header title="Photo Translate" />
      <Text style={styles.scanCount}>📷 {remainingScans} scans left</Text>
      {sourceLang && targetLang && (
        <Text style={styles.langFlowLabel}>
          {capitalize(targetLang)} → {capitalize(sourceLang)}
        </Text>
      )}

      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.cameraButton, isDisabled && styles.disabledButton]}
          onPress={pickImage}
          disabled={isDisabled}
        >
          <Ionicons name="camera-outline" size={28} color="white" />
          <Text style={styles.cameraText}>Take Photo</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}        

        {imageUri && (
          <TouchableOpacity style={styles.toggleButton} onPress={() => setShowImage(prev => !prev)}>
            <Text style={styles.toggleText}>{showImage ? 'Hide Photo' : 'Show Photo'}</Text>
          </TouchableOpacity>
        )}

        {imageUri && showImage && (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
        )}

        {(original || translated) && (
          <ScrollView style={styles.translationScrollContainer} nestedScrollEnabled>
            <View style={styles.translationCard}>
              {original !== '' && (
                <>
                  <Text style={styles.translationLabel}>Extracted Text</Text>
                  <Text style={styles.translationText}>{original}</Text>
                </>
              )}
              {translated !== '' && (
                <>
                  <Text style={[styles.translationLabel, { marginTop: 12 }]}>Translated Text</Text>
                  <Text style={styles.translationText}>{translated}</Text>
                </>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#dc2626', margin: 16, textAlign: 'center' },
  scanCount: { textAlign: 'center', fontSize: 16, marginVertical: 8, color: '#1e293b' },
  langFlowLabel: { textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#3b82f6', marginBottom: 12 },
  container: { flex: 1, padding: 16, alignItems: 'stretch' },
  cameraButton: { flexDirection: 'row', backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, alignItems: 'center', alignSelf: 'center' },
  disabledButton: { opacity: 0.4 },
  cameraText: { color: 'white', marginLeft: 6, fontWeight: '600', fontSize: 14 },
  toggleButton: { marginTop: 8, alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
  toggleText: { color: '#1e293b', fontSize: 12, fontWeight: '600' },
  preview: { width: '100%', height: '35%', marginTop: 16, borderRadius: 8 },
  translationScrollContainer: { flex: 1, width: '100%' },
  translationCard: { backgroundColor: '#fff9c4', padding: 20, borderRadius: 18 },
  translationLabel: { fontSize: 13, fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
  translationText: { fontSize: 18, color: '#1e293b', marginTop: 4, lineHeight: 24 },
});
