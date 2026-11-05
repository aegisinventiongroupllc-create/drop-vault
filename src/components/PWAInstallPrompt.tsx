import { useEffect, useRef, useState } from "react";
import { X, Download } from "lucide-react";
import pinkGlobe from "@/assets/dtt-pink-globe-icon-clean.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALL_KEY = "dtt_pwa_installed";

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const installed = useRef(false);
  const dismissed = useRef(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const isStandalone = () => standalone.matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const confirmInstalled = () => {
      installed.current = true;
      setVisible(false);
      setDeferredPrompt(null);
      try { localStorage.setItem(INSTALL_KEY, "1"); } catch { /* Storage may be unavailable. */ }
    };
    try {
      localStorage.removeItem("dtt_pwa_dismissed");
      installed.current = localStorage.getItem(INSTALL_KEY) === "1";
    } catch { /* Keep detection working without storage. */ }
    if (isStandalone()) confirmInstalled();

    const handler = (e: Event) => {
      e.preventDefault();
      // A fresh browser install offer means installation is available again.
      installed.current = false;
      try { localStorage.removeItem(INSTALL_KEY); } catch { /* Optional persistence. */ }
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!dismissed.current) setVisible(true);
    };
    const displayChanged = () => { if (isStandalone()) confirmInstalled(); };
    let lastUser: string | null = null;
    const { data: auth } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") lastUser = null;
      const userId = session?.user.id;
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && userId && userId !== lastUser) {
        lastUser = userId;
        dismissed.current = false;
        if (!installed.current && !isStandalone()) setVisible(true);
      }
    });

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", confirmInstalled);
    standalone.addEventListener("change", displayChanged);
    return () => {
      auth.subscription.unsubscribe();
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", confirmInstalled);
      standalone.removeEventListener("change", displayChanged);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast.info(/iPad|iPhone|iPod/.test(navigator.userAgent)
        ? "Apple requires Safari’s Share menu → Add to Home Screen. This website cannot open Apple’s install dialog."
        : "This browser has not offered installation. Open dropthatthing.com directly in Chrome or Edge; if available, use its Install app menu.");
      return;
    }
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      // Accepting the browser dialog is not proof that installation finished.
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    dismissed.current = true;
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] left-4 right-4 z-[90] max-w-md mx-auto">
      <div className="bg-card border border-primary/40 rounded-2xl p-4 shadow-lg neon-glow-sm flex items-center gap-3">
        <img
          src={pinkGlobe}
          alt="DTT"
          className="w-12 h-12 rounded-xl shrink-0"
        />
        <div className="flex-1 min-w-0">
          <Button variant="ghost" onClick={() => void handleInstall().catch(() => toast.error("Installation could not open. Please try again."))} className="h-auto justify-start whitespace-normal p-0 text-left text-xs font-bold text-foreground">SAVE TO HOME SCREEN</Button>
          <p className="text-[10px] text-muted-foreground mt-0.5">Install DropThatThing for quick access</p>
        </div>
        <Button
          onClick={() => void handleInstall().catch(() => undefined)}
          className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-[11px] font-bold tracking-wider hover:brightness-110 transition-all flex items-center gap-1 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          INSTALL
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
