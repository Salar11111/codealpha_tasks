import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, hasSession, setSession } from '../api/client';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || undefined;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Restore only sessions created in this browser; anonymous visits never
    // call the protected /auth/me endpoint.
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

  useEffect(() => {
    if (!user) return undefined;
    const next = io(SOCKET_URL, { withCredentials: true });

    next.on('notification:new', (note) => {
      setNotifications((prev) => [note, ...prev].slice(0, 50));
    });

    return () => {
      next.disconnect();
    };
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      notifications,
      async login(email, password) {
        const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        setSession();
        setUser(data.user);
        return data.user;
      },
      async register(name, username, email, password) {
        const data = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, username, email, password }) });
        setSession();
        setUser(data.user);
        return data.user;
      },
      async logout() {
        await api('/auth/logout', { method: 'POST' }).catch(() => {});
        clearSession();
        setUser(null);
        setNotifications([]);
      },
      setUser,
    }),
    [user, loading, notifications]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}