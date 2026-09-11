---
doc_type: phase-plan
plan_id: phase-nav-menu-colour-state
phase_name: Spec 41 — sgs/nav-menu colour, state + control system (build)
project: small-giants-wp
spec: .claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md
spec_version: 0.4.6
mode: ad-hoc phase (standalone spec, no parent strategic-plan)
date: 2026-09-11
cost_estimate: "~$34 (≈2.35M in / ≈0.52M out across 26 steps + 7 QA gates)"
docscore_grade: A (100% — docscore.py, archived-plan template)
status: READY-TO-EXECUTE (pending 7 Key Judgement Calls — see §KJC; KJC-7 is a blocker on Step 15)
---

# Phase — Spec 41 `sgs/nav-menu` colour, state + control system

**USP:** This is the block a visitor touches on *every page of every client site*, and today a
client cannot colour the page they are on, cannot control the line between items, and picks a
"hover style" from a dropdown instead of setting the colours they want. This phase turns the whole
thing into direct controls — and retires three competing mechanisms down to one. It is also the
first block to carry the framework's 3-state (Normal / Hover / Current) colour model end to end,
so the shape built here is the shape every future stateful block copies.

**Plan label:** `[PLAN: opus]` — the manifest rewrite, the two shared-component touches and the
FR-41-15 census execution are all expensive-to-undo and need architectural judgement at the seams.
Per-step dispatch is mostly `sonnet` (see each step's `Model:`).

**Docscore:** **A (100%)** — `python ~/.agents/skills/shared-references/docscore.py
.claude/plans/phase-nav-menu-colour-state.md --type archived-plan`. Structural 100 / Completeness
100 / Quality 100 / Freshness 100. ⚠ The tool grades STRUCTURE against the template; the honest
qualitative caveats are recorded in §Docscore below and are not a tool finding.

**Aggregate cost estimate:** **≈$34.00** — 26 steps + 7 QA gates. Derived from
`~/.agents/skills/delegate/data/routing-table.json` (sonnet $3/$15 per 1M in/out; haiku $1/$5;
inline $10/$50) × per-step token estimates recorded on each step. No `plan_actuals` store exists
(the dashboard that held it was discontinued 2026-08-17), so estimates fall back to routing-table
defaults calibrated against this project's comparable plans
(`plans/archive/2026-09-07-dead-pattern-attrs-border-migration.md`,
`plans/archive/2026-08-23-colour-capability-grant-PLAN.md`).

---

## Phase success criteria (done when)

- [ ] `git grep -nE "hoverStyle|underlineColour|underlineThickness|underlineOffset|itemRadius|submenuRadius|indicatorStyle|indicatorColour" plugins/sgs-blocks/src plugins/sgs-blocks/scripts theme/` returns nothing
- [ ] `python plugins/sgs-blocks/scripts/run-gates.py --tier all` exits 0
- [ ] All **23 acceptance gates** (G1, G2, G3, G4, G5, G5a, G6–G19, G20, G20b, G20c) pass, each with its evidence recorded in `.claude/verify/spec-41-gates.md`
- [ ] `plugins/sgs-blocks/src/blocks/nav-menu/edit.js` ≤ 250 lines and `render.php` ≤ 300 lines, with every extracted module under the same limits (project CLAUDE.md file-length rule)
- [ ] `python plugins/sgs-blocks/scripts/check-ungated-paint-rules.py --check` exits 0 **and** appears in `npm run gate:list`
- [ ] Bean has signed off visually on the live canary (R-31-13 — a number alone does not close this)
- [ ] `.claude/specs/README.md` row 41 reads `built`, version `0.4.6` (it currently says `v0.4.1` / `draft` — stale on both counts)

---

## Entry context (read before starting)

| File | What it contains |
|---|---|
| `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` | **READ IN FULL (4,388 lines).** The governing spec. Every FR is load-bearing; 6 revisions + 3 adversarial-council rounds have already removed the easy wrongness, so a skim finds nothing and misses the traps |
| `.claude/specs/36-SGS-NAVIGATION-SYSTEM.md` | The governing nav spec. FR-36-4 (distinct hover+focus states), FR-36-11 (WCAG floor), FR-36-28 (pointer to Spec 41) |
| `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` | No inline `style=` property declarations; scoped `<style>` only |
| `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` | Part L control completeness; Part O control-type contract; FR-35-5 STATE_WITHOUT_BASE |
| `plugins/sgs-blocks/src/blocks/nav-menu/` | `block.json` (610 L, 79 attrs, 8 elements), `edit.js` (1,535 L), `render.php` (2,031 L), `style.css` (427 L), `view.js` (158 L) |
| `plugins/sgs-blocks/CLAUDE.md` | Colour-control standard, precedent registry (`background-clip:text` `@supports` requirement), block-deprecation policy |
| `CLAUDE.md` (repo root) | The 7 rules, root-cause methodology, deploy path, git hygiene |
| `.claude/STOP-CATALOGUE.md` | Structural defences — read before the first edit |

---

## References (Stage 2 Research Pre-Gate outcome)

⚠ **The Research Pre-Gate was RUN and returned "no external research needed" — with three named
exceptions that were resolved by reading the tree rather than the web.** The spec is itself the
output of three adversarial-council rounds plus a technical-correctness review against the real
codebase; fabricating research questions it already answers would be waste. What *was* genuinely
open were three implementation-shape questions the spec does not settle, and each was closed by a
verified read (commands below are runnable — a "verified" claim with no command is banned):

| Open question | Resolution | Command that produced it |
|---|---|---|
| Is there a precedent for splitting a large `edit.js` into sub-modules? | **Yes — `src/blocks/cart/`** carries `PanelSettingsControls.js` + `TriggerSettingsControls.js` beside `edit.js`. Copy that shape | `for d in src/blocks/*/; do ls $d*.js; done` |
| Is there a precedent for splitting render-PHP? | **Yes, but NOT as a sibling partial** — blocks `require_once dirname( __DIR__, 3 ) . '/includes/<name>.php'`; `sgs/product-card` requires `includes/product-card-builtin-render.php`. The `includes/` route is the proven one | `grep -hn "require" src/blocks/product-card/render.php` |
| Does the build copy a sibling `.php` partial inside a block folder? | **Unproven.** `wp-scripts build --experimental-modules --webpack-copy-php` is documented to copy `render.php`; nothing proves it copies arbitrary siblings. ⚠ **This is why the `includes/` route is chosen over a sibling partial — see KJC-1** | `grep -n "webpack-copy-php" plugins/sgs-blocks/package.json` |

**Baseline facts re-verified against the live tree as this plan was written** (each is a spec claim
that the plan depends on; all three earlier reviews found premises that did not survive, so none is
taken on trust):

| Spec claim | Verified | Command |
|---|---|---|
| 122 `sgs_emit_state_colour_css()` call sites | ✅ **122** | `grep -rn "sgs_emit_state_colour_css(" plugins/sgs-blocks --include=*.php \| wc -l` |
| `SgsBorderControl` has no `showColour` | ✅ **0 hits** | `grep -c showColour plugins/sgs-blocks/src/components/SgsBorderControl.js` |
| `BorderStyleControl` exists + is barrel-exported | ✅ both | `ls …/components/BorderStyleControl.js; grep -n BorderStyleControl …/components/index.js` |
| `fx-magnet.css` carries a literal `180ms`, no custom property | ✅ `transition: transform 180ms ease-out` at L33 | `grep -n "transition:" plugins/sgs-blocks/assets/css/fx-magnet.css` |
| `check-ungated-paint-rules.py` does not exist | ✅ absent | `ls plugins/sgs-blocks/scripts/check-ungated-paint-rules.py` |
| `gates.json` is a list of gate objects | ✅ **106 entries** | `python -c "import json;print(len(json.load(open('scripts/gates.json'))))"` |
| **FR-41-15 census is still accurate against the CURRENT `render.php`** | ✅ **18 background/border-carrying statements**, exactly as §FR-41-15 claims; all nine numbered `render.php` census rows located at their described selectors | the spec's own statement-aware scan, re-run (see Step 1) |
| nav-menu's dismissible `<Notice>` precedent | ✅ `isDismissible={ true }`, `status="info"`, `marginBottom: '16px'` | `grep -n "Notice" src/blocks/nav-menu/edit.js` |

**Correction-ledger entries consulted (Stage 0):**
`~/.agents/skills/shared-references/correction-ledger.md` —
`[RECURRING:powershell-statement-separator]` (use `;` or the Bash tool, never `&&` in PowerShell),
`[RECURRING:hard-gate-enforcement]` (prose checkpoints get skipped; this plan's gates are runnable
commands, never prose), `[prose-rules-ignored]` (hard Python hooks are the enforcement, which is
why FR-41-35's detector is a first-class step and not a footnote).

**Project lessons this plan is structurally defended against:**
`a-gates-scope-is-not-the-defects-scope` · `a-prohibition-in-a-subagent-brief-is-not-enforcement` ·
`parallel_agent_dispatch_needs_one_directory_each` · `a-raw-db-update-does-not-survive-a-reseed` ·
`revert-and-rerun-a-codemod-dont-hand-patch-its-output` · `never-stash-in-shared-worktree-commit-first` ·
`a-renames-blast-radius-is-the-whole-write-path` · `a-schema-default-erases-the-absence-a-pipeline-preserved`.

---

## Tooling Index

| Type | Name | Used in |
|---|---|---|
| skill | `/delegate` | every dispatched step |
| skill | `/subagent-prompt` | steps 3–6, 7–8, 9, 12–19 (prompts pre-written below) |
| skill | `/dispatching-parallel-agents` | Wave A (4-way + 2 lanes), Wave B (2 lanes) |
| skill | `/subagent-driven-development` | Wave B and Wave C (implementer + 2 reviewers per task) |
| skill | `/qc-council` | QA-2 (plan fix-shapes), QA-4 (post-manifest, Bean-mandated) |
| skill | `/verify-loop` | every QA gate (2 independent attestations per load-bearing claim) |
| skill | `/sgs-db` | steps 10, QA-5 (G4, G11, G12) |
| skill | `/sgs-update` | step 10 (`python plugins/sgs-blocks/scripts/sgs-update-v2.py`) |
| skill | `/wp-sgs-deploy` | step 20 |
| skill | `/visual-qa`, `/a11y-audit` | step 23 |
| agent | `wp-sgs-developer` | steps 12–19 |
| agent | `design-reviewer` | step 24 |
| mcp | Playwright | steps 21, 22, 24 (live canary, R-31-11 / R-31-13) |
| cli | `npm run build`, `python scripts/build-deploy.py --target sandybrown` | step 20 |
| cli | `python scripts/run-gates.py --tier all \| --list \| --assert-wired \| --self-test` | QA-1, QA-3, QA-6, step 25 |
| cli | `node scripts/audit-inline-styling.js --check` | QA-6 (G3) |
| cli | `node scripts/hover-guard/check.js` | QA-6 (G2) |
| cli | `node scripts/check-dead-controls.js --check` | QA-6 (G5) |
| cli | `node scripts/check-duplicate-controls.js` | QA-6 (G18) |
| cli | `npm run audit:element-manifest`, `python scripts/placement-reach.py` | QA-5 (G12) |

---

## ⛔ Binding rules for every step in this phase

1. **Cite code by SYMBOL, never by line.** `path/to/file.php::symbol_name` · `.json` → dot-path ·
   `.css` → literal selector. A line number may ride along as a hint, never as the anchor. Every
   step below and every pre-written prompt obeys this; so must every commit message and comment.
2. **A QA gate's `Check` is a runnable command.** Never "verify it looks right". A claim that says
   "verified" without the command that produced it is banned.
3. **Commit straight to `main`, explicit pathspec, never `git add -A`, never `git stash`, never a
   glob.** Pull/rebase + push after every completed step, not at the end. This tree is shared by
   concurrent sessions and a glob has already put `main` fatal for 5 minutes.
4. **No deprecations, no version bumps** (D270/D293 — the framework is pre-production).
5. **Never reason from what the canary currently renders** (Bean-locked 2026-08-31). A default is
   decided on merits. The one exception is where the spec *explicitly* makes the current render the
   requirement (G13's byte-identity proofs, §8.4's 8px radius) — those cite their own reason.
6. **Every subagent gets ONE directory it may write to, named in its prompt, plus an explicit
   "commit only these paths" pathspec.** A prohibition in a brief is not enforcement — pair it with
   a `git diff --stat` review by the dispatching session before the next step starts.

---

## Execution shape — where parallel applies and where it does not

```
WAVE A  (three independent lanes, all safe to run concurrently — zero file overlap)
  Lane 1  shared components + helpers   S3 ∥ S4 ∥ S5 ∥ S6        → QA-3 (G1 a–e)
  Lane 2  pure refactor (no features)   S7 → S8                  → QA-4 (split parity)
  Lane 3  manifest                      S9                       → QA-5 (qc-council + G4/G11/G12) → S10
  Lane 4  new detector                  S11 (WARN-ONLY)          → runs alone, gated at S25
                                               ↓
WAVE B  (two lanes, BOTH blocked on S9+S10 and on S7/S8 — they need FINAL attribute names
         and already-split files. They do NOT touch each other's files, so once unblocked
         they are genuinely parallel.)
  Lane 5  inspector   S12 (colour rows) → S13 (panels)
  Lane 6  render      S14 (CSS emission) → S15 (FR-41-15 census execution) → S16 (style.css)
                                               ↓                → QA-6 (static gate sweep)
WAVE C  (sequential — each needs the one before it in the live tree)
  S17 fixes (FR-41-13/10/11) → S18 migration notice → S19 comment hygiene (FR-41-19)
                                               ↓
WAVE D  (verification — the phase does not close on a green script)
  S20 build+deploy → S21 ∥ S22 (two Playwright lanes) → S23 stored-content migration
  → S24 Bean sign-off → S25 detector WARN→HARD → S26 docs + living-docs
```

**Why `edit.js` and `render.php` ARE safely parallel (Lane 5 ∥ Lane 6) and the manifest is NOT.**
Both lanes read the same `block.json`, but neither writes it, and after S9/S10 that file is frozen
for the rest of the phase. They write disjoint file sets (`edit.js` + its new sub-modules vs
`render.php` + its new `includes/` module + `style.css`). The single shared contract between them —
the Sweep predicate — is *declarative data* in `block.json::supports.sgs.sweepEligibility`
(FR-41-26), read mechanically by both, so neither lane can drift from the other by writing logic.
⛔ **They are NOT parallel before S10.** Building either against a draft attribute name means a
rename later, and a rename's blast radius is the whole write path (`a-renames-blast-radius-is-the-whole-write-path`).

**Why `/dispatching-parallel-agents` for Wave A and `/subagent-driven-development` for Waves B–C.**
Wave A is four-plus genuinely independent, well-specified, disjoint-file tasks with no review loop
between them — that is exactly the fan-out shape. Waves B and C are large, judgement-heavy edits on
files other sessions also touch, where each task wants an implementer plus a spec-compliance review
plus a code-quality review before the next task starts — the sequential per-task loop.

---

## Steps

---

### Step 1 — Re-run the FR-41-15 census against the CURRENT tree and diff it against the spec's table

```
  Model:       inline
  Action:      Run the spec's own statement-aware scan (FR-41-15's published Python) over
               plugins/sgs-blocks/src/blocks/nav-menu/render.php, and the whole-file declaration
               grep over .../style.css. Diff the result against the spec's 11-row CENSUSED table,
               its 7-row GATED table and its 7-row DISMISSED table.
  Files:       (read-only) src/blocks/nav-menu/render.php, src/blocks/nav-menu/style.css
               (write) .claude/verify/spec-41-census-baseline.md
               (write) .claude/verify/spec-41-baseline/   ← **G13's byte-identity baseline (PD-11)**
  Inputs:      Spec 41 FR-41-15 (the scan script + all three tables); §11 G13's four scenarios
  Outcome:     (i) A written baseline confirming every census disposition still matches the real
               code, OR a named list of rows that have MOVED since 0.4.5 was written. **(ii) The
               PRE-BUILD artefact G13 diffs against** — emitted CSS + computed values captured from
               a fixture set covering each of G13's four scenarios, saved under
               `.claude/verify/spec-41-baseline/`. ⛔ G13 asserts "byte-identical to a pre-0.4.x
               build"; without this capture there is nothing to be identical TO, and the gap only
               surfaces at step 22 where it is far more expensive to fix.
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        5 min
  Tooling:     Bash, python
  On-Fail:     If any row has moved, STOP and escalate to Bean before any edit. A fate table derived
               against a different tree state is the exact failure this step exists to catch.
  Cold-Entry:  .claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md §FR-41-15 · this plan file ·
               plugins/sgs-blocks/src/blocks/nav-menu/render.php
  Test:
    Happy:       scan prints 18 background/border-carrying statements in render.php → matches spec
    Edge:        a statement spans >5 physical lines → the joiner still reaches its `;`
    Fail:        a censused selector no longer exists in the file → recorded as MOVED, phase stops
    Integration: style.css grep returns 20 lines, 12 of them real declarations across 7 rules
```

> ✅ **Already run once while writing this plan: 18 statements, all nine numbered `render.php`
> census rows located at their described selectors, arithmetic (11 CENSUSED / 7 GATED / 7 DISMISSED
> = 25) reconciles.** Re-run it at execution time anyway — other sessions commit to this tree daily,
> and a baseline is only true as of the command that produced it.

---

### Step 2 — QA-1 / qc-council #1: validate this plan's fix-shapes empirically, BEFORE any dispatch

```
QA Gate — the BUILD PLAN's fix-shapes hold against the current codebase
  Model:   inline (+ /qc-council multi-rater)
  Exec:    SEQUENTIAL
  Deps:    step 1 complete
  Check:   Invoke /qc-council on THIS plan file with the mandate:
           "For each of steps 3-19, state the PREDICTED measurable outcome, the BASELINE
            measurement command, the VALIDATION command, and the commit gate. Flag any step whose
            fix-shape is a hypothesis rather than a spec. Specifically pressure-test:
            (a) does `require_once dirname(__DIR__,3).'/includes/nav-menu-css.php'` from a
                per-instance render.php actually ship through `wp-scripts --webpack-copy-php`, and
                does it survive a second block instance on one page?
            (b) does splitting edit.js break `inspector-scan/rules/31-golden-colour-control.js`,
                which resolves a row's state count from a LITERAL ArrayExpression — i.e. does moving
                colourRows into a sub-module put the literal out of the detector's reach (FR-41-2's
                `D738: the code improved and the gate went blind`)?
            (c) is `register_post_meta()` on `post`/`page` reachable from `useEntityProp` given this
                plugin's existing registrations all sit on sgs_product/product_variation/product?"
  Pass:    Every step 3-19 carries a predicted outcome + baseline + validation command. Council
           returns GO, or returns NO-GO with named fix-shapes, which are folded into this plan
           before any dispatch.
           ⛔ **The verdict is WRITTEN to `.claude/verify/spec-41-qc-council-1.md`** (PD-7) — the
           verdict, the per-step predicted-outcome/baseline/validation table, and every fix-shape
           folded back into this plan. Step 3's `Deps:` is THAT FILE EXISTING WITH A GO VERDICT, not
           a remembered conversation. A gate whose pass-condition lives only in scrollback is not a
           gate. (QA-5 does the same to `.claude/verify/spec-41-qc-council-2.md`.)
  Fail:    NO-GO → revise the named steps in this file, re-run the council on the revision. Do NOT
           dispatch a step the council flagged as a hypothesis.
  Marker:  QA
```

⚠ **The Hidden Decisions pass has already pre-empted part of this council's job, and found one thing
it should have caught: KJC-7 — `sgs_border_states_css()` has no edge parameter, so Step 15 rule 5 is
unimplementable as the spec words it.** Add that finding to this council's inputs rather than making
it re-derive it, and have it pressure-test the CHOSEN resolution (a block-private override rule)
rather than the refuted one.

⛔ **(b) is the highest-value question in this gate and it is not hypothetical.** `31-golden-colour-control.js`
resolves `statesArray.elements.length` on a **literal `ArrayExpression`**. If step 12 moves the
`colourRows` literal into a sub-module and passes it in as a prop, the detector may resolve nothing
and report the wrong state count while the code renders correctly — the "code improved, gate went
blind" shape (D738). **The answer determines whether step 7's split is allowed to move `colourRows`
at all**, which is why this council runs before step 7, not after.

---

### Step 3 — `SgsBorderControl` gains an additive `showColour` prop + re-parents `BorderStyleControl`

```
  Model:       sonnet
  Action:      Add `showColour` (boolean, default true) to
               `plugins/sgs-blocks/src/components/SgsBorderControl.js::SgsBorderControl`. When
               false, do not render the `.sgs-border-control__colour` FlexItem at all; instead
               render the existing shared `BorderStyleControl` as its own sibling in the same row,
               gated exactly as GradientCapableColourControl gates it today
               (`typeof onStyleChange === 'function'`). Document the TEN-prop ignore-list verbatim
               in the component's docblock (FR-41-33 item 1's table).
  Files:       plugins/sgs-blocks/src/components/SgsBorderControl.js  (ONLY)
  Inputs:      Spec 41 FR-41-33 items 1-3, FR-41-2(b); the live prop contract read from the file
  Outcome:     Every existing mount (which passes no `showColour`) renders byte-identically; a
               mount passing `showColour={false}` renders width + the shared BorderStyleControl +
               radius, and NO colour swatch.
  Exec:        PARALLEL with steps 4, 5, 6, 7, 11
  Deps:        step 2 (council GO)
  Marker:      (none)
  Time:        20 min
  Tooling:     /delegate, /subagent-prompt, Read/Edit, npm run build
  On-Fail:     `git checkout -- plugins/sgs-blocks/src/components/SgsBorderControl.js` ONLY if this
               step's agent is the sole writer of that file in this session — otherwise revert the
               specific hunk by hand. ⛔ Never `git checkout --` a shared-tree file blind.
  Test:
    Happy:       a mount with `showColour={false}` renders no GradientCapableColourControl
    Edge:        `showColour={false}` WITHOUT `onStyleChange` → renders no orphan style control
    Fail:        `showColour={false}` with `contrastAgainst` wired → the contrast check is inert;
                 the docblock must say so (this is the "dangerous one" in FR-41-33's table)
    Integration: all existing `<SgsBorderControl` mounts (roster re-derived live, never cached)
                 render byte-identical inspector output → G1(d)
```

**Prompt** (paste-and-run, `/subagent-prompt`-generated):

> You are editing ONE file: `plugins/sgs-blocks/src/components/SgsBorderControl.js`. You may not
> write any other file. Repo root: `c:\Users\Bean\Projects\small-giants-wp`.
>
> **Read first, in this order:** (1) `plugins/sgs-blocks/src/components/SgsBorderControl.js` in
> full — its whole prop contract; (2)
> `plugins/sgs-blocks/src/components/GradientCapableColourControl.js` — note how it gates its own
> `BorderStyleControl` child with `typeof onBorderStyleChange === 'function'`; (3)
> `plugins/sgs-blocks/src/components/BorderStyleControl.js` — prop contract is `{label?, value,
> onChange}`, `onChange` receives `''` on deselect; (4) `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md`
> §FR-41-33 and §FR-41-2(b).
>
> **Task.** Add one additive prop, `showColour` (boolean, **default `true`**). When it is `true`,
> the component must behave EXACTLY as it does today — this is the acceptance condition, not a
> nicety. When it is `false`:
> 1. Do not render the `.sgs-border-control__colour` FlexItem or its
>    `<GradientCapableColourControl>` at all. Omitting the colour props is NOT the same thing —
>    that renders an empty picker, which is the bug this prop exists to remove.
> 2. `borderStyle` currently travels INTO `GradientCapableColourControl` as
>    `borderStyle`/`onBorderStyleChange`. Suppressing the picker must not take border style with
>    it. Render `plugins/sgs-blocks/src/components/BorderStyleControl.js::BorderStyleControl` as
>    `SgsBorderControl`'s own sibling in the same row, forwarding `styleValue`/`onStyleChange`.
>    ⛔ Do NOT hand-roll a `SelectControl` — that component exists, is barrel-exported from
>    `plugins/sgs-blocks/src/components/index.js::BorderStyleControl`, and already has two live
>    adopters. A hand-rolled select would also re-widen the vocabulary from 3 icons back to the
>    9-option list an owner ruling deleted across 13 blocks.
>    ⚠ Gate the sibling on `typeof onStyleChange === 'function'`, mirroring
>    `GradientCapableColourControl`'s own gate — a caller that never wired border style must get no
>    orphan control.
> 3. Add to the component's docblock a verbatim ignore-list naming the TEN props that become inert
>    under `showColour={false}`: `colourStates`, `colourValue`, `onColourChange`,
>    `colourGradientValue`, `onColourGradientChange`, `colourLinked`, `colourLabel`, `clearable`,
>    `enableAlpha`, and the trio `contrastAgainst`/`contrastLabel`/`contrastLargeText`. Mark the
>    contrast trio explicitly as the dangerous one: a caller can wire a full WCAG contrast check
>    that then silently never runs, because the control performing it is not rendered.
>    ⛔ `borderStyle` is NOT on that list and must not be added to it — item 2 re-parents it.
>
> **Do not** edit `GradientCapableColourControl.js`, `BorderStyleControl.js`, or any block.
> **Do not** change any existing default. **Do not** run any git command.
>
> **Prove it before you report done:**
> - `cd plugins/sgs-blocks && npm run build` exits 0.
> - Re-derive the mount roster live and paste the output:
>   `grep -rln "<SgsBorderControl" plugins/sgs-blocks/src/` — ⚠ this under-counts by at least one
>   (`sgs/media` mounts it through the media-atom chain), so also
>   `grep -rn "SgsBorderControl" plugins/sgs-blocks/src/ --include=*.js | grep -v components/`.
> - Quote the exact diff hunks you wrote.
>
> **Report:** the diff, the build result, the live mount roster, and one sentence per ignore-list
> prop confirming it reaches `GradientCapableColourControl` and nothing else.

---

### Step 4 — `fx-magnet.css` exposes its own transition as `--sgs-magnet-transition`

```
  Model:       haiku
  Action:      In `plugins/sgs-blocks/assets/css/fx-magnet.css`, inside the existing
               `[data-sgs-fx="magnet"]` rule, declare `--sgs-magnet-transition: transform 180ms
               ease-out;` and change the existing `transition: transform 180ms ease-out;` to
               `transition: var( --sgs-magnet-transition );`. Change nothing else.
  Files:       plugins/sgs-blocks/assets/css/fx-magnet.css  (ONLY)
  Inputs:      Spec 41 FR-41-31 (the two-line addition block, verbatim)
  Outcome:     Every existing `[data-sgs-fx="magnet"]` element resolves a byte-identical computed
               `transition`; the value is now readable by a descendant consumer.
  Exec:        PARALLEL with steps 3, 5, 6, 7, 11
  Deps:        step 2 (council GO)
  Marker:      (none)
  Time:        5 min
  Tooling:     /delegate, Read/Edit
  On-Fail:     Revert the two lines by hand (do not `git checkout --` on a shared tree).
  Test:
    Happy:       computed `transition` on a live magnet element is unchanged
    Edge:        the custom property INHERITS to every descendant of the magnet element — assert a
                 child does not read it and conclude it is itself a magnet (FR-41-31's ⚠)
    Fail:        a mistyped property name leaves the file text intact while `var()` goes
                 unresolved — G1(e) asserts the COMPUTED value for exactly this reason
    Integration: nav-menu's own companion rule (step 16) carries the identical literal as its
                 `var()` fallback, so it is correct even if the property is never declared
```

**Prompt:**

> Edit exactly ONE file: `plugins/sgs-blocks/assets/css/fx-magnet.css`. Repo root:
> `c:\Users\Bean\Projects\small-giants-wp`.
>
> Read `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` §FR-41-31 (the block headed
> "The shared file therefore exposes the value it already owns") and the whole of the target file
> including its docblock, which explains WHY the duration is 180ms.
>
> Inside the existing `[data-sgs-fx="magnet"]` rule, make this exact change and nothing else:
> ```css
> [data-sgs-fx="magnet"] {
>   --sgs-magnet-transition: transform 180ms ease-out;
>   transition: var( --sgs-magnet-transition );
>   /* transform / will-change unchanged */
> }
> ```
> ⛔ Do not touch the `@media (prefers-reduced-motion: reduce)` rule. Do not change the duration.
> Do not add `!important`. Do not touch any other file. Do not run git.
>
> **Prove it:** paste the before/after of the rule, and paste
> `grep -rn 'data-sgs-fx="magnet"' plugins/sgs-blocks/ theme/ --include=*.css --include=*.php --include=*.js`
> so the dispatching session can see every element this change reaches.

---

### Step 5 — `SgsColourPanel` rows accept an optional `heading`

```
  Model:       haiku
  Action:      In `plugins/sgs-blocks/src/components/SgsColourPanel.js::SgsColourPanel`, allow a
               row descriptor to carry `heading: string`. When present, render a non-interactive
               sub-heading immediately before that row's control. A row omitting the key renders
               byte-identically to today.
  Files:       plugins/sgs-blocks/src/components/SgsColourPanel.js  (ONLY)
  Inputs:      Spec 41 FR-41-16
  Outcome:     nav-menu's single Colour panel can carry Menu / Submenu / Menu-button groupings
               (§9.6) without splitting into separate panels; no other block's output changes.
  Exec:        PARALLEL with steps 3, 4, 6, 7, 11
  Deps:        step 2 (council GO)
  Marker:      (none)
  Time:        15 min
  Tooling:     /delegate, Read/Edit, npm run build
  On-Fail:     Revert the hunk by hand.
  Test:
    Happy:       a row with `heading: 'Submenu'` renders the sub-heading above its control
    Edge:        `heading: ''` renders no heading (empty string is not "present")
    Fail:        `rows.filter(Boolean)` still drops falsy rows — a heading must not resurrect one
    Integration: at least three existing `SgsColourPanel` callers diff byte-identical → G1(a)
```

**Prompt:**

> Edit exactly ONE file: `plugins/sgs-blocks/src/components/SgsColourPanel.js`. Repo root:
> `c:\Users\Bean\Projects\small-giants-wp`. Read the file in full — including its docblock, which
> records that WordPress concatenates same-group Fills in mount order — and
> `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` §FR-41-16.
>
> **Task.** A row descriptor may now carry an optional `heading: string`. When it is a non-empty
> string, render a non-interactive sub-heading immediately BEFORE that row's control, inside the
> same single `PanelBody`. ⛔ Do not split into multiple `PanelBody`s. ⛔ Do not change the
> `rows.filter(Boolean)` behaviour. ⛔ Do not change any prop name or any existing default.
>
> A row that omits `heading` must render byte-identically to today — that is the acceptance
> condition (§11 G1(a)).
>
> Use the framework's existing heading idiom if one is already used elsewhere in `src/components/`
> for a non-interactive panel sub-label — grep for it first (`grep -rn "BaseControl.VisualLabel\|__experimentalHeading\|<Heading" plugins/sgs-blocks/src/components/`)
> and reuse what you find rather than inventing markup. Say in your report which idiom you reused
> and where you found it; if you found none, say so and state what you used instead.
>
> **Prove it:** `cd plugins/sgs-blocks && npm run build` exits 0, and paste
> `grep -rln "<SgsColourPanel" plugins/sgs-blocks/src/blocks/*/edit.js | wc -l` (live roster, never
> a cached count). Do not run git. Do not edit any block.

---

### Step 6 — The three PHP emitters gain an OPTIONAL third state (no `_3` family)

```
  Model:       sonnet
  Action:      Add a 4th `array $extra_states = []` parameter to
               `plugins/sgs-blocks/includes/helpers-tokens.php::sgs_emit_state_colour_css`; add an
               optional `current` key to `sgs_fill_decls()` / `sgs_text_decls()` and forward it
               from their `sgs_fill_states_css()` / `sgs_text_states_css()` wrappers; add the
               FLAT-PATH-ONLY third state to
               `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css`.
  Files:       plugins/sgs-blocks/includes/helpers-tokens.php
               plugins/sgs-blocks/includes/helpers-colour-variants.php
  Inputs:      Spec 41 FR-41-3 (a), (b), (c) + its three binding emitter rules
  Outcome:     All 122 existing `sgs_emit_state_colour_css()` call sites emit byte-identical CSS;
               a caller passing `$extra_states` gets `{selector}{suffix}{decls}` emitted BEFORE the
               hover rule, unguarded when `guarded` is false.
  Exec:        PARALLEL with steps 3, 4, 5, 7, 11
  Deps:        step 2 (council GO)
  Marker:      (none)
  Time:        35 min
  Tooling:     /delegate, /subagent-prompt, Read/Edit, php -l
  On-Fail:     Revert both files by hand; this is the step with the widest blast radius in Wave A
               (122 call sites) and must not be left half-applied.
  Test:
    Happy:       a caller passing `['current' => ['suffix' => '[aria-current="page"]', 'decls' =>
                 ['color:red'], 'guarded' => false]]` gets that rule emitted before the hover pair
    Edge:        `$extra_states = []` (the default) → byte-identical output, all 122 sites
    Fail:        `sgs_border_states_css()` on the RING path (any gradient set) must NOT attempt a
                 third state — the primitive takes exactly two paints. Assert it silently omits
                 Current there rather than emitting a broken rule
    Integration: `sgs_fill_decls()` with no `current` key in its `$map` returns an EMPTY current
                 bucket and the wrapper passes `[]` — a caller with no Current behaves as today
```

**Prompt:**

> You are editing TWO files and no others:
> `plugins/sgs-blocks/includes/helpers-tokens.php` and
> `plugins/sgs-blocks/includes/helpers-colour-variants.php`.
> Repo root: `c:\Users\Bean\Projects\small-giants-wp`.
>
> **Read first:** `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` §FR-41-3 in full (parts a, b,
> c, the three binding rules, and the specificity rule); then the current bodies of
> `helpers-tokens.php::sgs_emit_state_colour_css`, `::sgs_fill_decls`, `::sgs_text_decls`,
> `::sgs_fill_states_css`, `::sgs_text_states_css`, and
> `helpers-colour-variants.php::sgs_border_states_css`; then
> `plugins/sgs-blocks/includes/helpers-hover-state.php` (`sgs_hover_state_rules`,
> `sgs_hover_guarded_rule`, `SGS_HOVER_MEDIA`, `SGS_HOVER_NOT_TOUCH`).
>
> **⛔ There is no `_3` family.** Do not create `sgs_fill_states_css_3`, `sgs_text_states_css_3`,
> `sgs_border_states_css_3` or `sgs_emit_state_colour_css_3`. Four near-duplicate functions are
> four places for the next fix to be missed. The third state arrives as OPTIONAL parameters on the
> existing functions.
>
> **(a)** `sgs_emit_state_colour_css( string $selector, array $decls_normal, array $decls_hover,
> array $extra_states = [] ): string`. `$extra_states` maps `state_key => ['suffix' => string,
> 'decls' => string[], 'guarded' => bool]`. Each entry emits `{$selector}{$suffix}{…$decls}`,
> routed through `sgs_hover_state_rules()` when `guarded` is true and emitted plainly when false.
> ⛔ **Emit `$extra_states` BEFORE `$decls_hover`, inside the function** — ordering must be a
> property of the emitter, not of 122 call sites. The reason is in FR-41-3's specificity rule: both
> suffixes weigh the same, so a state-pair always ties and source order is the only tie-breaker.
> Emitting Current first means hover wins when a visitor points at the item for the page they are
> already on, which is behaviour already locked in `render.php`'s `$hover_targets` comment.
>
> **(b)** `sgs_fill_decls()` and `sgs_text_decls()` each gain a `current` key read from
> `$map['current']` (and `$map['current_gradient']` where the mechanism supports it), and a third
> `current` bucket in the returned array, **populated only when the caller's `$map` carries a
> `current` key**. Their `sgs_fill_states_css()` / `sgs_text_states_css()` wrappers forward that
> bucket into `$extra_states` when non-empty and pass `[]` when it is not.
>
> **(c)** `sgs_border_states_css()`: the third state is **FLAT-PATH ONLY**. When neither `gradient`
> nor `hover_gradient` is set, emit one extra `{sel}[aria-current="page"]{border-color:Z}` rule
> BEFORE the hover pair. When either gradient IS set the function delegates to
> `sgs_border_gradient_css()`, a masked `::before` ring taking exactly two paints — **Current is
> gradient-exempt at the ring level**; omit it silently there, do not attempt a third paint.
>
> **Binding rules you must obey:** every hover rule routes through a helper in
> `helpers-hover-state.php` — never a bare `{sel}:hover`. `:focus-visible` stays OUTSIDE both touch
> guards. The Current rule is never guarded.
>
> **⛔ The `[]` default is not a convenience, it is the acceptance condition.** Verify and paste:
> `grep -rn "sgs_emit_state_colour_css(" plugins/sgs-blocks --include=*.php | wc -l` (expected 122
> — re-derive it, do not trust this number). Every one of those must emit byte-identical CSS.
>
> **Prove it:** `php -l` clean on both files; write and run a throwaway PHP harness under
> `C:\Users\Bean\AppData\Local\Temp\claude\...\scratchpad\` (NOT in the repo) that calls each
> changed function with (i) no fourth argument and (ii) a populated one, and paste both outputs
> side by side. Delete the harness afterwards. Do not run git. Do not edit any block.

---

### Step 7 — Split `edit.js` into sub-modules (pure refactor, ZERO behaviour change)

```
  Model:       sonnet
  Action:      Extract `plugins/sgs-blocks/src/blocks/nav-menu/edit.js` (1,535 lines, against a
               250-line project limit) into sibling modules following the
               `plugins/sgs-blocks/src/blocks/cart/` precedent (`PanelSettingsControls.js`,
               `TriggerSettingsControls.js`). Suggested split: `colour-rows.js`,
               `panels-general.js`, `panels-design.js`, `typography-panel.js`,
               `submenu-panels.js`. ⛔ NO feature change, NO new attribute, NO new control.
  Files:       plugins/sgs-blocks/src/blocks/nav-menu/edit.js + new siblings in the SAME directory
  Inputs:      cart/ precedent; QA-1's answer to question (b) — the golden-colour detector's
               literal-ArrayExpression constraint
  Outcome:     `edit.js` ≤ 250 lines, every extracted module ≤ 250 lines, and the built editor
               bundle behaves identically — same panels, same order, same attribute writes.
  Exec:        SEQUENTIAL before step 8 (steps 7 and 8 are sequential WITH EACH OTHER inside Lane 2).
               Lane 2 as a whole runs CONCURRENTLY with Lanes 1, 3 and 4 (steps 3-6, 9, 11) — they
               share no file. (PD-5: the earlier wording read as self-contradictory.)
  Deps:        step 2 (`.claude/verify/spec-41-qc-council-1.md` exists with a GO verdict — its
               answer to question (b) is a hard input to this step)
  Marker:      (none)
  Time:        45 min
  Tooling:     /delegate, /subagent-prompt, Read/Edit/Write, npm run build,
               node scripts/inspector-scan/run.js --check
  On-Fail:     Revert to the pre-split `edit.js` by reverting THIS step's commit
               (`git revert <sha>`), not by `git checkout --`.
  Test:
    Happy:       editor renders the identical panel set in the identical order
    Edge:        `SgsColourPanel` must still be mounted BEFORE any other same-group
                 `<InspectorControls>` — WordPress concatenates same-group Fills in MOUNT order,
                 and a split that changes mount order silently reorders the inspector
    Fail:        `node plugins/sgs-blocks/scripts/inspector-scan/run.js --check` must still resolve
                 every colour row's state count. If the split moved `colourRows` out of literal
                 reach, the detector goes blind while the code renders fine (D738) → revert the
                 move, keep the literal where the detector can see it
    Integration: `node scripts/check-dead-controls.js --check` and
                 `node scripts/check-empty-inspector-containers.js --check` both still pass
```

**Prompt:**

> **This is a PURE REFACTOR. If you add, remove or change a single control, attribute or default,
> the step has failed regardless of what else you did.** Repo root:
> `c:\Users\Bean\Projects\small-giants-wp`. Your ONE writable directory is
> `plugins/sgs-blocks/src/blocks/nav-menu/`.
>
> **Context.** `edit.js` is 1,535 lines. The project limit for JS is 250 lines
> (`~/.claude/rules/code-quality.md`, and repo `CLAUDE.md`). Spec 41 is about to add ~40 net-new
> attributes and a full inspector rebuild to this file, so it must be split BEFORE that lands, not
> after.
>
> **Read first:** `plugins/sgs-blocks/src/blocks/cart/edit.js` together with its siblings
> `PanelSettingsControls.js` and `TriggerSettingsControls.js` — that is the established precedent
> in this codebase and the shape to copy. Then read
> `plugins/sgs-blocks/src/blocks/nav-menu/edit.js` in full. Then read
> `plugins/sgs-blocks/src/components/SgsColourPanel.js`'s docblock.
>
> **⛔ TWO CONSTRAINTS THAT WILL SILENTLY BREAK THINGS IF YOU MISS THEM:**
> 1. **`SgsColourPanel` must remain mounted BEFORE any other same-group `<InspectorControls>`.**
>    WordPress concatenates same-group Fills in MOUNT order. A split that changes which component
>    mounts first silently reorders the client's inspector, and nothing errors.
> 2. **`plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js` resolves a
>    colour row's state count as `statesArray.elements.length` on a LITERAL `ArrayExpression`.**
>    If you move the `colourRows` literal somewhere the detector's static analysis cannot follow,
>    the gate reports the wrong count while the editor renders correctly — the recorded
>    "code improved and the gate went blind" failure (D738). **Run
>    `node plugins/sgs-blocks/scripts/inspector-scan/run.js --check` before AND after your split and
>    paste both outputs.** If the after-run differs at all, put `colourRows` back where the detector
>    can see it and split something else instead.
>
> **Suggested module boundaries** (adjust if the file's real structure argues otherwise — say so if
> you do): `colour-rows.js` (the `colourRows` descriptor array — see constraint 2),
> `panels-general.js` (Menu source, Layout, Menu Button, Submenu behaviour, Accessibility),
> `panels-design.js` (Menu item, Effects, Featured), `typography-panel.js`, `submenu-panels.js`.
> Every file, including `edit.js` itself, must end ≤ 250 lines.
>
> **Prove it, with commands pasted:**
> - `wc -l plugins/sgs-blocks/src/blocks/nav-menu/*.js`
> - `cd plugins/sgs-blocks && npm run build` exits 0
> - `node scripts/inspector-scan/run.js --check` — before and after, identical
> - `node scripts/check-dead-controls.js --check` and
>   `node scripts/check-empty-inspector-containers.js --check` both pass
> - `git diff --stat -- plugins/sgs-blocks/src/blocks/nav-menu/` so the dispatching session can see
>   the whole blast radius
>
> Do NOT run any git command other than `git diff`/`git status` for reporting. Do NOT touch
> `render.php`, `block.json`, `style.css` or any file outside your one directory.

---

### Step 8 — Split `render.php`'s CSS emission into an `includes/` module (pure refactor)

```
  Model:       sonnet
  Action:      Extract the CSS-emission half of
               `plugins/sgs-blocks/src/blocks/nav-menu/render.php` (2,031 lines, against a 300-line
               PHP limit) into `plugins/sgs-blocks/includes/nav-menu-css.php`, required via
               `require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-css.php';` — the proven
               precedent (`sgs/product-card` requires `includes/product-card-builtin-render.php`).
               ⛔ PURE REFACTOR. Byte-identical emitted CSS.
  Files:       plugins/sgs-blocks/src/blocks/nav-menu/render.php
               plugins/sgs-blocks/includes/nav-menu-css.php (NEW)
               (possibly includes/nav-menu-markup.php — see KJC-1)
  Inputs:      KJC-1's ruling; the product-card require precedent; QA-1's answer to question (a)
  Outcome:     `render.php` ≤ 300 lines; every extracted module ≤ 300 lines; the emitted CSS for an
               unchanged set of attributes is byte-identical to the pre-split output.
  Exec:        SEQUENTIAL after step 7 (Lane 2's second and last step). Lane 2 as a whole runs
               CONCURRENTLY with Lanes 1, 3 and 4 (steps 3-6, 9, 11).
  Deps:        step 7 complete + reviewed; KJC-1 decided (its shipping-path half is already closed —
               PD-2; only the FR-41-21 wording conflict remains open)
  Marker:      (none)
  Time:        50 min
  Tooling:     /delegate, /subagent-prompt, Read/Edit/Write, php -l, build-deploy dry run
  On-Fail:     `git revert` this step's commit. ⛔ Do not hand-patch a half-applied split.
  Test:
    Happy:       emitted CSS for a fixture attribute set is byte-identical pre/post split
    Edge:        TWO nav-menu instances on one page (bar + drawer) — every extracted function must
                 sit behind `function_exists()`, because a top-level function declaration in a
                 per-instance render.php FATALS on the second instance
    Fail:        the module is not copied into `build/` by
                 `wp-scripts build --webpack-copy-php` → the front end 500s. Assert the file's
                 presence in `build/` (or in the plugin's shipped `includes/`) BEFORE deploying
    Integration: `php -l` clean; the canary renders both the bar and the drawer with no fatal
```

**Prompt:**

> **PURE REFACTOR — byte-identical emitted CSS is the acceptance condition.** Repo root:
> `c:\Users\Bean\Projects\small-giants-wp`. Writable files: exactly
> `plugins/sgs-blocks/src/blocks/nav-menu/render.php` plus the NEW file(s) you create under
> `plugins/sgs-blocks/includes/`.
>
> **Read first:** `plugins/sgs-blocks/src/blocks/nav-menu/render.php` in full;
> `plugins/sgs-blocks/src/blocks/product-card/render.php`'s `require_once dirname( __DIR__, 3 ) .
> '/includes/…'` lines and the file they pull in — that is the precedent;
> `plugins/sgs-blocks/includes/product-card-builtin-render.php`'s own structure.
>
> **Why `includes/` and not a sibling partial in the block folder:** the `includes/` route is
> proven to ship (the whole directory is part of the plugin), whereas nothing in this repo proves
> `wp-scripts build --experimental-modules --webpack-copy-php` copies an arbitrary sibling `.php`
> next to `render.php`. Do not experiment with the unproven route.
> ✅ **The path arithmetic is verified in BOTH trees:** `dirname( __DIR__, 3 )` resolves to
> `plugins/sgs-blocks` from `src/blocks/nav-menu/render.php` AND from
> `build/blocks/nav-menu/render.php` — both put the block folder exactly three levels down, and the
> built copy already exists on disk.
>
> **⛔ WHERE THE SPLIT GOES.** `render.php` carries an explicit section banner —
> **`── 4. Scoped CSS assembly`**. Split there: everything from that banner to the end of the CSS
> assembly moves to `includes/nav-menu-css.php`; the class definition and the markup-rendering
> methods above it stay in `render.php`. ⚠ **Grep for the banner, do not use a line number**
> (`grep -n "Scoped CSS assembly" plugins/sgs-blocks/src/blocks/nav-menu/render.php`) — other
> sessions commit to this file daily. If the byte-identity harness fails at that boundary, **move the
> boundary; do not patch the output.**
>
> **⚠ One load-order note that must go into the new file as a comment.**
> `helpers-tokens.php`, `helpers-hover-state.php` and `helpers-colour-variants.php` are all required
> globally at plugin bootstrap (via `includes/render-helpers.php`). `nav-menu-css.php` is NOT — it is
> `require_once`'d per-instance from `render.php`, matching product-card's pattern. So its functions
> are only in scope after nav-menu's own `render.php` has run at least once on that page load. That
> is fine today (nothing else calls into nav-menu internals) — **write the note in the file**, or a
> future cross-block call fatals for a reason nobody will find.
>
> **⛔ THE FATAL YOU WILL CAUSE IF YOU MISS THIS.** A top-level `function` declaration inside a
> per-instance `render.php` fatals on the SECOND instance of the block on one page — and this page
> genuinely has two (the header bar and the drawer's own seeded instance). Every function you
> extract must be declared inside the `includes/` file, and that file must be `require_once`'d, and
> each function wrapped in `if ( ! function_exists( 'sgs_nav_menu_…' ) )`. This codebase does that
> everywhere else; match it.
>
> **Naming:** prefix every extracted function `sgs_nav_menu_` (hook/function prefix rule, repo
> `CLAUDE.md` naming conventions).
>
> **Prove byte-identity, do not assert it.** Before you split: build a fixture attribute array
> covering at minimum an item background + hover, a featured item, a submenu with a min-width, a
> burger with a hover colour, and the drawer fork; capture the emitted CSS string. After the split:
> capture it again from the same fixture. `diff` them and paste the (empty) diff. Run the harness
> from `C:\Users\Bean\AppData\Local\Temp\claude\...\scratchpad\`, never from the repo, and delete it
> when done.
>
> **Also prove:**
> - `wc -l plugins/sgs-blocks/src/blocks/nav-menu/render.php plugins/sgs-blocks/includes/nav-menu-*.php`
>   — every file ≤ 300 lines
> - `php -l` clean on every file you touched
> - `cd plugins/sgs-blocks && npm run build` exits 0, and the new `includes/` file is present in the
>   shipped tree — paste the `ls` proving it
> - `git diff --stat` for reporting only
>
> ⛔ Do NOT change any CSS declaration, any selector, any guard condition, or any attribute read.
> ⛔ Do NOT run git beyond `diff`/`status`. ⛔ Do NOT touch `edit.js`, `block.json` or `style.css`.

---

### Step 9 — `block.json` manifest rewrite (deletions + ~40 net-new + elements + `sweepEligibility`)

```
  Model:       sonnet
  Action:      Rewrite `plugins/sgs-blocks/src/blocks/nav-menu/block.json::attributes` and
               `::supports.sgs.elements` per Spec 41 §8.3 (DELETED), §8.4 (NET-NEW), §8.6(a)-(g).
               Delete the `underline` element entirely. Add the `submenu-panel` element. Add
               `supports.sgs.sweepEligibility`. Extend `colourExemptions`.
  Files:       plugins/sgs-blocks/src/blocks/nav-menu/block.json  (ONLY)
  Inputs:      Spec 41 §8.3, §8.3a, §8.4, §8.4a, §8.5, §8.6(a)-(g); FR-41-25, FR-41-26, FR-41-30-34
  Outcome:     Manifest carries every net-new attribute at its declared type/default, zero
               references to any deleted attribute, `underline` element gone, `submenu-panel`
               element present, `sweepEligibility` declared with three rows.
  Exec:        PARALLEL with steps 3-8, 11 (no file overlap); SEQUENTIAL before everything in Wave B
  Deps:        step 2 (council GO)
  Marker:      (none)
  Time:        60 min
  Tooling:     /delegate, /subagent-prompt, Read/Edit, python -m json.tool
  On-Fail:     `git revert` this step's commit. This is the HIGHEST-blast-radius step in the phase
               — it is why QA-5 sits immediately after it and nothing proceeds past it unreviewed.
  Test:
    Happy:       `python -m json.tool block.json` parses; **every §8.4 row and every
                 FR-41-22(a) row present, BY NAME, at its exact type and default.** ⛔ Do NOT
                 target an attribute COUNT (PD-3) — a builder chasing a number invents or drops an
                 attribute to reach it, and a count in prose is a copy that rots. The current count
                 (79) is a baseline for the diff, never a target for the result
    Edge:        `itemBorderRadius` default is a FLAT corner object of CSS length STRINGS
                 (`{"topLeft":"8px",…}`) — NOT the 57-strong `{"desktop":{}}` tier envelope, which
                 `sgs_corner_object_shorthand()` cannot read and would silently return null for
    Fail:        an `enum` on any small string attribute → WP coerces an out-of-enum stored value
                 back to the default with NO error, which bites hardest via the cloning pipeline
                 writing the attribute directly. Every treatment/mode/animation attribute is plain
                 `"type":"string"`, PHP-validated
    Integration: `states.current` maps DIFFERENT attribute names from `states.hover` — the
                 classifier's `_record()` is LAST-WRITE-WINS and a byte-identical state map
                 silently retags the hover attributes (this block's own `item._note` records it
                 happening once already). G4 is the negative control
```

**Prompt:**

> You are editing ONE file: `plugins/sgs-blocks/src/blocks/nav-menu/block.json`. Nothing else.
> Repo root: `c:\Users\Bean\Projects\small-giants-wp`. This is the highest-blast-radius edit in the
> whole build: everything downstream is written against the names you declare here, and a rename
> later costs the entire write path (the cloning converter emits these names too).
>
> **Read, in full, before editing:** `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` §8 entire
> (8.1 through 8.6g), plus FR-41-25, FR-41-26 (the `sweepEligibility` JSON block verbatim),
> FR-41-30, FR-41-31, FR-41-33, FR-41-34. Then read the current `block.json` in full.
>
> **DELETE (§8.3) — all of these, with NO deprecation (project policy D270, pre-production):**
> `hoverStyle` · `underlineColour` · `underlineColourHover` · `underlineColourGradient` ·
> `underlineThickness` · `underlineOffset` · `itemRadius` · `itemRadiusHover` · `submenuRadius` ·
> `indicatorStyle` · `indicatorColour` · `indicatorColourGradient`.
> ⛔ The whole `indicator*` family is in this sweep. `indicatorStyle` is an EXISTING shipped
> attribute carrying real stored values on client pages; omitting it is how a client's pill setting
> disappears with no explanation and no failing gate.
>
> **DECLARE (§8.4)** every net-new attribute at exactly the type and default in that table. Four
> that a builder gets wrong:
> - `itemFontWeightCurrent` / `itemFontWeightHover` / `submenuFontWeightHover` are
>   `"type":"string"`, **not number** — the sibling `itemFontWeight` is `{"type":"string","default":""}`,
>   and a number-typed sibling is a second vocabulary for one property.
> - `itemBorderRadius` default is **`{"topLeft":"8px","topRight":"8px","bottomRight":"8px","bottomLeft":"8px"}`**
>   — a FLAT corner object of CSS length STRINGS, the `sgs/product-card::ctaBorderRadius` shape read
>   by `sgs_corner_object_shorthand()`. ⛔ NOT `{"desktop":{}}`: 57 attributes in this tree carry
>   that shape and every one is a BLOCK-ROOT radius read by `sgs_border_radius_tiers()`. Using it
>   here would produce a tier envelope with no corner keys, and the radius would VANISH silently
>   rather than erroring.
> - `submenuBorderRadius` keeps `{}` — do not read the item's new default as a reason to give the
>   panel one.
> - All six `showHover` trio attributes default `""`. ⛔ `itemTextDecorationHover` does NOT default
>   to `"underline"`; that would reinstate the underline as the block's shipped hover signal, which
>   is precisely what this spec removes.
> - `submenuFontSize` and `submenuLetterSpacing` are `{"type":"object","default":{}}` — TIER
>   OBJECTS. ⛔ Do NOT declare `submenuFontSizeTablet`/`…Mobile` or `itemFontSizeTablet`/`…Mobile`;
>   §8.4a proves those would be attributes with zero writers and zero readers. `submenuLineHeight`
>   mirrors `itemLineHeight` as `{"type":"number"}` — deliberately un-migrated on both, symmetrical.
>
> **⛔ NO JSON `enum` on any of the new small string attributes** (`triggerMode`,
> `submenuAnimation`, every `…HoverTreatment`, `borderHoverAnimationDirection`, the six trio
> members). PHP-validate instead. `render.php`'s own `$allowed_hover_styles` comment records the
> reason: an out-of-enum stored value silently coerces to the block.json default with no error, and
> that bites hardest via a programmatic writer (the cloning pipeline, pattern files) setting the
> attribute directly. ⚠ The ONE exception is the EXISTING `itemTextDecoration`, which carries a real
> enum today and KEEPS it — add `"overline"` as a fifth value to match `SGS_TEXT_DECORATION_OPTIONS`
> and the PHP allowlist in `sgs_typography_css_rule()`.
>
> **`supports.sgs.elements` (§8.6):**
> (a) `item` — add `"border"` to `clusters` (without it the forward-resolution pass never visits
>     `css:border-*` and the attrMap is never consulted; this block's own `indicator` element
>     records that exact trap). Repoint base `css:border-radius` → `itemBorderRadius` and **REMOVE
>     the `states.hover` border-radius entry entirely**. Add base `css:border-color`/`-width`/`-style`,
>     base `css:text-decoration` → `itemTextDecoration`, base `css:text-transform` →
>     `itemTextTransform` (both genuinely absent today). ⛔ **Base `css:font-weight` →
>     `itemFontWeight` ALREADY EXISTS and must SURVIVE** — do not drop it when adding the two state
>     siblings; a state entry with no base is the STATE_WITHOUT_BASE shape the manifest gate flags.
>     Add `states.hover` and a NEW `states.current`, per §8.6(a)'s table.
>     ⛔ **Every state member is EXPLICIT — never left to the `{prefix}Suffix` convention.** Base and
>     hover would otherwise both derive to `(text-decoration, item, state=NULL)` and collide on ONE
>     routing slot. This block's own manifest `_note`s record that exact collision happening TWICE
>     (`burgerColour`+`burgerColourHover`; `submenuColour`+`submenuColourHover`).
>     ⛔ **`states.current` must map DIFFERENT attribute names from `states.hover`.** The classifier's
>     `_record()` is LAST-WRITE-WINS; a byte-identical `selected` map was removed on 2026-08-19
>     because it silently overwrote the hover derivation and tagged three attributes with a state
>     they never render in.
> (b) `sublink` — add `states.current`, add `"fill"` to clusters, add the fill family across base +
>     both states, add the base typography members AND the three hover trio members (FR-41-22c's
>     full list). ⚠ `"prefix": ""` STAYS — a `submenu` prefix would wrongly re-claim
>     `submenuAlign`/`Caret`/`CloseGrace`/`MinWidth`/`Radius`/`Padding`, which belong to the PANEL.
>     Every member here is explicit by necessity.
> (c) NEW `submenu-panel` element: claims `submenuBg`, the four `submenuBorder*`, and the two shadow
>     attrs, all base-only. Clusters `["fill","border","layout"]`, `"prefix": ""`, **NO `states` key
>     at all**.
> (d) **DELETE the `underline` element outright** — the whole entry, not a note correction.
> (e) The `burger` element gains NOTHING for `triggerMode`/`triggerLabel`/`triggerIcon`/the three
>     `triggerMagnet*` — none is a CSS property, and declaring them creates phantom routing slots.
> (g) Add `supports.sgs.sweepEligibility` with exactly the three rows and three keys in FR-41-26's
>     JSON block. ⛔ It is NOT an `elements` entry and routes nothing — it sits beside
>     `colourExemptions` / `hideExtensions` / `boxFamilies`. ⛔ Write
>     `"blockingBackgroundAttrs": []` for `itemColourHoverTreatment` EXPLICITLY — a missing key and
>     an empty array must not be distinguishable by accident.
>
> Also extend `supports.sgs.colourExemptions`: keep `submenu-bg` and `indicator`, sharpen
> `submenu-bg`'s reason to name `submenuLinkBg*` as where the hoverable surface actually is, and add
> a matching entry for the panel's border under the same reasoning.
>
> Also update `supports.sgs.elements.item._note` and `.sublink._note` per FR-41-19 — state what the
> code does NOW, cite FR-41-1 and Spec 41, name `itemColourCurrent`/`itemBgCurrent`/
> `itemFontWeightCurrent`. ⛔ **No retirement narration** — do not write "this used to have no
> current-page colour". ⚠ The stale citation in `item._note` is `FR-35-5`, not `FR-36-5` — read it in
> the file before editing it.
>
> **Prove it, commands pasted:**
> - `python -m json.tool plugins/sgs-blocks/src/blocks/nav-menu/block.json > /dev/null` exits 0
> - `python -c "import json;d=json.load(open('plugins/sgs-blocks/src/blocks/nav-menu/block.json'));print(len(d['attributes']));print(sorted(d['supports']['sgs']['elements']))"`
> - `grep -nE '"(hoverStyle|underline[A-Za-z]*|itemRadius|itemRadiusHover|submenuRadius|indicatorStyle|indicatorColour|indicatorColourGradient)"' plugins/sgs-blocks/src/blocks/nav-menu/block.json`
>   returns NOTHING
> - For every attribute named in `sweepEligibility`, assert it resolves to a real entry in
>   `attributes` — paste a name-by-name check. A typo there reads as permanently empty, so the
>   predicate always passes and the eligibility rule silently ceases to exist.
>
> Do NOT edit `edit.js`, `render.php` or `style.css`. Do NOT run `/sgs-update` (that is step 10).
> Do NOT run git beyond `diff`/`status`.

---

### Step 10 — QA-5 / qc-council #2 (Bean-mandated) + `/sgs-update` reseed + DB assertions

```
QA Gate — the manifest is correct AND the derived DB agrees with it
  Model:   inline (+ /qc-council multi-rater, + haiku for the mechanical DB assertions)
  Exec:    SEQUENTIAL
  Deps:    step 9 complete
  Check:   1. /qc-council on the step-9 diff with the mandate: "This manifest change deletes 12
              attributes that carry stored values on live client pages and adds ~40. Find every
              place a deleted name is still read, every new name whose type/default disagrees with
              its sibling, and every element-state map that could collide on one routing slot."
           2. `python plugins/sgs-blocks/scripts/sgs-update-v2.py`   (the /sgs-update reseed)
           3. `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT COUNT(*) FROM
              block_attributes WHERE block_slug='sgs/nav-menu' AND css_element='underline'"` → 0
           4. `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT attr_name,
              css_property, css_element, css_state FROM block_attributes WHERE
              block_slug='sgs/nav-menu' AND attr_name IN ('itemColourHover','itemBgHover',
              'itemColourCurrent','itemBgCurrent','itemBorderColourCurrent','itemFontWeight',
              'itemFontWeightHover','itemFontWeightCurrent','itemTextDecoration',
              'itemTextDecorationHover','itemTextTransform','itemTextTransformHover',
              'submenuFontWeight','submenuFontWeightHover','submenuTextDecoration',
              'submenuTextDecorationHover','submenuTextTransform','submenuTextTransformHover')"`
           5. `cd plugins/sgs-blocks && npm run audit:element-manifest`
           6. `python plugins/sgs-blocks/scripts/placement-reach.py --block sgs/nav-menu`
  Pass:    Council GO. (3) returns 0 → **G11**. (4) returns rows whose
           `(css_property, css_element, css_state)` triples are ALL DISTINCT — assert the
           DISTINCTNESS, not merely that N rows exist → **G4**. (5) passes and (6) reports no NEW
           CONTESTED attributes → **G12**.
  Fail:    Any of 3-6 fails → fix `block.json` and RE-RUN `/sgs-update`. ⛔ Never patch a DB row
           directly: a raw row does not survive the next reseed
           (`a-raw-db-update-does-not-survive-a-reseed`). Fix the declaration it derives from.
  Marker:  QA  ·  Time: 30 min
```

⛔ **G4 is a NEGATIVE CONTROL and must be RUN, not reasoned about.** The collision it catches does
not delete a row. `_record()` is last-write-wins, so it silently retags one attribute with another's
state and both rows survive looking entirely plausible. Assert the twelve typography triples are
twelve DISTINCT `(css_property, css_element, css_state)` tuples. ⚠ `itemFontWeight`'s base row is the
one to check hardest — it is the only base member that existed before this spec, so it is the one a
builder is most likely to drop while adding its two state siblings.

> ⛔ **NOTHING IN WAVE B STARTS UNTIL THIS GATE PASSES.** This is Bean's explicit requirement: the
> manifest step has the highest blast radius in the phase (existing client content on the canary,
> shared components, the cloning converter's write path) and must not proceed unreviewed.

---

### Step 11 — Build `check-ungated-paint-rules.py`, WARN-ONLY, framework-wide

```
  Model:       sonnet
  Action:      Create `plugins/sgs-blocks/scripts/check-ungated-paint-rules.py` with `--survey`,
               `--check` and `--self-test`, reusing FR-41-15's corrected statement-aware scan
               verbatim. Wire it into `plugins/sgs-blocks/scripts/gates.json` and `package.json`.
               ⛔ **Land it WARN-ONLY** (exit 0 with findings printed) per the spec's own build
               sequencing — it is flipped to a hard gate at step 25, after the tree is clean.
  Files:       plugins/sgs-blocks/scripts/check-ungated-paint-rules.py (NEW)
               plugins/sgs-blocks/scripts/gates.json
               plugins/sgs-blocks/package.json
               plugins/sgs-blocks/scripts/fixtures/ungated-paint/ (NEW — self-test fixtures)
  Inputs:      Spec 41 FR-41-35 (a)-(g); FR-41-15's scan script + its three-bucket output form
  Outcome:     `--survey` enumerates every block in all three buckets and PRINTS its own
               variable-awareness limit; `--check` reports findings and exits 0 (warn-only);
               `--self-test` proves census #4, #6, #8 each FAIL and a cleaned copy PASSES;
               `npm run gate:list` shows the gate.
  Exec:        PARALLEL with steps 3-9 (touches no file any other step touches)
  Deps:        step 2 (council GO)
  Marker:      (none)
  Time:        70 min
  Tooling:     /delegate, /subagent-prompt, Write/Edit, python, npm run gate:list
  On-Fail:     `git revert` this step's commit. A half-wired gate is worse than none — it reads as
               covered while covering nothing.
  Test:
    Happy:       `--check` over the pre-fix tree finds all 11 nav-menu censused rules
    Edge:        each exemption in FR-41-35(d) gets its own fixture proving it does not OVER-match
    Fail:        `--self-test` asserts census #4/#6/#8 fixtures EXIT NON-ZERO **and** that a
                 cleaned copy exits 0. ⛔ Both directions — a detector that stopped detecting
                 returns 0 exactly like a clean tree
    Integration: `npm run gate:list` shows it with tier + measured cost. ⛔ A `package.json` grep
                 is a FALSE POSITIVE since the 2026-08-24 gates.json split
```

**Prompt:**

> You are building ONE new framework-wide gate script and wiring it. Repo root:
> `c:\Users\Bean\Projects\small-giants-wp`. Writable paths, and no others:
> `plugins/sgs-blocks/scripts/check-ungated-paint-rules.py` (new),
> `plugins/sgs-blocks/scripts/fixtures/ungated-paint/` (new dir),
> `plugins/sgs-blocks/scripts/gates.json`, `plugins/sgs-blocks/package.json`.
>
> **Read first:** `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` §FR-41-35 in full and
> §FR-41-15 in full (the corrected methodology, the history table of three failed bounds, the three
> published buckets, and the disclosed residual). Then read a sibling Python gate for house style —
> `plugins/sgs-blocks/scripts/check-dead-api-calls.py` and
> `plugins/sgs-blocks/scripts/check-render-undefined-vars.py`. Then read
> `plugins/sgs-blocks/scripts/gates.json` (a JSON LIST of gate objects, 106 entries) and
> `plugins/sgs-blocks/scripts/run-gates.py`.
>
> **What it detects.** A `background` or `border` declaration EMITTED (PHP) or AUTHORED (`style.css`)
> ungated on a selector carrying no corresponding operator attribute. Both surfaces, one run.
>
> **⛔ Reuse FR-41-15's corrected scan logic verbatim — do not reinvent it.** It is STATEMENT-AWARE:
> it joins each `$css .=` / `sgs_hover_guarded_rule` / `sgs_hover_state_rules` statement to its
> terminating `;` BEFORE testing for a declaration. The spec's history table names three bounds that
> each hid a real rule — a literal-string scan, a line-RANGE `awk`, and a line-ANCHORED grep. **A
> re-implementation that does not join statements reproduces the 0.4.4 failure exactly**, because
> two of the missed rules are multi-line concatenations whose `background:` sits on a different
> physical line from its `$css .=`, with a `//` comment in between.
>
> **⛔ It must PRINT its own limit.** The scan is statement-aware but NOT variable-aware: a
> declaration accumulated into an intermediate PHP variable and appended to `$css` in a later
> separate statement is outside what it can see. `sgs/nav-menu`'s `$sgs_nm_featured_vars` assembly is
> a live instance. `--survey` output must state this limit explicitly rather than letting a reader
> infer completeness. A census that overstates its own reach is the defect this detector exists to
> end.
>
> **Modes:**
> - `--survey [--block sgs/x]` — emits the census in FR-41-15's exact three-bucket form. Per hit:
>   source file, selector, verbatim declaration, bucket. ⛔ **All three buckets always** — CENSUSED,
>   GATED (with the `if` named), DISMISSED (with the reason AND the condition that would return it
>   to the census). An omission is indistinguishable from an oversight.
> - `--check` — **WARN-ONLY FOR NOW: print every finding and EXIT 0.** Put the hard-fail behind a
>   single named module constant, e.g. `HARD_FAIL = False  # flipped to True by Spec 41 phase step
>   26, once FR-41-15's eleven rules are out of the tree (gate G20c)`, so step 26 changes one line
>   and nothing else. Do not make it fail the build today: the tree still contains the eleven
>   nav-menu rules step 16 has not yet removed, and a gate that always fails is a gate nobody reads.
> - `--self-test` — negative controls are FR-41-15 census **#4, #6 and #8**. Build a fixture per
>   control. ⛔ **Assert each fixture makes the check FAIL, and assert a cleaned copy of the same
>   fixture PASSES.** Both directions, or the self-test is vacuous. Add one fixture per exemption
>   in (d) proving it does not OVER-match.
>
> **Exemptions — build each as a GENERIC rule keyed on selector shape or on `supports.sgs`, never on
> a block name:** resets to `none`/`0`/`transparent` with no competing operator value ·
> zero-specificity `:where()` defaults · forced-colors and `@supports` a11y rules · wrapper-delegated
> blocks (the block declares a `supports.sgs` container kind and the paint belongs to
> `SGS_Container_Wrapper`) · attribute-driven `var()` **whose custom property has a real,
> empty-guarded writer**.
> ⛔ **That last one must VERIFY THE WRITER EXISTS, not merely that a `var()` is present.** Census #8
> is the worked counter-example: `--sgs-nm-featured-bg-hover` has no writer anywhere in `src/`, so
> the rule can only ever paint its own hardcoded fallback. A `var()` with no writer is a hardcode
> wearing a costume, and a syntax-only exemption would have cleared it.
> ⛔ **If you find yourself writing `.sgs-nav-menu__` into an exemption, you have written a nav-menu
> lint, not a gate.** Stop and generalise. (Precedent: D649 — two attempts to widen
> `check-hardcoded-render-defaults.js` were built and reverted the same day because
> string-coincidence matches collided with real enums.)
>
> **⛔ It does NOT extend `check-hardcoded-render-defaults.js`.** That gate runs the INVERSE
> direction — *attribute exists → is its property also hardcoded?* — and all three of census #4/#6/#8
> pass it clean because none has a matching attribute on its own selector. This one asks
> *declaration exists → does a governing attribute exist?*
>
> **Wiring.** Add an entry to `gates.json` with `id` / `cmd` / `tier: "fast"` / `added_D` /
> `added_commit` / `budget_ms` / `order` populated (copy the field shape from a neighbouring entry),
> plus the standalone `package.json` alias every sibling gate carries.
> ⛔ **Prove it is REACHABLE with `npm run gate:list`, not with a `package.json` grep** — since the
> 2026-08-24 gates.json split that grep returns a false positive in precisely this direction, and
> this repo has already shipped a detector that sat unreachable for three weeks (D338/D493).
>
> **Prove it, commands pasted:**
> - `python plugins/sgs-blocks/scripts/check-ungated-paint-rules.py --self-test` passes
> - `python plugins/sgs-blocks/scripts/check-ungated-paint-rules.py --survey --block sgs/nav-menu`
>   — paste the output; it must contain all 11 of FR-41-15's censused rules
> - `python plugins/sgs-blocks/scripts/check-ungated-paint-rules.py --survey` with no filter
>   enumerates every block
> - `cd plugins/sgs-blocks && npm run gate:list` shows the new gate
> - `grep -c "sgs-nav-menu" plugins/sgs-blocks/scripts/check-ungated-paint-rules.py` → **0**
>   (fixtures live in their own directory, not in the source)
>
> Do NOT run git beyond `diff`/`status`. Do NOT touch any block file.

---

### Step 12 — QA-3 / Wave A close: the five G1 byte-identity proofs + split parity

```
QA Gate — zero blast radius on shared code, and the two splits changed nothing
  Model:   sonnet (multi-file review) + inline (architectural judgement on any delta)
  Exec:    SEQUENTIAL
  Deps:    steps 3, 4, 5, 6, 7, 8 complete
  Check:   G1(a) diff ≥3 existing `SgsColourPanel` callers' rendered inspector output pre/post —
             roster live: `grep -l "<SgsColourPanel" plugins/sgs-blocks/src/blocks/*/edit.js`
           G1(b) `grep -rn "sgs_emit_state_colour_css(" plugins/sgs-blocks --include=*.php | wc -l`
             re-derives the count; every site emits byte-identical CSS with the 4th param defaulted
           G1(c) `sgs_fill_states_css()` / `sgs_text_states_css()` / `sgs_border_states_css()`
             byte-identical for every caller whose `$map` has no `current` key
           G1(d) diff ≥3 existing `SgsBorderControl` mounts pre/post (roster live; ⚠ that grep
             under-counts — `sgs/media` mounts it through the media-atom chain). Also assert
             `BorderStyleControl`'s OWN adopters (`DesignTokenPicker.js`,
             `GradientCapableColourControl.js`) are unaffected — neither file is edited
           G1(e) on a live magnet element, `getComputedStyle(el).transition` is byte-identical
             pre/post the `fx-magnet.css` change. ⛔ **Assert the COMPUTED value, not that the file
             still contains `180ms`** — a mistyped property name leaves the text intact and the
             `var()` unresolved, and every magnet element OTHER than the burger would silently lose
             its transition
           SPLIT PARITY: emitted CSS byte-identical pre/post step 8 on the step-8 fixture set;
             `node scripts/inspector-scan/run.js --check` identical pre/post step 7;
             `wc -l` on every nav-menu JS ≤ 250 and every nav-menu PHP ≤ 300
  Pass:    All five G1 proofs show zero delta; both split parity checks show zero delta.
  Fail:    Any non-zero delta → revert the offending step's commit and re-dispatch it with the
           delta named. ⛔ Do NOT hand-patch a subagent's output; revert and re-run
           (`revert-and-rerun-a-codemod-dont-hand-patch-its-output`).
  Marker:  QA  ·  Time: 30 min  ·  Tooling: /verify-loop (2 attestations per proof), Playwright
```

---

### Step 13 — `edit.js`: colour rows, 3-state, hover-treatment selectors, `sweepEligibility` read

```
  Model:       sonnet
  Action:      Rebuild the `colourRows` descriptor per Spec 41 §9.6 — every stateful row gets its
               third state and its paired hover-treatment `ToggleGroupControl`; the three Sweep
               rows read `block.json::supports.sgs.sweepEligibility` from the imported manifest and
               OMIT the Sweep segment when the predicate is false.
  Files:       plugins/sgs-blocks/src/blocks/nav-menu/colour-rows.js (+ edit.js wiring)
  Inputs:      Spec 41 §9.6 table, FR-41-2, FR-41-14, FR-41-16, FR-41-23, FR-41-25, FR-41-26,
               FR-41-33; the frozen `block.json` from step 9
  Outcome:     The Colour panel renders the §9.6 table exactly — three groupings via FR-41-16
               headings, every row's states and treatment selector as specified.
  Exec:        PARALLEL with steps 15, 16, 17 (Lane 6); SEQUENTIAL before step 14
  Deps:        step 10 (manifest frozen + reviewed), step 12 (Wave A closed)
  Marker:      SESSION-START
  Time:        75 min
  Tooling:     /delegate, /subagent-prompt, wp-sgs-developer agent, /subagent-driven-development
  On-Fail:     `git revert` this step's commit.
  Cold-Entry:  this plan file · Spec 41 §9.6 + FR-41-23/25/26 · the frozen `block.json` ·
               `plugins/sgs-blocks/src/blocks/nav-menu/colour-rows.js` ·
               `plugins/sgs-blocks/src/blocks/icon-list/edit.js::Edit` (the omit-not-disable
               reference implementation, D609 field 9c)
  Test:
    Happy:       Item text renders 3 states + a 3-segment treatment selector
    Edge:        under `itemBgHoverTreatment === 'highlight'` the Background row's CURRENT state is
                 OMITTED while Normal and Hover still render — per-STATE, never per-ROW
    Fail:        set `submenuLinkBg` → the submenu-link-text row renders exactly TWO segments and
                 no Sweep. Repeat for `burgerBg`, for `triggerMode: 'icon'`, and for
                 `itemColourGradient` → G14's negative control
    Integration: `node scripts/inspector-scan/run.js --check` resolves every row's state count
                 (LITERAL ArrayExpression, minimum 2, no upper bound)
```

**Prompt:**

> You are rebuilding the colour-row descriptors for `sgs/nav-menu`. Repo root:
> `c:\Users\Bean\Projects\small-giants-wp`. Your writable directory is
> `plugins/sgs-blocks/src/blocks/nav-menu/` and within it you touch `colour-rows.js` and the
> `edit.js` lines that mount it — nothing else. ⛔ Do NOT edit `render.php`, `style.css` or
> `block.json`; `block.json` is FROZEN and is your contract.
>
> **Read first:** `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` §9.6 (the full table, both ⓘ
> cross-reference notes, and the two ⛔ blocks beneath it), FR-41-2, FR-41-14, FR-41-16, FR-41-23,
> FR-41-24, FR-41-25, FR-41-26 (the eligibility predicate AND the "ONE DECLARED SOURCE, TWO
> EVALUATORS" section), FR-41-33, and §8.1's `burgerColourHover` vs `burgerHoverColour`
> disambiguation table. Then read `plugins/sgs-blocks/src/blocks/nav-menu/block.json` (frozen), then
> `plugins/sgs-blocks/src/blocks/icon-list/edit.js::Edit` — the reference implementation for
> omit-not-disable.
>
> **⛔ FIVE RULES THAT ARE INVISIBLE IF YOU BREAK THEM:**
> 1. **State entries are LITERAL array entries, never `.map()`/`.filter()`-generated.**
>    `scripts/inspector-scan/rules/31-golden-colour-control.js` resolves a row's state count as
>    `statesArray.elements.length` on a literal `ArrayExpression`. A computed array renders
>    correctly while the gate reports the wrong count (D738). Conditionality happens at ARRAY level:
>    `states: [ normalBg, hoverBg, ...( 'highlight' !== itemBgHoverTreatment ? [ currentBg ] : [] ) ]`.
> 2. **`linked: true` on EVERY state, unconditionally.** It makes `DesignTokenPicker` store the
>    palette SLUG rather than a baked hex, so a client's brand token survives a re-skin (D717/D740).
>    Both a hand migration and a codemod dropped it once and 14 assertions missed it (D881).
> 3. **State labels are translated at the row: `__( 'Current', 'sgs-blocks' )`**, matching the
>    existing `Normal`/`Hover` entries. Hardcoding one was a real, gate-invisible i18n regression.
> 4. **OMIT, never disable.** `SgsColourPanel` runs `rows.filter(Boolean)` and the caller inlines
>    the condition in the array literal (D609 field 9c). A greyed-out control a client can find and
>    click to no effect is the failure this rule prevents.
>    ⛔ Write conditional rows as a spread of a TERNARY, never of a boolean-`&&`:
>    `...( showMarkerColour ? [ markerColourRow ] : [] )`. `...( cond && {…} )` throws
>    (`false is not iterable`).
> 5. **`burgerColourHover` and `burgerHoverColour` are DIFFERENT attributes** — the first is the
>    icon/text COLOUR on hover, the second is the button BACKGROUND on hover. They are anagram-close
>    and §8.1 exists solely to keep them apart. Crossing them wires a colour control to a background
>    and also crosses their two different treatment attributes.
>
> **The Sweep predicate is DATA, not logic you write.** Read each row's entry from
> `block.json::supports.sgs.sweepEligibility`.
> ⛔ **`edit.js` does NOT currently import `block.json` — only `index.js` does
> (`src/blocks/nav-menu/index.js::metadata`), and the `Edit` component never receives `supports` as
> a prop.** Verified. **Add `import metadata from './block.json';` to whichever module reads the
> predicate** (this one). It is a read-only static import identical to what `index.js` already does
> and does NOT count as editing the frozen `block.json`. ⚠ Whichever file carries that import is
> also the file carrying the `colourRows` literal, so re-run
> `node plugins/sgs-blocks/scripts/inspector-scan/run.js --check` after adding it.
> Then apply exactly three mechanical checks — `blockingBackgroundAttrs` all empty, `blockingGradientAttrs` all empty, `glyphGuard` null
> or `attributes[attr]` not in `disallowedValues`. When false, OMIT the Sweep segment so the row
> renders as a two-option None/Swap control. ⛔ **Write no logic of your own beyond those three
> checks.** A builder tempted to inline "and also check X" has recreated the two-copies problem the
> declared source exists to end — if a new blocking input is discovered, it is added to the DECLARED
> ROW, one edit, both surfaces.
>
> **Two `ⓘ` cross-reference notes must RENDER** (not merely be stated in the spec), with the verbatim
> strings from §9.6:
> - beneath the Item text AND Item background rows: *"Automatic readable-text checking for these
>   colours is switched on under General → Accessibility."*
> - beneath the Item border colour row's hover-treatment selector: *"This changes the line around
>   the item. To underline the menu word itself instead, use Decoration (hover) under Typography —
>   they're separate settings and don't do the same thing."*
> ⛔ That second note has a TWIN in the Typography panel (step 14, §9.10) and **neither ships
> without the other** — a one-way pointer leaves the pointed-at control reading as the authoritative
> one.
>
> **Both border-colour rows carry `contrastAgainst` with `contrastLargeText: true`** — a border is a
> WCAG 1.4.11 UI-component case at 3:1, never body text. `SgsBorderControl` used to default that
> flag for its callers; moving the row out moves the obligation onto the row descriptor. Set it
> explicitly, per row; do not inherit `GradientCapableColourControl`'s own `false` by omission.
>
> **Components, by name (there is no "dropdown" in this spec):** `ToggleGroupControl` +
> `ToggleGroupControlOption` from `plugins/sgs-blocks/src/components/primitives` for every treatment
> selector (2–3 options is the segmented threshold —
> `TypographyControls.js::SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED` is 3).
>
> **Prove it:** `npm run build` exits 0; `node scripts/inspector-scan/run.js --check` passes and
> resolves a state count for every row (paste it); `node scripts/check-dead-controls.js --check`
> passes; paste the final `colourRows` literal. Do NOT run git beyond `diff`/`status`.

---

### Step 14 — `edit.js`: the panel rebuild across General + Design (§9.1–§9.12)

```
  Model:       sonnet
  Action:      Rebuild the panel layout per §9 exactly — "Menu Button" panel (rename + IconPicker +
               triggerMode/Label + magnet trio), Accessibility panel gains the relocated
               `itemSmartContrast`, Typography panel RESTORED with a Menu/Submenu `targets`
               switcher and `showHover: true` on each target entry, "Submenu — Items" panel NEW,
               "Submenu — Container" renamed, "Menu item" panel's Border subsection with
               `showColour={false}`, "Indicator" panel DELETED, "Menu item — state signals" panel
               DELETED.
  Files:       plugins/sgs-blocks/src/blocks/nav-menu/panels-general.js, panels-design.js,
               typography-panel.js, submenu-panels.js, edit.js — **plus any FURTHER module this
               step needs to create inside that same directory to keep every file ≤ 250 lines
               (PD-6).** Step 7's module boundaries were guessed before ~40 new attributes landed;
               the 250-line limit outranks that guess. ⛔ What this step may NOT do is compress a
               `colourRows` literal into a generated form to save lines — that blinds the
               golden-colour detector (KJC-2, D738). Split by GROUPING instead.
  Inputs:      Spec 41 §9 entire + its panel roster table; FR-41-12, FR-41-22, FR-41-27, FR-41-29,
               FR-41-30, FR-41-31, FR-41-33
  Outcome:     Every panel in §9's roster is present or has a named new home for each of its
               controls; nothing is dropped without a destination.
  Exec:        SEQUENTIAL after step 13 (same lane, same files)
  Deps:        step 13
  Marker:      (none)
  Time:        90 min
  Tooling:     /delegate, wp-sgs-developer agent, /subagent-driven-development
  On-Fail:     `git revert` this step's commit.
  Test:
    Happy:       all §9 panels render in the §9 order; SgsColourPanel still mounts FIRST
    Edge:        in `targets` mode, per-field flags MUST live on each target entry, not the outer
                 element — `TypographyControls` discards `singleProps` entirely when
                 `targets.length > 1`. Leaving the existing nine `show*` flags on the outer element
                 SILENTLY DELETES NINE WORKING CONTROLS
    Fail:        `showHover` on the outer element renders no trio on either target while every gate
                 stays green — six declared-and-rendered attributes with no control is the INVERSE
                 shape `check-dead-controls.js` looks for
    Integration: `node scripts/check-duplicate-controls.js` passes — exactly one live control
                 writes each `itemBorderColour*` attribute (the Colour panel row), because
                 `SgsBorderControl` is mounted `showColour={false}`
```

**Prompt:**

> Rebuild the `sgs/nav-menu` inspector panel layout. Repo root:
> `c:\Users\Bean\Projects\small-giants-wp`. Writable directory:
> `plugins/sgs-blocks/src/blocks/nav-menu/` — the panel modules and `edit.js` only. ⛔ Do NOT edit
> `colour-rows.js` (step 13 owns it), `render.php`, `style.css` or `block.json`.
>
> **Read `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` §9 in its entirety** — it is explicitly
> the authoritative control-by-control layout, and where an FR's prose disagrees with §9, §9 is what
> you implement. Also read FR-41-12, FR-41-22 (the verbatim `targets` mount), FR-41-27, FR-41-29,
> FR-41-30, FR-41-31, FR-41-33. Then read
> `plugins/sgs-blocks/src/blocks/card-grid/edit.js::Edit` — the two-target `TypographyControls`
> switcher to copy — and `plugins/sgs-blocks/src/blocks/icon/edit.js` — the live `IconPicker`
> adopter to copy.
>
> **⛔ THE ONE MISTAKE THAT SILENTLY DELETES NINE WORKING CONTROLS.** `TypographyControls` in
> `targets` mode (`targets.length > 1`) renders `<TypographyTargetSwitcher>` and **discards
> `singleProps` entirely**; the switcher then destructures `{ key, label, prefix, ...fieldProps }`
> from the SELECTED target and forwards only `fieldProps`. So **every per-field flag — all nine
> `show*` flags and `showHover` — must move onto EACH TARGET ENTRY.** A flag left on the outer
> element does nothing, silently, with every gate green. FR-41-22 carries the verbatim correct
> mount; copy it exactly, both targets, `showHover: true` on each.
>
> **Panels, per §9:**
> - §9.3 **"Menu Button"** (renamed from "Burger" — a LABEL change; ⛔ no attribute is renamed).
>   Panel-level help text: *"Controls the button that opens the mobile menu (the 'burger')."*
>   Controls in order: Icon (`IconPicker`, shown when `triggerMode` is `icon` or `icon-and-text`) ·
>   Show as (`ToggleGroupControl`, Icon | Text | Icon and text) · ↳ Label (native `TextControl` with
>   `__nextHasNoMarginBottom __next40pxDefaultSize`, shown when not `icon` — ⛔ **not**
>   `SgsFreeTextField`, which has zero adopters on this block) · Size · Magnetic pull
>   (`ToggleControl`) · ↳ Pull distance (`RangeControl` **min 20 max 400**) · ↳ Pull strength
>   (`RangeControl` **min 2 max 80**). ⛔ Those bounds match `fx-magnet.js`'s own clamp exactly — a
>   wider slider has dead ends and reads as a broken control. ⛔ No axis control.
>   Magnet help text, verbatim: *"Makes the menu button lean toward the visitor's cursor as they
>   approach it. Off automatically on touch devices and when reduced motion is requested."*
> - §9.5 **"Accessibility"** gains the RELOCATED `itemSmartContrast` toggle beside `navLabel`.
>   Plain-language help text — ⛔ no "WCAG", no "contrast ratio", no "AA" in any client-visible
>   string: *"When you set a background, we check your text colour stays readable against it and
>   swap in a readable one if it doesn't. Switch this off to always use exactly the colour you
>   picked."*
> - §9.7 **"Menu item"** — a labelled **Border** subsection: `SgsBorderControl` with
>   **`showColour={ false }`**, `showRadiusResponsive={ false }`, per-side width (base only), style
>   via the re-parented shared `BorderStyleControl`, radius via `radiusValues`/`onRadiusChange`.
>   ⛔ **No colour swatch** — the split is EXCLUSIVE, one live control per attribute
>   (`check-duplicate-controls.js` bans a second writer). Do not leave the swatch "for convenience".
> - §9.8 **"Submenu — Items"** (NEW): `IconPicker` for `sublinkMarkerIcon`; cross-references to the
>   Colour panel and the Typography panel rather than duplicate controls; a NAMED empty Spacing slot
>   (no submenu-LINK padding attribute exists — `submenuPadding` is the PANEL's; do not fabricate
>   one).
> - §9.9 **"Submenu — Container"** (renamed from "Dropdown (only affects items with sub-items)"),
>   every row a `ToolsPanelItem` with `hasValue`/`onDeselect`: Open animation · Distance below the
>   bar · Minimum width · Inner spacing · Border (`SgsBorderControl`, `showColour={false}`) · Box
>   shadow (`ShadowControl` with `attrNames={ shadowAttrKeys( 'submenuShadow' ) }` — **no options**,
>   which returns exactly `{ base, colour }`; the PHP twin `sgs_shadow_attr_map( 'submenuShadow' )`
>   takes the same no-options call, and **both sides must carry the same opt-in** or the editor
>   silently discards every write, D338).
> - §9.10 **"Typography"** (RESTORED), sitting directly under the Colour panel as the second Design
>   panel. The FR-41-22 `targets` mount verbatim. Plus the block-private **Current-page weight**
>   `SelectControl` fed `SGS_FONT_WEIGHT_OPTIONS` (already re-exported from the barrel this file
>   imports from), at the bottom of the **Menu target only**. ⛔ Not a number input and not a
>   hand-typed weight array — the anti-pattern is on this same block (`featuredFontWeight` is
>   number-typed with a hand-rolled 4-option array); do not reproduce it.
>   Two verbatim help-text strings (BINDING wording, §9.10):
>   · Decoration (hover): *"Underlines the menu word itself on hover — not a full-width line. For a
>     line under the whole item, use the border's hover setting in the Colour panel instead."*
>   · Weight (hover): *"Makes the word bolder when you point at it. Bolder text is a little wider,
>     so the items to its right will shift across slightly as you move along the menu."*
>   And the `ⓘ` twin note: *"These change how the menu word itself looks on hover. For a line across
>   the whole item, use the item border's hover setting in the Colour panel instead."*
>   ⛔ Neither string may contain "WCAG", "contrast ratio", "AA", "signal" or "divider".
> - ⛔ **DELETE the standalone "Indicator" panel** and the `hoverStyle` dropdown and the "Underline"
>   `PanelBody` and the "Menu item — state signals" panel. Every control they held has a named new
>   home in §9's roster table — check each one off against that table before reporting done.
>
> **⛔ `SgsColourPanel` must still be rendered BEFORE any other same-group `<InspectorControls>`** —
> WordPress concatenates same-group Fills in mount order.
>
> **Prove it:** `npm run build` exits 0 · `node scripts/check-dead-controls.js --check`,
> `node scripts/check-empty-inspector-containers.js --check`,
> `node scripts/check-duplicate-controls.js`, `node scripts/check-control-ux.js --check` all pass ·
> `wc -l` every file ≤ 250 · paste §9's panel-roster table with each row ticked and the file+symbol
> where its controls now live. Do NOT run git beyond `diff`/`status`.

---

### Step 15 — `render.php` / `includes/nav-menu-css.php`: the CSS-emission rewrite

```
  Model:       sonnet
  Action:      Implement the 3-state colour/border emission (FR-41-3 consumer side), the three-state
               `::before` fill rule (FR-41-23), the hover-treatment resolution + Sweep predicate
               re-evaluated server-side from `sweepEligibility` (FR-41-26), the border sweep band
               (FR-41-8), the Highlight fold (FR-41-25), the block-private typography hover emitter
               (FR-41-21), the submenu typography call (FR-41-22b), the burger mode branch
               (FR-41-12), the icon resolution (FR-41-30), the magnet data-attributes (FR-41-31),
               and `itemSmartContrast` (FR-41-5).
  Files:       plugins/sgs-blocks/includes/nav-menu-css.php
               plugins/sgs-blocks/src/blocks/nav-menu/render.php
  Inputs:      Spec 41 FR-41-3, 5, 8, 12, 21, 22, 23, 25, 26, 30, 31; the frozen `block.json`
  Outcome:     Every new attribute is READ and emitted; the resolved (not stored) treatment drives
               every downstream rule; no bare `{sel}:hover` anywhere.
  Exec:        PARALLEL with steps 13, 14 (Lane 5 ∥ Lane 6 — disjoint files); SEQUENTIAL before 16
  Deps:        step 10 (manifest frozen), step 12 (Wave A closed — it consumes step 6's emitters)
  Marker:      SESSION-START
  Time:        120 min
  Tooling:     /delegate, wp-sgs-developer agent, /subagent-driven-development
  On-Fail:     `git revert` this step's commit.
  Cold-Entry:  this plan file · Spec 41 FR-41-3/8/21/23/25/26 · the frozen `block.json` ·
               `plugins/sgs-blocks/includes/helpers-hover-state.php` ·
               `plugins/sgs-blocks/src/blocks/business-info/style.css` (the shipped sweep precedent)
  Test:
    Happy:       all three states emit for item text, item background and item border
    Edge:        `{link}{position:relative;isolation:isolate;}` is emitted whenever ANY of the three
                 fills is set, not only the resting one — today's rule fires only inside the
                 resting-fill condition, so a Hover-only fill would get a `::before` with no
                 positioned ancestor and no stacking context
    Fail:        the Sweep predicate resolves FALSE at render time → the treatment falls back to
                 `'swap'` and NO sweep CSS is emitted (no `background-image`, no `background-clip`,
                 no `-webkit-text-fill-color`, no `@supports`, no `forced-colors`/`print` rescue) —
                 **regardless of the stored value, which is NOT cleared**
    Integration: `node plugins/sgs-blocks/scripts/hover-guard/check.js` passes — every hover rule
                 traces to `sgs_hover_state_rules()` or `sgs_hover_guarded_rule()`
```

**Prompt:**

> Implement the CSS emission for Spec 41. Repo root: `c:\Users\Bean\Projects\small-giants-wp`.
> Writable files: `plugins/sgs-blocks/includes/nav-menu-css.php` and
> `plugins/sgs-blocks/src/blocks/nav-menu/render.php` **only**. ⛔ Do NOT edit `edit.js`, any file
> under `src/blocks/nav-menu/*.js`, `style.css` (step 16 owns it) or `block.json` (FROZEN — it is
> your contract).
>
> **Read in full first:** `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` FR-41-3, FR-41-5,
> FR-41-8, FR-41-12, FR-41-21, FR-41-22(b), FR-41-23 (including the `::before` three-state block),
> FR-41-25, FR-41-26 (all four sub-sections), FR-41-30, FR-41-31. Then
> `plugins/sgs-blocks/includes/helpers-hover-state.php` in full, then
> `plugins/sgs-blocks/src/blocks/business-info/style.css` (`.sgs-business-attribution
> .sgs-business-info__link` — the shipped, live sweep precedent this adopts) and that block's
> `render.php` custom-property emission.
>
> **⛔ SEVEN RULES, EACH OF WHICH FAILS SILENTLY IF MISSED:**
>
> 1. **Every hover rule routes through a helper** in `helpers-hover-state.php` — never a bare
>    `{sel}:hover`. Use `sgs_hover_state_rules( $selector, $decls, $focus, $suffix )` when you hold
>    a BASE selector (it appends `:hover` plus any pseudo-element suffix to each comma-separated
>    part itself and emits the focus rule separately, unguarded); use
>    `sgs_hover_guarded_rule( $hover_selector, $decls )` only when you already hold a fully-built
>    `:hover` selector. The two guard layers cover DIFFERENT devices — `SGS_HOVER_MEDIA` fixes
>    phones and pure-touch tablets with no JS; `SGS_HOVER_NOT_TOUCH` fixes hybrids, which report
>    hover-capable all session while being poked with a finger. Neither covers the other's devices.
>    **`:focus-visible` stays OUTSIDE both guards.** The Current rule is never guarded and is
>    emitted BEFORE the Hover rule.
> 2. **ALL THREE item-background fills paint on `.{uid} .sgs-nav-menu__link::before`** — same layer,
>    same `z-index:-1`, same `border-radius:inherit`. ⛔ No state's fill goes on
>    `.sgs-nav-menu__link` itself. The `hoverStyle==='pill'` branch you are deleting painted
>    `background-color` directly on the link; if its replacement lands back there, the item-text
>    row's Sweep would clip the operator's new hover fill to the shape of the letters.
>    ⚠ Emit `{link}{position:relative;isolation:isolate;}` whenever ANY of the three fills is set,
>    not only the resting one.
> 3. **The Sweep predicate is re-evaluated HERE, server-side, and the EMISSION is what is gated.**
>    Read `WP_Block_Type_Registry::get_instance()->get_registered( 'sgs/nav-menu' )
>    ->supports['sgs']['sweepEligibility']` and apply the same three mechanical checks the inspector
>    applies. When false, resolve the treatment to `'swap'` **regardless of the stored value**, and
>    emit none of the sweep CSS. ⛔ **Do NOT clear the stored value** — it becomes valid again the
>    moment the operator clears the blocking attribute. ⛔ **Do NOT re-derive the rule or add "and
>    also check X"** — both surfaces read the same declared rows; a new blocking input is added to
>    the DATA, not to either evaluator.
>    ⛔ **Read the RESOLVED treatment into a variable once, immediately after that evaluation, and
>    have every downstream rule read THAT variable.** The stored attribute is not consulted again.
>    The sweep-plus-text-decoration rule below is the first consumer of that distinction and keying
>    it on the stored value fires it on a row that never swept.
> 4. **The `@supports not ((background-clip:text) or (-webkit-background-clip:text))` fallback is
>    MANDATORY**, and its base rule seeds the **NORMAL** colour with the HOVER colour arriving via
>    its own separate rule inside the same block. ⛔ Never "HOVER or NORMAL" — seeding the base with
>    Hover renders the menu permanently hover-coloured on exactly the browsers least able to cope.
>    Emit it by calling the existing `includes/helpers-tokens.php::sgs_text_colour_gradient_fallback_rule(
>    $selector, $value )` — this block already calls it on its Normal-state gradient path. ⛔ Do not
>    hand-roll the rule. Without it, `-webkit-text-fill-color:transparent` applies on a
>    non-supporting browser and **the text is invisible** — total content loss, not a degraded
>    effect. The hover half of the fallback still routes through `sgs_hover_state_rules()`.
> 5. **⛔ READ KJC-7 BEFORE WRITING THIS ONE — the spec words it as an API that does not exist.**
>    FR-41-8 says "`sgs_border_states_css()` receives a `$map` whose `hover` and `current` keys are
>    UNSET for the `bottom` edge". **Verified: that function's signature is
>    `sgs_border_states_css( string $selector, array $attributes, array $map )` — there is NO edge
>    parameter and no per-edge branch anywhere in it.** It resolves one normal paint and one hover
>    paint and emits a single flat `border-color:` covering all four sides. The instruction as
>    written cannot be executed.
>    **The resolution (KJC-7, Bean's call — do not proceed until it is ruled on):** call the helper
>    normally for the full three-state border, then emit ONE additional **block-private override
>    rule** resetting `border-bottom-color` under hover and current on the swept selector. ⛔ Do NOT
>    extend the shared helper with an edge-aware `$map` — that would be a fourth design-gated
>    shared-component change in a phase that already carries three, for an API exactly one caller
>    wants.
>    The OUTCOME the rule must produce is unchanged: without it, the helper repaints a real border
>    on the border box directly beneath the band on the padding box — **two visible horizontal
>    lines**, one un-asked-for. Every other edge keeps all three states. The Hover and Current
>    swatches stay VISIBLE and STORED; only the bottom edge's non-resting emission is suppressed.
>    Also emit `{link}{border-bottom-color:transparent;}` and `{link}{position:relative;}` from the
>    sweep branch. ⚠ Get the specificity right or the override silently does nothing — **G6 is the
>    assertion that catches it** (`getComputedStyle(link).borderBottomColor === 'rgba(0, 0, 0, 0)'`
>    while the `::after` band paints).
>    A `prefers-reduced-motion: reduce` companion is MANDATORY: keep both end states, drop only the
>    travel.
> 6. **When the RESOLVED treatment is `'sweep'` AND that prefix's hover text-decoration resolves to
>    a permitted non-`none` value, the same block-private emitter also sets `text-decoration-color`
>    to the HOVER colour**, in the SAME `sgs_hover_state_rules()` call as the decoration itself.
>    `text-decoration-color` is not governed by `-webkit-text-fill-color`, so without this the
>    glyphs travel and the line under them stays at the resting colour. ⚠ Add NO transition to it.
> 7. **The block-private typography hover emitter is a file-local function inside a
>    `function_exists()` guard** — a top-level function declaration in a per-instance `render.php`
>    fatals on the second instance, and this page has two. It validates each value against the SAME
>    allowlists `sgs_typography_css_rule()` applies, reproduced literally (there is no exported
>    constant): `text-decoration` ∈ none/underline/line-through/overline; `text-transform` ∈
>    none/uppercase/lowercase/capitalize; `font-weight` via `preg_replace('/[^a-z0-9]/i','',$v)`.
>    ⛔ A value that is set but not permitted emits NOTHING — it never falls back to the base value.
>    ⛔ Do NOT extend `sgs_typography_css_rule()`; that is a shared helper with callers across most
>    of the block library and a design-gated change.
>
> **Also implement:** `itemFontWeightCurrent` under FR-41-6's never-lighter rule (emit only when
> `(int)itemFontWeightCurrent > (int)itemFontWeight`) · `itemSmartContrast` via the EXISTING
> `sgs_wcag_text_colour_for_bg()` / `sgs_wcag_preferred_text_colour_for_bg()` — ⛔ do not build a new
> contrast function · the burger `triggerMode` branch, including building the `aria-label` attribute
> segment as a VARIABLE and interpolating it (⛔ the attribute lives inside a `sprintf()` format
> string literal; passing `''` emits `aria-label=""`, an EMPTY accessible name, strictly worse than
> the mismatch it fixes) · `aria-hidden="true"` on the icon under `icon-and-text` · `min-width:
> <burgerSize>; width:auto` in place of the fixed `width` under `text`/`icon-and-text`, keeping
> `height`/`min-height` so the 44px touch floor survives · `triggerIcon`/`sublinkMarkerIcon` through
> the SAME source-aware resolver `sgs/icon` calls, never a bespoke lookup · the magnet's three
> `data-sgs-fx*` attributes, each through `absint()` then `esc_attr()`, and **no attribute at all
> when disabled** (⛔ no `view.js` change and no enqueue code — the motion registry's enqueue is
> markup-sniffed) · the submenu typography call
> `sgs_typography_css_rule( $attributes, 'submenu', $uid_sel . ' .sgs-nav-menu__sublink' )` ·
> `submenuTopOffset` as `top: calc(100% + <offset>)` **plus its mandatory hover-bridge**
> `.sgs-nav-menu__submenu-wrap::before` (emitted only when an offset is set — ⛔ `submenuCloseGrace`
> does NOT cover this; it governs OPENNESS and never touches CSS `:hover`) · the sublink sweep
> selector scoped to EXCLUDE featured sub-items
> (`{uid} .sgs-nav-menu__subitem:not(.sgs-nav-menu__subitem--featured) .sgs-nav-menu__sublink`).
>
> **Prove it:** `php -l` clean · `node plugins/sgs-blocks/scripts/hover-guard/check.js` passes ·
> `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 · `wc -l` every file
> ≤ 300 · for each of the three `sweepEligibility` rows, paste the emitted CSS with the predicate
> TRUE and with it FALSE, side by side. Do NOT run git beyond `diff`/`status`.

---

### Step 16 — Execute the FR-41-15 census: 6 DELETE, 3 CONVERT, 2 KEEP, across BOTH files

```
  Model:       sonnet
  Action:      Apply the fate of every one of the eleven censused rules, plus the two
               `[aria-current="page"]` bar rules that are not in the census but sit in the fate
               table. Then delete the `hoverStyle` branches, the whole underline mechanism, and
               `{featured_sel}::after{content:none;}`.
  Files:       plugins/sgs-blocks/includes/nav-menu-css.php (or render.php, wherever step 8 put
               each rule) · plugins/sgs-blocks/src/blocks/nav-menu/style.css
  Inputs:      Step 1's re-verified baseline; Spec 41 FR-41-15's fate table + census-#9
               per-declaration table; FR-41-4's seven required changes
  Outcome:     Zero hardcoded/ungated paint rules remain on this block;
               `check-ungated-paint-rules.py --check` (step 11) reports zero for `sgs/nav-menu`.
  Exec:        SEQUENTIAL after step 15 (same lane, same files)
  Deps:        step 15; step 1's baseline
  Marker:      (none)
  Time:        75 min
  Tooling:     /delegate, wp-sgs-developer agent, python (the census scan)
  On-Fail:     `git revert` this step's commit.
  Test:
    Happy:       re-running the census scan after this step returns zero CENSUSED rows
    Edge:        census #2 and #11 are KEEP — do not sweep them up with their neighbours. #2 is the
                 drawer's structural sub-item indent (the marker icon's 12px+14px+8px is measured
                 against the 32px indent this border occupies); #11 is the drill-down Back row's
                 separator, JS-injected chrome that is not a `.sgs-nav-menu__link` and not an `<li>`
    Fail:        deleting census #3 in `render.php` while leaving census #10 standing in
                 `style.css` leaves the double-line bug FULLY INTACT through a fix that reads as
                 complete. The two selectors differ; they paint the same edge of the same rows
    Integration: census #7 is CONVERT — the `var()` half is genuinely attribute-driven and STAYS;
                 what goes is the ungated fallback, and `background:` becomes `background-color:`
```

**Prompt:**

> Execute FR-41-15's fate table on `sgs/nav-menu`. Repo root:
> `c:\Users\Bean\Projects\small-giants-wp`. Writable files: the nav-menu CSS-emission PHP (see
> `plugins/sgs-blocks/includes/nav-menu-css.php` and
> `plugins/sgs-blocks/src/blocks/nav-menu/render.php`) and
> `plugins/sgs-blocks/src/blocks/nav-menu/style.css`. Nothing else.
>
> **Read `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` §FR-41-15 IN FULL** — the corrected
> methodology, the history table of three bounds that each hid a real rule, the 11-row CENSUSED
> table, the GATED and DISMISSED tables, the 12-row fate table, census #9's per-declaration table,
> and the three ⛔ blocks explaining why census #4/#6/#8 BREAK the Sweep treatment outright. Also
> read FR-41-4 (its seven required changes).
>
> **⛔ FIRST, RE-RUN THE CENSUS YOURSELF before changing anything**, with the exact statement-aware
> Python in FR-41-15 plus `grep -nE 'background|border'` over `style.css`, and diff your output
> against the spec's tables. Paste both. **A fate table is only true as of the command that produced
> it** — the dispositions in the spec were derived against a specific tree state, and other sessions
> commit here daily. If any row has moved, STOP and report rather than guessing the new fate.
>
> **Then apply, per the fate table:**
> - **DELETE (6):** census #3, #4, #5, #6, #8, #10. Plus the two bar `[aria-current="page"]` rules'
>   handling per the fate table, and FR-41-4's seven items — the `hoverStyle` attribute and all
>   three branches, all five underline attributes, all five named underline CSS rules including the
>   `$hover_after_sel` construction and the `prefers-reduced-motion` companion, and
>   `{featured_sel}::after{content:none;}`. ⛔ Do NOT keep that last one "just in case": the bar it
>   suppressed no longer exists, it weighs (0,3,1) against the sweep's (0,2,1) so it WINS and the
>   sweep silently does not render on featured items, and a kept suppression rule is exactly the
>   silent override `check-hardcoded-render-defaults.js` F3b exists to catch.
> - **CONVERT (3):** census #1 (the `background` half is already attribute-driven; the `border:0`
>   half becomes conditional — emit the reset only when `submenuBorderWidth` is empty), census #7
>   (keep the `var()`, **delete the ungated `var(--wp--preset--color--primary, transparent)`
>   fallback**, emit the rule only when `--sgs-nm-featured-bg` is actually written, and switch
>   `background:` → `background-color:` so the shorthand can never reset a sweep's
>   `background-image`), census #9 (per its OWN five-row table: three declarations NO CHANGE, the
>   `border` and the `box-shadow` CONVERT to read the new attributes, keeping the current values as
>   the unset fallback so an untouched nav renders identically).
>   Also CONVERT `{uid} .sgs-nav-menu__sublink[aria-current="page"]`'s colour — ⚠
>   `--sgs-nm-submenu-current-colour` is **never written anywhere**
>   (`grep -rn "sgs-nm-submenu-current-colour" plugins/sgs-blocks/src/` returns exactly one hit, the
>   consuming rule): it is dead-but-firing and always falls through to its own hardcoded fallback.
>   Rewire it to `submenuColourCurrent`, keeping `var(--wp--preset--color--primary-dark,
>   currentColor)` as the unset fallback.
> - **KEEP (2):** census #2 and census #11, and say in your report WHY each is kept, so a reviewer
>   can check your reasoning rather than your diff.
>
> **⛔ THE TRAP THIS STEP EXISTS TO AVOID.** Deleting census #3 from `render.php` while leaving its
> STATIC TWIN census #10 standing in `style.css` leaves the double-line bug **fully intact** through
> a fix that reads as complete. The selectors are different
> (`.sgs-nav-drawer {uid} .sgs-nav-menu__item + .sgs-nav-menu__item` vs
> `.sgs-nav-menu__item--drawer + .sgs-nav-menu__item--drawer`) but they paint the same edge of the
> same drawer rows. `style.css` is a genuinely separate surface — enqueued as an ordinary
> stylesheet, never passing through PHP. **Fix BOTH.**
>
> **Prove it:** re-run both census commands after your changes and paste output showing ZERO
> censused rows remain · `python plugins/sgs-blocks/scripts/check-ungated-paint-rules.py --survey
> --block sgs/nav-menu` reports zero CENSUSED · `php -l` clean ·
> `node plugins/sgs-blocks/scripts/hover-guard/check.js` passes ·
> `grep -rnE "hoverStyle|underlineColour|underlineThickness|underlineOffset" plugins/sgs-blocks/src/blocks/nav-menu/`
> returns nothing. Do NOT run git beyond `diff`/`status`.

---

### Step 17 — `style.css`: sweep/highlight treatments, border-hover suppression, magnet companion

```
  Model:       sonnet
  Action:      Add the static CSS the emission cannot own — the Highlight pill's shared shape rules,
               the burger magnet companion `transition` rule (reading `--sgs-magnet-transition` with
               the literal as its `var()` fallback), the submenu open-animation keyframes for
               `fade`/`slide-down` plus their `prefers-reduced-motion` companions.
  Files:       plugins/sgs-blocks/src/blocks/nav-menu/style.css  (ONLY)
  Inputs:      Spec 41 FR-41-10, FR-41-25, FR-41-31 (the companion rule verbatim + the
               reduced-motion specificity table)
  Outcome:     The magnet companion rule is the winning `transition` declaration on the burger when
               the effect is on, and the pre-existing `!important` reduced-motion rescue still beats
               it under `reduce`.
  Exec:        SEQUENTIAL after step 16 (same file family)
  Deps:        step 16; step 4 (the shared custom property)
  Marker:      (none)
  Time:        35 min
  Tooling:     /delegate, Read/Edit
  On-Fail:     `git revert` this step's commit.
  Test:
    Happy:       with the magnet on, the burger's winning `transition` is nav-menu's own rule
    Edge:        under `prefers-reduced-motion: reduce` the winning `transition-duration` is the
                 `!important` one from the FOUR-selector rule already in this file (naming
                 `.sgs-nav-menu__burger`, `.sgs-nav-menu__link`, `.sgs-nav-menu__indicator`,
                 `[data-magnet] .sgs-nav-menu__magnet-target`)
    Fail:        ⛔ the companion rule must carry NO `!important` — giving it one beats the rescue
                 and reinstates the very transition reduced motion is asking to remove. ⛔ And do
                 NOT also wrap it in `@media not (prefers-reduced-motion: reduce)`: two overlapping
                 fixes, neither falsifiable, neither ever safely deletable
    Integration: the submenu still OPENS under `reduce` — a panel that fails to open is a broken
                 menu, not a calmer one
```

---

### Step 18 — The three behaviours that are fixes, not controls (FR-41-13)

```
  Model:       sonnet
  Action:      Emit the FOUR parent-stays-hovered rules — a mouse half and a keyboard half, PER
               FORK — per FR-41-13's verbatim selectors.
  Files:       plugins/sgs-blocks/includes/nav-menu-css.php
  Inputs:      Spec 41 FR-41-13 + FR-41-1's DOM-shape table
  Outcome:     A parent item keeps its Hover paint while its own dropdown is hovered or
               keyboard-focused, in BOTH the bar and the drawer.
  Exec:        SEQUENTIAL after step 17
  Deps:        step 17
  Marker:      (none)
  Time:        35 min
  Tooling:     /delegate, Read/Edit
  On-Fail:     `git revert` this step's commit.
  Test:
    Happy:       hovering into the open dropdown keeps the parent's hover declarations applied
    Edge:        ⛔ the `>` child combinator is LOAD-BEARING — do not relax it to a descendant
                 space. It is what stops the rule repainting sublinks inside the open panel
    Fail:        ⛔ never key the `:has()` on `.sgs-nav-menu__submenu-wrap` — that class exists in
                 the BAR fork only, so such a rule silently does nothing for every drawer instance,
                 and a drawer is where keyboard nav of a nested menu is most common. Both keyboard
                 rules key on `ul.sgs-nav-menu__submenu`, the ONE class present in both forks
    Integration: route each `:hover` variant through `sgs_hover_guarded_rule()` (the `:hover` is
                 already inside the built selector; `sgs_hover_state_rules()` would append a
                 second). Emit each `:focus-visible` variant separately and UNGUARDED. ⛔ The
                 declarations are literally the Hover-state declarations produced by the SAME
                 emitter call — a hand-copied duplicate is how the two drift
```

⚠ **`:has()` browser floor, documented rather than silently omitted.** Firefox 121 (Dec 2023) is the
binding constraint; Baseline "widely available" from 2023-12-19. On an older Firefox the *keyboard*
half silently does not apply while the *mouse* half, needing no `:has()`, works everywhere. That
bounded degradation is exactly why the two halves are split rather than written as one rule.

---

### Step 19 — FR-41-34: the migration notice (`register_post_meta` + write + dismissible `Notice`)

```
  Model:       sonnet
  Action:      Register `_sgs_nav_menu_migration_notice` on `post` AND `page`; write one record per
               KEY that actually changed during the G5a migration; render a dismissible `Notice` in
               the block's default (Settings) `InspectorControls` group whose dismissal DELETES the
               record.
  Files:       plugins/sgs-blocks/includes/nav-menu-migration-notice.php (NEW)
               plugins/sgs-blocks/src/blocks/nav-menu/panels-general.js (the Notice mount)
               plugins/sgs-blocks/sgs-blocks.php (the registration hook)
  Inputs:      Spec 41 FR-41-34 (a)-(f); the G5a migration path (step 23)
  Outcome:     An operator whose colour visibly changed is told, in the editor, in plain English,
               with the one-step correction — and the notice does not return after dismissal.
  Exec:        SEQUENTIAL after step 18
  Deps:        step 18; QA-1's answer to question (c)
  Marker:      (none)
  Time:        60 min
  Tooling:     /delegate, wp-sgs-developer agent
  On-Fail:     `git revert` this step's commit.
  Test:
    Happy:       a post whose `indicatorColour` genuinely differed from a non-empty `itemBgHover`
                 shows the Notice naming block, old colour and new colour
    Edge:        a SKIPPED key writes NO record (nothing changed on screen), and the UNSET-SOURCE
                 case writes NO record either (the operator sees the same accent pill before and
                 after). ⚠ Both still LOG — logging and surfacing are different obligations
    Fail:        a FRESH block with no migration involved must show no Notice and carry no meta.
                 An implementation that reads an ABSENT meta as a truthy empty array passes every
                 other assertion and fails only here (G20b(d))
    Integration: dismissal `onRemove` DELETES the record so the notice does not return on reload.
                 ⛔ This is the one genuinely new behaviour — no `<Notice>` anywhere in `src/`
                 carries an `onRemove` of any kind, and the single dismissible notice that exists
                 persists NOTHING. Copy it for the COMPONENT and its placement, never for the
                 persistence
```

**Prompt:**

> Build the Spec 41 FR-41-34 migration notice. Repo root: `c:\Users\Bean\Projects\small-giants-wp`.
> Writable: `plugins/sgs-blocks/includes/nav-menu-migration-notice.php` (new), the registration hook
> in `plugins/sgs-blocks/sgs-blocks.php`, and the `<Notice>` mount inside
> `plugins/sgs-blocks/src/blocks/nav-menu/panels-general.js`. Nothing else.
>
> **Read:** `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` FR-41-34 (a)-(f) and §11 G5a and
> G20b. Then the two precedents named there:
> `plugins/sgs-blocks/includes/class-configurator-meta.php` (its `register_post_meta()` shape and
> its per-object `auth_callback`), `plugins/sgs-blocks/includes/content-types/class-product-cpt.php`
> (`register_meta()` with a schema-rich `show_in_rest`), and
> `plugins/sgs-blocks/src/plugins/product-variation-sets/index.js::registerPlugin` (the
> `useEntityProp( 'postType', postType, 'meta' )` idiom, including how it gates on `postType`).
> Then read the ONE dismissible `<Notice>` that exists in this plugin —
> `plugins/sgs-blocks/src/blocks/nav-menu/edit.js`'s own link-count advisory: `status="info"`,
> `isDismissible={ true }`, in the default `InspectorControls` group, `style={{ marginBottom:
> '16px' }}`. **Copy that mount exactly.**
>
> **⚠ The registration is genuinely NEW work.** Every existing `_sgs_*` key in this plugin is
> registered against `sgs_product` / `product_variation` / `product`, and **none against `post` or
> `page`**. The IDIOM is precedented; the REGISTRATION is not. Register on BOTH `post` and `page`
> with: `single => true` · `type => 'array'` with an explicit nested `show_in_rest` **schema** (a
> bare `'show_in_rest' => true` on an array meta is rejected by core; `_sgs_variation_sets` is the
> worked precedent) · `auth_callback` a closure doing `current_user_can( 'edit_post', $post_id )`
> — ⛔ **NOT a bare `edit_posts`**; the existing configurator meta uses the per-object form
> specifically as an IDOR guard, and a capability check that ignores the object is not a capability
> check · a `sanitize_callback` sanitising each record's fields (block `clientId`, attribute key,
> old value, new value) — the values are written by PHP but meta is REST-writable and must not trust
> its input · `default => array()`, so an absent flag and an empty flag behave identically.
> ⚠ `page` and `post` support `custom-fields` in core, so the CPT-`supports` trap does not apply —
> but ASSERT it rather than assuming, because a meta that silently returns nothing looks identical
> to one that was never written.
>
> **When it is written:** during the G5a migration path ONLY, in the same pass that writes the
> carried-across value. Never on a fresh block, never on a save, never on render. One record per KEY
> that actually changed. ⛔ A SKIPPED key writes no record. ⛔ The UNSET-SOURCE case writes no record
> either. Both still LOG.
>
> **The wording — client-visible, so the string rules bind.** Worked example:
> *"Your menu's hover highlight colour was carried over automatically from the old pill setting. It
> was <old>, and is now <new>. To put it back, set the Item background row's Hover swatch to
> <old>."*
> ⛔ The string must not contain "WCAG", "contrast", "AA", "signal" or "migration". "Migration" is
> developer vocabulary; the operator experienced a setting moving.
>
> ⛔ **Nothing in this plugin uses `createNotice` / `useDispatch( noticesStore )`** (zero hits across
> `src/`). Do not introduce the notices STORE — a snackbar is transient and this message must survive
> until the operator dismisses it.
>
> ⛔ **Dismissal CLEARS the flag.** `onRemove` deletes the record(s) from the meta. **This is the one
> genuinely new behaviour and it has NO precedent anywhere in the plugin** — no `<Notice>` in `src/`
> carries an `onRemove` or `onDismiss` of any kind, and the one dismissible notice persists nothing
> (it reappears on reload, because its visibility is a pure function of link count). An
> implementation that merely copies that mount passes every other assertion in G20b and fails this
> one.
>
> **Prove it:** `php -l` clean · `npm run build` exits 0 · paste the `register_post_meta()` call ·
> paste a WP-CLI or REST read of the meta on a test post proving it round-trips
> (`wp post meta get <id> _sgs_nav_menu_migration_notice`) · confirm the key does NOT appear in
> `core/post-meta` Block Bindings (a leading-underscore key is deliberately not surfaced, which is
> correct here — this is an editor advisory, not bindable content). Do NOT run git beyond
> `diff`/`status`.

---

### Step 20 — QA-6 / static gate sweep: G2, G3, G5, G12, G18 + the whole gate chain

```
QA Gate — every static gate passes on the built tree, before anything is deployed
  Model:   sonnet
  Exec:    SEQUENTIAL
  Deps:    steps 13, 14, 15, 16, 17, 18, 19 complete
  Check:   cd plugins/sgs-blocks
           npm run build                                              # exits 0
           node scripts/hover-guard/check.js                          # G2
           node scripts/audit-inline-styling.js --check               # G3
           node scripts/check-dead-controls.js --check                # G5
           node scripts/check-empty-inspector-containers.js --check   # G5
           python scripts/check-dead-pattern-attrs.py --check         # G5
           node scripts/check-duplicate-controls.js                   # G18 (static half)
           npm run audit:element-manifest                             # G12
           python scripts/placement-reach.py --block sgs/nav-menu      # G12
           python scripts/run-gates.py --tier all                     # everything else
           grep -rnE "hoverStyle|underlineColour|underlineColourGradient|underlineThickness|underlineOffset|itemRadius|itemRadiusHover|submenuRadius|indicatorStyle|indicatorColour|indicatorColourGradient|borderHoverAnimation[^D]" \
             plugins/sgs-blocks/src/ plugins/sgs-blocks/scripts/ theme/     # G5, THREE scopes
  Pass:    Every command exits 0; the grep returns NOTHING.
  Fail:    Fix and re-run. ⛔ Bypassing is permitted ONLY for violations that are genuinely
           pre-existing and not this phase's work — verify each, disclose `[gates-ok:<reason>]` in
           the commit message. But if you are already in that area fixing things, fix them too.
  Marker:  QA  ·  Time: 25 min
```

⚠ **`plugins/sgs-blocks/scripts/` is NOT optional in that grep.** A scan for these names found live
references in `scripts/consistency/attr-role-map.json`, `golden-controls.json`, `setting-types.json`,
`setting-reclassification.json`, `scripts/behavioural-analyser/css-property-classifications.json`,
`extract-signatures.py`, `check-duplicate-controls.js`, `check-hover-state-classification.py` and
`scripts/toolindex/index.json`.
⚠ The `[^D]` guard on `borderHoverAnimation` is deliberate — `borderHoverAnimationDirection` is a
LIVE attribute and an unanchored match reports it as a surviving reader of a deleted one.
⚠ **G18's static half is necessary but not sufficient.** `check-duplicate-controls.js` CHECK 2 scans
literal JSX control elements and is **blind to a duplicate writer living inside a row OBJECT LITERAL
passed as a config prop** — which is exactly the shape nav-menu's colour rows take. G18's real proof
is the three-part RENDERS / WRITES / EMITS assertion in step 21.

---

### Step 21 — Build + deploy to the canary

```
  Model:       inline
  Action:      `cd plugins/sgs-blocks && npm run build`, then
               `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`.
  Files:       (none edited)
  Inputs:      a clean tree at step 20's gate
  Outcome:     The canary serves the new build; both OPcache and the LiteSpeed page cache are
               purged (the deploy script does both).
  Exec:        SEQUENTIAL
  Deps:        step 20
  Marker:      SESSION-START
  Time:        10 min
  Tooling:     /wp-sgs-deploy, build-deploy.py
  On-Fail:     The script carries `.bak` rollback rotation — use it. ⛔ NEVER hand-roll
               `tar`/`scp -r`/`ssh 'rm -rf … && mv …'`: the old recipe deleted the LIVE directory
               before extracting and took two client sites down for ~2.5h (D336).
  Cold-Entry:  `.claude/dev-setup.md` · `.claude/secrets/sandybrown.env` (gitignored, always
               available — no need to ask) · repo `CLAUDE.md`'s deploy block
  Test:
    Happy:       the canary homepage (page 2742) renders with no PHP fatal
    Edge:        the drawer's own nav-menu instance renders too — two instances, one page, which is
                 what would expose a top-level function declaration in a per-instance render.php
    Fail:        ⛔ do NOT reach for `--allow-dirty` (an uncommitted edit was D336's trigger) or
                 `--skip-verify` (that flag removes the check that catches a broken deploy)
    Integration: `--skip-purge` is NOT used — clearing one cache layer does nothing for the other,
                 and skipping IS D709
```

---

### Step 22 — Live Playwright verification, lane 1: mechanism gates

```
  Model:       sonnet
  Action:      Assert G6, G13 (all four scenarios), G14 (a)-(g), G15, G17, G18 (RENDERS/WRITES/
               EMITS) on the live canary via Playwright + `getComputedStyle`.
  Files:       .claude/verify/spec-41-gates.md (evidence log)
  Inputs:      Spec 41 §11 G6, G13, G14, G15, G17, G18
  Outcome:     Each gate recorded PASS with the command and the observed value, or FAIL with the
               delta.
  Exec:        PARALLEL with step 23 (different gates, read-only on the same page)
  Deps:        step 21
  Marker:      (none)
  Time:        90 min
  Tooling:     Playwright MCP, /verify-loop
  On-Fail:     Record the delta, return to the owning step, re-dispatch. ⛔ Never fabricate a PASS.
  Test:
    Happy:       G6 — with a bottom border colour AND a sweep direction set, the row renders
                 EXACTLY ONE painted horizontal line and
                 `getComputedStyle(link).borderBottomColor === 'rgba(0, 0, 0, 0)'` while the
                 `::after` band paints. Assert the MECHANISM, not just the appearance
    Edge:        G13 scenario 3 (UNSET SOURCE) — the one a builder skips because it looks trivial.
                 ⛔ Assert the RENDERED colour via `getComputedStyle(indicator).backgroundColor`,
                 not the stored attribute: pre-migration the colour came from `style.css`'s
                 `var(--wp--preset--color--accent, currentColor)` with NO PHP emission at all, so an
                 attribute-level diff shows empty-vs-'accent' and tells you nothing
    Fail:        G14(f) runs on FIVE paths, not three — including `submenuLinkBgHover` (leaving
                 `submenuLinkBg` empty, which is the whole point: a resting-only check passes it)
                 and `burgerHoverColour` (not `burgerBg`). ⛔ On the `burgerHoverColour` path assert
                 the button's HOVER fill paints as a FILLED BUTTON and not as coloured letter
                 shapes: it is a `background-color` longhand, so the sweep's `background-image`
                 survives and a naive "no background-image" check passes while the clip still ruins
                 the render
    Integration: G14(g) — for each of the three rows, one stored value that STRADDLES the boundary,
                 and BOTH halves asserted **in one check on one stored state**: the editor row shows
                 two segments AND the rendered CSS carries no clip declarations. ⛔ Never the UI
                 check on one fixture and the PHP check on another — the defect proved absent is
                 *disagreement*, and two checks on two fixtures can both pass while the surfaces
                 disagree on every real page. Plus the converse on an unblocked fixture, without
                 which (g) is vacuous
```

---

### Step 23 — Live Playwright verification, lane 2: interaction + accessibility gates

```
  Model:       sonnet
  Action:      Assert G7, G8, G9, G10, G16, G19, G20 on the live canary.
  Files:       .claude/verify/spec-41-gates.md (evidence log, appended — coordinate with step 22)
  Inputs:      Spec 41 §11 G7, G8, G9, G10, G16, G19, G20
  Outcome:     Each gate recorded PASS with its command and observed value.
  Exec:        PARALLEL with step 22
  Deps:        step 21
  Marker:      (none)
  Time:        90 min
  Tooling:     Playwright MCP, /a11y-audit, /verify-loop
  On-Fail:     Record the delta, return to the owning step. ⛔ Never fabricate a PASS.
  Test:
    Happy:       G7 — hover a parent with a dropdown in the BAR, move into the dropdown, confirm via
                 `getComputedStyle` the parent's hover declarations are STILL applied; repeat inside
                 the DRAWER's accordion; tab into each panel for the `:has()` half; with a non-zero
                 `submenuTopOffset` move the pointer slowly across the gap and confirm the parent's
                 paint never drops
    Edge:        G10(b) — ⛔ `getComputedStyle` ALONE does not close the Current-weight half.
                 `theme/sgs-theme/theme.json` registers `display` with a SINGLE 400 face and
                 `dm-sans` with `400 700`, so `font-weight:600` computes as `600` while painting at
                 400 and the computed check passes against no visible difference. Assert BOTH the
                 computed value AND a rendered difference — a `getBoundingClientRect().width` delta
                 on a fixed test string, or `document.fonts.check('600 16px <family>')`
    Fail:        G9 — assert the reduced-motion CAUSE, not just the outcome. The winning
                 `transition-duration` must be the `!important` one from the FOUR-selector
                 `@media (prefers-reduced-motion: reduce)` rule in nav-menu's `style.css`. FR-41-31's
                 companion rule sits at (0,2,0) and out-ranks `fx-magnet.css`'s own (0,1,0) kill
                 switch, so that pre-existing `!important` rule is the ONLY thing killing the
                 transition — an outcome-only assertion would still pass if someone later narrowed
                 that selector list, and would pass for the wrong reason. Also assert the companion
                 rule itself carries NO `!important`
    Integration: G9 and G19(c) both need a POSITIVE control — assert the animations FIRE without the
                 media query, and assert the ABSENCE of hover typography declarations at defaults.
                 A check that only asserts 0 under reduced motion passes against a dead feature
```

⛔ **G10(a) must NOT assert a Hover signal on a border-less menu.** `itemBorderWidth` defaults to
`{}`, so an untouched block ships no Hover signal by design (FR-41-17a case a), and a gate asserting
one would be asserting a capability the spec deliberately does not claim.

---

### Step 24 — G5a: the stored-content migration on the canary, + G20b

```
  Model:       sonnet
  Action:      Run the deleted-attribute sweep over the canary's pulled `post_content`, execute the
               `indicatorStyle → itemBgHoverTreatment` migration with its colour carry-across and
               its three precedence cases, and assert G20b's five notice conditions.
  Files:       (canary post_content only; no repo file edited except the evidence log)
  Inputs:      Spec 41 §11 G5a + G20b; FR-41-34(b)
  Outcome:     Zero surviving references to any deleted attribute in stored content; every migrated
               key carries the correct value; the notice appears on exactly the changed keys.
  Exec:        SEQUENTIAL after steps 22 and 23
  Deps:        steps 22, 23
  Marker:      (none)
  Time:        60 min
  Tooling:     wp-cli over SSH, `npm run audit:post-content`, Playwright
  On-Fail:     ⛔ Restore the post from its revision. A green build proves NOTHING here.
  Test:
    Happy:       a page with `indicatorStyle:'pill'` and a differing `indicatorColour` migrates to
                 `itemBgHoverTreatment:'highlight'` + the carried colour, and shows the Notice
    Edge:        **PRECEDENCE** — if the stored content ALREADY carries a non-empty `itemBgHover`
                 (or `itemBgHoverGradient`), KEEP IT and SKIP the colour carry-across for that key;
                 the treatment flip still happens. ⛔ Never silently overwrite operator-stored data,
                 including data that was not rendering. Per-KEY, not per-post
    Fail:        **THE UNSET-SOURCE CASE — the commonest real state.** When `indicatorStyle` is
                 `'pill'` and BOTH `indicatorColour` and `itemBgHover` are empty, **write
                 `itemBgHover: 'accent'`** — do not leave it empty. `indicatorColour` defaults to
                 `""` and `style.css`'s `.sgs-nav-menu__indicator` declares
                 `background-color: var(--wp--preset--color--accent, currentColor)`, so a client who
                 switched Pill on and never opened the picker is looking at an accent pill right
                 now. Carrying an empty value across ships an invisible pill with no failing gate.
                 ⚠ If the target theme declares no `accent` slug, LOG that case explicitly as
                 unresolved rather than writing a dead slug silently
    Integration: ⛔ PHP does NOT drop an undeclared attribute before `render.php` runs (D338 —
                 `prepare_attributes_for_render()` merely `continue`s past it), so a stored value
                 keeps being handed over until the next EDITOR SAVE. Sweeping the attribute from
                 `block.json` is not the same as removing it from a client's page
```

---

### Step 25 — Bean's visual sign-off (R-31-13 — co-authoritative, not a formality)

```
  Model:       inline (+ design-reviewer agent for the 3-viewport pass)
  Action:      Present the canary at 375 / 768 / 1440 px with the new controls exercised, alongside
               a written summary of what changed and the four accepted residual risks (FR-41-17a
               a-d), and get Bean's explicit yes.
  Files:       .claude/verify/spec-41-gates.md (sign-off record)
  Inputs:      steps 22-24's evidence log
  Outcome:     Bean has looked at it and said yes, or named what to change.
  Exec:        SEQUENTIAL
  Deps:        step 24
  Marker:      HANDOFF
  Time:        20 min (Bean's time: ~10 min)
  Tooling:     design-reviewer agent, Playwright, /visual-qa
  On-Fail:     Bean names a change → it becomes a new step, and the gates it touches re-run.
  Test:
    Happy:       Bean signs off
    Edge:        present the FOUR residual risks explicitly (no-border default, switched-off case,
                 the `color-mix`-less browser under Sweep, the empty-Hover-swatch fallback) — they
                 are accepted, not hidden, and Bean accepting them is part of the sign-off
    Fail:        script measurement alone does not close this and neither does Bean's eye alone —
                 BOTH are consulted (R-31-13)
    Integration: the three-viewport pass also re-checks the header/footer chrome is unaffected
```

---

### Step 26 — Flip the detector WARN → HARD gate (G20c)

```
  Model:       haiku
  Action:      Flip `check-ungated-paint-rules.py --check` from warn-only to hard-fail (the one line
               step 11 left behind a clearly-named constant), and re-run the reachability proofs.
  Files:       plugins/sgs-blocks/scripts/check-ungated-paint-rules.py
  Inputs:      step 16's clean tree; Spec 41 §11 G20c
  Outcome:     `--check` exits non-zero on an ungated paint rule anywhere in the framework.
  Exec:        SEQUENTIAL
  Deps:        step 25 (the tree must be proven clean first — a gate that fails on day one is a gate
               nobody reads)
  Marker:      (none)
  Time:        15 min
  Tooling:     python, npm run gate:list, npm run gate:selftest
  On-Fail:     If `--check` now fails on a block OTHER than nav-menu, that is a real pre-existing
               finding — do NOT weaken the detector to make it green. Record it, park it as its own
               piece of work with Bean's agreement, and either scope the hard-fail to the blocks
               already clean or land the fix.
  Test:
    Happy:       `--check` exits 0 on the post-FR-41-15 tree — all 11 censused rules gone
    Edge:        `--self-test` still passes in BOTH directions (fixtures FAIL, cleaned copies PASS)
    Fail:        `grep -c "sgs-nav-menu" .../check-ungated-paint-rules.py` → **0** outside test
                 fixtures. That grep is the whole scope decision made checkable: if it fails, a gate
                 was built as a nav-menu lint
    Integration: `npm run gate:list` shows it with tier + measured cost. ⛔ NOT a `package.json`
                 grep — that returns a false positive in precisely this direction since the
                 2026-08-24 gates.json split
```

---

### Step 27 — Living-docs update + decisions + spec status

```
  Model:       inline
  Action:      Record the phase's architectural decisions and reconcile every living doc.
  Files:       .claude/decisions.md · .claude/specs/README.md ·
               .claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md (frontmatter `status`) ·
               plugins/sgs-blocks/CLAUDE.md · .claude/LEDGER.md · .claude/parking.md (ONLY with
               Bean's explicit yes) · .claude/plans/plan.md
  Inputs:      everything above
  Outcome:     No living doc still describes the pre-Spec-41 world.
  Exec:        SEQUENTIAL
  Deps:        step 26
  Marker:      HANDOFF
  Time:        35 min
  Tooling:     Read/Edit, `python .claude/hooks/handoff-preflight.py --check`
  On-Fail:     `handoff-preflight.py --check` names what is non-conformant; fix and re-run.
  Test:
    Happy:       `python .claude/hooks/handoff-preflight.py --check` passes
    Edge:        **Re-check the D-ceiling in the SAME command as the write.** Two D-number
                 collisions happened in one session from checking earlier and writing later.
                 Ceiling at plan time was **D1019** — re-derive it:
                 `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
                 (⛔ anchor on the heading — an unanchored `grep -oE 'D[0-9]+'` matches hex colours
                 and reports a wildly wrong ceiling with full confidence)
    Fail:        ⛔ **Do NOT add a parking entry without asking Bean first.** parking.md is a
                 commitment to future work, not a doc-reconciliation dumping ground. This has
                 recurred four times, most recently as a rationalisation ("he basically already
                 knows"). Ask. Every time.
    Integration: `.claude/specs/README.md` row 41 is stale on BOTH counts today — it says
                 **v0.4.1** (the spec is 0.4.6) and **draft**. Update the version, the status to
                 `built`, and the summary text, which still asserts the `showHover` trio is
                 "deliberately NOT adopted" — 0.4.2 restored it
```

**Decisions to record (D-numbers assigned at write time, ceiling re-derived in the same command):**

| Decision | Tag | Why it is a decision, not just work |
|---|---|---|
| `SgsBorderControl` gains `showColour` + re-parents the shared `BorderStyleControl` | `[ROUTINE]` | A shared-component change with 40+ mounts — design-gated per project rule 7 |
| `fx-magnet.css` exposes `--sgs-magnet-transition` | `[ROUTINE]` | A shared-stylesheet touch reaching every magnet element in the framework — design-gated |
| `SgsColourPanel` rows accept an optional `heading` | `[ROUTINE]` | Shared-component change; zero blast radius by construction, but gated all the same |
| `sgs_emit_state_colour_css` / `sgs_fill_decls` / `sgs_text_decls` / `sgs_border_states_css` gain an optional third state — **no `_3` family** | `[ROUTINE]` | 122 call sites; the no-triplication rule is the load-bearing half |
| `check-ungated-paint-rules.py` — a new FRAMEWORK-WIDE gate, landed warn-only then hardened | `[INCIDENT]` | Born from a defect CLASS found by three consecutive reviews; the scope decision (framework-wide, not a nav-menu lint) is the thing worth recording |
| `_sgs_nav_menu_migration_notice` — the first `_sgs_*` post meta registered on `post`/`page`, and the first `<Notice>` in the plugin whose dismissal clears a persisted flag | `[ROUTINE]` | Two genuine firsts, both disclosed as new rather than implied precedented |
| Border colour moves into `SgsColourPanel` for `sgs/nav-menu` only — a named block-scoped exception to that component's three documented exemptions | `[ROUTINE]` | Taken on merit; the general rule is unchanged and no other block moves |
| `edit.js` and `render.php` split into modules following the `cart/` and `product-card` precedents | `[ROUTINE]` | Establishes which precedent applies to which language (see KJC-1) |

**`plugins/sgs-blocks/CLAUDE.md` additions (new precedent genuinely created by this build):**
the `showColour={false}` mount pattern and its ten-prop ignore-list · the `supports.sgs.<key>` read
by BOTH surfaces as the canonical shape for a fact `edit.js` and `render.php` both need (the
"one declared source, two evaluators" pattern) · the block-private typography-hover emitter as the
adoption cost of `TypographyControls`' `showHover` flag, and the note that a SECOND adopter should
extend the shared helper instead.

---

## Key Judgement Calls

### Primary decisions (surfaced during planning — Bean's call, not mine)

**KJC-1 — Where does the split-out `render.php` PHP actually live?**
- **Options:** (A) `plugins/sgs-blocks/includes/nav-menu-css.php`, `require_once`'d — the proven
  precedent (`sgs/product-card` requires `includes/product-card-builtin-render.php`). (B) A sibling
  partial inside `src/blocks/nav-menu/`, matching where `cart/`'s JS partials live. (C) Do not split
  `render.php` at all; accept a ~2,500-line file and take the file-length violation.
- **Recommendation:** **(A)**.
- ✅ **(A)'s shipping path is PROVEN, not assumed (corrected by the Hidden Decisions pass — PD-2).**
  `plugins/sgs-blocks/build/blocks/nav-menu/render.php` already exists, so `--webpack-copy-php`
  demonstrably runs; and `dirname( __DIR__, 3 )` resolves to `plugins/sgs-blocks` from **both** the
  `src/` and the `build/` copy, because both trees place the block folder exactly three levels down.
  My original framing of this KJC as "the `includes/` route is unproven" was wrong.
- **Why:** (B) is unproven — nothing in this repo demonstrates that
  `--webpack-copy-php` copies an arbitrary sibling `.php`, and a file that fails to ship 500s the
  front end. (C) leaves a file 8× the project limit that every future session has to read around.
  (A) ships by construction, because the whole `includes/` directory is part of the plugin.
- ⛔ **What Bean is ACTUALLY ruling on, now the shipping question is closed:** only the FR-41-21
  wording conflict below. ⚠ And that ruling must NOT silently also decide where the
  typography-hover emitter lives — the CSS-emission split and the emitter's home are two separate
  placement questions this KJC originally conflated.
- ⚠ **The tension Bean is actually ruling on:** FR-41-21 says the typography-hover emitter must be
  "a file-local function in this block's own `render.php`, **not** an addition to `includes/`". Read
  literally, (A) violates it. Read by intent — "not a SHARED framework helper with blast radius" —
  a `nav-menu-css.php` required only by nav-menu is still block-private in ownership. **My reading
  is the intent one, but this is exactly the "plan-vs-hardened-rule collision" that must be asked
  rather than resolved by default.**
- **Cost of wrong choice:** (B) chosen wrongly = a white-screen front end on the canary, caught at
  step 21, ~1h to unwind. (A) chosen against Bean's intent = a spec amendment is needed to FR-41-21,
  ~15 min, no code cost.
- **Who decides:** Bean.

**KJC-2 — Does the `edit.js` split move the `colourRows` literal, or keep it in `edit.js`?**
- **Options:** (A) Move `colourRows` into `colour-rows.js` and import it. (B) Keep the literal in
  `edit.js` and extract only the panel components. (C) Split it per grouping (Menu / Submenu / Menu
  button) into three literals.
- **Recommendation:** **(A), conditional on QA-1 question (b) confirming
  `inspector-scan/rules/31-golden-colour-control.js` still resolves it.** If the council finds the
  detector goes blind, fall back to (B) immediately.
- **Why:** `colourRows` will be the single largest structure in the file after this build (seven
  rows × three states × a treatment selector each). Leaving it in `edit.js` makes the 250-line limit
  unreachable. But the detector resolving `statesArray.elements.length` on a **literal
  `ArrayExpression`** is a real constraint, and D738 is the recorded case of exactly this — the code
  improved and the gate went blind.
- **Cost of wrong choice:** A blind golden-colour gate is invisible: every row renders correctly and
  the detector silently reports the wrong state count, indefinitely. That is the most expensive
  failure mode in this whole phase, because nothing surfaces it.
- **Who decides:** joint — the council answers the technical half, Bean rules if it comes back
  ambiguous.

**KJC-3 — Does the detector's hard-fail flip (step 26) apply framework-wide on day one?**
- **Options:** (A) Hard-fail framework-wide immediately. (B) Hard-fail for `sgs/nav-menu` only, warn
  for every other block, widen later. (C) Stay warn-only indefinitely.
- **Recommendation:** **(B)**, then widen once the framework-wide findings are triaged with Bean.
- **Why:** `--survey` with no `--block` filter will almost certainly find real ungated paint rules on
  other blocks — this defect class was found three times on nav-menu alone. (A) turns the build red
  for every session on work nobody scoped, and a gate that always fails is a gate nobody reads
  (recorded: `wp-pre-merge-gate` printed FAIL on every commit for months, 220/228 findings from a
  vendored competitor plugin, and standing red trained readers to skip it). (C) is the failure
  FR-41-35 exists to end.
- ⚠ **(B) has a real cost worth naming:** a per-block allowlist is a hard-coded dict, which brushes
  against R-31-1. Keep it in `gates.json` config, not in the script, and give it an explicit
  expiry-condition comment.
- **Cost of wrong choice:** (A) = every concurrent session blocked on findings they did not create,
  and the near-certain outcome is someone bypasses it and the habit sticks.
- **Who decides:** Bean.

**KJC-4 — Is step 24's canary migration run against REAL client content, or a fixture?**
- **Options:** (A) Run it against the live canary's actual pages. (B) Duplicate the affected pages
  first, migrate the duplicates, verify, then migrate the originals. (C) Build fixtures only and
  defer the real migration.
- **Recommendation:** **(B)**.
- **Why:** G5a's whole point is that a green build proves nothing and a silent overwrite is invisible
  afterwards. A duplicate gives a before/after pair on identical content — which is precisely what
  G13's three scenarios need anyway — at the cost of a few minutes.
- **Cost of wrong choice:** (A) = a mis-specified precedence rule silently overwrites operator colours
  on real pages, with the pre-state recoverable only from revisions. (C) = the commonest real state
  (unset source) never gets tested against real content, which is exactly how 0.4.3 shipped it broken.
- **Who decides:** Bean.

**KJC-5 — Is the `sgs/nav-drawer` close-side companion work (FR-41-12: no editable label, no
icon-and-text form) in this phase or its own?**
- **Options:** (A) Fold `closeLabel` + an icon-and-text `closeStyle` into this phase. (B) Its own
  phase on the nav-drawer track. (C) Park it.
- **Recommendation:** **(B)**.
- **Why:** The spec explicitly names it as a cross-block companion that does not block this work, and
  it lands in a different `block.json`. Folding it in widens this phase's blast radius onto a second
  block for a symmetry gain, not a correctness one.
- ⚠ **The honest cost of (B):** until it lands, the open side has an editable label and the close
  side does not, which reads to an operator as half-finished.
- **Cost of wrong choice:** (A) = a second block's manifest in an already-large phase, and a second
  set of G1-shaped byte-identity proofs.
- **Who decides:** Bean.

**KJC-6 — Do `edit.js` Lane 5 and `render.php` Lane 6 actually run as two concurrent subagents?**
- **Options:** (A) Yes — two `/subagent-driven-development` loops in parallel after step 10.
  (B) Sequential: render first, then inspector (or vice versa). (C) One agent does both.
- **Recommendation:** **(A)**, with a hard precondition: each lane's agent is given ONE writable
  directory/file-set named in its prompt, and the dispatching session runs `git diff --stat` between
  every step.
- **Why:** The two lanes write genuinely disjoint file sets and share only *declarative data*
  (`sweepEligibility`), which neither writes. That is the shape parallel dispatch is for, and it
  roughly halves the critical path through the largest two steps in the phase.
- ⚠ **The named risk, from this project's own record:** parallel agents destroy each other's work in
  four ways, and `git diff --stat` catches all four. Also recorded: an agent told "do NOT run any git
  command" ran `git stash`/`pop` in the shared tree anyway to self-verify. **A prohibition in a brief
  is not enforcement** — which is why every prompt above says "do not run git beyond diff/status"
  AND the dispatching session reviews the diff itself rather than trusting the report.
- **Cost of wrong choice:** (A) mis-run = two agents' edits interleave on `main` and the unwind is
  forensic. (B) = roughly +3.5h of critical path.
- **Who decides:** Bean.

---

### ⛔ KJC-7 — `sgs_border_states_css()` HAS NO EDGE PARAMETER, so FR-41-8's sweep rule is unimplementable as written

**This is the most important finding in the whole planning pass, it came from the Hidden Decisions
review, and I verified it myself rather than accepting it.**

FR-41-8 states the sweep rule as the emitter's own condition:

> *"`sgs_border_states_css()` receives a `$map` whose `hover` (and `current`) keys are UNSET for the
> `bottom` edge whenever the sweep is active. … Every other edge is untouched and keeps all three
> states."*

**Verified signature and behaviour** —
`plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css`:

```php
function sgs_border_states_css( string $selector, array $attributes, array $map ): string
```

`grep -n "function sgs_border_states_css" -A 45 plugins/sgs-blocks/includes/helpers-colour-variants.php`

**There is no edge parameter and no per-edge branch anywhere in the function.** It resolves one
`$normal_paint` and one `$hover_paint` and emits a single flat `border-color:` declaration that
paints all four sides identically. **"Unset hover and current for the bottom edge only, keep them on
the other three" cannot be expressed through this call at all** — the helper is edge-blind by
construction. An executor reaching Step 15 rule 5 stops dead, or invents something.

- **Options:** (A) Extend `sgs_border_states_css()` with an edge-aware `$map` shape — a **fourth**
  shared-helper change, design-gated, with callers across the block library (container,
  product-card and others). (B) Call the helper normally for the full three-state border, then emit
  ONE additional block-private override rule resetting `border-bottom-color` under hover and current
  on the swept selector. (C) Amend FR-41-8 to specify (B) as the mechanism, so the spec and the code
  agree.
- **Recommendation:** **(B), with (C) as the same-session follow-up** — implement it block-private,
  then correct FR-41-8's wording so the next reader is not sent back to a call that cannot carry it.
- **Why:** (A) adds a fourth design-gated shared-component change to a phase that already carries
  three, and buys an edge-aware API that exactly one caller wants. (B) is a handful of lines with
  zero blast radius and is the same block-private-rather-than-extend-the-shared-helper call FR-41-21
  already makes for the typography trio — so it is consistent with the spec's own instincts, not a
  departure from them.
- ⚠ **The honest cost of (B):** it is a second mechanism touching border colour on one selector, and
  the specificity has to be right or the override does nothing. It needs its own assertion — fold it
  into **G6**, which already asserts `getComputedStyle(link).borderBottomColor` is
  `rgba(0, 0, 0, 0)` while the `::after` band paints. G6 is the right gate for it and needs no new
  gate.
- **Cost of wrong choice:** shipping neither, or leaving it to the executor, produces **two visible
  horizontal lines on hover** — the exact double-line bug class this entire redesign exists to
  remove, arriving through the front door.
- **Who decides:** Bean.

⚠ **Step 15's rule 5 must not be dispatched until this is ruled on.** Its current wording instructs
an action the API cannot perform, which is precisely what QA-1's mandate ("flag any step whose
fix-shape is a hypothesis rather than a spec") exists to catch — and the Hidden Decisions pass
caught it first.

---

### Pre-emptive decisions (Hidden Decisions pass — two cold peer reviewers, Sonnet + Haiku)

*(Stage 6 mandatory pass, RUN. Two cold reviewers with distinct personas — a conscientious senior
engineer who hates being blocked, and a pedantically literal junior who refuses to infer intent —
were dispatched via `/dispatching-parallel-agents` against this plan with Step 15 as the
representative step. Their findings are deduplicated below, and **every factual claim either
reviewer made about the real code was re-verified with a command before being acted on** — two of
their premises were right and corrected this plan, one of mine was wrong and is corrected here.)*

**PD-1 — ⛔ "`edit.js` reads `sweepEligibility` via the already-imported manifest" is FALSE.**
- **Flagged by:** sonnet-reviewer · **verified independently:**
  `grep -n "block.json\|metadata" plugins/sgs-blocks/src/blocks/nav-menu/edit.js` returns only a
  prose comment; `cat plugins/sgs-blocks/src/blocks/nav-menu/index.js` shows `import metadata from
  './block.json'` lives in **`index.js`**, not `edit.js`. The `Edit` component never receives
  `supports` as a prop either.
- **Pre-answer:** **Add `import metadata from './block.json';` to whichever module reads the
  predicate** (`colour-rows.js` after step 7's split). It is a read-only static import identical to
  what `index.js` already does, and it does NOT count as editing the frozen `block.json`. Step 13's
  prompt wording is corrected accordingly.
- ⚠ **Second-order:** whichever file carries that import is also the file carrying the `colourRows`
  literal, so it must be re-checked against `31-golden-colour-control.js`'s literal-`ArrayExpression`
  resolution exactly as KJC-2 requires. The import does not itself break resolution, but the check is
  the same check.
- **Why it matters:** an executor told to use an import that does not exist searches, finds nothing,
  and then has to decide unaided whether adding one violates the block.json freeze.

**PD-2 — ✅ KJC-1's shipping risk was MY error: the `includes/` path arithmetic is PROVEN, not
unproven.**
- **Flagged by:** sonnet-reviewer · **verified independently:**
  `plugins/sgs-blocks/build/blocks/nav-menu/render.php` already exists (so `--webpack-copy-php`
  demonstrably runs), and `dirname( __DIR__, 3 )` resolves to `plugins/sgs-blocks` from **both**
  `build/blocks/nav-menu/render.php` and `src/blocks/nav-menu/render.php` — both trees place the
  block folder exactly three levels down.
- **Pre-answer:** **KJC-1 is no longer a shipping-path question.** Option (A) is safe by
  demonstration. What remains of KJC-1 is ONLY the FR-41-21 wording conflict, and KJC-1's text above
  is corrected to say so. ⚠ **Do not let that ruling silently also decide where the
  typography-hover emitter lives** — the CSS-emission split and the emitter's home are two separate
  placement questions the original KJC conflated under one number.
- ⚠ **One real load-order note for step 8:** `helpers-tokens.php`, `helpers-hover-state.php` and
  `helpers-colour-variants.php` are all required globally at plugin bootstrap (via
  `includes/render-helpers.php`), but `nav-menu-css.php` will be `require_once`'d **per-instance from
  `render.php`**, matching product-card's pattern. So its functions are only in scope after
  nav-menu's own `render.php` has run at least once on that page load. Fine today (nothing else calls
  into nav-menu internals) — **put a one-line comment in the file saying so**, or a future cross-block
  call fatals for a reason nobody will find.

**PD-3 — Step 9's Test block ("attribute count rises from 79 to the declared post-build figure")
contradicts this plan's own rule against cached counts.**
- **Flagged by:** haiku-reviewer (literally: "WHERE is the post-build target figure declared?")
- **Pre-answer:** **Do not target a number, and the Test block is corrected.** Current count is 79.
  Step 9 deletes 12 and adds every row in §8.4 plus FR-41-22(a)'s submenu family plus its three hover
  companions. **Assert the NAMES against §8.4 and §FR-41-22(a), never a count** — a builder chasing a
  target number will invent or drop an attribute to reach it, and a count in prose is a copy that
  rots.

**PD-4 — Step 8 does not say WHERE the CSS-emission half of `render.php` begins.**
- **Flagged by:** haiku-reviewer
- **Pre-answer:** `render.php` carries an explicit section banner — **`── 4. Scoped CSS assembly`**.
  Split there. Everything from that banner to the end of the CSS assembly moves; the class
  definition and the markup-rendering methods above it stay. ⚠ **The banner is the anchor, not a
  line number** — grep for it (`grep -n "Scoped CSS assembly" plugins/sgs-blocks/src/blocks/nav-menu/render.php`),
  because other sessions commit to this file daily. Step 8's prompt is corrected to name it.
- ⚠ If the byte-identity harness fails after splitting at that boundary, the boundary is wrong —
  **move the boundary, do not patch the output.**

**PD-5 — Steps 7 and 8's `Exec:` lines are self-contradictory as written.**
- **Flagged by:** haiku-reviewer
- **Pre-answer:** They say "SEQUENTIAL before/after each other" AND "PARALLEL with steps 3-6, 11",
  which reads as impossible. The execution diagram is correct and the `Exec:` lines were sloppy:
  **7 and 8 are sequential WITH EACH OTHER inside Lane 2, and Lane 2 as a whole runs concurrently
  with Lanes 1, 3 and 4.** Both `Exec:` lines are corrected to say exactly that.

**PD-6 — Step 14's `Files:` list does not authorise creating a SIXTH sub-module if the rebuild busts
step 7's guessed boundaries.**
- **Flagged by:** sonnet-reviewer
- **Pre-answer:** **"Every file ≤ 250 lines" is the binding constraint and it outranks step 7's
  guessed module list.** Step 7's boundaries were chosen before ~40 new attributes and a full panel
  rebuild landed, so they are a hypothesis. Step 14 MAY create further modules inside its one
  writable directory to stay under the limit. ⛔ What it may NOT do is compress a `colourRows`
  literal into a generated form to save lines — a computed states array blinds the golden-colour
  detector (KJC-2, D738). Split the literal by GROUPING (Menu / Submenu / Menu button) instead; each
  grouping stays a statically-resolvable array literal. If that still does not reach 250, report the
  measured count to Bean rather than shipping the violation silently.

**PD-7 — Step 2 (QA-1) has no artefact, so "Council returned GO" is unverifiable by the next step.**
- **Flagged by:** haiku-reviewer
- **Pre-answer:** **QA-1 writes `.claude/verify/spec-41-qc-council-1.md`** carrying the verdict, the
  per-step predicted-outcome/baseline/validation table, and any fix-shapes folded back into this
  plan. Step 3's `Deps:` is that FILE EXISTING with a GO verdict, not a remembered conversation. Same
  for QA-5 → `.claude/verify/spec-41-qc-council-2.md`. A gate whose pass-condition lives only in
  scrollback is not a gate.

**PD-8 — What if `supports['sgs']['sweepEligibility']` is absent at render time?**
- **Flagged by:** sonnet-reviewer
- **Pre-answer:** Treat an absent key as **eligibility UNKNOWN → resolve to `'swap'`**, i.e. **fail
  CLOSED** (no sweep CSS emitted). ⛔ Never fail open. An absent key must not read as "no blockers,
  therefore eligible" — that is §8.6(g) item 4's dead-detector shape applied to the read side.
  Failing open emits `-webkit-text-fill-color: transparent` over a background that was never
  painted: invisible text, total content loss. Log once under `WP_DEBUG`; do not `error_log()` on
  every render.

**PD-9 — Which step owns deleting the `hoverStyle` dropdown and the "Underline" `PanelBody`?**
- **Flagged by:** both (as an ownership collision)
- **Pre-answer:** **Step 14 owns every UI deletion** (the `hoverStyle` dropdown, the "Underline"
  `PanelBody`, the "Indicator" panel, the "Menu item — state signals" panel). **Step 16 owns the CSS
  and attribute-read deletions.** They sit in different lanes and would otherwise both edit around
  one feature — doing it twice or not at all. Step 9 already removed the attributes from the
  manifest, so by step 14 those controls write to attributes that no longer exist, which is why step
  14 runs `check-dead-controls.js`.

**PD-10 — Step 15's "Prove it" asks for emitted CSS with the predicate TRUE and FALSE, but never says
how to force it FALSE.**
- **Flagged by:** sonnet-reviewer
- **Pre-answer:** **Force it by setting a real blocking attribute, never by stubbing the registry
  read.** For `submenuColourHoverTreatment`, set `submenuLinkBgHover`; for
  `burgerColourHoverTreatment`, set `burgerHoverColour`; for `itemColourHoverTreatment`, set
  `itemColourGradient`. Those are the same straddling fixtures G14(f) and (g) need anyway, so build
  them once at step 15 and reuse them at step 22. Stubbing the registry would prove the stub works.

**PD-11 — G13's byte-identity: identical to WHAT? There is no pre-build artefact.**
- **Flagged by:** sonnet-reviewer
- **Pre-answer:** **Capture the baseline at step 1, before any edit** — render the nav-menu with a
  fixture set covering each G13 scenario and save emitted CSS plus computed values to
  `.claude/verify/spec-41-baseline/`. G13 diffs against those files. ⚠ Scenario 4 (the 8px radius)
  deliberately does NOT diff source text — the two builds legitimately emit different source for the
  same painted result, so it asserts the COMPUTED value. **Step 1's `Files:` and `Outcome:` are
  corrected to include this**; without the correction a cold executor following step 1 literally
  would miss the baseline entirely and only discover it at step 22, which is a far more expensive
  place to notice.

**PD-12 — Step 16 deletes census #5's drawer current-page tint and #3's separator. Does the canary
visibly lose a look?**
- **Flagged by:** haiku-reviewer
- **Pre-answer:** **Yes, deliberately, and the spec names it.** An untouched drawer ships no
  separator and no current-page tint after this build — the same accepted default-reduction
  FR-41-17a(a) records for the Hover signal, closed the same way (one `itemBorderWidth` entry, one
  `itemBgCurrent` entry). ⛔ Do NOT "preserve" either rule: a kept hardcoded rule paints *in addition
  to* the operator's choice, which is the silent-override class this phase exists to remove.
  **Surface it in step 25's sign-off** so Bean sees the change rather than discovering it.

**PD-13 — Can a subagent commit, or does the dispatching session commit?**
- **Flagged by:** both
- **Pre-answer:** **The dispatching session commits, always.** Every prompt says "do not run git
  beyond `diff`/`status`". The dispatcher reviews `git diff --stat`, confirms the blast radius
  matches the step's declared `Files:`, then commits with an EXPLICIT pathspec naming each file.
  ⛔ Never `git add -A`, never a glob. ⛔ Never `git stash`. Pull/rebase onto `origin/main` and push
  after every completed step. ⚠ A prohibition in a brief is not enforcement — the diff review by the
  dispatcher is what enforces it.

**PD-14 — Rollback if the phase is abandoned mid-flight?**
- **Flagged by:** sonnet-reviewer
- **Pre-answer:** Each step is its own commit on `main`, so rollback is `git revert` of the step
  commits in reverse order — **except step 9**, whose revert must be followed by re-running
  `/sgs-update`, because the derived DB does not un-reseed itself
  (`a-raw-db-update-does-not-survive-a-reseed`, in the other direction). Wave A's four shared-file
  steps are independently revertible and carry zero behaviour change, so they may stay in place even
  if the block work is abandoned.

⚠ **One reviewer finding is recorded as NOT actioned, with the reason.** The literal reviewer could
not read past Step 9 (the file exceeded its read budget) and reported several items as "cannot
verify" — those are artefacts of its read window, not defects in the plan, and are excluded. Its
findings that WERE real (PD-3, PD-4, PD-5, PD-7, PD-9, PD-12) all came from the part it did read.

---

## Gate → step map (all 23 acceptance gates, none unowned)

| Gate | Owned by | Kind |
|---|---|---|
| G1 (a)-(e) | Step 12 (QA-3) | byte-identity, 5 proofs |
| G2 | Step 20 (QA-6) + step 15 | static |
| G3 | Step 20 (QA-6) | static |
| G4 | Step 10 (QA-5) | DB negative control |
| G5 | Step 20 (QA-6) | static, 3 search scopes |
| G5a | Step 24 | stored content, live |
| G6 | Step 22 | live mechanism |
| G7 | Step 23 | live, both forks + Bean's eye |
| G8 | Step 23 | touch emulation |
| G9 | Step 23 | reduced motion + its CAUSE |
| G10 (a)(b) | Step 23 | renders, not just computes |
| G11 | Step 10 (QA-5) | reseed |
| G12 | Step 10 (QA-5) + step 20 | manifest conformance |
| G13 (4 scenarios) | Step 22 (baseline captured at step 1) | byte-identity + input-mapped |
| G14 (a)-(g) | Step 22 | cross-mechanism, 5 paths on (f) |
| G15 | Step 22 | icon default byte-identity |
| G16 (a)(b)(c) | Step 23 | relocated control still ACTS |
| G17 | Step 22 | magnet default costs zero bytes |
| G18 (a)(b)(c) | Step 22 (+ static half at step 20) | RENDERS / WRITES / EMITS |
| G19 (a)-(e) | Step 23 | trio renders, emits, is not the default |
| G20 (a)(b)(c) | Step 23 | tiers persist + render, both prefixes |
| G20b (a)-(e) | Step 24 | notice appears ONLY on a real change |
| G20c (a)-(e) | Step 26 | detector exists, reachable, can still fail |

---

## Docscore (Stage 7)

Run against the `archived-plan` template (the in-flight `plans/phase-*.md` location has no dedicated
`plan` doc_type; per the skill this is acceptable for in-flight work, and the file moves to
`plans/archive/` on completion where it picks up the template correctly).

**Tool grade: A (100%)** — Structural 100 / Completeness 100 / Quality 100 / Freshness 100, command
above. **Honest qualitative self-assessment: B+.** The tool grades structure against the template;
the caveats below are mine, not its.

Strengths: every step carries all nine required annotation fields plus a four-layer
Test block; every QA gate's `Check` is a runnable command with no prose assertions; all 23 acceptance
gates map to a named owning step; every pre-written prompt is paste-and-run and cites code by SYMBOL,
never by line; the Hidden Decisions pass was RUN with two cold reviewers and produced one genuine
blocker (KJC-7) plus two corrections to this plan's own factual claims, all re-verified with commands
before being folded in. Deductions: (1) the phase is large — 27 steps is at the upper bound of a
single phase and the `[HANDOFF]` markers at steps 25 and 27 are the only two natural session
boundaries in a body of work that will realistically span three or four; (2) seven KJCs is well above
the skill's 2–4 guideline, retained deliberately because each is a genuine owner call rather than an
implementation detail and suppressing one would surface it mid-execution instead; (3) time estimates
are optimistic by policy (`~/.claude/rules/time-estimates.md`) and carry no confidence band per step;
(4) KJC-7 means the plan is not fully executable as it stands — Step 15 rule 5 is blocked on an owner
ruling, which is the honest status rather than a B-grade shortfall to paper over.

---

## ADHD anchors

- **Rule 1 (full map + ranked menu):** the execution-shape diagram and the gate→step map make the
  whole phase visible before step 1; every KJC is a ranked menu with a recommendation, never a forced
  choice.
- **Rule 2 (smallest first action <5 min, zero dependencies):** Step 1 is re-running one Python
  snippet and one grep. Nothing depends on anything.
- **Rule 3 / 7 (motivation layer):** the USP at the top — this is the block on every page of every
  client site, and the 3-state shape built here is the shape every future stateful block copies.
- **Rule 4 (verification before completion):** every step proposes its verification command in its
  own prompt; no step reports done on a claim.
- **Rule 5 (scope check after 5+ file edits):** QA-3, QA-5 and QA-6 are exactly that, three times.
- **Rule 8 (scores ship with remediations):** every gate's `Fail:` names the step to return to.
- **Rule 9 (negotiated decisions):** six KJCs, all "who decides: Bean" or joint.
- **Rule 13 (session sprawl):** `[SESSION-START]` at steps 1, 13, 15, 21 and `[HANDOFF]` at 25, 27.
  Realistically this is **four sessions**: Wave A (steps 1-12), Wave B (13-20), Wave C+deploy
  (21-24), close (25-27).
