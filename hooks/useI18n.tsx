"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  SUPPORTED_LANGUAGES,
  type LanguageCode,
  isSupportedLanguage,
  normalizeLanguage,
  getTranslation,
  formatNumber as fnHelper,
  formatCurrency as fcHelper,
  formatDate as fdHelper,
} from "@/lib/i18n";

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: "en",
  setLanguage: () => {},
  t: (key, vars) => getTranslation("en", key, vars),
  locale: "en",
  formatNumber: (v) => String(v),
  formatCurrency: (a) => `$${a.toFixed(2)}`,
  formatDate: (d) => String(d),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLangState] = useState<LanguageCode>("en");

  // Read initial language on mount to prevent SSR hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem("ludzo_lang");
    if (isSupportedLanguage(saved)) {
      setLangState(saved);
      document.documentElement.lang = saved;
      document.documentElement.setAttribute("dir", "ltr");
    } else if (typeof navigator !== "undefined" && navigator.language) {
      const normalized = normalizeLanguage(navigator.language);
      setLangState(normalized);
      document.documentElement.lang = normalized;
      document.documentElement.setAttribute("dir", "ltr");
    }
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    if (!isSupportedLanguage(code)) return;
    setLangState(code);
    if (typeof window !== "undefined") {
      localStorage.setItem("ludzo_lang", code);
      document.documentElement.lang = code;
      document.documentElement.setAttribute("dir", "ltr");
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      return getTranslation(language, key, vars);
    },
    [language]
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      return fnHelper(value, language, options);
    },
    [language]
  );

  const formatCurrency = useCallback(
    (amount: number, currency: string = "USD") => {
      return fcHelper(amount, currency, language);
    },
    [language]
  );

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      return fdHelper(date, language, options);
    },
    [language]
  );

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        locale: language,
        formatNumber,
        formatCurrency,
        formatDate,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
