import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLog";
import { watermarkCreatorMedia, type WatermarkProgress } from "@/lib/mediaWatermark";

export type MediaBucket = "teasers" | "vault";

export async function uploadMedia(
  file: File,
  bucket: MediaBucket,
  userId: string,
  fixedName?: string,
  onProgress?: WatermarkProgress
): Promise<{ url: string; path: string } | { error: string }> {
  let brandedFile: File;
  try {
    brandedFile = await watermarkCreatorMedia(file, onProgress);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't add the DTT watermark. Nothing was uploaded." };
  }
  const ext = brandedFile.name.split(".").pop() || "mp4";
  const fileName = fixedName ? `${fixedName}.${ext}` : `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = `${userId}/${fileName}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, brandedFile, {
    contentType: brandedFile.type,
    cacheControl: "3600",
    upsert: !!fixedName, // Auto-replace when using a fixed name
  });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  // Fire-and-forget activity log
  logActivity("media_upload", `Uploaded to ${bucket}`, {
    bucket,
    path: filePath,
    size_bytes: brandedFile.size,
    mime: brandedFile.type,
    watermark: "DTT",
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
