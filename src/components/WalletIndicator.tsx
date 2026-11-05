import { useTokenBalance } from "@/hooks/useTokenBalance";

const WalletIndicator = () => {
  const { balance, bitCents, loading } = useTokenBalance();
  return (
    <div aria-label="Wallet balance" className="flex flex-wrap justify-end gap-1 text-muted-foreground max-w-[180px]">
      <span className="text-[10px]">{loading ? "…" : `${balance} Bit-Tokens · ${bitCents} Bit-cents`}</span>
    </div>
  );
};

export default WalletIndicator;
