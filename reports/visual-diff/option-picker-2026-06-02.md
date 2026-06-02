---
block: option-picker
date: 2026-06-02
verdict: PASS
first_paint_capture_passed: true
change_type: design-fix
change_description: >
  Wave-2 /ui-ux-pro-max critique fixes: (1) selected pill now carries a NON-COLOUR
  cue (CSS ::before checkmark + font-weight 700) so selection is distinguishable in
  greyscale — WCAG "colour not sole indicator"; (2) option gap widened 8px→12px
  (spacing--30) for breathing room. version 0.1.1→0.1.2.
verification_method: live canary render + computed-style eval (Playwright)
pixel_diff_skipped: true
pixel_diff_skip_reason: New atomic component, no mockup baseline; verified by rendered output + measurement (R-22-11).
verified_by: opus-main-thread-live-playwright
---

# sgs/option-picker — Wave-2 Design Fixes (2026-06-02)

## Verified live (canary)
- **Non-colour selected cue (CRITICAL):** checked pill computes `font-weight: 700`
  + a `::before` 7px checkmark (border edges in the selected-text colour). Selection
  is now distinguishable without relying on the pink fill. No layout shift on select
  (the `::before` box reserves its space whether checked or not).
- **Spacing:** `.sgs-option-picker__options` gap = 10.72px (was 7px). 44px label tap
  target unchanged.
- All 3 pill styles (outlined/filled/ghost) carry the cue. Zero console errors.
