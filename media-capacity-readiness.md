# DTT photo/video capacity assessment

## Decision — 20 October 2026, 17:34 UTC

Millions of simultaneous viewers remain an unverified target. Increasing a single-file upload limit or database disk does not establish simultaneous streaming capacity. No quota, instance size, provider toggle or payment setting was changed. No private media was downloaded or deleted and no production load test was run.

## Observed baseline

- All six storage buckets are private. Metadata inventory totals 13 objects and 11,385,736 recorded bytes (about 11.4 MB); metadata size is not allocated capacity or a backup.
- Creator profile photos: zero objects, 8 MiB individual-file limit. Request deliveries: zero objects, 512 MiB individual-file limit. Avatars: six objects, 8 MiB individual-file limit. Teasers: one object, 6,246,575 bytes. Vault: zero objects. Verification files: six objects, 309,917 bytes. Vault, teaser and verification bucket-specific limits are unset; their effective project-wide limit was not returned by available read-only diagnostics.
- Current backend metadata labels the instance Tiny; billing uses the pico compute meter. Health snapshot: up, 59% memory, 12% data disk, 15/60 database connections, 1/200 pool clients, 28.7 MB database, no recent exhaustion alerts. This is a quiet snapshot, not measured peak headroom or a resize recommendation. Database disk is separate from photo/video storage.
- Recorded 7–20 October usage, including the partial current date: 0.089682239 GB uncached delivery and 0.020597019 GB cached delivery. This small volume cannot establish playback concurrency, bitrate, growth or future cost. Recording can lag activity and environment attribution is unavailable.
- Twelve focused watermark, resumable-upload, media-access and teaser-gate tests passed. They prove selected correctness rules, not streaming capacity. Eligible live creator upload and paid customer playback remain unverified.

## Inspected paths and capacity candidates

1. `src/lib/mediaWatermark.ts` / `storageUpload.ts`: browser video encoding has a 512 MiB/device constraint. An approved private processing service is a candidate for large video preparation; do not raise upload limits to bypass permanent branding. Missing measurement: successful encode duration, memory and upload rate on representative creator phones.
2. `src/lib/resumableUpload.ts`: branded files use 6 MiB resumable chunks and bounded retries. This improves interruption recovery but does not increase aggregate capacity. Missing measurement: eligible interrupted upload/readback in isolation and provider upload-throughput quotas.
3. `supabase/functions/vault-media/index.ts`: authorized 24-item pages and expiring signed links; repeated role/subscription reads are a candidate hot path. Preserve authorization and access expiry when optimizing. Missing measurement: representative invocation rate, signing latency, query plans and concurrency under load.
4. Original-file video playback has no established adaptive-bitrate processing/delivery pipeline. An approved private streaming/CDN service is a candidate for smoother playback and lower delivered bytes. Missing measurement: original bitrate, startup/stall rates, signed-link cache behavior and vendor capacity/price/content approval. No byte or credit savings are claimed.

## Hypothetical sizing — not a forecast

Assume one million simultaneous viewers, each watching continuously at 3 megabits/second for one hour: 3 terabits/second aggregate delivery and approximately 1,350,000 decimal GB delivered. This excludes images, uploads, retries, playback overhead, auth/database work and AI.

At the returned Cloud quotes of 0.15 requested credits/GB cached or 0.45 requested credits/GB uncached, that hypothetical hour would request approximately 202,500–607,500 network credits if all bytes used those respective meters. Cache mix, large-volume terms, support at this scale, funding and cash cost are unknown; these quotes are not a million-viewer capacity commitment or dollar bill.

Storage is a different dimension: hypothetically 100,000 creators retaining 10 GB each means 1,000,000 GB of original files, before encoded versions or separate backups. Registered account counts alone do not determine either storage or viewing traffic.

For staged test planning, the same hypothetical bitrate gives 135 GB for 100 simultaneous viewers for one hour, 1,350 GB for 1,000 and 13,500 GB for 10,000. These are workload scenarios, not authorized traffic generation or forecasts. Smaller pilots must also be funded and measured.

A project-scoped running-limit inventory returned no configured credit limits on 20 October. This result does not establish workspace limits or external-provider billing controls. No spending cap was created: the owner supplied no amount, and a hard block could interrupt customer access.

## Next gates, in order

1. Confirm written acceptance of DTT's exact adult-UGC model from the selected storage/streaming and backup services; no vendor is confirmed approved here. Confirm private playback, permanent watermarking, original-file retention and expiring access.
2. Obtain actual total storage/traffic quotas, peak delivery and upload commitments, project-wide upload limit, billing terms and spend-alert/stop behavior. Available inventory/health tools do not establish these.
3. Owner chooses an affordable monthly running-cost ceiling and initial pilot traffic target before paid capacity or workload tests. No unlimited spending authorization is inferred from the million-user aspiration.
4. Establish an isolated funded test environment, live-eligible test creator and verified test-payment method. Do not unlock unpaid production accounts or relax verification.
5. Exercise uploads, photo reads, paid playback, renewal and simultaneous access; record throughput, error rate, startup/stall time, CPU/memory/connections and delivered bytes per successful session. Increase load in stages with agreed stop thresholds, never run a million-user production test.
6. Rehearse separate file backup and database recovery per `recovery-readiness.md`; database snapshots omit storage files. Only measured capacity plus provider commitments can justify a concurrency claim.

The next decision is a funded pilot target and approved delivery service—not simply adding database disk or raising the per-file ceiling.

## Usage-based delivery candidate

Bunny Stream is a research candidate, not selected or approved: official documentation describes [expiring token playback](https://bunny.net/docs/stream/token-authentication), [storage and delivery pricing](https://bunny.net/docs/stream/pricing) and [optional original-file retention](https://bunny.net/docs/stream/storage-structure). Its [acceptable-use policy](https://bunny.net/acceptable-use/) did not establish written acceptance of DTT's adult-UGC model in this review. Do not quote unverified current region rates or million-viewer support. A displayed player logo does not meet DTT's permanent watermark requirement; preserve burned-in branding and separate original backup.

AWS documents [private CloudFront delivery](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html), but DTT-specific content approval, costs and capacity commitments also remain unconfirmed. Neither candidate was connected or contacted.

Copy-ready provider inquiry, not sent: “DTT Media LLC operates an 18+ marketplace for verified adult creators and paying adult customers. Do you accept our exact consensual legal adult photo/video UGC model in writing? Please confirm private expiring playback, permanent watermark encoding, original-file export, separate backup suitability, supported countries, upload and peak delivery quotas, usage-based rates, spending controls and a staged path toward one million simultaneous viewers. We need actual capacity commitments and costs, not an unlimited-storage claim.”