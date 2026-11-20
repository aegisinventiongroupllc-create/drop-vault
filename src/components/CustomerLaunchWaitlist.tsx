import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/components/GlobalPassport";
import { isBlockedCountry } from "@/lib/restrictedCountries";
import CreatorLaunchCountdown from "./CreatorLaunchCountdown";
import LegalFooter from "./LegalFooter";
import { getTargetLang } from "./AutoTranslator";
import { CREATOR_SIGNUP_URL } from "@/lib/foundingInvitation";

export default function CustomerLaunchWaitlist() {
  const [country, setCountry] = useState("");
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void supabase.rpc("my_customer_launch_waitlist", { _action: "status" }).then(({ data, error }) => {
      if (!active) return;
      if (error) setError("Your waiting-list status could not be loaded. Please retry.");
      else if (data && typeof data === "object" && !Array.isArray(data) && typeof data.country === "string") { setCountry(data.country); setJoined(true); }
      setBusy(false);
    });
    return () => { active = false; };
  }, []);
  const join = async () => {
    setBusy(true); setError("");
    try {
      const { error } = await supabase.rpc("my_customer_launch_waitlist", { _action: "join", _country: country, _language: getTargetLang() });
      if (error) throw error;
      setJoined(true);
    } catch { setError("Your spot was not saved. Please check your country and try again."); }
    finally { setBusy(false); }
  };
  const startCreatorSignup = async () => {
    setBusy(true); setError("");
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError("You could not be signed out. Please try again to start creator signup.");
      setBusy(false);
      return;
    }
    window.location.assign(CREATOR_SIGNUP_URL);
  };
  return <main className="min-h-[100dvh] bg-background text-foreground">
    <div className="mx-auto max-w-md px-5 pb-10 pt-14 text-center">
      <h1 className="font-display text-2xl font-bold text-primary">DTT™ CUSTOMER WAITING LIST</h1>
      <p className="mt-3 text-sm text-muted-foreground">For fans waiting to watch creators. You’re signed in to a customer account.</p>
      <div className="mt-5 border-y border-border py-5">
        <h2 className="text-lg font-semibold">Here to become a creator?</h2>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">Creator setup is open now and free. Sign out here, then create or sign in to your creator account. The $10 yearly offer below is for customers, not creator signup.</p>
        <Button variant="outline" disabled={busy} onClick={() => void startCreatorSignup()} className="h-auto min-h-12 w-full whitespace-normal">SIGN OUT & START CREATOR SIGNUP</Button>
      </div>
      <CreatorLaunchCountdown audience="customer" />
      <p className="mb-5 text-sm text-muted-foreground">Customer viewing opens after launch and payment readiness are confirmed. Join free before launch to lock in $10 yearly entry for life instead of the standard $20. Nothing is charged today. Watching a creator’s paid library requires separate Bit-Tokens.</p>
      {joined && <p role="status" className="mb-5 text-sm font-semibold text-gold">Congratulations, founding customer! Your entry rate is $10 a year for life—not the standard $20. Your early-supporter rate is saved to this account; each paid pass lasts 365 days.</p>}
      <label htmlFor="waitlist-country" className="mb-2 block text-left text-sm">Your country</label>
      <select id="waitlist-country" value={country} onChange={e => setCountry(e.target.value)} className="h-12 w-full rounded-lg border border-border bg-background px-3 text-foreground">
        <option value="">Select your country</option>
        {COUNTRIES.filter(c => c.code !== "GLOBAL" && !isBlockedCountry(c.code)).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
      </select>
      <p className="my-3 text-left text-xs text-muted-foreground">DTT administrators can see your account email, chosen country, language and joining date. We do not collect your street address.</p>
      {error && <p role="alert" className="my-3 text-sm text-destructive">{error}</p>}
      <Button variant="neon" disabled={busy || !country} onClick={() => void join()} className="w-full">{busy ? "PLEASE WAIT…" : joined ? "UPDATE MY COUNTRY" : "JOIN FREE WAITING LIST"}</Button>
      <Button variant="ghost" className="mt-4" onClick={() => void supabase.auth.signOut()}>SIGN OUT</Button>
    </div>
    <LegalFooter />
  </main>;
}