---
block: sgs/container
date: 2026-06-30
verdict: PASS
first_paint_capture_passed: true
change_type: comment-only (no CSS rule/value changed)
---

# Visual-diff — sgs/container — comment-only — 2026-06-30

## Result — PASS (R-22-11)

**No visual change — comment-only.** `src/blocks/container/style.css`: the `!important` on
`background-size`/`background-attachment` (in `.sgs-container--ken-burns` /
`.sgs-container--parallax.no-parallax`) were RETAINED — they are variant-scoped overrides of
the wrapper's OWN inline animation styles (ken-burns zoom keyframe / touch parallax fallback),
NOT converter-transfer overrides (verified). Only the explanatory comment was rewritten. No CSS
rule or value changed → animation variants render identically. First-paint capture not required.
