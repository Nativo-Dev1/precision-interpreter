// src/screens/HomeScreen.js

import React, { useEffect, useState, useRef, useContext, useCallback } from 'react';
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
  Platform,
  PermissionsAndroid,
  Dimensions,
  StyleSheet,
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
import { languages } from '../constants/languages';
import { SETTINGS_KEY, LANGPAIR_KEY } from '../constants/storageKeys';
import { uploadAudio, uploadText } from '../services/api';
import { QuotaContext } from '../contexts/QuotaContext';

const HISTORY_KEY = 'nativoHistory';

export default function HomeScreen() {
  // state & refs
  const [lang1, setLang1] = useState(languages[0]);
  const [lang2, setLang2] = useState(languages[1]);
  const [locked, setLocked] = useState(false);
  const [count1, setCount1] = useState(null);
  const [count2, setCount2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inFlight, setInFlight] = useState(false);
  const [activeSide, setActiveSide] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [leftChatModal, setLeftChatModal] = useState(false);
  const [rightChatModal, setRightChatModal] = useState(false);
  const [leftChatInput, setLeftChatInput] = useState('');
  const [rightChatInput, setRightChatInput] = useState('');
  const [storeVisible, setStoreVisible] = useState(false);

  const recordLock = useRef({ left: false, right: false });
  const lastAction = useRef(0);
  const stopped1 = useRef(false);
  const stopped2 = useRef(false);
  const timer = useRef(null);

  // NEW: track recording start time
  const startTimeRef = useRef(null);

  const isFocused = useIsFocused();

  // Quota context
  const { quota: rawQuota, loading: quotaLoading, refreshQuota } = useContext(QuotaContext);

  // How many seconds are left, across all credits:
  const secondsLeft = rawQuota
    ? rawQuota.creditsLeft * rawQuota.secsPerCredit - rawQuota.secondsAccumulated
    : 0;

  const [settings, setSettings] = useState({
    speaker1Gender: 'neutral',
    speaker2Gender: 'neutral',
    formality: 'formal',
    autoplay: true,
    recordDuration: 5,
  });

  const products = [
    { productId: 'bundle_starter_30min10scan', title: 'Starter Pack', description: '30 min voice + 10 scans', priceString: '$2.99' },
    { productId: 'bundle_regular_60min25scan', title: 'Regular Pack', description: '60 min voice + 25 scans', priceString: '$4.99' },
    { productId: 'bundle_pro_120min50scan', title: 'Pro Pack', description: '120 min voice + 50 scans', priceString: '$8.99' },
  ];

  // load settings
  const loadSettings = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings(prev => ({ ...prev, ...JSON.parse(raw) }));
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if (res !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission required', 'Microphone access is needed.');
        }
      }
      AudioRecord.init({ sampleRate: 16000, channels: 1, bitsPerSample: 16, wavFile: 'nativo.wav' });
    })();
    loadSettings();
    return () => clearInterval(timer.current);
  }, [loadSettings]);

  useEffect(() => {
    if (isFocused) loadSettings();
  }, [isFocused, loadSettings]);

  // ─── FETCH LATEST QUOTA ON MOUNT ───────────────────────
  useEffect(() => {
    refreshQuota();
  }, []);

  // play ding/stop sounds
  const playSound = async soundFile => {
    const { sound } = await Audio.Sound.createAsync(soundFile, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate(status => status.didJustFinish && sound.unloadAsync());
  };

  // recording flow
  const startRecording = async side => {
    if (!locked) return Alert.alert('Locked', 'Press the lock icon to start recording.');
    if (secondsLeft <= 0) {
      return Alert.alert('Out of credits', 'You are out of time – buy more credits!');
    }
    const now = Date.now();
    if (now - lastAction.current < 500 || recordLock.current[side] || inFlight) return;
    lastAction.current = now;
    recordLock.current[side] = true;
    setActiveSide(side);
    setInFlight(true);
    Haptics.selectionAsync();
    await playSound(require('../../assets/ding.mp3'));

    // Cap duration by seconds left
    let secs = Math.min(settings.recordDuration, secondsLeft);
    side === 'left' ? setCount1(secs) : setCount2(secs);

    // NEW: record start timestamp
    startTimeRef.current = Date.now();

    AudioRecord.start({
      maxDurationSec: secs,
    });

    timer.current = setInterval(() => {
      secs -= 1;
      side === 'left' ? setCount1(secs) : setCount2(secs);
      if (secs <= 0) {
        clearInterval(timer.current);
        stopRecording(side);
      }
    }, 1000);
  };

  const stopRecording = async side => {
    const now = Date.now();
    if (now - lastAction.current < 500) return;
    lastAction.current = now;
    const setC = side === 'left' ? setCount1 : setCount2;
    const stopRef = side === 'left' ? stopped1 : stopped2;
    if (stopRef.current) return;
    stopRef.current = true;

    clearInterval(timer.current);
    setC(null);
    setLoading(true);

    try {
      // NEW: calculate elapsed seconds
      const durationMs = Date.now() - (startTimeRef.current || Date.now());
      const durationSec = Math.ceil(durationMs / 1000);

      const rawPath = await AudioRecord.stop();
      if (!rawPath) throw new Error('No audio recorded.');
      await playSound(require('../../assets/stop.mp3'));

      const uri = rawPath.startsWith('file://') ? rawPath : `file://${rawPath}`;
      const src = side === 'left' ? lang1.value : lang2.value;
      const tgt = side === 'left' ? lang2.value : lang1.value;
      const result = await uploadAudio({
        uri,
        durationSec,
        speakerGender: side === 'left' ? settings.speaker1Gender : settings.speaker2Gender,
        listenerGender: side === 'left' ? settings.speaker2Gender : settings.speaker1Gender,
        formality: settings.formality,
        sourceLanguage: src,
        targetLanguage: tgt,
      });
      if (!result.success) throw new Error(result.error || 'Upload failed');
      setTranslation(result);

      if (result.ttsAudioUrl && settings.autoplay) {
        const { sound } = await Audio.Sound.createAsync({ uri: result.ttsAudioUrl }, { shouldPlay: true });
        sound.setOnPlaybackStatusUpdate(s => s.didJustFinish && sound.unloadAsync());
      }

      await refreshQuota();

      // save history
      const entry = {
        original: result.original,
        translated: result.translated,
        timestamp: Date.now(),
        from: side === 'left' ? lang1.label : lang2.label,
        to: side === 'left' ? lang2.label : lang1.label,
        type: 'voice',
      };
      const rawHistory = await AsyncStorage.getItem(HISTORY_KEY);
      const arr = rawHistory ? JSON.parse(rawHistory) : [];
      arr.unshift(entry);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setInFlight(false);
      setActiveSide(null);
      recordLock.current[side] = false;
      stopRef.current = false;
    }
  };

  // text-chat translation with estimated billing
  const handleChat = async side => {
    if (!locked) return Alert.alert('Locked', 'Press the lock icon to enable translation.');
    const text = side === 'left' ? leftChatInput.trim() : rightChatInput.trim();
    if (!text) return;
    setActiveSide(side);
    setInFlight(true);
    setLoading(true);

    try {
      const src = side === 'left' ? lang1.value : lang2.value;
      const tgt = side === 'left' ? lang2.value : lang1.value;
      const speakerG = side === 'left' ? settings.speaker1Gender : settings.speaker2Gender;
      const listenerG = side === 'left' ? settings.speaker2Gender : settings.speaker1Gender;

      // NEW: estimate duration from word count (3 wps)
      const wordCount = text.split(/\s+/).length;
      const durationSec = Math.ceil(wordCount / 3);

      const result = await uploadText(
        text,
        src,
        tgt,
        speakerG,
        listenerG,
        settings.formality,
        durationSec
      );
      if (!result.success) throw new Error(result.error || 'Translate-text failed');
      setTranslation(result);

      if (result.ttsAudioUrl && settings.autoplay) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: result.ttsAudioUrl },
          { shouldPlay: true }
        );
        sound.setOnPlaybackStatusUpdate(
          status => status.didJustFinish && sound.unloadAsync()
        );
      }

      await refreshQuota();

      // history
      const entry = {
        original: result.original,
        translated: result.translated,
        timestamp: Date.now(),
        from: side === 'left' ? lang1.label : lang2.label,
        to: side === 'left' ? lang2.label : lang1.label,
        type: 'text',
      };
      const rawHistory = await AsyncStorage.getItem(HISTORY_KEY);
      const arr = rawHistory ? JSON.parse(rawHistory) : [];
      arr.unshift(entry);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setInFlight(false);
      if (side === 'left') setLeftChatInput('');
      else setRightChatInput('');
    }
  };

  // render
  return (
    <ScreenWrapper>
      <Header
        leftIcon={<Ionicons name="cart-outline" size={24} color="#3b82f6" />}
        onLeftIconPress={() => setStoreVisible(true)}
      />

      {/* UPDATED QUOTA DISPLAY */}
      <Text style={styles.quotaText}>
        🎟️ {rawQuota?.creditsLeft ?? 0} credits | ⏱️ {rawQuota
          ? rawQuota.creditsLeft * rawQuota.secsPerCredit - rawQuota.secondsAccumulated
          : 0}s
      </Text>

      {/* SHOW RED WARNING WHEN OUT OF TIME */}
      {secondsLeft <= 0 && (
        <Text style={styles.warningText}>
          No time left – buy more credits!
        </Text>
      )}

      <View style={styles.lockHintWrapper}>
        {locked ? (
          <Text style={styles.lockHintText}>
            Press a flag to <Text style={styles.redText}>rec.</Text>
          </Text>
        ) : (
          <View style={styles.lockHintRow}>
            <Text style={styles.lockHintText}>Scroll</Text>
            <Ionicons name="swap-vertical-outline" style={styles.lockHintIcon} size={16} color="#3b82f6" />
            <Text style={styles.lockHintText}>and lock</Text>
          </View>
        )}
      </View>
      <View style={styles.languageRow}>
        {/* Left column */}
        <View style={styles.pickerContainer}>
          <View pointerEvents={inFlight && activeSide==='right' ? 'none' : 'auto'}>
            <LanguageColumn
              selected={lang1}
              onSelect={setLang1}
              onStart={()=>startRecording('left')}
              onStop={()=>stopRecording('left')}
              countdown={count1}
              locked={locked}
              excludeCode={lang2.value}
              disabled={quotaLoading || secondsLeft <= 0}
            />
          </View>
          <TouchableOpacity
            style={styles.textChatButton}
            disabled={!locked||inFlight}
            onPress={()=> locked? setLeftChatModal(true) : Alert.alert('Locked','Press the lock icon to enable translation.')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#3b82f6" />
            <Text style={styles.textChatLabel}>Text</Text>
          </TouchableOpacity>
        </View>
        {/* Lock / swap */}
        <TouchableOpacity
          style={styles.swapIcon}
          disabled={loading||count1!=null||count2!=null}
          onPress={async ()=>{
            const nl = !locked;
            setLocked(nl);
            Haptics.selectionAsync();
            if(nl){
              await AsyncStorage.setItem(LANGPAIR_KEY, JSON.stringify({source:lang1.value,target:lang2.value}));
            }
          }}
        >
          <Ionicons name={locked?'lock-closed-outline':'lock-open-outline'} size={32} color="#3b82f6" />
        </TouchableOpacity>
        {/* Right column */}
        <View style={styles.pickerContainer}>
          <View pointerEvents={inFlight && activeSide==='left' ? 'none' : 'auto'}>
            <LanguageColumn
              selected={lang2}
              onSelect={setLang2}
              onStart={()=>startRecording('right')}
              onStop={()=>stopRecording('right')}
              countdown={count2}
              locked={locked}
              excludeCode={lang1.value}
              disabled={quotaLoading || secondsLeft <= 0}
            />
          </View>
          <TouchableOpacity
            style={styles.textChatButton}
            disabled={!locked||inFlight}
            onPress={()=> locked? setRightChatModal(true) : Alert.alert('Locked','Press the lock icon to enable translation.')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#3b82f6" />
            <Text style={styles.textChatLabel}>Text</Text>
          </TouchableOpacity>
        </View>
      </View>
      {loading && <ActivityIndicator size="large" color="#0ea5e9" style={styles.loading} />}
      {translation && (
        <ScrollView style={styles.translationScrollContainer} nestedScrollEnabled contentContainerStyle={{paddingBottom:20}}>
          <View style={styles.translationCard}>
            <Text style={styles.translationLabel}>Original</Text>
            <Text style={styles.translationText}>{translation.original}</Text>
            <Text style={[styles.translationLabel,{marginTop:12}]}>Translated</Text>
            <Text style={styles.translationText}>{translation.translated}</Text>
          </View>
        </ScrollView>
      )}
      {/* Store modal */}
      <Modal visible={storeVisible} animationType="slide" onRequestClose={()=>setStoreVisible(false)}>
        <View style={styles.storeModal}>
          <Text style={styles.storeTitle}>Top-Up Bundles</Text>
          <FlatList
            data={products}
            keyExtractor={i=>i.productId}
            ItemSeparatorComponent={()=> <View style={styles.separator} />}
            renderItem={({item})=>(
              <TouchableOpacity style={styles.storeItem} onPress={()=>buyAddOn(item.productId)}>
                <Text style={styles.storeName}>{`${item.title} — ${item.priceString}`}</Text>
                <Text style={styles.storeDesc}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity onPress={()=>setStoreVisible(false)}>
            <Text style={styles.storeClose}>✕ Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      {/* Left chat */}
      <Modal visible={leftChatModal} transparent animationType="slide" onRequestClose={()=>setLeftChatModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={()=>setLeftChatModal(false)}>
          <Pressable style={styles.modalContentContainer} onPress={e=>e.stopPropagation()}>
            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={20} style={styles.modalInner}>
              <Text style={styles.modalTitle}>{`${lang1.label} → ${lang2.label}`}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Type your message."
                value={leftChatInput}
                onChangeText={setLeftChatInput}
                multiline maxLength={150} autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={()=>setLeftChatModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSend} onPress={()=>{
                  handleChat('left');
                  setLeftChatModal(false);
                }}>
                  <Text style={styles.modalSendText}>Send</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
      {/* Right chat */}
      <Modal visible={rightChatModal} transparent animationType="slide" onRequestClose={()=>setRightChatModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={()=>setRightChatModal(false)}>
          <Pressable style={styles.modalContentContainer} onPress={e=>e.stopPropagation()}>
            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={20} style={styles.modalInner}>
              <Text style={styles.modalTitle}>{`${lang2.label} → ${lang1.label}`}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Type your message."
                value={rightChatInput}
                onChangeText={setRightChatInput}
                multiline maxLength={150} autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={()=>setRightChatModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSend} onPress={()=>{
                  handleChat('right');
                  setRightChatModal(false);
                }}>
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
  quotaText: {
    margin: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  lockHintWrapper: {
    alignItems: 'center',
    marginVertical: 8,
  },
  lockHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockHintText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
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
  pickerContainer: {
    alignItems: 'center',
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  textChatLabel: {
    marginLeft: 6,
    fontWeight: '600',
    color: '#3b82f6',
  },
  loading: {
    marginTop: 20,
  },
  translationScrollContainer: {
    width: '90%',
    alignSelf: 'center',
    marginTop: 20,
    maxHeight: Dimensions.get('window').height * 0.4,
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
    padding: 20,
    backgroundColor: '#fff',
  },
  storeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  storeItem: {
    paddingVertical: 12,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  storeDesc: {
    fontSize: 14,
    color: '#475569',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  storeClose: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
    color: '#3b82f6',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: 20,
  },
  modalContentContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#e0f2fe',
    borderRadius: 18,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  modalInner: {
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  modalCancelText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  modalSend: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
  },
  modalSendText: {
    color: '#fff',
    fontWeight: '600',
  },
});
