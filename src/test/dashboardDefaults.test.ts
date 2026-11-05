import { describe, expect, it } from 'vitest';
import { resolveDashboardTheme } from '@/lib/userTheme';

describe('new-account dashboard appearance', () => {
  it('starts customers and creators with pink highlights and neon-pink outlines', () => {
    expect(resolveDashboardTheme({})).toEqual({ primary: '#ff0080', outline: '#ff0080' });
  });
  it('preserves saved personal colors instead of resetting them to pink', () => {
    expect(resolveDashboardTheme({ primary: '#3b82f6', outline: '#14b8a6', card: '#202020' }))
      .toEqual({ primary: '#3b82f6', outline: '#14b8a6', card: '#202020' });
  });
});