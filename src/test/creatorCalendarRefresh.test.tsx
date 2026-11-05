import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  on: vi.fn(), subscribe: vi.fn(), remove: vi.fn(), query: vi.fn(),
  request: { id: 'paid-request', description: 'Agreed custom video', status: 'accepted', created_at: '2026-11-05T10:00:00Z', calendar_agreed_at: '2026-11-05T12:00:00Z', fulfillment_deadline: null as string | null },
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    const builder = {
      select: () => builder, eq: () => builder, or: () => builder,
      in: () => builder, is: () => builder, order: () => builder,
      range: async () => { mocks.query(table); return { data: table === 'custom_requests' ? [{ ...mocks.request }] : [], error: null }; },
    };
    return builder;
  },
  channel: () => ({ on: mocks.on }), removeChannel: mocks.remove,
} }));
import { useCreatorCalendar } from '@/hooks/useCreatorCalendar';
import { requestCalendarEvent } from '@/lib/creatorCalendar';

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
describe('automatic paid request calendar', () => {
  it('updates an agreed request to its verified-paid deadline without manually creating an item', async () => {
    let notify = () => {};
    const channel = { subscribe: mocks.subscribe };
    mocks.subscribe.mockReturnValue(channel);
    mocks.on.mockImplementation((_event, _filter, callback) => { notify = callback; return channel; });
    const { result, unmount } = renderHook(() => useCreatorCalendar('creator-owner', '2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(requestCalendarEvent(result.current.requests[0])?.type).toBe('agreement');
    expect(mocks.on.mock.calls[0][1].filter).toBe('creator_id=eq.creator-owner');
    vi.useFakeTimers();
    mocks.request.status = 'paid';
    mocks.request.fulfillment_deadline = '2026-11-07T12:00:00Z';
    await act(async () => { notify(); notify(); await vi.advanceTimersByTimeAsync(300); });
    expect(requestCalendarEvent(result.current.requests[0])).toMatchObject({ type: 'delivery', at: '2026-11-07T12:00:00Z' });
    expect(mocks.query.mock.calls.filter(([table]) => table === 'custom_requests')).toHaveLength(2);
    expect(result.current.items).toEqual([]);
    unmount();
    expect(mocks.remove).toHaveBeenCalledWith(channel);
  });
});