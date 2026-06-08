'use client';

import { useState, useEffect, useCallback } from 'react';
import { Locale, defaultLocale, isRTL } from '@/lib/i18n/config';
import { loadMessages } from '@/lib/i18n/loader';

let globalMessages: any = null;
let globalLocale: Locale = defaultLocale;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(globalLocale);
  const [messages, setMessages] = useState<any>(globalMessages);
  const [ready, setReady] = useState(!!globalMessages);

  useEffect(() => {
    const handler = () => {
      setLocaleState(globalLocale);
      setMessages(globalMessages);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  useEffect(() => {
    if (globalMessages) {
      setMessages(globalMessages);
      setReady(true);
      return;
    }

    const init = async () => {
      const saved = localStorage.getItem('ludzo_locale') as Locale;
      const loc = saved && ['en', 'ru', 'es', 'pt', 'ar', 'tr', 'id', 'vi'].includes(saved) ? saved : defaultLocale;
      globalLocale = loc;
      const msgs = await loadMessages(loc);
      globalMessages = msgs;
      setMessages(msgs);
      setLocaleState(loc);
      setReady(true);
      notify();
      document.documentElement.dir = isRTL(loc) ? 'rtl' : 'ltr';
    };

    init();
  }, []);

  const setLocale = useCallback(async (loc: Locale) => {
    localStorage.setItem('ludzo_locale', loc);
    globalLocale = loc;
    const msgs = await loadMessages(loc);
    globalMessages = msgs;
    setMessages(msgs);
    setLocaleState(loc);
    document.documentElement.dir = isRTL(loc) ? 'rtl' : 'ltr';
    notify();
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      if (!messages) return key;
      const keys = key.split('.');
      let val = messages;
      for (const k of keys) {
        val = val?.[k];
        if (val === undefined) return key;
      }
      if (typeof val === 'string' && params) {
        return val.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
      }
      return typeof val === 'string' ? val : key;
    },
    [messages]
  );

  return { t, locale, setLocale, ready };
}
