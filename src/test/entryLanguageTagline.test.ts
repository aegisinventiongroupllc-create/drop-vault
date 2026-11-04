import { describe, expect, it } from 'vitest';
import {
  INTRO_CAPTIONS,
  INTRO_TAGLINES,
  INTRO_ADULT,
  introCaptions,
  introTaglines,
  introAdultLabels,
} from '@/components/LaunchIntro';

const LANGS = Object.keys(INTRO_CAPTIONS);

describe('intro tagline and 18+ label in every offered language', () => {
  it('tagline and 18+ label cover the same languages as the tap caption', () => {
    expect(Object.keys(INTRO_TAGLINES).sort()).toEqual([...LANGS].sort());
    expect(Object.keys(INTRO_ADULT).sort()).toEqual([...LANGS].sort());
  });

  for (const lang of LANGS) {
    it(`explains the no-subscription Bit-Token model in ${lang}`, () => {
      const tagline = introTaglines(lang);
      // Brand name stays "Bit-Tokens" in Latin script where readable; ko/hi use native script.
      expect(tagline).toMatch(/token|토큰|टोकन/i);
      expect(tagline.length).toBeGreaterThan(10);
    });

    it(`labels the content 18+ adult in ${lang}`, () => {
      expect(introAdultLabels(lang)).toMatch(/^18+/);
      expect(introAdultLabels(lang).length).toBeGreaterThan(4);
    });
  }

  it('falls back to English for unknown languages', () => {
    expect(introTaglines('ja-JP')).toBe(INTRO_TAGLINES.en);
    expect(introAdultLabels('ja-JP')).toBe(INTRO_ADULT.en);
    expect(introCaptions('ja-JP')).toBe(INTRO_CAPTIONS.en);
  });
});
