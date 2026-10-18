import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CreatorMediaItem {
  id: string;
  creator_id: string;
  bucket: "teasers" | "vault";
  storage_path: string;
  title: string;
  media_type: "video" | "photo";
  views: number;
  created_at: string;
  teaser_frame: "none" | "seasonal" | "sexy" | "gothic" | "glamour";
  active_from: string | null;
  active_until: string | null;
}

export function useCreatorMedia(creatorId: string | null) {
  const [items, setItems] = useState<CreatorMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!creatorId) return;
    setLoading(true);
    const {data, error: readError} = await supabase.from("creator_media").select("*").eq("creator_id",creatorId).order("created_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+24);
    setError(readError?.message ?? null);
    if (!readError && data) {const rows=data.slice(0,24) as CreatorMediaItem[];setItems(previous=>offset===0?rows:[...previous.filter(p=>!rows.some(r=>r.id===p.id)),...rows]);setHasMore(data.length>24);}
    setLoading(false);
  }, [creatorId,offset]);
  useEffect(() => {setItems([]);setOffset(0);},[creatorId]);

  useEffect(() => {
    refresh();
    if (!creatorId) return;
    const channel = supabase
      .channel(`creator_media_${creatorId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "creator_media", filter: `creator_id=eq.${creatorId}` },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [creatorId, refresh]);

  const insertMedia = async (input: {
    bucket: "teasers" | "vault";
    storage_path: string;
    title: string;
    media_type?: "video" | "photo";
  }) => {
    if (!creatorId) return { error: "Not signed in" };
    const { error } = await supabase.from("creator_media").insert({
      creator_id: creatorId,
      bucket: input.bucket,
      storage_path: input.storage_path,
      title: input.title || "Untitled",
      media_type: input.media_type || "video",
    });
    if (error) return { error: error.message };
    await refresh();
    return { success: true };
  };

  const renameMedia = async (id: string, title: string) => {
    const { error } = await supabase
      .from("creator_media")
      .update({ title: title || "Untitled" })
      .eq("id", id);
    if (error) return { error: error.message };
    await refresh();
    return { success: true };
  };

  const deleteMedia = async (id: string, bucket: "teasers" | "vault", path: string) => {
    const {error: removeError} = await supabase.storage.from(bucket).remove([path]);
    if (removeError) return {error:removeError.message};
    const { error } = await supabase.from("creator_media").delete().eq("id", id);
    if (error) return { error: error.message };
    await refresh();
    return { success: true };
  };

  return { items, loading, error, hasMore, loadMore:()=>setOffset(n=>n+24), refresh, insertMedia, renameMedia, deleteMedia };
}
