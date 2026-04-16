import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "dtt_pwa_dismissed";

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] left-4 right-4 z-[90] max-w-md mx-auto">
      <div className="bg-card border border-primary/40 rounded-2xl p-4 shadow-lg neon-glow-sm flex items-center gap-3">
        <img
          src="/dtt-icon-192.png"
          alt="DTT Media"
          className="w-12 h-12 rounded-xl shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground tracking-wider">SAVE TO HOME SCREEN</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Install DropThatThing for quick access</p>
        </div>
        <button
          onClick={handleInstall}
          className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-[11px] font-bold tracking-wider hover:brightness-110 transition-all flex items-center gap-1 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          INSTALL
        </button>
        <button
          onClick={handleDismiss}
          className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
