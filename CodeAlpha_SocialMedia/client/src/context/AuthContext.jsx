import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const next = io({ withCredentials: true });

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
        setUser(data.user);
        return data.user;
      },
      async register(name, username, email, password) {
        const data = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, username, email, password }) });
        setUser(data.user);
        return data.user;
      },
      async logout() {
        await api('/auth/logout', { method: 'POST' }).catch(() => {});
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