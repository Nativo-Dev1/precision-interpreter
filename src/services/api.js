// src/services/api.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Base URL for all API calls, read from Expo config or fallback
 */
const BACKEND_URL =
  Constants.expoConfig?.extra?.BACKEND_URL ||
  'https://nativo-backend.onrender.com';

/**
 * Infer MIME type from a file extension
 */
function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'wav':  return 'audio/wav';
    case 'mp3':  return 'audio/mpeg';
    case 'm4a':  return 'audio/mp4';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'png':  return 'image/png';
    default:     return 'application/octet-stream';
  }
}

/**
 * Core fetch wrapper: injects Bearer token, logs calls, checks HTTP status,
 * and returns parsed JSON (or throws on error).
 */
async function authFetch(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${BACKEND_URL}${path}`;
  const token = await AsyncStorage.getItem('userToken');
  const headers = {
    Accept: 'application/json',
    ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    Authorization: token ? `Bearer ${token}` : '',
    ...opts.headers,
  };

  console.log(`🔥 [api] Request → ${opts.method || 'GET'} ${url}`);
  const resp = await fetch(url, { ...opts, headers });
  console.log(`✅ [api] Response ← ${url} [status: ${resp.status}]`);

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`❌ [api] Error ← ${url}:`, errText);
    throw new Error(errText || resp.statusText);
  }

  const contentType = resp.headers.get('content-type') || '';
  return contentType.includes('application/json')
    ? resp.json()
    : resp.text();
}

/** Auth & user flows **/
export function register(email, password) {
  return authFetch('/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function login(email, password) {
  return authFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/** Core translation & OCR **/
export function uploadText(
  text,
  sourceLanguage,
  targetLanguage,
  speakerGender,
  listenerGender,
  formality,
  durationSec = 0
) {
  return authFetch('/translate-text', {
    method: 'POST',
    body: JSON.stringify({
      text,
      sourceLanguage,
      targetLanguage,
      speakerGender,
      listenerGender,
      formality,
      durationSec,
    }),
  });
}

export async function uploadAudio({
  uri,
  sourceLanguage,
  targetLanguage,
  speakerGender,
  listenerGender,
  formality,
  durationSec = 0,
}) {
  const name = uri.split('/').pop();
  const form = new FormData();
  form.append('file', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    name,
    type: getMimeType(name),
  });
  form.append('sourceLanguage', sourceLanguage);
  form.append('targetLanguage', targetLanguage);
  form.append('speakerGender', speakerGender);
  form.append('listenerGender', listenerGender);
  form.append('formality', formality);
  form.append('durationSec', String(durationSec));

  return authFetch('/upload', {
    method: 'POST',
    body: form,
  });
}

export async function uploadImageForOcr(uri, sourceLanguage, targetLanguage) {
  const name = uri.split('/').pop();
  const form = new FormData();
  form.append('image', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    name,
    type: getMimeType(name),
  });
  form.append('sourceLanguage', sourceLanguage);
  form.append('targetLanguage', targetLanguage);

  return authFetch('/translate-image', {
    method: 'POST',
    body: form,
  });
}

/** Quota & purchases **/
export function fetchQuota() {
  return authFetch('/user/quota');
}

/**
 * Purchase a credits/seconds pack.
 * @param {string} plan  One of your server’s plan keys: 'Starter', 'Casual', etc.
 */
export function buyPack(plan) {
  return authFetch('/buy-pack', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}
