# Component architecture rules

- Intro presentation stays scoped to launch-intro.css; reduced motion shows the unobscured globe immediately. Why: opening changes must not alter shared entry, idle or saved themes.
- Intro entry readiness uses a shared timer hook to gate text visibility and dismissal together. Why: hidden prompts must not permit premature entry.
- Hide the global language pill only when an unobscured page selector exists; never let open-menu selections start dragging. Why: retain pre-entry language access without duplicates.
- Fifth-video access uses its own server purchase and the existing atomic unlock/escrow; signing filters unpaid fifth videos and storage applies a restrictive entitlement rule. Why: regular or annual access must never bypass its separate payment.
