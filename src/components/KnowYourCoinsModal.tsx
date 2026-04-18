import { Button } from "@/components/ui/button";
import { TOKEN_VALUE_USD } from "@/lib/tokenEconomy";

const KnowYourCoinsModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden">
        <div className="bg-primary/10 border-b border-primary/30 px-6 py-4 text-center">
          <h2 className="font-display text-lg font-bold tracking-wider text-foreground">
            KNOW YOUR COINS
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Understanding Bit-Tokens</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-secondary rounded-xl p-4 border border-primary/30 neon-glow-sm">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-sm font-bold text-gold-foreground">B</span>
                <span className="text-sm font-semibold text-foreground">1 Bit-Token</span>
              </div>
              <span className="text-lg font-bold text-primary">${TOKEN_VALUE_USD}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p>• <span className="text-foreground font-medium">1 Bit-Token</span> = 14 days of full access to ONE Creator Profile</p>
            <p>• Access auto-locks after 14 days — no stacking</p>
            <p>• Custom Requests are flat $1 per request</p>
          </div>

          <Button variant="neon" className="w-full" onClick={onClose}>
            GOT IT — LET'S GO
          </Button>
        </div>
      </div>
    </div>
  );
};

export default KnowYourCoinsModal;
