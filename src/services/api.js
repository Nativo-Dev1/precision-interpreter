// frontend/src/services/api.js

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Helper: pick MIME type based on file extension
 */
function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'wav':
      return 'audio/wav';
    case 'mp3':
      return 'audio/mpeg';
    case 'm4a':
      return 'audio/mp4';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Create an Axios instance with the backend base URL.
 * Adjust baseURL if your backend domain changes.
 */
export const API = axios.create({
  baseURL: 'https://nativo-backend.onrender.com',
});

/**
 * Request interceptor: automatically attach JWT from AsyncStorage
 * to the `Authorization` header of every outgoing request.
 */
API.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.error('[api] Failed to load token from AsyncStorage', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 1️⃣ uploadAudio:
 *   - Records audio locally (wav/mp3/m4a).
 *   - Sends to /upload for STT → Translate → TTS.
 *
 * @param {Object} params 
 *   - uri: string (local file URI)
 *   - speakerGender: 'male' | 'female'
 *   - listenerGender: 'male' | 'female'
 *   - formality: string (e.g., 'formal' | 'casual')
 *   - sourceLanguage: string (e.g., 'english')
 *   - targetLanguage: string (e.g., 'spanish')
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
  const uriParts = uri.split('/');
  const name = uriParts[uriParts.length - 1];

  form.append('audio', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    type: getMimeType(name),
    name,
  });
  form.append('speakerGender', speakerGender);
  form.append('listenerGender', listenerGender);
  form.append('formality', formality);
  form.append('sourceLanguage', sourceLanguage);
  form.append('targetLanguage', targetLanguage);

  const response = await API.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * 2️⃣ uploadImageForOcr:
 *   - Sends an image to /translate-image for OCR → Translate.
 *
 * @param {string} uri - local image URI
 * @param {string} sourceLanguage 
 * @param {string} targetLanguage 
 */
export async function uploadImageForOcr(uri, sourceLanguage, targetLanguage) {
  if (!uri || typeof uri !== 'string') {
    console.error('[uploadImageForOcr] Invalid URI:', uri);
    throw new Error('uploadImageForOcr called with invalid URI');
  }

  const form = new FormData();
  form.append('image', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  });
  form.append('sourceLanguage', sourceLanguage);
  form.append('targetLanguage', targetLanguage);

  const response = await API.post('/translate-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * 3️⃣ uploadText:
 *   - Sends raw text to /translate-text for Translate → TTS.
 *
 * @param {string} text 
 * @param {string} sourceLanguage 
 * @param {string} targetLanguage 
 * @param {string} speakerGender 
 * @param {string} listenerGender 
 * @param {string} formality 
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

  const response = await API.post('/translate-text', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
}

/**
 * 4️⃣ Optional: Fetch current user quota
 *    (if you implement a GET /me/quota endpoint on your backend)
 */
export async function fetchQuota() {
  const response = await API.get('/me/quota');
  return response.data;
}
