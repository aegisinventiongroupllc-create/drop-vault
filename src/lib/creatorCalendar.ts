export const DELIVERY_WINDOW_HOURS = 48;
export type CalendarKind = 'request_plan' | 'video' | 'teaser' | 'reminder';
export type RequestCalendarSource = {
  id: string; status: string; description: string; created_at: string;
  calendar_agreed_at: string | null; fulfillment_deadline: string | null;
};
export function requestCalendarEvent(request: RequestCalendarSource) {
  if (request.status === 'accepted') return {
    id: request.id, title: request.description, at: request.calendar_agreed_at || request.created_at,
    label: 'Agreed — awaiting payment', type: 'agreement' as const,
  };
  if (request.status === 'paid' && request.fulfillment_deadline) return {
    id: request.id, title: request.description, at: request.fulfillment_deadline,
    label: 'Paid delivery deadline', type: 'delivery' as const,
  };
  return null;
}
export function reminderIsDue(remindAt: string | null, completedAt: string | null, now: number) {
  return !completedAt && !!remindAt && Date.parse(remindAt) <= now;
}