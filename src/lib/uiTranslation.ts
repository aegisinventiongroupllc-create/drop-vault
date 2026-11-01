import catalog from '@/i18n/uiCatalog.json';
import launchCatalog from '@/i18n/launchCatalog.json';
import publicCatalog from '@/i18n/publicCatalog.json';
import { paymentStatusTranslations } from '@/i18n/paymentStatus';
import { savedEntryTranslations } from '@/i18n/entryCatalog';

const dictionaries: Record<string, Record<string, string>> = catalog;
const launchDictionaries: Record<string, Record<string, string>> = launchCatalog;
const publicDictionaries: Record<string, Record<string, string>> = publicCatalog;
export function savedUiTranslations(lang: string): Record<string, string> {
  const normalized = lang.toLowerCase();
  const fallback = normalized === 'pt' ? 'pt-br' : normalized === 'zh-tw' ? undefined : normalized.split('-')[0];
  const base = normalized.split('-')[0];
  return {
    ...(fallback ? dictionaries[fallback] : {}), ...dictionaries[normalized],
    ...launchDictionaries[base], ...launchDictionaries[normalized],
    ...publicDictionaries[base], ...publicDictionaries[normalized],
    ...paymentStatusTranslations(normalized),
    ...savedEntryTranslations(normalized),
  };
}

export function uiTranslation(source: string, lang: string): string {
  return savedUiTranslations(lang)[source] || source;
}

export function languageDirection(lang: string): 'rtl' | 'ltr' {
  return ['ar', 'he', 'fa', 'ur'].includes(lang.split('-')[0]) ? 'rtl' : 'ltr';
}