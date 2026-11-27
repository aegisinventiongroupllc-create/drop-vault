import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePersonalGlobe } from "@/lib/userTheme";
import { signTeaser } from "@/lib/teaserUrls";
import { FEED_CATEGORIES, FeedCategory, FeedTab, feedCountry, flagOf, plainCaption, postLink } from "@/lib/feed";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Post = { id: string; creator_id: string; country_code: string; creator_category: string; caption: string; media_path: string | null; media_type: string | null; vault_preview: boolean; created_at: string; display_name: string | null; likes: number; comments: number; liked: boolean };
type Comment = { id: string; user_id: string; body: string; created_at: string };

const CAT_LABEL: Record<string, string> = { women: "Women", men: "Men", trans_women: "Trans Women", trans_men: "Trans Men" };

function Media({ path, type }: { path: string; type: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const load = useCallback(async () => { const r = await signTeaser(path); setUrl(r.data?.signedUrl ?? null); }, [path]);
  if (!url) return <button onClick={() => void load()} className="flex aspect-[4/5] w-full items-center justify-center rounded-xl bg-muted text-xs font-bold tracking-widest text-foreground">TAP TO PLAY TEASER</button>;
  return type === "video"
    ? <video src={url} className="w-full rounded-xl" controls autoPlay playsInline onError={() => setUrl(null)} />
    : <img src={url} alt="" className="w-full rounded-xl" onError={() => setUrl(null)} />;
}

function Comments({ post, me, onCount }: { post: Post; me: string | null; onCount: (n: number) => void }) {
  const [rows, setRows] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const load = useCallback(async () => {
    const { data } = await supabase.from("feed_post_comments").select("id,user_id,body,created_at").eq("post_id", post.id).order("created_at").limit(100);
    setRows(data ?? []); onCount(data?.length ?? 0);
  }, [post.id, onCount]);
  useEffect(() => { void load(); }, [load]);
  const send = async () => {
    if (!me || !text.trim()) return;
    const { error } = await supabase.from("feed_post_comments").insert({ post_id: post.id, user_id: me, body: text.trim().slice(0, 500) });
    if (error) toast.error("Couldn't post your comment."); else { setText(""); void load(); }
  };
  const remove = async (id: string) => { await supabase.from("feed_post_comments").delete().eq("id", id); void load(); };
  return <div className="space-y-2 border-t border-border pt-3">
    {rows.map(c => <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
      <p className="whitespace-pre-wrap break-words text-foreground">{c.body}</p>
      {(c.user_id === me || post.creator_id === me) && <button onClick={() => void remove(c.id)} className="text-[10px] font-bold text-muted-foreground">DELETE</button>}
    </div>)}
    <div className="flex gap-2">
      <input value={text} maxLength={500} onChange={e => setText(e.target.value)} placeholder="Write a reply…" aria-label="Write a reply" className="flex-1 rounded-full border border-border bg-background/60 px-3 py-2 text-sm text-foreground" />
      <Button size="sm" onClick={() => void send()}>REPLY</Button>
    </div>
  </div>;
}

function PostCard({ post, me, tone, onTip, onUnlock }: { post: Post; me: string | null; tone: string; onTip: (name: string) => void; onUnlock: (name: string) => void }) {
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(Number(post.likes));
  const [comments, setComments] = useState(Number(post.comments));
  const [open, setOpen] = useState(false);
  const name = post.display_name || "Creator";
  const toggleLike = async () => {
    if (!me) return;
    const next = !liked; setLiked(next); setLikes(n => n + (next ? 1 : -1));
    const { error } = next ? await supabase.from("feed_post_likes").insert({ post_id: post.id, user_id: me }) : await supabase.from("feed_post_likes").delete().eq("post_id", post.id).eq("user_id", me);
    if (error) { setLiked(!next); setLikes(n => n + (next ? -1 : 1)); }
  };
  const share = async () => { await navigator.clipboard?.writeText(postLink(window.location.origin, post.id)); toast.success("Post link copied"); };
  return <article className="rounded-2xl border bg-card/80 p-4 backdrop-blur-sm space-y-3" style={{ borderColor: `color-mix(in srgb, ${tone} 45%, transparent)`, boxShadow: `0 0 18px color-mix(in srgb, ${tone} 18%, transparent)` }}>
    <header className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-foreground" style={{ background: `color-mix(in srgb, ${tone} 35%, transparent)` }}>{name.slice(0, 1).toUpperCase()}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-foreground">{name} <span style={{ color: tone }} aria-label="Verified creator">✔</span></p>
        <p className="text-[11px] text-muted-foreground">{flagOf(post.country_code)} {post.country_code} · <span className="font-bold" style={{ color: tone }}>{CAT_LABEL[post.creator_category]}</span> · {new Date(post.created_at).toLocaleString()}</p>
      </div>
    </header>
    {post.caption && <p className="whitespace-pre-wrap break-words text-sm text-foreground">{plainCaption(post.caption)}</p>}
    {post.media_path && !post.vault_preview && <Media path={post.media_path} type={post.media_type} />}
    {post.vault_preview && <div className="relative overflow-hidden rounded-xl">
      <div className="aspect-[4/5] w-full blur-xl" style={{ background: `radial-gradient(circle, ${tone}, transparent 75%)` }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/40">
        <p className="text-xs font-bold tracking-widest text-foreground">LOCKED VAULT PREVIEW</p>
        <Button onClick={() => onUnlock(name)}>UNLOCK VAULT (1 BIT-TOKEN / 14 DAYS)</Button>
      </div>
    </div>}
    <div className="flex items-center justify-between text-xs font-bold tracking-widest">
      <button onClick={() => void toggleLike()} aria-pressed={liked} style={liked ? { color: tone } : undefined} className="text-muted-foreground">{liked ? "♥" : "♡"} LIKE · {likes}</button>
      <button onClick={() => setOpen(o => !o)} className="text-muted-foreground">COMMENTS · {comments}</button>
      <button onClick={() => void share()} className="text-muted-foreground">SHARE</button>
      <button onClick={() => onTip(name)} className="text-muted-foreground">TIP</button>
    </div>
    {open && <Comments post={post} me={me} onCount={setComments} />}
  </article>;
}

function Composer({ me, tone, onPosted }: { me: string; tone: string; onPosted: () => void }) {
  const [caption, setCaption] = useState("");
  const [teasers, setTeasers] = useState<{ id: string; title: string | null }[]>([]);
  const [mediaId, setMediaId] = useState("");
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void supabase.from("creator_media").select("id,title").eq("creator_id", me).eq("bucket", "teasers").order("created_at", { ascending: false }).limit(20).then(({ data }) => setTeasers(data ?? [])); }, [me]);
  const post = async () => {
    setBusy(true);
    const { error } = await supabase.from("feed_posts").insert({ creator_id: me, caption: caption.slice(0, 1000), media_id: mediaId || null, vault_preview: locked, country_code: "XX", creator_category: "women" });
    setBusy(false);
    if (error) toast.error(error.message.includes("APPROVED") ? "Posting opens after your age check is approved." : error.message.includes("COUNTRY") ? "Add your country and category in your profile first." : "Couldn't post. Try again.");
    else { setCaption(""); setMediaId(""); setLocked(false); onPosted(); }
  };
  return <section className="rounded-2xl border bg-card/80 p-4 space-y-3" style={{ borderColor: tone }} aria-label="Create post">
    <h2 className="text-xs font-bold tracking-widest text-foreground">CREATE POST</h2>
    <Textarea value={caption} maxLength={1000} onChange={e => setCaption(e.target.value)} placeholder="Share an update with your fans…" aria-label="Post text" />
    <select value={mediaId} onChange={e => setMediaId(e.target.value)} aria-label="Add a teaser" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
      <option value="">No teaser</option>
      {teasers.map(t => <option key={t.id} value={t.id}>{t.title || "Teaser"}</option>)}
    </select>
    <label className="flex items-center gap-2 text-xs text-foreground"><input type="checkbox" checked={locked} onChange={e => setLocked(e.target.checked)} /> Show as a locked vault preview</label>
    <p className="text-[10px] text-muted-foreground">Posts go to your own country and category automatically.</p>
    <Button disabled={busy || (!caption.trim() && !mediaId && !locked)} onClick={() => void post()}>{busy ? "POSTING…" : "POST"}</Button>
  </section>;
}

export default function NewsFeed({ role, countryFilter, onOpenCreator }: { role: "creator" | "customer"; countryFilter?: string; onOpenCreator?: (name: string) => void }) {
  const { tone } = usePersonalGlobe();
  const [me, setMe] = useState<string | null>(null);
  const [category, setCategory] = useState<FeedCategory>(() => (localStorage.getItem("dtt_feed_category") as FeedCategory) || "women");
  const [tab, setTab] = useState<FeedTab>("latest");
  const [posts, setPosts] = useState<Post[]>([]);
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const country = feedCountry(countryFilter);
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);
  useEffect(() => { localStorage.setItem("dtt_feed_category", category); }, [category]);
  const load = useCallback(async (from: number) => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_feed_posts", { _country: country, _category: category, _tab: tab, _offset: from });
    setLoading(false);
    if (error) { toast.error("Couldn't load the feed."); return; }
    const rows = (data ?? []) as Post[];
    setPosts(p => from === 0 ? rows : [...p, ...rows]); setOffset(from + rows.length); setMore(rows.length === 20);
  }, [country, category, tab]);
  useEffect(() => { void load(0); }, [load]);
  const pill = (active: boolean) => active ? { background: tone, color: "hsl(var(--background))" } : { borderColor: `color-mix(in srgb, ${tone} 50%, transparent)` };
  return <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-8" data-testid="news-feed">
    <div className="flex items-center justify-between">
      <h2 className="font-display text-lg font-bold tracking-wider text-foreground">NEWS FEED</h2>
      <span className="text-xs font-bold text-muted-foreground">{country === "WW" ? "🌐 WORLDWIDE" : `${flagOf(country)} ${country}`}</span>
    </div>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Category page">
      {FEED_CATEGORIES.map(c => <button key={c.id} role="tab" aria-selected={category === c.id} onClick={() => setCategory(c.id)} className="rounded-full border px-3 py-1 text-[11px] font-bold tracking-widest text-foreground" style={pill(category === c.id)}>{c.label}</button>)}
    </div>
    <div className="flex gap-4 text-xs font-bold tracking-widest" role="tablist" aria-label="Feed order">
      {(["trending", "following", "latest"] as FeedTab[]).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={tab === t ? "underline underline-offset-4" : "text-muted-foreground"} style={tab === t ? { color: tone } : undefined}>{t === "following" ? (role === "customer" ? "MY GIRLS / FOLLOWING" : "FOLLOWING") : t.toUpperCase()}</button>)}
    </div>
    {role === "creator" && me && <Composer me={me} tone={tone} onPosted={() => void load(0)} />}
    {posts.map(p => <PostCard key={p.id} post={p} me={me} tone={tone} onTip={n => onOpenCreator?.(n)} onUnlock={n => onOpenCreator?.(n)} />)}
    {!loading && posts.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No posts here yet.</p>}
    {more && <Button variant="outline" className="w-full" onClick={() => void load(offset)}>LOAD MORE</Button>}
  </div>;
}
