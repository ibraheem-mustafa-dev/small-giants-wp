# Visual diff — sgs/process-steps — 2026-08-29

verdict: PASS
intent_capture_passed: true
live_verified: true
source_sha: 41d51bc9cb7ee261
block: process-steps
url: https://sandybrown-nightingale-600381.hostingersite.com/?p=3076
method: live computed-style measurement (getComputedStyle) on the deployed canary, with the
        mouse driven to real coordinates via CDP so `:hover` genuinely matches

Pays the MANUAL SKIP logged at `2026-08-29 10:42:16` in `manual-skips.log`.

⚠ `source_sha` updated below to cover a SECOND, unrelated change staged the same day (the
border-none fix) — see the new section at the bottom. Everything above this line is the
original hover-badge report, unedited; nothing in it was re-measured or re-verified today.

## What changed

`render.php` only (plus a `block.json` manifest declaration that renders nothing).
`numberBackgroundHover` was pushed into the root `$hover_decls` bucket, so it repainted the
whole step card instead of the little numbered badge. It is now emitted against the badge, with
the step as the hover trigger:

```
{root} .sgs-process-steps__step:hover        .sgs-process-steps__number,
{root} .sgs-process-steps__step:focus-within .sgs-process-steps__number { background-color: … }
```

The trigger is not invented: `style.css:169-170` already uses
`.sgs-process-steps__step:hover, …:focus-within` for this block's own lift/scale/glow effects, so
the badge colour now changes in step with the effect the client has already chosen.

⚠ **The handoff prompt was wrong about one half of this.** It claimed the declaration was gated
behind `if ( $hover_decls )` like the testimonial's. It was not — it sat *before* the `if`, so it
did emit. Only the wrong-element defect was real.

## Measurement

Probe page 3076, authored with `numberBackground: #1a1a1a` and
`numberBackgroundHover: #c81e1e` (explicit hex). Attributes verified to round-trip through KSES
in stored `post_content` before measuring.

| State | `.sgs-process-steps__number` background | `.wp-block-sgs-process-steps` background |
|---|---|---|
| Resting (mouse parked at 5,5) | `rgb(26, 26, 26)` | `rgba(0, 0, 0, 0)` |
| Step hovered (`:hover` confirmed true) | **`rgb(200, 30, 30)`** | `rgba(0, 0, 0, 0)` |

`rgb(26,26,26)` = `#1a1a1a`, `rgb(200,30,30)` = `#c81e1e`.

**BOTH halves asserted.** The badge changes AND the block root stays fully transparent — the old
behaviour painted the root, so an unchanged root is the direct evidence the defect is gone.
`s.matches(':hover')` was asserted `true` in the same evaluation that read the colour.

## Deployment verification — and a false negative worth recording

The deployed `build/blocks/process-steps/render.php` on the canary carries the new block at lines
377-383, and the old buggy line is gone (0 matches).

⛔ **My first grep of the deployed file returned 0 and looked like "not deployed".** It searched
for the literal `sgs-process-steps__step:hover`, but the PHP builds that selector by
concatenation (`$step_sel . ':hover'`), so the literal never appears in source. The correct
patterns (`$step_sel`, `number_background_hover`) return 3 each. A grep returning 0 is a
hypothesis, not a finding — pair it with a positive control from the same file.

## Instrument note

⚠ `computed-parity.js` cannot verify this — it contains **zero** occurrences of "hover"
(measured), so it scores resting styles only and greens either way.

⚠ SGS block CSS is lifted into `uploads/sgs-css/`; page-HTML greps prove nothing. The figures
above are `getComputedStyle` on the painted node.

## Second change, same day — border-none override (unrelated to the hover fix above)

Part of a 36-block universal fix (see `check-border-roundtrip.js` fixture work, same session):
when an operator picks `borderStyle: "none"`, `render.php` now emits an explicit
`{border-style:none;border-width:0;}` override at the block's own scoped selector, instead of
emitting nothing for that state. A new `else` branch onto the existing
`if ( 'none' !== $border_style )` guard — no existing branch's logic touched, including the hover
fix documented above.

**Assertion:** `sgs/process-steps` has no hardcoded CSS border declaration on the same selector
its border control targets (confirmed by reading `style.css` and `render.php` before writing the
codemod). Adding an explicit "no border" override changes nothing observable for this block.

**Live result:** `check-border-roundtrip.js --blocks sgs/process-steps` — PASS. The
`borderStyle:"none"` instance painted `0px none` (unchanged), the `borderStyle:"solid"` instance
painted the expected 4px border.

**Risk:** none — no colliding default exists on this block, confirmed by inspection.
