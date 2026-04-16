import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeDatabase } from '../services/database';
import { apiLogin, apiSignup, apiGetProfile, setToken, clearToken, initApiUrl } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, classLevel: number, language?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  isReady: false,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: async () => {},
  refreshProfile: async () => {},
});

function mapApiUser(apiUser: any): User {
  return {
    id: apiUser.id || '',
    name: apiUser.name || apiUser.full_name || '',
    email: apiUser.email || '',
    role: apiUser.role || 'student',
    classLevel: parseInt(apiUser.class || apiUser.class_level || '10') || 10,
    language: apiUser.language || 'en',
    createdAt: apiUser.created_at || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => { initApp(); }, []);

  async function initApp() {
    try {
      await initializeDatabase();
      await initApiUrl();

      // Restore cached session
      const storedUser = await AsyncStorage.getItem('user_data');
      if (storedUser) {
        setUser(JSON.parse(storedUser));

        // Silently refresh from server
        try {
          const data = await apiGetProfile();
          if (data?.user) {
            const fresh = mapApiUser(data.user);
            setUser(fresh);
            await AsyncStorage.setItem('user_data', JSON.stringify(fresh));
          }
        } catch {
          // Offline — cached user is fine
        }
      }
    } catch (e) {
      console.error('Init error:', e);
    } finally {
      setIsReady(true);
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // POST /api/auth/login → { user, session: { access_token } }
      const data = await apiLogin(email, password);
      const appUser = mapApiUser(data.user);
      setUser(appUser);
      await AsyncStorage.setItem('user_data', JSON.stringify(appUser));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Login failed. Check connection and credentials.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string, classLevel: number, language: string = 'en') => {
    setIsLoading(true);
    try {
      // POST /api/auth/signup → { message, user }
      await apiSignup(name, email, password, classLevel, language);

      // After signup, auto-login to get session token
      const loginData = await apiLogin(email, password);
      const appUser = mapApiUser(loginData.user);
      setUser(appUser);
      await AsyncStorage.setItem('user_data', JSON.stringify(appUser));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Signup failed. Check connection.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await clearToken();
    await AsyncStorage.removeItem('user_data');
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await apiGetProfile();
      if (data?.user) {
        const fresh = mapApiUser(data.user);
        setUser(fresh);
        await AsyncStorage.setItem('user_data', JSON.stringify(fresh));
      }
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isReady, login, signup, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
