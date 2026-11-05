import { useEffect, useState } from "react";

export function useIntroEntryReady(show: boolean) {
  const [entryReady, setEntryReady] = useState(false);
  useEffect(() => {
    setEntryReady(false);
    if (!show) return;
    const timer = window.setTimeout(() => setEntryReady(true), 3000);
    return () => window.clearTimeout(timer);
  }, [show]);
  return entryReady;
}