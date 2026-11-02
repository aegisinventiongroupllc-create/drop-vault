import beach from "@/assets/backdrops/beach.jpg";
import gaming from "@/assets/backdrops/gaming.jpg";
import cars from "@/assets/backdrops/cars.jpg";
import spring from "@/assets/backdrops/spring.jpg";
import summer from "@/assets/backdrops/summer.jpg";
import autumn from "@/assets/backdrops/autumn.jpg";
import winter from "@/assets/backdrops/winter.jpg";
import satin from "@/assets/backdrops/satin.jpg";
import { supabase } from "@/integrations/supabase/client";
import { watermarkCreatorMedia } from "@/lib/mediaWatermark";

export const PROFILE_BACKDROPS = [
  { id: "beach", label: "Palm beach", category: "Nature", season: "Summer", tags: "ocean tropical travel holiday", image: beach },
  { id: "gaming", label: "Neon gaming", category: "Gaming", season: "Any", tags: "games neon cyber tech", image: gaming },
  { id: "cars", label: "City drive", category: "Cars", season: "Any", tags: "car sports city automotive", image: cars },
  { id: "spring", label: "Spring garden", category: "Nature", season: "Spring", tags: "flowers floral blossoms pink garden", image: spring },
  { id: "summer", label: "Coral paradise", category: "Nature", season: "Summer", tags: "ocean fish reef sea turtle underwater", image: summer },
  { id: "autumn", label: "Autumn woodland", category: "Nature", season: "Autumn", tags: "fall leaves forest hiking", image: autumn },
  { id: "winter", label: "Winter escape", category: "Nature", season: "Winter", tags: "snow mountains forest holiday", image: winter },
  { id: "satin", label: "Ruby & gold", category: "Luxury", season: "Any", tags: "satin silk romantic elegant fabric", image: satin },
] as const;
export function searchProfileBackdrops(query: string, category = "All", season = "All") {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return PROFILE_BACKDROPS.filter(item => (category === "All" || item.category === category) && (season === "All" || item.season === season) && words.every(word => `${item.label} ${item.category} ${item.season} ${item.tags}`.toLowerCase().includes(word)));
}
export function profileBackdropImage(id: unknown) {
  return PROFILE_BACKDROPS.find(item => item.id === id)?.image;
}
export const BACKDROP_MAX_BYTES = 5 * 1024 * 1024;
export function validateBackdropFile(file: Pick<File, "type" | "size">) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG or WebP image. SVG and animated files are not accepted.");
  if (file.size <= 0 || file.size > BACKDROP_MAX_BYTES) throw new Error("Choose an image no larger than 5 MB.");
}
export async function prepareBackdrop(file: File, creator: boolean): Promise<File> {
  validateBackdropFile(file);
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40000000) throw new Error("Choose an image under 40 megapixels.");
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing unavailable. Nothing was uploaded.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Couldn't safely process image.")), "image/jpeg", 0.9));
    const output = new File([blob], "backdrop.jpg", { type: "image/jpeg" });
    const safe = creator ? await watermarkCreatorMedia(output) : output;
    validateBackdropFile(safe);
    return safe;
  } finally { bitmap.close(); }
}
export async function saveProfileBackdrop(design: string | null, path: string | null = null) {
  const { error } = await supabase.rpc("set_my_profile_backdrop", { _design: design, _path: path });
  if (error) throw error;
  window.dispatchEvent(new Event("dtt-profile-backdrop"));
}