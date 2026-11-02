import { SKY_BACKDROPS } from "@/lib/skyBackdrops";

export const CREATOR_BACKDROPS = [
  { id: "cluster", label: "Pink star cluster", tags: "pink space galaxy stars" },
  { id: "deepfield", label: "Deep space", tags: "space dark stars" },
  { id: "milkyway", label: "Milky Way", tags: "galaxy stars night" },
  { id: "blueMeteor", label: "Blue meteor", tags: "blue sci-fi gaming space" },
  { id: "crescent", label: "Crescent moon", tags: "moon night calm" },
  { id: "cosmicGold", label: "Cosmic gold", tags: "gold luxury space" },
  { id: "violetWorld", label: "Violet world", tags: "purple fantasy gaming planet" },
  { id: "celestialStorm", label: "Celestial storm", tags: "storm dramatic sci-fi" },
  { id: "goldenMoon", label: "Golden moon", tags: "gold moon luxury" },
] as const;
export type CreatorBackdropId = typeof CREATOR_BACKDROPS[number]["id"];
export function parseCreatorBackdrop(value: unknown): CreatorBackdropId | undefined {
  return CREATOR_BACKDROPS.find((item) => item.id === value)?.id;
}
export function creatorBackdropImage(value: unknown, isMen = false): string {
  return SKY_BACKDROPS[parseCreatorBackdrop(value) ?? (isMen ? "blueMeteor" : "cluster")];
}
export function searchCreatorBackdrops(query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return CREATOR_BACKDROPS.filter((item) => words.every((word) => `${item.label} ${item.tags}`.toLowerCase().includes(word)));
}