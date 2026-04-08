import { useState } from "react";
import type { VaultType } from "@/lib/tokenEconomy";

const VaultGateway = ({ onSelect }: { onSelect: (vault: VaultType) => void }) => {
  const [hoveredVault, setHoveredVault] = useState<VaultType | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="text-center mb-10 px-6">
        <h1 className="font-display text-2xl font-bold tracking-wider text-foreground mb-2">
          DROP<span className="text-primary">THAT</span>THING
        </h1>
        <p className="text-sm text-muted-foreground">Select Your Experience</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs px-6">
        {/* Women's Vault */}
        <button
          onClick={() => onSelect("women")}
          onMouseEnter={() => setHoveredVault("women")}
          onMouseLeave={() => setHoveredVault(null)}
          className={`w-full py-6 rounded-xl border-2 text-center font-display font-bold text-lg tracking-widest transition-all duration-300 ${
            hoveredVault === "women"
              ? "border-primary bg-primary/10 text-primary neon-glow"
              : "border-border bg-card text-foreground hover:border-primary/50"
          }`}
        >
          WOMEN'S VAULT
        </button>

        {/* Men's Vault */}
        <button
          onClick={() => onSelect("men")}
          onMouseEnter={() => setHoveredVault("men")}
          onMouseLeave={() => setHoveredVault(null)}
          className={`w-full py-6 rounded-xl border-2 text-center font-display font-bold text-lg tracking-widest transition-all duration-300 ${
            hoveredVault === "men"
              ? "border-[hsl(210,80%,55%)] bg-[hsl(210,80%,55%,0.1)] text-[hsl(210,80%,55%)]"
              : "border-border bg-card text-foreground hover:border-[hsl(210,80%,55%,0.5)]"
          }`}
          style={hoveredVault === "men" ? { boxShadow: "0 0 12px hsl(210,80%,55%), 0 0 30px hsl(210,80%,55%,0.3)" } : undefined}
        >
          MEN'S VAULT
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground mt-8 px-6 text-center">
        Both vaults use the same Bit-Token economy and 14-day access system.
      </p>
    </div>
  );
};

export default VaultGateway;
