// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { notifyCreatorSignup } from '../../supabase/functions/_shared/creatorSignupNotification';
const creator = { user_id: 'creator-1', email: 'creator@example.test', account_type: 'creator', created_at: '2026-11-21T23:10:00Z' };
describe('creator signup owner notices', () => {
  it('sends creator-start notices to admin@dttmediallc.com with account-bound deduplication', async () => {
    const send = vi.fn(async () => ({ sent: true }));
    await notifyCreatorSignup(creator, send);
    expect(send).toHaveBeenCalledWith('creator-signup-started', 'admin@dttmediallc.com', {
      templateData: { email: 'creator@example.test', startedAt: '2026-11-21T23:10:00Z' }, idempotencyKey: 'creator-signup-started-creator-1',
    });
    await notifyCreatorSignup(creator, send);
    expect(send.mock.calls[1]).toEqual(send.mock.calls[0]);
    await notifyCreatorSignup({ ...creator, user_id: 'creator-2' }, send);
    expect(send).toHaveBeenLastCalledWith('creator-signup-started', 'admin@dttmediallc.com', expect.objectContaining({ idempotencyKey: 'creator-signup-started-creator-2' }));
  });
  it('does not send creator notices for customer or undecided accounts', async () => {
    const send = vi.fn();
    await notifyCreatorSignup({ ...creator, account_type: 'customer' }, send);
    await notifyCreatorSignup({ ...creator, account_type: null }, send);
    await notifyCreatorSignup({ ...creator, created_at: '2026-11-20T23:10:00Z' }, send);
    expect(send).not.toHaveBeenCalled();
  });
  it('preserves suppression and does not retry a suppressed recipient', async () => {
    const send = vi.fn(async () => ({ sent: false }));
    expect(await notifyCreatorSignup(creator, send)).toEqual({ sent: false });
    expect(send).toHaveBeenCalledOnce();
  });
});