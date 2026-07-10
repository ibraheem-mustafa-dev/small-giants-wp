---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/multi-button D303 class-scope normalisation"
block: sgs/multi-button
date: 2026-07-10
wave: "D303 residual render-precedence — block normalisation"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/multi-button — D303 per-instance scope normalisation (LANDED)

**Verdict: PASS.** multi-button self-rolled its flex CSS at ID specificity
(`#$uid.sgs-multi-button`, 1,1,0) and applied `$uid` only as an `id` via the wrapper's `extra_attrs`.
D303 moves the selector to class level (`.$uid.sgs-multi-button`, 0,2,0) and adds `$uid` to
`extra_classes` so the flex CSS matches the element — so the appended `sgsCustomCss` residual
(0,2,0) can override it by source order, no ID escalation.

## Evidence (live, sandybrown page 8, post deploy + OPcache reset)
- **STOP-21 catch:** an intermediate state (selector→class but `$uid` still id-only) rendered
  `display:block` / `gap:normal` — caught on the live check, fixed by adding `$uid` to the class list.
- **Renders correctly after fix:** `.sgs-multi-button` computes `display:flex`, `gap:12px`,
  `flex-direction:row` at 768/1440 and `column` at 375 (hero CTAs stack on mobile). Class list
  includes `sgs-mb-2`.
- No regression at 375 / 768 / 1440.

## Gates
- `npm run build` prebuild + webpack: PASS. 440 converter tests pass.
