---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/mobile-nav no-inline migration"
block: sgs/mobile-nav
date: 2026-07-10
wave: "no-inline rollout Wave 2 (Round 3)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/mobile-nav — no-inline + box-object migration (LANDED) — F3 partially drained

**Verdict: PASS (no-inline).** Keep-structure 7-zone off-canvas drawer nav (singleton, fixed
`id="sgs-mobile-nav"`). Verified LANDED on sandybrown page 1356 at 375/768/1440 via the harness —
zero inline property declarations across the drawer subtree + correct padding at every tier.

## Evidence
- **Zero inline** (#1): `color` (text/background) + `spacing.padding` supports flipped to
  `__experimentalSkipSerialization` → read from `$attributes['style']` and emitted scoped to
  `#sgs-mobile-nav` via `wp_style_engine_get_styles`. **5 `view.js` swipe-to-close `.style.transform`/
  `.style.transition` writes** moved to an `.is-swiping` class + `--sgs-mn-swipe-x/y` CSS vars (a real
  re-inline trap closed). Stray `768/480` hand-rolled breakpoints fixed to the device standard `1023/767`.
- **Box computed** (#10, asymmetric): padding `5px 17px 9px 23px` @1440 → `4px 12px 6px 16px` @768 →
  `2px 8px 4px 10px` @375. Base padding WP-native object + `paddingTablet`/`paddingMobile` SGS objects
  (`box_family` seeded centrally).
- Keep-structure: all 7 zones (Header/Account/Search/CTA/Navigation/Custom-Content/Social) intact.
- uid: uses the block's deliberate singleton `id="sgs-mobile-nav"` (view.js `getElementById`,
  `multiple:false`) — a documented pre-existing architectural exception to the uid-as-class rule; not changed.

## F3 status (honest)
- **Real dead-control DRAINED**: `.sgs-mobile-nav--slide-left/right` hardcoded `width: min(85vw, 400px)`
  ignored the `drawerWidth`/`drawerMaxWidth` controls (dead by override) → now
  `width: min(var(--sgs-mn-width, 85%), var(--sgs-mn-max-width, 400px))`.
- **Baselined row (`max-width: 100vw`): MIS-TAGGED.** The base `.sgs-mobile-nav{max-width:100vw}` is a
  universal viewport-overflow safety clamp, not a dead-control-by-override of `drawerMaxWidth`. Left as-is;
  flagged for the gate mapping fix / Bean decision (not guess-wired).

## Gates
- `npm run build` prebuild (dead-controls, hardcoded-defaults 0 net-new) + webpack: PASS. Converter suite: 440 passed, 1 skipped.
