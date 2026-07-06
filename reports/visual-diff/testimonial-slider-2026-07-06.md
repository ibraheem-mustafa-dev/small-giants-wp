# Visual diff — sgs/testimonial-slider — 2026-07-06

verdict: PASS
first_paint_capture_passed: true

## Change under review

`style.css` only (QC #9, block-side, no shared-file edit):

`.sgs-testimonial-slider__slide--card` background changed from
`var(--wp--preset--color--surface, #fff)` to `transparent`.

Root cause (D228 "hardcoded wrapper defaults are cheats to remove"): the `card` slide
style hardcoded a `surface`-token background. For Mama's, `surface` resolves to `#FBF3DC`
(the cream token), so the slide wrapper painted a cream/yellow rectangle AROUND the
(correctly white) inner `.sgs-testimonial` card — a background the draft never specifies
(the draft has no `.sgs-testimonial-slider` / slide background at all; only the inner card
is white). Defaulting to transparent removes the invented box; an explicit background
attr (inline) still wins when one is set.

## Evidence (live page 8, sandybrown, deployed 2026-07-06)

Playwright computed-style check:
- `.sgs-testimonial-slider__slide--card` background-color: BEFORE `rgb(251,243,220)`
  (`#FBF3DC` cream) → AFTER `transparent` (rgba alpha 0).
- `.sgs-testimonial` (inner card) background-color: `#FFFFFF` — unchanged, still correctly
  white, matching the draft.

The cream/yellow surround is gone; the white testimonial card is unaffected.
