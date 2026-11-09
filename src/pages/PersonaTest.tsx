import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PersonaVerification from "@/components/PersonaVerification";
import { Button } from "@/components/ui/button";

export default function PersonaTest() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => { if (active) setSignedIn(!!data.session); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return <main className="min-h-screen bg-background text-foreground px-5 py-24"><div className="mx-auto max-w-xl space-y-5">
    <h1 className="text-2xl font-bold">DTT Age Verification</h1>
    {signedIn === null ? <p>Checking sign-in…</p> : signedIn ? <PersonaVerification /> : <><p className="text-muted-foreground">Sign in with your creator or DTT administrator account to try Persona.</p><Button asChild variant="neon"><Link to="/">SIGN IN</Link></Button></>}
    <Button asChild variant="outline"><Link to="/">BACK TO DTT</Link></Button>
  </div></main>;
}