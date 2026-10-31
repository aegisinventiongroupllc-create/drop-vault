import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import LanguageToggle from "@/components/LanguageToggle";

export default function SiteLanguagePicker() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return <div className={`fixed right-4 z-[240] notranslate ${signedIn ? "bottom-24" : "top-3"}`} translate="no">
    <LanguageToggle prominent placement={signedIn ? "above" : "below"} />
  </div>;
}