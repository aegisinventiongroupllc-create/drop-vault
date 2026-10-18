import deepfield from "@/assets/brb/stars-deep-field.jpg";
import milkyway from "@/assets/brb/stars-milky-way.jpg";
import cluster from "@/assets/brb/stars-cluster.jpg";
import blueMeteor from "@/assets/brb/sky-blue-meteor.jpg";
import crescent from "@/assets/brb/sky-crescent.jpg";
import cosmicGold from "@/assets/brb/sky-cosmic-gold.jpg";
import violetWorld from "@/assets/brb/sky-violet-world.jpg";
import celestialStorm from "@/assets/brb/sky-celestial-storm.jpg";
import goldenMoon from "@/assets/brb/sky-golden-moon.jpg";
import type { StarStyle } from "@/lib/userTheme";

export const SKY_BACKDROPS: Record<Exclude<StarStyle, "living">, string> = {
  deepfield, milkyway, cluster, blueMeteor, crescent, cosmicGold, violetWorld, celestialStorm, goldenMoon,
};