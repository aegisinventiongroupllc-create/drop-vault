# Clean up the creator dashboard

## Confirmed issues
- The detailed revenue explanation appears twice in Analytics and again in Verify.
- The VIP store appears in both Analytics and Verify.
- The revenue banner and teaser strategy tip appear above every tab, including unrelated tasks.
- Top 10 shows customer spending and first-unlock prompts even when the creator is viewing their own fans.

## Changes
1. Keep the current split, milestone progress and countdown in Analytics only. Retain one detailed “How the money works” explanation there, collapsed until opened, alongside monthly earnings history.
2. Keep the VIP store in Analytics only. Remove duplicate revenue explanations and the store from Verify; leave identity and payout setup there. Put the teaser strategy tip in Media only.
3. Give creators neutral Top 10 ranking and empty-state wording. Keep customer-only spending prompts on customer views. Preserve private messaging and ranking rules.

## Verification
- Check Analytics, Verify, Media and Requests/Top 10 with an authenticated creator, without accepting agreements or bypassing approval.
- Check customer versus creator Top 10 presentation and phone layout; run existing earnings/VIP/message tests and confirm the preview has no build errors.
- Preserve all prices, payout splits, purchase availability, permissions and historical earnings. No publishing or provider changes.

## TryBit and Bunny
The screenshots do not establish why TryBit rejected DTT or that they crash-tested it. No Bunny integration reference was found in the app or payment/media functions inspected; having a Bunny account does not prove DTT serves videos through it. Connection and capacity remain unverified.

## Technical approach
Remove duplicate render sites rather than rewrite the dashboard. Reuse the existing revenue component and design-system disclosure controls. Base creator-specific presentation on the authenticated viewer matching the creator, without changing server access rules.