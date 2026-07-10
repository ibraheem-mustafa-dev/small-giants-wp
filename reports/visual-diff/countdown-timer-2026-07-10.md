---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/countdown-timer no-inline migration"
block: sgs/countdown-timer
date: 2026-07-10
wave: "no-inline rollout Wave 2 (Round 1)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/countdown-timer — no-inline + box-object migration (LANDED)

**Verdict: PASS.** Migrated block-private to the no-inline styling contract. Interactive
(view.js ticking) — confirmed view.js only writes text/classes/attributes, never inline `.style.*`,
so the element stays zero-inline across its whole lifecycle. Verified LANDED live on the sandybrown
canary (page 1356) at 375 / 768 / 1440 via the harness (evergreen mode so the timer renders).

## Evidence (harness, all breakpoints)
- **Zero inline** (#1): block root + every descendant carry NO CSS property declaration. Clean.
- **Box computed** (#10, asymmetric instance): padding `5px 17px 9px 23px` @1440 →
  `4px 12px 6px 16px` @768 → `2px 8px 4px 10px` @375; margin T/B `10px`/`6px` → `8px`/`4px` →
  `6px`/`2px`; border-radius (asymmetric corners) `7px 13px 25px 19px` @1440 → `3px 6px 12px 9px`
  @768 → `2px 4px 8px 6px` @375.

## Migration summary
- **Supports skip-serialised**: spacing, color, __experimentalBorder, typography → scoped `.uid` CSS
  via `wp_style_engine_get_styles`.
- **Box-object attrs added**: paddingTablet/Mobile, marginTablet/Mobile, borderRadiusTablet/Mobile
  (base padding/margin/border-radius/border-width kept WP-native `style.spacing.*`/`style.border.*`).
  `box_family` seeded centrally.
- **Build fix**: an edit.js block comment contained `style.spacing.*/style.border.radius` — the `*/`
  closed the comment early and broke the parse; corrected (spaced the token).
- **Device tiers only**: 1023 / 767. No version bump, no deprecations (D293). Countdown tick preserved.

## Gates
- `npm run build` prebuild + webpack: PASS. `check-box-family-guard.py --check`: 0 violations.
  Converter suite: 440 passed, 1 skipped.
