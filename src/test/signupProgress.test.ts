// @vitest-environment node
import { expect, it } from 'vitest';
import { signupProgressNotice, type SignupSnapshot } from '../../supabase/functions/_shared/signupProgress';
const account: SignupSnapshot = { userId: 'member-1', email: 'member@example.test', accountType: 'customer', createdAt: '2026-11-21T23:23:00Z', confirmed: true, creatorDetailsSaved: false, waitlistJoined: false };
it('sends identified signup updates only to admin@dttmediallc.com', () => {
  const notice = signupProgressNotice(account, 'confirmed');
  expect(notice?.recipient).toBe('admin@dttmediallc.com');
  expect(notice?.templateData.email).toBe('member@example.test');
});
it('never reports successful email confirmation without server confirmation', () => {
  expect(signupProgressNotice({ ...account, confirmed: false }, 'confirmed')).toBeNull();
});
it('never reports successful waitlist joining without a saved membership', () => {
  expect(signupProgressNotice(account, 'waitlist_joined')).toBeNull();
  expect(signupProgressNotice({ ...account, waitlistJoined: true }, 'waitlist_joined')?.templateData.status).toBe('Customer joined the waiting list successfully');
});
it('requires creator role and saved details for creator setup success', () => {
  expect(signupProgressNotice({ ...account, creatorDetailsSaved: true }, 'setup_saved')).toBeNull();
  expect(signupProgressNotice({ ...account, accountType: 'creator', creatorDetailsSaved: true }, 'setup_saved')?.templateData.status).toBe('Creator category and content labels saved successfully');
});
it('labels browser problems as unverified and deduplicates each account step', () => {
  const notice = signupProgressNotice(account, 'issue', 'waitlist_join');
  expect(notice?.templateData.next).toContain('not a verified diagnosis');
  expect(notice?.idempotencyKey).toBe('signup-progress-member-1-issue-waitlist_join');
  expect(signupProgressNotice(account, 'issue')).toBeNull();
});
it('does not announce old accounts as new signups', () => {
  expect(signupProgressNotice({ ...account, createdAt: '2026-11-20T00:00:00Z' }, 'confirmed')).toBeNull();
});
it('clearly labels temporary test accounts instead of presenting them as real signups', () => {
  expect(signupProgressNotice({ ...account, email: 'agent-test+fixture@example.com' }, 'confirmed')?.templateData.status).toBe('TEST — Email confirmed successfully');
});