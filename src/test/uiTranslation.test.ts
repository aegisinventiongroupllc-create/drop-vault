import { describe, it, expect } from 'vitest';
import { savedUiTranslations, languageDirection } from '@/lib/uiTranslation';

describe('reusable UI translation catalog', () => {
  it('provides request and fan actions for the twelve main languages', () => {
    for (const lang of ['es', 'pt', 'fr', 'de', 'it', 'ru', 'ar', 'hi', 'ja', 'ko', 'zh-cn']) {
      const entries = savedUiTranslations(lang);
      for (const key of ['Top 10 Fans', 'SUBMIT REQUEST', 'Accepted — Awaiting Payment', 'Send message']) {
        expect(entries[key], `${lang}:${key}`).toBeTruthy();
      }
    }
  });
  it('uses right-to-left direction for Arabic and Hebrew, not French', () => {
    expect(languageDirection('ar')).toBe('rtl');
    expect(languageDirection('he')).toBe('rtl');
    expect(languageDirection('fr')).toBe('ltr');
  });
  it('does not contain cached account-specific names or email addresses', () => {
    for (const lang of ['es', 'pt', 'fr', 'de', 'it', 'ru', 'ar', 'hi', 'ja', 'ko', 'zh-cn']) {
      expect(Object.keys(savedUiTranslations(lang)).some(key => key.includes('@') || key.includes('BlondieVibes'))).toBe(false);
    }
  });
});