# A1: wire the width evaluator into the pipeline (rule 7 design gate)

Parent plan: `.claude/plans/2026-09-20-draft-standardisation-plan.md` (step A1). Decision: D1132. Status: DESIGN, awaiting Bean's approval. Nothing built.

## Problem, effect, solution

**Problem.** The Eye Care draft's script states its layout per screen width (`secPad: mobile ? '56px 20px' : '104px 52px'`). An evaluator that reads those rules is built and proven (75 of 140 names, 0 mismatches against a real render) but nothing calls it, so the converter drops every such value.
**Effect.** Live page: section padding 0px instead of 104px 52px, one-column grids where the draft has two or four, 48 dropped declarations in the last run.
**Solution.** Call the evaluator once per run, hand its per-device values to the converter at the single place it reads inline styles, and stop dropping what can be resolved.

## What the design gate found (proven by running the code)

1. **The evaluator finds the draft's width flags by NAME** (`mob`, `narrow`, `wide`). Claude Design renamed them to `mobile`, `tablet`, `desktop` in the v2 bundle, so on v2 it resolves **0 of 140** ("no declaration of a width flag (mob, narrow, wide)"). Given the new names it resolves 75 (same as the original). So step 1 is to find flags by structure, not name (a draft that uses any names must work: R-31-1).
2. The converter's own cascade puts inline style above `@media`, and matches `@media` to an element by class or tag only (`styling_helpers.py::collect_css_decls_for_element`). So per-device values cannot ride on inline style or a generated class: they are applied as an overlay after the `@media` fold.
3. The converter's inline-style reader is the one place every consumer passes through, so one change there covers all of them.

## Changes (5 source files, no new stage)

| # | File | Change |
|---|---|---|
| 1 | `orchestrator/script_bindings.py::read_render_scope` | Find the flags structurally: the declarations whose expression compares the draft's width variable (the one derived from `S.w`) with a number; the anchor is the first one. `FLAG_NAMES` becomes an optional hint. |
| 2 | new `orchestrator/breakpoint_snap.py` (called from `resolve_tier_bindings`) | Bean's rule, confirmed: a declared flag threshold below our tablet edge moves up to 768 (760, 700), one within 10px of 768 or 1024 moves to the edge, one at or above 1024 is otherwise left alone. Rewrites the flag expressions before evaluation and returns one log row per snap (draft name, from, to, band). The 10px tolerance sits beside `db_lookup.device_tier_thresholds()` as a documented permitted constant; FR-31-5.2 gets the amendment. |
| 3 | `sgs-clone-orchestrator.py::main` and `::stage_4_5_6_7_8_extract` | After Stage -1.5, run the resolver on the run copy with the converter's own tier samples and ranges; write `run_dir/script-bindings.json` (names, per-device values, snaps, in-tier gaps, unresolved); pass the map to `convert_section`. Fail-soft; opt-out `--no-script-bindings`. |
| 4 | `converter/entry.py::convert_section` | Optional `tier_bindings=None`; installed for the call and reset in the `finally`, like the colour configuration. `None` means byte-identical behaviour. |
| 5 | `converter/services/template_binding.py` and `styling_helpers.py::collect_css_decls_for_element` | `resolve_binding_declarations`: substitute each `{{ name }}` with its per-device text (desktop into base, tablet and mobile as overrides applied after the `@media` fold, inline-strength). A name not in the map is dropped and gapped exactly as today. Honours `include_inline=False`. |

## Not in A1 (stated, not hidden)

- **Thresholds still inside a device tier after the snap** (7 of 75 names: 1060 x2, 1100 x2, 1160, 1280, 620): logged as gaps "draft breakpoint inside a device tier", not written. Emitting them as bounded residuals needs the D1129 scoping answer for a nested classless element.
- Content and loop-item bindings (A2), `<sc-if>` (A3).

## Proof required before it counts (rules 4, 5, 6, R-31-11)

1. New tests: renamed flags resolve; each snap row; a name outside the map still drops; overlay beats an `@media` rule; `include_inline=False` gets nothing; **negative control** for each (break the rule, the test fails). Existing converter suite (874) green.
2. **Mama's markup byte-identical** (32,767 characters, same statuses) with the change on and off.
3. Run on the **v2 bundle** to test page 11. Playwright on the live page at 375, 768, 1440, keyed by text (rule 4a): section padding, grid columns, h1 and h2 sizes equal the draft's. Reference: the original draft rendered locally AND Bean's shared copy of the original, https://mintcream-lyrebird-224487.hostingersite.com/ (checked: HTTP 200, the bundled original, no `sgs-` classes).
4. `{{` in style values: 0 for resolvable names; the remaining gaps each list a reason.
5. `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 (no inline responsive value).
6. Then Bean's eye (R-31-13). A number alone does not close it.
