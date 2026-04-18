import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ADMIN_PASSWORD = "052417";
const SESSION_KEY = "dtt_secret_admin_ok";

const SecretAdmin = () => {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setErr("");
      navigate("/admin-portal", { replace: true });
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
          <Button type="submit" variant="neon" className="w-full">ENTER</Button>
        </form>
      </div>
    </>
  );
};

export default SecretAdmin;
