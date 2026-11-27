import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { verifyAdminPasscode } from "@/lib/adminSession";

/** Two steps: sign in with the administrator account, then enter the dashboard code. */
async function signedInAsAdmin(): Promise<boolean> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return false;
  const { data, error: roleError } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  return !roleError && data === true;
}

const SecretAdmin = () => {
  const [step, setStep] = useState<"checking" | "account" | "code">("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void signedInAsAdmin().then((ok) => { if (active) setStep(ok ? "code" : "account"); });
    return () => { active = false; };
  }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      setErr("Email or password is incorrect.");
      return;
    }
    const ok = await signedInAsAdmin();
    setBusy(false);
    if (!ok) {
      await supabase.auth.signOut();
      setErr("This account is not an administrator account.");
      return;
    }
    setPassword("");
    setStep("code");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = await verifyAdminPasscode(pw);
    setBusy(false);
    if (ok) {
      setErr("");
      window.location.replace("/admin-portal");
    } else {
      setErr("Invalid code. Please contact support: admin@dttmediallc.com");
    }
  };

  const switchAccount = async () => {
    await supabase.auth.signOut();
    setPw("");
    setErr("");
    setStep("account");
  };

  return (
    <>
      <Helmet>
        <title>Restricted</title>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        {step === "checking" && <p className="text-sm text-muted-foreground tracking-widest">CHECKING…</p>}
        {step === "account" && (
          <form onSubmit={signIn} className="w-full max-w-sm space-y-4">
            <h1 className="text-center text-xl font-bold tracking-widest text-foreground">ADMIN SIGN IN</h1>
            <p className="text-center text-xs text-muted-foreground">Step 1 of 2: sign in with your administrator account.</p>
            <Input type="email" autoComplete="username" autoFocus placeholder="Administrator email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} required />
            <Input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }} required />
            {err && <p className="text-xs text-destructive text-center leading-relaxed">{err}</p>}
            <Button type="submit" variant="neon" className="w-full" disabled={busy}>{busy ? "SIGNING IN…" : "SIGN IN"}</Button>
          </form>
        )}
        {step === "code" && (
          <form onSubmit={submit} className="w-full max-w-sm space-y-4">
            <h1 className="text-center text-xl font-bold tracking-widest text-foreground">RESTRICTED</h1>
            <p className="text-center text-xs text-muted-foreground">Step 2 of 2: enter your dashboard code.</p>
            <Input type="password" inputMode="numeric" autoFocus placeholder="Enter access code" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} className="text-center" />
            {err && <p className="text-xs text-destructive text-center leading-relaxed">{err}</p>}
            <Button type="submit" variant="neon" className="w-full" disabled={busy}>{busy ? "CHECKING…" : "ENTER"}</Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => void switchAccount()}>USE A DIFFERENT ACCOUNT</Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => window.dispatchEvent(new Event("dtt:replay-intro"))}>
              PREVIEW LOADING SCREEN
            </Button>
          </form>
        )}
      </div>
    </>
  );
};

export default SecretAdmin;
