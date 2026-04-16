-- Production reset: clear all user-generated data. Master Admin uses a passcode (no DB row), so no admin user is affected.
TRUNCATE TABLE
  public.transactions,
  public.creator_wallets,
  public.power_weeks,
  public.payout_batches,
  public.market_demand,
  public.legal_consents,
  public.profiles
RESTART IDENTITY CASCADE;