---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/brand-strip no-inline migration"
block: sgs/brand-strip
date: 2026-07-10
wave: "no-inline rollout Wave 2 (Round 2)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/brand-strip — no-inline + box-object migration (LANDED)

**Verdict: PASS.** Block-private (arrayContentLift + imageControls — a scrolling logo marquee).
Verified LANDED on sandybrown page 1356 at 375/768/1440 via the harness.

## Evidence (harness, all breakpoints)
- **Zero inline** (#1): root + every logo item carry NO CSS property declaration (only the
  permitted `--sgs-scroll-distance` marquee var). Clean.
- **Box computed** (#10, asymmetric): padding `5px 17px 9px 23px` → `4px 12px 6px 16px` →
  `2px 8px 4px 10px`; margin T/B `10px`/`6px` → `8px`/`4px` → `6px`/`2px`; border-radius
  `7px 13px 25px 19px` → `3px 6px 12px 9px` → `2px 4px 8px 6px`.

## Migration summary
- Supports skip-serialised: spacing, color, __experimentalBorder → scoped `.uid` CSS. Border kept
  WP-native (radius/width/colour/style) base + radius tier objects (media route).
- Box-object attrs: paddingTablet/Mobile, marginTablet/Mobile, borderRadiusTablet/Mobile. `box_family` seeded centrally.
- Two bonus fixes: `view.js` hover set `animationPlayState` inline → replaced with a `--paused` class;
  the fade-edge `::before/::after` sniffed the now-removed inline `background-color` → replaced with a
  `.has-background` class the render emits (WP suppresses preset classes under skipSerialization).
- Device tiers 1023/767. uid = class (anchor-safe). No version bump / deprecations (D293).

## Gates
- `npm run build` prebuild + webpack: PASS. `check-box-family-guard.py --check`: 0. Converter suite: 440 passed, 1 skipped.
