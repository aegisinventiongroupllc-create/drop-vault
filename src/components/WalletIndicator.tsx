import { Clock } from "lucide-react";

const WalletIndicator = ({ balance = 6 }: { balance?: number }) => {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Clock className="w-3 h-3" />
      <span className="text-[10px]">14d</span>
    </div>
  );
};

export default WalletIndicator;
