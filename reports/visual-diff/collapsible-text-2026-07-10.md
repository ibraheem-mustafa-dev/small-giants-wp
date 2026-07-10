---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/collapsible-text no-inline migration"
block: sgs/collapsible-text
date: 2026-07-10
wave: "no-inline rollout Wave 2 (Round 1)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/collapsible-text — no-inline + box-object migration (LANDED)

**Verdict: PASS.** Migrated block-private to the no-inline styling contract (leaf/composite
that renders its own body + toggle — root stays a `<div>`, uid is a CLASS, anchor-safe).
Verified LANDED live on the sandybrown canary (page 1356, `/sgs-box-object-test/`) at
375 / 768 / 1440 via `plugins/sgs-blocks/scripts/no-inline-land-verify.js` +
`no-inline-wave2-manifest.json`.

## Evidence (harness, all breakpoints)
- **Zero inline** (#1): block root + every descendant carry NO CSS property declaration
  (only the permitted `--sgs-collapsible-text-collapsed-lines:N` var value). Inline-scan clean.
- **Box computed** (#10, asymmetric instance): padding `5px 17px 9px 23px` @1440 →
  `4px 12px 6px 16px` @768 → `2px 8px 4px 10px` @375; margin top/bottom `10px`/`6px` @1440 →
  `8px`/`4px` @768 → `6px`/`2px` @375 (left/right owned by WP core constrained-layout centring).

## Migration summary
- **Supports skip-serialised**: spacing, color, typography → render reads `$attributes['style']`,
  emits scoped `.uid` CSS via `wp_style_engine_get_styles`.
- **Box-object attrs added**: paddingTablet, paddingMobile, marginTablet, marginMobile (base
  padding/margin are WP-native `style.spacing.*` objects). `box_family` seeded centrally in
  `sgs-update-v2.py`. No flat per-side attrs existed to remove.
- **Device tiers only**: `@media(max-width:1023px)` + `@media(max-width:767px)`.
- No version bump, no deprecations (D293). Read-more interactivity preserved.

## Gates
- `npm run build` prebuild (dead-controls, hardcoded-defaults, control-ux) + webpack: PASS.
- `check-box-family-guard.py --check`: 0 violations. Converter suite: 440 passed, 1 skipped.
