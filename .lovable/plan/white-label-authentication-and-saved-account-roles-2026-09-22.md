# White-label authentication and saved account roles

## Build
- Remove user-visible Lovable references from page metadata, login code, and project documentation.
- Replace the brokered Google login call with direct Google authentication so the app no longer sends users through a Lovable permission page. Google may still show its own required consent screen on first use.
- Add a private account-preferences table that securely stores each signed-in user's email, Creator/Customer choice, and customer browsing preference.
- Save the first account choice to the database and use it on every later login to open the correct dashboard automatically.
- Keep the existing profile and security-role records synchronized so creator verification and dashboard permissions continue working.

## Verification
- Confirm returning Creator and Customer accounts skip the role picker.
- Confirm new accounts choose once and their selection persists after logout and login.
- Check login, password reset, Google authentication setup, routes, and production compilation.

## Technical details
- Account data will be protected so users can only read and update their own preference record.
- Role writes will use a protected database function tied to the active signed-in account, not a browser-provided email.
- Tooling-only package names may remain internally where required by the editor, but none will be visible in the finished app.
