import coin from "@/assets/dtt-reward-coin.png";
export default function DttToken({ className = "h-8 w-8" }: { className?: string }) {
  return <img src={coin} alt="DTT Bit-Token" className={`object-contain dtt-token-glow motion-safe:animate-pulse ${className}`} />;
}