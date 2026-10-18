# DTT reliability and growth fixes

## Goal
Fix the weaknesses found in the assessment without changing DTT’s appearance, prices, verification requirements, or customer delivery rights. Work in stages, checking each stage before moving on.

The database currently reports healthy connections, 55% memory use, 12% disk use, and no recent resource-exhaustion alerts. A paid instance upgrade is not justified by these readings alone. These improvements do not constitute proof that DTT can support millions of users.

## 1. Protect automatic renewals first
- Make token deductions, purchase attribution, 14-day access renewal, the earnings record, and creator wallet credit succeed together or all roll back.
- Prevent duplicate charges from simultaneous runs or retries; recheck whether renewal is still due and enabled before charging.
- Apply the creator’s eligible revenue split at the time of earning, including founding-creator and Power Week eligibility, and preserve the recorded amounts afterward.
- Correct renewal counts, handle insufficient tokens and restricted accounts, and report failed operations rather than treating them as successful.
- Preserve the existing hourly scheduler and its authentication; do not add more frequent polling.

## 2. Reduce video loading and upload failures
- Load discovery and creator libraries in bounded pages rather than fetching and signing the entire collection upfront. Keep all content reachable through scrolling or load-more controls.
- Load video only near the visible item; stop offscreen playback and release unused resources.
- Refresh expiring private playback links only after rechecking access. Expired access must remain locked.
- Use a shared resumable upload path where supported for already-watermarked files, with progress, cancellation, bounded retries, and clear failure states.
- Preserve permanent DTT watermarking and reviewed live adult verification for every creator upload. Do not raise file limits to bypass the current device-processing bottleneck.
- Keep customer request deliveries retained when creators clear their workspace. Fix deletion and failed-registration handling without silently removing retained deliveries.

## 3. Make earnings and live updates accurate at scale
- Replace dashboard calculations based on the latest 1,000 transactions with account-scoped server summaries using complete completed earnings and UTC months.
- Preserve historical revenue splits and paginated drilldowns.
- Scope and debounce live listeners so unrelated activity does not repeatedly reload each dashboard.
- Deduplicate simultaneous translation requests and cache writes, with bounded requests and safe retry behavior.
- Investigate query plans before adding targeted indexes. Measure heart-total contention before replacing the existing privacy-safe totals system.

## 4. Establish recovery and operating visibility
- Document storage limits, retained-media growth, database use, upload/playback failures, scheduled-job failures, and cost/bandwidth thresholds.
- Add useful bounded operational reporting without exposing identities or secrets; configure notifications only through available, verified services.
- Ask you to check **More → Cloud → Database → Backups** and provide the newest UTC snapshot timestamp; tools cannot inspect that inventory.
- Lovable Cloud supplies daily database-only snapshots with roughly 14 days’ retention and no point-in-time recovery. Neither snapshots nor the database export include storage files.
- For an isolated recovery rehearsal, export through **More → Cloud → Overview → Advanced settings → Export project data**, then restore into a separate project you own. Download media separately from **More → Cloud → Storage**. Reconfigure sign-in providers and keys at the destination and test account access and retained media.
- Do not restore the running DTT database as a test: restoring loses later data, reverts the schema, and temporarily interrupts availability. Taking an export first preserves the current database state, not stored files.

## 5. Prepare the larger-video and traffic stage
- Adaptive video streaming and server-side permanent watermark encoding need a dedicated media-processing service with written adult-content approval. Research compatible options before asking you to authorize an account, credentials, or costs; do not implement a pretend processor or an unsupported long-running server.
- Keep existing private playback working until that service is configured and tested. Larger videos remain constrained by the safe current processing path meanwhile.
- Run controlled, bounded tests against an isolated environment with representative content. No unbounded production traffic test or invented capacity claims.
- Measure playback, upload, query, and renewal performance; use the results to set staged traffic limits and decide when paid compute/storage upgrades are warranted.

## Verification and delivery
- Add rule-focused tests for renewal authorization, unpaid/insufficient-token cases, concurrent retries, atomic rollback, 14-day duration, and eligible revenue splits.
- Test bounded data loading, authorized link renewal, upload retry behavior, complete monthly totals, and account-scoped updates.
- Deploy applicable database changes and functions, run the affected tests, check current errors, and exercise available signed-in workflows with real account state.
- Distinguish automated/isolated tests from real paid-provider and live verified-creator checks. Report any unavailable end-to-end checks honestly.
- Keep a checklist of completed fixes and outstanding dependencies. No settings upgrade, paid service commitment, production restore, or media deletion is included by default.

## Technical approach
- Use database transactions and protected server-only functions for renewal money/access mutations, with explicit grants and concurrency locks.
- Apply schema changes through managed migrations; keep the existing scheduler’s authentication contract because this project lacks the managed HTTP scheduling helper.
- Reuse existing UI controls and design tokens; consolidate upload and signed-playback behavior into shared modules rather than duplicating it across surfaces.
- External approvals, an isolated recovery destination, backup timestamp evidence, media copies, and real payment/verified-creator checks remain dependencies—not items code changes alone can complete.