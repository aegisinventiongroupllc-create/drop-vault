import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getTargetLang } from "@/components/AutoTranslator";

const SuggestionBox = ({ role = "creator" }: { role?: "creator" | "customer" }) => {
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    const { data, error: err } = await supabase.functions.invoke("submit-suggestion", {
      body: { text, anonymous, role, lang: getTargetLang() },
    });
    setSending(false);
    if (err || !data?.ok) { setError("Could not send. Please try again."); return; }
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setText(""); setAnonymous(false); }, 3000);
  };

  return (
    <div className="bg-card border border-primary/30 rounded-xl overflow-hidden">
      <div className="bg-primary/10 border-b border-primary/30 px-4 py-3">
        <h3 className="text-sm font-bold text-primary tracking-wider font-display">PLATFORM SUGGESTION BOX</h3>
      </div>
      <div className="p-4">
        {submitted ? (
          <div className="text-center py-6">
            <p className="text-sm text-foreground font-medium">Suggestion received. Thank you for making the Vault better!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Help us build the perfect Vault. Write in any language.</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              placeholder="Share your ideas..."
              className="w-full h-24 bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="w-4 h-4 rounded border-border accent-primary" />
              <span className="text-xs text-muted-foreground">Send Anonymously</span>
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button variant="neon" className="w-full" disabled={!text.trim() || sending} onClick={() => void handleSubmit()}>
              {sending ? "SENDING..." : "SUBMIT FEEDBACK"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuggestionBox;
