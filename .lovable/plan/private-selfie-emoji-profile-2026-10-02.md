# Private Selfie Emoji Profile

## What will change
- Remove the manual Avatar Creator controls, including skin, hair, facial features, accessories, clothing, and reset options.
- Keep a simple Women/Men choice and the full-width **Snap Your Face for Emoji** action.
- Save the selected Women/Men style and generated emoji to the signed-in customer’s own profile so it returns on their dashboard.
- Rename **Public Identity** to **Private Identity**.
- Rename **Display name / gaming handle** to **Public Avatar Name**.
- Rename the save action to **Save Private Identity**.
- Add this clear privacy note below the camera action: “Your selfie is never saved. It is processed securely and deleted from our systems after your emoji is created.”
- Keep the generated emoji saved as the profile avatar; only the original selfie is discarded.

## Technical details
- Preserve the existing private, server-side selfie-to-cartoon flow and account-linked avatar storage.
- Remove only the manual editor interface; retain the generated avatar preview, upload progress, retry behavior, and account save flow.
- Keep the customer’s selected presentation style in `profiles.avatar_config` with the generated portrait path.

## Verification
- Confirm the simplified profile screen at mobile and desktop sizes.
- Confirm selecting Women or Men and taking a selfie keeps the customer on the Profile tab.
- Confirm the generated emoji and selected style remain after saving and reloading.
- Confirm the original selfie is never stored.
