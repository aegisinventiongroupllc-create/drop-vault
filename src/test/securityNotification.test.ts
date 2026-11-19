// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { recordAndNotifyDenial, securityAlertOptions } from '../../supabase/functions/_shared/securityNotification';

const event = { id: 'event-1', created_at: '2026-11-19T02:01:00.000Z' };
describe('private security email notifications', () => {
  it('sends only to the owner-confirmed address after recording the denial', async () => {
    const calls: string[] = [];
    const record = vi.fn(async () => { calls.push('record'); return event; });
    const send = vi.fn(async () => { calls.push('send'); return { sent: true }; });
    await recordAndNotifyDenial('admin_code_rejected', 'admin-auth', null, { record, send, report: vi.fn() });
    expect(calls).toEqual(['record', 'send']);
    expect(send).toHaveBeenCalledWith('security-access-denied', 'Admin@dttmediallc.com', securityAlertOptions('admin_code_rejected', event));
  });
  it('never emails actor identity or request credentials', async () => {
    const send = vi.fn(async () => ({ sent: true }));
    await recordAndNotifyDenial('identity_access_denied', 'admin-verifications', 'private-actor', { record: vi.fn(async () => event), send, report: vi.fn() });
    expect(send.mock.calls[0]).toEqual(['security-access-denied', 'Admin@dttmediallc.com', { templateData: { eventType: 'identity_access_denied', occurredAt: event.created_at, eventId: event.id }, idempotencyKey: securityAlertOptions('identity_access_denied', event).idempotencyKey }]);
  });
  it('deduplicates same-kind events across workers in a 15-minute window', () => {
    const first = securityAlertOptions('admin_code_rejected', event);
    const second = securityAlertOptions('admin_code_rejected', { id: 'event-2', created_at: '2026-11-19T02:14:59.999Z' });
    const next = securityAlertOptions('admin_code_rejected', { id: 'event-3', created_at: '2026-11-19T02:15:00.000Z' });
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(next.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(securityAlertOptions('identity_access_denied', event).idempotencyKey).not.toBe(first.idempotencyKey);
  });
  it('does not send when recording fails and never changes the denied outcome', async () => {
    const send = vi.fn();
    const report = vi.fn();
    await expect(recordAndNotifyDenial('admin_code_rejected', 'admin-auth', null, { record: vi.fn(async () => { throw new Error('private failure'); }), send, report })).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
    expect(report).toHaveBeenCalledWith('Security denial recording unavailable');
  });
  it('keeps the denial when email fails and reports no secret error details', async () => {
    const record = vi.fn(async () => event);
    const report = vi.fn();
    await expect(recordAndNotifyDenial('admin_code_rejected', 'admin-auth', null, { record, send: vi.fn(async () => { throw new Error('secret'); }), report })).resolves.toBeUndefined();
    expect(record).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith('Security alert email unavailable');
  });
  it('respects email suppression without bypass or retry', async () => {
    const send = vi.fn(async () => ({ sent: false }));
    const report = vi.fn();
    await recordAndNotifyDenial('admin_code_rejected', 'admin-auth', null, { record: vi.fn(async () => event), send, report });
    expect(send).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith('Security alert recipient suppressed');
  });
});