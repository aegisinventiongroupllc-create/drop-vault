# Discreet customer cartoon portraits

- Replace customers’ realistic 3D art direction with the reference’s drawn cartoon style: bold clean outlines, simplified facial features, grouped hair and beard shapes, and smooth cel shading.
- Keep broad selfie traits and expressions while avoiding exact facial reconstruction; apply equally to men and women.
- Leave creator portraits, DTT icons, and profile saving unchanged. Existing saved images stay until a new selfie is generated.

## Technical details
- Select separate customer and creator art directions in the portrait prompt and add regression tests.
- Deploy the portrait generator and verify a live request if authentication and AI access are available; report any blocker without retries.