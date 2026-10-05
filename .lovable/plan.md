# Permanent DTT watermark

- Put a visible **DTT** mark in the lower-right corner of new creator photos and videos, with the **second T pink** and the other letters white with a dark outline.
- Embed the mark in the actual file before upload—not just on the screen—so it remains in downloaded and reposted copies.
- Cover teaser videos, vault photos/videos, and creator public profile photos. Do not mark private identity-verification documents or customer selfies.
- Show processing progress and stop the upload if watermarking fails, rather than uploading an unmarked original.
- Verify both a saved photo and a saved video retain the mark.

## Limits

- Existing uploads are not changed automatically in this first pass; they need separate reprocessing or replacement. Previously downloaded copies cannot be changed.
- A watermark identifies the source but cannot prevent someone deliberately cropping or editing it out.
- Long videos will take additional time and device memory to process before upload.

## Technical details

Use a shared browser-side media processor: canvas for photos and a lazy-loaded FFmpeg WebAssembly encoder for videos. Wire it into both current creator upload paths, retain video audio, and upload only the processed output.