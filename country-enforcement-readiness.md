# Country restriction preparation — 20 October 2026

## Applied and checked

- Entry denies the existing excluded country list, including Japan and South Africa; Kenya remains outside that list. This is a DTT business exclusion, not a legal whitelist.
- Local admin override and saved country values no longer grant entry.
- Failed or placeholder detection denies entry with retry and legal/contact access. Detection attempts have a five-second timeout per service.
- Policy distinguishes whole-country exclusions from unenforced territory review entries and no longer attributes every exclusion to a processor or law.

## Server enforcement: incomplete — do not launch on this basis

No documented trusted client-IP/country-header contract was established by the available platform guidance. Do not trust caller-supplied forwarded-IP/country headers, profile country, local storage or request JSON to authorize media or payment. A server helper based on those values would create false assurance. No server country protection is claimed or deployed.

Direct authorized storage signing/upload paths and already-issued signed URLs are not protected by the browser entry gate. The current inventory reports all six buckets private; an old migration marked teasers public, which is not evidence of their current public status. Server-controlled delivery/upload authorization and a trusted geolocation boundary must be integrated together, preserving paid access, live creator verification and account privacy. Signed URLs remain usable until expiry and need delivery-layer geographic controls for per-request enforcement.

## Legal launch gates

- US state-specific viewer age-verification applicability, privacy and current enforcement status require qualified advice; US country eligibility is insufficient. [Texas statute](https://statutes.capitol.texas.gov/Docs/CP/htm/CP.129B.htm), [CRS on Paxton](https://www.congress.gov/crs-product/LSB11354).
- UK-linked pornography services may require highly effective viewer age assurance and wider safety duties; creator Yoti verification and an 18+ checkbox do not establish viewer compliance. [Ofcom age assurance](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/age-assurance).
- OFAC restrictions can target individuals/entities and ownership worldwide; country codes are not sanctions screening. [OFAC country-list FAQ](https://ofac.treasury.gov/sanctions-programs-and-country-information/where-is-ofacs-country-list-what-countries-do-i-need-to-worry-about-in-terms-of-us-sanctions).
- Ukrainian restricted territories and other reviewed territories need a separate verified subnational location policy. Public listing is not enforcement.

Next: establish trusted geo delivery and upload/checkout controls, obtain qualified adult-platform legal review and viewer age-assurance requirements. No country is certified safe, no protection against lawsuits is promised, no payment provider/TryBit toggle changed and no publication performed.