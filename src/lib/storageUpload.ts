import { supabase } from "@/integrations/supabase/client";

export type MediaBucket = "teasers" | "vault";

export async function uploadMedia(
  file: File,
  bucket: MediaBucket,
  userId: string
): Promise<{ url: string; path: string } | { error: string }> {
  const ext = file.name.split(".").pop() || "mp4";
  const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return { url: data.publicUrl, path: filePath };
}

export async function deleteMedia(bucket: MediaBucket, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return error ? { error: error.message } : { success: true };
}
