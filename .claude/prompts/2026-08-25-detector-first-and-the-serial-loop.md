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

1. **`.claude/THE-MIGRATION-METHOD.md`** — the method. ⚠ `PROVISIONAL`, not binding: reviewed six ways, used zero times. TASK 0 hardens it. Read it in full.
2. `.claude/reports/2026-08-24-script-revival-register.md` — 27 built-and-never-wired tools.
3. `.claude/LEDGER.md` — the colour-golden section.

## Why this session exists

A six-persona adversarial council ran on 2026-08-24. Every claim below was verified
against the code by the main thread before being written down.

**The finding Bean supplied, which no persona found:** the variance is in the AGENT, not
the infrastructure.

| Work | Scope | Correction commits |
|---|---|---|
| `migrate-length-sanitiser.py` | 204 call sites, 56 files | **1 landing commit, 0 corrections** |
| `migrate-render-closures.py` | 100 closures, 49 blocks | **1 landing commit, 0 corrections** |
| Colour panel rollout | 33 blocks | **25 corrections** (D609, D618, D621, D622, D632, D633, D634) |

Same repo, same week, same rules. The difference is not days — it is that a census-driven
pass lands ONCE and a discovery walk lands twenty-five times.

⛔ **TWO ELAPSED-COST ERRORS WERE MADE WRITING THIS, BOTH THE SAME SHAPE. Read this before
quoting any duration.**
1. A session read six D-numbers dated 2026-08-11 and concluded the migration "took one
   day". A D-number records when work LANDS.
2. The correction then quoted "1 day" for three migrations — off a COMMIT DATE. Same
   inference, same error, one paragraph after banning it. And the comparison was rigged
   without meaning to be: `sgs_css_length_value`, the function the sanitiser migration
   migrates TO, was authored **19 days earlier**. The fast number excluded its prerequisite
   work; the slow number included all of its.

**Never quote a commit date or a D-number as an elapsed cost. If you need a duration,
state the measurement that produced it and apply it to BOTH sides.**

---

## TASK 1 — Collapse the serial build loop (highest leverage, ~1 afternoon)

**Measured:** `prebuild` is 61 `&&`-joined commands, 3,353 characters, ~128 seconds. Two
gates alone were timed at **28.9s and 16.3s**. Because the chain is `&&` it is FAIL-FAST:
a change tripping five gates shows you ONE failure after two minutes, five times over.

That is the actual mechanism behind "weeks": **one property at a time × one build at a
time × one gate failure at a time.**

**FIRST ACTION (under 5 minutes, zero dependencies) — extract the chain so it can be read:**

```bash
python -c "import json;print(json.load(open('plugins/sgs-blocks/package.json'))['scripts']['prebuild'])"
```

⚠ The ~128s figure came from ONE spot-timing of 55 gates and was never recorded. Re-time
it properly and record the number before changing anything.

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

**Acceptance (numeric — the earlier wording was gameable by moving every slow gate to
`gate:full` and calling it "runs somewhere"):** `gate:fast` ≤ 40s on a cold run ·
`gate:fast` retains **≥ 55 of the 61** gates, with each moved gate named and its measured
ms given · `gate:full` proven to execute by a pasted `build-deploy.py` log line ·
consolidated report demonstrated with two gates broken simultaneously · `budget_ms`
populated from the measured run, never estimated.

⚠ **`prebuild` is the most contested file in the repo — MEASURED: `package.json` was 
touched by 14 commits in the last 7 days, and five tracks are on `main`.** Re-diff it 
against `origin/main` at the MOMENT you write `gates.json`, not at session start; if it 
moved, re-derive rather than merging by hand.

⛔ **BAIL-OUT:** if the rewrite hits a merge conflict, or a gate breaks on a cwd-relative 
assumption, STOP and hand back. Do not debug a shared-file conflict solo mid-session.

⚠ Also repoint `build-deploy.py`'s existing gate step at `gate:full` in the same commit, 
or the deploy net silently keeps running the pre-split chain. Land
this in one commit or not at all, and update `THE-MIGRATION-METHOD.md` Step 8 in the SAME
commit — it currently tells agents to wire gates into `package.json`, which this task
replaces.

---

## TASK 2 — Wire or delete the 27 orphans (~2 hours)

`.claude/reports/2026-08-24-script-revival-register.md` lists 27 scripts that were built,
work, and are wired to nothing. **Start with `scripts/wc-pages-responsive-audit.js` — it is
named as MANDATORY gate RA-1 in `.claude/specs/go-live-checklist.md:81` and nobody runs
it.**

⛔ **Decide by RUNNING each one, not by reading its docstring.** A triage pass over 52 of
these got **13 verdicts wrong (25%)** by trusting headers. One docstring asserts
"Idempotent — re-running finds zero refinements" while a live run reports **229 pending**.
Another advertises a `--self-test` mode that does not exist in the file.

⛔ **DELETION IS NOT THE CHEAP EXIT. Read this before touching anything.**
A council found that "wire or delete, no third state" makes `git rm` on all 27 the
cheapest fully-compliant path — **including RA-1, the mandatory go-live gate**. A session
meant to restore enforcement would have destroyed it. So the two states are deliberately
ASYMMETRIC:

- **Deleting requires all three:** (a) `grep -rn "<basename>" .claude/specs .claude/plans`
  returns NOTHING; (b) a one-line reason recorded in the revival register in the same
  commit; (c) if it IS named anywhere, wiring is the ONLY permitted state.
- `wc-pages-responsive-audit.js` is **wire-only** — it is RA-1.
- A third state EXISTS: `documented-as-manual-with-a-reason`, for anything needing a live
  canary or a human judgement.

**Floor: if fewer than 20 of the 27 end up wired, the session laundered enforcement rather
than restoring it. Say so plainly in the handoff.**

---

## TASK 0 — HARDEN THE FOUNDATION. Three layers, in order. Bean's design.

⛔ **DO THIS BEFORE ANY OTHER TASK.** `.claude/THE-MIGRATION-METHOD.md` is the foundation
everything else rests on. It is currently `PROVISIONAL`: reviewed six ways, **used zero
times**. Bean's ruling is that it gets perfected, then proven, then re-judged on the
evidence — not polished once and trusted.

### Layer 1 — Council it to an A grade

Run `/adversarial-council` on `THE-MIGRATION-METHOD.md`. Fix what it finds. **Re-council.
Repeat until every persona grades it A− or better.**

- Use FRESH personas each round — a persona that already reviewed it will defend its own
  earlier findings. Round 1's six were: Cold Agent, Saboteur, Spec-Lawyer, Cynic, Ship-PM,
  Leverage Engineer. Their reports are the baseline; do not re-derive what they found.
- **Every persona must be given the end-goal verbatim:** *a cold agent with no memory reads
  this at session start and takes the fast path on its first attempt, without Bean
  intervening.*
- **Fact-check every claim the panel makes before acting on it.** Bean overturned one of
  round 1's findings (M-a, "not mechanically transformable") by checking the decision log,
  and it was wrong — see Step 3b. A council finding is a hypothesis, not a verdict.

⛔ **STOPPING RULE — this is a hardening loop, not a stall trap.** Maximum **3 rounds**. If
a persona still will not go above B after 3, STOP and record what it objects to and why the
objection was not resolved. Do not grind. A document that cannot reach A on one axis with
the reason written down is more useful than a fourth round.

⚠ **Two findings are already known and will recur — pre-empt them or the panel will just
re-derive them.** (1) Nothing ENFORCES the method; two personas converged on this. (2) The
ten pointer banners restate measured figures that will drift; collapse them to one
canonical table and make the rest bare pointers.

### Layer 2 — PROVE the A-grade method on a real migration

Take **TASK 5** (make one migration script read the DB) and run it **strictly through Steps
1–9**, in order, without shortcuts.

**The deliverable is not the migration. It is the log of where the method failed you.**
Record every point you had to guess, open a file the guide did not name, or do something it
does not describe. Timestamp them. A step you sailed through is as informative as one that
broke.

### Layer 3 — Council the RUN, not the document

Convene a final panel on the **evidence from Layer 2** — the failure log, the actual
commands, what the census returned. This panel judges the method as exercised, not as
written.

Then set `status:` accordingly and update `closes_when:` in the frontmatter.

**Acceptance for TASK 0:** every persona at A− or the objection recorded · one real
migration completed through all 11 steps · a failure log with at least the points where the
guide was silent · the method's `status:` updated from PROVISIONAL with the evidence cited.

---

## TASK 3 — Make "done" computable (~1–2 hours) — DO THIS FIRST

There is no burn-down anywhere. 61 gates measure whether you have REGRESSED; none measures
how CLOSE you are to finished. A system with regression detection and no completion metric
cannot terminate — which is why the programme feels endless.

⚠ **Re-ordered and re-estimated.** The original said "~1 day" and put it third. It is 
three COUNT queries against a populated DB wrapped in a print — the highest estimate of 
the four on the task with the least ambiguity, which is exactly the padding 
`~/.claude/rules/time-estimates.md` exists to stop. It also touches ZERO shared files, so 
it banks the completion metric the whole programme lacks before anyone touches the 
contested one.

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
`:1417`). ⛔ **The original draft of this task said "keep property-by-property for `margin` (41),
`padding` (39), `borderRadius` (11)" — that is 91 block-touches on the slow path, blessed
in writing, in the session governed by a document forbidding it. No reason was given.**

The carve-out is WITHDRAWN unless you can state a mechanical reason. Run all 41 properties
through one `--all-properties --survey` census. If `margin`/`padding` need separate
handling, the reason must be named (e.g. review-surface size) and capped: ONE pass,
reviewed per-property from that single census — never a discovery walk.

Rule 4 (NO SKIPPING) is satisfied by the classifier's existing skipped-with-reason output.

---

## TASK 5 — Make ONE migration script read the DB (~2 hours)

⚠ **This is also TASK 0's Layer 2 test case.** Run it strictly through Steps 1-11 and log where the method fails you. Do not do it twice.

Council finding #3 had no task and was silently absent. It is a direct R-31-1 violation
(DB-first, no re-derivation): **every `migrate-*.py` reads ZERO rows from the 3,166-row
`block_attributes` table** — they re-glob `block.json` instead. And `find_target_files()`
is **byte-identical** across `migrate-theme-attr-rename.py` and `migrate-theme-tier-scalars.py`.

Do the smallest honest version: give `migrate-tier-object.py` (already open for Task 4) a
`declared_siblings(prop)` backed by a `SELECT`, and delete its disk walk. One script, one
query, proven against the existing `--survey` output for the same property.

⛔ Do NOT extract a shared library for all five scripts in this session. That is the
detector-first rule applied to itself: survey the duplication first, then decide.

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