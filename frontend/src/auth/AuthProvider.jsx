import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, clearAccessToken, getAccessToken, setAccessToken } from '../lib/api';
import AuthContext from './AuthContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getAccessToken()));

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
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

  const login = useCallback(async (email, password) => {
    const token = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
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

  const register = useCallback(async ({ name, email, password }) => {
    await apiRequest('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
    return login(email, password);
  }, [login]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
