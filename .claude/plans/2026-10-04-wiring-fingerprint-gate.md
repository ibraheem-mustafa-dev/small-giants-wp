---
title: Wiring-fingerprint gate
project: small-giants-wp
created: 2026-10-04
status: active
parent: .claude/plans/2026-10-04-eye-care-sweep-audit-fix.md (Session 0)
---

# Wiring-fingerprint gate

**Goal:** a fast-tier gate that proves every painting SGS setting is wired end to end (declared, control, editor
canvas, front end, CSS reader, editor/front-end channel parity), blocks any NEW gap, and records today's gaps as a
ratchet baseline. Built from the read-only prototype in `.claude/reports/2026-10-04-route-data-audit/fingerprint/`
(`fingerprint_scan.py`, `editor-facts.js`; design in that folder's `../README.md` §1).

**Why:** every existing attribute gate proves an attribute is read, never that it paints; container's grid-item
settings passed them all while broken in the editor and on most grid cells (Bean, 2026-10-04).

## Global Constraints

- Gate inputs: block source files, `block.json`, the extension roster, the check-dead-controls dump
  (`node scripts/check-dead-controls.js --dump-json`) and the framework DB opened read-only
  (`sqlite3.connect('file:<db>?mode=ro', uri=True)`, path `~/.claude/skills/sgs-wp-engine/sgs-framework.db`). Never the
  calibration cache (`scripts/computed-route/cache/` is gitignored and absent in the deploy worktree); it may only
  annotate a report when present. Never import `scripts/converter/db/db_lookup.py`.
- No hard-coded machine paths: resolve the repo from the script's own location.
- Bean's decision D2 (2026-10-04): the gate BLOCKS NEW gaps only. Every gap present at build time goes into
  `plugins/sgs-blocks/scripts/wiring-fingerprint-baseline.json`; `--check` exits 1 only for a gap not in the baseline,
  and reports (exit 0) gaps that disappeared so the baseline can be tightened. `--update-baseline` rewrites it.
- Bean's decision D1 (2026-10-04): grid-item defaults are a uniform style for every cell of a grid, whatever block the
  cell is; only text colour is inherited by the cell's children. A CSS reader that only reaches a cell when the cell
  is one specific block (`… > .sgs-<block>`) is a gap (link C1), never a valid pattern.
- Registered in `plugins/sgs-blocks/scripts/gates.json` as tier `fast` with a `budget_ms` measured on this machine,
  next to `check-dead-controls` / `check-editor-render-parity`.
- Python files one responsibility each (split collectors, classifier, baseline/CLI); JS files ≤400 lines.
- Every behaviour has a test that fails without it (fixtures under the gate's own test folder, run by
  `python -m pytest` or the repo's existing Python test convention — check `plugins/sgs-blocks/scripts/tests/`).
- UK English in comments and messages. Code comments describe current behaviour only.
- Commit straight to `main` with an explicit `-- <paths>` pathspec; never stage `.claude/reports/*` modifications from
  other sessions or "Eye Care Fix Register- Bean Points.md".

## Task 1: CHECK A's block-context exemption requires a real consumer

`plugins/sgs-blocks/scripts/check-editor-render-parity.js::checkEditorCanvasDesync` exempts any attribute that
sources a `providesContext` key (`providesContextAttrs`, built from `meta.providesContext` alone). Change the exemption
to apply only when at least one block's `block.json` `usesContext` lists that context key AND that consumer block's
editor or render code reads it (`context['<key>']` / `context[ '<key>' ]` in its edit JS or PHP). An orphan context key
(no consumer) no longer exempts. MUST FAIL test: a fixture block providing a context key no block uses is flagged; the
same fixture with a consumer block that reads the key is not. Today's real effect: container's `sgs/gridItem*` keys
are orphans (the only 6 in the framework), so its grid-item canvas findings surface; if CHECK A is advisory, they are
reported, and the existing `editor-render-parity-baseline.json` mechanism decides blocking (add them to the baseline
with the reason "Session 0 grid-item repair" so the gate stays green until that repair lands).

## Task 2: `check-wiring-fingerprint.py`, the fast-tier gate

Port the prototype into `plugins/sgs-blocks/scripts/wiring-fingerprint/` (package) with a thin entry
`plugins/sgs-blocks/scripts/check-wiring-fingerprint.py` (`--check`, `--update-baseline`, `--json <file>`,
`--self-test` if the repo's gates use one). Links per painting attribute (role from the DB `role` column joined to
`roles.classification`, plus the prototype's not-paint rules for units, content, behaviour, ids):
L2 control, L3 editor canvas (read outside InspectorControls, a preview helper with a literal prefix, ServerSideRender,
or a block-context consumer that reads the key), L4 front-end emitter (literal, prefix helper, shared wrapper, dynamic
prefix, block context), L5 channel (declaration, custom property, class), L6 CSS consumer for a custom property or
class, L7 editor/front-end channel parity, C1 child-conditional reader, plus S1 specificity shadowing: a zero-specificity
`:where()` default whose property the block's `editor.css` overrides on the same element. Gap identity in the baseline:
`<block>::<attr>::<link>` (stable across runs). Output a summary by link and block. Tests: one fixture per link that
turns red without that link's rule, a baseline test (a new gap fails `--check`, a baselined one passes, a fixed one is
reported as removable). Generate the baseline from the real repo, register the gate, run `python
plugins/sgs-blocks/scripts/run-gates.py --tier fast` and report its result for this gate.

## Minor findings carried (final review triages)

- Task 1: `check-dead-controls.js` (`liveContextKeys`/`isConsumed`) and `check-editor-render-parity.js`
  (`buildConsumedContextKeys`) each decide "is this context key consumed" differently; move both onto one shared helper.
- Task 1: `check-editor-render-parity.js` is 5,261 lines; split it by check (A, B, …) into modules.
- Task 1: `getConsumedContextKeys` scans every block's source even when keys are passed explicitly (speed only).
- Task 1: `readsContextKey`'s regex has no left boundary, so `mycontext['key']` would count as a read (no such code today).
