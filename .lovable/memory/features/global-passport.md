---
name: Global Passport Country Filter
description: Flag-based country selector on creator galleries with Ghost Country demand logging for empty markets
type: feature
---

## Global Passport

- Dropdown with 20 countries + "Worldwide" global option at top of galleries
- Filters DiscoveryFeed and TrendingPage by creator country
- Ghost Country: if 0 creators in selected country, shows recruitment message + logs request to market_demand table
- Country field on profiles table (populated during ID verification)
- Always visible on home and trending tabs alongside language toggle
