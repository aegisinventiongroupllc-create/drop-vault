// Token Economy Engine for DROPTHATTHING
// 1 Bit-Token = $20 USD = 14 days access to ONE Creator Profile

export const TOKEN_VALUE_USD = 20;
export const BUNDLE_TOKENS = 6;
export const BUNDLE_PRICE_USD = 100;
export const UNLOCK_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days (336 hours)
export const PLATFORM_CONVENIENCE_FEE_TOKENS = 1; // +1 BT surcharge on custom requests
export const LOYALTY_TOKENS_MONTHLY = 5;

export interface TokenBalance {
  available: number;
  totalPurchased: number;
}

export interface CreatorUnlock {
  creatorId: string;
  creatorName: string;
  unlockedAt: number; // timestamp ms
  expiresAt: number;  // timestamp ms
}

export interface CustomRequest {
  id: string;
  creatorName: string;
  description: string;
  amountUsd: number;
  totalTokens: number;
  status: "pending" | "accepted" | "declined" | "completed";
  createdAt: number;
}

export function isUnlockActive(unlock: CreatorUnlock): boolean {
  return Date.now() < unlock.expiresAt;
}

export function getUnlockTimeRemaining(unlock: CreatorUnlock): number {
  return Math.max(0, unlock.expiresAt - Date.now());
}

export function formatUnlockCountdown(ms: number): string {
  if (ms <= 0) return "Expired";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${days}D ${String(hours).padStart(2, "0")}H ${String(minutes).padStart(2, "0")}M`;
}

export function dollarsToBitTokens(usd: number): number {
  return usd / TOKEN_VALUE_USD;
}

export function calculateRequestTokens(usd: number): { baseTokens: number; fee: number; total: number } {
  const baseTokens = dollarsToBitTokens(usd);
  return {
    baseTokens,
    fee: PLATFORM_CONVENIENCE_FEE_TOKENS,
    total: baseTokens + PLATFORM_CONVENIENCE_FEE_TOKENS,
  };
}

export type VaultType = "women" | "men";

export interface UserPreferences {
  primaryVault: VaultType;
  hasSeenKnowYourCoins: boolean;
  hasAgreedToSafety: boolean; // for creators
}
