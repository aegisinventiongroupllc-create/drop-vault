import { useState, useEffect } from "react";
import AgeVerification from "@/components/AgeVerification";
import LegalFooter from "@/components/LegalFooter";
import RoleSelection, { type UserRole } from "@/components/RoleSelection";
import CustomerPreference, { type GenderPreference } from "@/components/CustomerPreference";
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

const STORAGE_KEY = "dtt_user_prefs";

interface UserPrefs {
  email: string;
  role: UserRole;
  vault?: VaultType;
}

const loadPrefs = (): UserPrefs | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserPrefs;
  } catch {
    return null;
  }
};

const savePrefs = (prefs: UserPrefs) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
};

const Index = () => {
  const savedPrefs = loadPrefs();

  const [verified, setVerified] = useState(!!savedPrefs);
  const [role, setRole] = useState<UserRole | null>(savedPrefs?.role ?? null);
  const [email, setEmail] = useState(savedPrefs?.email ?? "");
  const [vault, setVault] = useState<VaultType | null>(savedPrefs?.vault ?? null);
  const [showKnowYourCoins, setShowKnowYourCoins] = useState(false);
  const [hasSeenCoins, setHasSeenCoins] = useState(!!savedPrefs);
  const [activeTab, setActiveTab] = useState<Tab>(savedPrefs ? "home" : "home");
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(6);

  // If returning user has saved prefs, skip onboarding entirely
  const onboardingComplete = !!(role && vault);

  // --- Onboarding screens ---

  if (!verified) {
    return <AgeVerification onVerified={() => setVerified(true)} />;
  }

  if (!role) {
    return (
      <RoleSelection
        onSelect={(selectedRole, selectedEmail) => {
          setRole(selectedRole);
          setEmail(selectedEmail);
          if (selectedRole === "creator") {
            // Creators go to women vault by default (their own vault)
            const prefs: UserPrefs = { email: selectedEmail, role: "creator", vault: "women" };
            setVault("women");
            savePrefs(prefs);
            if (!hasSeenCoins) setShowKnowYourCoins(true);
          }
        }}
      />
    );
  }

  if (role === "customer" && !vault) {
    return (
      <CustomerPreference
        onSelect={(pref) => {
          setVault(pref);
          const prefs: UserPrefs = { email, role: "customer", vault: pref };
          savePrefs(prefs);
          if (!hasSeenCoins) setShowKnowYourCoins(true);
        }}
      />
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

  // --- Main app (creator or customer) ---

  if (role === "creator") {
    // Creator goes to dashboard
    if (showLegal) return <LegalPages onBack={() => setShowLegal(false)} />;
    if (showAdmin) return <MasterAdminPanel onBack={() => setShowAdmin(false)} />;

    return (
      <div className="h-screen overflow-hidden">
        <CreatorAnalyticsDashboard onBack={() => {
          // "Back" from creator dashboard clears session
          localStorage.removeItem(STORAGE_KEY);
          setRole(null);
          setVault(null);
          setVerified(true);
        }} />
      </div>
    );
  }

  // Customer flow
  if (showSearch) {
    return (
      <GlobalSearch
        onCreatorClick={(name) => { setSelectedCreator(name); setShowSearch(false); }}
        onClose={() => setShowSearch(false)}
      />
    );
  }

  if (showLegal) return <LegalPages onBack={() => setShowLegal(false)} />;
  if (showAdmin) return <MasterAdminPanel onBack={() => setShowAdmin(false)} />;

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
        <DiscoveryFeed onCreatorClick={handleCreatorClick} vault={vault!} onSearch={() => setShowSearch(true)} />
      )}
      {activeTab === "trending" && <TrendingPage onCreatorClick={handleCreatorClick} vault={vault!} />}
      {activeTab === "vaults" && (
        <MemberDashboard balance={tokenBalance} onBuyTokens={handleBuyTokens} />
      )}
      {activeTab === "profile" && (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 pb-20">
          <h2 className="text-xl font-bold text-foreground tracking-wider font-display">PROFILE</h2>
          <p className="text-sm text-muted-foreground">{email}</p>
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
          <button
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              setRole(null);
              setVault(null);
              setEmail("");
              setVerified(true);
            }}
            className="text-xs text-muted-foreground hover:text-primary transition-colors mt-4 underline"
          >
            Switch Role / Vault
          </button>
          <button
            onClick={() => setShowLegal(true)}
            className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-2"
          >
            Terms of Service & Privacy Policy
          </button>
          <LegalFooter />
        </div>
      )}
      <BottomNav active={activeTab} onNavigate={setActiveTab} />
    </div>
  );
};

export default Index;
