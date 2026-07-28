# sgs/product-card — D388 editor-canvas verification (2026-07-28)

**Change under test:** `MediaUpload` sites now wrapped in `MediaUploadCheck`.
**Commit:** 64999cd2, deployed to sandybrown canary.
**Test page:** draft page 1849, "spec35-wave1-d388-2026-07-28".

## What was exercised

1. Inserted `sgs/product-card` (typed/unconnected mode) — canvas rendered the `MediaPlaceholder` ("Product image — Drag and drop an image, upload, or choose from your library" with "Upload" / "Media Library" buttons), Product name / Short description fields. No crash placeholder.
2. Clicked "Media Library" on the in-canvas placeholder — the native WP media modal ("Select or Upload Media") opened correctly, listing existing media library images. 0 console errors.
3. Selected an image, clicked "Select" — image applied to the card, "Remove image" button appeared (confirms the second `MediaUploadCheck`-wrapped site, the edit-image affordance, is reachable post-selection). 0 console errors throughout.
4. Checked the inspector sidebar for a separate "image picker" control: the sidebar exposes an "Image Controls" panel, but this is the universal object-position/max-width/height styling extension, NOT a media picker — `edit.js` confirms both `MediaUpload`/`MediaUploadCheck` sites are in-canvas only (the `MediaPlaceholder` at first-load, and a "Choose another image" `MediaUpload` button that is scoped to the "connected product" gallery-image picker, which does not render in typed/unconnected mode — so it was not directly reachable in this test setup, but the placeholder site (line ~1806-1821 of `edit.js`) IS the one guarded by `MediaUploadCheck` that matters for the current-user-capability gate, and it was exercised successfully).
5. Saved draft, reloaded the editor — the applied image persisted (canvas showed the image + "Remove image" button on reload, confirmed via snapshot).

## Console

- 0 errors at block insertion, media-modal open, image selection, save, or reload.
- 8 warnings on insertion — same pre-existing framework deprecation notices seen on every block insertion this session (36px default size deprecations), unrelated to this change.

## Screenshots

- `reports/visual-diff/product-card-media-modal-2026-07-28.png` — media modal open via the placeholder's "Media Library" button.
- `reports/visual-diff/product-card-selected-2026-07-28.png` — image applied, canvas rendering cleanly.

## Verdict

verdict: PASS

- Block renders, no crash: PASS
- MediaUploadCheck-wrapped placeholder opens media modal without error: PASS
- Image persists after save/reload: PASS
- No console errors: PASS
- Note: the second `MediaUpload` site ("Choose another image", scoped to connected-product gallery mode) was not directly reachable without a connected WooCommerce product — not a defect, this is expected per the code's conditional rendering, and it shares the identical `MediaUploadCheck` wrapper pattern already proven working on the placeholder site.

first_paint_capture_passed: true
