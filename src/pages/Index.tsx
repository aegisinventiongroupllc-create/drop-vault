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
import LegalFooter from "@/components/LegalFooter";
import ProfileIdentityEditor from "@/components/ProfileIdentityEditor";
import { useTokenBalance } from "@/hooks/useTokenBalance";

const STORAGE_KEY = "dtt_user_prefs";
const ACTIVE_TAB_KEY = "dtt_active_tab";
const VALID_TABS: Tab[] = ["home", "trending", "vaults", "profile"];

const loadActiveTab = (): Tab => {
  try {
    const stored = sessionStorage.getItem(ACTIVE_TAB_KEY) as Tab | null;
    return stored && VALID_TABS.includes(stored) ? stored : "home";
  } catch {
    return "home";
  }
};

interface UserPrefs {
  email: string;
  role: UserRole;
  vault?: VaultType;
  preference?: GenderPreference;
}

interface AccountPreference {
  account_type: UserRole | null;
  customer_preference: GenderPreference | null;
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
  const [activeTab, setActiveTab] = useState<Tab>(loadActiveTab);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const { balance: tokenBalance, refresh: refreshTokenBalance } = useTokenBalance();
  const [countryFilter, setCountryFilter] = useState("GLOBAL");
  const [authReady, setAuthReady] = useState(false);
  const [roleHydrated, setRoleHydrated] = useState(false);
  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [roleChosen, setRoleChosen] = useState<boolean>(false);

  // Listen for auth changes and restore the account's saved dashboard choice.
  useEffect(() => {
    const hydrateRole = async (userId: string, userEmail: string | null) => {
      const { data, error } = await supabase
        .from("account_preferences")
        .select("account_type, customer_preference")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) console.error("Failed to restore account preference", error);
      const preferenceRow = data as AccountPreference | null;
      const dbRole = preferenceRow?.account_type ?? null;
      const chosen = dbRole === "creator" || dbRole === "customer";
      setRoleChosen(chosen);
      if (userEmail) setEmail(userEmail);
      if (chosen) {
        setRole(dbRole);
        if (dbRole === "creator") {
          setVault("women");
          setPreference("women");
          const prefs: UserPrefs = { email: userEmail ?? "", role: "creator", vault: "women", preference: "women" };
          savePrefs(prefs);
        } else if (preferenceRow?.customer_preference) {
          const customerPreference = preferenceRow.customer_preference;
          const activeVault: VaultType = customerPreference === "both" ? "women" : customerPreference;
          setPreference(customerPreference);
          setVault(activeVault);
          savePrefs({ email: userEmail ?? "", role: "customer", vault: activeVault, preference: customerPreference });
        } else {
          setPreference(null);
          setVault(null);
        }
      } else {
        // User hasn't picked yet — clear any stale role so the picker shows.
        setRole(null);
      }
      setRoleHydrated(true);
    };

    // Track which user we've already hydrated so token refreshes / tab refocus
    // (e.g. returning from the phone camera) never unmount the current screen.
    let hydratedUserId: string | null = null;
    const handleSession = (userId: string | null, userEmail: string | null, defer: boolean) => {
      if (userId) {
        setAuthedUserId(userId);
        if (hydratedUserId !== userId) {
          hydratedUserId = userId;
          setRoleHydrated(false);
          if (defer) setTimeout(() => hydrateRole(userId, userEmail), 0);
          else hydrateRole(userId, userEmail);
        }
      } else {
        hydratedUserId = null;
        setAuthedUserId(null);
        setRoleChosen(false);
        setRoleHydrated(true);
      }
      setAuthReady(true);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer Supabase calls to avoid deadlocks inside the callback
      handleSession(session?.user?.id ?? null, session?.user?.email ?? null, true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session?.user?.id ?? null, session?.user?.email ?? null, false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const onboardingComplete = !!(role && vault);

  const navigateToTab = (tab: Tab) => {
    sessionStorage.setItem(ACTIVE_TAB_KEY, tab);
    setActiveTab(tab);
  };

  const exitCreatorPreview = () => {
    try { localStorage.removeItem("dtt_admin_view_as_creator"); } catch {}
    navigate("/admin-portal");
  };
  const adminCreatorPreview =
    typeof window !== "undefined" && localStorage.getItem("dtt_admin_view_as_creator") === "1";

  // --- Admin "View as Creator" preview ---
  if (adminCreatorPreview && verified && authReady) {
    return (
      <div className="min-h-[100dvh]">
        <div className="fixed top-0 left-0 right-0 z-[70] bg-primary text-primary-foreground flex items-center justify-between px-4 py-2">
          <span className="text-[10px] font-bold tracking-widest">ADMIN PREVIEW — CREATOR VIEW</span>
          <button onClick={exitCreatorPreview} className="text-[10px] font-bold tracking-widest underline">
            EXIT TO ADMIN
          </button>
        </div>
        <div className="pt-9">
          <CreatorAnalyticsDashboard onBack={exitCreatorPreview} adminPreview />
        </div>
      </div>
    );
  }

  // --- Onboarding screens ---
  if (!verified) {
    return <AgeVerification onVerified={() => {
      sessionStorage.setItem("dtt_verified", "1");
      setVerified(true);
    }} />;
  }

  // Wait for session check before deciding what to render
  if (!authReady || (authedUserId && !roleHydrated)) {
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
          const { error } = await supabase.rpc("set_my_account_type", { _account_type: chosenRole });
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
          supabase
            .from("account_preferences")
            .update({ customer_preference: pref })
            .eq("user_id", authedUserId)
            .then(({ error }) => {
              if (error) console.error("Failed to save customer preference", error);
            });
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
        setRoleChosen(false);
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
        <BottomNav active={activeTab} vault={vault ?? undefined} onNavigate={(tab) => { setSelectedCreator(null); navigateToTab(tab); }} />
      </>
    );
  }

  const handleCreatorClick = (name: string) => setSelectedCreator(name);
  const handleBuyTokens = () => { void refreshTokenBalance(); };

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
          onNavigateHome={() => navigateToTab("home")}
          onCreatorClick={handleCreatorClick}
        />
      )}
      {activeTab === "profile" && (
        <div className="mobile-scroll-shell flex flex-col">
          <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16">
            <div className="absolute top-4 right-4">
              <LanguageToggle />
            </div>
            <h2 className="text-xl font-bold text-foreground tracking-wider font-display">{t.profile}</h2>
            <ProfileIdentityEditor />
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
                setRoleChosen(false);
                setVerified(true);
              }}
              className="px-6 py-2.5 bg-destructive/20 border border-destructive/30 rounded-full text-sm font-bold tracking-wider text-destructive hover:bg-destructive/30 transition-all"
            >
              {t.log_out}
            </button>
          </div>
          <LegalFooter />
        </div>
      )}
      <BottomNav active={activeTab} vault={vault ?? undefined} onNavigate={navigateToTab} />
      <PWAInstallPrompt />
    </div>
  );
};

export default Index;
