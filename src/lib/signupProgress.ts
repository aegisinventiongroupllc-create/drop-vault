import { supabase } from '@/integrations/supabase/client';
type Event = 'confirmed' | 'setup_saved' | 'waitlist_joined' | 'issue';
type Step = 'account_selection' | 'creator_details' | 'creator_agreement' | 'waitlist_status' | 'waitlist_join' | 'ticket_save';
/** Best effort; never blocks signup and never transmits raw errors or credentials. */
export async function reportSignupProgress(event: Event, step?: Step) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.functions.invoke('creator-signup-notification', { body: { event, ...(step ? { step } : {}) } });
  } catch { /* Notification failures cannot block setup. */ }
}