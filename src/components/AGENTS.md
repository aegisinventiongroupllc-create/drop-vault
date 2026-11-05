# Component architecture rules

- Intro presentation stays scoped to launch-intro.css; reduced motion shows the unobscured globe immediately. Why: opening changes must not alter shared entry, idle or saved themes.
- Intro entry readiness uses a shared timer hook to gate text visibility and dismissal together. Why: hidden prompts must not permit premature entry.