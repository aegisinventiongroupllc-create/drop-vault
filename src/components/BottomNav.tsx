type Tab = "home" | "trending" | "vaults" | "profile";

const BottomNav = ({ active, onNavigate }: { active: Tab; onNavigate: (tab: Tab) => void }) => {
  const items: { id: Tab; label: string }[] = [
    { id: "home", label: "LIVE" },
    { id: "trending", label: "TRENDING" },
    { id: "vaults", label: "VAULTS" },
    { id: "profile", label: "PROFILE" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {items.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`text-xs font-bold tracking-widest transition-colors ${
              active === id ? "text-primary" : "text-foreground/70 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
export type { Tab };
