import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activityLog";

/**
 * /reset-password — destination after clicking the password-reset email.
 * Supabase puts the recovery session in the URL hash; we just let it
 * auto-establish, then let the user pick a new password.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryReady(true);
    });
    // If the user landed here directly with an active session, allow update too.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setRecoveryReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleUpdate = async () => {
    if (password.length < 6) {
      toast({ title: "Too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", description: "Please re-enter the same password.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await logActivity("password_changed", "Reset via email link");
      toast({ title: "Password updated", description: "You're all set. Taking you to your dashboard…" });
      setTimeout(() => navigate("/"), 800);
    } catch (e: any) {
      toast({ title: "Couldn't update password", description: e?.message ?? "Try again.", variant: "destructive" });
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
          <p className="text-muted-foreground text-sm">Set a new password.</p>
        </div>

        {!recoveryReady ? (
          <p className="text-xs text-muted-foreground">Verifying your reset link…</p>
        ) : (
          <>
            <div className="w-full space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  autoComplete="new-password"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-9"
                  autoComplete="new-password"
                  onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(); }}
                />
              </div>
            </div>

            <Button
              variant="neon"
              size="lg"
              className="w-full text-base font-semibold"
              onClick={handleUpdate}
              disabled={loading}
            >
              {loading ? "UPDATING…" : "UPDATE PASSWORD"}
            </Button>
          </>
        )}

        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Back to home
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;