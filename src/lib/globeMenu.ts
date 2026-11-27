export type GlobeRole = "creator" | "customer";
export interface GlobeDestination { id: string; label: string; icon: string }

export const GLOBE_NAV_EVENT = "dtt-globe-nav";
export const GLOBE_OPEN_EVENT = "dtt-brb-preview";

export const GLOBE_DESTINATIONS: Record<GlobeRole, GlobeDestination[]> = {
  creator: [
    { id: "feed", label: "FEED", icon: "feed" },
    { id: "media", label: "MEDIA", icon: "flame" },
    { id: "drafts", label: "DRAFTS", icon: "drafts" },
    { id: "calendar", label: "CALENDAR", icon: "calendar" },
    { id: "requests", label: "REQUESTS", icon: "requests" },
    { id: "verification", label: "VERIFY", icon: "verify" },
    { id: "overview", label: "ANALYTICS", icon: "analytics" },
    { id: "messages", label: "MESSAGES", icon: "messages" },
  ],
  customer: [
    { id: "feed", label: "FEED", icon: "feed" },
    { id: "library", label: "LIBRARY", icon: "heart" },
    { id: "permanent", label: "VAULT", icon: "gem" },
    { id: "requests", label: "REQUESTS", icon: "requests" },
    { id: "messages", label: "MESSAGES", icon: "messages" },
    { id: "founding", label: "FOUNDING", icon: "crown" },
  ],
};

/** Equally spaced orbit positions; depth is -1 (behind globe) to 1 (front). */
export function orbitPositions(count: number, rotation: number, radiusX: number, radiusY: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = rotation + (i * 2 * Math.PI) / count;
    return { angle, x: Math.cos(angle) * radiusX, y: Math.sin(angle) * radiusY, depth: Math.sin(angle) };
  });
}

/** Ask an open dashboard to show a section. */
export function openGlobeDestination(id: string) {
  window.dispatchEvent(new CustomEvent(GLOBE_NAV_EVENT, { detail: id }));
}
