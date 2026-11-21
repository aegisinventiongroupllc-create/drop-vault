import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';

export default function CustomerPaymentInvitation() {
  const [invited, setInvited] = useState(false);
  useEffect(() => {
    let active = true;
    void supabase.rpc('my_customer_waitlist_invitation').then(({ data, error }) => {
      if (active && !error && data && typeof data === 'object' && !Array.isArray(data)) setInvited(data.invited === true);
    });
    return () => { active = false; };
  }, []);
  if (!invited) return null;
  return <section aria-label="Your DTT payment invitation" className="border-y border-primary/40 px-4 py-5 text-left">
    <h2 className="font-semibold text-primary">Your founding entry is ready.</h2>
    <p className="my-2 text-sm text-foreground">Your saved $10 yearly rate for life is waiting. 365 days per paid pass; creator libraries use separate Bit-Tokens.</p>
    <Button variant="neon" asChild><a href="/entry-pass-preview">PAY NOW · $10 ANNUAL ENTRY</a></Button>
    <p className="mt-2 text-xs text-muted-foreground">No automatic charge. Access starts after verified payment.</p>
  </section>;
}