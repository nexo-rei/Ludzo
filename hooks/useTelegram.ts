'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      photo_url?: string;
    };
    start_param?: string;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  MainButton: {
    show: () => void;
    hide: () => void;
    setText: (text: string) => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
  };
  HapticFeedback: {
    notificationOccurred: (type: string) => void;
  };
  shareURL: (url: string, text?: string) => void;
  openTelegramLink: (url: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      setError('Not inside Telegram');
      setLoading(false);
      return;
    }
    setWebApp(tg);
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#000000');
    tg.setBackgroundColor('#000000');

    // Authenticate
    authenticate(tg);
  }, []);

  const authenticate = async (tg: TelegramWebApp) => {
    try {
      const initData = tg.initData;
      if (!initData) {
        setError('No init data');
        setLoading(false);
        return;
      }

      const referralCode = tg.initDataUnsafe?.start_param;

      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, referralCode }),
      });

      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('ludzo_user', JSON.stringify(data.user));
      } else {
        setError(data.error || 'Auth failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const api = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!user?.telegram_id) throw new Error('Not authenticated');
      const res = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'x-telegram-id': String(user.telegram_id),
        },
      });
      return res.json();
    },
    [user]
  );

  const shareReferral = useCallback(() => {
    if (!webApp || !user) return;
    const link = `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'LudzoBot'}?start=${user.telegram_id}`;
    try {
      webApp.shareURL?.(link, 'Join Ludzo and earn coins!');
    } catch {
      webApp.openTelegramLink?.(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join Ludzo and earn coins!')}`);
    }
  }, [webApp, user]);

  const openTelegramLink = useCallback((url: string) => {
    webApp?.openTelegramLink?.(url);
  }, [webApp]);

  return { webApp, user, loading, error, api, shareReferral, openTelegramLink };
}
