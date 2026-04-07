// Payment split engine for DROPTHATTHING platform
// Handles 90/10 default split and 97/3 incentive milestone

export interface CreatorSplitState {
  creatorId: string;
  followerCount: number;
  currentSplit: { creator: number; platform: number };
  incentiveActive: boolean;
  incentiveStartedAt: number | null; // timestamp ms
  incentiveEndsAt: number | null; // timestamp ms
  milestoneReached: boolean;
}

export interface PayoutState {
  lastPayoutAt: number | null; // timestamp ms
  cooldownMs: number; // 24 hours in ms
}

const INCENTIVE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PAYOUT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const FOLLOWER_MILESTONE = 100_000;

const DEFAULT_SPLIT = { creator: 90, platform: 10 };
const INCENTIVE_SPLIT = { creator: 97, platform: 3 };

export function getCreatorSplitState(
  creatorId: string,
  followerCount: number,
  previousState?: CreatorSplitState
): CreatorSplitState {
  const now = Date.now();

  // Check if milestone just reached
  if (followerCount >= FOLLOWER_MILESTONE && (!previousState || !previousState.milestoneReached)) {
    return {
      creatorId,
      followerCount,
      currentSplit: INCENTIVE_SPLIT,
      incentiveActive: true,
      incentiveStartedAt: now,
      incentiveEndsAt: now + INCENTIVE_DURATION_MS,
      milestoneReached: true,
    };
  }

  // Check if incentive is still active
  if (previousState?.incentiveActive && previousState.incentiveEndsAt) {
    if (now < previousState.incentiveEndsAt) {
      return {
        ...previousState,
        followerCount,
        currentSplit: INCENTIVE_SPLIT,
        incentiveActive: true,
      };
    } else {
      // Incentive expired — revert permanently
      return {
        ...previousState,
        followerCount,
        currentSplit: DEFAULT_SPLIT,
        incentiveActive: false,
      };
    }
  }

  return {
    creatorId,
    followerCount,
    currentSplit: previousState?.currentSplit ?? DEFAULT_SPLIT,
    incentiveActive: false,
    incentiveStartedAt: previousState?.incentiveStartedAt ?? null,
    incentiveEndsAt: previousState?.incentiveEndsAt ?? null,
    milestoneReached: previousState?.milestoneReached ?? false,
  };
}

export function calculateTransactionSplit(amount: number, split: { creator: number; platform: number }) {
  const creatorAmount = (amount * split.creator) / 100;
  const platformAmount = (amount * split.platform) / 100;
  return { creatorAmount, platformAmount };
}

export function canExecutePayout(payoutState: PayoutState): { allowed: boolean; remainingMs: number } {
  if (!payoutState.lastPayoutAt) return { allowed: true, remainingMs: 0 };
  const now = Date.now();
  const elapsed = now - payoutState.lastPayoutAt;
  if (elapsed >= payoutState.cooldownMs) return { allowed: true, remainingMs: 0 };
  return { allowed: false, remainingMs: payoutState.cooldownMs - elapsed };
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00D:00H:00M";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${days}D:${String(hours).padStart(2, "0")}H:${String(minutes).padStart(2, "0")}M`;
}

export function formatPayoutCooldown(ms: number): string {
  if (ms <= 0) return "00H:00M";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${String(hours).padStart(2, "0")}H:${String(minutes).padStart(2, "0")}M`;
}

export { INCENTIVE_DURATION_MS, PAYOUT_COOLDOWN_MS, FOLLOWER_MILESTONE, DEFAULT_SPLIT, INCENTIVE_SPLIT };
