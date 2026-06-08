import { Locale } from './config';

const messages: Record<Locale, any> = {
  en: () => import('./messages/en').then(m => m.default),
  ru: () => import('./messages/ru').then(m => m.default),
  es: () => import('./messages/es').then(m => m.default),
  pt: () => import('./messages/pt').then(m => m.default),
  ar: () => import('./messages/ar').then(m => m.default),
  tr: () => import('./messages/tr').then(m => m.default),
  id: () => import('./messages/id').then(m => m.default),
  vi: () => import('./messages/vi').then(m => m.default),
};

export async function loadMessages(locale: Locale): Promise<any> {
  return messages[locale] ? messages[locale]() : messages.en();
}
