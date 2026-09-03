# Visual Diff Report: site-footer-row (2026-09-03)

## Change Category
Gradient-capable text-colour paint path (survey row: `sgs/site-footer-row` / `text` / `textColour`)

## Changes Reviewed
- `block.json`: added `textColourGradient` attribute (string, default `""`); added
  `"css:background-image": "textColourGradient"` to the `row` element's `attrMap`
  (the element that already owned `"css:color": "textColour"` — the block root,
  rendered through `SGS_Container_Wrapper`, containerKind `layout`).
- `render.php`: replaced the `wp_style_engine_get_styles( ['color' => ['text' => ...]] )`
  flat-only text-colour path with `sgs_resolve_text_colour_or_gradient()` +
  `sgs_text_colour_decl()` + the unconditional `sgs_text_colour_gradient_fallback_rule()`
  companion, scoped at the existing `$root_sel` selector (`.{$uid}.sgs-site-footer-row`).
  Mirrors `sgs/counter`'s `labelColour` pattern.
- `edit.js`: destructured `textColourGradient`; added `gradientCapable: true` to the
  `text` row in `SgsColourPanel`; wired `gradientValue`/`onGradientChange` on the
  `normal` state.
- Did NOT touch `includes/class-sgs-container-wrapper.php` — the text-colour paint for
  this block lives entirely in the block's own `render.php` (the wrapper only supplies
  layout/background), so no shared-wrapper edit was needed or made.
- No hover state was added or touched.

## Verification
- `php -l src/blocks/site-footer-row/render.php` — clean, no syntax errors.
- `phpcs --standard=WordPress src/blocks/site-footer-row/render.php` — 0 new
  violations (pre-existing 1 error + 8 warnings at unrelated lines — border-width
  vars, array alignment further down the file — unchanged by this edit).
- `node scripts/colour-codemod/survey.js --json` — `sgs/site-footer-row` / `text` row
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
