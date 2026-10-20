import { useCallback, useEffect, useRef, useState } from "react";
import { Crown, Lock, MessageCircle, Send, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ProfileAvatar from "@/components/ProfileAvatar";

interface FanRow {
  rank: number;
  fan_id: string;
  display_name: string;
  avatar_config: unknown;
  total_spent: number;
}

interface FanMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

const MEDAL = ["text-gold", "text-slate-300", "text-amber-600"];

const TopFansSection = ({ creatorId, creatorName, initiallyOpen = false }: { creatorId: string; creatorName: string; initiallyOpen?: boolean }) => {
  const [fans, setFans] = useState<FanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<FanMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [chatOpen, setChatOpen] = useState(initiallyOpen);
  const [activeFan, setActiveFan] = useState<string | null>(null);
  const [messageError, setMessageError] = useState(false);
  const requestRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadFans = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_top_fans", { _creator_id: creatorId });
    if (!error && data) setFans(data as unknown as FanRow[]);
    setLoading(false);
  }, [creatorId]);

  useEffect(() => {
    loadFans();
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, [loadFans]);

  // Auto-refresh the board whenever spending changes anywhere in the app.
  useEffect(() => {
    const channel = supabase
      .channel(`top-fans-${creatorId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, loadFans)
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_requests" }, loadFans)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [creatorId, loadFans]);

  const isCreator = myId === creatorId;
  const myRank = fans.find((f) => f.fan_id === myId)?.rank ?? null;
  const canChat = isCreator || myRank !== null;
  // Each thread is private: one fan + the creator.
  const threadFan = isCreator ? activeFan : myId;

  useEffect(() => {
    if (isCreator && fans.length && !fans.some((fan) => fan.fan_id === activeFan)) setActiveFan(fans[0].fan_id);
  }, [isCreator, fans, activeFan]);

  const loadMessages = useCallback(async () => {
    const request = ++requestRef.current;
    if (!canChat || !threadFan) { setMessages([]); return; }
    const { data, error } = await supabase
      .from("fan_messages")
      .select("id, sender_id, body, created_at")
      .eq("creator_id", creatorId)
      .eq("fan_id", threadFan)
      .order("created_at", { ascending: false })
      .limit(100);
    if (request !== requestRef.current) return;
    setMessageError(Boolean(error));
    if (data) setMessages((data as FanMessage[]).reverse());
  }, [creatorId, canChat, threadFan]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Live messages
  useEffect(() => {
    if (!canChat) return;
    const channel = supabase
      .channel(`fan-msgs-${creatorId}-${threadFan}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fan_messages", filter: `creator_id=eq.${creatorId}` }, loadMessages)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [creatorId, canChat, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, chatOpen]);

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body || !myId || !threadFan || sending) return;
    setSending(true);
    const { error } = await supabase.from("fan_messages").insert({ creator_id: creatorId, sender_id: myId, fan_id: threadFan, body });
    setSending(false);
    if (error) {
      toast({ title: "Message not sent", description: "Private chats are only open while this fan is in the top 10.", variant: "destructive" });
      return;
    }
    setDraft("");
    loadMessages();
  };

  const nameOf = (senderId: string) =>
    senderId === creatorId ? `@${creatorName}` : fans.find((f) => f.fan_id === senderId)?.display_name ?? "Fan";

  return (
    <div className="px-4 mt-8">
      <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
        <Crown className="w-4 h-4 text-gold" />
        Top 10 Fans
      </h3>
      <p className="text-[11px] text-muted-foreground mb-3">
        The top 10 supporters by total spent unlock private messaging with @{creatorName}. Rankings update automatically — outspend someone to take their spot.
      </p>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : fans.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">No fans ranked yet. Be the first to unlock and claim the #1 spot.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {fans.map((f) => (
            <Button key={f.fan_id} variant="ghost" disabled={!isCreator && f.fan_id !== myId} aria-label={`View messages with ${isCreator ? f.display_name : creatorName}`} onClick={() => { if (isCreator) setActiveFan(f.fan_id); setChatOpen(true); }} className={`flex h-auto w-full items-center gap-3 rounded-none px-3 py-2.5 disabled:opacity-100 ${f.fan_id === myId ? "bg-primary/10" : ""}`}>
              <span className={`w-7 text-center text-sm font-bold ${MEDAL[f.rank - 1] ?? "text-muted-foreground"}`}>
                {f.rank}
              </span>
              <ProfileAvatar config={f.avatar_config} label={f.display_name} className="h-8 w-8 border-0" />
              <span className="flex-1 text-sm font-semibold text-foreground truncate">
                <span translate="no">{f.display_name}</span>
                {f.fan_id === myId && <span className="ml-1.5 text-[10px] font-bold text-primary">YOU</span>}
              </span>
              <span className="text-xs font-bold text-primary">${Number(f.total_spent).toFixed(2)}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Messaging */}
      <div className="mt-4">
        {canChat ? (
          <>
            <Button variant="neon" className="w-full h-auto min-h-10 whitespace-normal gap-2" onClick={() => setChatOpen((o) => !o)}>
              <MessageCircle className="w-4 h-4" />
              {chatOpen ? "HIDE MESSAGES" : isCreator ? "PRIVATE CHATS WITH YOUR TOP FANS" : `PRIVATE CHAT WITH @${creatorName.toUpperCase()}`}
            </Button>
            {myRank !== null && !isCreator && (
              <p className="text-center text-[11px] text-gold font-bold mt-1.5">
                You're fan #{myRank} — messaging unlocked
              </p>
            )}
            {chatOpen && isCreator && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {fans.map((f) => (
                  <Button variant="secondary" key={f.fan_id} onClick={() => { setMessages([]); setActiveFan(f.fan_id); }}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${activeFan === f.fan_id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                    #{f.rank} <span translate="no">{f.display_name}</span>
                  </Button>
                ))}
                {fans.length === 0 && <p className="text-xs text-muted-foreground">No top fans yet.</p>}
              </div>
            )}
            {chatOpen && threadFan && (
              <div className="mt-3 bg-card border border-border rounded-xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto p-3 space-y-2">
                  {messageError ? <p role="alert" className="text-sm text-destructive">Couldn't load messages. <Button variant="ghost" onClick={loadMessages}>TRY AGAIN</Button></p> : messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Private chat — only you two can see this. Say hello.</p>
                  ) : messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_id === myId ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${m.sender_id === myId ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                        <p translate="no" className="text-[9px] font-bold opacity-70 mb-0.5">{nameOf(m.sender_id)}</p>
                        <p translate="no" className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="flex items-center gap-2 border-t border-border p-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                    placeholder="Write a message…"
                    maxLength={2000}
                    className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <Button variant="neon" size="sm" aria-label="Send message" onClick={sendMessage} disabled={sending || !draft.trim()} className="px-3">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Lock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground">Messaging is for the Top 10</p>
            <p className="text-xs text-muted-foreground mt-1">
              Unlock content and send requests to climb the board. Reach the top 10 and you can message @{creatorName} directly.
            </p>
            <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={loadFans}>
              <RefreshCw className="w-3.5 h-3.5" />
              REFRESH RANKINGS
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopFansSection;
