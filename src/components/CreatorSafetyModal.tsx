import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCreatorText } from "@/i18n/creator";

const CreatorSafetyModal = ({ onAgree }: { onAgree: () => void }) => {
  const [agreed, setAgreed] = useState(false);
  const ct = useCreatorText();

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden">
        <div className="bg-primary/10 border-b border-primary/30 px-6 py-4 text-center">
          <h2 className="font-display text-base font-bold tracking-wider text-foreground">
            {ct.safety_title}
          </h2>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
            <p>{ct.safety_welcome}</p>
            <p><span className="text-foreground font-medium">{ct.safety_content_h}</span> {ct.safety_content}</p>
            <p><span className="text-foreground font-medium">{ct.safety_age_h}</span> {ct.safety_age}</p>
            <p><span className="text-foreground font-medium">{ct.safety_rev_h}</span> {ct.safety_rev}</p>
            <p><span className="text-foreground font-medium">{ct.safety_priv_h}</span> {ct.safety_priv}</p>
            <p>{ct.safety_contact} <a href="mailto:dropthatthingmedia@gmail.com" className="text-primary underline">dropthatthingmedia@gmail.com</a></p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-xs text-foreground">
              {ct.safety_agree}
            </span>
          </label>

          <Button variant="neon" className="w-full" disabled={!agreed} onClick={onAgree}>
            {ct.agree_continue}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatorSafetyModal;
