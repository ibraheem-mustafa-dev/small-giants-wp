---
doc_type: guide
title: The migration method — settle the shape, then build the detector
date: 2026-08-24
applies_to: any change touching more than 3 blocks, attributes, files or call sites
covers: TWO shapes — (a) build a detector for a new repeating change; (b) burn down an
  EXISTING detector's findings backlog (Step 7b + Step 8's ratchet).
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

## Step 1 — Check the tool already exists

Grep the SUBJECT, never the verb. The same idea ships here as `census-*`, `survey-*`,
`audit-*`, `check-*`, `scan-*`, `probe-*` and `report-*`.

```bash
ls plugins/sgs-blocks/scripts/*migrate*
python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py --check
grep -n "<subject>" .claude/catalogues/tooling.md .claude/catalogues/helpers.md
```

⚠ **A tool that covers your subject but lacks `--fix`/`--check`: EXTEND it, do not rebuild it.**
`surveys/survey-typography-controls.py` is a 906-line DB-backed census with no `--survey` and no
fixer; it is most of a detector. Adding the missing modes is hours; rebuilding is the failure this
step exists to prevent.

⚠ **Confirm the CORPUS matches before calling a subject hit a hit.** `surveys/census-tier-siblings.sh`
censuses stored `post_content` on the live canary, not declared attributes in `block.json`: same
words, different corpus.

Rebuilding a tool that exists is this repo's recorded failure mode. Run
`find plugins/sgs-blocks/scripts -maxdepth 1 -type d` (there are dozens): searching one directory
and concluding nothing exists is how it happens.

## Step 2 — Ask the database, but only for what it holds

`block_attributes` answers **"which blocks declare attribute X"** in one query.

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, attr_name FROM block_attributes WHERE attr_name LIKE '%Tablet'"
```

⛔ **The DB-first rule scopes to ATTRIBUTE migrations ONLY.** `block_attributes` has columns
for `block_slug` and `attr_name` and **no column for a file or a call site**. For a call-site,
closure, helper or import migration it has nothing to offer: **walk the disk.**

⛔ **`includes/*.php` and the other shared trees are IN SCOPE whichever you use.**
`block_attributes` is foreign-keyed to `blocks(slug)`, so a DB-derived list is block-scoped
and silently omits every shared include. **That omission is D575**: the `minHeight` survey
returned zero findings while the shared wrapper shipped `min-height:Array` to 73 live
declarations.

⛔ **The DB can also be WIDER than the tree.** `block_attributes` holds rows for CORE blocks
(`source='native_wp'`) which have **no directory under `src/blocks/` at all**, so an unfiltered
tier-sibling query returns more pairs than disk has. **Filter `source='sgs'`.** A falsely-WIDE
answer marks a DEAD read as live: the D575 shape. (D775.)

⛔ **`block_attributes` also cannot see WP-NATIVE `supports` controls**, and the client
sees those identically to a declared attr. So a DB-derived list for a client-visible
change silently omits every block that declares the capability through `supports`.

**Reconcile both sides yourself; do not trust a number written here.** A raw grep counts
comment-only mentions as declarations. **Parse each `block.json` and classify per file:
declared attr / `supports` flag / mention only.**

⚠ **A DB/disk count mismatch is a FINDING, not noise.** Reconcile it before applying: it is
usually a stale row or an unseeded block, and it means one of your two sources is lying.

⛔ **If you came here from `migrate-tier-object.py`, three things `--survey` will not tell
you:** `UNCLEAR` render/edit states must be read BY HAND; `--fix --apply` writes `block.json` and
`edit.js` **only, never `render.php`**; and `--check` does **not** gate on `render_state: RAW`, so a
green gate does not mean the render side is done (see its module docstring, grep `are NOT
auto-applied by this script`; the includes-scope hazard is **D575**).

## Step 3 — Settle the SHAPE first, on ONE instance, with Bean

**Only for changes with a surface a client sees. Skip for renames and call-site swaps.**

Build **one** instance. Deploy it. Get Bean's eye on it (R-31-13). Write the settled shape
down as the transform's target **before you census anything**.

⛔ **If the target shape is ALREADY settled and recorded, Step 3 is satisfied: say so and move
on.** A repo standard Bean has locked (e.g. `plugins/sgs-blocks/CLAUDE.md`'s `TypographyControls`
+ `sgs_typography_css_rule` rule, R-22-13) IS a settled shape. **Cite the rule and the blocks
already conforming to it, then continue.** ⚠ If the blocks disagree about the standard in RENDER
(as `text` and `heading` do for `letterSpacing`), the shape is NOT settled: take that disagreement
to Bean.

⚠ **Deploying ONE uncommitted instance trips the dirty gate.** `build-deploy.py`
deliberately does not skip `src/`, so it aborts with `deployed-files-dirty` and offers
`--allow-dirty`, the flag that caused D336. **Commit your one block first, or declare
`--payload <path>`.** Never `--allow-dirty`.

A shape decided against a rendered page costs one block. The same decision discovered on
block 9 costs nine. **This is also the Rule 7 design gate**: for a shared wrapper, the
walker or `converter/`, Bean's approval here is mandatory, not advisory.

## Step 4 — Choose the recogniser, then copy the skeleton

⛔ **FIRST: does a detector for this subject ALREADY EXIST and report findings?** If Step 1 found
one that already carries `--check`/`--self-test` and is registered (e.g. `inspector-scan`, every rule
across every block), then **Steps 4 and 5 are N/A: say so and go to Step 7b.** You are not
building a recogniser; you are burning down the backlog of one that works. Forcing Steps 4-5 here
produces a second detector competing with the first. (D778.)

**Pick the tool before you copy anything:**

- **Single-token, single-line target** (a function rename, a constant swap) → the line
  classifier in `migrate-length-sanitiser.py`. Right tool; its refusal rules are the point.
- **Multi-line shape** (a JSX mount, an object literal, a closure body, anything with
  `{...}`) → **an AST, not a regex.** The working in-repo model is
  `plugins/sgs-blocks/scripts/colour-codemod/adopt.js`: `@babel/parser` (already
  installed) and the same CLI contract. It is itself **unwired** (absent
  from `gates.json`): copy its shape, not its wiring.
- **Neither: a single-function body swap, or any change small in FILES but large in BLAST
  RADIUS.** Steps 4-7 do not fit and you should not force them. **`crosscheck()` is the part that
  transfers** (a whole-corpus precondition `transform()` cannot see); `classify()`, `EXCLUDE`,
  `PAT`, `targets()`, `rel()` and `unrecognised` are all N/A. Record that, and go to Step 6:
  the fixtures still apply in full. (D775.)

⛔ **A line classifier applied to a multi-line shape is the commonest way a codemod
corrupts 5% of its targets silently.**

### ⛔ Anchoring

`ROOT` is where your corpus comes from; getting it wrong silently empties or explodes your census.
A script **inside the repo** anchors on `__file__`, walking up. A script **anywhere else** (scratch
dir, temp harness) anchors on a **repo-UNIQUE marker file**. ⛔ `CLAUDE.md` is NOT unique
(`plugins/sgs-blocks/` has its own), so a gate anchored on it scans a handful of files and prints a
clean PASS; use `.claude/THE-MIGRATION-METHOD.md`. ⚠ Scope the GLOB so it never descends into
`.claude/worktrees/`, `node_modules/`, `build/`, `vendor/` or `scripts/**/fixtures/`, pruning during
the walk, not after.

### The skeleton — `migrate-length-sanitiser.py` ALONE

⚠ **`migrate-render-closures.py` is a worked EXAMPLE, not a second skeleton.** It
has no `classify()`, no `EXCLUDE`, no `rel()`, no `unrecognised` category and two fixtures,
so it fails this document's own mandatory rules below. Read it for `defs_in()` and the
aligned-assignment hazard only.

| Part | Where | What it does |
|---|---|---|
| `ROOT` | `:62` | Repo-root path constant. **Anchoring is a THREE-WAY decision — read the box below before you copy it** |
| `targets()` | `:86` | The target list. **Copy this for a call-site migration** — the DB cannot produce one (Step 2) |
| `BARE_OK` | `:102` | Every surviving bare mention, pinned by per-file count, each with a written reason |
| `crosscheck()` | `:193` | The whole-corpus stage. `--check` gates on what it returns |
| `rel(path)` | `:227` | Repo-relative path for reporting |
| `scan(...)` | `:280` | The driver: walks targets, classifies, tallies, optionally writes |
| `self_test()` | `:345` | Runs the fixtures, returns failures |
| `main()` | `:421` | The CLI contract below |

⚠ **These line numbers drift.** Re-derive rather than trust:
`grep -n '^def \|^SELF_TEST\|^BARE_OK\|^ROOT' plugins/sgs-blocks/scripts/migrate-length-sanitiser.py`

### The CLI contract — copy verbatim

```
--survey        census only, no writes          (must be branched explicitly in main())
--survey --json a durable census artefact       (YOU write this — the model has no --json)
--fix           dry run, prints a UNIFIED DIFF
--fix --apply   writes
--check         gate: exit 1 if any migratable site remains
--self-test     exit 1 if any assertion fails
```

`--check` must exit **1** on remaining work and **0** when clean. That single property turns
a finished migration into a permanent regression guard.

⛔ **`--check` must gate on `bare-mention` via `crosscheck()`.** A bare mention is the name
WITHOUT a trailing `(`, so `PAT` never matches and the transform cannot see it. Two live shapes: a
dispatch string (`class-sgs-container-wrapper.php`'s `'transform' => 'sgs_colour_value'`, fired via
`call_user_func()` in `helpers-responsive.php`) and a `function_exists()` guard (`helpers-box.php`
for `sgs_css_length_sanitise`; rename the function without it and the polyfill always defines, or
never does). **Grep for your OWN symbol in both shapes; do not inherit an example's site list.**
The model pins every surviving bare mention in `BARE_OK` with a per-file COUNT and a written reason;
`crosscheck()` fails on an unjustified one, a changed count, or a stale entry. `--survey` LISTS them.

⛔ **`--check` must read the UNFILTERED target list.** Any `--only`/`--skip` filter must be
excluded from the `--check` path, or `--check --skip foo` exits 0 with `foo` unmigrated.
⛔ **`--check` must assert the ABSENCE of the old shape, not the presence of the new one.**
⚠ `--survey` is declared but never read in the model: it works only because the
no-flag default is a census. Branch it explicitly; that is a defect, not the pattern.
⚠ Neither PYTHON model prints a diff, but `adopt.js` does (`lineDiff()`,
`printLineDiff()`), so copy it from there if you took the AST branch. Otherwise
**write `preview()` yourself** with `difflib.unified_diff(...)`. Bean is QC-only; the diff is
the only artefact he can inspect, and a per-file count is not one.

### The parts you write

| Part | Depends on |
|---|---|
| `OLD`, `NEW`, `PAT` | the specific rename or transform |
| `EXCLUDE` | a `set` of `(relpath, identifier)` tuples, **each with a written reason** |
| `classify(line, relpath)` | returns one of **five**: `call`, `definition`, `excluded`, `comment`, `unrecognised` |
| `transform(text, relpath)` | the rewrite (Step 5). A pure function of the text, **and idempotent** |
| **`crosscheck(state)`** | **the whole-corpus stage `transform()` cannot be.** Runs after the scan, sees every file at once, returns a list of failures. `--check` gates on it. This is where a cross-file precondition, a count that must hold across the set, or a justified-exception allowlist lives |
| `preview(old, new, relpath)` | the unified diff: not in the model, write it |
| **Atomic write** | `path + '.tmp'` then `os.replace()`. **Never `open(path,'w')`**: see hazards |
| **stdout guard** | `sys.stdout.reconfigure(encoding='utf-8')` at import. A Windows console is cp1252, so one non-ASCII glyph kills a census partway through a list that already looks complete |
| `SELF_TEST_*` fixtures | Step 6 |

⚠ **Seven categories, two not from `classify()`:** **`bare-mention`** (the name appears but `PAT`
does not match; `transform()` assigns it) and **`comment-retained`** (a comment naming the OLD symbol
in a file that keeps a legitimate old-form site; needs a per-file pass). **`unrecognised` is
mandatory and non-fatal**: it is how the tool says it met something unanticipated instead of
silently skipping it.

## Step 5 — The transform is SHAPE-TO-SHAPE, not find-and-replace

⛔ **N/A when the detector already exists** (Step 4's box). More than that, this step MISLEADS at
scale: *"count your cases before concluding a change needs human judgement"* is right for a codemod
and wrong for a findings backlog. `21-render-without-control`'s findings each need an inspector
control DESIGNED for that block: design decisions, not one case with many hole-values. No
`transform()` can write them. Go to Step 7b. (D778.)

`transform()` is three things:

1. **RECOGNISE** the old shape structurally: by its parse, its mount, its call signature.
   Not by a string, which cannot tell a call from a comment.
2. **EXTRACT the holes**: what must survive unchanged (attribute names, prefixes, element
   keys, per-instance values).
3. **EMIT the new shape** with those holes re-inserted.

A migration feels judgement-heavy exactly when step 1 is done by grep. A grep sees text, so
every variation looks like a new decision. A recogniser sees a shape with holes, and the
variations collapse into one case.

> **The test: if two instances differ only in their hole values, they are ONE case, not two.**

⛔ **Apply the test across FILES, not just the one `transform()` sees.** `transform(text, relpath)`
cannot see a precondition living in another file. Adding a control to 17 `edit.js` files looks like
ONE case, but only some of their `render.php` call the shared helper, and the two that render the
property do it in incompatible shapes (object-typed vs scalar): three cases. **Put the check in
`crosscheck()`** (Step 4). The test cuts both ways: D632 found **six different shadow-control
shapes**, which is six cases, not one.

## Step 6 — Write the fixtures before the transform

Six minimum:

1. **Positive**: a real instance the tool must change.
2. **Definition**: the thing being migrated *to*, left alone. ⚠ **For a PURE RENAME the
   definition must CHANGE, not survive**: the model's fixture asserts the old definition
   is untouched, which is the supersede-and-keep-old shape. Decide which you are doing and
   write the fixture for it.
3. **Edge**: the legitimate exception (`SELF_TEST_UNITLESS`).
4. **Negative control**: a file with no instances, byte-identical afterwards
   (`SELF_TEST_INERT`). Without it you cannot tell a detector that found nothing
   from one that stopped working. **This repo has shipped both.**
5. **Idempotence**: `transform(transform(x)) == transform(x)`. Catches the bug that only
   appears the day you re-run, which is the day something went wrong.
6. **Corpus control: reconcile, do not band.** ⛔ A band checks `len(targets())` against a number
   the same agent chose, so narrowing the glob to the files you already edited passes by
   construction. **Derive a SECOND, dumb, wide enumeration** (walk the whole tree, prune only
   never-source directories, keep everything containing the old shape) and fail closed on anything
   in the wide list and not the narrow one, unless named in `WIDTH_OK` with a reason. The model
   does this with `broad_enumeration()` + `check_corpus_width()` inside `crosscheck()`. Run it on
   `--check`, not only `--self-test`: fixtures test `transform()`; nothing else tests that your
   target list is still populated.

⚠ Assert every `EXCLUDE` path still exists on disk. A stale exclusion is indistinguishable
from no exclusion.

## Step 7 — Survey, and read the whole census

```bash
python plugins/sgs-blocks/scripts/<your-script>.py --survey
python plugins/sgs-blocks/scripts/<your-script>.py --survey --json > reports/migrations/<name>-census.json
```

Read every category, not just the total. **Commit the JSON census in the landing commit**:
it is what makes the migration reviewable. A count printed to a terminal you closed is not
evidence.

⚠ **Split your refusals.** `unrecognised` in the model is a mixed bucket: some are "no rule
matched" (stop, extend the classifier) and some are deliberate, working refusals (odd quote
parity, `->`/`::` prefixes). Report those as **`refused`, with the rule that fired**, and
proceed. `adopt.js` already does this: every refusal carries a named reason and a fixture.

## Step 7b — TRIAGE the findings before you gate them

**Only when the detector already existed and reports a large backlog. Skip for a fresh codemod,
where every finding is one you defined.**

**Get the findings first. This detector is `node`, not `python`, and has no `--survey`:**

```bash
node plugins/sgs-blocks/scripts/inspector-scan/run.js --json > scan.json
# then filter to YOUR rule and to status === "FLAGGED" yourself: there is no per-rule flag,
# and the JSON carries BASELINED findings alongside FLAGGED (see Step 8).
```

⛔ **A finding is not a defect until you have said which of three things it is.** Skipping this is
how a backlog becomes permanent: nobody can act on a number they do not trust, so the rule stays
advisory forever and the count grows.

| Verdict | What it means | What you do |
|---|---|---|
| **REAL** | the defect is genuine | it enters the worklist and the ceiling |
| **DETECTOR BUG** | the rule is wrong, not the tree | ⛔ **fix the rule.** *"A false positive is a detector bug, never baseline fodder."* |
| **ARTEFACT** | true statically, not a real defect: a limit of static analysis | record the limit ON the rule, with the evidence that proves consumption |

⛔ **"Fix the rule" has ONE exception: a resolver SHARED across rules.** If the false positive
traces to shared machinery (e.g. `inspector-scan/core/components.js`), changing it silently
restages OTHER rules' committed ceilings. That is hand-back #9, not a fix you make alone.
Record the class on the rule and hand back.

⛔ **The ARTEFACT class is real and large, so do not skip it.** `34-declared-attr-unrendered`
reports a block's attr as unrendered whenever the render corpus reaches a shared include that reads
`$attributes[ $sgs_attr ]`, a computed key no static pass can resolve. Every composite routing
through `SGS_Container_Wrapper` lands here. Those attrs ARE consumed, cross-verified by
`check-dead-controls.js` reporting zero net-new dead controls across the same change.

⛔ **A false ABSENCE reads exactly like a clean result.** When a count comes in BELOW your
independent prediction, instrument the detector; do not accept the good news (rule 31's first run
undercounted because three blocks built their rows array by `.push()`, a separate const, or a
spread-of-conditional). **Declare the expected population BEFORE the first run, by a method
independent of the rule's own code** (`zeroIsAClaim` in `rules.json`).

⚠ **Diff findings on a CONTENT key, never a line-keyed one, but read one finding first.** Where a
raw key embeds a line number, an unrelated edit above a row reports it as net-new; normalise only
if the key really embeds one. `kind` is null on almost every rule, and on
`21-render-without-control` the raw key is already `rule|block|file|attr`, so normalising it
would collapse every finding on a block into one.

⭐ **The worked example is `plugins/sgs-blocks/scripts/inspector-scan/rules.json`**: its
`advisoryReason` fields record every ceiling movement with its composition enumerated, not
inferred. Read rule 31's before running your own backlog. (D778.)

---

## Step 8 — Wire the gate BEFORE you write

⛔ **Register the gate and commit it BEFORE `--apply`.** It will fail red until the
migration lands, and **that is the point**: a red gate is the only signal that tells the
*next* session a migration is half-applied. Wired afterwards, an interrupted apply is
undetectable, and with a non-coder owner who cannot read the diff, that state is permanent.

⛔ **RUN your `--check` and see what it returns TODAY before you register it.** A `--check` already
red for reasons beyond your migration (`migrate-tier-object.py --check` exits 1 while ANY property
remains flat) would fail every build on `main` for all five tracks: register a NARROWER mode that
gates only your change. A GUARD-shaped change is green from registration onward (D775): "red until
the migration lands" is a codemod property, not a universal one. ⚠ When the gate IS the change, it
cannot be committed before the code that implements it: register it before the COMMIT and prove it
fails before the commit.

### ⛔ THERE ARE THREE GATE SHAPES

Demanding a binary `--check` on a backlog that cannot reach 0 leaves "make the rule advisory"
as the only compliant move. (D778.)

| Shape | `--check` behaviour | Use when | In `inspector-scan` |
|---|---|---|---|
| **Binary** | 1 while any site remains, 0 when clean | a codemod you will finish in one pass | `mode: "gate"`; `run.js::computeExit` fails on ANY `FLAGGED` finding |
| **Guard** | 0 from registration; 1 only on divergence | it compares a derived copy to its source (D775) | n/a |
| **Ratcheted ceiling** | 1 when findings EXCEED the recorded ceiling | a real backlog too large to clear at once | `mode: "advisory"` plus a numeric `openBacklog`; `run.js::computeExit` fails when `flagged > openBacklog`, refuses advisory with no `openBacklog`, and `run.js::loadRulesTable` refuses a rule with no `advisoryReason` |

⛔ **An advisory rule DOES red the build**: it IS the ratcheted-ceiling shape, not an off switch.
Promoting a backlogged rule to `mode:"gate"` because you believed advisory was toothless reds the
pre-deploy gate for every track. The promotion criterion is Bean-locked in
`inspector-scan/rules.json` `_meta.note`; which rules are advisory, and their ceilings, live
there: query it, do not copy a count here.

⚠ **`mode` and `openBacklog` exist only in `inspector-scan/rules.json`.** A `plugins/sgs-blocks/scripts/gates.json`
record has seven fields and no mode: the runner reads only the exit code. A ratcheted ceiling registered
there keeps its ceiling INSIDE the script, as a sibling baseline that `--check` reads: fail on a site
outside it, and fail on an entry no longer reproduced so the baseline must shrink. Worked examples:
`scripts/check-enum-control-shape.py` + its `-baseline.json`, and `scripts/migrate-box-longhands.py` +
`migrate-box-longhands-baseline.json`.

**The ratchet:**

- The ceiling is **monotonic downward**; every lowering records its composition **enumerated, not inferred**.
- ⛔ **Raising it is permitted ONLY as a stated staleness correction, never to absorb new debt**, said
  in writing on the rule.
- ⛔ **A ceiling above the live count is SLACK, and slack means a brand-new violation lands green.**
  **Re-measure and lower after every drop.**
- ⛔ **Never promote a rule to gating on the run that introduces it**: its first live number is a
  measurement, not yet a trusted one.
- **Advisory is a STARTING state with an exit condition.** Write your rule's exit condition into its
  `advisoryReason`, and if it must stay advisory permanently, write THAT reason there too.

⚠ **Count only what the gate counts.** `inspector-scan`'s `--json` serialises BASELINED findings
alongside FLAGGED ones while the exit code filters to FLAGGED: a raw array length over-counts.

⛔ **If the detector is ALREADY registered, registration is DONE: skip to the ratchet above.**
Confirm with `npm run gate:list` (never by grepping `package.json`); a cold agent following this
step literally adds a duplicate `gates.json` record and a duplicate alias.

Add a record to `plugins/sgs-blocks/scripts/gates.json`, **all seven fields**:

```json
{
  "id": "<your-script>",
  "cmd": "python scripts/<your-script>.py --check",
  "tier": "fast",
  "added_D": "D<n>",
  "added_commit": null,
  "budget_ms": null,
  "order": <max existing order + 1>
}
```

Then the standalone alias in `package.json`, so it is runnable by hand:

```
"check:<name>": "python scripts/<your-script>.py --check"
```

(`gates.json` = what runs automatically; the alias = so you can run it yourself.)

⚠ `added_commit` is `null` at registration: the landing sha does not exist yet.
`order` = `max(existing) + 1`, derived from `npm run gate:list`, never copied.

**Tiers.** `generator` runs in `prebuild` and is not a gate. `fast` runs on every build.
`full` runs pre-deploy via `build-deploy.py`'s `step_gate_full()`. **Pick by measuring**:
`python scripts/run-gates.py --time`. Only `python` and `node` are launchable.
⛔ **If you put anything in `full`, run `npm run gate:wired`.** A gate parked in a tier
nothing runs is enforcement laundering, and that check fails closed if the deploy-side
call ever disappears.

⛔ **A migration is not finished until its `--check` runs automatically.** **Run
`npm run gate:list` to confirm it does**: grepping `package.json` returns a FALSE
POSITIVE, because every gate kept a standalone alias there.

## Step 9 — Snapshot, dry run, then apply

```bash
git status --porcelain -- <the paths your survey listed>   # must be empty
git rev-parse HEAD                                          # record it
python plugins/sgs-blocks/scripts/<your-script>.py --fix    # diff only
python plugins/sgs-blocks/scripts/<your-script>.py --fix --apply
git diff --stat
```

⛔ **`--survey` must report `unrecognised: 0` BEFORE you apply, and nothing enforces it.**
The model writes every file inside its scan loop and only then prints `REFUSING to guess` and
returns 1. **A non-zero exit from `--apply` does NOT mean the tree is untouched.** Confirm the
zero with your own eyes first.

⛔ **If `git status` shows work in your paths you did not write, STOP** (hand-back #2). Both
the apply and its rollback would destroy it.

⛔ **`git checkout -- <paths>` is NOT a safe undo here**: it reverts to HEAD, discarding concurrent
uncommitted work. Undo with `git checkout <recorded-sha> -- <your paths>`, scoped. **Never a bare
`git checkout .`**: it takes four other tracks with it.

⚠ **Read `git diff --stat`.** Each file should show a small, roughly symmetric +/- count and the file
count should equal your census. **A file whose deletions equal its whole length was truncated**
(see hazards).

⚠ **If the survey counts moved between your dry run and your apply, another track moved your
targets.** Re-survey; do not apply.

## Step 9b — A codemod's own `--check` is necessary, not sufficient

**"Done" for a schema fold is a green FULL build/gate chain, never the codemod's own `--check`
alone**: an exact-shape matcher cannot see dead destructured names left in `edit.js`, a second
differently-shaped control for the same attribute family, or a variable used before assignment in
`render.php` (only PHPStan catches that).

- **Re-grep the WHOLE codebase for the old attribute names after every codemod run.**
- **Run the real build (`npm run build`, PHPStan included) before calling any block.json schema
  fold done.**
- **Never trust a hand-written regex reformat pass without re-reading `git diff`.**

## Step 10 — Prove the gate can fail

```bash
python plugins/sgs-blocks/scripts/<your-script>.py --self-test   # must exit 0
python plugins/sgs-blocks/scripts/<your-script>.py --check       # must exit 0 now
```

Then break one instance on purpose and run `--check` again. It must exit 1. **A gate you
have never seen fail is not a gate.**

⛔ **Restore by re-running `--fix --apply`, not by `git checkout`** (Step 9). **Then run
`--check` once more and require exit 0.** Do not commit until you have seen that second
zero: a deliberate break left in the tree is indistinguishable from a missed instance.

⚠ **After rebasing or merging `main`, re-run `--survey` AND `--check`.** A concurrent track
can add an instance of the shape you just eliminated, and your gate will then fail on their
commit.

## Step 11 — Deploy and LOOK. The gate is not the proof.

```bash
git status --porcelain                       # nothing of yours outstanding
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
```

⚠ **No rendered surface (developer tooling): this step is N/A; say so and substitute
provably-identical behaviour**: diff the tool's own output against a baseline recovered with
`git show <recorded-sha>:`. (D775.) ⚠ **A findings backlog has no `classify()` categories:** sample by
the MECHANISM that fixes the finding, one live check per mechanism touched (D778), derived from the
finding `key`'s tail, not its `kind` field (non-null on only one rule, `31-golden-colour-control`).

Then open a real page rendering an affected block and check the changed property's computed
value, **at least one instance per `classify()` category**, not one page.

⛔ **A green `--check` proves no instance was MISSED. It proves nothing about whether the
transform was RIGHT.** Closing on a green gate violates `CLAUDE.md` Rule 5. This method does
not replace Rule 5 or R-31-13.

⛔ **If the deploy aborts with `deployed-files-dirty`, do NOT reach for `--allow-dirty`**:
that flag was D336's trigger, a ~2.5-hour two-client-site outage, and the abort message
offers it without that context. Commit your paths, or declare `--payload <path>`. **If the
uncovered list names files you did not write, stop and hand back.**

---

# Known hazards, each earned

- **Never `open(path,'w')`: write atomically.** All three models truncate on open
  (`migrate-length-sanitiser.py`, `migrate-render-closures.py`, `migrate-tier-object.py`).
  This is the one place you must improve on them: **a truncated file passes `--check` GREEN**,
  because the scan skips files not containing the old symbol and an empty file does not
  contain it.
- **Scope the glob off `__file__`, never the repo root.** A repo-root `**/render.php` sweep hits more
  files in `.claude/worktrees/` (another live track's) and gate fixtures than real ones. Exclude
  `.claude/worktrees/`, `node_modules/`, `build/`, `vendor/`, `scripts/**/fixtures/`.
- **Read AND write with `newline=''`, never `errors='ignore'`.** Without `newline=''` on the
  read, Python translates CRLF to `\n`; writing back rewrites every line ending and your
  3-line change becomes an unreviewable whole-file diff. The tell: changed-line count equals
  file length. `migrate-length-sanitiser.py` is correct; `migrate-render-closures.py` is the bug.
- **A JSON round-trip silently reformats the whole file.** Same tell (changed-line count ≈ file
  length), different cause: `json.load` then `json.dump(indent=2)` on a TAB-indented file
  (`package.json`) rewrites every line. Insert into the TEXT, or match the file's existing indent.
- **Aligned assignment breaks literal find-and-replace.** `$sgs_css_keyword  = static
  function` with two spaces: a literal replace skips it silently.
- **`} else {` is brace-neutral.** Depth-counting sails past it to the wrong closing brace.
  Detect the close structurally, and refuse rather than guess.
- **A function call can precede the require that DEFINES it: valid syntax, fatal at runtime (D976).** `php -l` cannot catch it. When a codemod inserts a call to a shared helper, require the defining file inline at the insertion point, or verify by LINE NUMBER that the existing require precedes it; copy `check_load_order()` from `check-render-tier-object-spacing.py`.
- **A comment naming a function or attribute reads as a real reference to a naive regex.**
  **Strip `/* */` and `//` comments (preserving newlines, so line numbers stay correct) BEFORE any
  line-based or regex-based detector**, in a permanent guard's scan as well as a codemod's `classify()`.
- **A per-line quote check cannot see a multi-line string.** A PHP heredoc/nowdoc body or a
  JS template literal spanning lines classifies as `call` and gets silently rewritten. Strip
  those bodies before classifying, or refuse any file containing one.
- **Do not copy `migrate-tier-object.py`'s hand-rolled `self_test`** (about 29% of the file).
  Use the fixture pattern from `migrate-length-sanitiser.py`.
- **Where a genuine judgement call remains, the detector still ships.** Its census becomes
  the dispatch manifest: one batched pass over a classified list, never a discovery walk.
- **Never run `phpcbf`** to fix alignment. It reformats whole files and turns a scoped change
  into an unreviewable diff. Realign by hand, or leave a blank line.
- **A census that OVER-promises costs a whole task; one that under-counts costs a
  re-measure.** Bias every classifier conservative.
- **Derive every figure by enumeration and re-run the command; never copy a number from this
  document.** A census count written in prose is a copy that rots.

---

# The thesis, in one line

**A census relocates the corrections from the TREE into the DETECTOR**: one commit
fixes hundreds of sites instead of one commit per block. But a census answers *how
many, where, and which are exempt*; it cannot answer *what shape is right*. That is
Step 3.

Full derivation and the day-2 census evidence:
[`reports/2026-08-24-migration-method-evidence.md`](reports/2026-08-24-migration-method-evidence.md).
