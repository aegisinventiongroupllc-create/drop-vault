import { describe, it, expect } from 'vitest';
import { DELIVERY_WINDOW_HOURS, requestCalendarEvent, reminderIsDue } from '@/lib/creatorCalendar';
const request = { id: 'request', description: 'Video', status: 'accepted', created_at: '2026-11-01T12:00:00Z', calendar_agreed_at: '2026-11-03T12:00:00Z', fulfillment_deadline: null };
describe('Creator calendar rules', () => {
  it('shows agreement immediately without manufacturing a paid deadline', () => {
    expect(requestCalendarEvent(request)).toMatchObject({ at: '2026-11-03T12:00:00Z', type: 'agreement', label: 'Agreed — awaiting payment' });
  });
  it('uses the server paid deadline, not the planned task date or agreement', () => {
    expect(requestCalendarEvent({ ...request, status: 'paid', fulfillment_deadline: '2026-11-05T12:00:00Z' })).toMatchObject({ at: '2026-11-05T12:00:00Z', type: 'delivery' });
  });
  it('requires a 48-hour delivery window', () => { expect(DELIVERY_WINDOW_HOURS).toBe(48); });
  it('does not fabricate deadlines for unpaid or completed requests', () => {
    expect(requestCalendarEvent({ ...request, status: 'pending' })).toBeNull();
    expect(requestCalendarEvent({ ...request, status: 'completed' })).toBeNull();
    expect(requestCalendarEvent({ ...request, status: 'paid' })).toBeNull();
  });
  it('marks reminders due at the chosen time and suppresses completed items', () => {
    const now = Date.parse('2026-11-03T12:00:00Z');
    expect(reminderIsDue('2026-11-03T12:00:00Z', null, now)).toBe(true);
    expect(reminderIsDue('2026-11-03T12:01:00Z', null, now)).toBe(false);
    expect(reminderIsDue('2026-11-03T12:00:00Z', '2026-11-03T11:00:00Z', now)).toBe(false);
  });
});