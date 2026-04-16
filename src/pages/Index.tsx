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
  preference?: GenderPreference;
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
  const [preference, setPreference] = useState<GenderPreference | null>(savedPrefs?.preference ?? savedPrefs?.vault ?? null);
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
            const prefs: UserPrefs = { email: selectedEmail, role: "creator", vault: "women", preference: "women" };
            setVault("women");
            setPreference("women");
            savePrefs(prefs);
            if (!hasSeenCoins) setShowKnowYourCoins(true);
          }
        }}
      />
    );
  }

  if (role === "customer" && !preference) {
    return (
      <CustomerPreference
        onSelect={(pref) => {
          setPreference(pref);
          const activeVault: VaultType = pref === "both" ? "women" : pref;
          setVault(activeVault);
          const prefs: UserPrefs = { email, role: "customer", vault: activeVault, preference: pref };
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

  // --- Creator flow ---
  if (role === "creator") {
    if (showLegal) return <LegalPages onBack={() => setShowLegal(false)} />;
    if (showAdmin) return <MasterAdminPanel onBack={() => setShowAdmin(false)} />;
    return (
      <div className="h-screen overflow-hidden">
        <CreatorAnalyticsDashboard onBack={() => {
          localStorage.removeItem(STORAGE_KEY);
          setRole(null);
          setVault(null);
          setPreference(null);
          setVerified(true);
        }} />
      </div>
    );
  }

  // --- Customer flow ---
  if (showSearch) {
    return (
      <GlobalSearch
        onCreatorClick={(name) => { setSelectedCreator(name); setShowSearch(false); }}
        onClose={() => setShowSearch(false)}
      />
    );
  }

  if (showLegal) return <LegalPages onBack={() => setShowLegal(false)} />;

  // Customers do NOT see admin panel — this is hidden
  // if (showAdmin) return <MasterAdminPanel ... />;

  if (selectedCreator) {
    return (
      <>
        <CreatorProfile creatorName={selectedCreator} onBack={() => setSelectedCreator(null)} />
        <BottomNav active={activeTab} vault={vault ?? undefined} onNavigate={(tab) => { setSelectedCreator(null); setActiveTab(tab); }} />
      </>
    );
  }

  const handleCreatorClick = (name: string) => setSelectedCreator(name);
  const handleBuyTokens = (n: number) => setTokenBalance(prev => prev + n);

  return (
    <div className="h-screen overflow-hidden">
      {/* "Both" toggle header */}
      {preference === "both" && (activeTab === "home" || activeTab === "trending") && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
          <div className="flex items-center justify-center gap-1 py-2 max-w-lg mx-auto">
            <button
              onClick={() => setVault("women")}
              className={`px-5 py-1.5 rounded-full text-xs font-bold tracking-widest transition-all ${
                vault === "women" ? "bg-primary text-primary-foreground neon-glow-sm" : "bg-secondary text-muted-foreground"
              }`}
            >
              WOMEN
            </button>
            <button
              onClick={() => setVault("men")}
              className={`px-5 py-1.5 rounded-full text-xs font-bold tracking-widest transition-all ${
                vault === "men" ? "bg-primary text-primary-foreground neon-glow-sm" : "bg-secondary text-muted-foreground"
              }`}
            >
              MEN
            </button>
          </div>
        </div>
      )}

      {activeTab === "home" && (
        <DiscoveryFeed
          onCreatorClick={handleCreatorClick}
          vault={vault!}
          onSearch={() => setShowSearch(true)}
          hasVaultToggle={preference === "both"}
        />
      )}
      {activeTab === "trending" && <TrendingPage onCreatorClick={handleCreatorClick} vault={vault!} hasVaultToggle={preference === "both"} />}
      {activeTab === "vaults" && (
        <MemberDashboard balance={tokenBalance} onBuyTokens={handleBuyTokens} />
      )}
      {activeTab === "profile" && (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 pb-20">
          <h2 className="text-xl font-bold text-foreground tracking-wider font-display">PROFILE</h2>
          <p className="text-sm text-muted-foreground">{email}</p>
          {/* Customer sees ONLY logout and legal — no creator dashboard or admin */}
          <button
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              setRole(null);
              setVault(null);
              setPreference(null);
              setEmail("");
              setVerified(true);
            }}
            className="px-6 py-2.5 bg-destructive/20 border border-destructive/30 rounded-full text-sm font-bold tracking-wider text-destructive hover:bg-destructive/30 transition-all"
          >
            LOG OUT
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
      <BottomNav active={activeTab} vault={vault ?? undefined} onNavigate={setActiveTab} />
    </div>
  );
};

export default Index;
