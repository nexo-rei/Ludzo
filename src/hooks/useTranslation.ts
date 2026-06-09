import { useState, useEffect } from 'react';
import type { Language } from '@/lib/i18n';
import { t as translate, setLanguage, getCurrentLanguage } from '@/lib/i18n';

export function useTranslation() {
  const [lang, setLang] = useState<Language>(getCurrentLanguage() as Language);

  useEffect(() => {
    setLang(getCurrentLanguage() as Language);
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLanguage(newLang);
    setLang(newLang);
  };

  return {
    t: (key: string) => translate(key, lang),
    lang,
    changeLanguage,
  };
}
