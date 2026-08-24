---
doc_type: guide
title: The migration method — settle the shape, then build the detector
date: 2026-08-24
status: PROVISIONAL-BUT-EXERCISED
closes_when: "one real migration has been APPLIED through Steps 1-11 and re-graded. The two
  round-3 objections (bare-mention outside the gate; no cross-file stage) are CLOSED in the
  model by crosscheck(). Rounds 2-3 exercised the method read-only only."
applies_to: any change touching more than 3 blocks, attributes, files or call sites
grading: .claude/rubrics/migration-method-grading.md
---

# The migration method

**Read this before editing the 4th file in any repeating change.**

## Do this now

```bash
ls plugins/sgs-blocks/scripts/*migrate*        # is your migration already written?
python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py --check
```

1. **Flat `*Tablet`/`*Mobile` attrs → one object?** The tool exists. Run
   `python plugins/sgs-blocks/scripts/migrate-tier-object.py --property <name> --survey`,
   then read Step 2's ⛔ box for the three things `--survey` will not tell you. Stop here.
2. **Does your change alter anything a client SEES?** Do **Step 3 first**, then come back to
   Step 1 and continue in order. Step 3 is a precondition, not a replacement — Step 1 is
   where you find the tool that may already exist. Settling the shape before censusing is
   what decides whether the change costs a day or a fortnight.
3. **Otherwise** — a rename, a call-site swap, a helper adoption — start at Step 1.

**STATUS — read this once, then get on with it.** The **rule below is locked and
mandatory**. The 11 steps are `PROVISIONAL-BUT-EXERCISED`: three adversarial rounds,
fifteen personas, and two cold agents who FOLLOWED it end to end on real tasks. Their
fixes are in. Follow it, and **log every point where you had to guess, open a file this
doc does not name, or do something it does not describe** — that log is what closes it.

⛔ **THE OBJECTION ROUND 3 RAISED — now CLOSED in the model, not just written down.**
All three personas converged on one thing: **`--check` could not see everything that
mattered.** `bare-mention` sat outside the pass/fail condition, and `transform()` is a
pure function of ONE file so no cross-file precondition could ever reach a gate. Both
are fixed by **`crosscheck()`** (Step 4) — a whole-corpus stage that runs after the scan
and that `--check` gates on. Proven to fail three ways: an unjustified bare mention, a
changed count in a justified file, and a stale allowlist entry.

⚠ **Step 11 is still not optional.** `crosscheck()` widens what the gate can see; it does
not make a green gate proof that the transform was RIGHT.

---

## The rule

> **If a change touches more than 3 blocks, files or call sites, the first deliverable is
> the detector — not the edit.**
>
> **And if the change is client-visible, the first deliverable before THAT is the settled
> target shape** (Step 3).

Bean-locked at **D542**, and applied independently at `decisions.md:1381` and `:2002`.

You have finished the detector when it can answer, without you reading any file:

1. How many instances exist?
2. Where is each one?
3. Which are genuine targets, and which are exempt and why?

⛔ **A counting script is not a detector.** It is not done until it carries
`--survey / --fix / --check / --self-test` and is registered in `gates.json` (Steps 4-8).

⛔ **A census cannot answer a fourth question — "what should the new shape BE?"** That is
Step 3, it needs a rendered page and Bean's eye, and skipping it is what actually costs a
fortnight. See "Why this exists".

### What it costs, and what you are buying

At 4 instances the detector costs more than the edit. Measured floor: **131 lines**
(`migrate-overlay-tier-axis.py`); typical **242-362**. You are not buying the edit — you are
buying the `--check` gate that stops instance 5 arriving next month. **If the change
genuinely cannot regress, the threshold does not apply.**

### How to tell which path you are on

- **Fast path:** one commit naming a count — *"204 call sites migrated"*.
- **Slow path:** commits naming instances — *"mount X on accordion, audio, before-after"*.

The moment you write a commit that lists blocks individually, you skipped the detector.

⚠ **Unless this migration is a declared Spec 31 PHASE — then R-31-5 governs and you split
it** into the phase's agreed commit boundaries. "One commit" describes a standalone codemod,
not a phase deliverable.

---

## ⛔ When to STOP and hand back to Bean

Hand back — do not improvise, do not try one more thing — the moment any of these is true.
Say which one, and what state the tree is in.

1. **`--survey` reports `unrecognised > 0`** and you cannot classify the site from the file
   alone. The classifier is incomplete; guessing is how a migration corrupts.
2. **`git status` shows uncommitted work in your target paths that you did not write.**
   Another track is live in your blast radius. Five tracks share `main`.
3. **`--apply` exited non-zero, or was interrupted.** Report `git diff --stat` verbatim. Do
   not re-run and do not `git checkout` until Bean has seen it.
4. **`--check` will not return to 0** after Step 10's restore.
5. **The deploy aborts naming files you did not touch.**
6. **You are about to add a per-file special case to `transform()`.** By Step 5's test that
   means you miscounted your cases — re-census, do not patch.
7. **You need a flag whose help text says "NOT recommended"** — `--allow-dirty`,
   `--skip-verify`, `--skip-gate-full`. Those exist for Bean's judgement, not yours.
8. **Step 3 applies and Bean is not available.** A client-visible shape needs his eye
   (R-31-13) and you cannot proceed past Step 3 without it. Hand back with the census
   and the ONE instance built — that is the useful state to hand over, not nothing.
9. **The change touches a shared wrapper, the walker, or `converter/`.** Rule 7 requires a
   design gate and Bean's approval BEFORE building. This document does not override it.

---

# The process

## Step 1 — Check the tool already exists

Grep the SUBJECT, never the verb. The same idea ships here as `census-*`, `survey-*`,
`audit-*`, `check-*`, `scan-*`, `probe-*` and `report-*`.

```bash
ls plugins/sgs-blocks/scripts/*migrate*
python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py --check
grep -n "<subject>" .claude/dev-setup.md
```

⚠ **If you find a tool that covers your subject but lacks `--fix`/`--check`, EXTEND it —
do not rebuild it and do not abandon it.** `surveys/survey-typography-controls.py` is 906
lines of working, DB-backed census with no `--survey` flag and no fixer; by this document's
own ⛔ it is not a detector, but it is most of one. Adding the missing modes is hours;
rebuilding is the failure this step exists to prevent.

Rebuilding a tool that exists is this repo's recorded failure mode. Run
`find plugins/sgs-blocks/scripts -maxdepth 1 -type d` — there are dozens. Searching one and
concluding nothing exists is how it happens.

## Step 2 — Ask the database, but only for what it holds

`block_attributes` answers **"which blocks declare attribute X"** in one query.

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, attr_name FROM block_attributes WHERE attr_name LIKE '%Tablet'"
```

⛔ **The DB-first rule scopes to ATTRIBUTE migrations ONLY.** `block_attributes` has columns
for `block_slug` and `attr_name` and **no column for a file or a call site** — verified
against the schema. For a call-site, closure, helper or import migration it has nothing to
offer: **walk the disk.**

⛔ **`includes/*.php` and the other shared trees are IN SCOPE whichever you use.**
`block_attributes` is foreign-keyed to `blocks(slug)`, so a DB-derived list is block-scoped
and silently omits every shared include. **That omission is D575** — the `minHeight` survey
returned zero findings while the shared wrapper shipped `min-height:Array` to 73 live
declarations.

⛔ **`block_attributes` also cannot see WP-NATIVE `supports` controls** — and the client
sees those identically to a declared attr. So a DB-derived list for a client-visible
change silently omits every block that declares the capability through `supports`.

**Reconcile both sides yourself; do not trust a number written here.** Three readers of
this paragraph produced three different totals for `letterSpacing`, because a raw grep
counts comment-only mentions as declarations — the same bare-mention trap this document
names at Step 4, which it had not applied to its own worked example. **Parse each
`block.json` and classify per file: declared attr / `supports` flag / mention only.**

⚠ **A DB/disk count mismatch is a FINDING, not noise.** Reconcile it before applying: it is
usually a stale row or an unseeded block, and it means one of your two sources is lying.

⛔ **If you came here from `migrate-tier-object.py`, three things `--survey` will not tell
you:** (a) `UNCLEAR` render/edit states must be read BY HAND — the script says so itself;
(b) `--fix --apply` writes `block.json` and `edit.js` **only, never `render.php`**; (c)
`--check` does **not** gate on `render_state: RAW`, so a green gate does not mean the render
side is done. That gap is recorded at `migrate-tier-object.py:1484`; the includes-scope incident it belongs to is **D575**.

## Step 3 — Settle the SHAPE first, on ONE instance, with Bean

**Only for changes with a surface a client sees. Skip for renames and call-site swaps.**

Build **one** instance. Deploy it. Get Bean's eye on it (R-31-13). Write the settled shape
down as the transform's target **before you census anything**.

⛔ **If the target shape is ALREADY settled and recorded, Step 3 is satisfied — say so and
move on.** A repo standard that Bean has already locked (e.g. `plugins/sgs-blocks/CLAUDE.md`'s
`TypographyControls` + `sgs_typography_css_rule` rule, R-22-13) IS a settled shape; you do not
need a fresh build-deploy-eye cycle per attribute to re-confirm what he has already ruled.
**Cite the rule and the blocks already conforming to it, then continue.** Step 3 exists to stop
you inventing a shape mid-rollout — not to re-litigate a decided one.
⚠ If the standard exists but the blocks disagree about it in RENDER (as `text` and `heading`
do for `letterSpacing`), the shape is NOT settled — that disagreement is the thing to take to
Bean, and it is exactly what Step 5's cross-file test surfaces.

⚠ **Deploying ONE uncommitted instance trips the dirty gate.** `build-deploy.py`
deliberately does not skip `src/`, so it aborts with `deployed-files-dirty` and offers
`--allow-dirty` — the flag that caused D336. **Commit your one block first, or declare
`--payload <path>`.** Never `--allow-dirty`.

A shape decided against a rendered page costs one block. The same decision discovered on
block 9 costs nine. **This is also the Rule 7 design gate** — for a shared wrapper, the
walker or `converter/`, Bean's approval here is mandatory, not advisory.

**This step exists because the evidence demanded it.** The colour rollout DID census on
day 2 and still cost a fortnight — see "Why this exists". The census answered *how many*.
Nothing answered *what shape*, and three of its five corrections (D609, D618, D621) were
settled only by Bean looking at a rendered thing.

## Step 4 — Choose the recogniser, then copy the skeleton

**Pick the tool before you copy anything:**

- **Single-token, single-line target** (a function rename, a constant swap) → the line
  classifier in `migrate-length-sanitiser.py`. Right tool; its refusal rules are the point.
- **Multi-line shape** (a JSX mount, an object literal, a closure body — anything with
  `{...}`) → **an AST, not a regex.** The working in-repo model is
  `plugins/sgs-blocks/scripts/colour-codemod/adopt.js` — `@babel/parser` (already
  installed), and the same CLI contract at `:992-996`. It is itself **unwired** (absent
  from `gates.json`) — copy its shape, not its wiring.

⛔ **A line classifier applied to a multi-line shape is the commonest way a codemod
corrupts 5% of its targets silently.**

### ⛔ Anchoring: ONE decision, and this document used to give three answers

`ROOT` is where your corpus comes from, so getting it wrong silently empties or explodes
your census. There is one rule with two cases:

| Your script lives... | Anchor on | Why |
|---|---|---|
| **inside the repo** (the normal case) | `__file__`, walking up | Deterministic regardless of the caller's cwd |
| **anywhere else** (a scratch dir, a temp harness) | a **repo-UNIQUE marker file** | Walking up from `__file__` never reaches the repo |

⛔ **`CLAUDE.md` is NOT a repo-unique marker.** `plugins/sgs-blocks/` has its own. A gate
anchored on it, invoked from that directory, silently scanned **4 files instead of 380** and
printed a clean PASS. Use something that exists once — `.claude/THE-MIGRATION-METHOD.md`.

⚠ Separately from the anchor: **scope the GLOB** so it never descends into
`.claude/worktrees/`, `node_modules/`, `build/`, `vendor/` or `scripts/**/fixtures/` — and
prune during the walk, not after. See hazards.

### The skeleton — `migrate-length-sanitiser.py` ALONE

⚠ **`migrate-render-closures.py` is a worked EXAMPLE, not a second skeleton.** Verified: it
has no `classify()`, no `EXCLUDE`, no `rel()`, no `unrecognised` category and two fixtures —
so it fails this document's own mandatory rules below. Read it for `defs_in()` and the
aligned-assignment hazard only.

⚠ **If a line number does not land on the named construct, the model has moved.** Re-derive
with `grep -n '^def \|^SELF_TEST\|^EXCLUDE' plugins/sgs-blocks/scripts/migrate-length-sanitiser.py`.

| Part | Where | What it does |
|---|---|---|
| `ROOT` | `:53` | Repo-root path constant. **Anchoring is a THREE-WAY decision — read the box below before you copy it** |
| `targets()` | `:77` | The target list. **Copy this for a call-site migration** — the DB cannot produce one (Step 2) |
| `BARE_OK` | `:91` | Every surviving bare mention, pinned by per-file count, each with a written reason |
| `crosscheck()` | `:109` | The whole-corpus stage. `--check` gates on what it returns |
| `rel(path)` | `:143` | Repo-relative path for reporting |
| `scan(...)` | `:196` | The driver: walks targets, classifies, tallies, optionally writes |
| `self_test()` | `:261` | Runs the fixtures, returns failures |
| `main()` | `:337` | The CLI contract below |

⚠ **These moved once already.** Adding `crosscheck()` shifted every symbol below it by
~55 lines and four of six citations here were wrong for two commits. Re-derive rather than
trust: `grep -n '^def \|^SELF_TEST\|^BARE_OK\|^ROOT' plugins/sgs-blocks/scripts/migrate-length-sanitiser.py`

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
WITHOUT a trailing `(`, so `PAT` never matches and `classify()` is never reached — the
transform cannot see it. That is not academic — two live shapes, both verified:

| Shape | Where | Why the name is load-bearing |
|---|---|---|
| dispatch string | `class-sgs-container-wrapper.php:3188`, `:3195` — `'transform' => 'sgs_colour_value'` | fired via `call_user_func()` at `helpers-responsive.php:105` / `:415` |
| `function_exists()` guard | e.g. `helpers-box.php:30` (for `sgs_css_length_sanitise`) | the string IS the identity; rename the function without it and the polyfill always defines, or never does |

⚠ **Those two rows are DIFFERENT FUNCTIONS.** An earlier draft of this table listed all
three sites as if they belonged to one rename — there is no `function_exists` guard for
`sgs_colour_value` anywhere in the repo. **Grep for your OWN symbol in both shapes; do not
inherit an example's site list.** The model pins every surviving bare mention in `BARE_OK`
with a per-file COUNT and a written reason; `crosscheck()` fails on an unjustified one, a
changed count, or a stale entry. `--survey` LISTS them — it used to only tally, which made
"resolve them by hand" an instruction you could not follow.

⛔ **`--check` must read the UNFILTERED target list.** Any `--only`/`--skip` filter must be
excluded from the `--check` path, or `--check --skip foo` exits 0 with `foo` unmigrated.
⛔ **`--check` must assert the ABSENCE of the old shape, not the presence of the new one.**
⚠ `--survey` is declared but never read in the model (`:268`) — it works only because the
no-flag default is a census. Branch it explicitly; that is a defect, not the pattern.
⚠ Neither PYTHON model prints a diff — but `adopt.js` does (`lineDiff():618`,
`printLineDiff():651`), so copy it from there if you took the AST branch. Otherwise
**write `preview()` yourself** —
`difflib.unified_diff(...)`. Bean is QC-only; the diff is the only artefact he can inspect,
and a per-file count is not one.

### The parts you write

| Part | Depends on |
|---|---|
| `OLD`, `NEW`, `PAT` | the specific rename or transform |
| `EXCLUDE` | a `set` of `(relpath, identifier)` tuples, **each with a written reason** |
| `classify(line, relpath)` | returns one of **five**: `call`, `definition`, `excluded`, `comment`, `unrecognised` |
| `transform(text, relpath)` | the rewrite (Step 5). A pure function of the text, **and idempotent** |
| **`crosscheck(state)`** | **the whole-corpus stage `transform()` cannot be.** Runs after the scan, sees every file at once, returns a list of failures. `--check` gates on it. This is where a cross-file precondition, a count that must hold across the set, or a justified-exception allowlist lives |
| `preview(old, new, relpath)` | the unified diff — not in the model, write it |
| **Atomic write** | `path + '.tmp'` then `os.replace()`. **Never `open(path,'w')`** — see hazards |
| **stdout guard** | `sys.stdout.reconfigure(encoding='utf-8')` at import. A Windows console is cp1252, so a census printing one non-ASCII glyph dies partway — having already shown a partial list that looks complete |
| `SELF_TEST_*` fixtures | Step 6 |

⚠ **Seven categories, not six, and two do not come from `classify()`:**
- **`bare-mention`** — the name appears but `PAT` does NOT match. `classify()` is never
  reached for these; `transform()` assigns it. Trying to return it from `classify()` writes
  an unreachable branch whose tally is always zero.
- **`comment-retained`** — a comment naming the OLD symbol *in a file that keeps a
  legitimate old-form site*. Renaming it would make the comment lie. Needs a per-file pass;
  per-line classification cannot see it.

**`unrecognised` is mandatory and must be non-fatal** — it is how the tool tells you it met
something you did not anticipate instead of silently skipping it.

## Step 5 — The transform is SHAPE-TO-SHAPE, not find-and-replace

`transform()` is three things:

1. **RECOGNISE** the old shape structurally — by its parse, its mount, its call signature.
   Not by a string, which cannot tell a call from a comment.
2. **EXTRACT the holes** — what must survive unchanged: attribute names, prefixes, element
   keys, per-instance values.
3. **EMIT the new shape** with those holes re-inserted.

A migration feels judgement-heavy exactly when step 1 is done by grep. A grep sees text, so
every variation looks like a new decision. A recogniser sees a shape with holes, and the
variations collapse into one case.

> **The test: if two instances differ only in their hole values, they are ONE case, not two.**

⛔ **Apply the test across FILES, not just the one `transform()` sees.** `transform(text,
relpath)` is a pure function of a single file, so it cannot see a precondition living
elsewhere — and `classify()`'s categories are all edit-surface, so Step 11's
one-instance-per-category rule will not partition on it either. Worked example: adding a
control to 17 `edit.js` files looks like ONE case, but only **11** of their `render.php`
call the shared helper, and the two that render the property do it in two incompatible
shapes (`text/render.php:59` object-typed vs `heading/render.php:116` scalar). That is
three cases, and `transform()` cannot tell you.

**Put the check in `crosscheck()`** (Step 4) — it sees the whole target set at once, and
`--check` gates on what it returns. That is the only place in the skeleton where a
cross-file precondition can be enforced.

Count your cases that way before concluding a change needs human judgement.

**This test cuts both ways.** D632's survey found **six different shadow-control shapes**
across the framework — under this test that is six cases, not one. Applying the test
honestly is the point; using it to wish variation away is not.

## Step 6 — Write the fixtures before the transform

Five minimum:

1. **Positive** — a real instance the tool must change.
2. **Definition** — the thing being migrated *to*, left alone. ⚠ **For a PURE RENAME the
   definition must CHANGE, not survive** — the model's fixture asserts the old definition
   is untouched, which is the supersede-and-keep-old shape. Decide which you are doing and
   write the fixture for it; the model's is not the universal case.
3. **Edge** — the legitimate exception (`SELF_TEST_UNITLESS` at `:181`).
4. **Negative control** — a file with no instances, byte-identical afterwards
   (`SELF_TEST_INERT` at `:187`). Without it you cannot tell a detector that found nothing
   from one that stopped working. **This repo has shipped both.**
5. **Idempotence** — `transform(transform(x)) == transform(x)`. One line. Catches the class
   of bug that only appears the day you have to re-run, which is the day something went
   wrong.
6. **Corpus control — reconcile, do not band.** ⛔ **A band is self-satisfying**: it checks
   `len(targets())` against a number the same agent chose, so narrowing the glob to the
   files you already edited passes every gate by construction. **Derive a SECOND, dumb,
   wide enumeration** — walk the whole tree, prune only never-source directories, keep
   everything containing the old shape — and fail closed on anything in the wide list and
   not the narrow one, unless named in `WIDTH_OK` with a reason. Two lists derived two ways
   is the only check here that the author cannot satisfy by choosing a number. The model
   implements it as `broad_enumeration()` + `check_corpus_width()`, wired into
   `crosscheck()`; on its first real run it found a file the hand-written glob had missed.
   Also assert `len(targets())` is sane, and run all of it on `--check`, not only
   `--self-test`. Fixtures test `transform()`; nothing tests that
   your target list is still populated. **Earned twice in one hour:** a codemod written for
   this document passed 5/5 transform fixtures while its census found ZERO (its `ROOT`
   resolved outside the repo), then — moved in-tree — silently scanned **4 files instead of
   380** because its marker file was `CLAUDE.md`, which is not repo-unique. Both printed a
   clean PASS. **Anchor on a repo-UNIQUE marker.**

⚠ Assert every `EXCLUDE` path still exists on disk. A stale exclusion is indistinguishable
from no exclusion.

## Step 7 — Survey, and read the whole census

```bash
python plugins/sgs-blocks/scripts/<your-script>.py --survey
python plugins/sgs-blocks/scripts/<your-script>.py --survey --json > reports/migrations/<name>-census.json
```

Read every category, not just the total. **Commit the JSON census in the landing commit** —
it is what makes the migration reviewable. A count printed to a terminal you closed is not
evidence.

⚠ **Split your refusals.** `unrecognised` in the model is a mixed bucket: some are "no rule
matched" (stop, extend the classifier) and some are deliberate, working refusals — odd quote
parity, `->`/`::` prefixes. Report those as **`refused`, with the rule that fired**, and
proceed. `adopt.js` already does this — every refusal carries a named reason and every named
reason has a fixture reproducing it.

## Step 8 — Wire the gate BEFORE you write

⛔ **Register the gate and commit it BEFORE `--apply`.** It will fail red until the
migration lands, and **that is the point**: a red gate is the only signal that tells the
*next* session a migration is half-applied. Wired afterwards, an interrupted apply is
undetectable — and with a non-coder owner who cannot read the diff, that state is permanent.

Add a record to `plugins/sgs-blocks/scripts/gates.json` — **all seven fields**:

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

⚠ **`added_commit` is `null` at registration and that is correct** — you are committing the
gate BEFORE the migration, so the landing sha does not exist yet. Fill it afterwards or
leave it null; nothing reads it. `order` must be `max(existing) + 1`, derived not copied —
`npm run gate:list` prints the current max.

**Tiers.** `generator` runs in `prebuild` and is not a gate. `fast` runs on every build.
`full` runs pre-deploy via `build-deploy.py`'s `step_gate_full()`. **Pick by measuring** —
`python scripts/run-gates.py --time`. Only `python` and `node` are launchable.
⛔ **If you put anything in `full`, run `npm run gate:wired`.** A gate parked in a tier
nothing runs is enforcement laundering, and that check fails closed if the deploy-side
call ever disappears.

⛔ **A migration is not finished until its `--check` runs automatically.** This repo holds
**27** scripts that were built, work, and were never wired — including a mandatory go-live
gate nobody runs. One gate sat unwired for three weeks while three documents said it was
enforced. **Run `npm run gate:list`** — grepping `package.json` returns a false positive,
because every gate kept a standalone alias there when the chain moved to `gates.json`.

## Step 9 — Snapshot, dry run, then apply

```bash
git status --porcelain -- <the paths your survey listed>   # must be empty
git rev-parse HEAD                                          # record it
python plugins/sgs-blocks/scripts/<your-script>.py --fix    # diff only
python plugins/sgs-blocks/scripts/<your-script>.py --fix --apply
git diff --stat
```

⛔ **`--survey` must report `unrecognised: 0` BEFORE you apply, and nothing enforces it.**
The model writes every file inside its scan loop (`:158-160`) and only then prints
`REFUSING to guess` and returns 1 (`:310`). **A non-zero exit from `--apply` does NOT mean
the tree is untouched.** Confirm the zero with your own eyes first.

⛔ **If `git status` shows work in your paths you did not write, STOP** (hand-back #2). Both
the apply and its rollback would destroy it.

⛔ **`git checkout -- <paths>` is NOT a safe undo here.** It reverts to HEAD — discarding any
concurrent uncommitted work, and un-migrating your own change if it is not yet committed.
Your undo is `git checkout <recorded-sha> -- <your paths>`, scoped. **Never a bare
`git checkout .`** — it takes four other tracks with it.

⚠ **Read `git diff --stat`.** Every file should show a small, roughly symmetric +/- count,
and the file count should equal your census. **A file whose deletions equal its whole length
was truncated** — see hazards.

⚠ **If the survey counts moved between your dry run and your apply, another track moved your
targets.** Re-survey; do not apply.

## Step 10 — Prove the gate can fail

```bash
python plugins/sgs-blocks/scripts/<your-script>.py --self-test   # must exit 0
python plugins/sgs-blocks/scripts/<your-script>.py --check       # must exit 0 now
```

Then break one instance on purpose and run `--check` again. It must exit 1. **A gate you
have never seen fail is not a gate.**

⛔ **Restore by re-running `--fix --apply`, not by `git checkout`** (Step 9). **Then run
`--check` once more and require exit 0.** Do not commit until you have seen that second
zero — a deliberate break left in the tree is indistinguishable from a missed instance.

⚠ **After rebasing or merging `main`, re-run `--survey` AND `--check`.** A concurrent track
can add an instance of the shape you just eliminated, and your gate will then fail on their
commit.

## Step 11 — Deploy and LOOK. The gate is not the proof.

```bash
git status --porcelain                       # nothing of yours outstanding
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
```

Then open a real page rendering an affected block and check the changed property's computed
value — **at least one instance per `classify()` category**, not one page.

⛔ **A green `--check` proves no instance was MISSED. It proves nothing about whether the
transform was RIGHT.** Closing on a green gate is a violation of `CLAUDE.md` Rule 5 produced
BY compliance with this document. This method does not replace Rule 5 or R-31-13.

⛔ **If the deploy aborts with `deployed-files-dirty`, do NOT reach for `--allow-dirty`** —
that flag was D336's trigger, a ~2.5-hour two-client-site outage, and the abort message
offers it without that context. Commit your paths, or declare `--payload <path>`. **If the
uncovered list names files you did not write, stop and hand back.**

---

# Known hazards, each earned

- **Never `open(path,'w')` — write atomically.** All three models truncate on open
  (`migrate-length-sanitiser.py:230`, `migrate-render-closures.py:242`,
  `migrate-tier-object.py:825`/`:921`). This is the one place you must improve on them:
  **a truncated file passes `--check` GREEN**, because the scan skips files not containing
  the old symbol and an empty file does not contain it.
- **Scope the glob off `__file__`, never the repo root.** Measured today: a repo-root
  `**/render.php` sweep hits **194 files inside `.claude/worktrees/`** and **28 gate
  fixtures**, against **83** real ones. The worktree copies are another live track's — and
  a codemod that eats its own fixtures leaves a green suite that proves nothing. Always
  exclude `.claude/worktrees/`, `node_modules/`, `build/`, `vendor/`, `scripts/**/fixtures/`.
- **Read AND write with `newline=''`, never `errors='ignore'`.** Without `newline=''` on the
  read, Python translates CRLF to `\n`; writing back rewrites every line ending and your
  3-line change becomes an unreviewable whole-file diff. The tell: changed-line count equals
  file length. `migrate-length-sanitiser.py:141/159` is correct;
  `migrate-render-closures.py:110/235/242` is the bug.
- **Aligned assignment breaks literal find-and-replace.** `$sgs_css_keyword  = static
  function` with two spaces. A literal replace skips it silently — which is why one closure
  count read 45 before it read 52.
- **`} else {` is brace-neutral.** Depth-counting sails past it to the wrong closing brace.
  Detect the close structurally, and refuse rather than guess.
- **A per-line quote check cannot see a multi-line string.** A PHP heredoc/nowdoc body or a
  JS template literal spanning lines classifies as `call` and gets silently rewritten. Strip
  those bodies before classifying, or refuse any file containing one.
- **Do not copy `migrate-tier-object.py`'s 457-line hand-rolled `self_test`** (`:957-1413`,
  29% of the file). Use the fixture pattern from `migrate-length-sanitiser.py:190`.
- **`migrate-theme-attr-rename.py` and `migrate-theme-tier-scalars.py` duplicate
  `find_target_files()` byte-for-byte at `:83-89`.** If you need those helpers, extract
  them once rather than making it three.
- **Never cache a count in prose.** `CLAUDE.md` forbids it and a cached snapshot has already
  drifted 6-of-9. Every figure in this document is dated and derivable; keep it that way.
- **Where a genuine judgement call remains, the detector still ships.** Its census becomes
  the dispatch manifest — one batched pass over a classified list, never a discovery walk.
- **Never run `phpcbf`** to fix alignment. It reformats whole files and turns a scoped change
  into an unreviewable diff. Realign by hand, or leave a blank line.
- **WordPress silently discards an undeclared attribute** on the editor surface. A transform
  writing an attr the block.json does not declare produces no error and no effect.
- **A census that OVER-promises costs a whole task; one that under-counts costs a
  re-measure.** Bias every classifier conservative. (`daf9e6935` — a census promised 75%
  and the fixer could deliver 14%.)

---

# Why this exists

*(Read this if you are deciding whether to trust the method. Skip it if you are mid-task.)*

## Why this document distrusts its own numbers

**Four figures in this document have been wrong, all the same shape: asserted from memory or
read off a date, never derived.**

| # | The claim | What it actually was |
|---|---|---|
| 1 | six D-numbers dated 2026-08-11 => "the migration took one day" | a D-number records when work LANDS |
| 2 | "1 day each" for three migrations | a COMMIT DATE — the inference this doc bans |
| 3 | "13 days, 25 corrections" from seven D-numbers | those D-numbers span **three** days |
| 4 | "71 commits, 23 fixes" — offered as the *corrected*, re-derived figure | re-run today: **67** and **21**. The fix was itself unverified |

**The rule they produce: never a commit date, never a D-number, never a body-matching grep.
Derive by enumeration, and re-run the command rather than trusting the sentence.**

**Figure 4 is the instructive one.** It was written *as* the correction to figure 3, with
the instruction "re-run it; do not trust this sentence" attached. Re-running it disproves it.
The grep matches commit BODIES — only **8 of 67** name the panel in their subject — so it
sweeps in the shadow extension, the gradient rollout, the 255-row codemod, and commits about
this document. **"Correction" is also undefined**: subjects starting `fix` give 21,
containing `fix` give 22. A metric whose value depends on an undefined term cannot survive a
hostile read.

## What the evidence actually supports

| Work | What the change WAS | Target shape existed | Corrections |
|---|---|---|---|
| `migrate-length-sanitiser.py` | identifier rename, 204 sites, zero behaviour change | **19 days** (`5db768726`, 2026-08-02) | 1 landing, 0 |
| `migrate-render-closures.py` | closure -> shared helper, bodies byte-identical | **40 days** (`cef1fca99`, 2026-07-12) | 1 landing + 1 prerequisite |
| Colour panel rollout | a NEW component, its mount, its tab and its placement rule — **all undecided at start** | did not exist | many |

⛔ **Both fast migrations renamed onto a target that had been in production for weeks. Zero
corrections is what that predicts. The census is not what made them cheap — a settled target
shape is.** That is why Step 3 exists.

## The claim that does NOT survive, and the better one that does

❌ *"A census-driven pass lands once."* Falsified by this repo's own most recent census:
`5770ecb40` -> `74060ffd8` (*"derived_selector is not a selector — re-ground the census"*) ->
`daf9e6935` (*"the census promised 75% and the fixer could deliver 14%"*). One census, three
commits, an error of 5x.

✅ **A census relocates the corrections from the TREE into the DETECTOR.** Those three
commits corrected a *script*, once each, over a census of 255 colour rows — and the
third of them is why the honest number is **29**, not 255: `daf9e6935` records
`AUTOFIXABLE 161 (75%) -> 29 (14%)`. The same corrections made block-by-block would
have cost one commit **per block**.

⚠ **That 255 was this document's FIFTH unsound figure, and it sat four lines below
the sentence quoting "the fixer could deliver 14%".** Caught by a round-3 reviewer,
not by me. The census size is not the delivery. That is the whole argument,
and the evidence supports it.

## The slow track was never a counter-example

**The 33-block colour wave was census-driven on DAY 2.** `f6f3c0331` (2026-08-15) built
its worklist *"from the DB's `role='color'` census this session"*, landed 33 blocks in one
commit, and caught two errors in the hand-derived list it replaced. That is Step 2 of this
document, executed correctly, on day 2.

**What cost the fortnight was that the target shape was still being decided while the
rollout ran.** The five corrections, and what settled each:

| | The decision | How it was settled |
|---|---|---|
| D609 | ONE colour control everywhere, states inside it | amended the SAME DAY, after Bean rejected a build on sight |
| D618 | must NOT mount into native's `group="color"` | Bean looking at a live editor page |
| D621 | the panel belongs in the STYLES tab | overturned D618 |
| D622 | placement follows the D533/D537 resolver | a census (`placement-reach.py`, 2,262 attrs) |
| D632 | colour split from `ShadowControl`, 11 blocks | a survey — run AFTER the shape was decided |

Every one of those is a **global shape decision, not a per-block judgement** — Bean's
correction on that point was right and the decision log confirms it. But *not-per-block* does
not mean *census-derivable*. **A census answers how many, where, and which are exempt. It
cannot answer what shape is right.** Three of the five (D609, D618, D621) were settled only
by Bean looking at something rendered — and the two a census DID settle came after the shape
was already decided.

That gap is what Step 3 closes, and it is the difference between this method and the version
that was reviewed twelve times and still would not have prevented the fortnight.
