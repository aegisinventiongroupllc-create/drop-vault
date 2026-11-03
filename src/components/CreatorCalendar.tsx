import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, addDays, isSameDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatorCalendar, type CalendarItem } from '@/hooks/useCreatorCalendar';
import { reminderIsDue, requestCalendarEvent, type CalendarKind } from '@/lib/creatorCalendar';
import { toast } from 'sonner';

const kinds: Record<CalendarKind, string> = { request_plan: 'Request plan', video: 'Video upload plan', teaser: 'Teaser upload plan', reminder: 'Reminder' };
const localInput = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");

export default function CreatorCalendar({ userId, onRequests, onMedia }: { userId: string; onRequests: () => void; onMedia: () => void }) {
  const [day, setDay] = useState(new Date());
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const start = startOfMonth(month).toISOString();
  const end = addDays(endOfMonth(month), 1); end.setHours(0, 0, 0, 0);
  const calendar = useCreatorCalendar(userId, start, end.toISOString());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarItem | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [kind, setKind] = useState<CalendarKind>('reminder');
  const [scheduled, setScheduled] = useState('');
  const [remind, setRemind] = useState('');
  const [busy, setBusy] = useState(false);
  const events = useMemo(() => calendar.requests.flatMap(request => {
    const event = requestCalendarEvent(request); return event ? [event] : [];
  }), [calendar.requests]);
  const dayItems = calendar.items.filter(item => isSameDay(new Date(item.scheduled_at), day));
  const dayEvents = events.filter(event => isSameDay(new Date(event.at), day));
  const due = calendar.items.filter(item => reminderIsDue(item.remind_at, item.completed_at, Date.now()));
  const paid = events.filter(event => event.type === 'delivery');
  const agreed = events.filter(event => event.type === 'agreement');
  const openEditor = (item?: CalendarItem) => {
    setEditing(item || null); setTitle(item?.title || ''); setNotes(item?.notes || '');
    setKind((item?.kind as CalendarKind) || 'reminder');
    const initial = new Date(day); initial.setHours(10, 0, 0, 0);
    setScheduled(localInput(item ? new Date(item.scheduled_at) : initial));
    setRemind(item?.remind_at ? localInput(new Date(item.remind_at)) : ''); setOpen(true);
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } catch { toast.error('Could not save calendar changes. Please try again.'); }
    finally { setBusy(false); }
  };
  const itemRow = (item: CalendarItem) => <li key={item.id} className="border-b border-border py-3 flex flex-wrap items-center gap-2">
    <div className="min-w-0 flex-1"><p translate="no" className={`break-words text-sm font-medium ${item.completed_at ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item.title}</p>
      <p className="text-xs text-muted-foreground">{kinds[item.kind as CalendarKind]} · <span translate="no">{format(new Date(item.scheduled_at), 'p')}</span></p>
      {item.notes && <p translate="no" className="text-xs text-muted-foreground break-words mt-1 whitespace-pre-wrap">{item.notes}</p>}
    </div>
    <Button size="sm" variant="outline" disabled={busy} onClick={() => openEditor(item)}>Edit</Button>
    <Button size="sm" variant={item.completed_at ? 'ghost' : 'secondary'} disabled={busy} onClick={() => void run(() => calendar.complete(item))}>{item.completed_at ? 'Reopen' : 'Complete'}</Button>
  </li>;
  return <section className="px-4 pb-6 space-y-5" aria-label="Creator calendar">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-foreground">Creator calendar</h2><p translate="no" className="text-xs text-muted-foreground">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p></div><Button onClick={() => openEditor()}>Add item</Button></header>
    {calendar.error && <div role="alert" className="text-destructive text-sm">{calendar.error} <Button variant="outline" onClick={() => void calendar.refresh()}>Retry</Button></div>}
    <div className="grid gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
      <div className="min-w-0"><Calendar mode="single" selected={day} onSelect={value => value && setDay(value)} month={month} onMonthChange={setMonth} modifiers={{ scheduled: [...calendar.items.map(item => new Date(item.scheduled_at)), ...events.map(event => new Date(event.at))] }} modifiersClassNames={{ scheduled: 'underline decoration-primary decoration-2 underline-offset-4' }} />
        <Button variant="ghost" onClick={() => { setDay(new Date()); setMonth(startOfMonth(new Date())); }}>Today</Button>
      </div>
      <div className="min-w-0"><h3 translate="no" className="font-semibold text-foreground border-b border-border pb-3">{format(day, 'EEEE, MMMM d')}</h3>
        {calendar.loading && <p role="status" className="text-sm text-muted-foreground py-3">Loading calendar…</p>}
        {!calendar.loading && !dayItems.length && !dayEvents.length && <p className="text-sm text-muted-foreground py-5">No items scheduled for this day.</p>}
        <ul>{dayItems.sort((a,b) => a.scheduled_at.localeCompare(b.scheduled_at)).map(itemRow)}</ul>
        {dayEvents.map(event => <div key={event.id} className="border-b border-border py-3"><p className="text-xs font-semibold text-gold">{event.label}</p><p translate="no" className="text-sm break-words">{event.title}</p><Button variant="link" onClick={onRequests}>Open request</Button></div>)}
        <Button variant="link" onClick={onMedia}>Open media uploads</Button>
      </div>
    </div>
    <section className="border-t border-border pt-4"><h3 className="font-semibold text-foreground">Reminders due</h3><ul>{due.map(itemRow)}</ul>{!due.length && <p className="text-sm text-muted-foreground mt-2">No reminders due.</p>}</section>
    <section className="border-t border-gold/30 pt-4"><h3 className="font-semibold text-gold">Request deadlines & payment status</h3>
      <p className="text-xs text-muted-foreground mt-1">Delivery is due 48 hours after verified payment. Planned tasks do not change payment or delivery deadlines.</p>
      {[...paid, ...agreed].map(event => <div key={event.id} className="border-b border-border py-3 flex flex-wrap items-center gap-2"><div className="flex-1 min-w-0"><p translate="no" className="text-sm break-words">{event.title}</p><p className={`text-xs ${event.type === 'delivery' && Date.parse(event.at) < Date.now() ? 'text-destructive' : 'text-gold'}`}>{event.label}{event.type === 'delivery' && <> · <span translate="no">{format(new Date(event.at), 'PPp')}</span>{Date.parse(event.at) < Date.now() && ' · Overdue'}</>}</p></div><Button variant="outline" size="sm" onClick={onRequests}>Open request</Button></div>)}
      {!events.length && <p className="text-sm text-muted-foreground mt-2">No agreed requests or active delivery deadlines.</p>}
    </section>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto w-[calc(100%-2rem)]" aria-describedby={undefined}>
      <DialogHeader><DialogTitle>{editing ? 'Edit calendar item' : 'Add calendar item'}</DialogTitle></DialogHeader>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void run(async () => { await calendar.save({ title: title.trim(), notes, kind, scheduled_at: new Date(scheduled).toISOString(), remind_at: remind ? new Date(remind).toISOString() : null }, editing?.id); setOpen(false); }); }}>
        <label className="block text-sm">Title<Input required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label className="block text-sm">Item type<Select value={kind} onValueChange={value => setKind(value as CalendarKind)}><SelectTrigger aria-label="Item type"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(kinds).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent></Select></label>
        <label className="block text-sm">Scheduled for<Input required type="datetime-local" value={scheduled} onChange={event => setScheduled(event.target.value)} /></label>
        <label className="block text-sm">Remind me at<Input type="datetime-local" value={remind} onChange={event => setRemind(event.target.value)} /></label>
        <label className="block text-sm">Notes<Textarea maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} /></label>
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy || !title.trim()}>Save item</Button><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>{editing && <Button type="button" variant="destructive" disabled={busy} onClick={() => { if (window.confirm('Delete this planned item?')) void run(async () => { await calendar.remove(editing.id); setOpen(false); }); }}>Delete item</Button>}</div>
      </form>
    </DialogContent></Dialog>
  </section>;
}