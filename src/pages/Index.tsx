import { useState } from "react";
import AgeVerification from "@/components/AgeVerification";
import BottomNav, { type Tab } from "@/components/BottomNav";
import DiscoveryFeed from "@/components/DiscoveryFeed";
import CreatorProfile from "@/components/CreatorProfile";
import TrendingPage from "@/components/TrendingPage";
import CreatorAnalyticsDashboard from "@/components/CreatorAnalyticsDashboard";
import MasterAdminPanel from "@/components/MasterAdminPanel";
import WalletIndicator from "@/components/WalletIndicator";

const Index = () => {
  const [verified, setVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  if (!verified) {
    return <AgeVerification onVerified={() => setVerified(true)} />;
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

  return (
    <div className="h-screen overflow-hidden">
      {activeTab === "home" && <DiscoveryFeed onCreatorClick={handleCreatorClick} />}
      {activeTab === "trending" && <TrendingPage onCreatorClick={handleCreatorClick} />}
      {activeTab === "vaults" && (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 pb-20">
          <h2 className="text-xl font-bold text-foreground tracking-wider font-display">MY VAULTS</h2>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>
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
        </div>
      )}
      <BottomNav active={activeTab} onNavigate={setActiveTab} />
    </div>
  );
};

export default Index;
