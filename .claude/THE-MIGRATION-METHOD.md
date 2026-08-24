---
doc_type: guide
title: The migration method — detector first, always
date: 2026-08-24
status: BINDING
applies_to: any change touching more than 3 blocks, attributes, files or call sites
---

# The migration method

**Read this before editing the 4th file in any repeating change.**

## Why this exists

Two migrations, same repo, same week:

| Work | Scope | Elapsed |
|---|---|---|
| `migrate-length-sanitiser.py` | 204 call sites, 56 files | **1 day** |
| `migrate-render-closures.py` | 100 closures, 49 blocks | **1 day** |
| `remove-vacuous-style-engine-guard.py` | 109 guards | **1 day** |
| Colour panel rollout | 33 blocks | **13 days, 25 correction commits** |

The fast three each built a detector first. The slow one edited block by block and
discovered the rule while editing, which cost seven correction decisions (D609, D618,
D621, D622, D632, D633, D634).

Nothing about the tooling differed. Only the method did.

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

`block_attributes` holds 3,166 rows. It answers "which blocks declare X" in one query.

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, attr_name FROM block_attributes WHERE attr_name LIKE '%Tablet'"
```

⚠ **Every current `migrate-*.py` re-globs `block.json` instead. Do not copy that.** It is
the reason each migration re-derives knowledge the DB already holds.

## Step 3 — Copy the skeleton

Model file, verified and complete: **`plugins/sgs-blocks/scripts/migrate-length-sanitiser.py`**
(318 lines). Second model: **`migrate-render-closures.py`** (248 lines). They share one
shape.

### The skeleton — copy verbatim, change nothing

| Part | Where in the model | What it does |
|---|---|---|
| `ROOT` | `:53` | Repo-root path constant |
| `targets()` | `:77` | Yields every file in the corpus |
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

Add to `plugins/sgs-blocks/package.json`:

```
"check:<name>": "python scripts/<your-script>.py --check"
```

and into the `prebuild` chain if it must gate every build.

⛔ **A migration is not finished until its `--check` runs automatically.** This repo holds
28 scripts that were built, work, and were never wired — including a mandatory go-live
gate nobody runs. One gate sat unwired for three weeks while three separate documents
stated it was enforced. **Grep `package.json` before believing any gate runs.**

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

# The one-line test

Before editing the 4th file, answer this:

> **Can something other than me list every instance and its reason?**

If no, stop and build the detector. That is the entire method.
