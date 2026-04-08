import { useState } from "react";
import { Button } from "@/components/ui/button";

const SuggestionBox = () => {
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!text.trim()) return;
    // In production this would hit an edge function / database
    console.log("Suggestion submitted:", { text, anonymous });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setText("");
      setAnonymous(false);
    }, 3000);
  };

  return (
    <div className="bg-[hsl(0,0%,2%)] border border-primary/30 rounded-xl overflow-hidden">
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
            <p className="text-xs text-muted-foreground">Help us build the perfect Vault. What features should we add next?</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your ideas..."
              className="w-full h-24 bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-xs text-muted-foreground">Send Anonymously</span>
            </label>
            <Button variant="neon" className="w-full" disabled={!text.trim()} onClick={handleSubmit}>
              SUBMIT FEEDBACK
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuggestionBox;
