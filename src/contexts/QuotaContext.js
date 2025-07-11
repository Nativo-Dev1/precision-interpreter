// src/contexts/QuotaContext.js

import React, { createContext, useState, useRef, useEffect, useCallback } from 'react';
import { fetchQuota as fetchQuotaFromService } from '../services/api';

// Context default values
export const QuotaContext = createContext({
  quota: {
    expiresAt: null,
    plan: null,
    interpretationsLeft: 0,
    remainingScans: 0,
    remainingSeconds: 0,
  },
  loading: true,
  refreshQuota: () => {},
});

export function QuotaProvider({ children }) {
  const [quota, setQuota] = useState({
    expiresAt: null,
    plan: null,
    interpretationsLeft: 0,
    remainingScans: 0,
    remainingSeconds: 0,
  });
  const [loading, setLoading] = useState(true);

  // Cache ref holds last fetch time and data
  const cacheRef = useRef({ time: 0, data: null });

  // Fetch quota with 30s caching
  const fetchQuota = useCallback(async () => {
    const now = Date.now();
    // Reuse cached data if under 30 seconds old
    if (cacheRef.current.data && now - cacheRef.current.time < 30_000) {
      setQuota(cacheRef.current.data);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchQuotaFromService();
      const normalized = {
        expiresAt: data.expiresAt ?? null,
        plan: data.plan ?? null,
        interpretationsLeft: data.interpretationsLeft ?? 0,
        remainingScans: data.remainingScans ?? 0,
        remainingSeconds: data.remainingSeconds ?? 0,
      };
      setQuota(normalized);
      cacheRef.current = { time: now, data: normalized };
    } catch (err) {
      console.warn('❌ [QuotaContext] Failed to fetch quota', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  return (
    <QuotaContext.Provider value={{ quota, loading, refreshQuota: fetchQuota }}>
      {children}
    </QuotaContext.Provider>
  );
}
