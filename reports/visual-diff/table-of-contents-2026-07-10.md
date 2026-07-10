---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/table-of-contents no-inline migration"
block: sgs/table-of-contents
date: 2026-07-10
wave: "no-inline rollout Wave 2 (Round 1)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/table-of-contents — no-inline + box-object migration (LANDED)

**Verdict: PASS.** Migrated block-private to the no-inline styling contract. uid is a CLASS
(`.uid`, never an id) — anchor-critical, since the block deals with heading `id` anchors.
Verified LANDED live on the sandybrown canary (page 1356) at 375 / 768 / 1440 via the harness
(`no-inline-land-verify.js` + `no-inline-wave2-manifest.json`, with an `sgs/heading` block on the
page so the ToC parses a heading and renders its list).

## Evidence (harness, all breakpoints)
- **Zero inline** (#1): block root + every descendant carry NO CSS property declaration. Clean.
- **Box computed** (#10, asymmetric instance): padding `5px 17px 9px 23px` @1440 →
  `4px 12px 6px 16px` @768 → `2px 8px 4px 10px` @375; margin T/B `10px`/`6px` → `8px`/`4px` →
  `6px`/`2px`; border-radius (asymmetric corners TL/TR/BR/BL) `7px 13px 25px 19px` @1440 →
  `3px 6px 12px 9px` @768 → `2px 4px 8px 6px` @375.

## Migration summary
- **Supports skip-serialised**: spacing, color, __experimentalBorder, typography → scoped `.uid` CSS.
- **Box-object attrs added**: paddingTablet/Mobile, marginTablet/Mobile, borderRadiusTablet/Mobile
  (4-corner objects; base padding/margin/border-radius are WP-native objects). `box_family` seeded
  centrally.
- **Root-cause bug fixed** (the block was flagged "broken" in CLAUDE.md): a custom attribute literally
  named `style` collided with WP's reserved `attributes.style` object used by the color/spacing/border
  supports — renamed to `tocStyle` throughout. Scroll-spy `view.js` inline `link.style.color` replaced
  with a `sgs-toc__link--active` class (scoped rule).
- **Device tiers only**: 1023 / 767. No version bump, no deprecations (D293). Anchor hrefs/ids unchanged.

## Gates
- `npm run build` prebuild + webpack: PASS. `check-box-family-guard.py --check`: 0 violations.
  Converter suite: 440 passed, 1 skipped.
