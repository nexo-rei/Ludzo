import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppUser, Wallet, UserPreferences, AuthContextType } from '@/types/types';
import { authTelegram, getWallet } from '@/services/api';
import { supabase } from '@/db/supabase';
import { setLanguage, detectLanguage } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

const AuthContext = createContext<AuthContextType>({
  user: null,
  wallet: null,
  preferences: null,
  isLoading: true,
  isAuthenticated: false,
  refreshWallet: async () => {},
  refreshUser: async () => {},
  updatePreferences: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = useCallback(async () => {
    try {
      const tg = window.Telegram?.WebApp;
      const tgUser = tg?.initDataUnsafe?.user;

      if (!tgUser?.id) {
        // Dev mode fallback
        const devUser = {
          id: 999999999,
          first_name: 'Demo',
          last_name: 'User',
          username: 'demouser',
          photo_url: '',
          language_code: 'en',
        };
        const referralCode = new URLSearchParams(window.location.search).get('ref') ?? undefined;
        const result = await authTelegram({ ...devUser, referral_code: referralCode });
        setUser(result.user);
        setWallet(result.wallet);
        setPreferences(result.preferences);
        const lang = detectLanguage(result.preferences?.language ?? devUser.language_code);
        setLanguage(lang as Language);
        return;
      }

      const referralCode = tg?.initDataUnsafe?.start_param ?? undefined;
      const result = await authTelegram({
        id: tgUser.id,
        first_name: tgUser.first_name ?? '',
        last_name: tgUser.last_name,
        username: tgUser.username,
        photo_url: tgUser.photo_url,
        language_code: tgUser.language_code,
        referral_code: referralCode,
      });

      setUser(result.user);
      setWallet(result.wallet);
      setPreferences(result.preferences);
      const lang = detectLanguage(result.preferences?.language ?? tgUser.language_code);
      setLanguage(lang as Language);
    } catch (err) {
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const refreshWallet = useCallback(async () => {
    if (!user) return;
    const w = await getWallet(user.id);
    if (w) setWallet(w);
  }, [user]);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
    if (data) setUser(data as AppUser);
  }, [user]);

  const updatePreferences = useCallback(async (prefs: Partial<UserPreferences>) => {
    if (!user) return;
    await supabase.from('user_preferences').update({ ...prefs, updated_at: new Date().toISOString() }).eq('user_id', user.id);
    const { data } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle();
    if (data) {
      setPreferences(data as UserPreferences);
      if (prefs.language) setLanguage(prefs.language as Language);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      wallet,
      preferences,
      isLoading,
      isAuthenticated: !!user,
      refreshWallet,
      refreshUser,
      updatePreferences,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
