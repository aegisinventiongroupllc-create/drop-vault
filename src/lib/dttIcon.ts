export const DTT_COLORS = ["pink", "blue", "silver", "gold", "mint", "red"] as const;
export type DttColor = typeof DTT_COLORS[number];
export type DttLetterColors = [DttColor, DttColor, DttColor];
export const DEFAULT_DTT_COLORS: DttLetterColors = ["pink", "silver", "pink"];
export const DTT_COLOR_CLASSES: Record<DttColor, string> = {
  pink: "dtt-color-pink", blue: "dtt-color-blue", silver: "dtt-color-silver",
  gold: "dtt-color-gold", mint: "dtt-color-mint", red: "dtt-color-red",
};
export function parseDttColors(value: unknown): DttLetterColors {
  const colors = Array.isArray(value) ? value : [];
  const pick = (index: number): DttColor => DTT_COLORS.includes(colors[index]) ? colors[index] : DEFAULT_DTT_COLORS[index];
  return [pick(0), pick(1), pick(2)];
}