# Visual Diff Report: accordion-item (2026-09-03)

verdict: PARTIAL — static and census evidence only; live capture NOT RUN
intent_capture_passed: false
source_sha: not-a-staged-hash (live capture was blocked, see below)

⚠ Header added 2026-09-03 during the handoff QC pass. The report body below was written
by a dispatched agent in a different heading shape that carried NO `verdict:` field at
all, so the visual-diff gate could not have read it. The commit used the scoped
`SGS_VISUAL_GATE_SKIP` bypass, so the malformed shape was never surfaced at commit time.
The verdict is PARTIAL, not PASS: the canary deploy was blocked by a concurrent track's
uncommitted work, so no live capture exists for this block. The owed check is a
computed-style probe on the painted element with a negative control.

## Change Category
Gradient-capable text-colour paint path (survey row: `sgs/accordion-item` / `text` / `textColour`)

## Changes Reviewed
- `block.json`: added `textColourGradient` attribute (string, default `""`); added
  `"css:background-image": "textColourGradient"` to the `wrapper` element's `attrMap`
  (the element that already owned `"css:color": "textColour"`).
- `render.php`: this block previously fed `textColour` into the WP-native
  `wp_style_engine_get_styles( ['color' => ['text' => ...]] )` call (scoped at
  `$root_sel`, the `<details>` wrapper). Removed that flat-only path (and the now-dead
  `$style_engine_args` block it was the sole occupant of) and replaced it with
  `sgs_resolve_text_colour_or_gradient()` + `sgs_text_colour_decl()` + the unconditional
  `sgs_text_colour_gradient_fallback_rule()` companion, scoped at the same `$root_sel`.
  Mirrors `sgs/counter`'s `labelColour` pattern.
- `edit.js`: destructured `textColourGradient`; added `gradientCapable: true` to the
  `text` row in `SgsColourPanel`; wired `gradientValue`/`onGradientChange` on the
  `normal` state.
- No hover state was added or touched (out of scope; the row's `statesCount: 1` is
  unchanged).

## Verification
- `php -l src/blocks/accordion-item/render.php` — clean, no syntax errors.
- `phpcs --standard=WordPress src/blocks/accordion-item/render.php` — 0 errors (started
  at 1 error/9 warnings before cleanup of the dead style-engine block; ended at 0
  errors/6 warnings, all pre-existing alignment hints unrelated to this edit).
- `node scripts/colour-codemod/survey.js --json` — `sgs/accordion-item` / `text` row
  verdict moved from `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found`
  to `AUTOFIXABLE:wire-state-emitter` (the remaining gap is a hover state, a separate,
  out-of-scope backlog item — the gradient-path gap this task targeted is closed).
- **Total survey row count could NOT be cleanly diffed 252→252** — this worktree has
  concurrent sibling sessions editing other blocks' colour rows at the same time (per
  the task's own anti-collision notice). A before/after full-repo re-run captured
  253 total rows and a 14-row drop in the `no-gradient-capable-paint-path-found` bucket
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
- Pre-existing note (not fixed, out of scope): this block's `header`/icon colours are
  read from parent `sgs/accordion` block context and styled separately from
  `textColour` — untouched by this change.

## Live probe — RUN 2026-09-03, canary page 3212

The blocker named above is GONE: the parallel track's deploy (`a47cc502a`) carried this work
(`c2853d258` is an ancestor of it, verified with `git merge-base --is-ancestor`), and the code was
confirmed on the server by three independent greps of the deployed tree.

**Measured on the lifted stylesheet, not on page HTML** (`uploads/sgs-css/sgs-2991-*.css`):

| Assertion | Result |
|---|---|
| Gradient reaches the browser as `background-clip:text` + `color:transparent` | **PASS** |
| The MANDATORY `@supports not ((background-clip:text))` companion is emitted | **PASS** |
| NEGATIVE CONTROL — a second instance with no gradient set gets none | **PASS** (2 counters rendered, exactly 1 `linear-gradient`) |
| Hover emitted inside `@media (hover: hover) and (pointer: fine)` behind `:where(:root:not(.sgs-touch-input))` | **PASS** |
| NEGATIVE CONTROL — an instance with no hover colour gets no guarded block | **PASS** (1 guarded block, not 2) |
| Focus rules stay OUTSIDE the hover guard (keyboard must survive on touch) | **PASS** — 7 focus rules, 0 inside |
| Layer-2 `touch-input.js` enqueued on the page | **PASS** |

⚠ **What this probe does and does not prove.** It exercises the SHARED mechanism end to end on a
real page, using `sgs/counter` for the gradient and `sgs/notice-banner` for the hover guard. Every
block in this rollout routes through those same helpers, so the mechanism is proven for all of them
— but this block's own selector wiring was not individually probed unless it is one of the two
named above. A per-block computed-style check remains the stronger evidence.

⚠ **Residual found BY this probe, and it is larger than what was fixed.** The hover guard covers
PHP-EMITTED hover rules — the client-set colours. It does NOT cover `:hover` written by hand in a
block's own `style.css`: **233 such lines across 40 blocks, none guarded.** Sticky-hover on touch
persists for all of them. Named here rather than left implicit; it needs its own pass.
