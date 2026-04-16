// Payment split engine for DROPTHATTHING platform
// Handles 90/10 default split and recurring 97/3 Power Week every 500K followers

export interface CreatorSplitState {
  creatorId: string;
  followerCount: number;
  currentSplit: { creator: number; platform: number };
  incentiveActive: boolean;
  incentiveStartedAt: number | null; // timestamp ms
  incentiveEndsAt: number | null; // timestamp ms
  milestoneReached: boolean;
  lastMilestone: number; // e.g. 100000, 200000, 300000
  nextMilestone: number; // the next 100K target
}

export interface PayoutState {
  lastPayoutAt: number | null; // timestamp ms
  cooldownMs: number; // 24 hours in ms
}

const INCENTIVE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 168 hours
const PAYOUT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const FOLLOWER_MILESTONE = 500_000;

const DEFAULT_SPLIT = { creator: 90, platform: 10 };
const INCENTIVE_SPLIT = { creator: 97, platform: 3 };

/**
 * Computes the current milestone bracket for a follower count.
 * IMPORTANT: Only 'Customer' role accounts count toward milestones.
 * Creator accounts do NOT count, even if they spend tokens.
 * E.g. 1,248,000 → lastMilestone=1000000, nextMilestone=1500000 (every 500K)
 */
function getMilestoneBracket(followers: number) {
  const lastMilestone = Math.floor(followers / FOLLOWER_MILESTONE) * FOLLOWER_MILESTONE;
  const nextMilestone = lastMilestone + FOLLOWER_MILESTONE;
  return { lastMilestone, nextMilestone };
}

/**
 * Progress toward next 100K milestone (0–100).
 */
export function getMilestoneProgress(followers: number): number {
  const within = followers % FOLLOWER_MILESTONE;
  return Math.min(100, (within / FOLLOWER_MILESTONE) * 100);
}

export function getCreatorSplitState(
  creatorId: string,
  followerCount: number,
  previousState?: CreatorSplitState
): CreatorSplitState {
  const now = Date.now();
  const { lastMilestone, nextMilestone } = getMilestoneBracket(followerCount);

  // Check if a NEW milestone was just crossed (recurring every 100K)
  const previousMilestone = previousState?.lastMilestone ?? 0;
  const justCrossedNew = lastMilestone > 0 && lastMilestone > previousMilestone;

  if (justCrossedNew && (!previousState?.incentiveActive)) {
    return {
      creatorId,
      followerCount,
      currentSplit: INCENTIVE_SPLIT,
      incentiveActive: true,
      incentiveStartedAt: now,
      incentiveEndsAt: now + INCENTIVE_DURATION_MS,
      milestoneReached: true,
      lastMilestone,
      nextMilestone,
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
        lastMilestone,
        nextMilestone,
      };
    } else {
      // Incentive expired — revert to 90/10
      return {
        ...previousState,
        followerCount,
        currentSplit: DEFAULT_SPLIT,
        incentiveActive: false,
        lastMilestone,
        nextMilestone,
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
    lastMilestone,
    nextMilestone,
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
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);
  return `${days}D:${String(hours).padStart(2, "0")}H:${String(minutes).padStart(2, "0")}M:${String(seconds).padStart(2, "0")}S`;
}

export function formatPayoutCooldown(ms: number): string {
  if (ms <= 0) return "00H:00M";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${String(hours).padStart(2, "0")}H:${String(minutes).padStart(2, "0")}M`;
}

export { INCENTIVE_DURATION_MS, PAYOUT_COOLDOWN_MS, FOLLOWER_MILESTONE, DEFAULT_SPLIT, INCENTIVE_SPLIT };
