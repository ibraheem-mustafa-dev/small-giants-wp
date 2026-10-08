---
name: migration-method
description: "Use when the same change is needed in more than 3 blocks, attributes, files or call sites; when writing a codemod, migration script, detector, sweep or findings-backlog burn-down; or when renaming or reshaping an attribute across blocks. Settle the target shape, then build the detector (survey, fix, check, self-test) before the 4th edit. Do NOT invoke for: a single-file fix, or a change touching 3 or fewer files."
---

# The migration method

**Read this before editing the 4th file in any repeating change.**

## Do this now

0. ⭐ **BURNING DOWN an existing detector's findings backlog** (a rule that already reports
   findings, e.g. `inspector-scan`)? **Go straight to Step 7b.** Steps 3, 4, 5, 6 and 9 are N/A.
   Come back to Step 8 for the ratchet and Step 11 for the live check.
1. **Flat `*Tablet`/`*Mobile` attrs → one object?** The tool exists:
   `python plugins/sgs-blocks/scripts/migrate-tier-object.py --property <name> --survey`, then read
   Step 2's ⛔ box. Stop here.
2. **Does your change alter anything a client SEES?** Do **Step 3 first**, then Step 1 onward. Settling
   the shape before censusing decides whether the change costs a day or a fortnight.
3. **Otherwise** (a rename, a call-site swap, a helper adoption) start at Step 1.

The rule below is locked. If you hit an instruction that cannot be followed, fix it in place.

---

## The rule

> **If a change touches more than 3 blocks, files or call sites, the first deliverable is
> the detector, not the edit.**
>
> **And if the change is client-visible, the first deliverable before THAT is the settled
> target shape** (Step 3).

Bean-locked at **D542** (`.claude/archive/decisions.md`), the detector-first gate.

You have finished the detector when it can answer, without you reading any file:

1. How many instances exist?
2. Where is each one?
3. Which are genuine targets, and which are exempt and why?

⛔ **A counting script is not a detector.** It is not done until it carries
`--survey / --fix / --check / --self-test` and is registered in `gates.json` (Steps 4-8).

### What it costs, and what you are buying

At 4 instances the detector costs more than the edit. Measured floor: **131 lines**
(`migrate-overlay-tier-axis.py`); typical **242-362**. You are not buying the edit: you are
buying the `--check` gate that stops instance 5 arriving next month. **If the change
genuinely cannot regress, the threshold does not apply.**

### If this migration is a declared Spec 31 PHASE

⚠ **Then R-31-5 governs and you split it** into that phase's agreed commit boundaries. The
single-landing-commit assumption elsewhere in this document describes a standalone codemod, not
a phase.

## ⛔ When to STOP and hand back to Bean

Hand back, do not improvise, do not try one more thing, the moment any of these is true.
Say which one, and what state the tree is in. Bean is QC-only: these are the points where
his judgement, not yours, is needed.

1. **`--survey` reports `unrecognised > 0`** and you cannot classify the site from the file
   alone. The classifier is incomplete; guessing is how a migration corrupts.
2. **`git status` shows uncommitted work in your target paths that you did not write.**
   Another track is live in your blast radius. Five tracks share `main`.
3. **`--apply` exited non-zero, or was interrupted.** Report `git diff --stat` verbatim. Do
   not re-run and do not `git checkout` until Bean has seen it.
4. **`--check` will not return to 0** after Step 10's restore.
5. **The deploy aborts naming files you did not touch.**
6. **You are about to add a per-file special case to `transform()`.** By Step 5's test that
   means you miscounted your cases: re-census, do not patch.
7. **You need a flag whose help text says "NOT recommended"** (`--allow-dirty`,
   `--skip-verify`, `--skip-gate-full`). Those exist for Bean's judgement, not yours.
8. **Step 3 applies and Bean is not available.** A client-visible shape needs his eye
   (R-31-13) and you cannot proceed past Step 3 without it. Hand back with the census
   and the ONE instance built: that is the useful state to hand over, not nothing.
9. **The change touches a shared wrapper, the walker, `converter/`, or ANY helper whose blast
   radius spans many blocks.** The three named systems are examples, not the boundary: a shared
   helper in `includes/` called by 40 blocks is inside this condition. If you are deciding whether
   your change qualifies, it qualifies: ask Bean. Rule 7 requires a
   design gate and Bean's approval BEFORE building. This document does not override it.

---

# The process

Each step below is the short form. The detail (commands, tables, worked examples) is in `references/`, named in each step. Read the reference before doing the step, not after.

## Step 1 — Check the tool already exists

Grep the SUBJECT, never the verb (`census-*`, `survey-*`, `audit-*`, `check-*`, `scan-*`, `probe-*` and `report-*` are the same idea). Run `ls plugins/sgs-blocks/scripts/*migrate*`, the tooling catalogue `--check`, and grep `.claude/catalogues/tooling.md` and `helpers.md`. ⚠ A tool that covers your subject but lacks `--fix`/`--check`: EXTEND it, do not rebuild it. ⚠ Confirm the CORPUS matches before calling a hit a hit. Rebuilding a tool that exists is this repo's recorded failure mode. Read `references/survey-and-triage.md` (Step 1).

## Step 2 — Ask the database, but only for what it holds

⛔ **The DB-first rule scopes to ATTRIBUTE migrations ONLY.** `block_attributes` answers "which blocks declare attribute X"; for a call-site, closure, helper or import migration it has nothing to offer: **walk the disk.** ⛔ **`includes/*.php` and the other shared trees are IN SCOPE whichever you use** (D575). ⛔ Filter `source='sgs'`: the DB can be WIDER than the tree (D775). ⛔ `block_attributes` cannot see WP-NATIVE `supports` controls. Reconcile both sides yourself, per file; ⚠ a DB/disk count mismatch is a FINDING, not noise. ⛔ Coming from `migrate-tier-object.py`: `UNCLEAR` states are read BY HAND, `--fix --apply` never writes `render.php`, and `--check` does not gate on `render_state: RAW`. Read `references/survey-and-triage.md` (Step 2).

## Step 3 — Settle the SHAPE first, on ONE instance, with Bean

**Only for changes with a surface a client sees. Skip for renames and call-site swaps.**

Build **one** instance. Deploy it. Get Bean's eye on it (R-31-13). Write the settled shape down as the transform's target **before you census anything**.

⛔ **If the target shape is ALREADY settled and recorded, Step 3 is satisfied: say so and move on.** A repo standard Bean has locked (e.g. `plugins/sgs-blocks/CLAUDE.md`'s `TypographyControls` + `sgs_typography_css_rule` rule, R-22-13) IS a settled shape. **Cite the rule and the blocks already conforming to it, then continue.** ⚠ If the blocks disagree about the standard in RENDER (as `text` and `heading` do for `letterSpacing`), the shape is NOT settled: take that disagreement to Bean.

⚠ **Deploying ONE uncommitted instance trips the dirty gate** (`deployed-files-dirty`). **Commit your one block first, or declare `--payload <path>`.** Never `--allow-dirty`, the flag that caused D336.

A shape decided against a rendered page costs one block. The same decision discovered on block 9 costs nine. **This is also the Rule 7 design gate**: for a shared wrapper, the walker or `converter/`, Bean's approval here is mandatory, not advisory.

## Step 4 — Choose the recogniser, then copy the skeleton

⛔ If a detector for this subject ALREADY EXISTS, carries `--check`/`--self-test` and is registered (e.g. `inspector-scan`), **Steps 4 and 5 are N/A: say so and go to Step 7b** (D778). Otherwise pick the tool: a single-token, single-line target uses the line classifier in `migrate-length-sanitiser.py`; a multi-line shape uses **an AST, not a regex** (`colour-codemod/adopt.js`); a single-function body swap or other large-blast-radius change takes only `crosscheck()` and goes to Step 6 (D775).

⛔ **A line classifier applied to a multi-line shape is the commonest way a codemod corrupts 5% of its targets silently.**

Copy `migrate-length-sanitiser.py` ALONE as the skeleton. ⛔ Anchor `ROOT` on `__file__` inside the repo; elsewhere on `.git` (tested with `exists()`), never on `CLAUDE.md`. The CLI contract is `--survey`, `--survey --json`, `--fix` (prints a unified diff), `--fix --apply`, `--check`, `--self-test`; `--check` exits 1 on remaining work and 0 when clean. ⛔ `--check` must gate on `bare-mention` via `crosscheck()`, must read the UNFILTERED target list, and must assert the ABSENCE of the old shape. Write `preview()` yourself: **Bean is QC-only; the diff is the only artefact he can inspect**, and a per-file count is not one. Writes are atomic (`.tmp` then `os.replace()`). `unrecognised` is mandatory and non-fatal. Read `references/detector-and-fixtures.md` (Step 4, which holds the skeleton table).

## Step 5 — The transform is SHAPE-TO-SHAPE, not find-and-replace

⛔ N/A when the detector already exists (Step 4's box); go to Step 7b. Otherwise `transform()` RECOGNISES the old shape structurally, EXTRACTS the holes, EMITS the new shape. **The test: if two instances differ only in their hole values, they are ONE case.** ⛔ Apply the test across FILES, with cross-file preconditions in `crosscheck()`. Read `references/detector-and-fixtures.md` (Step 5).

## Step 6 — Write the fixtures before the transform

Six minimum: positive, definition (for a pure rename it must CHANGE), edge, negative control (byte-identical afterwards), idempotence, and a corpus control that RECONCILES a second, dumb, wide enumeration instead of banding (`WIDTH_OK` with a reason, run on `--check`). ⚠ Assert every `EXCLUDE` path still exists. Read `references/detector-and-fixtures.md` (Step 6).

## Step 7 — Survey, and read the whole census

Run `--survey` and `--survey --json > reports/migrations/<name>-census.json`. Read every category, not just the total. **Commit the JSON census in the landing commit**: a count printed to a terminal you closed is not evidence. ⚠ Split refusals from `unrecognised`: report deliberate refusals as `refused`, with the rule that fired. Read `references/survey-and-triage.md` (Step 7).

## Step 7b — TRIAGE the findings before you gate them

Only when the detector already existed and reports a large backlog. Get findings with `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` (node, no `--survey`) and filter to your rule and `status === "FLAGGED"`.

⛔ **A finding is not a defect until you have said which of three things it is:** REAL (enters the worklist and ceiling), DETECTOR BUG (fix the rule: *"A false positive is a detector bug, never baseline fodder."*), or ARTEFACT (record the limit ON the rule, with the evidence of consumption). ⛔ "Fix the rule" has ONE exception, a resolver SHARED across rules: that is hand-back #9. ⛔ A false ABSENCE reads exactly like a clean result: declare the expected population BEFORE the first run. ⚠ Diff findings on a CONTENT key, never a line-keyed one. Worked example: `inspector-scan/rules.json` `advisoryReason` fields. Read `references/survey-and-triage.md` (Step 7b).

## Step 8 — Wire the gate BEFORE you write

⛔ **Register the gate and commit it BEFORE `--apply`.** A red gate is the only signal that tells the *next* session a migration is half-applied. ⛔ **RUN your `--check` and see what it returns TODAY before you register it**: one already red for other reasons reds every build for all five tracks. A GUARD-shaped change is green from registration (D775).

⛔ **There are three gate shapes** (binary, guard, ratcheted ceiling; D778). ⛔ **An advisory rule DOES red the build**: it IS the ratcheted-ceiling shape, not an off switch. The promotion criterion is Bean-locked in `inspector-scan/rules.json` `_meta.note`; query it, do not copy a count here.

The ratchet:

- The ceiling is **monotonic downward**; every lowering records its composition **enumerated, not inferred**.
- ⛔ **Raising it is permitted ONLY as a stated staleness correction, never to absorb new debt**, said in writing on the rule.
- ⛔ **A ceiling above the live count is SLACK, and slack means a brand-new violation lands green.** **Re-measure and lower after every drop.**
- ⛔ **Never promote a rule to gating on the run that introduces it.**
- **Advisory is a STARTING state with an exit condition**, written into its `advisoryReason`.

⛔ **If the detector is ALREADY registered, registration is DONE.** Confirm with `npm run gate:list`, never by grepping `package.json`. Otherwise add a seven-field `gates.json` record plus a `check:<name>` alias. ⛔ **A migration is not finished until its `--check` runs automatically** (`npm run gate:list`); anything in tier `full` needs `npm run gate:wired`. Read `references/gate-shapes.md` for the shape table, the record, tiers and baselines.

## Step 9 — Snapshot, dry run, then apply

`git status --porcelain -- <paths>` must be empty; record `git rev-parse HEAD`; run `--fix` (diff only), then `--fix --apply`, then read `git diff --stat`. ⛔ `--survey` must report `unrecognised: 0` BEFORE you apply; a non-zero exit from `--apply` does NOT mean the tree is untouched. ⛔ Work in your paths you did not write: STOP (hand-back #2). ⛔ `git checkout -- <paths>` is NOT a safe undo: use `git checkout <recorded-sha> -- <your paths>`, and never a bare `git checkout .`. ⚠ If survey counts moved between dry run and apply, re-survey. Read `references/apply-and-verify.md`.

## Step 9b — A codemod's own `--check` is necessary, not sufficient

**"Done" for a schema fold is a green FULL build/gate chain, never the codemod's own `--check` alone.** Re-grep the WHOLE codebase for the old attribute names after every run; run the real build (`npm run build`, PHPStan included); never trust a hand-written regex reformat pass without re-reading `git diff`.

## Step 10 — Prove the gate can fail

Run `--self-test` (exit 0) and `--check` (exit 0). Then break one instance on purpose: `--check` must exit 1. **A gate you have never seen fail is not a gate.** ⛔ Restore by re-running `--fix --apply`, not `git checkout`, then require `--check` exit 0 a second time before committing. ⚠ After rebasing or merging `main`, re-run `--survey` AND `--check`.

## Step 11 — Deploy and LOOK. The gate is not the proof.

Run `git status --porcelain` (nothing of yours outstanding), then `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`. Open a real page and check the changed property's computed value, **at least one instance per `classify()` category**. No rendered surface: N/A, substitute a diff against a baseline from `git show <recorded-sha>:` (D775). A findings backlog: one live check per fixing mechanism (D778). ⛔ **A green `--check` proves no instance was MISSED. It proves nothing about whether the transform was RIGHT**; this method does not replace Rule 5 or R-31-13. ⛔ **If the deploy aborts with `deployed-files-dirty`, do NOT reach for `--allow-dirty`** (D336, a ~2.5-hour two-client-site outage); commit your paths or declare `--payload <path>`; **if the uncovered list names files you did not write, stop and hand back.** Read `references/apply-and-verify.md`.

---

# Known hazards

Read `references/hazards.md` before writing any codemod that writes files. The ones that bite first: **never `open(path,'w')`, write atomically** (a truncated file passes `--check` GREEN); scope the glob off `__file__`, never the repo root; read AND write with `newline=''`; never run `phpcbf`; a function call can precede the require that DEFINES it (D976); strip comments before any regex detector; **derive every figure by enumeration and re-run the command; never copy a number from this document.**

---

# The thesis, in one line

**A census relocates the corrections from the TREE into the DETECTOR**: one commit
fixes hundreds of sites instead of one commit per block. But a census answers *how
many, where, and which are exempt*; it cannot answer *what shape is right*. That is
Step 3.

Full derivation and the day-2 census evidence:
[`reports/2026-08-24-migration-method-evidence.md`](reports/2026-08-24-migration-method-evidence.md).
