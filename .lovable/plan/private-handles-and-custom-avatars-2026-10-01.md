# Private Handles and Custom Avatars

## Goal
Let every signed-in user choose a unique public handle and a custom preset avatar, while keeping account emails private.

## Changes
- Replace the email shown on the Profile tab with an editable public handle and avatar builder.
- Offer a focused set of avatar faces, colors, and accents with a live preview.
- Save the chosen handle and avatar to the signed-in account and enforce unique handles without case-sensitive duplicates.
- Display the chosen avatar and handle beside private fan messages and creator replies.
- Use creator avatars in the streaming feed, creator profile, and saved-library rows.
- Keep raw email addresses out of social and customer-facing views.

## Technical details
- Add `avatar_config` to private profiles and expose only `user_id`, handle, avatar, country, and vault side through the existing public profile view.
- Add a case-insensitive unique handle index and format validation.
- Reuse one avatar renderer across profile, feed, messages, creator profile, and library.
- Preserve current private comment visibility rules; only identity presentation changes.
- Verify account updates, uniqueness errors, and mobile/desktop rendering.
