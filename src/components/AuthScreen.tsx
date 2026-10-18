import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/hooks/use-toast";
import type { UserRole } from "@/components/RoleSelection";
import { logActivity } from "@/lib/activityLog";

import { verifyAdminPasscode } from "@/lib/adminSession";
import LegalFooter from "@/components/LegalFooter";
import pinkGlobe from "@/assets/dtt-globe-pink.png";

interface AuthScreenProps {
  onAdmin: () => void;
}

type Mode = "login" | "signup" | "forgot";

const AUTH_REDIRECT_ORIGIN = "https://dropthatthing.com";

const AuthScreen = ({ onAdmin }: AuthScreenProps) => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("customer");
  const [loading, setLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  const validate = (): string | null => {
    const e = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return "Please enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const handleSubmit = async () => {
    if (loading) return;
    setAdminError("");
    const trimmed = email.trim();
    // Owner preview code: opens the customer entry-pass page
    if (trimmed === "0524171") {
      window.location.href = "/entry-pass-preview";
      return;
    }
    // Staff access code (verified on the server, never stored in the app)
    if (mode === "login" && /^\d{6}$/.test(trimmed)) {
      setLoading(true);
      try {
        if (await verifyAdminPasscode(trimmed)) onAdmin();
        else setAdminError("Access code not accepted. Check the code and try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Forgot password — only email needed
    if (mode === "forgot") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        toast({ title: "Hold on", description: "Please enter a valid email address.", variant: "destructive" });
        return;
      }
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
          redirectTo: `${AUTH_REDIRECT_ORIGIN}/reset-password`,
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "If an account exists for that email, we sent a reset link.",
        });
        setMode("login");
      } catch (e: any) {
        toast({ title: "Couldn't send reset link", description: e?.message ?? "Try again.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
      return;
    }

    const err = validate();
    if (err) { toast({ title: "Hold on", description: err, variant: "destructive" }); return; }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: trimmed,
          password,
          options: {
            emailRedirectTo: AUTH_REDIRECT_ORIGIN,
            data: { role },
          },
        });
        if (error) throw error;
        await logActivity("signup", `New ${role} signup`, { role });
        toast({
          title: "Check your inbox",
          description: "We sent you a confirmation link. Click it to activate your account, then log in.",
        });
        setMode("login");
        setPassword("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (error) throw error;
        await logActivity("login", "Email + password");
        // Session listener in Index.tsx handles redirect.
      }
    } catch (e: any) {
      const msg = e?.message ?? "Something went wrong.";
      toast({ title: "Authentication failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="dtt-auth-screen fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between border-b border-border px-6 py-5">
        <span className="font-display text-sm font-bold text-foreground notranslate">DTT<span className="text-primary">.</span></span>
        <span className="text-xs text-muted-foreground">MEMBERS ONLY · 18+</span>
      </header>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        <div className="mb-2 w-full">
          <img src={pinkGlobe} alt="DTT globe" width={96} height={96} className="mx-auto mb-5 h-24 w-24 object-contain" style={{ filter: "drop-shadow(0 0 14px hsl(var(--primary) / .6))" }} />
          <h1 className="font-display text-2xl font-bold text-foreground notranslate">
            <span className="block">DROPTHAT</span><span className="block text-primary">THING</span>
          </h1>
          <p className="mt-5 text-muted-foreground text-sm">
            {mode === "login" && "Welcome back. Log in to continue."}
            {mode === "signup" && "Create your account to get started."}
            {mode === "forgot" && "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {mode === "signup" && (
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button
              type="button"
              onClick={() => setRole("customer")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold tracking-widest transition-all border ${
                role === "customer" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"
              }`}
            >
              CUSTOMER
            </Button>
            <Button
              type="button"
              onClick={() => setRole("creator")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold tracking-widest transition-all border ${
                role === "creator" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"
              }`}
            >
              CREATOR
            </Button>
          </div>
        )}

        <div className="w-full space-y-2">
          <div className="relative">
            <label htmlFor="dtt-email" className="mb-2 block text-left text-xs font-medium text-muted-foreground">Email address</label>
            <Input
              id="dtt-email"
              type="text"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setAdminError(""); }}
              className="h-12 rounded-md bg-secondary/50"
              autoComplete="email"
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            />
          </div>
          {mode !== "forgot" && (
            <div className="relative">
              <label htmlFor="dtt-password" className="mb-2 block text-left text-xs font-medium text-muted-foreground">Password</label>
              <div className="relative">
              <Input
                id="dtt-password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-md bg-secondary/50 pr-11"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
              </div>
            </div>
          )}
        </div>

        {adminError && <p role="alert" className="text-sm text-destructive">{adminError}</p>}
        <Button
          variant="neon"
          size="lg"
          className="h-12 w-full text-sm font-semibold"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading
            ? "PLEASE WAIT…"
            : mode === "login"
              ? "LOG IN"
              : mode === "signup"
                ? "CREATE ACCOUNT"
                : "SEND RESET LINK"}
        </Button>

        {mode !== "forgot" && (
          <>
          <div className="flex w-full items-center gap-4" aria-hidden="true"><span className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">or</span><span className="h-px flex-1 bg-border" /></div>
          <Button
            variant="outline"
            size="lg"
            className="h-12 w-full text-sm font-semibold"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: AUTH_REDIRECT_ORIGIN,
                  extraParams: { prompt: "select_account" },
                });
                if (result.error) throw result.error;
                if (result.redirected) return;
                await logActivity("login", "Google");
              } catch (error) {
                toast({ title: "Google sign-in failed", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
              } finally {
                setLoading(false);
              }
            }}
          >
            CONTINUE WITH GOOGLE
          </Button>
          </>
        )}



        <div className="flex flex-col items-center gap-1.5 mt-1">
          {mode === "login" && (
            <>
              <Button variant="link"
                type="button"
                onClick={() => setMode("forgot")}
                className="h-auto p-0 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </Button>
              <Button variant="link"
                type="button"
                onClick={() => setMode("signup")}
                className="h-auto p-0 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                New here? Create an account
              </Button>
            </>
          )}
          {mode === "signup" && (
            <Button variant="link"
              type="button"
              onClick={() => setMode("login")}
              className="h-auto p-0 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Already have an account? Log in
            </Button>
          )}
          {mode === "forgot" && (
            <Button variant="link"
              type="button"
              onClick={() => setMode("login")}
              className="h-auto p-0 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Back to log in
            </Button>
          )}
        </div>

      </div>
      <LegalFooter />
      </div>
    </div>
  );
};

export default AuthScreen;