# Keep selfie capture inside the profile

- Open an in-page camera with a live preview, Take Photo button, and upload fallback instead of handing users to the phone camera app.
- Release the camera immediately after capture or closing; keep the selfie only in memory.
- Remove the unnecessary device-side landmark scan from this selfie-only flow, avoiding its heavy processing before generation.
- Preserve existing cartoon generation and automatic profile saving; show failures inside the profile.

## Verification
- Test camera capture and upload in the running app with controlled camera and generation responses, checking that the profile stays open and the save completes.
- Real-phone behavior will still need confirmation on the user's device.