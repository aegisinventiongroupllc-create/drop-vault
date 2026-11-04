import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import coin from "@/assets/dtt-reward-coin.png";
import { coinTossCount, playCoinClink } from "@/lib/portraitCoinToss";
import "./portrait-coin-toss.css";

export default function PortraitCoinToss({ count, audio, onComplete }: { count: number; audio: AudioContext | null; onComplete: () => void }) {
  const [coins, setCoins] = useState<number[]>([]);
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    const total = coinTossCount(count);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !total) {
      const popupTimer = setTimeout(() => setLanded(true), 700);
      const timer = setTimeout(onComplete, 2300);
      return () => { clearTimeout(popupTimer); clearTimeout(timer); };
    }
    let launched = 0;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    let popupTimer: ReturnType<typeof setTimeout> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const launch = () => {
      if (cancelled || launched >= total) return;
      const index = launched++;
      setCoins(current => [...current, index]);
      if (audio && index % 3 === 0) playCoinClink(audio);
    };
    // Wait until the coin image is decoded and the page has painted, so the first coin flies smoothly instead of jumping.
    const start = () => {
      if (cancelled) return;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (cancelled) return;
        launch();
        interval = setInterval(launch, 120);
        popupTimer = setTimeout(() => setLanded(true), total * 120 + 2000);
        timer = setTimeout(onComplete, total * 120 + 3600);
      }));
    };
    const preload = new Image();
    preload.src = coin;
    const decoded = preload.decode ? preload.decode().catch(() => undefined) : Promise.resolve();
    void Promise.race([decoded, new Promise(resolve => setTimeout(resolve, 600))]).then(start);
    return () => { cancelled = true; if (interval) clearInterval(interval); if (popupTimer) clearTimeout(popupTimer); if (timer) clearTimeout(timer); };
  }, [count, audio, onComplete]);
  return <div className="portrait-toss-layer" role="status" aria-label={`${count} Bit-Tokens tossed`}>
    <span className="sr-only">{count} Bit-Tokens</span>
    {coins.map(index => <div key={index} className={`portrait-toss-coin portrait-toss-lane-${index % 3}`} onAnimationEnd={event => event.target === event.currentTarget && setCoins(current => current.filter(value => value !== index))}>
      <div className="portrait-toss-flip"><img src={coin} alt="" className="portrait-toss-face" /></div>
    </div>)}
    {landed && createPortal(<div className="fixed inset-0 z-[220] flex items-center justify-center pointer-events-none px-6" role="status">
      <div className="relative pointer-events-auto max-w-sm w-full rounded-lg border border-gold/50 bg-background/95 p-6 text-center shadow-lg">
        <Button variant="ghost" size="icon" aria-label="Close Enjoy Your Creator popup" onClick={onComplete} className="absolute top-2 right-2 text-muted-foreground"><X className="w-5 h-5" /></Button>
        <img src={coin} alt="DTT Bit-Token" className="w-28 h-28 object-contain mx-auto mb-3" />
        <p className="text-xl font-bold text-gold">Enjoy Your Creator!</p>
      </div>
    </div>, document.body)}
  </div>;
}