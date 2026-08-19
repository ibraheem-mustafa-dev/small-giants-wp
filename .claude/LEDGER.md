---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-19
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Three parallel sessions all merged into `main`. Branches deleted, both stray worktrees
removed, tree clean, every gate green.**

**The shift that matters.** We stopped fixing violations one at a time and built the machine
that finds them. There are now **14 control-type contracts** (was 1), a census that reads them,
and one shared engine underneath. Adding the 15th control type is a paragraph of JSON, not a
new script.

**The headline number was wrong twice, both times in our favour.** "22 blocks need a colour
panel" was really **3**, then **2**. And the deeper question — *should* a block have a panel? —
exposed a circular scope rule that excluded exactly the blocks missing one. Fixing it found
**12 form blocks** whose fields a client cannot colour at all.

**What to be wary of.** Nearly every wrong number today came from an instrument, not the code:
a regex matching a backspace character instead of a word boundary (twice), a DB field queried by
the wrong name, a count including a flag it shouldn't. What saved us each time was predicting the
number *before* running, then reconciling.

## Shipped today

| What | Detail |
|---|---|
| **One shared hover helper** — `sgs_emit_state_colour_css` | 8 blocks, **live-verified on the canary** |
| **Shared component resolver** (`core/components.js`) | fixed **50 false positives** in rule 21 (250→200; now 199 after the merges) |
| **Rule 27's blind spot closed** | a `gate` at openBacklog 0 that could not see shared files |
| **Shared golden engine** (`core/golden.js`) | rule 31 imports instead of owning; **409 before, 409 after** — the extraction moved nothing (now 408 after the merges) |
| **14 control-type contracts** (was 1) | all of Part O + typography |
| **Golden-conformance census** — schema-driven | per block, per axis; 1,162 rows across 14 types |
| **Qualification predicate** | splits "not eligible" into MISSING vs NOT-APPLICABLE |
| **`surface-cap` composite expansion** | + 2 new detectors, 4 npm aliases registered |
| **Header track** | COMPLETE and live-verified (separate session) |

## Where conformance actually stands

```
canonical    63 CONFORMANT · 2 VIOLATION · 12 MISSING · 6 NOT-APPLICABLE
nativeUi    150 VIOLATION  (colour 25 · typography 25 · length-unit 50 · box-4value 50)
hover         8 CONFORMANT · 9 UNCLEAR
```

- **2 canonical violations** — `buybox`, `site-footer` (core-only, no SGS panel)
- **12 MISSING** — the form family; control belongs on `sgs/form`, children inherit
- **1 inert control + 3 undeclared attrs** — live; detectors written, deliberately unregistered

## THE FRONT — next session

⭐ **The goldens are NOT finalised.** 14 control types are declared but only **colour**
is measurable: 1 of 14 has a qualification predicate, 4 of 14 have native-UI detection,
and 13 of 14 use a `canonical` shape the census cannot read (which is why it reports
N/A for 1,079 of 1,162 rows). Bean's real roster is **~24 types**, not 14.

**So the order is: finalise the goldens → measure → then fix.** Fixing first would
repair colour, declare the axes done, and meet typography/border/media/animation/date
later — the repeat-the-process-13-times trap.

### Phase 1 — finalise the goldens (3 sessions, run in PARALLEL, start here)

| Prompt | Owns (7 types each) |
|---|---|
| `.claude/prompts/2026-08-19-goldens-A-styling-primitives.md` | gradient, typography, length-unit, 4-value box, border, shadow, alignment — **plus the COMPOSER** |
| `.claude/prompts/2026-08-19-goldens-B-input-controls.md` | enum+segmented (merged), boolean, free-text, link, icon, multi-select, date |
| `.claude/prompts/2026-08-19-goldens-C-behaviour-and-structure.md` | media, state/hover, responsive wrapper, repeater, animation, angle/position, preset picker |

Coverage verified: 21 live types, **zero overlap** (#1 colour done, #24 rich text
excluded as canvas-side). Each session gets **its own worktree** and writes **its own
`goldens/<name>.json`** — `golden-controls.json` is a single merge point and three
sessions editing it conflicts on every run. A ships the composer first; B and C tolerate
its absence rather than blocking.

### Phase 2 — measure

Re-run `npm run survey:golden-conformance`. The true inconsistency list will be
substantially larger than what a colour-only instrument currently sees.

### Phase 3 — fix, in parallel against a complete list

Known already, and NOT the whole list:

| Work | Size | Shape |
|---|---|---|
| Native-UI retirement | **58 distinct blocks** (not 150 — `length-unit`/`box-4value` are the same 50, both reading `supports.spacing`) | `block.json` only, mechanical |
| Form colour | `sgs/form` + 12 field blocks | one design, then mechanical; control belongs on the parent |
| `buybox` + `site-footer` | 2 blocks | canonical panel **and** native retirement in one pass |
| Gap findings | 17 across 11 blocks | judgement per finding |
| Detector findings | 1 inert control, 3 undeclared attrs | small, scattered |
| Depth + exclusion change | 1 file | ⛔ design-sensitive, single merge point |

⛔ **Serialised, never parallel:** `rules.json`, `package.json`, `golden-controls.json`,
`core/*.js`.

## Methodology guardrails (carried forward — all still true)

- ⛔ **COMMIT before dispatching ANY agent, even a read-only one.** A task framing does not
  constrain tool access; only committing does.
- ⛔ **Before citing a file as a source of truth, grep for a reader of the KEY, not the file.**
  Three "authoritative" sources proved unread or self-contradicting.
- ⛔ **A measured count BELOW an independent prediction is a detector bug until proven otherwise.**
  Rule 31 undercounted by 33 rows; three blocks scored zero because they build their rows list
  indirectly. A false absence reads exactly like a clean result.
- ⛔ **`git grep` only, never `grep -r`** — and scope a census to the exact filename that defines
  the population (`grep -rln` over a directory returned 61 against a true 60).
- ⛔ **Use a word boundary in a JSX tag pattern, never a trailing character class** — multi-line
  JSX puts the tag at end-of-line and the wrong pattern returns a false absence.
- ⛔ **Never pipe a population-defining survey through `head -N`.** Count first. (Broken again
  today by the person quoting it — it hid the live hover CSS during verification.)
- ⛔ **No detector ships with a hand-counted baseline.** Declare, run, reconcile.
- ⛔ **A false positive is a detector bug, never baseline fodder.**
- ⛔ **NOTHING GATES A DB ORPHAN, and the rule alone did not hold.** After deleting attributes
  from a `block.json`, the DB keeps their rows until Stage 9 runs. The db-consistency suite exits
  0 with orphans present (it only flags "rogue seeds" carrying a `css_property`), so nothing
  catches it. **A gate is needed, not a third restatement of the rule:** fail when a
  `block_attributes` row has no matching `block.json` attribute.
- ⛔ **`/sgs-update --stage 1` UPDATES BUT DOES NOT PRUNE.** Deleting an attribute from a
  `block.json` leaves its DB row behind as a "rogue seed"; Stage 9 is the prune.
- ⛔ **The advisory ratchet does NOT self-heal.** It blocks growth past a frozen number; it never
  lowers it. Clearing findings without lowering `openBacklog` creates silent slack.
- ⛔ **`ctx.cache.json()` returns `{ok, error, data}`** — reading `.attributes` off it yields
  undefined and silently disables a rule.
- ⛔ **Never compare AST line numbers against `strippedText()` line numbers** — use character
  offsets.
- ⛔ **Read a gate's header before calling it broken**, and check whether a script parses argv
  before probing it with `--help` (`extract-signatures.py` ignores flags and runs).
- ⛔ **Main agent owns `package.json` and `rules.json`** — single-merge-point files.
- ⛔ **No agent runs a build** (`clean:build` does `rmSync('build')`), edits a shared JSON, or
  mutates a repo file as a fixture (D659).
- ⛔ **No shared-DB reseed without coordinating** — other sessions are live.
- ⛔ **`$?` after a pipe reads the LAST command's status.** Redirect first.
- ⛔ **A pre-commit gate can fail SILENTLY** — never `--no-verify`; use the scoped skip with a
  reason. A command-scanning hook also matches your *script content*, heredocs included — reword
  the prose rather than reaching for a bypass token.
- ⛔ **`cat -A` THE BYTES.** A literal backspace (`0x08`) replaced a regex word boundary TWICE
  today. Both times the detector matched nothing, passed clean, and looked exactly like a healthy
  tree.
- ⛔ **Axis scope is not uniform.** `canonical` needs the one-hop view THROUGH shared components;
  `bannedLookalikes` needs it MINUS the canonical components, because the raw primitive
  legitimately lives inside `DesignTokenPicker`. Getting it wrong produced 5 false positives.
- ⛔ **Depth and the banned-lookalike exclusion must move TOGETHER.** One hop under-reports 9 of
  17 components (`ColorPalette` 3→64); raising depth alone trades that for ~61 false positives.
  Reproduce first: `python scripts/surveys/compare-reach-depth.py .`
- ⛔ **A derived field is a claim, not a decision.** `surfaces.colour` is computed from what a
  block ALREADY has, so as a scope predicate it is self-fulfilling — it excludes exactly the
  blocks that are missing a panel and can therefore never find one.
- ⛔ **`__experimentalSkipSerialization` is NOT a colour-UI flag.** It is the serialisation opt-out
  the conformant shape REQUIRES. Counting it reports 50 blocks against a true 25. Two sessions
  made this mistake independently.
- ⛔ **A step that swallows its own failures is invisible in the exit code.** `/sgs-update`'s
  classifier sub-step warns and continues by design — exit 0 whether it worked or not.
- ⛔ **A regenerated artefact + a shared DB + multiple branches loses entries silently.** The
  classifier regenerates from the tree it runs in; the DB is shared. A stale branch cannot see
  another branch's attributes, and re-running cannot help — the input genuinely is not there.
  **Merge first.**
- ⛔ **`git commit -- <paths>` only commits TRACKED files.** New files need `git add` first — a
  rule shipped without its fixtures this way, green locally, broken on a fresh clone.
- ⛔ **The `[gates-ok:]` token is read from the COMMAND string, not the message file** — and git's
  own `.githooks/pre-commit` does not honour it at all.
- ⛔ **Look inside a worktree before removing it.** The stale main worktree held 7 uncommitted
  audit entries existing nowhere else. Verify `node_modules` is not a junction (LinkType/Target)
  — a past removal emptied it 962→0.
- ⛔ **`*/` inside a JS block comment TERMINATES it.** `src/blocks/*/components/` written in a
  docblock is a syntax error.
- **A completeness error is invisible to every correctness gate.**
- **Run builds synchronously, never backgrounded.**

## Open — carried

- **12 form blocks + `sgs/form`** — clients cannot colour form fields at all. The form exposes 4
  colour rows (focus ring, progress bar, submit); field background, border, text and label are
  theme-painted and unreachable. Competitive gap vs Kadence/Spectra.
- **The depth + transitive-exclusion change** — evidence gathered, not applied.
- **17 "control weaker than its value" findings** (`survey-control-gaps.py`), including 3
  hand-rolled font-size boxes breaching the mandatory TypographyControls rule.
- **`sgs/quote` discards every hover gradient a client sets** — control writes it, render reads
  it, `block.json` never declares it. Same class as D338's 45 bugs.
- **`sgs/feature-grid` Layout control inert** · **`sgs/text` 2 undeclared per-device font sizes**
- **F5/F6 commit gate measures the main checkout, not the worktree it runs in.**
- **handoff-preflight fails in a fresh worktree** — `02-SGS-BLOCKS-REFERENCE.md` is gitignored
  and generated locally.
- `extract-signatures.py` is **non-deterministic** — never commit a wholesale regeneration inside
  an unrelated change.
- **5 blocks have `:hover` with no `:focus-visible`** (was 7; 2 fixed today).
- **`survey-control-mounts.py` has no self-test.**
- **`mistakes.md` is 34 active against a ~30 target** · **`decisions.md` docscores B-**

## State Snapshot

- **Branch:** `main`, in sync with `origin/main`, tree clean. `feat/hover-helper` and
  `worktree-golden-control-schema` merged and **deleted**. Both stray worktrees removed; main's
  `node_modules` verified intact at 975 entries after each removal.
- **D-ceiling:** **D688** (D685 hover helper · D686 shared resolver · D687 qualification
  predicate · D688 the 3-way goldens split) — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Live counts (re-derived at handoff, after all merges):** rule 21 **199**, rule 31
  **408**, rule 01 58, rule 18 13. Ratchets in `rules.json` already match — another
  session lowered them in the merge, so there is no silent slack.
- **Gates:** inspector-scan `--check` exit 0 · **22/22 self-tests** · `audit-inline-styling`
  0 violations across 83 blocks · F5/F6 green · cheat-gate green
- **Canary:** deployed and live-verified today (8 hover blocks).

## Pointers

| For | Read |
|---|---|
| **THE PLAN — axes + parallel split** | **`.claude/plans/go-c1-c4-lively-zebra.md`** |
| The programme brief | `.claude/plans/2026-08-18-inspector-enforcement-programme.md` |
| The 14 control contracts | `plugins/sgs-blocks/scripts/consistency/golden-controls.json` |
| Handover: shared-component visibility | `.claude/reports/2026-08-19-shared-component-visibility-handover.md` |
| Handover: surface-cap Task 4 | `.claude/reports/2026-08-19-task4-surface-cap-handover.md` |
| Structural defences (uncapped, D101) | `STOP-CATALOGUE.md` |
| Inspector UX standard | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Styling / token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Build / deploy / credentials | `dev-setup.md` · `build-deploy.py --target sandybrown` |
