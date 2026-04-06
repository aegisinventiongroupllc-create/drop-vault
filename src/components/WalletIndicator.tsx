import { Clock } from "lucide-react";

const WalletIndicator = ({ balance = 6 }: { balance?: number }) => {
  return (
    <div className="flex items-center gap-2">
      <button className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5 gold-glow transition-all hover:brightness-110">
        <span className="w-5 h-5 rounded-full bg-gold flex items-center justify-center text-[10px] font-bold text-gold-foreground">B</span>
        <span className="text-sm font-semibold text-gold">{balance} Bit-Tokens</span>
      </button>
      <div className="flex items-center gap-1 text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span className="text-[10px]">14d</span>
      </div>
    </div>
  );
};

export default WalletIndicator;
