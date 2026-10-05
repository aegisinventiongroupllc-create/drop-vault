import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import coinImage from "@/assets/dtt-reward-coin.png";

const COINS = Array.from({ length: 28 }, (_, index) => ({
  left: `${(index * 37 + 7) % 100}%`,
  size: 32 + (index * 13) % 44,
  delay: -(index % 7) * 0.65,
  duration: 3.5 + (index % 5) * 0.45,
  rotate: index % 2 ? 310 : -280,
}));

export default function CreatorWelcomeBack({ summary, onDismiss, onAnalytics }: {
  summary: { usd: number; tokens: number } | null;
  onDismiss: () => void;
  onAnalytics: () => void;
}) {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const audioRef = useRef<AudioContext | null>(null);
  const [sound, setSound] = useState(false);
  const [displayUsd, setDisplayUsd] = useState(0);
  useEffect(() => {
    if (!summary) { setSound(false); return; }
    if (reducedMotion) { setDisplayUsd(summary.usd); return; }
    const start = performance.now();
    let frame = 0;
    const count = (time: number) => {
      const progress = Math.min(1, (time - start) / 1100);
      setDisplayUsd(summary.usd * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(count);
    };
    frame = requestAnimationFrame(count);
    return () => cancelAnimationFrame(frame);
  }, [summary, reducedMotion]);

  useEffect(() => {
    if (!sound || !summary) return;
    const clink = () => {
      const context = audioRef.current;
      if (!context || context.state !== "running" || document.hidden) return;
      [2100, 3250].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.018, context.currentTime + index * 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.13);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(context.currentTime + index * 0.015);
        oscillator.stop(context.currentTime + 0.15);
      });
    };
    clink();
    const interval = window.setInterval(clink, 900);
    return () => { clearInterval(interval); void audioRef.current?.close(); audioRef.current = null; };
  }, [sound, summary]);

  const toggleSound = async () => {
    if (sound) { setSound(false); return; }
    try {
      const context = new AudioContext();
      await context.resume();
      audioRef.current = context;
      setSound(true);
    } catch { setSound(false); }
  };

  return (
    <Dialog open={summary !== null} onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <DialogContent className="welcome-reward w-[calc(100%-2rem)] max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden rounded-lg border-gold/40 bg-card p-0">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {!reducedMotion && COINS.map((coin, index) => (
            <motion.img key={index} src={coinImage} alt="" width={816} height={816}
              className="absolute top-0 object-contain"
              style={{ left: coin.left, width: coin.size, height: coin.size }}
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: [-100, 760], rotate: [0, coin.rotate], rotateY: [0, 70, 0], opacity: [0, 0.8, 0.8, 0] }}
              transition={{ duration: coin.duration, delay: coin.delay, repeat: Infinity, ease: "easeIn" }} />
          ))}
        </div>
        <div className="welcome-reward-content relative flex min-h-[540px] flex-col items-center px-6 py-10 text-center sm:px-10">
          <p className="mb-4 text-xs font-bold uppercase text-gold">Your vault kept moving</p>
          <DialogTitle className="font-display text-2xl font-bold leading-tight tracking-normal sm:text-3xl">WELCOME BACK</DialogTitle>
          <div className="reward-main-coin relative my-6 h-36 w-36 sm:h-44 sm:w-44" aria-hidden="true">
            <img src={coinImage} alt="" width={816} height={816} className="h-full w-full object-contain" />
            <span className="reward-coin-shine absolute inset-2 overflow-hidden rounded-full" />
          </div>
          <DialogDescription className="text-base text-foreground">While you were away...</DialogDescription>
          <p className="mt-3 text-sm text-muted-foreground">You earned</p>
          <p className={`my-1 max-w-full break-all font-bold tabular-nums text-gold ${displayUsd >= 100000 ? "text-3xl sm:text-4xl" : "text-5xl sm:text-6xl"}`} aria-hidden="true">
            {displayUsd.toLocaleString("en-US", { style: "currency", currency: "USD" })}
          </p>
          <p className="sr-only">You earned {summary?.usd.toFixed(2)} US dollars.</p>
          <p className="text-base font-semibold text-foreground">({summary?.tokens.toLocaleString("en-US", { maximumFractionDigits: 2 }) ?? 0} Bit-Tokens)</p>
          <p className="mt-2 text-xs text-muted-foreground">Your earnings after the platform share</p>
          <Button variant="gold" className="mt-8 h-12 w-full" onClick={onAnalytics}>View Analytics</Button>
          <Button variant="ghost" size="sm" className="mt-3 text-xs text-muted-foreground" aria-pressed={sound} onClick={() => void toggleSound()}>
            Sound {sound ? "on" : "off"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}