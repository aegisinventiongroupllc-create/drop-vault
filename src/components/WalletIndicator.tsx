import { Coins } from "lucide-react";

const WalletIndicator = ({ balance = 25.00 }: { balance?: number }) => {
  return (
    <button className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5 gold-glow transition-all hover:brightness-110">
      <Coins className="w-4 h-4 text-gold" />
      <span className="text-sm font-semibold text-gold">${balance.toFixed(2)}</span>
    </button>
  );
};

export default WalletIndicator;
