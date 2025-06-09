// src/contexts/QuotaContext.js

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchQuota } from '../services/api';

const QuotaContext = createContext({
  plan: 'Free',
  expiresAt: null,
  interpretationsLeft: 0,
  remainingScans: 0,
  loading: true,
});

export function useQuota() {
  return useContext(QuotaContext);
}

export function QuotaProvider({ children }) {
  const [quota, setQuota] = useState({
    plan: 'Free',
    expiresAt: null,
    interpretationsLeft: 0,
    remainingScans: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadQuota() {
      try {
        // Only fetch if a token is stored
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          // Not logged in yet → skip fetch
          if (mounted) setLoading(false);
          return;
        }

        console.log('📊 [QuotaContext] fetching quota');
        const data = await fetchQuota(); 
        // Expected shape: { plan, expiresAt, interpretationsLeft, remainingScans }
        if (mounted) {
          setQuota({
            plan:                data.plan,
            expiresAt:           data.expiresAt,
            interpretationsLeft: data.interpretationsLeft,
            remainingScans:      data.remainingScans,
          });
        }
      } catch (err) {
        // If it’s a 401/no-token error, ignore silently
        const msg = err.message || '';
        if (!msg.includes('No token provided')) {
          console.warn('[QuotaContext] unexpected error:', err);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadQuota();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <QuotaContext.Provider value={{ ...quota, loading }}>
      {children}
    </QuotaContext.Provider>
  );
}
