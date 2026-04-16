import { Button } from "@/components/ui/button";

export type GenderPreference = "women" | "men" | "both";

interface CustomerPreferenceProps {
  onSelect: (pref: GenderPreference) => void;
}

const CustomerPreference = ({ onSelect }: CustomerPreferenceProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 px-6 text-center max-w-sm w-full">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider text-foreground mb-1">
            DROPTHAT<span className="text-primary">THING</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">Who are you looking for?</p>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <Button
            variant="neon"
            size="lg"
            className="w-full text-lg font-bold tracking-wider py-8"
            onClick={() => onSelect("women")}
          >
            WOMEN
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full text-lg font-bold tracking-wider py-8 border-primary/30 hover:border-primary hover:text-primary"
            onClick={() => onSelect("men")}
          >
            MEN
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full text-base font-bold tracking-wider py-6 border-accent/30 hover:border-accent hover:text-accent"
            onClick={() => onSelect("both")}
          >
            BOTH
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/50">
          © {new Date().getFullYear()} DTT Media LLC. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default CustomerPreference;
