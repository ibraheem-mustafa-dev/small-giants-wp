---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/feature-grid D303 class-scope normalisation"
block: sgs/feature-grid
date: 2026-07-10
wave: "D303 residual render-precedence — block normalisation"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/feature-grid — D303 per-instance scope normalisation (LANDED)

**Verdict: PASS.** feature-grid self-rolled its per-instance scoped CSS at ID specificity
(`#$uid.sgs-feature-grid`, 1,1,0) and applied `$uid` only as an `id` attribute. D303 moves it to
class level (`.$uid.sgs-feature-grid`, 0,2,0) and adds `$uid` to the wrapper class list so the
selectors match — so the appended `sgsCustomCss` residual (0,2,0) can override it by source order,
with no ID/`!important` escalation. The class-level rule still beats the shared wrapper's `.uid`
(0,1,0), preserving the D270 composite-override.

## Evidence (live, sandybrown page 8, post deploy + OPcache reset)
- **Renders correctly:** `.sgs-feature-grid` computes `display:grid`, `grid-template-columns:
  229.5px ×4` at 1440 (4-col), `152px 152px` at 375 (2-col) — the ingredients grid intact.
- **Carries the uid class:** live class list includes `sgs-fg-6` (was id-only) → the scoped
  colour/border rule now matches the element.
- No regression at 375 / 768 / 1440.

## Gates
- `npm run build` prebuild (dead-controls, hardcoded-defaults 0 net-new — the F3 E8 gate updated
  to recognise class-scoped overrides) + webpack: PASS. 440 converter tests pass.
