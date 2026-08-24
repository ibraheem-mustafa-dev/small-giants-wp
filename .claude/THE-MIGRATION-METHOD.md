---
doc_type: guide
title: The migration method — detector first, always
date: 2026-08-24
status: PROVISIONAL-UNTIL-EXERCISED
closes_when: "one real migration has been run start-to-finish through Steps 1-9 with every
  ambiguity, error and silence recorded — then re-councilled on that evidence"
applies_to: any change touching more than 3 blocks, attributes, files or call sites
---

# The migration method

**Read this before editing the 4th file in any repeating change.**

⚠ **STATUS: PROVISIONAL. The detector-first RULE is settled and non-negotiable. The
9-step process and the skeleton are NOT yet proven — this document has been reviewed six
ways and USED ZERO TIMES.** Six adversarial personas graded it D+ / D / C− / C+ / B− and
twelve defects were fixed; a seventh reading is not what hardens it. It closes when one
real migration has been run through it end to end with the failures recorded.

**If you are that session: follow it literally, and log every point where you had to
guess, open another file, or do something it does not describe. Those notes are the
deliverable, not a side effect.**

## Why this exists

⛔ **THE ELAPSED FIGURES THIS DOCUMENT ORIGINALLY QUOTED WERE UNSOUND. They are
withdrawn.** They said three migrations took "1 day" each — a figure read off a COMMIT
DATE, which is the exact inference this method forbids. Worse, the comparison was
rigged without meaning to be: `sgs_css_length_value`, the function
`migrate-length-sanitiser.py` migrates *to*, was authored 2026-08-02 — **19 days before**
the migration that "took one day" on 2026-08-21. The fast number excluded its
prerequisite work; the slow number included all of its. Numerator and denominator were
not the same measurement.

**What git actually supports, and it is enough:**

| Work | Scope | Correction commits |
|---|---|---|
| `migrate-length-sanitiser.py` | 204 call sites, 56 files | **1 landing commit, 0 corrections** |
| `migrate-render-closures.py` | 100 closures, 49 blocks | **1 landing commit, 0 corrections** |
| Colour panel rollout | 33 blocks | **23 correction commits of 71**, across 10 working days (2026-08-14 → 08-24) |

The claim that survives is not about days. It is about **corrections**: a census-driven
pass lands once; a discovery walk lands twenty-five times. That is the whole argument and
it needs no defending.

⚠ **A THIRD unsupported figure was caught by review and corrected here.** This table 
originally said "13 days, 25 corrections" and cited seven D-numbers as the evidence. 
Those D-numbers span 2026-08-14 → 08-16 — **three days**. The figures above are now 
DERIVED by enumeration: `git log --grep="SgsColourPanel\|colour-panel" ` returns 71 
commits across 10 distinct days, 23 of which are fixes. Re-run it; do not trust this 
sentence.

⚠ **Never quote a commit date or a D-number as an elapsed cost.** Both record when work
LANDED, not the sessions spent building the scanner and getting it wrong first. This
document made that error and is the reason the rule is stated here.

The two fast migrations built a detector first. The slow one edited block by block and
discovered the rule while editing. Nothing about the tooling differed — only the method.

⚠ **The slow track is not a clean counter-example, and the real lesson is better than the
tidy one.** `colour-codemod/` contains `survey.js`, `adopt.js` and `fix.js`, and its first
commits read *"the census that decides whether this is one script or fifteen agents"*.
It DID adopt this method — on day 11. The detector was available the whole time and was
reached for last.

## The rule

> **If a change touches more than 3 blocks, files or call sites, the first deliverable
> is the detector — not the edit.**

You have finished the detector when it can answer, without you reading any file:

1. How many instances exist?
2. Where is each one?
3. Which are genuine targets, and which are exempt and why?

Until it answers all three, do not edit anything.

## How to tell which path you are on

Watch your own commit messages. They tell you before the cost lands.

- **Fast path:** one commit naming a count — *"204 call sites migrated"*, *"100 closures
  across 49 blocks"*.
- **Slow path:** commits naming instances — *"mount SgsColourPanel on accordion, audio,
  before-after, brand-strip"*.

The moment you write a commit that lists blocks individually, you skipped the detector.

---

# The process, start to end

## Step 1 — Check the tool already exists

Grep the SUBJECT, never the verb. The same idea ships in this repo as `census-*`,
`survey-*`, `audit-*`, `check-*`, `scan-*`, `probe-*` and `report-*`.

```bash
python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py --check
grep -n "<subject>" .claude/dev-setup.md
```

Rebuilding a tool that exists is this repo's recorded failure mode. Five script
directories exist; searching one and concluding nothing exists is how it happens.

## Step 2 — Ask the database before you walk the disk

`block_attributes` answers "which blocks declare X" in one query. ⚠ **Do not cache its row count here or anywhere** — `CLAUDE.md` forbids it and a cached snapshot already drifted 6-of-9. Query it every time.

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, attr_name FROM block_attributes WHERE attr_name LIKE '%Tablet'"
```

⚠ **Every current `migrate-*.py` re-globs `block.json` instead. Do not copy that.** It is
the reason each migration re-derives knowledge the DB already holds.

## Step 3 — Copy the skeleton

⛔ **STOP. If your change is "flat `*Tablet`/`*Mobile` attrs → one object", THE TOOL
ALREADY EXISTS.** `plugins/sgs-blocks/scripts/migrate-tier-object.py` implements exactly
this, with the full `--property / --survey / --fix / --apply / --check / --self-test`
contract. Run `--property <name> --survey` and stop reading this step. The criticism of its
`self_test` further down is guidance for writing a NEW script — **it is not a reason to
avoid this one.** Rebuilding it is the failure this document exists to prevent.

Model file, verified and complete: **`plugins/sgs-blocks/scripts/migrate-length-sanitiser.py`**
(318 lines). Second model: **`migrate-render-closures.py`** (248 lines). They share one
shape.

### The skeleton — copy the SHAPE, with one exception marked ⛔ below

⚠ **If a line number below does not land on the named construct, the model has moved.**
Re-derive with `grep -n '^def \|^SELF_TEST\|^EXCLUDE' 
plugins/sgs-blocks/scripts/migrate-length-sanitiser.py` and trust that, not this table. 
The symbol names are stable; the numbers are a convenience and will rot.

| Part | Where in the model | What it does |
|---|---|---|
| `ROOT` | `:53` | Repo-root path constant |
| ⛔ `targets()` | `:77` | **DO NOT COPY — this is the disk walk Step 2 tells you to replace.** Query `block_attributes` instead. It is listed here so you recognise it, not so you reuse it. |
| `rel(path)` | `:83` | Repo-relative path for reporting |
| `scan(apply_changes, dry, quiet)` | `:136` | The driver. Walks targets, classifies, tallies, optionally writes |
| `self_test()` | `:190` | Runs the fixtures, returns a list of failures |
| `main()` | `:266` | The CLI contract below |

### The CLI contract — copy verbatim

```
--survey      census only, no writes
--fix         dry run, prints the diff
--fix --apply writes
--check       gate: exit 1 if any migratable site remains
--self-test   exit 1 if any assertion fails
```

`--check` must exit **1** on remaining work and **0** when clean. That single property is
what turns a finished migration into a permanent regression guard.

### The parts you write — these are the whole job

| Part | Model line | What it depends on |
|---|---|---|
| Target constants (`OLD`, `NEW`, `PAT`) | `:54-56` | The specific rename or transform |
| `EXCLUDE` | `:68` | A `set` of `(relpath, identifier)` tuples, **each with a comment giving the reason** |
| `classify(line, relpath)` | `:87` | Returns a category string per hit. Categories must cover every case: `call`, `definition`, `excluded`, `comment`, `bare-mention`, `unrecognised` |
| `transform(text, relpath)` | `:111` | The rewrite. Must be a pure function of the text |
| `SELF_TEST_*` fixtures | `:166-187` | String constants: one per category, plus at least one that must NOT change |

**`unrecognised` is mandatory and must be non-fatal.** It is how the tool tells you it met
something you did not anticipate, instead of silently skipping it.

## Step 3b — The transform is SHAPE-TO-SHAPE, not find-and-replace

**This is the step that decides whether a migration is mechanical or takes a fortnight.**

A reviewer of this document argued that some changes are "not mechanically transformable"
— that the colour rollout went block-by-block because its 33 cases needed human judgement.
**That is wrong, and the decision log disproves it.** Bean's correction, and it is the
governing one:

> The inability to do the mechanical fix is a limitation of the auditing script. It should
> recognise the SHAPE that needs replacing, keep the parts that must survive — the
> attribute name, the prefix, the element key — and re-insert them into the new shape.

Look at what the colour rollout's corrections actually were:

| | |
|---|---|
| D609 | ONE colour control everywhere, states inside it, never optional |
| D618 | Must NOT mount into native's `group="color"` — own PanelBody instead |
| D621 | The panel belongs in the STYLES tab |
| D622 | Placement follows the existing D533/D537 resolver |
| D632 | Colour split from `ShadowControl` **across 11 blocks** |

**Not one is a per-block judgement call.** Every one is a single decision about the TARGET
SHAPE that then applies identically to all 33 blocks. They surfaced one at a time only
because the work was done one block at a time — each block taught the next what the shape
should have been. Had the shape been settled once, from the census, all 33 were mechanical.

### What this means for `transform()`

`transform()` is **not** string replacement. It is three things:

1. **RECOGNISE** the old shape structurally — by its parse, its mount, its call signature.
   Not by a string, which cannot tell a call from a comment.
2. **EXTRACT the holes** — the parts that must survive unchanged: attribute names,
   prefixes, element keys, selector fragments, any per-instance value.
3. **EMIT the new shape** with those holes re-inserted.

A migration feels judgement-heavy exactly when step 1 is done by grep. A grep sees text, so
every variation looks like a new decision. A recogniser sees a shape with holes in it, and
the variations collapse into one case.

### The test

> **If two instances differ only in their hole values, they are ONE case, not two.**

Count your cases that way before concluding a change needs human judgement. The colour
rollout had one case and 33 instances. It was treated as 33 cases.

⚠ **Where a genuine judgement call remains, the detector still ships.** Its census becomes
the dispatch manifest — one batched pass over a classified list, never a discovery walk.

---

## Step 4 — Write the fixtures before the transform

Four fixtures minimum, all present in the model at `:166-187`:

1. **Positive** — a real instance the tool must change.
2. **Definition** — the thing being migrated *to*, which must be left alone.
3. **Edge** — the legitimate exception (`SELF_TEST_UNITLESS` at `:181`).
4. **Negative control** — a file with no instances, which must come back byte-identical
   (`SELF_TEST_INERT` at `:187`).

Without the negative control you cannot tell a detector that found nothing from a detector
that stopped working. This repo has shipped both.

## Step 5 — Survey, and read the whole census

```bash
python plugins/sgs-blocks/scripts/<your-script>.py --survey
```

Read every category, not just the total. An `unrecognised` count above zero means your
classifier is incomplete — fix it before proceeding. A census that cannot distinguish done
from not-done is not a census.

## Step 6 — Dry run, then apply

```bash
python plugins/sgs-blocks/scripts/<your-script>.py --fix          # diff only
python plugins/sgs-blocks/scripts/<your-script>.py --fix --apply  # writes
```

## Step 7 — Prove the gate can fail

```bash
python plugins/sgs-blocks/scripts/<your-script>.py --self-test    # must exit 0
python plugins/sgs-blocks/scripts/<your-script>.py --check        # must exit 0 now
```

Then break one instance on purpose and run `--check` again. It must exit 1. A gate you have
never seen fail is not a gate.

## Step 8 — Wire it, in the same commit

⚠ **The gate chain moved out of `package.json` on 2026-08-24.** It was 61 `&&`-joined
commands in one 3,353-character string that could not be diffed, blamed per gate, or
reordered. The roster is now **`plugins/sgs-blocks/scripts/gates.json`** — one record per
gate — run by `scripts/run-gates.py`, which executes EVERY gate and reports ALL failures
instead of stopping at the first.

Add your gate as a record:

```json
{
  "id": "<your-script>",
  "cmd": "python scripts/<your-script>.py --check",
  "tier": "fast",
  "added_D": "D<n>",
  "budget_ms": null
}
```

Then add the standalone alias to `package.json` so it is runnable by hand:

```
"check:<name>": "python scripts/<your-script>.py --check"
```

**Pick the tier by MEASURING, never by guessing.** Run
`python scripts/run-gates.py --time` and read your gate's real cost:

- `fast` — the default. Runs on every build via `prebuild`.
- `full` — only if it is genuinely heavyweight. Runs pre-deploy via
  `build-deploy.py`'s `step_gate_full()`. As of the split, `full` holds exactly four
  gates that were **76.1% of the chain's measured time**.

⛔ **`full` is not "weaker" and it is not a parking space.** A gate parked in a tier that
nothing runs is enforcement laundering. `python scripts/run-gates.py --assert-wired`
fails closed if the deploy-side call ever disappears — run it if you touch the tiering.

⛔ **A migration is not finished until its `--check` runs automatically.** This repo holds
**27** scripts that were built, work, and were never wired — including a mandatory go-live
gate nobody runs. One gate sat unwired for three weeks while three separate documents
stated it was enforced. **Check `gates.json` AND `package.json` before believing any gate
runs** — and prefer `npm run gate:list`, which prints the roster with each gate's tier and
measured cost.

---

# What to copy, and what not to

## Copy from the models

- The skeleton table above, verbatim.
- The CLI contract, verbatim.
- The fixture pattern, including the negative control.
- `EXCLUDE` as a set of tuples with a written reason per entry.

## Do NOT copy from the models

- **Their disk-walking.** Both re-glob `block.json`. Query `block_attributes` instead.
- **`migrate-tier-object.py`'s 457-line hand-rolled `self_test`** (`:957-1413`, 29% of the
  file). Use the fixture pattern from `migrate-length-sanitiser.py:190` instead.
- **`migrate-theme-attr-rename.py` and `migrate-theme-tier-scalars.py`'s duplicated
  helpers.** Their `find_target_files()` at `:83-89` is byte-identical in both files. If
  you need those helpers, extract them once.

## Known hazards, each earned

- **Aligned assignment breaks literal find-and-replace.** Several files use
  `$sgs_css_keyword  = static function` with two spaces. A literal replace skips them
  silently — which is why one closure count read 45 before it read 52.
- **`} else {` is brace-neutral.** Depth-counting sails past it to the wrong closing brace.
  Detect the close structurally, and refuse rather than guess.
- **Never run `phpcbf`** to fix alignment. It reformats whole files and turns a scoped
  change into an unreviewable diff. Realign by hand, or leave a blank line.
- **WordPress silently discards an undeclared attribute** on the editor surface. A
  transform that writes an attr the block.json does not declare produces no error and no
  effect.

---

## Step 9 — Deploy and LOOK at it. The gate is not the proof.

```bash
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
```

Then open a real page rendering an affected block and check the changed property's
computed value.

⛔ **A green `--check` proves no instance was MISSED. It proves nothing about whether the
transform was RIGHT.** Following Steps 1-8 and closing the task on a green gate is a
violation of `CLAUDE.md` Rule 5 (VERIFY ON THE REAL HOMEPAGE) produced BY compliance with
this document. This method does not replace Rule 5 or R-31-13 (Bean's eye is
co-authoritative). Neither is optional.

---

# The one-line test

Before editing the 4th file, answer this:

> **Can something other than me list every instance and its reason?**

If no, stop and build the detector. That is the entire method.
