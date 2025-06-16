// src/contexts/AuthContext.tsx
import React, { useState, useEffect, useContext, createContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import type { SimpleUser } from '../types';

interface AuthContextType {
  token: string | null;
  currentUser: SimpleUser | null;
  isAuthReady: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

type DecodedToken = {
  user_id: number;
  username: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [currentUser, setCurrentUser] = useState<SimpleUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    try {
      if (token) {
        localStorage.setItem('access_token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const decoded = jwtDecode<DecodedToken>(token);
        setCurrentUser({ id: decoded.user_id, username: decoded.username });
      } else {
        localStorage.removeItem('access_token');
        delete api.defaults.headers.common['Authorization'];
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Invalid token:", error);
      setToken(null);
    } finally {
      setIsAuthReady(true);
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    const response = await api.post('/api/token/', { username, password });
    setToken(response.data.access);
  };

  const logout = () => {
    setToken(null);
  };

  const value = { token, currentUser, isAuthReady, login, logout };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}