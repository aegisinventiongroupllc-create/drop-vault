# DTT recovery and growth gates

## Current evidence — 18 October 2026
- Automatic subscription renewal now uses a service-only atomic function. Isolated tests exercise original splits, exactly 14 days, retry protection, authorization, insufficient balance, and rollback. Concurrent-worker stress is not yet exercised.
- Teaser discovery, creator search, studio and private vault reads use 24-item pages. Playback remains original uploaded files, not adaptive streaming.
- Watermarked files of 6 MiB or more use resumable transfers with retries. Browser watermark encoding still imposes the existing 512 MiB/device limit. Actual interrupted live transfers remain unverified because no eligible live-Yoti creator upload was available.
- Current stored files: 1 teaser (6,246,575 bytes), 4 private avatars (3,170,982 bytes), 6 verification files (309,917 bytes). This inventory is not a backup.
- Earlier read-only health: Tiny compute, 13/60 connections, 55% memory, daily database snapshots reported with roughly 14-day retention. Snapshot availability and restoration were not demonstrated.
- Signed-in creator Analytics, Media and Feed opened without page errors. The account has no completed earnings or vault uploads; populated/payed playback is not an end-to-end verified flow.

## Recovery procedure — not yet executed
1. Open More → Cloud → Database → Backups and record the newest snapshot timestamp in UTC. This page is the only evidence of available snapshots; no backup inventory tool is available. Lovable Cloud documents one daily database-only backup with up to roughly 14 days retained. Point-in-time recovery is unavailable. The Backups page restores only the same project's database in place; do not use it for this isolated rehearsal.
2. Obtain written approval for a separate private backup destination covering consensual adult UGC and sensitive verification records; confirm residency, encryption, access logging, retention and deletion requirements.
3. Export the database through More → Cloud → Overview → Advanced settings → Export project data → Export data → Database → Export → Start export. Download from the emailed link or Cloud → Storage. The backend must be running; limits are a 15 GB database, a 5 GB export and one export every 24 hours. This preserves schema, data and user accounts including password hashes, but excludes storage files, Edge Function code, secrets and sign-in provider settings/API keys. Download storage files separately through More → Cloud → Storage into a secure owner-controlled location, with a manifest (bucket, path, size, checksum). Neither daily snapshots nor the database export includes storage files. Do not use database dump scripts or service-role media-copy code; never put credentials, private records or media in this repository.
4. The supported isolated alternative is to restore the export into a separate Supabase project owned by the user, not another Cloud backend through the Backups page. Remix copies tables and Edge Functions without data; it is not a data backup. Reconfigure sign-in providers and API keys at the destination; users retain passwords through exported hashes. Verify sign-in, accounts/roles, balances, completed ledger, subscriptions, delivery expiry, media checksums and signed playback; disable outbound payments, scheduled renewals and notices during rehearsal.
5. Measure data-loss window and restore duration; owner selects acceptable recovery targets. Record the rehearsal result before claiming recovery readiness.

For any later in-place restore: export first to preserve the current state; all writes after the selected daily snapshot are lost and the schema reverts too, potentially no longer matching the app. Restore is permanent and the database is unavailable for a few minutes. This project currently has one shared backend serving preview and published app; no isolated Test environment was established. If separate Test/Live environments become available, confirm which one before any export or restore.

## Video and storage approval gate
Ask Cloudflare Stream/R2, Mux and/or Backblaze B2 for written permission for the exact DTT adult marketplace model. None is confirmed approved by this assessment. Approval for streaming does not automatically approve backup storage. Keep a separate original-file copy when a streaming service cannot export the exact input.
Do not install credentials or move existing media until destination, price, access rules, watermark behavior and content-policy approval are confirmed.

## Growth test gate
- Confirm actual project storage/bandwidth quotas, cost alerts and database backup terms; these were not established from app source or storage inventory.
- Use an isolated test environment and synthetic accounts; no real customer spending, email or private media. Start with small concurrency and stop on errors or saturation.
- Exercise discovery, signed playback, upload interruption, simultaneous renewals, wallet/ledger reads and translation bursts; monitor connection saturation, query latency, service errors, memory, video startup and bandwidth cost.
- Choose traffic/SLO and monthly-budget targets with the owner. Raise compute only from observed saturation and supported limits; no million-user capacity claim is justified by this tiny dataset.
- Add cross-instance translation-miss coordination and rate limiting before sustained public traffic; current coalescing is per running service only.
- Audit remaining realtime/high-frequency heart writes and seek workload-specific database indexes from measured query plans.

No paid service purchase, compute upgrade, production restore, external backup copy or high-volume load test was performed.