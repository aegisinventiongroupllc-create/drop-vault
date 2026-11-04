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
      expect(tagline).toContain('Bit-Tokens');
      expect(tagline.toLowerCase()).toMatch(
        /suscri|subscri|abonn|abon|abo|keine abos|订阅|구독|abonelik|langganan|सदस्यता|подпис|subskrypc|اشتراك/,
      );
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
