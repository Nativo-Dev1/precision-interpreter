// src/services/api.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Helper: pick MIME type based on file extension
 */
function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'wav':   return 'audio/wav';
    case 'mp3':   return 'audio/mpeg';
    case 'm4a':   return 'audio/mp4';
    case 'jpg':
    case 'jpeg':  return 'image/jpeg';
    case 'png':   return 'image/png';
    default:      return 'application/octet-stream';
  }
}

/**
 * Reads JWT from AsyncStorage and includes it in the Authorization header.
 */
export async function authFetch(url, opts = {}) {
  const token = await AsyncStorage.getItem('userToken');
  if (__DEV__) {
    console.log('🔥 authFetch called for:', url);
  }
  const headers = {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
    ...opts.headers,
  };
  return fetch(url, { ...opts, headers });
}

/**
 * uploadText:
 *   Sends plain text to /translate-text → backend does Translate → TTS.
 */
export async function uploadText(
  text,
  sourceLanguage,
  targetLanguage,
  speakerGender,
  listenerGender,
  formality
) {
  const payload = {
    text,
    sourceLanguage,
    targetLanguage,
    speakerGender,
    listenerGender,
    formality,
  };

  try {
    if (__DEV__) {
      console.log(`✍️ [uploadText] Sending text to /translate-text: "${text}"`);
    }
    const response = await authFetch(
      'https://nativo-backend.onrender.com/translate-text',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return response.json();
  } catch (err) {
    console.error('❌ [uploadText] network or server error:', err);
    return { success: false, error: 'Network or server error' };
  }
}

/**
 * uploadAudio:
 *   Sends recorded audio to /upload → backend does STT → Translate → TTS.
 *   FormData field "file" matches upload.single('file') in server.js.
 */
export async function uploadAudio({
  uri,
  speakerGender,
  listenerGender,
  formality,
  sourceLanguage,
  targetLanguage,
}) {
  if (!uri || typeof uri !== 'string') {
    console.error('[uploadAudio] Invalid URI:', uri);
    throw new Error('uploadAudio called with invalid URI');
  }

  const form = new FormData();
  const name = uri.split('/').pop();

  form.append('file', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    type: getMimeType(name),
    name,
  });
  form.append('speakerGender',  speakerGender);
  form.append('listenerGender', listenerGender);
  form.append('formality',      formality);
  form.append('sourceLanguage', sourceLanguage);
  form.append('targetLanguage', targetLanguage);

  try {
    if (__DEV__) {
      console.log(`🔊 [uploadAudio] Sending audio to /upload (file: ${name})`);
    }
    const token = await AsyncStorage.getItem('userToken');
    const response = await fetch(
      'https://nativo-backend.onrender.com/upload',
      {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          // NOTE: no Content-Type header so fetch sets the proper multipart boundary
        },
        body: form,
      }
    );
    return response.json();
  } catch (err) {
    console.error('❌ [uploadAudio] network or server error:', err);
    return { success: false, error: 'Network or server error' };
  }
}

/**
 * uploadImageForOcr:
 *   Sends an image to /translate-image → backend does OCR → Translate.
 *   FormData field "image" matches upload.single('image') in server.js.
 */
// in src/services/api.js

export async function uploadImageForOcr(uri, sourceLanguage, targetLanguage) {
  const form = new FormData();
  const name = uri.split('/').pop() || 'photo.jpg';
  form.append('image', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    name,
    type: getMimeType(name),
  });
  form.append('sourceLanguage', sourceLanguage);
  form.append('targetLanguage', targetLanguage);

  try {
    if (__DEV__) console.log(`🖼️ [uploadImageForOcr] Sending image: ${name}`);
    const token = await AsyncStorage.getItem('userToken');
    const response = await fetch(
      'https://nativo-backend.onrender.com/translate-image',
      { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: form }
    );

    const text = await response.text();
    if (!response.ok) {
      console.error('[uploadImageForOcr] Server error:', text);
      throw new Error(text || 'Server responded with an error');
    }
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      console.error('[uploadImageForOcr] Invalid JSON:', text);
      throw new Error('Unexpected server response');
    }
  } catch (err) {
    console.error('❌ [uploadImageForOcr] network/server error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * fetchQuota:
 *   Calls GET /user/quota via authFetch to retrieve remaining quota.
 */
export async function fetchQuota() {
  try {
    if (__DEV__) {
      console.log(`📊 [fetchQuota] Requesting /user/quota`);
    }
    const response = await authFetch(
      'https://nativo-backend.onrender.com/user/quota',
      { method: 'GET' }
    );
    return response.json();
  } catch (err) {
    console.error('❌ [fetchQuota] network or server error:', err);
    return {
      expiresAt:           null,
      plan:                null,
      interpretationsLeft: 0,
      remainingScans:      0,
      remainingSeconds:    0,
    };
  }
}
