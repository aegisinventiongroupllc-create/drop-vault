import { useState, useEffect } from "react";
import AgeVerification from "@/components/AgeVerification";
import LanguageToggle from "@/components/LanguageToggle";
import GlobalPassport from "@/components/GlobalPassport";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import AuthScreen from "@/components/AuthScreen";
import { type UserRole } from "@/components/RoleSelection";
import PostAuthRolePicker from "@/components/PostAuthRolePicker";
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
import { useI18n } from "@/i18n/I18nContext";
import type { VaultType } from "@/lib/tokenEconomy";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { logActivity } from "@/lib/activityLog";

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
  const { t } = useI18n();
  const navigate = useNavigate();
  const savedPrefs = loadPrefs();

  const isAdminOverride = typeof window !== "undefined" && localStorage.getItem("dtt_admin_override") === "1";
  const [verified, setVerified] = useState(() => isAdminOverride || sessionStorage.getItem("dtt_verified") === "1");
  const [role, setRole] = useState<UserRole | null>(savedPrefs?.role ?? null);
  const [email, setEmail] = useState(savedPrefs?.email ?? "");
  const [preference, setPreference] = useState<GenderPreference | null>(savedPrefs?.preference ?? savedPrefs?.vault ?? null);
  const [vault, setVault] = useState<VaultType | null>(savedPrefs?.vault ?? null);
  const [showKnowYourCoins, setShowKnowYourCoins] = useState(false);
  const [hasSeenCoins, setHasSeenCoins] = useState(!!savedPrefs);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(6);
  const [countryFilter, setCountryFilter] = useState("GLOBAL");
  const [authReady, setAuthReady] = useState(false);
  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [roleChosen, setRoleChosen] = useState<boolean>(false);

  // Listen for auth changes + hydrate role from profiles
  useEffect(() => {
    const hydrateRole = async (userId: string, userEmail: string | null) => {
      const { data } = await supabase
        .from("profiles")
        .select("role, role_chosen")
        .eq("user_id", userId)
        .maybeSingle();
      const chosen = !!(data as any)?.role_chosen;
      setRoleChosen(chosen);
      if (userEmail) setEmail(userEmail);
      if (chosen) {
        const dbRole = (data?.role === "creator" ? "creator" : "customer") as UserRole;
        setRole(dbRole);
        if (dbRole === "creator") {
          setVault("women");
          setPreference("women");
          const prefs: UserPrefs = { email: userEmail ?? "", role: "creator", vault: "women", preference: "women" };
          savePrefs(prefs);
        }
      } else {
        // User hasn't picked yet — clear any stale role so the picker shows.
        setRole(null);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthedUserId(session.user.id);
        // Defer Supabase calls to avoid deadlocks inside the callback
        setTimeout(() => hydrateRole(session.user.id, session.user.email ?? null), 0);
      } else {
        setAuthedUserId(null);
        setRoleChosen(false);
      }
      setAuthReady(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthedUserId(session.user.id);
        hydrateRole(session.user.id, session.user.email ?? null);
      }
      setAuthReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const onboardingComplete = !!(role && vault);

  // --- Onboarding screens ---
  if (!verified) {
    return <AgeVerification onVerified={() => {
      sessionStorage.setItem("dtt_verified", "1");
      setVerified(true);
    }} />;
  }

  // Wait for session check before deciding what to render
  if (!authReady) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-xs tracking-widest text-muted-foreground">LOADING…</div>
      </div>
    );
  }

  // Not signed in → show auth (unless admin passcode used)
  if (!authedUserId) {
    return <AuthScreen onAdmin={() => navigate("/admin-portal")} />;
  }

  // Signed in but profile not yet hydrated
  if (!authedUserId) return null;
  // Signed in but user hasn't picked a role yet → ask creator vs customer
  if (!roleChosen) {
    return (
      <PostAuthRolePicker
        email={email}
        onSelect={async (chosenRole) => {
          // Persist choice
          const { error } = await supabase
            .from("profiles")
            .update({ role: chosenRole, role_chosen: true } as any)
            .eq("user_id", authedUserId);
          if (error) {
            console.error("Failed to save role", error);
            return;
          }
          setRole(chosenRole);
          setRoleChosen(true);
          if (chosenRole === "creator") {
            setVault("women");
            setPreference("women");
            savePrefs({ email, role: "creator", vault: "women", preference: "women" });
          } else {
            // Reset any stale customer preference so the "what are you looking for" screen shows
            setPreference(null);
            setVault(null);
          }
        }}
      />
    );
  }

  if (!role) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-xs tracking-widest text-muted-foreground">PREPARING YOUR DASHBOARD…</div>
      </div>
    );
  }

  // Customer preference screen — goes directly to feed after selection
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
      <CreatorAnalyticsDashboard onBack={async () => {
        await supabase.auth.signOut();
        localStorage.removeItem(STORAGE_KEY);
        setRole(null);
        setVault(null);
        setPreference(null);
        setEmail("");
        setAuthedUserId(null);
        setVerified(true);
      }} />
    );
  }

  // --- Customer flow: goes DIRECTLY to discovery feed ---
  if (showSearch) {
    return (
      <GlobalSearch
        onCreatorClick={(name) => { setSelectedCreator(name); setShowSearch(false); }}
        onClose={() => setShowSearch(false)}
      />
    );
  }

  if (showLegal) return <LegalPages onBack={() => setShowLegal(false)} />;

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
    <div className="min-h-[100dvh] overflow-x-hidden">
      {/* "Both" toggle header + Global Passport */}
      {(activeTab === "home" || activeTab === "trending") && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
          <div className="flex items-center justify-between gap-1 py-2 max-w-lg mx-auto px-4">
            <div className="flex items-center gap-1">
              {preference === "both" && (
                <>
                  <button
                    onClick={() => setVault("women")}
                    className={`px-5 py-1.5 rounded-full text-xs font-bold tracking-widest transition-all ${
                      vault === "women" ? "bg-primary text-primary-foreground neon-glow-sm" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {t.women}
                  </button>
                  <button
                    onClick={() => setVault("men")}
                    className={`px-5 py-1.5 rounded-full text-xs font-bold tracking-widest transition-all ${
                      vault === "men" ? "bg-primary text-primary-foreground neon-glow-sm" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {t.men}
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <GlobalPassport selected={countryFilter} onSelect={setCountryFilter} />
              <LanguageToggle />
            </div>
          </div>
        </div>
      )}

      {activeTab === "home" && (
        <DiscoveryFeed
          onCreatorClick={handleCreatorClick}
          vault={vault!}
          onSearch={() => setShowSearch(true)}
          hasVaultToggle={true}
          countryFilter={countryFilter}
        />
      )}
      {activeTab === "trending" && (
        <TrendingPage
          onCreatorClick={handleCreatorClick}
          vault={vault!}
          hasVaultToggle={true}
          countryFilter={countryFilter}
        />
      )}
      {activeTab === "vaults" && (
        <MemberDashboard
          balance={tokenBalance}
          onBuyTokens={handleBuyTokens}
          vault={vault ?? undefined}
          onNavigateHome={() => setActiveTab("home")}
          onCreatorClick={handleCreatorClick}
        />
      )}
      {activeTab === "profile" && (
        <div className="mobile-scroll-shell flex flex-col items-center justify-center gap-4">
          <div className="absolute top-4 right-4">
            <LanguageToggle />
          </div>
          <h2 className="text-xl font-bold text-foreground tracking-wider font-display">{t.profile}</h2>
          <p className="text-sm text-muted-foreground">{email}</p>
          <button
            onClick={() => {
              logActivity("logout", "Customer profile tab").finally(() => {
                supabase.auth.signOut();
              });
              localStorage.removeItem(STORAGE_KEY);
              setRole(null);
              setVault(null);
              setPreference(null);
              setEmail("");
              setAuthedUserId(null);
              setVerified(true);
            }}
            className="px-6 py-2.5 bg-destructive/20 border border-destructive/30 rounded-full text-sm font-bold tracking-wider text-destructive hover:bg-destructive/30 transition-all"
          >
            {t.log_out}
          </button>
          <button
            onClick={() => setShowLegal(true)}
            className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-2"
          >
            {t.terms} & {t.privacy}
          </button>
        </div>
      )}
      <BottomNav active={activeTab} vault={vault ?? undefined} onNavigate={setActiveTab} />
      <PWAInstallPrompt />
    </div>
  );
};

export default Index;
