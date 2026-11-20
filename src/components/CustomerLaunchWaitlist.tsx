import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/components/GlobalPassport";
import { isBlockedCountry } from "@/lib/restrictedCountries";
import CreatorLaunchCountdown from "./CreatorLaunchCountdown";
import DttFutureAnnouncement from "./DttFutureAnnouncement";
import LegalFooter from "./LegalFooter";
import { getTargetLang } from "./AutoTranslator";
import { CREATOR_SIGNUP_URL } from "@/lib/foundingInvitation";
import { customerWaitlistTicket, ticketDownloadText, type CustomerWaitlistTicket } from "@/lib/customerWaitlistTicket";
import galaxy from "@/assets/dtt-pink-galaxy-share.jpg.asset.json";

export default function CustomerLaunchWaitlist() {
  const [country, setCountry] = useState("");
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState<CustomerWaitlistTicket | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([supabase.rpc("my_customer_launch_waitlist", { _action: "status" }), supabase.auth.getUser()]).then(([{ data, error }, { data: auth }]) => {
      if (!active) return;
      if (error) setError("Your waiting-list status could not be loaded. Please retry.");
      else if (data && typeof data === "object" && !Array.isArray(data) && typeof data.country === "string") {
        setCountry(data.country); setJoined(true);
        setTicket(customerWaitlistTicket({ ...data, user_id: auth.user?.id }));
      }
      setBusy(false);
    });
    return () => { active = false; };
  }, []);
  const join = async () => {
    setBusy(true); setError("");
    try {
      const { data, error } = await supabase.rpc("my_customer_launch_waitlist", { _action: "join", _country: country, _language: getTargetLang() });
      if (error) throw error;
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const saved = customerWaitlistTicket(data && typeof data === "object" && !Array.isArray(data) ? { ...data, user_id: auth.user?.id } : null);
      if (!saved) throw new Error("Ticket receipt unavailable");
      setTicket(saved);
      setJoined(true);
    } catch { setError("Your spot was not saved. Please check your country and try again."); }
    finally { setBusy(false); }
  };
  const downloadTicket = () => {
    if (!ticket) return;
    const url = URL.createObjectURL(new Blob([ticketDownloadText(ticket)], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "DTT-founding-customer-ticket.txt"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  return <main className="dtt-customer-waitlist relative isolate min-h-[100dvh] bg-background text-foreground">
    <img src={galaxy.url} alt="" className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-background/60" />
    <div className="mx-auto max-w-md px-5 pb-10 pt-20 text-center">
      <h1 className="font-display text-2xl font-bold text-primary">DTT™ CUSTOMER WAITING LIST</h1>
      <p className="mt-3 text-sm text-muted-foreground">For fans waiting to watch creators. You’re signed in to a customer account.</p>
      <div className="mt-5 border-y border-border py-5">
        <h2 className="text-lg font-semibold">Here to become a creator?</h2>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">Creator setup is open now and free. Sign out here, then create or sign in to your creator account. The $10 yearly offer below is for customers, not creator signup.</p>
        <Button variant="outline" disabled={busy} onClick={() => void startCreatorSignup()} className="h-auto min-h-12 w-full whitespace-normal">SIGN OUT & START CREATOR SIGNUP</Button>
      </div>
      <CreatorLaunchCountdown audience="customer" />
      <p className="mb-5 text-sm">Be here before the spotlight hits. Join free before launch for $10 yearly entry for life instead of $20 to DTT’s global twerking feed when customer viewing opens. Nothing is charged today. Paid creator libraries require separate Bit-Tokens.</p>
      {joined && <p role="status" className="mb-5 text-sm font-semibold text-gold">Congratulations, founding customer! Your entry rate is $10 a year for life—not the standard $20. Your early-supporter rate is saved to this account; each paid pass lasts 365 days.</p>}
      {ticket && <article aria-label="DTT founding customer ticket" className="dtt-waitlist-ticket mb-6 overflow-hidden text-left">
        <div className="border-b border-dashed border-primary/50 px-5 py-4">
          <p className="font-display text-lg font-bold text-primary notranslate" translate="no">DTT™</p>
          <h2 className="mt-2 text-xl font-semibold">Founding customer ticket</h2>
          <p className="mt-2 text-3xl font-semibold text-gold">$10 <span className="text-base text-foreground">/ year for life</span></p>
          <p className="mt-2 text-xs text-muted-foreground">Annual entry · 365 days per paid pass · Saved to your account</p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p translate="no" className="notranslate break-all font-mono text-xs">{ticket.number}</p>
          <p className="text-xs text-muted-foreground">Joined {new Date(ticket.joinedAt).toLocaleDateString()} · {COUNTRIES.find(c => c.code === ticket.country)?.name ?? ticket.country}</p>
          <p className="text-sm">You believed in DTT before launch. Your lifetime yearly rate is saved.</p>
          <p className="text-xs text-muted-foreground">Not an invoice or access pass. No payment due today. Payment invitations are not active yet; they must wait until DTT has approved payments ready.</p>
          <Button variant="outline" className="w-full" onClick={downloadTicket}>SAVE MY DTT TICKET</Button>
        </div>
      </article>}
      <label htmlFor="waitlist-country" className="mb-2 block text-left text-sm">Your country</label>
      <select id="waitlist-country" value={country} onChange={e => setCountry(e.target.value)} className="h-12 w-full rounded-lg border border-border bg-background px-3 text-foreground">
        <option value="">Select your country</option>
        {COUNTRIES.filter(c => c.code !== "GLOBAL" && !isBlockedCountry(c.code)).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
      </select>
      <p className="my-3 text-left text-xs text-muted-foreground">DTT administrators can see your account email, chosen country, language and joining date. We do not collect your street address.</p>
      {error && <p role="alert" className="my-3 text-sm text-destructive">{error}</p>}
      <Button variant="neon" disabled={busy || !country} onClick={() => void join()} className="w-full">{busy ? "PLEASE WAIT…" : joined ? "UPDATE MY COUNTRY" : "JOIN FREE & GET MY DTT TICKET"}</Button>
      <div className="mt-6"><DttFutureAnnouncement /></div>
      <Button variant="ghost" className="mt-4" onClick={() => void supabase.auth.signOut()}>SIGN OUT</Button>
    </div>
    <LegalFooter />
  </main>;
}