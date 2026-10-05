export const DTT_COLORS = ["pink", "blue", "silver", "gold", "mint", "red"] as const;
export type DttColor = typeof DTT_COLORS[number] | `#${string}`;
export type DttLetterColors = [DttColor, DttColor, DttColor];
export const DEFAULT_DTT_COLORS: DttLetterColors = ["pink", "silver", "pink"];
export const DTT_COLOR_CLASSES: Record<typeof DTT_COLORS[number], string> = {
  pink: "dtt-color-pink", blue: "dtt-color-blue", silver: "dtt-color-silver",
  gold: "dtt-color-gold", mint: "dtt-color-mint", red: "dtt-color-red",
};
const LEGACY_HEX = { pink: "#ff3399", blue: "#4db5ff", silver: "#e2e6e9", gold: "#fbd141", mint: "#5be2aa", red: "#f76464" };
export function isDttColor(value: unknown): value is DttColor {
  return typeof value === "string" && (/^#[0-9a-f]{6}$/i.test(value) || DTT_COLORS.some((color) => color === value));
}
export function dttColorHex(color: DttColor): string {
  return color.startsWith("#") ? color : LEGACY_HEX[color as keyof typeof LEGACY_HEX];
}
export function dttColorClass(color: DttColor): string {
  return color.startsWith("#") ? "" : DTT_COLOR_CLASSES[color as keyof typeof DTT_COLOR_CLASSES];
}
export function parseDttColors(value: unknown): DttLetterColors {
  const colors = Array.isArray(value) ? value : [];
  const pick = (index: number): DttColor => isDttColor(colors[index]) ? colors[index] : DEFAULT_DTT_COLORS[index];
  return [pick(0), pick(1), pick(2)];
}