import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api.js';
import { PlatformSettingsContext } from './PlatformSettingsContext.js';

export function PlatformSettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    apiRequest('/settings/public')
      .then((currentSettings) => {
        if (active) setSettings(currentSettings);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Platform settings could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [retryCount]);

  const applySettings = useCallback((currentSettings) => {
    setSettings(currentSettings);
    setError('');
  }, []);
  const retry = useCallback(() => {
    setLoading(true);
    setError('');
    setRetryCount((current) => current + 1);
  }, []);
  const value = useMemo(() => ({
    settings,
    loading,
    error,
    applySettings,
    retry,
  }), [settings, loading, error, applySettings, retry]);

  return (
    <PlatformSettingsContext.Provider value={value}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}
