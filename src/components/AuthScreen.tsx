import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Star, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { UserRole } from "@/components/RoleSelection";
import { logActivity } from "@/lib/activityLog";

import { verifyAdminPasscode } from "@/lib/adminSession";
import LegalFooter from "@/components/LegalFooter";

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

  const validate = (): string | null => {
    const e = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return "Please enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const handleSubmit = async () => {
    const trimmed = email.trim();
    // Staff access code (verified on the server, never stored in the app)
    if (trimmed && !trimmed.includes("@")) {
      if (await verifyAdminPasscode(trimmed)) {
        onAdmin();
        return;
      }
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 px-6 py-8 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider text-foreground mb-1">
            DROPTHAT<span className="text-primary">THING</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {mode === "login" && "Welcome back. Log in to continue."}
            {mode === "signup" && "Create your account to get started."}
            {mode === "forgot" && "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {mode === "signup" && (
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold tracking-widest transition-all border ${
                role === "customer" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"
              }`}
            >
              <Users className="w-4 h-4" /> CUSTOMER
            </button>
            <button
              type="button"
              onClick={() => setRole("creator")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold tracking-widest transition-all border ${
                role === "creator" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"
              }`}
            >
              <Star className="w-4 h-4" /> CREATOR
            </button>
          </div>
        )}

        <div className="w-full space-y-2">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              inputMode="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
              autoComplete="email"
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            />
          </div>
          {mode !== "forgot" && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-11"
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
          )}
        </div>

        <Button
          variant="neon"
          size="lg"
          className="w-full text-base font-semibold"
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


        <div className="flex flex-col items-center gap-1.5 mt-1">
          {mode === "login" && (
            <>
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                New here? Create an account
              </button>
            </>
          )}
          {mode === "signup" && (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Already have an account? Log in
            </button>
          )}
          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Back to log in
            </button>
          )}
        </div>

      </div>
      <LegalFooter />
      </div>
    </div>
  );
};

export default AuthScreen;