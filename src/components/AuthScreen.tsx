import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Star, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "@/hooks/use-toast";
import type { UserRole } from "@/components/RoleSelection";

const ADMIN_PASSCODE = "052417";

interface AuthScreenProps {
  onAdmin: () => void;
}

type Mode = "login" | "signup";

const AuthScreen = ({ onAdmin }: AuthScreenProps) => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    const e = email.trim();
    if (e === ADMIN_PASSCODE) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return "Please enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (trimmed === ADMIN_PASSCODE) {
      sessionStorage.setItem("dtt_secret_admin_ok", "1");
      onAdmin();
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
            emailRedirectTo: window.location.origin,
            data: { role },
          },
        });
        if (error) throw error;
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
        // Session listener in Index.tsx handles redirect.
      }
    } catch (e: any) {
      const msg = e?.message ?? "Something went wrong.";
      toast({ title: "Authentication failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: "Google sign-in failed", description: String(result.error.message ?? result.error), variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-y-auto">
      <div className="flex flex-col items-center gap-5 px-6 py-8 text-center max-w-sm w-full">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider text-foreground mb-1">
            DROPTHAT<span className="text-primary">THING</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {mode === "login" ? "Welcome back. Log in to continue." : "Create your account to get started."}
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
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
              autoComplete="email"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            />
          </div>
        </div>

        <Button
          variant="neon"
          size="lg"
          className="w-full text-base font-semibold"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "PLEASE WAIT…" : mode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
        </Button>

        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-muted-foreground tracking-widest">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full text-sm font-semibold border-primary/30 hover:border-primary"
          onClick={handleGoogle}
          disabled={loading}
        >
          CONTINUE WITH GOOGLE
        </Button>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
        </button>

        <p className="text-[10px] text-muted-foreground/50">
          © {new Date().getFullYear()} DTT Media. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;