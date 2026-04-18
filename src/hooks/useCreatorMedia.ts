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
}

export function useCreatorMedia(creatorId: string | null) {
  const [items, setItems] = useState<CreatorMediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!creatorId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("creator_media")
      .select("*")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });
    if (!error && data) setItems(data as CreatorMediaItem[]);
    setLoading(false);
  }, [creatorId]);

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
    await supabase.storage.from(bucket).remove([path]);
    const { error } = await supabase.from("creator_media").delete().eq("id", id);
    if (error) return { error: error.message };
    await refresh();
    return { success: true };
  };

  return { items, loading, refresh, insertMedia, renameMedia, deleteMedia };
}
