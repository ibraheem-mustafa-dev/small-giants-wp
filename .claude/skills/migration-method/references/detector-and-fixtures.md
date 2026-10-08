# Detector and fixtures detail (Steps 4, 5, 6)

Loaded from SKILL.md. Contents: Step 4 (recogniser choice, anchoring, skeleton table, CLI contract, parts you write), Step 5 (shape-to-shape transform), Step 6 (fixtures).

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
clean PASS; use `.git` (a directory in the main checkout, a file in a worktree, so test with `exists()`, not `isdir`/`isfile`). ⚠ Scope the GLOB so it never descends into
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
