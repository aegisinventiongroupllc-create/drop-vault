import { describe, expect, it } from 'vitest';
import { EXTRA_LANGUAGES } from '@/lib/siteTranslate';
import { savedEntryTranslations, ENTRY_SUMMARY } from '@/i18n/entryCatalog';

describe('annual entry price in every offered language', () => {
  for (const lang of ['es', 'pt', 'fr', ...Object.keys(EXTRA_LANGUAGES)]) {
    it(`preserves the $20 annual price and 365-day duration in ${lang}`, () => {
      const saved = savedEntryTranslations(lang);
      expect(saved['$20 / YEAR']).toContain('20');
      expect(saved[ENTRY_SUMMARY]).toContain('365');
      expect(saved['GET MY ENTRY PASS — $20']).toContain('20');
    });
  }
});