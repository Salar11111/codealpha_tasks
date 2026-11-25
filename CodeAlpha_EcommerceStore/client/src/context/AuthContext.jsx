import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, clearSession, hasSession, setSession } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // Only restore a session when one was established in this browser; an
    // anonymous visit must not make a protected /auth/me request (401).
    if (!hasSession()) {
      setUser(null);
      return null;
    }
    try {
      const data = await api('/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      setUser,
      async login(email, password) {
        const data = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setSession();
        setUser(data.user);
        return data.user;
      },
      async register(name, email, password) {
        const data = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
        setSession();
        setUser(data.user);
        return data.user;
      },
      async logout() {
        await api('/auth/logout', { method: 'POST' }).catch(() => {});
        clearSession();
        setUser(null);
        queryClient.removeQueries({ queryKey: ['wishlist'] });
      },
    }),
    [user, loading, refresh, queryClient]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
