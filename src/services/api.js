// frontend/src/services/api.js

import axios from 'axios';
import { Platform } from 'react-native';

// ✅ Change to match your backend IP
export const API = axios.create({
  baseURL: 'http://192.168.1.15:5000',
});

// Helper: pick MIME type by file extension
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

// 1️⃣ Audio → STT → Translate → TTS
export async function uploadAudio({
  uri,
  speakerGender,
  listenerGender,
  formality,
  sourceLanguage,
  targetLanguage,
}) {
  if (!uri || typeof uri !== 'string') {
    console.error('[❌ uploadAudio] Invalid URI:', uri);
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

  const { data } = await API.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// 2️⃣ Image → OCR → Translate
export async function uploadImageForOcr(uri, sourceLanguage, targetLanguage) {
  const form = new FormData();

  form.append('image', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  });
  form.append('sourceLanguage', sourceLanguage);
  form.append('targetLanguage', targetLanguage);

  const { data } = await API.post('/translate-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// 3️⃣ Text → Translate → TTS
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

  const { data } = await API.post('/translate-text', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
}
