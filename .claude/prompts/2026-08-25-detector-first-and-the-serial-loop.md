---
doc_type: prompt
title: Detector-first enforcement + collapsing the serial build loop
date: 2026-08-25
track: colour-golden / tooling
status: READY
governing: .claude/THE-MIGRATION-METHOD.md
---

# Next session — make the fast path the default

Invoke `/autopilot` first.

## Read before anything else

1. **`.claude/THE-MIGRATION-METHOD.md`** — the binding method. Read it in full.
2. `.claude/reports/2026-08-24-script-revival-register.md` — 28 built-and-never-wired tools.
3. `.claude/LEDGER.md` — the colour-golden section.

## Why this session exists

A six-persona adversarial council ran on 2026-08-24. Every claim below was verified
against the code by the main thread before being written down.

**The finding Bean supplied, which no persona found:** the variance is in the AGENT, not
the infrastructure.

| Work | Scope | Elapsed |
|---|---|---|
| `migrate-length-sanitiser.py` | 204 call sites, 56 files | **1 day** |
| `migrate-render-closures.py` | 100 closures, 49 blocks | **1 day** |
| `remove-vacuous-style-engine-guard.py` | 109 guards | **1 day** |
| Colour panel rollout | 33 blocks | **13 days, 25 corrections** |

Same repo, same week, same rules. The fast three built a detector first. The slow one
edited block by block and discovered the rule while editing.

⛔ **A previous session concluded "the migration finished in one day" because all six
D-numbers were dated 2026-08-11. That was WRONG.** A D-number records the day work LANDS,
not the days spent building the scanner and getting it wrong first. Bean corrected it.
**Never quote a D-date as an elapsed cost.**

---

## TASK 1 — Collapse the serial build loop (highest leverage, ~1 afternoon)

**Measured:** `prebuild` is 61 `&&`-joined commands, 3,353 characters, ~128 seconds. Two
gates alone were timed at **28.9s and 16.3s**. Because the chain is `&&` it is FAIL-FAST:
a change tripping five gates shows you ONE failure after two minutes, five times over.

That is the actual mechanism behind "weeks": **one property at a time × one build at a
time × one gate failure at a time.**

**1a — Stop failing fast.** Replace the `&&` string with a runner that executes every
gate, collects EVERY failure, and prints one consolidated report. One build → all defects
→ one fix pass.
- Model to follow: `plugins/sgs-blocks/scripts/consistency/run-consistency-gates.py` —
  read it before writing anything; the pattern already exists.
- Move the chain into `scripts/gates.json`: `{id, cmd, tier, added_D, budget_ms}`. A
  61-command string cannot be diffed, blamed per gate, or reordered.

**1b — Two tiers.** `gate:fast` = the cheap gates, every build. `gate:full` = the four
heavyweights (`pytest`, `check-dead-api-calls.py`, `audit-block-file-consistency.py`,
`inspector-scan/run.js`), pre-deploy only — `build-deploy.py` already has a gate step.
Expected: **128s → ~32s, a 4× cut, zero enforcement weakened.**

⚠ **Time the chain BEFORE and AFTER and record both figures.** Nobody had ever measured
it; that absence is why the cost was invisible.

**Acceptance:** both timings recorded · every gate still runs somewhere · one consolidated
failure report demonstrated by deliberately breaking two gates at once.

---

## TASK 2 — Wire or delete the 28 orphans (~2 hours)

`.claude/reports/2026-08-24-script-revival-register.md` lists 28 scripts that were built,
work, and are wired to nothing. **Start with `scripts/wc-pages-responsive-audit.js` — it is
named as MANDATORY gate RA-1 in `.claude/specs/go-live-checklist.md:81` and nobody runs
it.**

⛔ **Decide by RUNNING each one, not by reading its docstring.** A triage pass over 52 of
these got **13 verdicts wrong (25%)** by trusting headers. One docstring asserts
"Idempotent — re-running finds zero refinements" while a live run reports **229 pending**.
Another advertises a `--self-test` mode that does not exist in the file.

Every one ends the session either wired into `package.json` or deleted. **No third state.**

---

## TASK 3 — Make "done" computable (~1 day)

There is no burn-down anywhere. 61 gates measure whether you have REGRESSED; none measures
how CLOSE you are to finished. A system with regression detection and no completion metric
cannot terminate — which is why the programme feels endless.

Build `scripts/programme-progress.py`: print conformance as `N / M attributes (X%)`,
properties remaining, and the count of non-conforming (block, attr) pairs.

**Ground truth already available, verified 2026-08-24:**
- `block_attributes` holds 3,166 rows.
- **306 flat `*Tablet`/`*Mobile` attrs remain** (`SELECT COUNT(*) ... WHERE attr_name LIKE '%Tablet' OR LIKE '%Mobile'`).
- `css_tier` — the one column whose meaning IS this programme — is **3,136 NULL of 3,166 (99% empty)**.

---

## TASK 4 — `--all-properties` and the batching policy (~half a day)

35 of the 41 remaining properties touch **1–2 blocks each**. Under property-by-property a
one-block property gets the same ceremony as a 41-block one.

Add `--all-properties` to `migrate-tier-object.py` (`--property` is already a scalar at
`:1417`). Keep property-by-property for `margin` (41 blocks), `padding` (39) and
`borderRadius` (11); batch the 35-property tail into ONE pass.

Rule 4 (NO SKIPPING) is satisfied by the classifier's existing skipped-with-reason output.

---

## Guardrails

- **Detector before the 4th file. Always.** `.claude/THE-MIGRATION-METHOD.md`.
- **Never quote a D-date as elapsed cost.** It records when work landed.
- **Grep `package.json` before believing any gate runs.** One sat unwired for three weeks
  while three documents said otherwise.
- **Never run `phpcbf`** — realign by hand.
- **Path-scoped commits, branch re-checked in the same command.** Five tracks share `main`.
- Regenerate both catalogues before committing:
  `generate-tooling-catalogue.py --check` and `generate-db-catalogue.py --check` must exit 0.

## Deliberately NOT in this session

- **Client/revenue work.** The council graded runway **F** — 11 of 1,740 commits touched
  `sites/` in 30 days and NONE were client build work; `build-deploy.py` has one target and
  it is the canary. That is real and urgent, but it is Bean's call, not a task to assume.
  Raise it; do not start it unprompted.
