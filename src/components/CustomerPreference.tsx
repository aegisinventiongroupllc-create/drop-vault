import { Button } from "@/components/ui/button";
import LegalFooter from "@/components/LegalFooter";

export type GenderPreference = "women" | "men" | "both";

interface CustomerPreferenceProps {
  onSelect: (pref: GenderPreference) => void;
}

const CustomerPreference = ({ onSelect }: CustomerPreferenceProps) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center">
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

      </div>
      <LegalFooter />
      </div>
    </div>
  );
};

export default CustomerPreference;
