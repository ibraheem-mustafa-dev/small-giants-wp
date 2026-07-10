---
doc_type: reference
title: "Visual-diff / LANDED report — residual native color/typography reconcile (button, container, business-info, social-icons)"
blocks: [sgs/button, sgs/container, sgs/business-info, sgs/social-icons]
date: 2026-07-10
wave: "no-inline rollout — RECONCILE (already-migrated blocks with a residual native-support auto-inline gap)"
verdict: PASS
first_paint_capture_passed: true
---

# Residual native color/typography reconcile (LANDED)

**Verdict: PASS.** Four already-box-migrated blocks still declared an ENABLED native styling
support WITHOUT `__experimentalSkipSerialization`, so that specific property (colour / typography)
would auto-inline if an operator/clone set it via WP's native Styles panel — a residual the
box-only harness never exercised. Each now skip-serialises + emits the support scoped. Verified
LANDED on sandybrown page 1356 via the harness (`no-inline-reconcile-manifest.json`) + a live
curl of the rendered scoped `<style>`.

## What each block had + fix
- **button** — `color` support enabled, not skip-serialised. Fixed: skip-serialise + scoped
  `wp_style_engine_get_styles(color, #uid)` + re-added `has-*-color` preset classes. (Not disabled —
  a native colour is a legitimate operator/clone path.)
- **container** — `color` + `__experimentalBorder` + `typography` enabled, not skip-serialised.
  Container delegates to the SHARED `SGS_Container_Wrapper`; the fix was made CONTAINED (no shared-file
  edit) via the wrapper's existing `extra_classes` seam — container's own render.php reads the 3 supports,
  emits scoped CSS, and passes the uid + `has-*` classes through. Shared wrapper untouched.
- **business-info** — `typography` (fontSize/fontFamily) enabled, not skip-serialised. Fixed: folded a
  `typography` key into the existing scoped `wp_style_engine_get_styles` call.
- **social-icons** — `typography` was only `textAlign` (renders as a `has-text-align-*` CLASS, never
  inline) → this was a harmless false-positive; the defensive skip-serialise + scope future-proofs it.

## Evidence (live curl of the rendered page, colours/typography SET on each instance)
- **Zero inline** (harness scan, all breakpoints): no inline `style="…color…|…font…"` on any of the four block roots.
- **Scoped rule present (didn't vanish):** `#sgs-btn-…{color:#ffffff;background-color:#123456}`;
  container `.uid.wp-block-sgs-container{…background-color:#abcdef…font-size:21px…}`; business-info
  `…{font-size:19px}`. The colour/typography paints, scoped — not inline, not lost.

## Notes
- text + media (`color: false` — support DISABLED) were correctly EXCLUDED — nothing auto-inlines.
- No new box-object attrs (this reconcile touches existing supports only) → no `box_family` seeds.
- No version bump, no deprecations (D293). No shared file edited.

## Gates
- `npm run build` prebuild (dead-controls, hardcoded-defaults 0 net-new) + webpack: PASS.
  `/sgs-update --stage 1`: 6 support rows synced (the skip-serialisation flips), 0 new attrs.
