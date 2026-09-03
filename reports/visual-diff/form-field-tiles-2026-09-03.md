# Visual Diff Report: form-field-tiles (2026-09-03)

## Change Category
Gradient-capable text-colour paint path (survey row: `sgs/form-field-tiles` / `text` / `textColour`)

## Changes Reviewed
- `block.json`: added `textColourGradient` attribute (string, default `""`); added
  `"css:background-image": "textColourGradient"` to the `wrapper` element's `attrMap`
  (the element that already owned `"css:color": "textColour"`).
- `render.php`: this block previously mixed `textColour` into the SAME
  `$sgs_ft_style_engine_input` array as the border shape (one combined
  `wp_style_engine_get_styles()` call). Pulled text colour out of that combined input
  (border stays native-style-engine-only) and replaced it with
  `sgs_resolve_text_colour_or_gradient()` + `sgs_text_colour_decl()` + the unconditional
  `sgs_text_colour_gradient_fallback_rule()` companion, appended onto the same
  `$sgs_ft_supports_css` string at the same `$sgs_ft_sel` selector the flat colour
  already used. Mirrors `sgs/counter`'s `labelColour` pattern.
- `edit.js`: destructured `textColourGradient`; added `gradientCapable: true` to the
  `text` row in `SgsColourPanel`; wired `gradientValue`/`onGradientChange` on the
  `normal` state.
- No hover state was added or touched (out of scope; the row's `statesCount: 1` is
  unchanged).

## Verification
- `php -l src/blocks/form-field-tiles/render.php` — clean, no syntax errors.
- `phpcs --standard=WordPress src/blocks/form-field-tiles/render.php` — 9 errors / 7
  warnings, ALL pre-existing on unrelated lines (comment full-stop style at the file's
  original header comment, and output-escaping notices on `field_open`/`field_error`/
  `field_help`/`field_close`/`SGS_Container_Wrapper` calls elsewhere in the file —
  none inside the lines this edit touched). Confirmed by inspecting each flagged line:
  none fall within the new text-colour block.
- `node scripts/colour-codemod/survey.js --json` — `sgs/form-field-tiles` / `text` row
  verdict moved from `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found`
  to `AUTOFIXABLE:wire-state-emitter` (the remaining gap is a hover state, a separate,
  out-of-scope backlog item — the gradient-path gap this task targeted is closed).
- **Total survey row count could NOT be cleanly diffed 252→252** — this worktree has
  concurrent sibling sessions editing other blocks' colour rows at the same time (per
  the task's own anti-collision notice). A before/after full-repo re-run captured 253
  total rows and a 14-row drop in the `no-gradient-capable-paint-path-found` bucket
  (not the 4 expected from this session alone), consistent with sibling agents' own
  gradient-path fixes landing in the same window, not with a break introduced here.
  The one authoritative check — this block's own `text` row moving to
  `AUTOFIXABLE:wire-state-emitter` — passed.
- **intent_capture_passed:** false — a live browser capture (editor canvas + frontend
  render with a gradient value set) was NOT performed. The canary deploy is currently
  blocked, so no live-DOM paint verification was possible in this session.

## Verdict
**verdict:** PARTIAL

The paint-path change is code-complete and passes static verification (lint, survey
verdict movement), but the actual painted gradient output was never observed live —
this is NOT a visual pass, only a mechanical/structural one.

## Notes
- Refused nothing on this block; `wrapper` cleanly owned both `css:color` and the new
  `css:background-image` mapping, no ambiguity.
