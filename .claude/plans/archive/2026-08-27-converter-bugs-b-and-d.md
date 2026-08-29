# Converter bugs (b) and (d), plus the G2 fail-closed ruling

## Context

Two converter defects were located during the mobile-parity investigation (2026-08-26)
but never fixed, and Bean separately ruled that the pipeline should fail closed the next
time this class of bug appears rather than silently produce a wrong clone for a fortnight.

## Global constraints (binding on both tasks)

- Read `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` before touching the converter, per
  this project's standing rule.
- R-31-1: no hardcoded property→attr dicts. Any lookup must be DB-driven
  (`converter/db/db_lookup.py`, or the `sgs-db.py` CLI to inspect the schema first).
- Every fix needs a FAILING TEST FIRST (watched failing against the unfixed code), then
  the fix, then the test passing — same discipline as the grid-tier-fix commit
  (`6fceb8198`) already on `main`.
- Do not touch `plugins/sgs-blocks/scripts/converter/services/tier_object.py` or the
  grid/layout resolver files changed in `6fceb8198` — that work is done and merged;
  these two tasks are unrelated bugs in different code paths.
- UK English in all output and comments.

## Task 1 — (b) A block-root BEM modifier routes to a child element

**Bug:** `.sgs-product-card--trial`'s border lands on `ctaBorder*` (a child element's
attribute) instead of the product-card's own root border attribute.

**Root cause, already located (verify before fixing, do not assume):**
`plugins/sgs-blocks/scripts/converter/services/styling_helpers.py:664-671` matches a BEM
modifier class as an ordinary class, with no block/element/modifier distinction. The
`css_element` guard exists only on the `css_layer='OUTER'` query
(`plugins/sgs-blocks/scripts/converter/db/db_lookup.py:1348-1352`); the suffix fallback
(`db_lookup.py:2530-2555`) never reads it.

**Fix shape:** when resolving a modifier class on a BEM ROOT node (no `__element` token),
the suffix-fallback lookup at `db_lookup.py:2530-2555` must also respect `css_element`
(reject a child-scoped attribute for a root-level match), mirroring the guard the
`css_layer='OUTER'` query already has. Confirm the actual current line numbers first —
the file may have shifted slightly since this was located; use the described mechanism as
the specification, not the exact line numbers if they've drifted.

**Test:** convert a draft fixture with `.sgs-product-card--trial` at the BEM root
(carrying a border declaration) and assert the emitted attribute is the product-card's
own root `border*` family, not `ctaBorder*`.

## Task 2 — (d) An invalid enum value silently coerces instead of failing

**Bug:** `layout:"grid"` was written onto `sgs/testimonial-slider`, whose `layout` enum is
`["full","split"]` — it collapsed the slider to width 0 on the live clone.

**Root cause, already located (verify before fixing):**
`plugins/sgs-blocks/scripts/converter/services/arrangement.py:81-91` hardcodes the layout
literals; `plugins/sgs-blocks/scripts/converter/services/assembly.py:212-216` gates on
attribute *existence* only and never calls `validate()`. Only 5 of 18 blocks declaring
`layout` currently have `enum_values` seeded in the DB — seed the rest as part of this
task, or the check passes everything and is vacuous. Use `sgs-db.py` to find the current
seeded/unseeded set; do not assume the "5 of 18" figure is still accurate.

**Fix shape:** `assembly.py`'s layout-attribute write must call `validate()` against the
DB's `enum_values` for that block+attribute, gapping (not coercing) an out-of-enum value
with a clear NO_DESTINATION-style reason, the same pattern the rest of the converter uses
for an honest gap. Seed `enum_values` for every block currently missing it (verify via the
DB, per R-31-1 — this is data, not a code branch).

**Test:** convert a draft fixture that assigns an out-of-enum `layout` value to a block
with a `layout` enum seeded in the DB, and assert the converter reports a gap rather than
writing the invalid value or silently coercing to the first enum member.

## Task 3 — G2: fail closed when the pipeline writes an undeclared shape

**Bean's ruling (already decided, not open for redesign):** the pipeline must FAIL CLOSED
when it is about to write a shape a block does not declare — this is what let the Task 1
and Task 2 bugs above ship silently for a fortnight. This task builds the general gate,
not a per-bug patch.

**Fix shape:** a converter-output gate (parallel in spirit to the existing
`check_flat_tier_regression.py` and `check_no_mirror.py` gates already wired into
`pipeline-stage-gate.py`) that validates every emitted attribute against the target
block's actual declared schema (type AND enum, where an enum exists) before a clone is
allowed to deploy. Follow the existing gate pattern in
`plugins/sgs-blocks/scripts/orchestrator/` (read `check_flat_tier_regression.py` as the
reference shape: report mode default, `--enforce` mode for the real gate, a self-test
with positive/negative/comment-safety controls, wired into `pipeline-stage-gate.py`
alongside the existing two).

**Test:** self-test with a positive control (a fixture that emits an undeclared/wrong-enum
value and must be caught) and a negative control (a clean fixture that must stay silent),
matching the shape of `check_flat_tier_regression.py`'s own self-test.

## Verification (whole branch, once all 3 tasks are done)

- `pytest` full converter suite, zero new failures.
- Re-run `check_flat_tier_regression.py --self-test` (unaffected by this branch, but
  confirms nothing outside scope broke).
- The new gate's own `--self-test` passes.
- `npm run build` exit 0 in `plugins/sgs-blocks/`.
