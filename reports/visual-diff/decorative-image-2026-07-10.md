---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/decorative-image no-inline migration"
block: sgs/decorative-image
date: 2026-07-10
wave: "no-inline rollout Wave 2 (Round 1)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/decorative-image — no-inline (inline-render fix) (LANDED)

**Verdict: PASS.** This block declares NO WP styling supports, so there is nothing to
`__experimentalSkipSerialization`. Its migration was an INLINE-RENDER fix: it previously built a
full `style="position:…;left:…;top:…;width:…;opacity:…;z-index:…;transform:…"` attribute — all of it
is now emitted into the block's own scoped `.uid` `<style>`. Verified LANDED live on the sandybrown
canary (page 1356) at 375 / 768 / 1440 via the harness (inline-scan condition #1).

## Evidence (harness, all breakpoints)
- **Zero inline** (#1): block root (`.sgs-decorative-image.sgs-di-<uid>`) + every descendant carry
  NO CSS property declaration. The runtime parallax/fade in view.js now mutates only the custom
  properties `--sgs-di-py` / `--sgs-di-op` (values, not declarations), which the scoped rule reads via
  `var()` — so the element stays zero-inline even after JS runs (a re-inline trap the migration closed).
- No box family exists on this block (absolute-position / transform, not box-model) — no box seeds.

## Migration summary
- Relocated inline `position`/`left`/`top`/`width`/`max-width`/`opacity`/`z-index`/`transform` to scoped `.uid` CSS.
- Fixed the parallax re-inline trap: view.js drove `img.style.transform` directly, which would have
  deleted the scoped base transform — moved to CSS-var mutation.
- Custom breakpoints `781`/`480` (device-tier by the block's own `*Tablet`/`*Mobile` attr naming) routed
  to the standard `1023`/`767`. uid is a CLASS (anchor-safe). No version bump, no deprecations (D293).
- Note (pre-existing, out of scope, flagged): responsive position/width tier `data-*` attrs + `overflow`
  are never consumed by JS (dead controls) — baseline-clean, not introduced by this pass.

## Gates
- `npm run build` prebuild (dead-controls 0 net-new) + webpack: PASS. Converter suite: 440 passed, 1 skipped.
