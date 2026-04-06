import { useState } from "react";
import AgeVerification from "@/components/AgeVerification";
import BottomNav, { type Tab } from "@/components/BottomNav";
import DiscoveryFeed from "@/components/DiscoveryFeed";
import CreatorProfile from "@/components/CreatorProfile";
import TrendingPage from "@/components/TrendingPage";
import CreatorAnalyticsDashboard from "@/components/CreatorAnalyticsDashboard";
import MasterAdminPanel from "@/components/MasterAdminPanel";
import { Upload, Lock, User, Shield } from "lucide-react";
import WalletIndicator from "@/components/WalletIndicator";

const PlaceholderPage = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 pb-20">
    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
      <Icon className="w-8 h-8 text-primary" />
    </div>
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <p className="text-sm text-muted-foreground">Coming soon</p>
  </div>
);

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
      {activeTab === "upload" && <PlaceholderPage icon={Upload} title="Upload" />}
      {activeTab === "vaults" && <PlaceholderPage icon={Lock} title="My Vaults" />}
      {activeTab === "profile" && (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 pb-20">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">My Profile</h2>
          <button
            onClick={() => setShowDashboard(true)}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium neon-glow hover:brightness-110 transition-all"
          >
            Open Creator Dashboard
          </button>
          <button
            onClick={() => setShowAdmin(true)}
            className="flex items-center gap-2 px-5 py-2 bg-secondary border border-border rounded-full text-xs text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
          >
            <Shield className="w-3.5 h-3.5" />
            Master Admin Panel
          </button>
        </div>
      )}
      <BottomNav active={activeTab} onNavigate={setActiveTab} />
    </div>
  );
};

export default Index;
