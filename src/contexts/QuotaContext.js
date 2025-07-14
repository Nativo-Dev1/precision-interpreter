// src/contexts/QuotaContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { fetchQuota } from '../services/api';

export const QuotaContext = createContext({
  remainingCredits: 0,
  accumulatedSeconds: 0,
  secsPerCredit: 10,
  secondsLeft: 0,
  remainingScans: 0,
  loading: true,
  refreshQuota: async () => {},
});

export function QuotaProvider({ children }) {
  const [remainingCredits, setRemainingCredits]         = useState(0);
  const [accumulatedSeconds, setAccumulatedSeconds]     = useState(0);
  const [secsPerCredit, setSecsPerCredit]               = useState(10);
  const [secondsLeft, setSecondsLeft]                   = useState(0);
  const [remainingScans, setRemainingScans]             = useState(0);
  const [loading, setLoading]                           = useState(true);

  const loadQuota = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchQuota(); 
      // data: { creditsLeft, secondsAccumulated, secsPerCredit, scansLeft }
      const credits   = data.creditsLeft ?? 0;
      const accuSec   = data.secondsAccumulated ?? 0;
      const perCredit = data.secsPerCredit ?? 10;
      const scans     = data.scansLeft ?? 0;

      setRemainingCredits(credits);
      setAccumulatedSeconds(accuSec);
      setSecsPerCredit(perCredit);
      setSecondsLeft(credits * perCredit - accuSec);
      setRemainingScans(scans);
    } catch (err) {
      console.warn('[QuotaContext] loadQuota failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    loadQuota();
  }, [loadQuota]);

  // Expose the same loader as a manual “refresh”
  const refreshQuota = useCallback(async () => {
    await loadQuota();
  }, [loadQuota]);

  return (
    <QuotaContext.Provider
      value={{
        remainingCredits,
        accumulatedSeconds,
        secsPerCredit,
        secondsLeft,
        remainingScans,
        loading,
        refreshQuota,
      }}
    >
      {children}
    </QuotaContext.Provider>
  );
}
