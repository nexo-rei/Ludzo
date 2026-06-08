export type Locale = 'en' | 'ru' | 'es' | 'pt' | 'ar' | 'tr' | 'id' | 'vi';

export const locales: Locale[] = ['en', 'ru', 'es', 'pt', 'ar', 'tr', 'id', 'vi'];
export const defaultLocale: Locale = 'en';

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ru: 'Russian',
  es: 'Spanish',
  pt: 'Portuguese',
  ar: 'Arabic',
  tr: 'Turkish',
  id: 'Indonesian',
  vi: 'Vietnamese',
};

export const rtlLocales: Locale[] = ['ar'];

export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}
