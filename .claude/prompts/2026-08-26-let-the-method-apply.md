---
doc_type: prompt
title: Let the method APPLY, then wire the orphans
date: 2026-08-26
track: colour-golden / tooling
status: READY
supersedes: the 2026-08-25 six-task version — TASK 1 and TASK 3 shipped, TASK 0 Layer 1 closed
governing: .claude/THE-MIGRATION-METHOD.md
---

# Next session

Invoke `/autopilot` first.

## Read before anything else

1. **`.claude/LEDGER.md`** — the colour-golden section. It is the live status; this prompt
   is a work order derived from it. **If they disagree, the LEDGER wins.**
2. **`.claude/THE-MIGRATION-METHOD.md`** — ⚠ its RULE is binding and now ENFORCED by
   `.claude/hooks/detector-first-commit-gate.py`. Its **11 STEPS are
   `PROVISIONAL-BUT-EXERCISED` and have never been APPLIED.** Read in full.
3. `.claude/reports/2026-08-24-script-revival-register.md` — the 27 orphans.

## What already shipped — do NOT redo these

An earlier version of this prompt listed six tasks. Two are done and one is half done.
Check the LEDGER's `✅ CLOSED` section before starting anything here.

| Was | Now |
|---|---|
| TASK 1 — collapse the serial build loop | ✅ **CLOSED.** 153.4s → 31.0s. `scripts/gates.json` + `run-gates.py`; 4 heavyweights moved to `build-deploy.py`'s `step_gate_full()`. ⛔ There was NO gate step to repoint — npm fires `prebuild` as a lifecycle hook, so splitting it alone would have silently dropped all four from the deploy. `npm run gate:wired` fails closed if that call disappears. |
| TASK 3 — make "done" computable | ✅ **CLOSED.** `scripts/programme-progress.py` — 109 attrs / 37 families / 27 properties remain flat. No percentage, deliberately: a finished migration deletes its sibling rows, so the schema no longer holds the original total. |
| TASK 0 Layer 1 — council the method to an A | ✅ **CLOSED.** Rounds 2–3 ran; grading rubric at `.claude/rubrics/migration-method-grading.md`. Two round-3 objections closed in the model by `crosscheck()`. |
| The enforcement hook | ✅ **SHIPPED.** `.claude/hooks/detector-first-commit-gate.py`, wired in `settings.json`. This was the finding two council personas independently converged on. |

---

# TASK A — Let the method APPLY. This is the whole point of the session.

**The method has been read and criticised 15 times and has never once been allowed to
write a file.** Four agents followed it read-only. Its own `closes_when` names this as the
condition that closes it.

⛔ **The two worst defects found all session were found by DOING, not reading** — a green
gate sitting over a fatal, and a census silently collapsing to 4 files. A sixteenth review
finds neither.

**Do this:** take the DB-first change below and run it **strictly through Steps 1–11, and
let it apply.**

### The change

Every `migrate-*.py` reads ZERO rows from `block_attributes` — they re-glob `block.json`
instead. That is a direct R-31-1 violation (DB-first, no re-derivation). And
`find_target_files()` is **byte-identical** across `migrate-theme-attr-rename.py` and
`migrate-theme-tier-scalars.py`.

Smallest honest version: give `migrate-tier-object.py` a `declared_siblings(prop)` backed
by a `SELECT`, and delete its disk walk. One script, one query, proven against the existing
`--survey` output for the same property.

⛔ **Do NOT extract a shared library for all five scripts.** That is the detector-first rule
applied to itself: survey the duplication first, then decide. Step 2's ⛔ box also applies —
the DB has no column for a file or a call site, so check what you are actually migrating
before reaching for it.

### The deliverable is the failure log, not the migration

Record every point where you had to guess, open a file the method does not name, or do
something it does not describe. Timestamp them. **A step you sailed through is as
informative as one that broke.**

Then convene the final panel on **that evidence** — the log, the commands, what the census
returned — and set the method's `status:` from it. That is Layer 3 of Bean's three-layer
design, and it judges the method as exercised rather than as written.

**Acceptance:** the change APPLIED and committed · a failure log naming at least where the
method was silent · `status:` updated with the evidence cited.

---

# TASK B — Wire or delete the 27 orphans (Bean: next session)

**2 of 27 done.** Register: `.claude/reports/2026-08-24-script-revival-register.md`.

⛔ **Decide by RUNNING each one, not by reading its docstring.** A triage got **13 of 52
wrong** from headers. One docstring claims "Idempotent — re-running finds zero refinements"
while a live run reports **229 pending**; another advertises a `--self-test` that does not
exist in the file.

⛔ **Deletion is NOT the cheap exit.** Deleting requires all three: (a)
`grep -rn "<basename>" .claude/specs .claude/plans` returns nothing; (b) a one-line reason
in the register in the same commit; (c) if it IS named anywhere, wiring is the only
permitted state. A third state exists — `documented-as-manual-with-a-reason` — for anything
needing a live canary or human judgement.

⚠ **RA-1 cannot be a prebuild gate.** `scripts/wc-pages-responsive-audit.js` is at the repo
ROOT and needs `--base <live client domain>`. Post-deploy against the canary is its honest
home. Wiring it into `prebuild` would be enforcement theatre.

---

# TASK C — `--all-properties` and the batching policy

35 of 41 properties touch **1–2 blocks each**. Under property-by-property a one-block
property gets the same ceremony as a 41-block one. Add `--all-properties` to
`migrate-tier-object.py`.

⛔ An earlier draft exempted `margin` (41), `padding` (39) and `borderRadius` (11) from
batching — 91 block-touches on the slow path, blessed in writing, with no reason given.
**That carve-out is withdrawn unless you can state a mechanical reason.** Run all 41
through one `--all-properties --survey` census first.

---

## Guardrails

- **Detector before the 4th file. Always.** Now enforced by a commit gate, not just stated.
- **Never quote a D-date OR a commit date as an elapsed cost.** Both record when work
  LANDED. This prompt's predecessor made that error twice; the method's "Why this exists"
  section carries the withdrawn figures.
- **Enumerate, never recall.** Every figure derived by listing items this session was
  right; every figure recalled from memory was wrong — including one agent's own edits.
- **Grep the roster before believing any gate runs.** One sat unwired three weeks while
  three documents said otherwise.
- **Never run `phpcbf`** — realign by hand.
- **Path-scoped commits, branch re-checked in the same command.** Five tracks share `main`.
- Both catalogues must be current before committing: `generate-tooling-catalogue.py --check`
  and `generate-db-catalogue.py --check` exit 0.

## Deliberately NOT in this session

- **Client/revenue work.** The council graded runway **F** — 11 of 1,740 commits touched
  `sites/` in 30 days and **none were client build work**; `build-deploy.py` has one target
  and it is the canary. Real and urgent, but Bean's call. **Raise it in the closing message;
  do not start it unprompted.**
- **Option A — interrupting at the 4th file EDIT** (before the work is committed) is
  deferred by design. The commit gate catches it at the boundary that matters today.
