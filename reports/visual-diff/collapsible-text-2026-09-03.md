# Visual Diff Report: collapsible-text (2026-09-03)

## Change Category
Gradient-capable text-colour paint path (survey row: `sgs/collapsible-text` / `text` / `textColour`)

## Changes Reviewed
- `block.json`: added `textColourGradient` attribute (string, default `""`); added
  `"css:background-image": "textColourGradient"` to the `body` element's `attrMap`
  (the element block.json already declares as owning `"css:color": "textColour"`).
- `render.php`: replaced the `wp_style_engine_get_styles( ['color' => ['text' => ...]] )`
  flat-only text-colour path with `sgs_resolve_text_colour_or_gradient()` +
  `sgs_text_colour_decl()` + the unconditional `sgs_text_colour_gradient_fallback_rule()`
  companion, scoped at the same selector the flat colour already used (`$root_sel`).
  Mirrors `sgs/counter`'s `labelColour` pattern.
- `edit.js`: destructured `textColourGradient`; added `gradientCapable: true` to the
  `text` row in `SgsColourPanel`; wired `gradientValue`/`onGradientChange` on the
  `normal` state.
- No hover state was added or touched (out of scope; the row's `statesCount: 1` is
  unchanged).

## Verification
- `php -l src/blocks/collapsible-text/render.php` — clean, no syntax errors.
- `phpcs --standard=WordPress src/blocks/collapsible-text/render.php` — 0 errors, 0
  warnings.
- `node scripts/colour-codemod/survey.js --json` — `sgs/collapsible-text` / `text` row
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
- Refused nothing on this block; block.json already named `body` as the owning
  element for `css:color`, no ambiguity to resolve.
- Pre-existing note (not fixed, out of scope): the flat/gradient colour is scoped at
  the block's outer wrapper selector (`$root_sel`, containing both the body text and
  the Read more/Read less toggle button), not the inner `.sgs-collapsible-text__body`
  selector the `body` element's `attrMap` formally names as owner. This mismatch
  pre-dates this change (the flat colour was already scoped this way) and was left
  untouched to avoid an unrelated selector-scoping change outside this task's remit —
  flagged here for a future pass, not silently carried forward.
