import { calculateCustomRequestSplit } from "@/lib/tokenEconomy";

export interface RequestMenuItem { title: string; description: string; price_usd: number; turnaround_days: number }
export interface RequestMenu { enabled: boolean; open_requests: boolean; open_turnaround_days: number; items: RequestMenuItem[] }
export const MAX_MENU_OPTIONS = 6;
export const MIN_MENU_PRICE = 25;
export function validMenuPrice(value: number) { return Number.isFinite(value) && value >= 25 && value <= 99999999.99 && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001; }
export function menuError(menu: RequestMenu): string | null {
  if (menu.items.length > MAX_MENU_OPTIONS) return "Choose up to six options.";
  const daysValid = (n: number) => Number.isInteger(n) && n >= 1 && n <= 365;
  if (!daysValid(menu.open_turnaround_days)) return "Choose turnaround days from 1 to 365.";
  for (const item of menu.items) {
    if (!item.title.trim() || item.title.length > 80 || !item.description.trim() || item.description.length > 500) return "Each option needs a title and short description.";
    if (!validMenuPrice(item.price_usd)) return "Prices start at $25 and allow up to two decimal places.";
    if (!daysValid(item.turnaround_days)) return "Choose turnaround days from 1 to 365.";
  }
  return null;
}
export function parseMenuItems(value: unknown): RequestMenuItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is RequestMenuItem => !!item && typeof item === "object" && typeof item.title === "string" && typeof item.description === "string" && validMenuPrice(item.price_usd) && Number.isInteger(item.turnaround_days));
}
export const menuSplit = (price: number) => calculateCustomRequestSplit(price, 85);