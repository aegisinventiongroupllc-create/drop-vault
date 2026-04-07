import WalletIndicator from "@/components/WalletIndicator";

const TRENDING = [
  { rank: 1, creator: "LunaCosplay", views: "1.2M", category: "Cosplay" },
  { rank: 2, creator: "FitJessie", views: "890K", category: "Gym" },
  { rank: 3, creator: "BlondieVibes", views: "756K", category: "Blondes" },
  { rank: 4, creator: "TwinFlames", views: "623K", category: "Groups" },
  { rank: 5, creator: "PetiteSophie", views: "512K", category: "Short Girls" },
  { rank: 6, creator: "NeonQueen", views: "480K", category: "Cosplay" },
  { rank: 7, creator: "GymRat_Anna", views: "445K", category: "Gym" },
  { rank: 8, creator: "DuoVibes", views: "398K", category: "Groups" },
];

const TrendingPage = ({ onCreatorClick }: { onCreatorClick: (name: string) => void }) => {
  return (
    <div className="min-h-screen pb-20">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground tracking-wider font-display">
          TRENDING
        </h1>
        <WalletIndicator />
      </div>

      <div className="px-4 space-y-3">
        {TRENDING.map((item) => (
          <button
            key={item.rank}
            onClick={() => onCreatorClick(item.creator)}
            className="w-full flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all"
          >
            <span className={`text-2xl font-bold font-display w-8 text-right ${item.rank <= 3 ? "text-primary neon-text" : "text-muted-foreground"}`}>
              {item.rank}
            </span>
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-primary">
              {item.creator.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-foreground">@{item.creator}</p>
              <p className="text-xs text-muted-foreground">{item.category}</p>
            </div>
            <div className="text-muted-foreground">
              <span className="text-sm font-medium">{item.views}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TrendingPage;
