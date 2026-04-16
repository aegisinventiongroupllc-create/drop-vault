import type { VaultType } from "@/lib/tokenEconomy";
import { useI18n } from "@/i18n/I18nContext";
import LegalFooter from "@/components/LegalFooter";

type Tab = "home" | "trending" | "vaults" | "profile";

interface BottomNavProps {
  active: Tab;
  onNavigate: (tab: Tab) => void;
  vault?: VaultType;
}

const BottomNav = ({ active, onNavigate, vault }: BottomNavProps) => {
  const { t } = useI18n();

  const libraryLabel = vault === "men" ? t.nav_my_guys : vault === "women" ? t.nav_my_girls : t.nav_my_library;

  const items: { id: Tab; label: string }[] = [
    { id: "home", label: t.nav_live },
    { id: "trending", label: t.nav_trending },
    { id: "vaults", label: libraryLabel },
    { id: "profile", label: t.nav_profile },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {items.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`text-xs font-bold tracking-widest transition-all active:scale-95 ${
              active === id ? "text-primary" : "text-foreground/70 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="border-t border-border/50">
        <div className="max-w-lg mx-auto">
          <LegalFooter />
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
export type { Tab };
