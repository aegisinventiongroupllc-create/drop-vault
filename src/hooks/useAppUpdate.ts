import { useEffect, useRef } from "react";
import { toast } from "sonner";

// Polls index.html every 60s. When the etag/last-modified changes,
// shows a sticky "New version available — tap to refresh" toast.
export function useAppUpdate(intervalMs = 60_000) {
  const lastTagRef = useRef<string | null>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/index.html?_=${Date.now()}`, {
          method: "HEAD",
          cache: "no-store",
        });
        const tag =
          res.headers.get("etag") ||
          res.headers.get("last-modified") ||
          res.headers.get("content-length");
        if (!tag) return;
        if (lastTagRef.current === null) {
          lastTagRef.current = tag;
          return;
        }
        if (tag !== lastTagRef.current && !shownRef.current && !cancelled) {
          shownRef.current = true;
          toast("New version available", {
            description: "Tap refresh to load the latest update.",
            duration: Infinity,
            action: {
              label: "Refresh",
              onClick: () => window.location.reload(),
            },
          });
        }
      } catch {
        // offline or blocked — ignore
      }
    };

    check();
    const id = setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);
}
