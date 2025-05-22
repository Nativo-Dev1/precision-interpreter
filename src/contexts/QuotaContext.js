// frontend/src/contexts/QuotaContext.js
import React, { createContext, useState, useEffect } from 'react';
import { API } from '../services/api';

export const QuotaContext = createContext({
  quota: null,
  loading: true,
  refreshQuota: () => {},
});

export function QuotaProvider({ children }) {
  const [quota, setQuota]     = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchQuota = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/user/quota', {
        headers: { 'x-user-id': '1' }  // TODO: replace '1' with dynamic user ID once you have auth
      });
      setQuota(data);
    } catch (e) {
      console.warn('Failed to fetch quota', e);
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
