import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, hasSession, setSession } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only restore a session established in this browser; anonymous visits
    // must not trigger the protected /auth/me request.
    if (!hasSession()) {
      setUser(null);
      setLoading(false);
      return undefined;
    }
    let active = true;
    api('/auth/me')
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(email, password) {
        const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        setSession();
        setUser(data.user);
        return data.user;
      },
      async register(name, email, password) {
        const data = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
        setSession();
        setUser(data.user);
        return data.user;
      },
      async logout() {
        await api('/auth/logout', { method: 'POST' }).catch(() => {});
        clearSession();
        setUser(null);
      },
      setUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}