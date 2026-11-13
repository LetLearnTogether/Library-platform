import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiRequest,
  AUTH_SESSION_EXPIRED_EVENT,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../lib/api';
import AuthContext from './AuthContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getAccessToken()));

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
  }, []);

  useEffect(() => {
    let active = true;
    if (!getAccessToken()) return () => { active = false; };

    apiRequest('/auth/me')
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) logout();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [logout]);

  const establishSession = useCallback(async (token) => {
    setAccessToken(token.access_token);
    try {
      const currentUser = await apiRequest('/auth/me');
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      clearAccessToken();
      throw error;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const token = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    return establishSession(token);
  }, [establishSession]);

  const loginWithGoogle = useCallback(async (credential, nonce) => {
    const token = await apiRequest('/auth/google', {
      method: 'POST',
      body: { credential, nonce },
    });
    return establishSession(token);
  }, [establishSession]);

  const register = useCallback(async ({ name, email, password }) => {
    await apiRequest('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
    const currentUser = await login(email, password);
    return currentUser;
  }, [login]);

  const value = useMemo(
    () => ({ user, loading, login, loginWithGoogle, register, logout }),
    [user, loading, login, loginWithGoogle, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
