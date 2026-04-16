---
name: Dual-Bucket Revenue Model
description: Tax-then-split formula — $1 admin fee deducted first, then 90/10 split on base amount
type: feature
---

## Dual-Bucket "Tax then Split" Formula

### Token Purchases
- 1 Bit-Token: Customer pays $21. $1 → Admin_Profit_Vault. $20 base → $2 platform (10%) + $18 creator (90%). Platform total: $3.
- 5 Bit-Tokens: Customer pays $101. $1 → Admin_Profit_Vault. $100 base → $10 platform (10%) + $90 creator (90%). Platform total: $11.

### Custom Requests ($500–$10,001)
- Flat $1 admin fee added to invoice regardless of request size.
- Platform takes 10% of base amount.
- Creator receives 90% of base amount.

### Key Functions
- `calculateTokenPurchaseSplit(invoiceAmount, tokenCount)` — returns full breakdown
- `calculateCustomRequestSplit(baseAmount)` — returns custom request breakdown

### Tiers
- Standard: $500
- Premium: $1,000
- Exclusive: $2,500
- Ultra VIP: $5,000
- Legendary: $10,001
