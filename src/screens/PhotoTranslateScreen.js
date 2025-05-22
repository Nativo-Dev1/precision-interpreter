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

export default function PhotoTranslateScreen() {
  const [imageUri, setImageUri]       = useState(null);
  const [original, setOriginal]       = useState('');
  const [translated, setTranslated]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [sourceLang, setSourceLang]   = useState(null);
  const [targetLang, setTargetLang]   = useState(null);

  const isFocused = useIsFocused();
  const { quota, loading: quotaLoading, refreshQuota } = useContext(QuotaContext);

  // Load the locked pair from HomeScreen
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

  useEffect(() => {
    loadLangPair();
  }, [loadLangPair]);

  useEffect(() => {
    if (isFocused) loadLangPair();
  }, [isFocused, loadLangPair]);

  if (quotaLoading) {
    return <ActivityIndicator style={{ flex: 1, justifyContent: 'center' }} />;
  }
  const pickImage = async () => {
    if (quota.remainingScans < 1) {
      return Alert.alert(
        'Out of scans',
        'You’ve used your camera scans. Tap “Buy more” to add more scans.'
      );
    }
    if (!sourceLang || !targetLang) {
      return Alert.alert(
        'Select language first',
        'Go back to Home and lock your language pair.'
      );
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission required', 'Camera access is needed.');
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.length) {
      return Alert.alert('Error', 'Could not get image URI.');
    }
    const uri = result.assets[0].uri;
    setImageUri(uri);
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
      // **Reverse direction**: translate from targetLang → sourceLang
      const resp = await uploadImageForOcr(fileUri, targetLang, sourceLang);
      if (!resp.success) throw new Error(resp.error || 'Server error');

      setOriginal(resp.original);
      setTranslated(resp.translated);

      // ── Save to history ────────────────────────────────────────
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
      }
      // ───────────────────────────────────────────────────────────

      refreshQuota();
    } catch (err) {
      console.error('[PhotoTranslate ERROR]', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <ScreenWrapper>
      <Header title="Photo Translate" />

      <Text style={styles.scanCount}>📷 {quota.remainingScans} scans left</Text>

      {/* Show reversed flow label */}
      {sourceLang && targetLang && (
        <Text style={styles.langFlowLabel}>
          {targetLang} → {sourceLang}
        </Text>
      )}

      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.cameraButton, (loading || !sourceLang) && { opacity: 0.5 }]}
          onPress={pickImage}
          disabled={loading || !sourceLang}
        >
          <Ionicons name="camera-outline" size={28} color="white" />
          <Text style={styles.cameraText}>Take Photo</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
        )}

        {(original || translated) && (
          <ScrollView style={styles.textContainer} nestedScrollEnabled>
            {original && (
              <>
                <Text style={styles.label}>Extracted Text</Text>
                <Text style={styles.text}>{original}</Text>
              </>
            )}
            {translated && (
              <>
                <Text style={[styles.label, { marginTop: 16 }]}>Translated Text</Text>
                <Text style={styles.text}>{translated}</Text>
              </>
            )}
          </ScrollView>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scanCount:     { margin: 16, fontSize: 16 },
  langFlowLabel: {
    textAlign:  'center',
    fontSize:   16,
    fontWeight: '600',
    color:      '#3b82f6',
    marginBottom: 12,
  },
  container:     { flex:1, padding:16, alignItems:'stretch' },
  cameraButton:  {
    flexDirection:   'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal:20,
    borderRadius:    8,
    alignItems:      'center',
    alignSelf:       'center',
  },
  cameraText:    { color:'white', marginLeft:8, fontWeight:'600', fontSize:16 },
  preview:       { width:'100%', height:'35%', marginTop:16, borderRadius:8 },
  textContainer: { flex:1, width:'100%', marginTop:16 },
  label:         { fontWeight:'700', color:'#334155', marginBottom:4, fontSize:14 },
  text:          { color:'#1e293b', lineHeight:22, fontSize:16 },
});
