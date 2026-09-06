---
block: sgs/testimonial
date: 2026-09-05
verdict: PASS
intent_capture_passed: true
---

# sgs/testimonial — live intent capture, 2026-09-05

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

Five per-element hover colours must emit as FIVE INDEPENDENT ancestor-hover
rules on their own elements — not stacked as five `color:` declarations in one
root-level rule, where only the last would survive and none would reach an
element that sets its own resting colour.

## Result — PASS

All five emitted, each on its own element, each with its own distinct colour:

```
…:hover .sgs-testimonial__name,   …:focus-within .sgs-testimonial__name{color:#00ff02;}
…:hover .sgs-testimonial__role,   …:focus-within .sgs-testimonial__role{color:#0000f3;}
…:hover .sgs-testimonial__org,    …:focus-within .sgs-testimonial__org{color:#ff00f4;}
…:hover .sgs-testimonial__summary,…:focus-within .sgs-testimonial__summary{color:#ff0001;}
…:hover .sgs-testimonial__rating, …:focus-within .sgs-testimonial__rating{color:#00fff5;}
```

Five distinct probe colours set, five distinct colours present in the output —
the old defect could only ever have produced one.

`:focus-within` twins every `:hover`, preserving the keyboard-equivalent state
the shared helper used to provide.

## Negative control

Searched the lifted CSS for the OLD shape — a root-level
`.sgs-testimonial…:hover{…}` rule carrying two or more `color:` declarations.
**Zero matches.** The stacked bucket is gone, so this is not a case of the new
rules sitting alongside the old ones.
