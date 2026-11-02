import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { profileBackdropImage } from "@/lib/profileBackdrops";
import { creatorBackdropImage, parseCreatorBackdrop } from "@/lib/creatorBackdrop";

export function useProfileBackdrop(userId?: string | null) {
  const [image, setImage] = useState(profileBackdropImage("beach"));
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setImage(profileBackdropImage("beach"));
    async function load() {
      if (userId === null) return;
      const owner = userId ?? (await supabase.auth.getUser()).data.user?.id;
      if (!owner) return;
      const { data, error } = await supabase.from("profile_backdrop_settings").select("design_id,upload_path").eq("user_id", owner).maybeSingle();
      if (cancelled || error) return;
      let next = profileBackdropImage(data?.design_id);
      if (data?.upload_path) {
        const signed = await supabase.storage.from("profile-backdrops").createSignedUrl(data.upload_path, 600);
        if (signed.error) return;
        next = signed.data.signedUrl;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void load(), 540000);
      } else if (parseCreatorBackdrop(data?.design_id)) next = creatorBackdropImage(data?.design_id);
      if (!cancelled) setImage(next ?? profileBackdropImage("beach"));
    }
    void load();
    const reload = () => void load();
    window.addEventListener("dtt-profile-backdrop", reload);
    return () => { cancelled = true; if (timer) clearTimeout(timer); window.removeEventListener("dtt-profile-backdrop", reload); };
  }, [userId]);
  return image;
}