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

---

## Session 2 (block-fixes) — layer-model de-style + default-variant inheritance + infinite loop

verdict: PASS
first_paint_capture_passed: true

**1. Layer-model de-style (card-in-a-card fix).** The QC #9 fix above only neutralised the
outer slide `background`; the outer wrapper still painted shadow/radius/padding (a second
card layer). Removed ALL outer card chrome from `.sgs-testimonial-slider__slide--card`
+ the `--minimal`/`--featured`/`--accent` variants, and the dead slider-level
inner-content styles (`__quote`/`__name`/`__stars`/`__avatar`/`__meta`/`__footer` —
the block delegates to `sgs/testimonial` children via `$inner_block->render()`, so those
`.sgs-testimonial-slider__*` selectors targeted markup that no longer renders). The slide
wrapper is now positioning-only; the inner `sgs/testimonial` card (7 built-in variants)
owns 100% of the card chrome.

**2. Slider default-variant inheritance.** `cardStyle` repurposed as a slider-level DEFAULT
variant (7 testimonial variants + "Per-card"), passed to children via
`providesContext: { "sgs/testimonialVariant": "cardStyle" }` → `sgs/testimonial`
`usesContext` + render fallback (own variant → slider context → `classic-card`). Old
per-slide/wrapper `--{cardStyle}` classes removed from render.php + editor className.

**3. Infinite-loop navigation rewrite (view.js).** Replaced the native-scroll model (clamped
at ends, self-fighting scroll-detector, could not rotate when all cards visible) with a
transform-based infinite carousel: edge-cloned slides + seamless `transitionend` boundary
reset + modular index + re-added pointer/touch swipe (`touch-action: pan-y`). Track =
`overflow:hidden` viewport + JS-built `.__list` flex row driven by `translateX`; editor
un-clips via `editor.css overflow:visible`.

Version bumped 0.3.1 → **0.3.4** (CSS + view + render; STOP-57).

### Evidence (live homepage / page 8, sandybrown, deployed 2026-07-06)

Playwright computed-style + interaction:
- **De-style:** `.sgs-testimonial-slider__slide` computed `boxShadow:none`, `background:transparent`,
  `borderRadius:0`, `padding:0` (bare class, no `--card`). Inner `.sgs-testimonial--classic-card`
  carries the chrome: `boxShadow 0 4px 12px`, `background rgb(255,255,255)`, `borderRadius 12px`,
  `padding 20px`. → single card, no double layer.
- **Infinite loop:** next arrow yields activeDot `0→1→2→0→1` (wraps) with a seamless transform
  reset (index 2 x=−1448 → index 0 x=−869, no visible jump); dot sync correct; **zero JS errors**;
  rotates with all 3 cards visible (3 real + 6 clones, `.__list` built, track `overflow:hidden`).
- Screenshot: `testimonial-slider-landed-2026-07-06.png` — one clean card per review.

### Not exercised on page 8 (code-verified, standard WP context pattern)
The default-variant inheritance isn't visible on page 8 (its cards carry explicit `variant`).
Render fallback + context keys verified in source; a server-side render test was blocked by
the wp-content guard (`wp eval`). To confirm at editor use.
