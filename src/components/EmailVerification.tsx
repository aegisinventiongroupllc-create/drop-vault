import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import EntryPassGlobe, { ENTRY_GLOBE } from "./EntryPassGlobe";
import GalaxyReel from "./GalaxyReel";
import LegalFooter from "./LegalFooter";

export const EMAIL_VERIFICATION_RETURN = "https://dropthatthing.com/verify-email?nointro=1";

/** Presentation only: email confirmation comes from the auth service, not the URL. */
export default function EmailVerification({ email, onBack }: { email?: string; onBack?: () => void }) {
  const [status, setStatus] = useState<"pending" | "checking" | "confirmed" | "expired">(email ? "pending" : "checking");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (email) return;
    let active = true;
    const check = async () => {
      try {
        // Wait for the client's normal email-link session handling to finish.
        await supabase.auth.getSession();
        const { data, error } = await supabase.auth.getUser();
        if (active) setStatus(!error && data.user?.email_confirmed_at ? "confirmed" : "expired");
      } catch {
        if (active) setStatus("expired");
      }
    };
    void check();
    return () => { active = false; };
  }, [email]);

  const resend = async () => {
    if (!email || sending || resent) return;
    setSending(true); setNotice("");
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: EMAIL_VERIFICATION_RETURN } });
      if (error) throw error;
      setResent(true);
      setNotice("A fresh confirmation link has been requested. Check your inbox and spam folder.");
    } catch {
      setNotice("We couldn’t resend your email just now. Please wait a moment and try again.");
    } finally { setSending(false); }
  };

  const back = () => {
    if (onBack) onBack();
    else window.location.assign("/index?nointro=1");
  };

  return <main className="dtt-auth-screen fixed inset-0 z-50 isolate overflow-y-auto bg-background text-foreground">
    <Helmet><title>Email confirmation | Drop That Thing™</title><meta name="description" content="Confirm your DTT account email and continue to Drop That Thing." /></Helmet>
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20"><GalaxyReel scope="brb" seconds={300} styleOverride="cluster" toneOverride={ENTRY_GLOBE.tone} /></div>
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-background/60" />
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between border-b border-primary/25 px-5 py-5">
        <span className="notranslate font-display text-sm font-bold text-primary" translate="no">DTT™</span>
        <span className="text-xs text-foreground/70">MEMBERS ONLY · 18+</span>
      </header>
      <section className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-6 py-8 text-center sm:justify-center sm:py-12" aria-label="DTT email confirmation">
        <EntryPassGlobe size={180} solid sharp bright />
        <p translate="no" className="notranslate mt-3 font-display text-lg font-bold">DROP THAT <span className="text-primary">THING™</span></p>
        <p className="mt-6 text-xs font-semibold uppercase text-primary">Your DTT account</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">{status === "pending" ? "Check your inbox." : status === "checking" ? "Confirming your email…" : status === "confirmed" ? "Email confirmed." : "Let’s get you back in."}</h1>
        <div className="mt-4 w-full max-w-sm text-sm leading-relaxed text-foreground/80" aria-live="polite">
          {status === "pending" && <><p>Open the DTT confirmation email and select the confirmation link to finish verifying your email.</p><p translate="no" className="notranslate mt-3 break-all font-medium text-foreground">{email}</p><p className="mt-3 text-xs">Can’t see it? Check your spam or junk folder.</p></>}
          {status === "checking" && <p>Checking your secure DTT confirmation link.</p>}
          {status === "confirmed" && <p>Your email is verified. Continue to your DTT account.</p>}
          {status === "expired" && <p>This link may have expired or already been used. Log in to continue, or request a fresh confirmation email.</p>}
        </div>
        <div className="mt-7 w-full border-y border-primary/30 py-5">
          <p className="text-base font-medium">This platform is your runway.</p>
          <p className="mt-2 text-xl font-semibold text-primary">So go DROP THAT THING.</p>
        </div>
        <div className="mt-6 w-full max-w-sm space-y-3">
          {status === "pending" && <Button variant="neon" className="h-auto min-h-12 w-full whitespace-normal" disabled={sending || resent} onClick={() => void resend()}>{sending ? "SENDING…" : resent ? "EMAIL REQUESTED" : "RESEND CONFIRMATION EMAIL"}</Button>}
          {status !== "checking" && <Button variant={status === "pending" ? "outline" : "neon"} className="min-h-12 w-full" onClick={back}>{status === "confirmed" ? "CONTINUE TO DTT" : "BACK TO LOG IN"}</Button>}
          {notice && <p role="status" className="text-sm leading-relaxed text-foreground/80">{notice}</p>}
        </div>
        <p className="mt-6 text-xs text-foreground/60">DTT Media LLC · Secure account confirmation</p>
      </section>
      <LegalFooter />
    </div>
  </main>;
}