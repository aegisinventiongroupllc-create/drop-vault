import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLog";
import { watermarkCreatorMedia, type WatermarkProgress } from "@/lib/mediaWatermark";
import { uploadBrandedFile } from '@/lib/resumableUpload';

export type MediaBucket = "teasers" | "vault";

export async function uploadMedia(
  file: File,
  bucket: MediaBucket,
  userId: string,
  fixedName?: string,
  onProgress?: WatermarkProgress
): Promise<{ path: string } | { error: string }> {
  let brandedFile: File;
  try {
    brandedFile = await watermarkCreatorMedia(file, onProgress);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't add the DTT watermark. Nothing was uploaded." };
  }
  const ext = brandedFile.name.split(".").pop() || "mp4";
  const fileName = fixedName ? `${fixedName}.${ext}` : `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = `${userId}/${fileName}`;

  const { error } = await uploadBrandedFile(bucket,filePath,brandedFile,onProgress);

  if (error) return { error: error.message };

  // Fire-and-forget activity log
  logActivity("media_upload", `Uploaded to ${bucket}`, {
    bucket,
    path: filePath,
    size_bytes: brandedFile.size,
    mime: brandedFile.type,
    watermark: "DTT",
  });
  return { path: filePath };
}

export async function deleteMedia(bucket: MediaBucket, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (!error) {
    logActivity("media_delete", `Removed from ${bucket}`, { bucket, path });
  }
  return error ? { error: error.message } : { success: true };
}
