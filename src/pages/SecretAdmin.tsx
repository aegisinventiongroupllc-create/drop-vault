import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyAdminPasscode } from "@/lib/adminSession";

const SecretAdmin = () => {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await verifyAdminPasscode(pw);
    setBusy(false);
    if (ok) {
      setErr("");
      window.location.replace("/admin-portal");
    } else {
      setErr("Invalid code. Please contact support: office@dttmediallc.com");
    }
  };

  return (
    <>
      <Helmet>
        <title>Restricted</title>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h1 className="text-center text-xl font-bold tracking-widest text-foreground">RESTRICTED</h1>
          <Input
            type="password"
            autoFocus
            placeholder="Enter access code"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(""); }}
            className="text-center"
          />
          {err && (
            <p className="text-xs text-destructive text-center leading-relaxed">{err}</p>
          )}
          <Button type="submit" variant="neon" className="w-full" disabled={busy}>
            {busy ? "CHECKING…" : "ENTER"}
          </Button>
        </form>
      </div>
    </>
  );
};

export default SecretAdmin;
