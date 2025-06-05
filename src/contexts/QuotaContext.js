// frontend/src/contexts/QuotaContext.js

import React, { createContext, useState, useEffect } from 'react';
import { fetchQuota as fetchQuotaFromService } from '../services/api';

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

  const fetchQuota = async () => {
    setLoading(true);
    try {
      // fetchQuotaFromService returns an object like { expiresAt, plan, interpretationsLeft, remainingScans, remainingSeconds }
      const data = await fetchQuotaFromService();
      if (data) {
        setQuota({
          expiresAt: data.expiresAt,
          plan: data.plan,
          interpretationsLeft: data.interpretationsLeft ?? 0,
          remainingScans: data.remainingScans ?? 0,
          remainingSeconds: data.remainingSeconds ?? 0,
        });
      } else {
        // If data is null/undefined, default to zeros
        setQuota({
          expiresAt: null,
          plan: null,
          interpretationsLeft: 0,
          remainingScans: 0,
          remainingSeconds: 0,
        });
      }
    } catch (e) {
      console.warn('❌ [QuotaContext] Failed to fetch quota', e);
      setQuota({
        expiresAt: null,
        plan: null,
        interpretationsLeft: 0,
        remainingScans: 0,
        remainingSeconds: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
  }, []);

  return (
    <QuotaContext.Provider value={{ quota, loading, refreshQuota: fetchQuota }}>
      {children}
    </QuotaContext.Provider>
  );
}
