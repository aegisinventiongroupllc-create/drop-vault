# White-label password recovery and visibility controls

## Build
- Send password-reset links back to the branded production domain instead of the editor preview domain.
- Add an eye control to reveal or hide the password on login and account creation.
- Add separate eye controls for both new-password fields on the reset page.
- Keep email/password as the only customer authentication method and remove any remaining user-visible Lovable references in this flow.

## Verification
- Confirm login, signup, forgot-password, and reset-password screens render without Google or Lovable branding.
- Confirm each eye control reveals and hides only its related password field.
- Confirm the app still builds successfully.
