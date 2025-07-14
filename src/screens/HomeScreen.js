// src/screens/HomeScreen.js

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
  TouchableOpacity,
  Alert,
  ScrollView,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  TextInput,
  StyleSheet,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import AudioRecord from 'react-native-audio-record';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useIsFocused } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';

import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import LanguageColumn from '../components/LanguageColumn';
import languages from '../constants/languages';
import { SETTINGS_KEY, LANGPAIR_KEY } from '../constants/storageKeys';
import { HISTORY_KEY, addHistoryEntry } from '../utils/historyStorage';
import { uploadAudio, uploadText, buyPack } from '../services/api';
import { QuotaContext } from '../contexts/QuotaContext';

const ITEM_HEIGHT = 100;

export default function HomeScreen() {
  // State & refs
  const [lang1, setLang1] = useState(languages[0]);
  const [lang2, setLang2] = useState(languages[1]);
  const [locked, setLocked] = useState(false);
  const [count1, setCount1] = useState(null);
  const [count2, setCount2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inFlight, setInFlight] = useState(false);
  const [translation, setTranslation] = useState(null);
  const [leftChatModal, setLeftChatModal] = useState(false);
  const [rightChatModal, setRightChatModal] = useState(false);
  const [leftChatInput, setLeftChatInput] = useState('');
  const [rightChatInput, setRightChatInput] = useState('');
  const [storeVisible, setStoreVisible] = useState(false);

  const [settings, setSettings] = useState({
    speaker1Gender: 'neutral',
    speaker2Gender: 'neutral',
    formality: 'formal',
    autoplay: true,
    recordDuration: 5,
  });

  const recordStart = useRef(0);
  const recordLock = useRef({ left: false, right: false });
  const lastAction = useRef(0);
  const stopped1 = useRef(false);
  const stopped2 = useRef(false);
  const timer = useRef(null);
  const isFocused = useIsFocused();

  // In-app purchase bundles
  const products = [
    { productId: 'bundle_starter_40cred400s_3scan', plan: 'Starter',  title: 'Starter',  description: '40 credits + 400s & 3 scans',  priceString: '$1.99' },
    { productId: 'bundle_casual_90cred900s_5scan',   plan: 'Casual',   title: 'Casual',   description: '90 credits + 900s & 5 scans',   priceString: '$3.99' },
    { productId: 'bundle_standard_180cred1800s_10scan', plan: 'Standard', title: 'Standard', description: '180 credits + 1800s & 10 scans', priceString: '$6.99' },
    { productId: 'bundle_pro_360cred3600s_25scan',    plan: 'Pro',      title: 'Pro',      description: '360 credits + 3600s & 25 scans',  priceString: '$12.99' },
  ];

  // Quota context
  const {
    remainingCredits,
    secondsLeft,
    remainingScans,
    loading: quotaLoading,
    refreshQuota,
  } = useContext(QuotaContext);

  const outOfQuota = !__DEV__ && remainingCredits <= 0 && secondsLeft <= 0;

  // Load user settings
  const loadSettings = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings(prev => ({ ...prev, ...JSON.parse(raw) }));
    } catch (e) {
      console.warn('Failed to load settings', e);
      Sentry.captureException(e);
    }
  }, []);

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
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        wavFile: 'nativo.wav',
      });
    })();
    loadSettings();
    return () => clearInterval(timer.current);
  }, [loadSettings]);

  useEffect(() => {
    if (isFocused) loadSettings();
  }, [isFocused, loadSettings]);

  // Play a short sound effect
  const playSound = async soundFile => {
    const { sound } = await Audio.Sound.createAsync(soundFile, {
      shouldPlay: true,
    });
    sound.setOnPlaybackStatusUpdate(s =>
      s.didJustFinish && sound.unloadAsync()
    );
  };

  // Start voice recording with countdown
  const startRecording = async side => {
    if (outOfQuota) {
      Alert.alert('Out of credits/seconds', 'Tap the cart icon to top up.');
      return;
    }
    const now = Date.now();
    if (now - lastAction.current < 500) return;
    lastAction.current = now;
    if (recordLock.current[side] || inFlight || loading) return;
    recordLock.current[side] = true;
    if (!locked) {
      Haptics.selectionAsync();
      recordLock.current[side] = false;
      return;
    }
    Haptics.selectionAsync();
    await playSound(require('../../assets/ding.mp3'));
    recordStart.current = Date.now();
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

  // Stop recording, upload, play TTS, refresh quota, and save history
  const stopRecording = async side => {
    const now = Date.now();
    if (now - lastAction.current < 500) return;
    lastAction.current = now;
    if (inFlight || loading) return;
    const setC = side === 'left' ? setCount1 : setCount2;
    const stopRef = side === 'left' ? stopped1 : stopped2;
    if (stopRef.current) return;
    stopRef.current = true;
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
      const actualSec = Math.ceil((Date.now() - recordStart.current) / 1000);
      const result = await uploadAudio({
        uri,
        speakerGender:
          side === 'left' ? settings.speaker1Gender : settings.speaker2Gender,
        listenerGender:
          side === 'left' ? settings.speaker2Gender : settings.speaker1Gender,
        formality: settings.formality,
        sourceLanguage: src,
        targetLanguage: tgt,
        durationSec: actualSec,
      });
      if (!result.success) {
        const errMsg = (result.error || '').toLowerCase();
        if (errMsg.includes('quota') || errMsg.includes('remaining')) {
          Alert.alert('Out of credits/seconds', 'Tap the cart icon to top up.');
        } else {
          Alert.alert('Translation error', 'Try again later.');
        }
        throw new Error(result.error);
      }

      setTranslation(result);
      if (result.ttsAudioUrl && settings.autoplay) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: result.ttsAudioUrl },
          { shouldPlay: true }
        );
        sound.setOnPlaybackStatusUpdate(s => s.didJustFinish && sound.unloadAsync());
      }

      await refreshQuota();

      await addHistoryEntry({
        original:   result.original,
        translated: result.translated,
        timestamp:  Date.now(),
        from:       side === 'left' ? lang1.label : lang2.label,
        to:         side === 'left' ? lang2.label : lang1.label,
        type:       'voice',
        audioUrl:   result.ttsAudioUrl,
      });
    } catch (err) {
      Sentry.captureException(err);
    } finally {
      setLoading(false);
      setInFlight(false);
      recordLock.current[side] = false;
      stopRef.current = false;
    }
  };

  // Handle text-based translation
  const handleChat = async side => {
    if (outOfQuota) {
      Alert.alert('Out of credits/seconds', 'Tap the cart icon to top up.');
      return;
    }
    const text = side === 'left' ? leftChatInput : rightChatInput;
    if (!text.trim()) {
      return Alert.alert('Enter text', 'Please type something to translate.');
    }
    if (!locked) {
      setLocked(true);
      Haptics.selectionAsync();
      await AsyncStorage.setItem(
        LANGPAIR_KEY,
        JSON.stringify({ source: lang1.code, target: lang2.code })
      );
    }

    setLoading(true);
    try {
      const src = side === 'left' ? lang1.code : lang2.code;
      const tgt = side === 'left' ? lang2.code : lang1.code;
      const estSec = Math.ceil(text.length / 5);
      const result = await uploadText(
        text,
        src,
        tgt,
        settings.speaker1Gender,
        settings.speaker2Gender,
        settings.formality,
        estSec
      );
      if (!result.success) {
        const errMsg = (result.error || '').toLowerCase();
        if (errMsg.includes('quota') || errMsg.includes('remaining')) {
          Alert.alert('Out of credits/seconds', 'Tap the cart icon to top up.');
        } else {
          Alert.alert('Translation error', 'Try again later.');
        }
        throw new Error(result.error);
      }

      setTranslation(result);
      if (result.ttsAudioUrl && settings.autoplay) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: result.ttsAudioUrl },
          { shouldPlay: true }
        );
        sound.setOnPlaybackStatusUpdate(s => s.didJustFinish && sound.unloadAsync());
      }

      await refreshQuota();

      await addHistoryEntry({
        original:   result.original,
        translated: result.translated,
        timestamp:  Date.now(),
        from:       side === 'left' ? lang1.label : lang2.label,
        to:         side === 'left' ? lang2.label : lang1.label,
        type:       'text',
      });
    } catch (err) {
      Sentry.captureException(err);
      Alert.alert('Translation error', err.message || 'Try again later.');
    } finally {
      setLoading(false);
      side === 'left' ? setLeftChatInput('') : setRightChatInput('');
    }
  };

  // Purchase flow
  const buyAddOn = async plan => {
    if (loading) return;
    setLoading(true);
    try {
      const { quotas } = await buyPack(plan);
      await refreshQuota();
      Alert.alert(
        'Purchase successful',
        `You now have ${quotas.credits} credits & ${quotas.scans} scans`
      );
      setStoreVisible(false);
    } catch (err) {
      Sentry.captureException(err);
      Alert.alert('Purchase failed', err.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header
        title="Nativo"
        leftIcon={
          <Ionicons
            name="cart-outline"
            size={24}
            color="#3b82f6"
            style={{ marginLeft: 12 }}
          />
        }
        onLeftIconPress={() => setStoreVisible(true)}
      />

      <Text style={styles.quotaText}>
        🎟️ {remainingCredits} credits | ⏱️ {secondsLeft}s
      </Text>

      <View style={styles.lockHintWrapper}>
        {locked ? (
          <Text style={styles.lockHintText}>
            Press a flag to <Text style={styles.redText}>rec.</Text>
          </Text>
        ) : (
          <View style={styles.lockHintRow}>
            <Text style={styles.lockHintText}>Scroll</Text>
            <Ionicons
              name="swap-vertical-outline"
              style={styles.lockHintIcon}
              size={16}
              color="#3b82f6"
            />
            <Text style={styles.lockHintText}>and lock</Text>
          </View>
        )}
      </View>

      <View style={styles.languageRow}>
        <View style={styles.pickerContainer}>
          <View style={styles.languageWrapper}>
            <LanguageColumn
              selected={lang1}
              onSelect={setLang1}
              onStart={() => startRecording('left')}
              onStop={() => stopRecording('left')}
              countdown={count1}
              locked={locked}
              disabled={outOfQuota}
              excludeCode={lang2.code}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.textChatButton,
              (loading || inFlight || outOfQuota || !locked) && styles.disabledButton,
            ]}
            onPress={() => setLeftChatModal(true)}
            disabled={loading || inFlight || outOfQuota || !locked}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color="#3b82f6"
            />
            <Text style={styles.textChatLabel}>Text</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.swapIcon}
          disabled={loading || count1 != null || count2 != null}
          onPress={async () => {
            if (loading) return;
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
                Sentry.captureException(e);
              }
            }
          }}
        >
          <Ionicons
            name={locked ? 'lock-closed-outline' : 'lock-open-outline'}
            size={32}
            color="#3b82f6"
          />
        </TouchableOpacity>

        <View style={styles.pickerContainer}>
          <View style={styles.languageWrapper}>
            <LanguageColumn
              selected={lang2}
              onSelect={setLang2}
              onStart={() => startRecording('right')}
              onStop={() => stopRecording('right')}
              countdown={count2}
              locked={locked}
              disabled={outOfQuota}
              excludeCode={lang1.code}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.textChatButton,
              (loading || inFlight || outOfQuota || !locked) && styles.disabledButton,
            ]}
            onPress={() => setRightChatModal(true)}
            disabled={loading || inFlight || outOfQuota || !locked}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color="#3b82f6"
            />
            <Text style={styles.textChatLabel}>Text</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && (
        <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 20 }} />
      )}

      {translation && (
        <ScrollView style={styles.translationScrollContainer}>
          <View style={styles.translationCard}>
            <Text style={styles.translationLabel}>Original</Text>
            <Text style={styles.translationText}>{translation.original}</Text>
            <Text style={[styles.translationLabel, { marginTop: 12 }]}>
              Translated
            </Text>
            <Text style={styles.translationText}>{translation.translated}</Text>
          </View>
        </ScrollView>
      )}

      {/* Store Modal */}
      <Modal
        visible={storeVisible}
        animationType="slide"
        onRequestClose={() => setStoreVisible(false)}
      >
        <View style={styles.storeModal}>
          <Text style={styles.storeTitle}>Top-Up Bundles</Text>
          <FlatList
            data={products}
            keyExtractor={i => i.productId}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.storeItem, loading && styles.disabledButton]}
                onPress={() => buyAddOn(item.plan)}
                disabled={loading}
              >
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
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLeftChatModal(false)}
        >
          <Pressable
            style={styles.modalContentContainer}
            onPress={e => e.stopPropagation()}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalInner}
            >
              <Text style={styles.modalTitle}>
                {lang1.label} → {lang2.label}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Type your message."
                value={leftChatInput}
                onChangeText={setLeftChatInput}
                multiline
                maxLength={150}
                autoFocus
                editable={!loading}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setLeftChatModal(false)}
                  disabled={loading}
                >
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSend}
                  onPress={() => {
                    handleChat('left');
                    setLeftChatModal(false);
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSendText}>Send</Text>
                  )}
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
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setRightChatModal(false)}
        >
          <Pressable
            style={styles.modalContentContainer}
            onPress={e => e.stopPropagation()}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalInner}
            >
              <Text style={styles.modalTitle}>
                {lang2.label} → {lang1.label}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Type your message."
                value={rightChatInput}
                onChangeText={setRightChatInput}
                multiline
                maxLength={150}
                autoFocus
                editable={!loading}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setRightChatModal(false)}
                  disabled={loading}
                >
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSend}
                  onPress={() => {
                    handleChat('right');
                    setRightChatModal(false);
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSendText}>Send</Text>
                  )}
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
  quotaText: {
    margin: 16,
    fontSize: 16,
    width: '90%',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.4,
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
    color: '#3b82f6',
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
  languageWrapper: {
    width: ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    elevation: 2,
  },
  pickerContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    width: ITEM_HEIGHT,
    marginHorizontal: 8,
  },
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'center',
  },
  textChatLabel: {
    marginLeft: 6,
    fontWeight: '600',
    color: '#3b82f6',
  },
  translationScrollContainer: {
    flex: 1,
    alignSelf: 'center',
    width: '90%',
    marginTop: 20,
  },
  translationCard: {
    backgroundColor: '#fff9c4',
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
    backgroundColor: '#d0ebff',
    borderRadius: 18,
    overflow: 'hidden',
  },
  modalInner: {
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
    backgroundColor: '#ffffff',
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
});
