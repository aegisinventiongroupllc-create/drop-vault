import { Bolt, Crown, Diamond, Flame, Heart, Moon, Orbit, Sparkles, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type AvatarFace = "spark" | "rogue" | "nova" | "pixel" | "orbit" | "crown";
export type AvatarTone = "rose" | "cyan" | "gold" | "lime" | "violet" | "silver";
export type AvatarAccent = "star" | "bolt" | "moon" | "flame" | "heart" | "diamond";

export interface AvatarConfig {
  face: AvatarFace;
  tone: AvatarTone;
  accent: AvatarAccent;
}

export const DEFAULT_AVATAR: AvatarConfig = { face: "spark", tone: "rose", accent: "star" };
export const AVATAR_FACES: AvatarFace[] = ["spark", "rogue", "nova", "pixel", "orbit", "crown"];
export const AVATAR_TONES: AvatarTone[] = ["rose", "cyan", "gold", "lime", "violet", "silver"];
export const AVATAR_ACCENTS: AvatarAccent[] = ["star", "bolt", "moon", "flame", "heart", "diamond"];

const toneClasses: Record<AvatarTone, string> = {
  rose: "bg-primary/20 border-primary text-primary",
  cyan: "bg-vault-blue/20 border-vault-blue text-vault-blue",
  gold: "bg-gold/20 border-gold text-gold",
  lime: "bg-emerald-500/20 border-emerald-400 text-emerald-400",
  violet: "bg-fuchsia-500/20 border-fuchsia-400 text-fuchsia-400",
  silver: "bg-muted border-vault-silver text-vault-silver",
};

const FaceIcon = ({ face, className }: { face: AvatarFace; className?: string }) => {
  if (face === "rogue") return <Zap className={className} />;
  if (face === "nova") return <Star className={className} />;
  if (face === "pixel") return <Diamond className={className} />;
  if (face === "orbit") return <Orbit className={className} />;
  if (face === "crown") return <Crown className={className} />;
  return <Sparkles className={className} />;
};

const AccentIcon = ({ accent, className }: { accent: AvatarAccent; className?: string }) => {
  if (accent === "bolt") return <Bolt className={className} />;
  if (accent === "moon") return <Moon className={className} />;
  if (accent === "flame") return <Flame className={className} />;
  if (accent === "heart") return <Heart className={className} />;
  if (accent === "diamond") return <Diamond className={className} />;
  return <Star className={className} />;
};

export const parseAvatarConfig = (value: unknown): AvatarConfig => {
  if (!value || typeof value !== "object") return DEFAULT_AVATAR;
  const candidate = value as Partial<AvatarConfig>;
  return {
    face: AVATAR_FACES.includes(candidate.face as AvatarFace) ? candidate.face as AvatarFace : DEFAULT_AVATAR.face,
    tone: AVATAR_TONES.includes(candidate.tone as AvatarTone) ? candidate.tone as AvatarTone : DEFAULT_AVATAR.tone,
    accent: AVATAR_ACCENTS.includes(candidate.accent as AvatarAccent) ? candidate.accent as AvatarAccent : DEFAULT_AVATAR.accent,
  };
};

const ProfileAvatar = ({ config, className, label }: { config?: unknown; className?: string; label?: string }) => {
  const avatar = parseAvatarConfig(config);
  return (
    <div
      className={cn("relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2", toneClasses[avatar.tone], className)}
      role="img"
      aria-label={label ? `${label}'s avatar` : "Profile avatar"}
    >
      <FaceIcon face={avatar.face} className="h-[45%] w-[45%]" />
      <span className="absolute -bottom-0.5 -right-0.5 flex h-[36%] w-[36%] items-center justify-center rounded-full border border-background bg-card">
        <AccentIcon accent={avatar.accent} className="h-[65%] w-[65%]" />
      </span>
    </div>
  );
};

export default ProfileAvatar;