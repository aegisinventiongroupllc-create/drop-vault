# Static Legal Footer

## Goal
Remove the legal block from the fixed bottom navigation and show one comprehensive legal footer in normal page flow.

## Changes
- Keep the four-item bottom navigation fixed, without legal links or copyright text inside it.
- Place the existing comprehensive legal footer once at the bottom of each customer-facing view.
- Preserve every required link: Terms, Privacy, Refunds, AML/KYC, Risk, Restricted Countries, Complaints, 18 U.S.C. § 2257, DMCA, Contact, and copyright details.
- Adjust bottom spacing so navigation does not cover page content or the footer on mobile.
- Verify scrolling and footer visibility at the current mobile size and on desktop.

## Technical details
- Reuse the existing `LegalFooter` and its policy dialogs.
- Remove its rendering from `BottomNav` and render it after each page’s main content, avoiding duplicate instances already present in feed/trending views.
