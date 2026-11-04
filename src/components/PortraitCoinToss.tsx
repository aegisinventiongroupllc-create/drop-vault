import { useEffect, useState } from "react";
import coin from "@/assets/dtt-reward-coin.png";
import { coinTossCount, playCoinClink } from "@/lib/portraitCoinToss";
import "./portrait-coin-toss.css";

export default function PortraitCoinToss({ count, audio, onComplete }: { count: number; audio: AudioContext | null; onComplete: () => void }) {
  const [coins, setCoins] = useState<number[]>([]);
  useEffect(() => {
    const total = coinTossCount(count);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !total) {
      const timer = setTimeout(onComplete, 700);
      return () => clearTimeout(timer);
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
    const timer = setTimeout(onComplete, total * 90 + 1300);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [count, audio, onComplete]);
  return <div className="portrait-toss-layer" role="status" aria-label={`${count} Bit-Tokens tossed`}>
    <span className="sr-only">{count} Bit-Tokens</span>
    {coins.map(index => <img key={index} src={coin} alt="" className={`portrait-toss-coin portrait-toss-lane-${index % 3}`} onAnimationEnd={() => setCoins(current => current.filter(value => value !== index))} />)}
  </div>;
}