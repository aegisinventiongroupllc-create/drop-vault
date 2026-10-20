import catalog from '@/i18n/uiCatalog.json';
import { paymentStatusTranslations } from '@/i18n/paymentStatus';

const dictionaries: Record<string, Record<string, string>> = catalog;
export function savedUiTranslations(lang: string): Record<string, string> {
  const normalized = lang.toLowerCase();
  const fallback = normalized === 'pt' ? 'pt-br' : normalized === 'zh-tw' ? undefined : normalized.split('-')[0];
  return { ...(fallback ? dictionaries[fallback] : {}), ...dictionaries[normalized], ...paymentStatusTranslations(normalized) };
}

export function uiTranslation(source: string, lang: string): string {
  return savedUiTranslations(lang)[source] || source;
}

export function languageDirection(lang: string): 'rtl' | 'ltr' {
  return ['ar', 'he', 'fa', 'ur'].includes(lang.split('-')[0]) ? 'rtl' : 'ltr';
}