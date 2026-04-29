import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLog";

export type MediaBucket = "teasers" | "vault";

export async function uploadMedia(
  file: File,
  bucket: MediaBucket,
  userId: string,
  fixedName?: string
): Promise<{ url: string; path: string } | { error: string }> {
  const ext = file.name.split(".").pop() || "mp4";
  const fileName = fixedName ? `${fixedName}.${ext}` : `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = `${userId}/${fileName}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: "3600",
    upsert: !!fixedName, // Auto-replace when using a fixed name
  });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  // Fire-and-forget activity log
  logActivity("media_upload", `Uploaded to ${bucket}`, {
    bucket,
    path: filePath,
    size_bytes: file.size,
    mime: file.type,
  });
  return { url: data.publicUrl, path: filePath };
}

export async function deleteMedia(bucket: MediaBucket, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (!error) {
    logActivity("media_delete", `Removed from ${bucket}`, { bucket, path });
  }
  return error ? { error: error.message } : { success: true };
}
