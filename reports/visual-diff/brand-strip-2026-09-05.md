---
block: sgs/brand-strip
date: 2026-09-05
verdict: PASS
intent_capture_passed: true
---

# sgs/brand-strip — live intent capture, 2026-09-05

Discharges the manual visual-gate skip taken during the render change. Captured
AFTER deploy against the live canary, probe page 3297
(`[PROBE 2026-09-05] hover-colour + bgSvg render check`).

**Method note.** This project LIFTS block CSS into
`wp-content/uploads/sgs-css/*.css` rather than emitting it inline, so grepping
page HTML proves nothing about the emitted rules. Every assertion below was
read from the LIFTED stylesheet the page links, not from the page source. An
earlier pass of this verification wrongly reported ABSENT for all values by
grepping the HTML; that was a method error, corrected here.

## Assertion

`nameColourHover` must emit as an ancestor-hover rule on
`.sgs-brand-strip__name`, not as a `color:` in the shared root `$root_hover_decls`
bucket where it collided with `textColourHover`'s own `color:` (only one could
survive) and could never reach the name element, which sets its own resting
colour.

## Result — PASS

```
.sgs-brandstrip-a537ad07.wp-block-sgs-brand-strip:hover .sgs-brand-strip__name,
.sgs-brandstrip-a537ad07.wp-block-sgs-brand-strip:focus-within .sgs-brand-strip__name{color:#ab00cd;}
```

Probe set `nameColourHover:#ab00cd` alongside a resting `nameColour:#111111`;
the hover colour is present and correctly scoped to the name element.

Rendering the `__name` element requires `showNames:true` AND a logo item with a
real `media` object — two earlier probe attempts produced no name element at all
and therefore no rule, which is correct behaviour, not a failure.
