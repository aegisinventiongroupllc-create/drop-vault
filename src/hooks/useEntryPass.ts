import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EntryPassStatus = "loading" | "active" | "none";

export interface EntryPassState {
  status: EntryPassStatus;
  expiresAt: string | null;
  refresh: () => Promise<void>;
}

/**
 * Tracks the signed-in user's active Vault Entry Pass.
 * The pass is server-credited by payment webhooks (entry_passes table),
 * so client code can only read it, never grant it.
 */
export function useEntryPass(enabled: boolean): EntryPassState {
  const [status, setStatus] = useState<EntryPassStatus>("loading");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) {
        setStatus("none");
        setExpiresAt(null);
        return;
      }
      const { data, error } = await supabase
        .from("entry_passes")
        .select("expires_at")
        .eq("user_id", uid)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = data?.[0];
      if (row) {
        setStatus("active");
        setExpiresAt(row.expires_at);
      } else {
        setStatus("none");
        setExpiresAt(null);
      }
    } catch {
      // Fail closed: without a readable pass the gate stays up.
      setStatus("none");
      setExpiresAt(null);
    }
  }, []);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  return { status, expiresAt, refresh };
}
