---
doc_type: report
title: Applying THE-MIGRATION-METHOD.md for the first time — the failure log
date: 2026-08-25
status: COMPLETE — one change applied through Steps 1-11
subject: .claude/THE-MIGRATION-METHOD.md
change: migrate-tier-object.py — declared_siblings() becomes DB-first with a disk crosscheck
window: >
  2026-08-24T22:49:28Z → 2026-08-25T00:0xZ (bracketing times captured by `date -u`; per-step
  times were NOT captured, so the steps below are ordered, not individually stamped. Recording a
  time I did not measure would be the exact "asserted, never derived" failure this doc bans.)
---

# The failure log

**Why this exists.** `THE-MIGRATION-METHOD.md` carried `status: PROVISIONAL-BUT-EXERCISED` and
named its own closing condition: *"one real migration has been APPLIED through Steps 1-11 and
re-graded."* It had been read and criticised 15 times across four council rounds and **had never
been allowed to write a file** — four agents followed it read-only. This is the first
application.

**The change.** `union_declared_siblings(prop)` in
`plugins/sgs-blocks/scripts/migrate-tier-object.py` walked `src/blocks/*/block.json` to answer
"which tier siblings are still declared anywhere". It is now `declared_siblings(prop)`: answered
from `block_attributes` (R-31-1, DB-first) and **crosschecked against the tree, failing closed on
disagreement**. Bean chose that shape over DB-only.

## Verdict key

`FOLLOWED` — worked as written · `SILENT` — the doc says nothing, I had to decide ·
`WRONG` — the doc says something that does not hold here · `N/A` — does not apply, reason given.

**Tally: 4 FOLLOWED · 1 SILENT · 4 WRONG · 2 N/A**, plus one whole class the doc never mentions.

---

## Step-by-step

### Step 1 — Check the tool already exists · **SILENT**

Ran the prescribed greps plus `grep -in "sibling" .claude/dev-setup.md`. Found
`plugins/sgs-blocks/scripts/surveys/census-tier-siblings.sh`, catalogued as *"Re-runnable census
of per-device tier-sibling attribute instances"* — a **verbatim subject match**.

It is not a hit. It censuses tier-sibling attributes in **stored `post_content` on the live
canary** (`wp_block`, `wp_global_styles`, autosaves, revisions) over SSH. My subject is
**declared** attributes in `block.json` / `block_attributes`. Same words, different corpus:
content versus schema.

**The gap.** Step 1 says "grep the SUBJECT, never the verb" and lists seven verb-prefixes to
expect. It gives no way to separate a genuine hit from a name collision — you have to open the
file. Both failure directions are live: treat this as a hit and you extend the wrong tool; treat
the subject as unsearched and you rebuild one that exists, which the step calls this repo's
recorded failure mode.

**Suggested addition:** after a subject hit, confirm the **corpus** matches before deciding
hit-or-miss.

### Step 2 — Ask the database, but only for what it holds · **WRONG** — a material omission

The DB can answer: 152 `%Tablet` rows, 40 distinct base properties at `source='sgs'`.

Step 2's ⛔ box lists three limits of `block_attributes`, and **all three are OMISSIONS** — no
file/call-site column; block-scoped so it misses `includes/`; blind to WP-native `supports`. The
implied model is "the DB knows less than disk".

**It can also know MORE.** `block_attributes` holds **507 `native_wp` rows for `core/*` blocks**
which have **no directory under `src/blocks/` at all**. Measured: an unfiltered tier-sibling query
returns **306** pairs against disk's **304** — the extra two are `isStackedOnMobile` on
`core/columns` and `core/media-text`. Without `source='sgs'` the DB answer is **wider** than the
tree, and nothing in the doc predicts that direction.

Not cosmetic here. `declared_siblings()` decides whether a literal `<prop>Tablet` read in a shared
include is legitimate. A falsely-wide answer marks a **dead** sibling read as live — the D575
shape, where the wrapper shipped `min-height:Array` to 73 live declarations.

Step 2's "reconcile both sides yourself; do not trust a number written here" was followed and
**is the single most valuable instruction in the document.** It is what surfaced this.

### Step 3 — Settle the SHAPE first · **N/A**

No client-visible surface — a developer script with no rendered output. Recorded and skipped, as
the step permits.

### Step 4 — Choose the recogniser, then copy the skeleton · **WRONG for this change**

The step assumes a **codemod over a corpus**: pick a line classifier or an AST, copy
`migrate-length-sanitiser.py`'s eight-part skeleton, write `classify()` returning five categories,
write `EXCLUDE`, write `PAT`. None of that exists in a **single-function body swap**.
`classify()`, `EXCLUDE`, `PAT`, `targets()`, `rel()`, `unrecognised` — all N/A.

**One part transferred, and it was the right one:** `crosscheck()` — *"the whole-corpus stage
`transform()` cannot be"*. Bean's chosen shape **is** a crosscheck. That is the part of the
skeleton worth keeping for a non-codemod change.

**The gap.** The rule fires on ">3 blocks, files or call sites", but Steps 4-7 only have words for
one shape of qualifying change. A change that is **small in files and large in blast radius** has
no path through them.

### Step 5 — SHAPE-TO-SHAPE, not find-and-replace · **N/A**

No transform. The "two instances differing only in hole values are ONE case" test has nothing to
partition.

### Step 6 — Write the fixtures before the transform · **FOLLOWED**, and it earned its place

All six required fixture classes applied cleanly, and the corpus control mattered most.

⛔ **A parity gate has a vacuity mode the doc does not name.** `check_db_parity()` compares two
sets. **If both collapse to empty it reports "agree" and exits 0** — output identical to a clean
tree. That is the doc's own "detector that stopped detecting", reached by a third route beyond the
two it records (a `ROOT` resolving outside the repo; a non-unique marker file). Three
corpus-control assertions now pin it: neither side empty, and the `block.json` corpus itself above
50 files.

**13 fixtures added, all passing:** corpus control ×3 · positive · negative control · **negative-
control non-vacuity** (proving "empty" is a real signal, not the constant return) · idempotence ·
`source='sgs'` load-bearing ×2 · divergence-must-raise · divergence-stub-restored · gate returns 0
on the real repo.

### Step 7 — Survey, and read the whole census · **FOLLOWED**, with a better baseline than the doc suggests

Step 7 says run `--survey` before and after. I had begun editing before reaching it, so instead I
reconstructed the baseline from `git show <sha>:` into a temp copy and diffed. That is **strictly
stronger** than a saved text file — it cannot drift and needs no discipline to keep.

Result: `--property <p> --survey` output **byte-identical** across `margin`, `padding`, `gap` and
`borderRadius`.

**Suggested change:** derive the baseline from the recorded sha; do not ask the agent to save one.

### Step 8 — Wire the gate BEFORE you write · **WRONG in two independent ways**

**(a) The gate cannot precede the code when the gate IS the code.** Step 8's ordering assumes a
codemod: the gate detects the *old* shape, so it can be committed first, red, and go green when
the migration lands. Here `--check-db-parity` is implemented *by* the change. There is no ordering
in which it comes first. Followed in spirit — registered before commit, and proven to fail before
commit.

**(b) "It will fail red until the migration lands, and that is the point" does not hold for a
guard.** This gate is **green from registration onward**: it compares a derived copy to its
source, and there is nothing to migrate. Read literally, Step 8 leaves two bad options — don't
wire it, or wire something that breaks the build.

⛔ **A related trap the doc does not mention, and it nearly landed.** The obvious gate here is
`migrate-tier-object.py --check`, which exits 1 while **any** FLAT/BLENDED family remains — and
**27 properties are still flat**. Registering that would have failed every build on `main` for all
five tracks. The narrow `--check-db-parity` mode exists to avoid exactly that. **Step 8 should
say: run your `--check` and see what it returns TODAY before registering it.**

Registered at `order: 65`, tier `fast`, 0.12s. Confirmed with `npm run gate:list` — not a
`package.json` grep; the doc is right that those false-positive. `npm run gate:wired` passes.

### Step 9 — Snapshot, dry run, then apply · **FOLLOWED**

`44a70fbb2f8651728124e7e94b3f7eaa6ab55533` recorded; target paths clean beforehand.

⚠ **`git diff --stat` caught a real defect, exactly as the doc promises.** Adding the
`package.json` alias by rewriting the file with `json.dumps(indent=2)` produced a **241-line
whole-file diff** — that file is **tab**-indented. Reverted and re-inserted as one line of text;
final diff **1 insertion**.

The doc's hazard is written about **CRLF translation** ("the tell: changed-line count equals file
length"). **The same failure arrives via indent style when you round-trip JSON**, which it does
not mention. The tell is identical; the cause is not.

### Step 10 — Prove the gate can fail · **FOLLOWED**, and it found a pre-existing red

Injected `sgsFakeParityProbeTablet` into `container/block.json`. Gate went **exit 1**, naming the
exact offending pair. Restored; **exit 0**; `git status` clean byte-for-byte. The required second
zero was observed before committing.

⭐ **The find of the session, and it came from running the suite rather than reading it.**
`--self-test` was **already RED on `main`** — 2 failures. Verified pre-existing by running the
untouched HEAD file from a temp copy: **identical 2 failures**. So it was not mine.

Root cause: the fixture asserting the wrapper's historical pre-fix content read
`git show HEAD:...` and asserted the result was the **pre-fix** shape. True only while HEAD *was*
that commit. The fix landed; `HEAD:` began returning the **fixed** file, which correctly
classifies `NORMALISED`; both assertions inverted. **A fixture asserting historical content must
name an immutable object — a moving ref is not a fixture.**

Fixed at root cause by pinning `e7f28b0fd` (verified: `state=RAW`, two `DELETED_SIBLING_READ`,
against HEAD's `NORMALISED`). Suite now **ALL PASS**.

**Why nobody noticed: the script is not in `gates.json`.** Its `--self-test` and `--check` have
never run automatically. Step 8's own rule — *"a migration is not finished until its `--check`
runs automatically"* — was never applied to this script, and the cost was a red suite of unknown
age sitting on `main`.

### Step 11 — Deploy and LOOK · **WRONG for this change**

Step 11 mandates a deploy and a computed-value check on a rendered page, "at least one instance
per `classify()` category". This change has **no rendered surface** — nothing a client sees
changes, there are no `classify()` categories, and deploying would ship four other tracks'
uncommitted work.

Substituted, decided in advance rather than mid-flight: byte-identical `--survey` output across
four properties against the HEAD baseline. **The doc has no words for a change whose correct proof
is "provably identical behaviour" rather than "look at the page".**

⛔ Step 11's underlying warning still holds and is the most important line in the document:
*a green `--check` proves no instance was MISSED, never that the transform was RIGHT.*

---

## Not a step — but it cost real time, and the method is silent

**Generated artefacts shared across five tracks.** `generate-tooling-catalogue.py --check` and
`generate-db-catalogue.py --check` both exit 1. **Proven pre-existing:** with my three files
stashed, both still exit 1 at HEAD.

Regenerating sweeps in the **motion track's** `fx_effects` DB seeding (16→17 rows, `tier V` 3→4,
`scope block` 10→11) and the previous session's hook additions. So the correct action is *not* to
regenerate — doing so stages another track's work inside my commit. **Left stale and flagged.**

The method says nothing about a generated artefact whose inputs several tracks write — yet its own
Step 8 tells you to add a gate, which is precisely what makes that artefact stale. On a repo where
five tracks share `main`, this is not an edge case.

---

## What the method got right

A step that worked is evidence too.

1. **Step 2's "reconcile both sides yourself; do not trust a number written here."** Found the
   `source='sgs'` trap. Best instruction in the document.
2. **Step 6's corpus control.** Found a vacuity mode specific to parity gates.
3. **Step 9's "read `git diff --stat`".** Caught the 241-line indent blowup in seconds.
4. **Step 10's deliberate break.** Found a pre-existing red invisible for an unknown period, and
   led to a root-cause fix rather than a workaround.
5. **Step 8's "confirm with `npm run gate:list`, not a `package.json` grep."** Correct — the
   standalone aliases do false-positive.

**Four of the five defects found this session were found by DOING, not reading.** The method's own
claim on that point reproduces.

---

## Evidence index

| Claim | Command |
|---|---|
| DB can answer; 152 `%Tablet` rows, 40 properties | `sgs-db.py sql "SELECT attr_name, COUNT(*) … LIKE '%Tablet' GROUP BY attr_name"` |
| 306 unfiltered vs 304 filtered; leak is 2 core rows | fixture `source='sgs' is load-bearing`, in `--self-test` |
| `source` partitions cleanly (507 `native_wp`, all core) | `sgs-db.py sql "SELECT source, COUNT(*), SUM(block_slug LIKE 'core/%') … GROUP BY source"` |
| Self-test red at HEAD, same 2 failures | `git show <sha>:… > _baseline_mto.py && python _baseline_mto.py --self-test` |
| `e7f28b0fd` is the pre-fix shape | `file_hazard_state()` over `git show` at HEAD / `e7f28b0fd` / `e7f28b0fd^` |
| Survey output byte-identical, 4 properties | `diff base-<prop>.txt new-<prop>.txt` |
| Gate fails on a real break, then recovers | injected `sgsFakeParityProbeTablet` → exit 1 → restore → exit 0 |
| Catalogues stale at HEAD, not from this change | `git stash push` my 3 files, re-run both `--check` |
| 57/57 gates green including the new one | `npm run gate:fast` |

---

## Round 4 — the D778 burn-down edits, councilled 2026-08-27

Four seats, dispatched in parallel and blind: **Cutter** (delete-only), **Cold applier**
(walked the doc against a real backlog — rule `21-render-without-control`), **Grader**
(anchored rubric), **Ratchet auditor** (Step 8 vs `inspector-scan/rules.json`).

**Panel counts: CONFIRMED 45 · PEDANTIC 6 · WRONG 3.**

| Seat | Grade (its dimension) | C / P / W |
|---|---|---|
| Cutter — length + density | C+ | 11 / 0 / 0 |
| Cold applier — first-attempt reach | D+ | 11 / 3 / 0 |
| Grader — overall, anchored | C+ (was B−) | 6 / 2 / 3 |
| Ratchet auditor — extraction fidelity | C+ | 17 / 1 / 0 |

### The convergent headline (3 of 4 seats, independently)

Step 8's justifying sentence — *"that is how 15 of `inspector-scan`'s rules became permanently
unable to fail while carrying 945 findings"* — was **false in both halves**, and was false on the
day it was written. Measured: **17** advisory rules, and `run.js:190-209` has failed the build on
an advisory ratchet breach since **2026-08-18**, a week before the sentence. Proven directly this
session by dropping rule 34's ceiling to 318 → exit 1 naming the rule.

D-class under the rubric: `mode:'advisory'` + a numeric `openBacklog` **IS** the doc's own
"ratcheted ceiling" and `mode:'gate'` **IS** its "binary", so the doc told the agent that advisory
was the broken state to escape — inverting the mapping. Acting on it means promoting a backlogged
rule to `gate`, which reds pre-deploy for all five tracks.

### The three WRONG findings (they RAISED the grade)

1. *"Step 4's off-ramp won't fire"* — it does; all three preconditions verified.
2. *"Routing to 7b skips Step 6, so a fixed rule ships with no fixture"* — `run.js:107-109` refuses
   to register any rule without a `selfTest` block. Fails closed.
3. *"Step 8's ratchet quotes are paraphrase dressed as quotation"* — verbatim, verified.

### CONFIRMED findings fixed in place (all tagged 2026-08-27)

| # | Finding | Fix |
|---|---|---|
| 1 | Step 8's causal claim false in both halves | Corrected; added a shape→field mapping table (`mode:"gate"` / `mode:"advisory"`+ceiling / registration error) and the Bean-locked promotion criterion from `_meta.note` |
| 2 | Step 11 "sample by finding KIND" **impossible** — `kind` is non-null on exactly 1 rule of 24; all 222 rule-21 findings carry `kind: null` | Re-pointed to sampling by the fixing MECHANISM; the `kind` trap documented |
| 3 | Step 7b content key `block + kind + rowKey` names two fields that do not exist — `rowKey` absent from the schema; and rule 21's `line` is `null` with `key` already content-shaped, so the stated premise is false | Rewritten to "check the schema first"; the rule-31-specific recipe kept but labelled |
| 4 | Entry triage had **no burn-down branch**, so the backlog path was unreachable — a cold agent routed to Step 3 and hand-back #8, upstream of every D778 edit | Added branch 0 routing straight to Step 7b |
| 5 | Truncated fragment ending mid-sentence, qualifying a "one commit" rule that appears nowhere in the doc | Rewritten as a complete sentence |
| 6 | *"Advisory is a STARTING state with an exit condition"* presented as **practised** — no advisory rule carries a `promotionCondition`; four sit at `openBacklog: 0` unpromoted | Relabelled prescription-not-description; real criterion cited |
| 7 | Step 7b's ⛔ "fix the rule" has no blast-radius escape — two of three sampled findings trace to a resolver shared across rules | Exception added, routing to hand-back #9 |
| 8 | Step 8 had no "gate already exists" off-ramp (Steps 4/5/11 all had one) | Added, with `npm run gate:list` |
| 9 | Prose-cached counts ("22 rules", "~12,000 words") — `_meta.note` explicitly forbids caching them | Replaced with uncached phrasing |

### Recorded, NOT fixed

- **Recoverability holds at D.** 72 gates enumerated; none inspects diff shape or changed-line
  count. It failed again this session: the `rules.json` edit was done by TEXT replacement
  specifically to dodge a `json.dump` whole-file reformat, and the defence was a manual
  `git diff --stat`. Round 3 named this the single highest-value fix; it remains Bean's call.
- **Cutter's remaining cuts** (~40 lines: the "Why this exists" section, the duplicated anchoring
  incident, the third `--allow-dirty` telling). Net length still rose — corrections outrank
  compression, but the trend is real and the Cutter is right about it.
