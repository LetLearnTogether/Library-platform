import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiRequest,
  AUTH_SESSION_EXPIRED_EVENT,
  setCsrfToken,
} from '../lib/api';
import AuthContext from './AuthContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    setCsrfToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      setCsrfToken(null);
      setUser(null);
      setLoading(false);
    };
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest('/auth/me')
      .then((session) => {
        if (!active) return;
        setCsrfToken(session.csrf_token);
        setUser(session.user);
      })
      .catch(() => {
        if (active) {
          setCsrfToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const establishSession = useCallback((session) => {
    setCsrfToken(session.csrf_token);
    setUser(session.user);
    return session.user;
  }, []);

  const login = useCallback(async (email, password) => {
    const session = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    return establishSession(session);
  }, [establishSession]);

  const loginWithGoogle = useCallback(async (credential, nonce) => {
    const session = await apiRequest('/auth/google', {
      method: 'POST',
      body: { credential, nonce },
    });
    return establishSession(session);
  }, [establishSession]);

  const register = useCallback(async ({ name, email, password }) => {
    const session = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
    return establishSession(session);
  }, [establishSession]);

  const value = useMemo(
    () => ({ user, loading, login, loginWithGoogle, register, logout }),
    [user, loading, login, loginWithGoogle, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
