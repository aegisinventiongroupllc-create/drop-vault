import { useState } from "react";
import WalletIndicator from "@/components/WalletIndicator";
import GlobalPassport from "@/components/GlobalPassport";
import GhostCountryMessage from "@/components/GhostCountryMessage";
import LegalFooter from "@/components/LegalFooter";
import type { VaultType } from "@/lib/tokenEconomy";

const TRENDING_WOMEN = [
  { rank: 1, creator: "LunaCosplay", views: "1.2M", category: "Cosplay", country: "US" },
  { rank: 2, creator: "FitJessie", views: "890K", category: "Gym", country: "US" },
  { rank: 3, creator: "BlondieVibes", views: "756K", category: "Blondes", country: "GB" },
  { rank: 4, creator: "TwinFlames", views: "623K", category: "Groups", country: "BR" },
  { rank: 5, creator: "PetiteSophie", views: "512K", category: "Short Girls", country: "FR" },
  { rank: 6, creator: "NeonQueen", views: "480K", category: "Cosplay", country: "US" },
  { rank: 7, creator: "GymRat_Anna", views: "445K", category: "Gym", country: "CA" },
  { rank: 8, creator: "DuoVibes", views: "398K", category: "Groups", country: "AU" },
];

const TRENDING_MEN = [
  { rank: 1, creator: "AlphaFlex", views: "980K", category: "Fitness", country: "US" },
  { rank: 2, creator: "KingCole", views: "870K", category: "Lifestyle", country: "GB" },
  { rank: 3, creator: "RexFitness", views: "650K", category: "Gym", country: "AU" },
  { rank: 4, creator: "StormChaser", views: "520K", category: "Adventure", country: "US" },
  { rank: 5, creator: "NovaKing", views: "490K", category: "Fashion", country: "CA" },
];

const TrendingPage = ({ onCreatorClick, vault, hasVaultToggle, countryFilter }: { onCreatorClick: (name: string) => void; vault: VaultType; hasVaultToggle?: boolean; countryFilter?: string }) => {
  const allTrending = vault === "women" ? TRENDING_WOMEN : TRENDING_MEN;
  const trending = countryFilter && countryFilter !== "GLOBAL"
    ? allTrending.filter(t => t.country === countryFilter)
    : allTrending;

  return (
    <div className={`min-h-screen pb-20 ${hasVaultToggle ? "pt-10" : ""}`}>
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground tracking-wider font-display">TRENDING</h1>
        <WalletIndicator />
      </div>

      {trending.length > 0 ? (
        <div className="px-4 space-y-3">
          {trending.map((item, idx) => (
            <button
              key={item.creator}
              onClick={() => onCreatorClick(item.creator)}
              className="w-full flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all"
            >
              <span className={`text-2xl font-bold font-display w-8 text-right ${idx < 3 ? "text-primary neon-text" : "text-muted-foreground"}`}>
                {idx + 1}
              </span>
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-primary">
                {item.creator.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">@{item.creator}</p>
                <p className="text-xs text-muted-foreground">{item.category}</p>
              </div>
              <div className="text-muted-foreground">
                <span className="text-sm font-medium">{item.views}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        countryFilter && countryFilter !== "GLOBAL" ? (
          <GhostCountryMessage countryCode={countryFilter} />
        ) : (
          <p className="text-center text-muted-foreground text-sm py-16">No trending creators found</p>
        )
      )}
      <LegalFooter />
    </div>
  );
};

export default TrendingPage;
