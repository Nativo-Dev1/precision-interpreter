// src/screens/HomeScreen.js
// Scroll and lock, press to record.

import React, {
  useEffect,
  useState,
  useRef,
  useContext,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  TextInput,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import AudioRecord from 'react-native-audio-record';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useIsFocused } from '@react-navigation/native';

import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import LanguageColumn from '../components/LanguageColumn';
import languages from '../constants/languages';
import { SETTINGS_KEY, LANGPAIR_KEY } from '../constants/storageKeys';
import { uploadAudio, uploadText } from '../services/api';
import { QuotaContext } from '../contexts/QuotaContext';

const ITEM_HEIGHT = 100;
const HISTORY_KEY  = 'nativoHistory';

export default function HomeScreen() {
  // State & refs
  const [lang1, setLang1]                   = useState(languages[0]);
  const [lang2, setLang2]                   = useState(languages[1]);
  const [locked, setLocked]                 = useState(false);
  const [count1, setCount1]                 = useState(null);
  const [count2, setCount2]                 = useState(null);
  const [loading, setLoading]               = useState(false);
  const [inFlight, setInFlight]             = useState(false);
  const [translation, setTranslation]       = useState(null);
  const [leftChatModal, setLeftChatModal]   = useState(false);
  const [rightChatModal, setRightChatModal] = useState(false);
  const [leftChatInput, setLeftChatInput]   = useState('');
  const [rightChatInput, setRightChatInput] = useState('');
  const [storeVisible, setStoreVisible]     = useState(false);

  // Prevent rapid re-taps
  const recordLock = useRef({ left: false, right: false });
  const lastAction = useRef(0);
  const stopped1   = useRef(false);
  const stopped2   = useRef(false);
  const timer      = useRef(null);
  const isFocused  = useIsFocused();

  // Stub IAP products until real setup
  const products = [
    { productId: 'bundle_starter_30min10scan', title: 'Starter Pack', description: '30 min voice + 10 scans', priceString: '$2.99' },
    { productId: 'bundle_regular_60min25scan', title: 'Regular Pack', description: '60 min voice + 25 scans', priceString: '$4.99' },
    { productId: 'bundle_pro_120min50scan',     title: 'Pro Pack',     description: '120 min voice + 50 scans', priceString: '$8.99' },
  ];

  // Settings
  const [settings, setSettings] = useState({
    speaker1Gender: 'neutral',
    speaker2Gender: 'neutral',
    formality:       'formal',
    autoplay:        true,
    recordDuration:  5,
  });

  // Quota context
  const { quota: rawQuota, loading: quotaLoading, refreshQuota } = useContext(QuotaContext);
  const quota = rawQuota || {};
  const effectiveQuota = __DEV__
    ? { remainingSeconds: Number.MAX_SAFE_INTEGER, interpretationsLeft: Number.MAX_SAFE_INTEGER }
    : quota;

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings(prev => ({ ...prev, ...JSON.parse(raw) }));
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
  }, []);

  // Initialize audio and permissions
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (res !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission required', 'Microphone access is needed.');
        }
      }
      AudioRecord.init({
        sampleRate:    16000,
        channels:      1,
        bitsPerSample: 16,
        wavFile:       'nativo.wav',
      });
    })();
    loadSettings();
    return () => clearInterval(timer.current);
  }, [loadSettings]);

  // Reload settings on focus
  useEffect(() => {
    if (isFocused) loadSettings();
  }, [isFocused, loadSettings]);

  // Play a local sound asset
  const playSound = async soundFile => {
    const { sound } = await Audio.Sound.createAsync(soundFile, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate(status =>
      status.didJustFinish && sound.unloadAsync()
    );
  };

  // Start voice recording
  const startRecording = async side => {
    const now = Date.now();
    if (now - lastAction.current < 500) return;
    lastAction.current = now;
    if (recordLock.current[side] || inFlight) return;
    recordLock.current[side] = true;

    const current = side === 'left' ? count1 : count2;
    if (current != null) return;

    if (!locked) {
      Haptics.selectionAsync();
      recordLock.current[side] = false;
      return;
    }

    Haptics.selectionAsync();
    await playSound(require('../../assets/ding.mp3'));

    let secs = settings.recordDuration;
    side === 'left' ? setCount1(secs) : setCount2(secs);
    AudioRecord.start();

    timer.current = setInterval(() => {
      secs -= 1;
      side === 'left' ? setCount1(secs) : setCount2(secs);
      if (secs <= 0) {
        clearInterval(timer.current);
        stopRecording(side);
      }
    }, 1000);
  };

  // Stop recording and upload
  const stopRecording = async side => {
    const now = Date.now();
    if (now - lastAction.current < 500) return;
    lastAction.current = now;
    if (inFlight) return;
    const setC = side === 'left' ? setCount1 : setCount2;
    const stop = side === 'left' ? stopped1 : stopped2;
    if (stop.current) return;
    stop.current = true;

    clearInterval(timer.current);
    setC(null);

    setLoading(true);
    setInFlight(true);
    try {
      const rawPath = await AudioRecord.stop();
      if (!rawPath) throw new Error('No audio recorded.');
      await playSound(require('../../assets/stop.mp3'));

      const uri = rawPath.startsWith('file://') ? rawPath : `file://${rawPath}`;
      const src = side === 'left' ? lang1.code : lang2.code;
      const tgt = side === 'left' ? lang2.code : lang1.code;

      const result = await uploadAudio({
        uri,
        speakerGender:  side === 'left' ? settings.speaker1Gender : settings.speaker2Gender,
        listenerGender: side === 'left' ? settings.speaker2Gender : settings.speaker1Gender,
        formality:      settings.formality,
        sourceLanguage: src,
        targetLanguage: tgt,
      });
      if (!result.success) throw new Error(result.error || 'Upload failed');
      setTranslation(result);

      // Auto-play TTS
      if (result.ttsAudioUrl && settings.autoplay) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: result.ttsAudioUrl },
          { shouldPlay: true }
        );
        sound.setOnPlaybackStatusUpdate(s =>
          s.didJustFinish && sound.unloadAsync()
        );
      }

      await refreshQuota();
      // Save history
      try {
        const entry = {
          original:   result.original,
          translated: result.translated,
          timestamp:  Date.now(),
          from:       side === 'left' ? lang1.label : lang2.label,
          to:         side === 'left' ? lang2.label : lang1.label,
          type:       'voice',
        };
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        arr.unshift(entry);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
      } catch (e) {
        console.warn('Failed to save voice history', e);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setInFlight(false);
      recordLock.current[side] = false;
      stop.current = false;
    }
  };

  // Handle text‐chat translation
  const handleChat = async side => {
    const text = side === 'left' ? leftChatInput : rightChatInput;
    if (!text.trim()) return;

    if (!locked) {
      setLocked(true);
      Haptics.selectionAsync();
      try {
        await AsyncStorage.setItem(
          LANGPAIR_KEY,
          JSON.stringify({ source: lang1.code, target: lang2.code })
        );
      } catch (e) {
        console.warn('Failed to save lang pair', e);
      }
    }

    setLoading(true);
    try {
      const src = side === 'left' ? lang1.code : lang2.code;
      const tgt = side === 'left' ? lang2.code : lang1.code;
      const result = await uploadText(
        text,
        src,
        tgt,
        settings.speaker1Gender,
        settings.speaker2Gender,
        settings.formality
      );
      if (!result.success) throw new Error(result.error || 'Translate-text failed');
      setTranslation(result);

      if (result.ttsAudioUrl && settings.autoplay) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: result.ttsAudioUrl },
          { shouldPlay: true }
        );
        sound.setOnPlaybackStatusUpdate(s =>
          s.didJustFinish && sound.unloadAsync()
        );
      }

      await refreshQuota();
      // Save chat history
      try {
        const entry = {
          original:   result.original,
          translated: result.translated,
          timestamp:  Date.now(),
          from:       side === 'left' ? lang1.label : lang2.label,
          to:         side === 'left' ? lang2.label : lang1.label,
          type:       'text',
        };
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        arr.unshift(entry);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
      } catch (e) {
        console.warn('Failed to save text history', e);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      side === 'left' ? setLeftChatInput('') : setRightChatInput('');
    }
  };

  // Stub purchase until IAP
  const buyAddOn = async productId => {
    setLoading(true);
    try {
      const resp = await uploadText('', productId, '', '', '', '');
      if (!resp.success) throw new Error(resp.error || 'Purchase failed');
      await refreshQuota();
      Alert.alert(
        'Purchase successful',
        `You now have ${Math.floor(resp.remainingSeconds / 60)} min & ${resp.remainingScans} scans.`
      );
    } catch (err) {
      Alert.alert('Purchase failed', err.message || 'Try again later.');
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---
  return (
    <ScreenWrapper>
      <Header title="Voice Translate" />

      <Text style={styles.quotaText}>
        🎙️ {effectiveQuota.interpretationsLeft ?? 0} interpretations left
      </Text>
      <TouchableOpacity style={styles.buyMoreBtn} onPress={() => setStoreVisible(true)}>
        <Text style={styles.buyMoreText}>Buy More Minutes & Scans</Text>
      </TouchableOpacity>

      <View style={styles.lockHintWrapper}>
        {locked ? (
          <Text style={styles.lockHintText}>
            Press flag to <Text style={styles.redText}>rec.</Text>
          </Text>
        ) : (
          <View style={styles.lockHintRow}>
            <Text style={styles.lockHintText}>Scroll</Text>
            <Ionicons name="swap-vertical-outline" style={styles.lockHintIcon} size={16} color="#0ea5e9" />
            <Text style={styles.lockHintText}>and lock</Text>
          </View>
        )}
      </View>

      <View style={styles.languageRow}>
        {/* Left */}
        <View>
          <LanguageColumn
            selected={lang1}
            onSelect={setLang1}
            onStart={() => startRecording('left')}
            onStop={() => stopRecording('left')}
            countdown={count1}
            locked={locked}
            excludeCode={lang2.code}
          />
          <TouchableOpacity
            style={styles.textChatButton}
            onPress={() => setLeftChatModal(true)}
            disabled={inFlight}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#0ea5e9" />
            <Text style={styles.textChatLabel}>Text</Text>
          </TouchableOpacity>
        </View>

        {/* Swap/Lock */}
        <TouchableOpacity
          style={styles.swapIcon}
          disabled={loading || count1 != null || count2 != null}
          onPress={async () => {
            const nl = !locked;
            setLocked(nl);
            Haptics.selectionAsync();
            if (nl) {
              try {
                await AsyncStorage.setItem(
                  LANGPAIR_KEY,
                  JSON.stringify({ source: lang1.code, target: lang2.code })
                );
              } catch (e) {
                console.warn('Failed to save lang pair', e);
              }
            }
          }}
        >
          <Ionicons
            name={locked ? 'lock-closed-outline' : 'lock-open-outline'}
            size={32}
            color="#0ea5e9"
          />
        </TouchableOpacity>

        {/* Right */}
        <View>
          <LanguageColumn
            selected={lang2}
            onSelect={setLang2}
            onStart={() => startRecording('right')}
            onStop={() => stopRecording('right')}
            countdown={count2}
            locked={locked}
            excludeCode={lang1.code}
          />
          <TouchableOpacity
            style={styles.textChatButton}
            onPress={() => setRightChatModal(true)}
            disabled={inFlight}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#0ea5e9" />
            <Text style={styles.textChatLabel}>Text</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 20 }} />}

      {translation && (
        <ScrollView style={styles.translationScrollContainer}>
          <View style={styles.translationCard}>
            <Text style={styles.translationLabel}>Original</Text>
            <Text style={styles.translationText}>{translation.original}</Text>
            <Text style={[styles.translationLabel, { marginTop: 12 }]}>Translated</Text>
            <Text style={styles.translationText}>{translation.translated}</Text>
          </View>
        </ScrollView>
      )}

      {/* Store Modal */}
      <Modal visible={storeVisible} animationType="slide" onRequestClose={() => setStoreVisible(false)}>
        <View style={styles.storeModal}>
          <Text style={styles.storeTitle}>Top-Up Bundles</Text>
          <FlatList
            data={products}
            keyExtractor={i => i.productId}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.storeItem} onPress={() => buyAddOn(item.productId)}>
                <Text style={styles.storeName}>
                  {item.title} — {item.priceString}
                </Text>
                <Text style={styles.storeDesc}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity onPress={() => setStoreVisible(false)}>
            <Text style={styles.storeClose}>✕ Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Left Chat Modal */}
      <Modal
        visible={leftChatModal}
        transparent
        animationType="slide"
        onRequestClose={() => setLeftChatModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLeftChatModal(false)}>
          <Pressable style={styles.modalContentContainer} onPress={e => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalInner}
            >
              <Text style={styles.modalTitle}>{lang1.label} → {lang2.label}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Type your message."
                value={leftChatInput}
                onChangeText={setLeftChatInput}
                multiline
                maxLength={100}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setLeftChatModal(false)}>
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSend} onPress={() => { handleChat('left'); setLeftChatModal(false); }}>
                  <Text style={styles.modalSendText}>Send</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Right Chat Modal */}
      <Modal
        visible={rightChatModal}
        transparent
        animationType="slide"
        onRequestClose={() => setRightChatModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRightChatModal(false)}>
          <Pressable style={styles.modalContentContainer} onPress={e => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalInner}
            >
              <Text style={styles.modalTitle}>{lang2.label} → {lang1.label}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Type your message."
                value={rightChatInput}
                onChangeText={setRightChatInput}
                multiline
                maxLength={100}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setRightChatModal(false)}>
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSend} onPress={() => { handleChat('right'); setRightChatModal(false); }}>
                  <Text style={styles.modalSendText}>Send</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  quotaText: {
    margin: 16,
    fontSize: 16,
    width: '90%',
    textAlign: 'center',
  },
  buyMoreBtn: {
    backgroundColor: '#fde047',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 16,
  },
  buyMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  lockHintWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  lockHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockHintText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea5e9',
    textAlign: 'center',
  },
  lockHintIcon: {
    marginHorizontal: 6,
  },
  redText: {
    color: '#dc2626',
    fontWeight: '700',
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  scrollWrapper: {
    height: ITEM_HEIGHT,
    width: 140,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  flagItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagText: { fontSize: 48 },
  langLabel: { fontSize: 14, fontWeight: '600', color: '#334155' },
  countdown: { fontSize: 20, fontWeight: '700', color: '#dc2626' },
  recordingActive: { backgroundColor: '#fee2e2', borderRadius: 16 },
  swapIcon: {
    marginTop: 40,
    marginHorizontal: 8,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 25,
    elevation: 2,
  },
  textChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'center',
  },
  textChatLabel: {
    marginLeft: 6,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  storeModal: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  storeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  storeItem: {
    paddingVertical: 12,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  storeDesc: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  storeClose: {
    textAlign: 'center',
    color: '#ef4444',
    marginTop: 20,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContentContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'transparent',
    borderRadius: 18,
    overflow: 'hidden',
  },
  modalInner: {
    backgroundColor: '#d0ebff',
    padding: 16,
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 12,
    color: '#334155',
  },
  modalInput: {
    minHeight: 80,
    maxHeight: 150,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  modalCancel: {
    marginRight: 16,
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  modalSend: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalSendText: {
    fontWeight: '600',
    color: 'white',
  },
  translationScrollContainer: {
    flex: 1,
    alignSelf: 'center',
    width: '90%',
    marginTop: 20,
  },
  translationCard: {
    backgroundColor: '#fde047',
    padding: 20,
    borderRadius: 18,
  },
  translationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  translationText: {
    fontSize: 18,
    color: '#1e293b',
    marginTop: 4,
    lineHeight: 24,
  },
});
