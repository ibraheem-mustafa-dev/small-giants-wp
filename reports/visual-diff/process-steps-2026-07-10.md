---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/process-steps no-inline migration"
block: sgs/process-steps
date: 2026-07-10
wave: "no-inline rollout Wave 2 (Round 2)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/process-steps — no-inline + box-object migration (LANDED)

**Verdict: PASS.** Block-private (SHADOW support + arrayContentLift; renders numbered steps).
Verified LANDED on sandybrown page 1356 at 375/768/1440 via the harness.

## Evidence (harness, all breakpoints)
- **Zero inline** (#1): root `.sgs-process-steps` + every step/number/title/description carry NO CSS
  property declaration. Clean.
- **Box computed** (#10, asymmetric): padding `5px 17px 9px 23px` → `4px 12px 6px 16px` →
  `2px 8px 4px 10px`; margin T/B `10px`/`6px` → `8px`/`4px` → `6px`/`2px`.

## Migration summary
- Supports skip-serialised: spacing, color, __experimentalBorder (radius), typography, **shadow** → scoped `.uid` CSS.
  `box-shadow` emitted via `wp_style_engine_get_styles` (native shadow support, scoped — NOT a box family).
- Border took the quote route (custom `borderWidth` object + `borderColour`/`borderStyle` scalars; radius native,
  no responsive-radius tiers on this block).
- Box-object attrs: paddingTablet/Mobile, marginTablet/Mobile, borderWidth. `box_family` seeded centrally.
- Per-step inline `color`/`background-color` (number/title/description) removed → three scoped descendant rules.
  No view.js. Device tiers 1023/767. uid = class (anchor-safe). No version bump / deprecations (D293).

## Gates
- `npm run build` prebuild + webpack: PASS. `check-box-family-guard.py --check`: 0. Converter suite: 440 passed, 1 skipped.
