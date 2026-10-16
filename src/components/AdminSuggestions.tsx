import { useEffect, useState } from "react";
import { getAdminPasscode } from "@/lib/adminSession";

interface Suggestion {
  id: string; role: string | null; original_text: string; english_text: string | null;
  source_lang: string | null; anonymous: boolean; created_at: string;
}

/** Owner inbox: every suggestion with an English translation. */
const AdminSuggestions = () => {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-finance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-passcode": getAdminPasscode() },
        body: JSON.stringify({ action: "suggestions" }),
      });
      const d = await res.json();
      setItems(Array.isArray(d?.suggestions) ? d.suggestions : []);
    } catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="px-4 space-y-3 notranslate" translate="no">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">Suggestions (translated to English)</p>
          <p className="text-xs text-muted-foreground">Ideas from creators and customers worldwide</p>
        </div>
        <button onClick={() => void load()} className="text-xs font-bold text-primary">{loading ? "LOADING..." : "REFRESH"}</button>
      </div>
      {items.length === 0 && <p className="text-xs text-muted-foreground">{loading ? "Loading..." : "No suggestions yet."}</p>}
      {items.map((s) => (
        <div key={s.id} className="rounded-xl border border-border bg-card p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {s.role ?? "user"} · {s.anonymous ? "anonymous" : "named"} · {(s.source_lang ?? "?").toUpperCase()} · {new Date(s.created_at).toLocaleString()}
          </p>
          <p className="text-sm text-foreground">{s.english_text || s.original_text}</p>
          {s.english_text && s.english_text !== s.original_text && (
            <p className="text-xs text-muted-foreground italic">Original: {s.original_text}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminSuggestions;
