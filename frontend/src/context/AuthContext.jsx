import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

const OWNER_EMAILS = ['jojacale@gmail.com', 'sica2121@gmail.com'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('pulpapp_token');
    if (!token) { setLoading(false); return; }
    try {
      const { user } = await authApi.me();
      localStorage.setItem('pulpapp_user_cache', JSON.stringify(user));
      setUser(user);
      setSubscriptionExpired(false);
    } catch (err) {
      if (err?.code === 'SUBSCRIPTION_EXPIRED') {
        // Usar caché para mostrar el nombre en la pantalla de expiración
        const cached = localStorage.getItem('pulpapp_user_cache');
        if (cached) setUser(JSON.parse(cached));
        setSubscriptionExpired(true);
      } else {
        localStorage.removeItem('pulpapp_token');
        localStorage.removeItem('pulpapp_user_cache');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('pulpapp_token', data.token);
    if (data.refreshToken) localStorage.setItem('pulpapp_refresh', data.refreshToken);
    localStorage.setItem('pulpapp_user_cache', JSON.stringify(data.user));
    setUser(data.user);
    setSubscriptionExpired(false);
    return data;
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('pulpapp_token');
    localStorage.removeItem('pulpapp_refresh');
    localStorage.removeItem('pulpapp_user_cache');
    setUser(null);
    setSubscriptionExpired(false);
  };

  const updateUser = (updatedUser) => {
    setUser(prev => {
      const merged = { ...prev, ...updatedUser };
      localStorage.setItem('pulpapp_user_cache', JSON.stringify(merged));
      return merged;
    });
  };

  const isAdmin  = user?.role === 'admin';
  const isDentist = user?.role === 'dentist' || user?.role === 'admin';
  const isOwner  = OWNER_EMAILS.includes(user?.email);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, isAdmin, isDentist, isOwner, subscriptionExpired }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
