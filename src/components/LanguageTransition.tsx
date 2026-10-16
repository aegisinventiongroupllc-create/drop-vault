import { useEffect, useState } from "react";
import { LANGUAGE_TRANSITION_KEY, languageSecondsLeft } from "@/lib/languageTransition";

export default function LanguageTransition() {
  const [start, setStart] = useState(() => Number(sessionStorage.getItem(LANGUAGE_TRANSITION_KEY)) || 0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => { setStart(Number(sessionStorage.getItem(LANGUAGE_TRANSITION_KEY)) || 0); setNow(Date.now()); };
    window.addEventListener("dtt-language-transition", update);
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => { window.clearInterval(timer); window.removeEventListener("dtt-language-transition", update); };
  }, []);
  const seconds = languageSecondsLeft(start, now);
  useEffect(() => { if (start && !seconds) sessionStorage.removeItem(LANGUAGE_TRANSITION_KEY); }, [start, seconds]);
  if (!seconds || !start) return null;
  return <div role="dialog" aria-modal="true" aria-label="Changing language" translate="no" className="notranslate fixed inset-0 z-[250] bg-background/95 backdrop-blur-md flex items-center justify-center">
    <div className="flex flex-col items-center gap-4 text-foreground">
      <div className="relative h-20 w-20 flex items-center justify-center">
        <span className="absolute inset-0 rounded-full border-4 border-muted border-t-primary motion-safe:animate-spin" />
        <span role="timer" className="text-2xl font-bold tabular-nums">{seconds}</span>
      </div>
      <span className="font-bold text-primary uppercase">{localStorage.getItem("dtt_auto_lang") || localStorage.getItem("dtt_locale") || "EN"}</span>
    </div>
  </div>;
}