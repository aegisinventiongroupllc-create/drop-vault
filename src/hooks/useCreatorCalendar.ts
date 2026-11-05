import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { CalendarKind, RequestCalendarSource } from '@/lib/creatorCalendar';

export type CalendarItem = Tables<'creator_calendar_items'>;
export type CalendarDraft = { title: string; notes: string; kind: CalendarKind; scheduled_at: string; remind_at: string | null };
export function useCreatorCalendar(userId: string, start: string, end: string) {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [requests, setRequests] = useState<RequestCalendarSource[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const taskRows: CalendarItem[] = [];
    const requestRows: RequestCalendarSource[] = [];
    try {
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await supabase.from('creator_calendar_items').select('*').eq('creator_id', userId)
          .or(`and(scheduled_at.gte.${start},scheduled_at.lt.${end}),and(completed_at.is.null,remind_at.lte.${new Date().toISOString()})`)
          .order('scheduled_at').order('id').range(offset, offset + 99);
        if (error) throw error;
        taskRows.push(...data);
        if (data.length < 100) break;
      }
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await supabase.from('custom_requests')
          .select('id,status,description,created_at,calendar_agreed_at,fulfillment_deadline').eq('creator_id', userId)
          .in('status', ['accepted', 'paid']).is('creator_archived_at', null)
          .order('created_at').order('id').range(offset, offset + 99);
        if (error) throw error;
        requestRows.push(...data);
        if (data.length < 100) break;
      }
      setItems(taskRows); setRequests(requestRows); setError('');
    } catch { setError('Calendar unavailable. Please try again.'); }
    finally { setLoading(false); }
  }, [userId, start, end]);
  useEffect(() => {
    setItems([]); setRequests([]); void refresh();
    const onFocus = () => void refresh();
    let pending: number | undefined;
    const onRequestChange = () => {
      window.clearTimeout(pending);
      pending = window.setTimeout(() => void refresh(), 300);
    };
    const channel = supabase.channel(`creator-calendar-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_requests', filter: `creator_id=eq.${userId}` }, onRequestChange)
      .subscribe();
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(onFocus, 60000);
    return () => {
      window.removeEventListener('focus', onFocus); window.clearInterval(interval);
      window.clearTimeout(pending); void supabase.removeChannel(channel);
    };
  }, [refresh, userId]);
  const save = async (draft: CalendarDraft, id?: string) => {
    const result = id
      ? await supabase.from('creator_calendar_items').update(draft).eq('id', id).eq('creator_id', userId)
      : await supabase.from('creator_calendar_items').insert({ ...draft, creator_id: userId });
    if (result.error) throw result.error;
    await refresh();
  };
  const complete = async (item: CalendarItem) => {
    const { error } = await supabase.from('creator_calendar_items').update({ completed_at: item.completed_at ? null : new Date().toISOString() }).eq('id', item.id).eq('creator_id', userId);
    if (error) throw error;
    await refresh();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from('creator_calendar_items').delete().eq('id', id).eq('creator_id', userId);
    if (error) throw error;
    await refresh();
  };
  return { items, requests, loading, error, refresh, save, complete, remove };
}