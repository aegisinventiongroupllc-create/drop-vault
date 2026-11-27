import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/components/GlobalPassport";
import { isBlockedCountry } from "@/lib/restrictedCountries";
import CreatorLaunchCountdown from "./CreatorLaunchCountdown";
import DttFutureAnnouncement from "./DttFutureAnnouncement";
import LegalFooter from "./LegalFooter";
import { getTargetLang } from "./AutoTranslator";
import { CREATOR_SIGNUP_URL } from "@/lib/foundingInvitation";
import { customerWaitlistTicket, type CustomerWaitlistTicket } from "@/lib/customerWaitlistTicket";
import { createCustomerTicketImage, saveCustomerTicketImage } from "@/lib/customerTicketImage";
import GalaxyReel from "./GalaxyReel";
import { ENTRY_GLOBE } from "./EntryPassGlobe";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { shouldCelebrateWaitlistJoin } from "@/lib/waitlistCelebration";
import { savedCreator } from "@/lib/creatorSharing";
import CreatorShareActions from "./CreatorShareActions";
import LockScreenWallpaper from "./LockScreenWallpaper";
import { reportSignupProgress } from '@/lib/signupProgress';

export default function CustomerLaunchWaitlist() {
  const [country, setCountry] = useState("");
  const [creatorLink] = useState(savedCreator);
  const [joined, setJoined] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [statusAttempt, setStatusAttempt] = useState(0);
  const ticketRef = useRef<HTMLElement>(null);
  const [ticket, setTicket] = useState<CustomerWaitlistTicket | null>(null);
  const [ticketImage, setTicketImage] = useState<Blob | null>(null);
  const [ticketImageError, setTicketImageError] = useState(false);
  const [ticketImageAttempt, setTicketImageAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setTicketImage(null); setTicketImageError(false);
    if (ticket) void createCustomerTicketImage(ticket, COUNTRIES.find(c => c.code === ticket.country)?.name ?? ticket.country)
      .then(blob => { if (active) setTicketImage(blob); })
      .catch(() => { if (active) setTicketImageError(true); });
    return () => { active = false; };
  }, [ticket, ticketImageAttempt]);
  useEffect(() => {
    let active = true;
    setBusy(true); setStatusError(false); setError("");
    void Promise.all([supabase.rpc("my_customer_launch_waitlist", { _action: "status" }), supabase.auth.getUser()]).then(([{ data, error }, { data: auth }]) => {
      if (!active) return;
      if (error) { void reportSignupProgress('issue', 'waitlist_status'); setStatusError(true); setError("Your waiting-list status could not be loaded. Please retry."); }
      else if (data && typeof data === "object" && !Array.isArray(data) && typeof data.country === "string") {
        setCountry(data.country); setJoined(true);
        setTicket(customerWaitlistTicket({ ...data, user_id: auth.user?.id }));
        void reportSignupProgress('waitlist_joined');
      }
      setBusy(false);
    }).catch(() => {
      if (active) { void reportSignupProgress('issue', 'waitlist_status'); setStatusError(true); setError("Your waiting-list status could not be loaded. Please retry."); setBusy(false); }
    });
    return () => { active = false; };
  }, [statusAttempt]);
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
      setCountry(saved.country);
      setCelebrate(shouldCelebrateWaitlistJoin(joined, true));
      setJoined(true);
      void reportSignupProgress('waitlist_joined');
    } catch { void reportSignupProgress('issue', 'waitlist_join'); setError("Your spot was not saved. Please check your country and try again."); }
    finally { setBusy(false); }
  };
  const downloadTicket = () => {
    if (!ticketImage) return;
    void saveCustomerTicketImage(ticketImage).catch(() => { void reportSignupProgress('issue', 'ticket_save'); setError("Your ticket could not be saved. Please try again."); });
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
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20"><GalaxyReel scope="brb" seconds={300} styleOverride="cluster" toneOverride={ENTRY_GLOBE.tone} /></div>
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-background/50" />
    <div className="mx-auto max-w-md px-5 pb-10 pt-16 text-center">
      <p className="text-xs font-semibold text-primary">DROP THAT THING™</p>
      <h1 className="mt-3 text-2xl font-semibold text-foreground">{joined ? "You’re on the list." : "Your front-row start."}</h1>
      <p className="mt-2 text-sm text-foreground/80">DTT customer waiting list · Free to join</p>
      {creatorLink && <section aria-label="Saved creator link" className="my-6 border-y border-primary/40 py-5">
        <h2 className="break-words text-lg font-semibold notranslate" translate="no">@{creatorLink}</h2>
        <p className="mb-4 mt-2 text-xs text-foreground/80">This creator’s link is remembered on this device. Join the free waiting list below and save their link for later. Discovery opens at launch; library access requires separate Bit-Tokens.</p>
        <CreatorShareActions creatorName={creatorLink} />
      </section>}
      <CreatorLaunchCountdown audience="customer" />
      <div className="mb-6"><LockScreenWallpaper /></div>
      {!joined && <div className="mb-6 space-y-2"><p className="text-3xl font-semibold text-foreground">$10 <span className="text-base">/ year for life</span></p><p className="text-sm text-foreground/80">Join before launch for half the standard $20 yearly entry to the global twerking feed.</p><p className="text-xs text-foreground/70">365 days per paid pass. Nothing due today. Creator libraries use separate Bit-Tokens.</p></div>}
      {ticket && <article ref={ticketRef} tabIndex={-1} aria-label="DTT founding customer ticket" className="dtt-waitlist-ticket mb-6 overflow-hidden text-left">
        <div className="border-b border-dashed border-primary/50 px-5 py-4">
          <p className="font-display text-lg font-bold text-primary notranslate" translate="no">DTT™</p>
          <h2 className="mt-2 text-lg font-semibold">Your DTT ticket</h2>
          <p className="mt-2 text-3xl font-semibold text-gold">$10 <span className="text-base text-foreground">/ year for life</span></p>
          <p className="mt-2 text-xs text-muted-foreground">Annual entry · 365 days per paid pass · Saved to your account</p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-xs text-muted-foreground">Your founding ticket number</p>
          <p translate="no" className="notranslate break-all font-mono text-xs">{ticket.number}</p>
          <p className="text-xs text-muted-foreground">Joined {new Date(ticket.joinedAt).toLocaleDateString()} · {COUNTRIES.find(c => c.code === ticket.country)?.name ?? ticket.country}</p>
          <div className="border-t border-primary/30 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Your founding perks</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-left text-xs text-foreground/90">
              <li>Global creators twerking — discover approved creators across DTT’s supported countries when viewing opens.</li>
              <li>$10 yearly entry for life — half the standard $20 rate, locked to this account forever.</li>
              <li>Your personal founding ticket number, saved to your account and downloadable as a keepsake.</li>
              <li>A launch payment invitation by email and inside DTT when checkout is ready.</li>
              <li>Your front-row start: activate annual feed entry after launch with a verified payment. Creator libraries use separate Bit-Tokens.</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">Waiting-list membership, not payment or access. Payments are being prepared for launch; nothing is due today.</p>
          {ticketImageError && <p role="alert" className="text-xs text-destructive">Your ticket artwork couldn’t load. Please retry.</p>}
          <Button variant="outline" className="w-full" disabled={!ticketImage && !ticketImageError} onClick={ticketImageError ? () => setTicketImageAttempt(n => n + 1) : downloadTicket}>{ticketImageError ? "RETRY TICKET" : ticketImage ? "SAVE MY DTT TICKET" : "PREPARING MY TICKET…"}</Button>
        </div>
      </article>}
      <label htmlFor="waitlist-country" className="mb-2 block text-left text-sm">{joined ? "Saved country" : "Your country"}</label>
      <select id="waitlist-country" value={country} onChange={e => setCountry(e.target.value)} className="h-12 w-full rounded-lg border border-border bg-background px-3 text-foreground">
        <option value="">Select your country</option>
        {COUNTRIES.filter(c => c.code !== "GLOBAL" && !isBlockedCountry(c.code)).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
      </select>
      <p className="my-3 text-left text-xs text-foreground/70">Your account, country, language and join date stay private to you and DTT administrators. No street address collected.</p>
      {error && <p role="alert" className="my-3 text-sm text-destructive">{error}</p>}
      {statusError ? <Button variant="outline" disabled={busy} onClick={() => setStatusAttempt(n => n + 1)} className="w-full">RETRY WAITING LIST</Button> : <Button variant={joined ? "outline" : "neon"} disabled={busy || !country || (joined && country === ticket?.country)} onClick={() => void join()} className="h-auto min-h-12 w-full whitespace-normal">{busy ? "PLEASE WAIT…" : joined ? "UPDATE MY COUNTRY" : "JOIN FREE & GET MY DTT TICKET"}</Button>}
      {joined && <p role="status" className="mt-3 text-xs text-foreground/80">{country === ticket?.country ? "Your ticket and $10 yearly rate are saved. We’ll invite you when launch payments open; nothing to pay now." : "Save your new country below your ticket. Your ticket number and yearly rate stay the same."}</p>}
      <section className="mt-8 border-t border-border py-5">
        <h2 className="text-base font-semibold">Joining as a creator?</h2>
        <p className="my-2 text-xs text-foreground/80">Free private creator setup is open now. Switch accounts to get started.</p>
        <Button variant="outline" disabled={busy} onClick={() => void startCreatorSignup()} className="h-auto min-h-11 w-full whitespace-normal">SIGN OUT & START CREATOR SIGNUP</Button>
      </section>
      <div className="mt-6"><DttFutureAnnouncement /></div>
      <Button variant="ghost" className="mt-4" onClick={() => void supabase.auth.signOut()}>SIGN OUT</Button>
    </div>
    <LegalFooter />
    <Dialog open={celebrate} onOpenChange={setCelebrate}><DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto border-primary/50" onCloseAutoFocus={event => { event.preventDefault(); ticketRef.current?.focus(); ticketRef.current?.scrollIntoView({ block: "start" }); }}>
      <DialogTitle className="text-xl">Welcome to the founding list!</DialogTitle>
      <DialogDescription>Your $10 yearly entry rate for life is saved to this account. Each paid pass lasts 365 days; no payment is due today.</DialogDescription>
      <ul className="list-disc space-y-1.5 pl-5 text-left text-sm text-foreground/90">
        <li>Global creators twerking — discover approved creators when viewing opens.</li>
        <li>Half-price entry for life — $10 instead of $20, every year.</li>
        <li>Your own founding ticket number, saved to your account.</li>
        <li>A launch payment invitation by email and inside DTT.</li>
        <li>Annual feed entry after launch and verified payment; creator libraries use separate Bit-Tokens.</li>
      </ul>
      <Button variant="neon" onClick={() => setCelebrate(false)}>VIEW MY DTT TICKET</Button>
    </DialogContent></Dialog>
  </main>;
}