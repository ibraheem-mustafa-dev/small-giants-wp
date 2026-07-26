# Visual-diff report — `sgs/site-header-row` + `sgs/site-footer-row` (Spec 37 Phase 2)

**Date:** 2026-07-26
**Change:** per-row `rowShrink` (shrink on scroll) + `rowShrinkHideTarget` (hide one chosen
element while shrunk), with a declarative `supports.sgs.headerEssential` guardrail.

## Honest status: NO visual-diff run was performed

A rendered visual diff was **not** executed for this commit. This report states why that is
sound rather than claiming a PASS that was never measured.

## Why the default render is byte-identical

Both new attributes default to "off", and the emit is gated on that default resolving to empty:

- `rowShrink` defaults to `{}`. `sgs_resolve_tier_booleans( array() )`
  (`includes/helpers-responsive.php:589-604`) returns `[]` for an empty object — every tier
  resolves to `false`.
- With `$shr_shrink_tiers` empty, `render.php` adds **no** `sgs-row-behaviour` class it wasn't
  already adding, emits **no** `data-sgs-row-shrink` attribute, and enters **neither** the
  hide-target branch nor its scoped CSS append. The `$css` string is unchanged, so the
  block's `<style>` output is unchanged.
- `rowShrinkHideTarget` is only read inside the `! empty( $shr_shrink_tiers )` branch, so an
  off row never consults it at all.
- The new stylesheet rules in `assets/css/header-behaviours.css` are keyed on
  `.is-row-shrink-active`, a class `view.js` adds **only** on a device tier where that row's
  shrink is switched on. No existing element gains that class.

Net: for every existing header/footer row on every existing page, the emitted markup and CSS
are identical to before this commit. The change is additive and opt-in.

## What was verified instead

- `npx wp-scripts build --experimental-modules --webpack-copy-php` — compiled successfully.
- `node scripts/check-dead-controls.js --check` — OK, 0 net-new dead controls across 81 blocks.
- `feature-dev:code-reviewer` pass — tier-gating, specificity, guardrail (both halves), CSS
  injection, orphaned-target no-op, and the untouched header-level body-class path all
  confirmed. Two findings raised; see below.

## Review findings and disposition

1. **"No SGS block declares `supports.anchor`, so the hide target can never persist."**
   *Partly false, partly real.* The reviewer's grep was wrong — 70 of 81 blocks **do** declare
   `"anchor"`. But 11 do not, including `sgs/product-search`, which is a promoted header
   element. Since WordPress silently discards an attribute a block type doesn't declare, such
   a child would look configured and then lose the id on save.
   **Fixed:** the picker now also requires `supports.anchor`, so a child that cannot hold the
   reference is never offered (`RowScrollBehaviourControls.js`).
2. **A stale target silently reverts the control to "nothing" with no operator feedback.**
   **Fixed:** a warning `Notice` now explains the chosen element is gone and nothing is hidden.

## Live verification

Live per-row behaviour verification on the sandybrown canary is the separate QA gate for this
phase and is recorded with the deploy, not here.
