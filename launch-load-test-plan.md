# DTT controlled launch traffic test plan

Prepared November 20, 2026, approximately 21:54 UTC.

## Decision: no spending, no load test now

The owner selected **No spending yet**. This request authorizes planning and read-only diagnosis, not traffic generation. No load test, signup burst, media transfer, AI generation, invoice, resource resize, paid testing service, provider contact or publication was performed. Ordinary existing app operation and read-only diagnostic services are not a guarantee of a zero bill.

**Recommendation:** first protect and measure the public countdown/creator invitation journey, then test account actions and media separately in isolation. A million simultaneous visitors is an unverified goal, not a capacity claim. No upgrade is justified by today's quiet snapshot alone.

## What was actually observed

| Evidence | Observation | What it does not establish |
| --- | --- | --- |
| Current Lovable Cloud database snapshot | Up; memory 52%; connections 17/60; connection pool clients 1/200; data disk 4%; database 37 MB; no recent exhaustion alerts returned | Sustained CPU, peak headroom, response times under crowds, or million-user capacity |
| Query statistics, top five by cumulative execution time | Legal-consent insert: 57 calls, 7.80 ms mean, 155.56 ms maximum; age-receipt read: 321 calls, 1.19 ms mean, 145.93 ms maximum. Sample includes a temporary test-function definition | Production-only workload or a representative measurement window. Database statistics reset time returned null; elapsed SQL time is not CPU time |
| Existing indexes | Media creator/bucket, subscription customer/creator, waitlist country/join date, delivery bucket/path and translation language/source indexes exist | Index usefulness under launch-sized data; query plans and write impact still need measurement |
| Recorded usage, November 14 through partial November 20, ending 21:53:58 UTC | Run categories requested about 13.61 credits, including 11.64 database credits over 150.37 instance-hours, about 1.94 gateway credits, and 676 function invocations. Build requested about 297.75 credits separately | Cash paid, a measured cost per visitor, or a launch forecast. Recording can lag activity and does not distinguish preview from live traffic |
| Source inspection | Findings below | Execution frequency, live hosting cache headers, provider quotas, or observed savings |

The database's 5,409 rolled-back transactions are cumulative since boot, not a present error rate. Do not interpret that count as current overload. No new recent preview error output was available from the inspected observability files.

## Likely bottlenecks and proposed safeguards

These are **candidates**, not confirmed overload diagnoses or authorized changes.

### 1. Region verification can delay entry independently of the database

`src/components/GeoGate.tsx` calls ipapi.co, then ipwho.is if needed, with sequential five-second timeouts and no cache. A cold visit can therefore spend roughly ten seconds waiting plus overhead. An X campaign could stress provider quotas. Many test visitors sharing one outgoing IP could hit provider limits and create a misleading failure.

**Safeguard proposal:** obtain documented request limits and permission before testing either provider. Investigate a trusted, server-enforced country signal appropriate to DTT's compliance rules. Never bypass region restrictions, trust an editable browser country, or make failures allow entry. Offline tests should simulate allowed, restricted, unavailable and rate-limited responses; they cannot prove real location accuracy. Missing now: real provider latency, quota commitments and reliable server jurisdiction enforcement evidence.

### 2. Public page delivery and phone rendering are separate capacity problems

`src/App.tsx` imports routed pages eagerly, including administrative and creator screens. The underlying routed app can mount while the launch overlay is visible. `LaunchIntro.tsx` uses a galaxy image, continuously animated canvas with 260 particles, a globe and a local one-second countdown. The countdown itself makes no server request. The shared entry galaxy source is about 255 KiB, but the actual compressed first-visit payload has not been measured.

**Safeguard proposal:** measure downloaded bytes, unused code, requests triggered behind the intro, and phone long tasks; consider splitting non-entry screens into separately loaded files. Preserve the pink globe/galaxy, language access and reduced-motion behavior. Verify real CDN compression, cache hits and correctly versioned public assets. `nginx.conf` describes self-hosted caching, not proof of the live Lovable hosting configuration. Do not cache private pages or signed media as public content. Missing now: live cache headers, first-load bundle trace and representative low-end phone performance.

### 3. Background refreshes can multiply with open tabs

`useAppUpdate.ts` makes an immediate cache-busted HEAD request to index.html and repeats every 60 seconds. Hypothetically, one million open tabs means about **16,667 update-check requests/second on average**, excluding the initial burst. `useRevenueTerms.ts` refreshes creator terms every 30 seconds; that would mean **33,333 database calls/second** only if one million creator tabs mounted that hook. These are arithmetic scenarios, not measured activity.

**Safeguard proposal:** consider conditional version checks, randomized timing, pausing hidden tabs, and shared/cached creator reads where freshness permits. Measure how many hook instances mount per account. Do not change financial-data freshness without the owner's agreement. Missing now: live request counts and mounted-hook frequencies.

### 4. Private video link generation fans out into database and vendor work

`teaser-media/index.ts` accepts up to 24 paths and signs them in parallel. `vault-media/index.ts` has repeated role/subscription checks, per-item content clearance and delivery work. `_shared/bunnyStream.ts` reads delivery/version evidence and calls Bunny's video-status API for each delivered video. The vault early-access lookup reads the customer's purchase IDs without limiting them to the current page.

**Safeguard proposal:** investigate account-scoped batch authorization, page-scoped early-access lookups and bounded vendor-status checks with short-lived, invalidatable processing-state caching. Preserve clearance/version checks, bans, withdrawals, fifth-video rights, access expiry and private originals. Batch work must never mean skipping checks. Missing now: invocation traces, query plans, Bunny status-API limits, playback bandwidth, startup/stall measurements and written content/capacity acceptance. CDN capacity does not prove database authorization capacity.

### 5. Upload smoothness includes the creator's phone

`mediaWatermark.ts` permanently brands videos in the browser and rejects files above 512 MiB; this can use significant phone memory before any upload occurs. `resumableUpload.ts` uses 6 MiB chunks and bounded retries. Resumability does not establish total upload throughput. Human DTT ID/content review is also an operational queue, not a software-only throughput problem.

**Safeguard proposal:** pilot small, permanently branded synthetic files on representative phones; measure encoding separately from upload/processing. Test interruption and resumption, expired sessions, failed registration and correct pending status after reload. Do not remove branding, increase limits blindly, use real ID documents in load traffic, or auto-approve creators. Missing now: real long-video success, device memory/encode duration, upload/processing quotas and reviewer turnaround capacity.

### 6. New-language demand can cause duplicate AI work

`AutoTranslator.tsx` uses saved catalogs for visitors and only invokes translation for signed-in users; batches are limited to 60 phrases with bounded attempts. `translate-text/index.ts` checks the saved cache, but its in-progress deduplication map is local to one function instance. Multiple instances can translate the same uncached phrases simultaneously.

**Safeguard proposal:** finish saved launch-language catalogs and consider distributed deduplication/rate limits for member-only cache misses. Keep legal/payment wording reviewed and never send private user input as UI text. Disable outbound AI in the isolated first test. Missing now: launch cache-miss rate and representative request-level quality/cost evidence. No model change or AI spend is authorized.

## Define the launch workload before buying capacity

One million X impressions, one million site visits over a day, and one million simultaneous users are different events. Hypothetically, one million site arrivals over 24 hours averages **11.6 arrivals/second**; over ten minutes it averages **1,667/second**, before page assets and account actions. Simultaneous sessions depend on how long visitors stay: roughly arrivals/second × average seconds on site in a stable workload. An ad impression is not a site arrival.

Record expected peak arrivals/minute, session duration, countries, device mix, signup proportion and playback proportion. Start with public countdown/invitation browsing; test creator signup, customer tickets, creator VIP interest and approved playback as separate scenarios. No assumed signup percentage should send real email or create real accounts.

## Test phases — each future phase requires separate approval

| Phase | Proposed workload | Guardrail and decision |
| --- | --- | --- |
| 0: offline preparation | Browser fixtures on local files with **all external requests blocked**; countdown, allowed/restricted regions, offline failures and reduced motion | No hosted traffic, account creation or AI. Not run in this request. Offline success is correctness evidence, not hosting capacity |
| 1: bounded isolated pilot | 1, then 5, then 10 concurrent visitors. Each step: 30-second ramp, two-minute hold, one-minute cooldown | Separate funded backend/storage if available; total cap 250 journeys, 1,000 backend requests, 100 MB transferred and ten minutes across the pilot. Stop at any cap. Approve exact cost first; caps may end a stage early |
| 2: isolated public arrival test | 25, 50, then 100 concurrent visitors, five-minute holds and two-minute cooldowns; explicit arrival-rate and request caps | Approve a new workload and cost allowance before each level. Mostly protocol-based visitors plus a few real browsers to measure rendering; mock unapproved third-party calls |
| 3: controlled member/media test | Separate 1/5/10 creator write sessions and 1/5/10 playback sessions with synthetic, private, branded media | Independent byte/invocation/write caps and test-only valid entitlements. No real merchant payment, real ID, revenue split changes, waitlist offers, VIP inventory consumption or production approval |
| 4: small live-site canary | Only after isolated success, live hosting/provider permission and a separately approved bounded workload | Preview and published app share the same backend today; preview is **not isolation**. Stop before affecting actual onboarding. No automatic increase or million-user production stress test |

Use an established load tool such as k6 or Locust later; do not install paid services or deploy a runner now. Use a rate-controlled arrival scenario with a concurrency ceiling, request deadlines and capped retries; record arrivals that could not start rather than silently dropping them. Give every journey realistic pauses and distinguish first visits from cached returns. Ramp smoothly, then separately approve a small burst test for X spikes. A small browser sample measures visual performance; protocol requests alone cannot prove the globe renders smoothly.

Fixtures for media/approval/VIP race tests must live in a genuinely isolated environment with equivalent protections. Do not invent real-world eligibility, debit production balances or treat simulated provider receipts as production payments. Final genuine creator approval/upload/playback still requires willing adults and the owner's lawful review.

## Required safeguards before any paid or hosted run

1. **Owner approval:** exact environment, endpoints, region, time, maximum arrivals, concurrent visitors, requests, bytes, duration and extra spending in the billing currency. A budget answer is not blanket permission to run.
2. **Isolation and vendor authorization:** confirm separate database, private buckets, test-only email sink and no live payment/AI/external callbacks. Confirm hosting, location and media-provider test limits; no tests against provider endpoints without permission. Do not change or pause the shared live backend.
3. **Two stop controls:** runner-enforced request/byte/time ceilings plus a human-accessible kill switch; cap outstanding requests and retries. Block all destinations except the explicit allowlist. No detached unattended run or automatic stage escalation.
4. **Billing controls:** verify which project/provider limits and alerts actually exist, their delay, currency and hard-stop behavior. Use conservative estimates before each stage and leave a safety reserve. A delayed billing alert is not a real-time spending cap. If no enforceable acceptable bound exists, do not run.
5. **Security and recovery:** confirm edge bot/rate-limit protections and account/email throttles without weakening private-media authorization. Synthetic accounts only, no screenshots/logs containing IDs, tokens, signed URLs, emails or customer records. Verify database backup and separate media recovery; never restore over production.
6. **Monitoring:** timestamp the baseline and every stage; obtain CPU/memory/connection histories, request rate/error/latency, function concurrency, provider 429s, CDN bytes/cache hits, upload backlog, AI calls and cost counters. Separate test-tagged activity from ordinary users without changing protected audit records. Scheduled-job inventory/history and auth quotas remain unavailable in this review and must be checked before selecting a test window.

## Proposed acceptance and emergency-stop thresholds

These are planning targets, not guarantees or changes to the app. Confirm thresholds before a run and compare identical workloads.

| Signal | Proposed passing target | Stop / do not advance |
| --- | --- | --- |
| Public entry, representative phone/browser | 95% show the usable first screen within 3 seconds; report region-check time separately | Blank screen, unusable globe, blocked language selection or worsening long tasks |
| Successful account/metadata requests | p95 ≤ 1 second; p99 ≤ 3 seconds; unexpected failures < 1% | > 1% unexpected failures for 60 seconds, p95 > 2 seconds for 60 seconds, or p99 > 5 seconds for 60 seconds |
| Resource pressure | Observe stable load and recovery, with headroom | CPU or memory > 80%, or database connections > 70% (42/60 on today's limit) for 60 seconds; any out-of-memory kill or outage stops immediately |
| Dependency limits | No unexpected throttling or growing backlog | Sustained provider 429s for 30 seconds or queue grows throughout a two-minute hold |
| Video pilot | p95 start ≤ 3 seconds; rebuffer time < 1% of played time on the stated network | Access leak, persistent startup/stalls, expired access still working, or byte cap reached |
| Correctness, privacy, spending | No duplicate tickets/credits, inventory overrun, private-record exposure or unexpected external calls | Any such event, any cap reached, or estimate approaches the approved budget: stop immediately |

Intentional restricted-country, expired-access and rate-limit test responses are reported separately from unexpected failures. Small pilots may not yield meaningful percentiles; retain individual timings and counts. The load generator must not saturate itself—measure runner CPU, bandwidth, dropped arrivals and outbound-IP effects. After every stage, ensure activity returns toward baseline before proceeding; retain a bounded cooldown, and stop new arrivals rather than deleting evidence.

## Cost envelope, not a quote or forecast

Current returned Cloud rates are **requested credits**, not dollars: functions 0.00001/invocation; uncached egress 0.45/GB; cached egress 0.15/GB; file storage 0.00014384/GB-hour. The returned hosting pageview quote is 0.00152/pageview; whether the test uses that meter, other hosting meters, or external delivery must be verified. Instance-hours continue while the instance runs; ordinary requests do not automatically add another instance-hour per visitor.

For illustration only, if Phase 1 produces exactly 250 billed pageviews, 1,000 function invocations and 0.1 decimal GB entirely on Cloud egress, those three meters request **0.405–0.435 credits**. This excludes compute, any separate test environment, other hosting meters, runner service, retained storage, realtime, external provider calls and taxes. It is **not a maximum bill** and does not authorize that traffic. Obtain a complete applicable quote and convert to the owner's approved cash ceiling before running.

Video can dominate: ten continuous viewers at a hypothetical 3 Mbps for five minutes deliver approximately **1.125 GB** before overhead/retries. Playback may use Bunny rather than Cloud egress; current Bunny pricing, limits and account funding were not verified here. No dollar estimate or savings claim is supported.

## Go/no-go recommendation

**Now: plan only.** Keep recruiting in small batches rather than treating a million-user target as proven. Prioritize region-provider resilience, public payload/cache measurements, background-poll amplification and per-video authorization/vendor fan-out before paying for greater capacity.

If future measurements show sustained CPU/memory/connection pressure after inefficient work is addressed, compare larger Lovable Cloud instances with the same workload and get approval for the cost. Increasing database disk would not fix phone animation, external location failures, video bandwidth or query fan-out. Today's low disk usage does not call for a disk increase.

The next runnable step is offline preparation with outbound traffic blocked; even a small hosted pilot remains held until the owner explicitly authorizes its environment, limits and complete cost envelope. No test scripts, app changes or paid resources have been added by this review.