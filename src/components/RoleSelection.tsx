import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Star } from "lucide-react";

export type UserRole = "creator" | "customer";

interface RoleSelectionProps {
  onSelect: (role: UserRole, email: string) => void;
}

const RoleSelection = ({ onSelect }: RoleSelectionProps) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSelect = (role: UserRole) => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    onSelect(role, trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 px-6 text-center max-w-sm w-full">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider text-foreground mb-1">
            DROPTHAT<span className="text-primary">THING</span>
          </h1>
          <p className="text-muted-foreground text-sm">Welcome! Tell us who you are.</p>
        </div>

        <div className="w-full space-y-2">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            className="w-full text-center"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button
            variant="neon"
            size="lg"
            className="w-full text-base font-semibold gap-2"
            onClick={() => handleSelect("creator")}
          >
            <Star className="w-5 h-5" />
            I'M A CREATOR
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full text-base font-semibold gap-2 border-primary/30 hover:border-primary hover:text-primary"
            onClick={() => handleSelect("customer")}
          >
            <Users className="w-5 h-5" />
            I'M A CUSTOMER
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/50">
          © {new Date().getFullYear()} DTT Media. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default RoleSelection;
