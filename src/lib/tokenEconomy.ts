// Token Economy Engine for DROPTHATTHING
// Dual-Bucket Revenue: "Tax then Split" model
// 1 Bit-Token = $25 USD invoice ($1 Admin Fee + $20 base + $4 card-processing allowance)
// 5 Bit-Tokens = $125 USD invoice ($1 Admin Fee + $100 base + $24 card-processing allowance)

export const ADMIN_FEE_USD = 1; // Flat $1 goes to Admin_Profit_Vault
export const TOKEN_BASE_VALUE_USD = 20; // Base value per token (after admin fee)
export const TOKEN_INVOICE_USD = 25; // Price per token before the transaction fee
export const TRANSACTION_FEE_USD = 1; // Flat $1 per token purchase, on top of the token total
export const tokenInvoiceTotal = (quantity: number) => quantity * TOKEN_INVOICE_USD + TRANSACTION_FEE_USD;
export const BUNDLE_TOKENS = 5;
export const BUNDLE_BASE_USD = 100; // 5 × $20
export const BUNDLE_INVOICE_USD = 125; // $100 + $1 admin fee + $24 processing allowance
export const ENTRY_PASS_PRICE_USD = 20; // $20/year Vault Entry Pass (goes to the platform vault)
export const ENTRY_PASS_DAYS = 365;
export const PLATFORM_SPLIT_PERCENT = 10; // 10% of base goes to platform
export const CREATOR_SPLIT_PERCENT = 90; // 90% of base goes to creator
export const UNLOCK_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days (336 hours)
export const PLATFORM_CONVENIENCE_FEE_TOKENS = 1; // +1 BT surcharge on custom requests
export const LOYALTY_TOKENS_MONTHLY = 5;
export const CUSTOM_REQUEST_ADMIN_FEE_USD = 1; // Flat $1 on custom requests too
export const CUSTOM_REQUEST_PROCESSING_FEE_USD = 4; // Card-processing cover, paid by the customer
export const CUSTOM_REQUEST_CREATOR_PERCENT = 85; // Custom requests split 85/15
export const CUSTOM_REQUEST_PLATFORM_PERCENT = 15;

// Legacy exports for backward compat
export const TOKEN_VALUE_USD = TOKEN_INVOICE_USD;
export const BUNDLE_PRICE_USD = BUNDLE_INVOICE_USD;

export interface TokenBalance {
  available: number;
  totalPurchased: number;
}

export interface CreatorUnlock {
  creatorId: string;
  creatorName: string;
  unlockedAt: number;
  expiresAt: number;
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
  return usd / TOKEN_BASE_VALUE_USD;
}

/**
 * Dual-Bucket split for token purchases:
 * Invoice = base + $1 admin fee
 * Platform gets: $1 admin fee + 10% of base
 * Creator gets: 90% of base
 */
export function calculateTokenPurchaseSplit(invoiceAmount: number, tokenCount: number) {
  const adminFee = ADMIN_FEE_USD;
  const base = tokenCount * TOKEN_BASE_VALUE_USD;
  const processingAllowance = Math.max(0, invoiceAmount - adminFee - base);
  const platformShare = base * (PLATFORM_SPLIT_PERCENT / 100);
  const creatorShare = base * (CREATOR_SPLIT_PERCENT / 100);
  return {
    invoiceAmount,
    adminFee,
    base,
    platformShare,
    creatorShare,
    processingAllowance,
    totalPlatformRevenue: adminFee + platformShare,
  };
}

/**
 * Custom Request split ($500–$10,001):
 * Customer pays base + $1 DTT fee + $4 card-processing cover.
 * The base splits 85% creator / 15% platform; fees never touch the creator share.
 */
export function calculateCustomRequestSplit(baseAmount: number) {
  const adminFee = CUSTOM_REQUEST_ADMIN_FEE_USD;
  const processingFee = CUSTOM_REQUEST_PROCESSING_FEE_USD;
  const invoiceTotal = baseAmount + adminFee + processingFee;
  const platformShare = baseAmount * (CUSTOM_REQUEST_PLATFORM_PERCENT / 100);
  const creatorShare = baseAmount * (CUSTOM_REQUEST_CREATOR_PERCENT / 100);
  return {
    invoiceTotal,
    adminFee,
    processingFee,
    baseAmount,
    platformShare,
    creatorShare,
    totalPlatformRevenue: adminFee + processingFee + platformShare,
  };
}

/**
 * Tip split: flat $1 DTT fee, remainder to creator
 */
export function calculateTipSplit(tipAmount: number) {
  const adminFee = ADMIN_FEE_USD;
  const creatorShare = tipAmount - adminFee;
  return { tipAmount, adminFee, creatorShare };
}

/**
 * Support Tip via 1 Bit-Token ($20 fixed value):
 * Platform Fee: 5% ($1) — Creator Revenue: 95% ($19)
 */
export const SUPPORT_TIP_TOKENS = 1;
export const SUPPORT_TIP_USD = 20;
export const SUPPORT_PLATFORM_PERCENT = 5;
export const SUPPORT_CREATOR_PERCENT = 95;

export function calculateSupportTipSplit() {
  const platformShare = SUPPORT_TIP_USD * (SUPPORT_PLATFORM_PERCENT / 100);
  const creatorShare = SUPPORT_TIP_USD * (SUPPORT_CREATOR_PERCENT / 100);
  return {
    tokens: SUPPORT_TIP_TOKENS,
    totalUsd: SUPPORT_TIP_USD,
    platformShare,
    creatorShare,
  };
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
  hasAgreedToSafety: boolean;
}
