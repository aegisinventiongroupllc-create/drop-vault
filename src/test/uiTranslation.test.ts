import { describe, it, expect } from 'vitest';
import { savedUiTranslations, languageDirection } from '@/lib/uiTranslation';

describe('reusable UI translation catalog', () => {
  it('uses right-to-left direction for Arabic and Hebrew, not French', () => {
    expect(languageDirection('ar')).toBe('rtl');
    expect(languageDirection('he')).toBe('rtl');
    expect(languageDirection('fr')).toBe('ltr');
  });
  it('does not contain cached account-specific names or email addresses', () => {
    for (const lang of ['es', 'pt', 'fr', 'de', 'it', 'nl', 'pl', 'ru', 'uk', 'tr', 'ar', 'he', 'hi', 'ja', 'ko', 'zh-cn', 'zh-tw', 'th', 'vi', 'id', 'ms', 'tl', 'sv', 'no', 'da', 'fi', 'el', 'cs', 'ro', 'hu', 'bg', 'sr', 'hr', 'sw', 'af']) {
      expect(Object.keys(savedUiTranslations(lang)).some(key => key.includes('@') || key.includes('BlondieVibes'))).toBe(false);
    }
  });
});