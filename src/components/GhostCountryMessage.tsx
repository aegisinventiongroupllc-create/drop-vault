import { useState } from "react";
import { Globe, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/components/GlobalPassport";
import { supabase } from "@/integrations/supabase/client";

interface GhostCountryMessageProps {
  countryCode: string;
}

const GhostCountryMessage = ({ countryCode }: GhostCountryMessageProps) => {
  const [request, setRequest] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const country = COUNTRIES.find(c => c.code === countryCode);
  const countryName = country?.name ?? countryCode;

  const handleSubmit = async () => {
    if (!request.trim()) return;
    const keyword = `${countryName}: ${request.trim()}`;
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(`https://${projectId}.supabase.co/functions/v1/market-demand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });
    } catch {
      // silent fail — logged server-side
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <Globe className="w-8 h-8 text-primary" />
        </div>
        <p className="text-sm font-bold text-primary">Request logged!</p>
        <p className="text-xs text-muted-foreground">
          We'll prioritize recruiting creators in {countryName}. Thank you for helping us grow.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 px-6 text-center">
      <div className="text-5xl">{country?.flag ?? "🌍"}</div>
      <h3 className="text-lg font-bold text-foreground">
        DTT is currently recruiting in {countryName}!
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Want to see someone here? Type their name or niche below.
      </p>
      <div className="flex gap-2 w-full max-w-xs">
        <input
          type="text"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="e.g. Fitness, Cosplay, Dance..."
          className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
        />
        <Button variant="neon" size="sm" onClick={handleSubmit} disabled={!request.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default GhostCountryMessage;
