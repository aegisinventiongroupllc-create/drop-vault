import { useState } from "react";
import AgeVerification from "@/components/AgeVerification";
import VaultGateway from "@/components/VaultGateway";
import KnowYourCoinsModal from "@/components/KnowYourCoinsModal";
import BottomNav, { type Tab } from "@/components/BottomNav";
import DiscoveryFeed from "@/components/DiscoveryFeed";
import CreatorProfile from "@/components/CreatorProfile";
import TrendingPage from "@/components/TrendingPage";
import MemberDashboard from "@/components/MemberDashboard";
import CreatorAnalyticsDashboard from "@/components/CreatorAnalyticsDashboard";
import MasterAdminPanel from "@/components/MasterAdminPanel";
import GlobalSearch from "@/components/GlobalSearch";
import LegalPages from "@/components/LegalPages";
import type { VaultType } from "@/lib/tokenEconomy";

const Index = () => {
  const [verified, setVerified] = useState(false);
  const [vaultSelected, setVaultSelected] = useState<VaultType | null>(null);
  const [showKnowYourCoins, setShowKnowYourCoins] = useState(false);
  const [hasSeenCoins, setHasSeenCoins] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(6);

  if (!verified) {
    return <AgeVerification onVerified={() => setVerified(true)} />;
  }

  if (!vaultSelected) {
    return (
      <VaultGateway onSelect={(vault) => {
        setVaultSelected(vault);
        if (!hasSeenCoins) setShowKnowYourCoins(true);
      }} />
    );
  }

  if (showKnowYourCoins) {
    return (
      <KnowYourCoinsModal onClose={() => {
        setShowKnowYourCoins(false);
        setHasSeenCoins(true);
      }} />
    );
  }

  if (showSearch) {
    return (
      <GlobalSearch
        onCreatorClick={(name) => { setSelectedCreator(name); setShowSearch(false); }}
        onClose={() => setShowSearch(false)}
      />
    );
  }

  if (showLegal) {
    return <LegalPages onBack={() => setShowLegal(false)} />;
  }

  if (showAdmin) {
    return <MasterAdminPanel onBack={() => setShowAdmin(false)} />;
  }

  if (showDashboard) {
    return (
      <>
        <CreatorAnalyticsDashboard onBack={() => setShowDashboard(false)} />
        <BottomNav active={activeTab} onNavigate={(tab) => { setShowDashboard(false); setActiveTab(tab); }} />
      </>
    );
  }

  if (selectedCreator) {
    return (
      <>
        <CreatorProfile creatorName={selectedCreator} onBack={() => setSelectedCreator(null)} />
        <BottomNav active={activeTab} onNavigate={(tab) => { setSelectedCreator(null); setActiveTab(tab); }} />
      </>
    );
  }

  const handleCreatorClick = (name: string) => setSelectedCreator(name);
  const handleBuyTokens = (n: number) => setTokenBalance(prev => prev + n);

  return (
    <div className="h-screen overflow-hidden">
      {activeTab === "home" && (
        <DiscoveryFeed onCreatorClick={handleCreatorClick} vault={vaultSelected} onSearch={() => setShowSearch(true)} />
      )}
      {activeTab === "trending" && <TrendingPage onCreatorClick={handleCreatorClick} vault={vaultSelected} />}
      {activeTab === "vaults" && (
        <MemberDashboard balance={tokenBalance} onBuyTokens={handleBuyTokens} />
      )}
      {activeTab === "profile" && (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 pb-20">
          <h2 className="text-xl font-bold text-foreground tracking-wider font-display">PROFILE</h2>
          <button
            onClick={() => setShowDashboard(true)}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold tracking-wider neon-glow hover:brightness-110 transition-all"
          >
            CREATOR DASHBOARD
          </button>
          <button
            onClick={() => setShowAdmin(true)}
            className="px-5 py-2 bg-secondary border border-border rounded-full text-xs font-bold tracking-wider text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
          >
            MASTER ADMIN PANEL
          </button>
          {/* Vault switch */}
          <button
            onClick={() => setVaultSelected(null)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors mt-4 underline"
          >
            Explore Other Vault
          </button>
          {/* Legal link */}
          <button
            onClick={() => setShowLegal(true)}
            className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-2"
          >
            Terms of Service & Privacy Policy
          </button>
        </div>
      )}
      <BottomNav active={activeTab} onNavigate={setActiveTab} />
    </div>
  );
};

export default Index;
