# Visual Diff Report: site-header-row (2026-09-03)

## Change Category
Gradient-capable text-colour paint path (survey row: `sgs/site-header-row` / `text` / `textColour`)

## Changes Reviewed
- `block.json`: added `textColourGradient` attribute (string, default `""`); added
  `"css:background-image": "textColourGradient"` to the `row` element's `attrMap`
  (the element that already owned `"css:color": "textColour"` — the block root,
  rendered through `SGS_Container_Wrapper`, containerKind `layout`).
- `render.php`: replaced the `wp_style_engine_get_styles( ['color' => ['text' => ...]] )`
  flat-only text-colour path with `sgs_resolve_text_colour_or_gradient()` +
  `sgs_text_colour_decl()` + the unconditional `sgs_text_colour_gradient_fallback_rule()`
  companion, scoped at the existing `$root_sel` selector (`.{$uid}.sgs-site-header-row`).
  Mirrors `sgs/counter`'s `labelColour` pattern (identical shape to the
  `sgs/site-footer-row` fix in this same batch — the two blocks share the same
  render.php structure).
- `edit.js`: destructured `textColourGradient`; added `gradientCapable: true` to the
  `text` row in `SgsColourPanel`; wired `gradientValue`/`onGradientChange` on the
  `normal` state.
- Did NOT touch `includes/class-sgs-container-wrapper.php` — the text-colour paint for
  this block lives entirely in the block's own `render.php`.
- No hover state was added or touched.

## Verification
- `php -l src/blocks/site-header-row/render.php` — clean, no syntax errors.
- `phpcs --standard=WordPress src/blocks/site-header-row/render.php` — 0 new
  violations (pre-existing 1 error + 8 warnings at unrelated lines, unchanged).
- `node scripts/colour-codemod/survey.js --json` — `sgs/site-header-row` / `text` row
  verdict moved from `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found`
  to `AUTOFIXABLE:wire-state-emitter` (remaining gap is a hover state, out of scope).
  Total survey row count unchanged (252 before/after).
- **intent_capture_passed:** false — no live browser capture was performed. The canary
  deploy is currently blocked, so no live-DOM paint verification was possible.

## Verdict
**verdict:** PARTIAL

Code-complete and statically verified, but the painted gradient output was never
observed live.

## Notes
- Refused nothing on this block; `row` cleanly owned both `css:color` and the new
  `css:background-image` mapping.
