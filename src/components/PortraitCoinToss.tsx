import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
    const launch = () => {
      if (launched >= total) return;
      const index = launched++;
      setCoins(current => [...current, index]);
      if (audio && index % 3 === 0) playCoinClink(audio);
    };
    launch();
    const interval = setInterval(launch, 90);
    const popupTimer = setTimeout(() => setLanded(true), total * 90 + 1300);
    const timer = setTimeout(onComplete, total * 90 + 2900);
    return () => { clearInterval(interval); clearTimeout(popupTimer); clearTimeout(timer); };
  }, [count, audio, onComplete]);
  return <div className="portrait-toss-layer" role="status" aria-label={`${count} Bit-Tokens tossed`}>
    <span className="sr-only">{count} Bit-Tokens</span>
    {coins.map(index => <img key={index} src={coin} alt="" className={`portrait-toss-coin portrait-toss-lane-${index % 3}`} onAnimationEnd={() => setCoins(current => current.filter(value => value !== index))} />)}
    {landed && createPortal(<div className="fixed inset-0 z-[220] flex items-center justify-center pointer-events-none px-6" role="status">
      <div className="max-w-sm w-full rounded-lg border border-gold/50 bg-background/95 p-6 text-center shadow-lg">
        <img src={coin} alt="DTT Bit-Token" className="w-28 h-28 object-contain mx-auto mb-3" />
        <p className="text-xl font-bold text-gold">Enjoy Your Creator!</p>
      </div>
    </div>, document.body)}
  </div>;
}