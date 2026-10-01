import { cn } from "@/lib/utils";

export type AvatarFace = "spark" | "rogue" | "nova" | "pixel" | "orbit" | "crown";
export type AvatarTone = "rose" | "cyan" | "gold" | "lime" | "violet" | "silver";
export type AvatarAccent = "star" | "bolt" | "moon" | "flame" | "heart" | "diamond";
export type AvatarSkinTone = "light" | "warm" | "medium" | "deep" | "rich" | "dark";
export type AvatarHair = "none" | "crop" | "waves" | "curls" | "long" | "mohawk";
export type AvatarHairColor = "dark" | "brown" | "blonde" | "red" | "silver" | "neon";
export type AvatarFacialHair = "none" | "stubble" | "mustache" | "goatee" | "beard";
export type AvatarGlasses = "none" | "round" | "square" | "aviator";
export type AvatarEyebrows = "soft" | "straight" | "arched" | "bold" | "split";
export type AvatarEars = "small" | "medium" | "large" | "pointed";
export type AvatarJawline = "oval" | "heart" | "soft" | "square" | "strong" | "tapered";

export interface AvatarConfig {
  face: AvatarFace;
  tone: AvatarTone;
  accent: AvatarAccent;
  skinTone: AvatarSkinTone;
  hair: AvatarHair;
  hairColor: AvatarHairColor;
  facialHair: AvatarFacialHair;
  glasses: AvatarGlasses;
  eyebrows: AvatarEyebrows;
  ears: AvatarEars;
  jawline: AvatarJawline;
}

export const AVATAR_SKIN_TONES: AvatarSkinTone[] = ["light", "warm", "medium", "deep", "rich", "dark"];
export const AVATAR_HAIR: AvatarHair[] = ["none", "crop", "waves", "curls", "long", "mohawk"];
export const AVATAR_HAIR_COLORS: AvatarHairColor[] = ["dark", "brown", "blonde", "red", "silver", "neon"];
export const AVATAR_FACIAL_HAIR: AvatarFacialHair[] = ["none", "stubble", "mustache", "goatee", "beard"];
export const AVATAR_GLASSES: AvatarGlasses[] = ["none", "round", "square", "aviator"];
export const AVATAR_EYEBROWS: AvatarEyebrows[] = ["soft", "straight", "arched", "bold", "split"];
export const AVATAR_EARS: AvatarEars[] = ["small", "medium", "large", "pointed"];
export const AVATAR_JAWLINES: AvatarJawline[] = ["oval", "heart", "soft", "square", "strong", "tapered"];

export const DEFAULT_AVATAR: AvatarConfig = {
  face: "spark", tone: "rose", accent: "star", skinTone: "medium", hair: "waves",
  hairColor: "dark", facialHair: "none", glasses: "none", eyebrows: "soft", ears: "medium", jawline: "oval",
};

const allowed = <T extends string>(values: readonly T[], value: unknown, fallback: T): T =>
  typeof value === "string" && values.includes(value as T) ? value as T : fallback;

export const parseAvatarConfig = (value: unknown): AvatarConfig => {
  if (!value || typeof value !== "object") return DEFAULT_AVATAR;
  const candidate = value as Partial<AvatarConfig>;
  return {
    face: allowed(["spark", "rogue", "nova", "pixel", "orbit", "crown"], candidate.face, DEFAULT_AVATAR.face),
    tone: allowed(["rose", "cyan", "gold", "lime", "violet", "silver"], candidate.tone, DEFAULT_AVATAR.tone),
    accent: allowed(["star", "bolt", "moon", "flame", "heart", "diamond"], candidate.accent, DEFAULT_AVATAR.accent),
    skinTone: allowed(AVATAR_SKIN_TONES, candidate.skinTone, DEFAULT_AVATAR.skinTone),
    hair: allowed(AVATAR_HAIR, candidate.hair, DEFAULT_AVATAR.hair),
    hairColor: allowed(AVATAR_HAIR_COLORS, candidate.hairColor, DEFAULT_AVATAR.hairColor),
    facialHair: allowed(AVATAR_FACIAL_HAIR, candidate.facialHair, DEFAULT_AVATAR.facialHair),
    glasses: allowed(AVATAR_GLASSES, candidate.glasses, DEFAULT_AVATAR.glasses),
    eyebrows: allowed(AVATAR_EYEBROWS, candidate.eyebrows, DEFAULT_AVATAR.eyebrows),
    ears: allowed(AVATAR_EARS, candidate.ears, DEFAULT_AVATAR.ears),
    jawline: allowed(AVATAR_JAWLINES, candidate.jawline, DEFAULT_AVATAR.jawline),
  };
};

const skinClasses: Record<AvatarSkinTone, string> = {
  light: "fill-amber-100", warm: "fill-orange-200", medium: "fill-amber-400",
  deep: "fill-amber-700", rich: "fill-orange-900", dark: "fill-stone-900",
};
const hairClasses: Record<AvatarHairColor, string> = {
  dark: "fill-stone-950", brown: "fill-amber-950", blonde: "fill-yellow-300",
  red: "fill-orange-700", silver: "fill-slate-300", neon: "fill-primary",
};
const jawPaths: Record<AvatarJawline, string> = {
  oval: "M28 29 Q28 16 50 15 Q72 16 72 29 L69 60 Q66 78 50 85 Q34 78 31 60Z",
  heart: "M27 29 Q29 15 50 16 Q71 15 73 29 L68 62 Q62 79 50 87 Q38 79 32 62Z",
  soft: "M27 30 Q28 15 50 15 Q72 15 73 30 L70 61 Q67 81 50 84 Q33 81 30 61Z",
  square: "M27 29 Q28 15 50 15 Q72 15 73 29 L72 66 Q65 82 50 84 Q35 82 28 66Z",
  strong: "M25 29 Q27 14 50 15 Q73 14 75 29 L72 68 L59 82 L50 85 L41 82 L28 68Z",
  tapered: "M27 29 Q28 15 50 15 Q72 15 73 29 L67 63 Q61 80 50 89 Q39 80 33 63Z",
};

const Ears = ({ style, skin }: { style: AvatarEars; skin: string }) => {
  if (style === "pointed") return <><path d="M29 37 L14 27 L20 56 L31 59Z" className={skin} /><path d="M71 37 L86 27 L80 56 L69 59Z" className={skin} /></>;
  const ry = style === "small" ? 8 : style === "large" ? 15 : 11;
  const rx = style === "large" ? 8 : 6;
  return <><ellipse cx="27" cy="49" rx={rx} ry={ry} className={skin} /><ellipse cx="73" cy="49" rx={rx} ry={ry} className={skin} /></>;
};

const Hair = ({ style, color }: { style: AvatarHair; color: string }) => {
  if (style === "none") return null;
  if (style === "crop") return <path d="M29 32 Q30 13 50 13 Q70 13 72 32 Q59 24 29 32Z" className={color} />;
  if (style === "waves") return <path d="M27 34 Q25 12 47 12 Q75 9 74 36 Q65 23 58 29 Q49 18 42 28 Q34 20 27 34Z" className={color} />;
  if (style === "curls") return <path d="M25 34 Q20 23 31 22 Q27 10 40 16 Q45 5 52 15 Q63 6 65 19 Q79 16 73 36 Q64 26 55 29 Q44 20 35 31Z" className={color} />;
  if (style === "long") return <path d="M25 34 Q25 10 50 11 Q75 10 75 35 L78 83 L66 76 L68 31 Q50 19 32 31 L34 76 L22 83Z" className={color} />;
  return <path d="M43 21 L49 3 L55 20 L61 5 L62 29 Q50 23 38 29Z" className={color} />;
};

const Brows = ({ style, color }: { style: AvatarEyebrows; color: string }) => {
  const width = style === "bold" ? 4 : style === "soft" ? 2 : 3;
  if (style === "arched") return <><path d="M34 42 Q40 35 46 41" fill="none" className={`stroke-current ${color.replace("fill-", "text-")}`} strokeWidth={width} strokeLinecap="round" /><path d="M54 41 Q60 35 66 42" fill="none" className={`stroke-current ${color.replace("fill-", "text-")}`} strokeWidth={width} strokeLinecap="round" /></>;
  if (style === "split") return <><path d="M34 40 L39 39 M42 39 L46 40 M54 40 L59 39 M62 39 L66 40" fill="none" className={`stroke-current ${color.replace("fill-", "text-")}`} strokeWidth={3} strokeLinecap="round" /></>;
  const y = style === "straight" ? 40 : 41;
  return <><path d={`M34 ${y} Q40 ${style === "soft" ? 38 : 40} 46 ${y}`} fill="none" className={`stroke-current ${color.replace("fill-", "text-")}`} strokeWidth={width} strokeLinecap="round" /><path d={`M54 ${y} Q60 ${style === "soft" ? 38 : 40} 66 ${y}`} fill="none" className={`stroke-current ${color.replace("fill-", "text-")}`} strokeWidth={width} strokeLinecap="round" /></>;
};

const Glasses = ({ style }: { style: AvatarGlasses }) => {
  if (style === "none") return null;
  if (style === "round") return <g fill="none" className="stroke-foreground" strokeWidth="2"><circle cx="40" cy="49" r="8"/><circle cx="60" cy="49" r="8"/><path d="M48 49H52 M32 47L27 45 M68 47L73 45"/></g>;
  if (style === "aviator") return <g fill="none" className="stroke-foreground" strokeWidth="2"><path d="M31 44 Q39 41 48 45 Q47 58 39 59 Q32 57 31 44Z M52 45 Q61 41 69 44 Q68 57 61 59 Q53 58 52 45Z M48 47H52"/></g>;
  return <g fill="none" className="stroke-foreground" strokeWidth="2"><rect x="31" y="42" width="17" height="14" rx="2"/><rect x="52" y="42" width="17" height="14" rx="2"/><path d="M48 47H52"/></g>;
};

const FacialHair = ({ style, color }: { style: AvatarFacialHair; color: string }) => {
  if (style === "none") return null;
  if (style === "stubble") return <path d="M35 65 Q50 79 65 65 Q61 79 50 82 Q39 79 35 65Z" className={`${color} opacity-40`} />;
  if (style === "mustache") return <path d="M50 65 Q42 60 35 66 Q43 71 50 66 Q57 71 65 66 Q58 60 50 65Z" className={color} />;
  if (style === "goatee") return <><path d="M50 65 Q42 61 37 66 Q44 70 50 66 Q56 70 63 66 Q58 61 50 65Z" className={color}/><path d="M44 72 Q50 79 56 72 L54 82 L46 82Z" className={color}/></>;
  return <path d="M32 61 Q37 74 42 78 L50 87 L58 78 Q65 74 68 61 Q63 72 57 70 Q50 76 43 70 Q37 72 32 61Z" className={color} />;
};

const ProfileAvatar = ({ config, className, label }: { config?: unknown; className?: string; label?: string }) => {
  const avatar = parseAvatarConfig(config);
  const skin = skinClasses[avatar.skinTone];
  const hair = hairClasses[avatar.hairColor];
  return (
    <div className={cn("relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-border bg-secondary", className)} role="img" aria-label={label ? `${label}'s custom avatar` : "Custom profile avatar"}>
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        <circle cx="50" cy="50" r="50" className="fill-card" />
        <Ears style={avatar.ears} skin={skin} />
        <path d={jawPaths[avatar.jawline]} className={skin} />
        <Hair style={avatar.hair} color={hair} />
        <Brows style={avatar.eyebrows} color={hair} />
        <ellipse cx="40" cy="49" rx="2.6" ry="3.2" className="fill-foreground" />
        <ellipse cx="60" cy="49" rx="2.6" ry="3.2" className="fill-foreground" />
        <path d="M48 53 Q50 60 47 61" fill="none" className="stroke-foreground/40" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M43 68 Q50 72 57 68" fill="none" className="stroke-foreground/70" strokeWidth="1.7" strokeLinecap="round" />
        <FacialHair style={avatar.facialHair} color={hair} />
        <Glasses style={avatar.glasses} />
      </svg>
    </div>
  );
};

export default ProfileAvatar;