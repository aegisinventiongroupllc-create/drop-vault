# Custom Request Workflow, Tips & Private Dashboard

## What we're building

### 1. Custom Request Negotiation (offer → counter → accept/decline)
- Customer submits a request with a custom bid (tiers already removed)
- Creator sees incoming requests on their dashboard and can **accept**, **decline**, or **counter-offer** (new price + message)
- Customer sees counter-offers and can **accept** or **decline**
- After customer pays, creator has **42 hours** to deliver
- Requests expire after **14 days** if no action
- Creators see a note: "You can reuse request videos in your library to earn more"
- Requests are private — customers only see their own

### 2. Real Request History in Dashboards
- Replace the hardcoded mock data in the customer dashboard with live data from the database
- Creator dashboard gets a new "REQUESTS" tab showing incoming requests with accept/decline/counter controls

### 3. Tips with Processing Fee
- Add the $4 card-processing fee to tips (card path only)
- Wire the tip confirmation to a real payment flow (crypto invoice or CCBill when live)
- Record tips in the transactions table

## Technical details

### Database migration
Add columns to `custom_requests`:
- `counter_offer_usd` (numeric, nullable) — creator's counter price
- `counter_message` (text, nullable) — creator's note with counter
- `expires_at` (timestamptz) — auto-set to created_at + 14 days
- `fulfillment_deadline` (timestamptz, nullable) — set to payment time + 42 hours when status becomes "paid"
- `fulfilled_at` (timestamptz, nullable)

New RLS policies so customers see only their own requests and creators see only requests addressed to them.

### UI changes
- **CustomRequestModal** — already has counter-offer UI; wire it to real data instead of `simulateCounterOffer()`
- **MemberDashboard** — fetch from `custom_requests` where `customer_id = auth.uid()`, show accept/decline for counter-offers
- **Creator dashboard** — add requests tab; accept/decline/counter controls; 42h countdown after payment; reuse-video note
- **CreatorProfile tip modal** — add $4 processing line for card; create crypto invoice on send

### Edge function
- Update `cryptocloud-create-invoice` to handle `kind: "tip"` with the tip amount + $1 fee
