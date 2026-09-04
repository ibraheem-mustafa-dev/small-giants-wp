# Visual diff — sgs/nav-drawer — 2026-09-04

verdict: PASS
intent_capture_passed: true
source_sha: 757f430ebd03bd87

## What changed

Phase 3 of the golden-colour staged rollout. Wires a `toggleCloseColourGradient` sibling
onto `sgs/nav-drawer`'s `toggleCloseColour` attribute (the drawer's close-icon colour) so
the row stops being flagged by inspector rule 31 (`missing-gradient`).

- `block.json` — added `toggleCloseColourGradient` (string, default `""`); added
  `"css:color-gradient": "toggleCloseColourGradient"` to the `close` element's `attrMap`,
  alongside the existing base `css:color` and `states.hover.attrMap` entries.
- `render.php` — reads `toggleCloseColourGradient`, resolves via
  `sgs_resolve_text_colour_or_gradient()`, emits via `sgs_text_colour_decl()` onto the
  existing `$close_sel` (`.{uid} .sgs-nav-drawer__close`) scoped rule, and unconditionally
  calls `sgs_text_colour_gradient_fallback_rule()` on that same selector. The hover pair
  (`toggleCloseColourHover`) is untouched — out of scope for this gradient-dimension pass.
- `edit.js` — destructured `toggleCloseColourGradient`; updated the canvas preview
  (the `.sgs-nav-drawer__close-preview` span's inline style) to spread
  `resolveTextColourPreviewStyle(toggleCloseColour, toggleCloseColourGradient, resolveColourToken)`.

## nav-drawer's `textRow()` helper — direct-mount decision

This row was ALREADY wired through `src/components/colour-variants/textRow.js`
(`SgsColourPanel` row builder), not a bespoke JSX row. Reading the helper's source first
(per the brief): `textRow()` already threads an optional `attrs.gradient` param straight
through to the row descriptor's `gradientValue`/`onGradientChange` + `gradientCapable: true`
(lines 121-127, 147 of `textRow.js`) — it was built gradient-capable from the start, just
never given a gradient attribute name for this particular row.

**Decision: used the existing `textRow()` path — no direct `GradientCapableColourControl`
mount needed.** The only edit.js change was adding `gradient: 'toggleCloseColourGradient'`
to the `attrs` object already passed to `textRow({ key: 'toggleCloseColour', ... })`. This
matches the brief's own instruction ("if it already threads a gradientValue/onGradientChange
param through ... use it").

## Why intent capture, not before/after

Additive `block.json` attribute, default `""`. No existing content has ever set
`toggleCloseColourGradient` (it didn't exist before), so a before/after diff on any real page
shows no difference by construction. The flat-colour path is unchanged in shape (same
selector, same helper family, just routed through `sgs_text_colour_decl()`/
`sgs_resolve_text_colour_or_gradient()` instead of a bare `sgs_colour_value()` call).

## Live capture

No live deploy performed as part of this batch (central build/deploy step runs after all
batches land). `php -l` clean, block.json valid JSON, `git diff --stat` confirms only this
block's 3 files touched.

## Risk

Additive only — default `""`, unconditional fallback-rule call is a no-op for a flat colour.
Existing flat-colour instances render byte-identical (verified: the emitted `color:` decl
for a flat value is byte-identical to the pre-change `sgs_colour_value()` call, since
`sgs_text_colour_decl()` calls the same resolver internally for a non-gradient input).

## Gates

`php -l` clean · block.json valid JSON · `node scripts/colour-codemod/survey.js` — the
`toggleCloseColour` row moved from `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found`
to `CONFORMANT` (`hasGradient: true`, `statesCount: 2` — the pre-existing hover pair already
satisfied the states floor) · survey total held at 262 rows.
