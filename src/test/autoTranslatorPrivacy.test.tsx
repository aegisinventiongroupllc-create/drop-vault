import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import AutoTranslator from '@/components/AutoTranslator';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    getSession: async () => ({ data: { session: null } }),
  }, functions: { invoke },
} }));

afterEach(() => { cleanup(); localStorage.clear(); invoke.mockClear(); });
describe('saved translations preserve private input', () => {
  it('translates message placeholders but never typed messages or protected identities', async () => {
    localStorage.setItem('dtt_auto_lang', 'de');
    const { container } = render(<><AutoTranslator /><input placeholder="Write a message…" defaultValue="Private message 123" /><span translate="no">Private member 456</span></>);
    const input = container.querySelector('input');
    if (!input) throw new Error('Missing input');
    await waitFor(() => expect(input.placeholder).not.toBe('Write a message…'));
    expect(input.value).toBe('Private message 123');
    expect(container.querySelector('span')?.textContent).toBe('Private member 456');
    expect(invoke).not.toHaveBeenCalled();
  });
});