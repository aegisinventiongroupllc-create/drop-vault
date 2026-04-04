import { Home, TrendingUp, PlusCircle, Lock, User } from "lucide-react";

type Tab = "home" | "trending" | "upload" | "vaults" | "profile";

const BottomNav = ({ active, onNavigate }: { active: Tab; onNavigate: (tab: Tab) => void }) => {
  const items: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: "home", icon: Home, label: "Home" },
    { id: "trending", icon: TrendingUp, label: "Trending" },
    { id: "upload", icon: PlusCircle, label: "Upload" },
    { id: "vaults", icon: Lock, label: "Vaults" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {items.map(({ id, icon: Icon, label }) => {
          const isUpload = id === "upload";
          const isActive = active === id;

          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isUpload ? "" : isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isUpload ? (
                <div className="w-12 h-12 -mt-5 rounded-full bg-primary flex items-center justify-center neon-glow">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
              ) : (
                <>
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
export type { Tab };
