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
    // multipart/form-data bodies set their own boundary, so skip JSON header
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
  if (contentType.includes('application/json')) {
    return resp.json();
  } else {
    return resp.text();
  }
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

export function confirmEmail(token, email) {
  const q = `?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  return authFetch(`/confirm-email${q}`);
}

export function forgotPassword(email) {
  return authFetch('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(email, token, newPassword) {
  return authFetch('/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, token, newPassword }),
  });
}

/** Core translation & OCR **/

export function uploadText(text, sourceLanguage, targetLanguage, speakerGender, listenerGender, formality) {
  return authFetch('/translate-text', {
    method: 'POST',
    body: JSON.stringify({ text, sourceLanguage, targetLanguage, speakerGender, listenerGender, formality }),
  });
}

export async function uploadAudio({ uri, sourceLanguage, targetLanguage, speakerGender, listenerGender, formality }) {
  const name = uri.split('/').pop();
  const form = new FormData();
  form.append('audio', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    name,
    type: getMimeType(name),
  });
  form.append('sourceLanguage', sourceLanguage);
  form.append('targetLanguage', targetLanguage);
  form.append('speakerGender', speakerGender);
  form.append('listenerGender', listenerGender);
  form.append('formality', formality);

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

/** Quota, history & purchases **/

export function fetchQuota() {
  return authFetch('/user/quota');
}

export function fetchHistory() {
  return authFetch('/history');
}

export function purchaseAddon(productId) {
  return authFetch('/purchase/addon', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  });
}
