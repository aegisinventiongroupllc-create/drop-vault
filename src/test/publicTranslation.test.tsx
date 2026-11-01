import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import AutoTranslator from '@/components/AutoTranslator';
import { savedUiTranslations } from '@/lib/uiTranslation';
import { EXTRA_LANGUAGES } from '@/lib/siteTranslate';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    getSession: async () => ({ data: { session: null } }),
  }, functions: { invoke },
} }));
afterEach(() => { cleanup(); localStorage.clear(); invoke.mockClear(); });

describe('public translations without paid AI or account access', () => {
  it('keeps the $25 price and 14-day access duration across all offered languages', () => {
    const source = 'Bit-Tokens cost $25 USD each ($20 value + $5 service and processing fee) and unlock one creator for 14 days. The $20 Vault Entry Pass lasts 365 days. Separate purchases and network fees must be reviewed before payment. Checkout is offered only after processor approval and verified payment setup; unavailable methods cannot take payment.';
    for (const lang of ['es', 'pt', 'fr', ...Object.keys(EXTRA_LANGUAGES)]) {
      const translation = savedUiTranslations(lang.toLowerCase())[source];
      expect(translation).toBeTruthy();
      expect(translation).toContain('25');
      expect(translation).toContain('14');
      expect(translation).toContain('365');
    }
  });
  it('translates public legal paragraphs without sending them or private input to AI', async () => {
    localStorage.setItem('dtt_auto_lang', 'ar');
    const dict = savedUiTranslations('ar');
    const source = Object.keys(dict).find(key => key.startsWith('Entry is blocked for excluded country estimates'));
    if (!source) throw Error('Public policy missing');
    const { container } = render(<><AutoTranslator /><p>{source}</p><input defaultValue="Private identity" /></>);
    await waitFor(() => expect(container.querySelector('p')?.textContent).toBe(dict[source]));
    expect(container.querySelector('input')?.value).toBe('Private identity');
    expect(invoke).not.toHaveBeenCalled();
  });
});