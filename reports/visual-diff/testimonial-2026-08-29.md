# Visual diff — sgs/testimonial — 2026-08-29

verdict: PASS
intent_capture_passed: true
live_verified: true
source_sha: dea1188427687cce
block: testimonial
url: https://sandybrown-nightingale-600381.hostingersite.com/?p=3076
method: live computed-style measurement (getComputedStyle) on the deployed canary, with the
        mouse driven to real coordinates via CDP so `:hover` genuinely matches

Pays the MANUAL SKIP logged at `2026-08-29 10:42:17` in `manual-skips.log`.

⚠ `source_sha` updated below to cover a SECOND, unrelated change staged the same day (the
border-none fix) — see the new section at the bottom. Everything above this line is the
original hover-colour report, unedited; nothing in it was re-measured or re-verified today.

## What changed

`render.php` only (plus a `block.json` manifest declaration that renders nothing).
`quoteColourHover` was emitted inside the root `$hover_decls` bucket, against `$root_sel`.
It is now emitted independently, as an ancestor-hover rule against the quote element:

```
{root}:hover .sgs-testimonial__quote,
{root}:focus-within .sgs-testimonial__quote { color: … }
```

## The defect this fixes — it was INERT, not merely mis-targeted

Two faults, and the second is worse than the handoff described:

1. **Gated.** The declaration sat inside `if ( $hover_decls )`, so setting `quoteColourHover`
   alone emitted nothing at all — it only appeared if an unrelated hover attribute was also set.
2. **Unreachable even when it did emit.** It painted `color` on the card root. The quote carries
   its own explicit `color` whenever `quoteColour` is set, and an explicit declaration on an
   element beats an inherited value regardless of specificity (`sgs/post-grid/render.php:551-563`
   documents this exact constraint). So in the normal case — client sets a resting quote colour —
   the hover colour could never reach the quote.

## Measurement

Probe page 3076, authored with `quoteColour: #1a1a1a` and `quoteColourHover: #c81e1e`
(explicit hex, so the expected values are unambiguous). Attributes verified to round-trip
through KSES in stored `post_content` before measuring.

| State | `.sgs-testimonial__quote` colour | `.wp-block-sgs-testimonial` colour |
|---|---|---|
| Resting (mouse parked at 5,5) | `rgb(26, 26, 26)` | `rgb(58, 46, 38)` |
| Card hovered (`:hover` confirmed true) | **`rgb(200, 30, 30)`** | `rgb(58, 46, 38)` |

`rgb(26,26,26)` = `#1a1a1a`, `rgb(200,30,30)` = `#c81e1e`.

**BOTH halves asserted, deliberately.** The intended element changes AND the block root does
not. Checking only the intended element cannot distinguish this fix from the bug it replaced —
the bug also changed something. The card's own `color` is byte-identical across both states.

`t.matches(':hover')` was asserted `true` in the same evaluation that read the colour, so the
hover reading cannot be a resting reading mislabelled.

## Instrument note — why this was measured by hand

⚠ `computed-parity.js` **cannot** verify this. Measured, not inherited:
`grep -c -i hover plugins/sgs-blocks/scripts/parity/computed-parity.js` returns **0**. It scores
resting styles only, so a correct hover fix and a broken one both come back green. Any future
hover change on this block needs the same manual measurement.

⚠ SGS block CSS is lifted into `uploads/sgs-css/`, so grepping page HTML proves nothing — the
figures above are `getComputedStyle` on the painted node.

## A measurement trap hit during this run — recorded so it is not repeated

The first reading of the sibling process-steps badge returned the HOVER colour at rest. It was
not a defect: the mouse happened to be over the element when the page loaded. Parking the mouse
at (5,5) and re-reading gave the correct resting value. **Park the mouse explicitly and assert
`:hover` state in the same evaluation** — a resting reading taken under an accidental hover looks
exactly like a broken resting rule.

## Second change, same day — border-none override (unrelated to the hover fix above)

Part of a 36-block universal fix (see `check-border-roundtrip.js` fixture work, same session):
when an operator picks `borderStyle: "none"`, `render.php` now emits an explicit
`{border-style:none;border-width:0;}` override at the block's own scoped selector, instead of
emitting nothing for that state. A new `else` branch onto the existing
`if ( 'none' !== $border_style )` guard — no existing branch's logic touched, including the hover
fix documented above.

**Assertion:** `sgs/testimonial` has no hardcoded CSS border declaration on the same selector its
border control targets (confirmed by reading `style.css` and `render.php` before writing the
codemod). Adding an explicit "no border" override changes nothing observable for this block.

**Live result:** `check-border-roundtrip.js --blocks sgs/testimonial` — PASS. The
`borderStyle:"none"` instance painted `0px none` (unchanged), the `borderStyle:"solid"` instance
painted the expected 4px border.

**Risk:** none — no colliding default exists on this block, confirmed by inspection.
