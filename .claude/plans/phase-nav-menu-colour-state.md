---
doc_type: phase-plan
plan_id: phase-nav-menu-colour-state
phase_name: Spec 41 — sgs/nav-menu colour, state + control system (build)
project: small-giants-wp
spec: .claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md
spec_version: 0.4.7
mode: ad-hoc phase (standalone spec, no parent strategic-plan)
date: 2026-09-11
cost_estimate: "~$39 (≈2.7M in / ≈0.60M out across 30 steps, 5 of them QA gates)"
docscore_grade: A- (94.3% — docscore.py, archived-plan template; the only failure is the 3,000-line doc-shape cap, disclosed and deliberately not chased — see §Docscore)
status: READY-TO-EXECUTE — all 7 Key Judgement Calls RULED by the owner 2026-09-11 (see §Resolved judgement calls). No step is blocked on a decision. FINAL edition: a full /qc pass (partial, 78/100) plus a /qc-council validation on 2 judgement-call fixes are folded in — all 7 MUST-FIXes + S1–S13 (see §QC + council closure).
---

# Phase — Spec 41 `sgs/nav-menu` colour, state + control system

**USP:** This is the block a visitor touches on *every page of every client site*, and today a
client cannot colour the page they are on, cannot control the line between items, and picks a
"hover style" from a dropdown instead of setting the colours they want. This phase turns the whole
thing into direct controls — and retires three competing mechanisms down to one. It is also the
first block to carry the framework's 3-state (Normal / Hover / Current) colour model end to end,
so the shape built here is the shape every future stateful block copies.

---

## QC + council closure (2026-09-11) — read this before dispatching step 1

**This plan has been through a full `/qc` pass and a `/qc-council` validation, and every finding is
folded in below. It is the FINAL, dispatch-ready edition.**

| Pass | Outcome | Record |
|---|---|---|
| `/qc` (7 stages, adapted for a plan-document target) | **`partial` · 78/100 · FIX THEN SHIP** — 7 MUST-FIXes, 13 SHOULD-FIXes. Its own estimate: folding all seven puts the plan at ~92 (`pass`/ship) | `.claude/reports/2026-09-11-nav-menu-plan-qc.md` |
| `/qc-council` on the 2 judgement-call fixes (the split arithmetic; the G13 re-assignment) | **Rulings issued and applied verbatim** — both changed step STRUCTURE rather than step prose, which is why they went to a council rather than a reviewer's preference | folded into steps 7, 8, 22, 24 + the gate→step map |

**All 7 MUST-FIXes are folded in:** ① step 6's emitter citations repointed to
`helpers-colour-variants.php` (4 of 5 were attributed to the wrong file) · ② steps 7 and 8's
file-count floors made arithmetically reachable · ③ steps 22/23 given disjoint evidence files **and**
a separate browser context each · ④ G13 scenario 3 moved to step 24 (it needs step 24's migration to
have run) + step 14a added to step 20's `Deps:` · ⑤ `SurfaceTreatmentPanel.js` cited as step 13's
shape precedent · ⑥ step 24's live-content migration given a named codemod with `--self-test` and
`--dry-run` · ⑦ a `/sgs-update` reseed + DB assertion added after step 14a's second-block manifest
change. **Plus the high-value SHOULD-FIXes** — S11 (hover-guard's pre-existing advisory exit-1
disclosed so step 20 cannot stall on it) and S12 (`Cold-Entry:` added to steps 9, 16, 22, 25, 27) —
**and S1–S10 + S13 batched in one line each.**

⛔ **BEAN'S EXPLICIT RULING, recorded here because it is the one thing a future revision will want to
re-open: `render.php`'s split requirement is measured on CODE LINES ONLY, not raw `wc -l`.** This is
consistent with **his own prior ruling D722**, which already rejected a raw-line-count gate on *this
exact file* for being comment-heavy — **48% comments then, 52% now**. It is why `render.php` splits
into **4** PHP files and not the 8 a raw-line reading would demand, while `edit.js` (only 11%
comments) splits on its raw count into **7**. **Do not re-litigate this without a fresh decision from
Bean.** Full derivation: step 8's callout + §Resolved judgement calls → *Ruling 7 addendum*.

**Plan label:** `[PLAN: opus]` — the manifest rewrite, the **four** shared-component touches
(`SgsBorderControl::showColour`, `fx-magnet.css`'s custom property,
`sgs_emit_state_colour_css`'s third state, and `sgs_border_states_css`'s `suppress_edges`) and the
FR-41-15 census execution are all expensive-to-undo and need architectural judgement at the seams.
Per-step dispatch is mostly `sonnet` (see each step's `Model:`).

**Docscore:** **A- (94.3%)** — `python ~/.agents/skills/shared-references/docscore.py
.claude/plans/phase-nav-menu-colour-state.md --type archived-plan`. Structural 85.7% (6/7) /
Completeness 100 / Quality 100 / Freshness 100. **The one failure is the 3,000-line doc-shape cap**,
which the 2026-09-11 QC fold-in re-crossed; §Docscore records why a second annex split was
considered and deliberately not taken. ⚠ The tool grades STRUCTURE against the template; the honest
qualitative caveats are recorded in §Docscore below and are not a tool finding.

**Aggregate cost estimate:** **≈$39.00** — **30 steps, FIVE of which are QA gates** (steps 2, 10,
12, **16a** and 20). ⚠ Two prior corrections are kept visible rather than overwritten: the
pre-revision line said "26 steps + 7 QA gates" (both halves wrong against the headings actually in
this file), and the 2026-09-11 QC revision added step **16a** (S1 — the `/qc-council` after the
census execution), taking 29 → 30 and 4 → 5 gates.
Derived from
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
- [ ] All **23 acceptance gates** (G1, G2, G3, G4, G5, G5a, G6–G19, G20, G20b, G20c) pass, each with its evidence recorded in `.claude/verify/spec-41-gates.md` — **assembled at step 25** by merging step 22's `spec-41-gates-mechanism.md` and step 23's `spec-41-gates-interaction.md` into the file step 24 seeds. ⛔ The two Playwright lanes write SEPARATE files (MUST-FIX 3): they run concurrently, and one evidence file plus one browser context between them is a shared-mutable-resource collision, not a coordination problem
- [ ] `plugins/sgs-blocks/src/blocks/nav-menu/edit.js` ≤ 250 lines (**≥ 7 JS files**) and `render.php` ≤ 300 **CODE** lines (**exactly 4 PHP files**), with every extracted module under the same limits (project CLAUDE.md file-length rule). **Each split sub-file carries its own size assertion in its step's `Test:` block — the limit is asserted per file, not eyeballed on a total** (owner ruling 7). ⛔ **PHP is measured on CODE LINES ONLY, not raw `wc -l`** — Bean's decision 2026-09-11, consistent with his own D722 which already rejected a raw-line gate on this exact file (48% comments then, 52% now). JS is measured on raw `wc -l` (`edit.js` is only 11% comments, so its bulk is real)
- [ ] `.claude/verify/spec-41-reuse-ledger.md` records, per split sub-file, which existing SGS atom / shared helper / injector-extension it reuses instead of new block-private code — or names why none applies (owner ruling 7: a split must reduce bulk through reuse, not relocate it)
- [ ] `python plugins/sgs-blocks/scripts/check-ungated-paint-rules.py --check` exits 0 **and** appears in `npm run gate:list`
- [ ] Bean has signed off visually on the live canary (R-31-13 — a number alone does not close this)
- [ ] `.claude/specs/README.md` row 41 reads `built`, version `0.4.7` (it currently says `v0.4.1` / `draft` — stale on both counts)

---

## Entry context (read before starting)

| File | What it contains |
|---|---|
| `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` | **READ IN FULL (4,546 lines — re-derive with `wc -l`; an earlier edition said 4,388, a 158-line drift on a READ-IN-FULL instruction).** The governing spec. Every FR is load-bearing; 6 revisions + 3 adversarial-council rounds have already removed the easy wrongness, so a skim finds nothing and misses the traps |
| `.claude/specs/36-SGS-NAVIGATION-SYSTEM.md` | The governing nav spec. FR-36-4 (distinct hover+focus states), FR-36-11 (WCAG floor), FR-36-28 (pointer to Spec 41) |
| `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` | No inline `style=` property declarations; scoped `<style>` only |
| `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` | Part L control completeness; Part O control-type contract; FR-35-5 STATE_WITHOUT_BASE |
| `plugins/sgs-blocks/src/blocks/nav-menu/` | `block.json` (610 L, 79 attrs, 8 elements), `edit.js` (1,535 L), `render.php` (2,031 L), `style.css` (427 L), `view.js` (158 L) |
| `plugins/sgs-blocks/CLAUDE.md` | Colour-control standard, precedent registry (`background-clip:text` `@supports` requirement), block-deprecation policy |
| `CLAUDE.md` (repo root) | The 7 rules, root-cause methodology, deploy path, git hygiene |
| `.claude/STOP-CATALOGUE.md` | Structural defences — read before the first edit |
| `.claude/plans/phase-nav-menu-colour-state-hidden-decisions.md` | **This plan's Hidden Decisions annex (PD-1 … PD-14)** — split out 2026-09-11, nothing deleted, IDs stable. Read before dispatching steps 7, 8, 9, 13, 14 or 15 |

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
| Does the build copy a sibling `.php` partial inside a block folder? | **Unproven.** `wp-scripts build --experimental-modules --webpack-copy-php` is documented to copy `render.php`; nothing proves it copies arbitrary siblings. ⚠ **This is why the `includes/` route is chosen over a sibling partial — see ruling 2** | `grep -n "webpack-copy-php" plugins/sgs-blocks/package.json` |

⚠ **Framework-wide finding from the `/qc-council` pass (2026-09-11) — context for both precedents
above, and OUT OF SCOPE for this build.** The per-file size limit is **not actually enforced
anywhere today**: 65 of 83 blocks already exceed the 250-line JS limit and 61 of 83 exceed the
300-line PHP one — **including the two files this plan cites as split precedents**
(`src/blocks/cart/edit.js` is 318 lines post-split against a 250 limit;
`product-card/render.php`'s extracted `includes/product-card-builtin-render.php` is 325 lines
against a 300 limit). **So cite those two as proof the splitting PATTERN is sound — never as proof
that splitting reaches full compliance.** Worth Bean's awareness; ⛔ do NOT widen this phase to fix
it, and ⛔ do not add a parking entry for it without asking Bean first.

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
| skill | `/subagent-prompt` | steps 3–6, 6a, 7–9, 11, 13–19 (prompts pre-written below) |
| skill | `/dispatching-parallel-agents` | Wave A (4 lanes), Wave B (2 lanes — owner ruling 7) |
| skill | `/subagent-driven-development` | Wave B and Wave C (implementer + 2 reviewers per task) |
| skill | `/qc-council` | step 2 (QA-1, plan fix-shapes), step 10 (QA-5, post-manifest, Bean-mandated), **step 16a (QA-7, post-census-execution — S1, blub.db 255)** |
| skill | `/verify-loop` | every QA gate (2 independent attestations per load-bearing claim) |
| skill | `/sgs-db` | step 10 (QA-5 — G4, G11, G12) |
| skill | `/sgs-update` | step 10 (`python plugins/sgs-blocks/scripts/sgs-update-v2.py`) |
| skill | `/wp-sgs-deploy` | step 21 |
| skill | `/visual-qa`, `/a11y-audit` | steps 23, 25 |
| agent | `wp-sgs-developer` | steps 13–19, 14a |
| agent | `design-reviewer` | step 25 |
| mcp | Playwright | steps 22, 23, 25 (live canary, R-31-11 / R-31-13) |
| cli | `npm run build`, `python scripts/build-deploy.py --target sandybrown` | step 21 |
| cli | `python scripts/run-gates.py --tier all \| --list \| --assert-wired \| --self-test` | steps 2, 12, 20, 26 |
| cli | `node scripts/audit-inline-styling.js --check` | step 20 (G3) |
| cli | `node scripts/hover-guard/check.js` | step 20 (G2) |
| cli | `node scripts/check-dead-controls.js --check` | step 20 (G5) |
| cli | `node scripts/check-duplicate-controls.js` | step 20 (G18) |
| cli | `npm run audit:element-manifest`, `python scripts/placement-reach.py` | step 10 (G12) |
| cli | `node scripts/inspector-scan/run.js --check` | steps 7, 13, 14 (rule 31 blind-spot proof) |

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

⚠ **This diagram was STALE by one step from Wave B onwards before this revision** — it showed
"S12 colour rows / S14 CSS emission / S24 Bean sign-off" against headings reading 13 / 15 / 25, and
invented an "S19 comment hygiene" step that does not exist (FR-41-19 is folded into step 9's prompt).
Rewritten below against the real headings.

```
WAVE A  (four independent lanes, all safe to run concurrently — zero file overlap)
  Lane 1  shared components + helpers   S3 ∥ S4 ∥ S5 ∥ (S6 → S6a)   → S12 = QA-3 (G1 a–e)
                                        └─ S6a is SEQUENTIAL after S6: both write
                                           includes/helpers-colour-variants.php
  Lane 2  pure refactor (no features)   S7 → S8                      → S12 (split parity)
  Lane 3  manifest                      S9                           → S10 = QA-5 (qc-council + G4/G11/G12)
  Lane 4  new detector                  S11 (WARN-ONLY)              → runs alone, hardened at S26
                                               ↓
WAVE B  (two lanes, BOTH blocked on S10 and on S7/S8 — they need FINAL attribute names
         and already-split files. They do NOT touch each other's files, so once unblocked
         they are genuinely parallel — owner ruling 7 CONFIRMS running them as two
         concurrent subagent lanes.)
  Lane 5  inspector   S13 (colour rows) → S14 (panels) → S14a (nav-drawer close button + RESEED)
  Lane 6  render      S15 (CSS emission) → S16 (census execution) → S16a = QA-7 (qc-council #3)
                                                                  → S17 (style.css)
                                               ↓
WAVE C
  S18 fixes (FR-41-13)  ∥  S19 migration notice   → S20 = QA-6 (static gate sweep)
    └─ S18 and S19 are PARALLEL (S2): disjoint files — S18 writes only the nav-menu CSS
       module, S19 writes a NEW includes/ file + a panel module + sgs-blocks.php.
       S19's real deps are S14 (the panel module it mounts into) + QA-1 answer (c),
       never S18. ~60 min off the critical path.
                                               ↓
WAVE D  (verification — the phase does not close on a green script)
  S21 build+deploy → S22 ∥ S23 (two Playwright lanes) → S24 stored-content migration
  → S25 Bean sign-off → S26 detector WARN→HARD → S27 docs + living-docs
```

⚠ **Why `6a` / `14a` / `16a` rather than renumbering.** This file cross-references its own step numbers in
roughly a hundred places (`Deps:` lines, the gate→step map, every `PD-n`, the ADHD anchors, the
session markers), and this project has a recorded lesson for exactly that
(`renumbering-breaks-every-pointer-that-lives-elsewhere` — inserting three items mid-doc broke six
cross-references and needed three QC rounds, round 3's defects all caused by round 2's fix). A suffix
inserts the work in the right place at zero pointer cost, and the convention is already in use on the
gate names (`G5a`, `G20b`, `G20c`).

⚠ **Steps 4, 5 and 11's `Deps: step 2 (council GO)` is a DELIBERATE BLANKET QUALITY GATE, not a
derived dependency** (S9). QA-1's three named questions are (a) the `includes/` require shipping
path, (b) the inspector-scan corpus, (c) `register_post_meta` reachability — **none of them binds
step 4** (a two-line CSS custom-property declaration), **step 5** (an optional row `heading`) or
**step 11** (a standalone new detector touching no file any other step touches). The council is
still a legitimate quality gate over the whole plan, so the blanket hold stands by default — but it
is a CHOICE. ⚠ Step 11 is 70 minutes on the critical path and fully disjoint; **if Bean prefers, it
may start immediately, in parallel with step 2 itself.** Do not read this as a technical blocker.

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
it should have caught: `sgs_border_states_css()` has no edge parameter, so Step 15 rule 5 was
unimplementable as the spec worded it.** That is now RULED (owner ruling 1): the shared helper gains
an **additive optional `$map['suppress_edges']`**, built as its own step 6a, and FR-41-8 is rewritten
in the spec to describe the real API. Add both the finding and the ruling to this council's inputs
rather than making it re-derive them, and have it pressure-test the CHOSEN resolution — the additive
shared-helper extension and its zero-delta default — rather than the refuted one or the
block-private override this plan previously recommended.

⛔ **(b) is the highest-value question in this gate, it is not hypothetical, and a read of the real
detector says the answer is probably NO** — rule 31 has exactly two corpora (this block's `edit.js`
and `src/components/`) and a block-folder sibling is in neither, so an imported `colourRows` resolves
to nothing and every row silently scores zero states while the editor renders perfectly (D738).
**Owner ruling 3 carries the full mechanism and the four commands that produced it, and already
sets the safe default: the literal stays in `edit.js`. This council's job is to CONFIRM it
empirically** — a static read is a hypothesis until a before/after
`node scripts/inspector-scan/run.js --check` proves it. Its answer binds step 7.

---

### Step 3 — `SgsBorderControl` gains an additive `showColour` prop + re-parents `BorderStyleControl`

```
  Model:       sonnet
  Action:      Add `showColour` (boolean, default true) to
               `plugins/sgs-blocks/src/components/SgsBorderControl.js::SgsBorderControl`. When
               false, do not render the `.sgs-border-control__colour` FlexItem at all; instead
               render the existing shared `BorderStyleControl` as its own sibling in the same row,
               gated exactly as GradientCapableColourControl gates it today
               (`typeof onStyleChange === 'function'`). Document the ignore-list verbatim
               in the component's docblock (FR-41-33 item 1's table). ⚠ It enumerates **12 discrete
               items — 9 single props plus the 3-member contrast trio** (counted as one unit, 10);
               the earlier "TEN-prop" wording was imprecise. The LIST is what binds, never the count.
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
> 3. Add to the component's docblock a verbatim ignore-list naming the props that become inert
>    (**12 discrete items — 9 single props plus the 3-member contrast trio; 10 if the trio counts as
>    one**. The LIST binds, not the count)
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
               optional `current` key to
               `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_fill_decls` /
               `::sgs_text_decls` and forward it from their
               `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_fill_states_css` /
               `::sgs_text_states_css` wrappers; add the FLAT-PATH-ONLY third state to
               `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css`.
               ⚠ **FOUR of the five emitters live in `helpers-colour-variants.php`, NOT in
               `helpers-tokens.php`** — an earlier edition attached all five symbols to one filename
               prefix and a `/qc` pass caught it (MUST-FIX 1, 2026-09-11). Only
               `sgs_emit_state_colour_css` is in `helpers-tokens.php`. Verify before dispatch:
               `grep -rn "^function sgs_fill_decls\|^function sgs_text_decls\|^function sgs_fill_states_css\|^function sgs_text_states_css\|^function sgs_emit_state_colour_css" plugins/sgs-blocks/includes/*.php`
               → four in `helpers-colour-variants.php`, one in `helpers-tokens.php`.
  Files:       plugins/sgs-blocks/includes/helpers-tokens.php
               plugins/sgs-blocks/includes/helpers-colour-variants.php
  Inputs:      Spec 41 FR-41-3 (a), (b), (c) + its three binding emitter rules
  Outcome:     All 122 existing `sgs_emit_state_colour_css()` call sites emit byte-identical CSS;
               a caller passing `$extra_states` gets `{selector}{suffix}{decls}` emitted BEFORE the
               hover rule, unguarded when `guarded` is false.
  Exec:        PARALLEL with steps 3, 4, 5, 7, 11. ⛔ SEQUENTIAL BEFORE step 6a — both write
               `includes/helpers-colour-variants.php`, and two concurrent agents on one file is the
               collision shape `parallel_agent_dispatch_needs_one_directory_each` records.
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
> c, the three binding rules, and the specificity rule); then the current bodies of the five
> emitters, **in the two files they actually live in — do not search one file for all five:**
> - `plugins/sgs-blocks/includes/helpers-tokens.php::sgs_emit_state_colour_css` — this one ONLY.
> - `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_fill_decls`, `::sgs_text_decls`,
>   `::sgs_fill_states_css`, `::sgs_text_states_css`, `::sgs_border_states_css` — **all five of
>   these live here.**
>
> ⚠ Re-derive that mapping in one command before you start and paste it, rather than trusting this
> list: `grep -rn "^function sgs_fill_decls\|^function sgs_text_decls\|^function sgs_fill_states_css\|^function sgs_text_states_css\|^function sgs_emit_state_colour_css" plugins/sgs-blocks/includes/*.php`.
> ⛔ If a symbol is not where you expect it, the answer is NEVER "create the missing function" — it
> is in the other file. Then read
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

### Step 6a — `sgs_border_states_css()` gains an ADDITIVE optional per-edge suppression (`suppress_edges`)

> **Owner ruling 1 (2026-09-11) — full reasoning in §Resolved judgement calls.** This replaces the
> block-private override rule this plan previously recommended. It is the phase's FOURTH
> design-gated shared-component change and is treated exactly like the other three.

```
  Model:       sonnet
  Action:      Extend `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css`
               with ONE additive optional `$map` key, `suppress_edges`, in the SAME
               `{top,right,bottom,left}` naming the box object already uses. When present and
               non-empty, the FLAT-COLOUR path emits its NON-RESTING rules (hover, and the Current
               state step 6 just added) as per-edge `border-<edge>-color` LONGHANDS for the
               unsuppressed edges only, instead of the flat `border-color` shorthand. The RESTING
               rule is unchanged. Absent or empty → byte-identical output for every existing caller.
  Files:       plugins/sgs-blocks/includes/helpers-colour-variants.php  (ONLY)
  Inputs:      Spec 41 FR-41-8 (v0.4.7 wording — the REAL API, not the retired `$map['hover']`
               unset mechanic); the live function body read first; FR-41-3's no-sibling rule
  Outcome:     `sgs_border_states_css( $sel, $attrs, [ …, 'suppress_edges' => [ 'bottom' => true ] ] )`
               emits the resting `border-color` shorthand plus hover/current rules covering top,
               right and left only. Every OTHER caller in the tree — none of which passes the key —
               emits byte-identical CSS.
  Exec:        SEQUENTIAL after step 6 (same file). Lane 1 as a whole stays PARALLEL with Lanes 2-4.
  Deps:        step 6 complete
  Marker:      (none)
  Time:        30 min
  Tooling:     /delegate, /subagent-prompt, Read/Edit, php -l
  On-Fail:     Revert the hunk by hand. ⛔ Do not `git checkout --` a shared-tree file, and do not
               revert step 6's work with it.
  Test:
    Happy:       `'suppress_edges' => ['bottom'=>true]` with a hover colour set → the hover rule
                 emits `border-top-color`/`border-right-color`/`border-left-color` and NO
                 `border-bottom-color` and NO `border-color` shorthand
    Edge:        all four edges suppressed → NO non-resting rule is emitted at all (not an empty
                 `{}` rule, not a rule with no declarations)
    Fail:        ⛔ THE GRADIENT PATH IGNORES IT. When `gradient` or `hover_gradient` is set the
                 function delegates to `sgs_border_gradient_css()` — a masked `::before` ring that
                 takes exactly two paints and is edge-blind BY CONSTRUCTION. `suppress_edges` must
                 be silently ignored there and the docblock must SAY SO, exactly as step 6's
                 Current state is gradient-exempt at the ring level. ⛔ Do not attempt a per-edge
                 ring; do not throw; do not emit a half-ring
    Integration: **BYTE-IDENTITY GATE (owner ruling 1, folded into G1(c)).** Re-derive the caller
                 roster live —
                 `grep -rn "sgs_border_states_css(" plugins/sgs-blocks --include=*.php` — and prove
                 every call site that passes no `suppress_edges` key emits output identical to the
                 pre-step-6a build, byte for byte
```

**Prompt** (paste-and-run, `/subagent-prompt`-generated):

> You are editing ONE file: `plugins/sgs-blocks/includes/helpers-colour-variants.php`. Nothing else.
> Repo root: `c:\Users\Bean\Projects\small-giants-wp`.
>
> **Read first, in this order:** (1) the CURRENT body of
> `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css` in full,
> including step 6's freshly-added third state and the two long comment blocks above the
> flat-vs-gradient fork (they record two live incidents and are load-bearing context, not noise);
> (2) `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_gradient_css`, so you can
> see why the ring path cannot carry an edge; (3)
> `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` §FR-41-8 (v0.4.7) and §FR-41-3.
>
> **Task — ONE additive optional `$map` key. Do NOT change the function signature.** The signature
> stays `sgs_border_states_css( string $selector, array $attributes, array $map ): string`. The new
> capability arrives as a key inside the existing `$map`, which is how `gradient`, `hover`,
> `hover_gradient` and `width` already arrive. ⛔ Do NOT add a fourth positional parameter. ⛔ Do
> NOT create `sgs_border_states_css_per_edge()` or any sibling — the no-sibling rule that governs
> step 6's third state governs this identically.
>
> **The key's shape is the project's existing BOX OBJECT naming, reused verbatim:**
> ```php
> 'suppress_edges' => array( 'top' => false, 'right' => false, 'bottom' => true, 'left' => false )
> ```
> An absent key behaves as all-false. An absent EDGE inside the array behaves as false. Read it
> defensively — it is operator-adjacent data by the time nav-menu passes it.
>
> **Behaviour, exactly:**
> 1. **Resting rule: UNCHANGED.** It keeps emitting the `border-color` shorthand. (nav-menu makes the
>    swept edge's resting colour transparent with its own separate rule from the sweep branch —
>    that is not this function's job and you must not do it here.)
> 2. **Non-resting rules (hover, and the `current` state step 6 added): per-edge longhands when any
>    edge is suppressed.** Instead of one `border-color: X`, emit `border-top-color: X;
>    border-right-color: X; border-left-color: X` — the unsuppressed edges only, in
>    top/right/bottom/left order, skipping the suppressed ones. When NO edge is suppressed, emit the
>    flat shorthand exactly as today. ⛔ This last clause is the acceptance condition: an
>    implementation that always emits longhands is byte-DIFFERENT for all 100% of existing callers
>    and has failed, even though it renders the same.
> 3. **When EVERY edge is suppressed, emit no non-resting rule at all** — not an empty rule body.
> 4. **The gradient/ring path ignores `suppress_edges` silently**, and the docblock says so in one
>    sentence naming the reason: `sgs_border_gradient_css()` paints a masked `::before` ring that
>    takes exactly two paints and has no per-edge concept, so a per-edge request there is
>    unexpressible rather than merely unimplemented.
> 5. Every hover rule still routes through `sgs_hover_state_rules()` with its existing
>    `:focus-within` pairing — ⛔ never a bare `{sel}:hover`, and do not drop `:focus-within` while
>    restructuring the declarations.
>
> **Document the key in the function's docblock** alongside the existing `$map` keys, with its shape,
> its default, and the gradient-path exemption.
>
> **Prove it, commands pasted:**
> - `php -l plugins/sgs-blocks/includes/helpers-colour-variants.php` clean.
> - Re-derive the live caller roster and paste it:
>   `grep -rn "sgs_border_states_css(" plugins/sgs-blocks --include=*.php`
> - Write a throwaway PHP harness under
>   `C:\Users\Bean\AppData\Local\Temp\claude\...\scratchpad\` (⛔ NOT in the repo) that calls the
>   function with (i) each existing caller's real `$map` shape and no `suppress_edges`, (ii) the same
>   `$map` plus `'suppress_edges' => ['bottom'=>true]`, (iii) all four edges suppressed, and
>   (iv) a gradient set PLUS `suppress_edges` — and paste all four outputs. Run (i) against the
>   PRE-change function too (`git show HEAD:plugins/sgs-blocks/includes/helpers-colour-variants.php`
>   into the scratchpad) and `diff` the two: **the diff must be empty.** Delete the harness after.
> - Confirm in one sentence, per existing caller, that it passes no `suppress_edges` key.
>
> ⛔ Do NOT edit any block, any other `includes/` file, or step 6's other file
> (`helpers-tokens.php`). ⛔ Do NOT run git beyond `show`/`diff`/`status`.

---

### Step 7 — Split `edit.js` into sub-modules (pure refactor, ZERO behaviour change)

```
  Model:       sonnet
  Action:      Extract `plugins/sgs-blocks/src/blocks/nav-menu/edit.js` (1,535 lines, against a
               250-line project limit) into sibling modules following the
               `plugins/sgs-blocks/src/blocks/cart/` precedent (`PanelSettingsControls.js`,
               `TriggerSettingsControls.js`).
               **FLOOR: 7 files minimum, and expect 8 after step 14.** Measured: `edit.js` is 1,536
               lines of which 1,303 are code (11% comments) — this file's bulk is real, and
               `ceil(1535/250)=7`. Suggested seams, all measured and none requiring a mid-panel cut:
               `utils.js` (~110) · `useNavMenuSource.js` (~145) · `useDrawerNotice.js` (~120) ·
               `NavMenuNotices.js` (~95) · `SettingsPanels.js` (~210) · one file per Styles-tab panel
               (Bar 84 / Dropdown 90 / Items 76 / Effects 31 / Underline 44 / Featured 100 /
               Burger 17) · `edit.js` itself (pinned `colourRows` + JSX assembly).
               **Named reuse lever, verified available:** the 12 hand-assembled rows in `colourRows`
               (258 lines) map onto `components/index.js::fillRow` / `::textRow`, folding to
               ~105–115 lines. ⚠ Rule 31 supports this —
               `31-golden-colour-control.js::checkRow`'s `statesCountOverride` /
               `hasGradientOverride` params exist specifically to carry a row resolved from a
               `fillRow({...})` call — but an adopted row is scored via the override path, not
               `statesArray.elements.length`. **Owner ruling 3's "identical per-row state counts
               before and after" test must be run against the ADOPTED shape, not treated as proof
               the fold was rejected.** If genuine reuse still does not reach the limit, report the
               measured per-file counts to Bean rather than shipping the violation silently.
               ⛔ **The `colourRows` literal is NOT one of the things extracted — owner ruling 3.**
               ⛔ NO feature change, NO new attribute, NO new control.
               ⛔ **Reduce, don't relocate (owner ruling 7).** Before writing ANY new block-private
               helper, search for the existing SGS atom / shared helper / injector-extension that
               already does it, and use that. The target is genuinely smaller files, not the same
               bulk under more filenames.
  Files:       plugins/sgs-blocks/src/blocks/nav-menu/edit.js + new siblings in the SAME directory
               .claude/verify/spec-41-reuse-ledger.md (NEW — owner ruling 7's reuse record)
  Inputs:      cart/ precedent; owner ruling 3; QA-1's answer to question (b) — the golden-colour
               detector's literal-ArrayExpression + single-file-corpus constraint
  Outcome:     **At least 7 JS files**, `edit.js` ≤ 250 lines and every extracted module ≤ 250 lines
               (asserted PER FILE, never on a total), and the built editor bundle behaves identically
               — same panels, same order, same attribute writes. Plus a written reuse ledger naming,
               per sub-file, the shared component it leaned on, **and the final module roster**
               (steps 14 and 19 still cite the superseded four-module names and are repointed from
               that roster before they dispatch).
               ⛔ If genuine reuse still does not reach the limit, report the measured per-file counts
               to Bean rather than shipping the violation silently.
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
    Atomicity:   **OWNER RULING 3 — a hard requirement with its own test.** The `colourRows` array
                 (and every row's `states` array inside it) is a SINGLE ATOMIC UNIT for the purposes
                 of any file split: it is never partially extracted, never rebuilt by `.map()` /
                 `.filter()` / `.concat()` / `Array.from()` / a spread of a variable, and never
                 split across a module boundary. If a future step groups it, each grouping must be
                 its own COMPLETE literal `ArrayExpression` declared in the SAME file that mounts
                 `<SgsColourPanel>`. **Test:** `node scripts/inspector-scan/run.js --check` must
                 report the IDENTICAL per-row state counts before and after the split — paste both
                 runs. A differing count, including a count that silently becomes zero, fails the
                 step.
    Integration: `node scripts/check-dead-controls.js --check` and
                 `node scripts/check-empty-inspector-containers.js --check` both still pass; and
                 `wc -l plugins/sgs-blocks/src/blocks/nav-menu/*.js` asserts EVERY file ≤ 250
                 (owner ruling 7 — a per-file assertion, not a total)
```

⚠ **The atomicity rule is NECESSARY BUT NOT SUFFICIENT, which is why `colourRows` stays in
`edit.js` — owner ruling 3 carries the verified mechanism and its four commands.** In short: rule 31
parses only this block's `edit.js` and `src/components/`, so an imported `colourRows` resolves to
`[]` and every row silently scores zero states. ⛔ That reading is a hypothesis until QA-1 question
(b) proves it; if the detector DOES follow a block-folder sibling the extraction is permitted, and
the atomicity rule still binds in full. Until then: extract PANEL COMPONENTS, leave the descriptors
where they are.

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
> 2. **⛔ THE `colourRows` LITERAL STAYS IN `edit.js`. It is an ATOMIC UNIT (owner ruling 3).**
>    `plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js` resolves a colour
>    row's state count as `statesArray.elements.length` on a LITERAL `ArrayExpression`, and — this
>    is the part that decides the split — it only ever looks in TWO places: the block's own
>    `edit.js`, and `src/components/`. A sibling module inside this block's folder is in neither
>    corpus, so an imported `colourRows` resolves to nothing and every nav-menu colour row silently
>    scores zero states while the editor renders perfectly. That is the recorded "code improved and
>    the gate went blind" failure (D738), and this rule's own header records it costing a 33-row
>    tree-wide undercount once already.
>    **So: extract PANEL COMPONENTS. Leave `const colourRows = [ … ]` and its
>    `<SgsColourPanel rows={ colourRows } />` mount exactly where they are.** Never rebuild the
>    array with `.map()`, `.filter()`, `.concat()`, `Array.from()`, or a spread of a variable;
>    never split it across files; never move part of it.
>    **Run `node plugins/sgs-blocks/scripts/inspector-scan/run.js --check` before AND after your
>    split and paste both outputs. The per-row state counts must be IDENTICAL** — a count that
>    changed, including one that silently became zero, fails the step.
>
> **⛔ FLOOR: 7 FILES MINIMUM, and expect 8 after step 14.** This is arithmetic, not taste:
> `edit.js` is 1,536 lines of which 1,303 are code (11% comments — this file's bulk is real, unlike
> `render.php`'s), and `ceil(1535/250) = 7`. A four-module split has a total capacity of 1,000 lines
> and cannot house 1,303. **Suggested seams, all measured, none requiring a mid-panel cut:**
> `utils.js` (~110) · `useNavMenuSource.js` (~145) · `useDrawerNotice.js` (~120) ·
> `NavMenuNotices.js` (~95) · `SettingsPanels.js` (~210) · one file per Styles-tab panel
> (Bar 84 / Dropdown 90 / Items 76 / Effects 31 / Underline 44 / Featured 100 / Burger 17) ·
> `edit.js` itself (the pinned `colourRows` literal + the JSX assembly). Adjust the boundaries if
> the file's real structure argues otherwise — but say so, and never go below 7 files.
> Every file, including `edit.js` itself, must end ≤ 250 lines, asserted individually.
>
> **Named reuse lever, verified available — use it before you add an eighth file.** The 12
> hand-assembled rows in `colourRows` (258 lines) map onto
> `plugins/sgs-blocks/src/components/index.js::fillRow` / `::textRow`, folding to ~105–115 lines.
> ⚠ Rule 31 supports this: `scripts/inspector-scan/rules/31-golden-colour-control.js::checkRow`
> takes `statesCountOverride` and `hasGradientOverride` params which exist *specifically* to carry a
> row resolved from a `fillRow({…})` call. **So an adopted row is scored via the override path, not
> via `statesArray.elements.length`** — owner ruling 3's "identical per-row state counts before and
> after" test must be run against the ADOPTED shape and read on its own terms. ⛔ A changed
> resolution PATH is not the same thing as a changed COUNT; do not read the override path as proof
> the fold was rejected, and do not read it as licence to move `colourRows` out of `edit.js` either
> (ruling 3's corpus limit is untouched by this).
>
> ⚠ **Module NAMES: report the roster you actually land.** Steps 14 and 19 currently cite
> `panels-general.js` / `panels-design.js` / `typography-panel.js` / `submenu-panels.js` — names
> from the superseded four-module guess. Whatever names you land are authoritative; put the final
> roster at the top of your report and in the reuse ledger, and the dispatching session repoints
> steps 14 and 19 before dispatching them.
>
> **⛔ REDUCE, DON'T RELOCATE (owner ruling 7).** A split that moves 1,535 lines into six files of
> 250 has bought a passing `wc -l` and nothing else. Before writing a single new block-private
> helper, component or constant, look for the one the framework already ships: read
> `plugins/sgs-blocks/src/components/index.js` (the barrel) end to end, plus
> `src/components/primitives/` and any extension already applying to this block
> (`grep -rn "nav-menu" plugins/sgs-blocks/src/extensions/ 2>/dev/null`). Hand-rolled controls,
> option arrays and attribute-key maps are the bulk worth DELETING — this block already carries one
> recorded instance (`featuredFontWeight`, number-typed with a hand-rolled 4-option array where
> `SGS_FONT_WEIGHT_OPTIONS` exists).
> **Write `.claude/verify/spec-41-reuse-ledger.md`**: one row per sub-file — file, final line count,
> the shared atom/helper/extension it leans on, and the count it would have had without. "None
> applied" is an acceptable row; "didn't look" is not.
>
> **Prove it, with commands pasted:**
> - `wc -l plugins/sgs-blocks/src/blocks/nav-menu/*.js` — ⛔ assert EVERY file ≤ 250 individually,
>   and name any file that lands within 10 lines of the limit (it will not survive step 14)
> - `cd plugins/sgs-blocks && npm run build` exits 0
> - `node scripts/inspector-scan/run.js --check` — before and after, identical per-row state counts
> - `node scripts/check-dead-controls.js --check` and
>   `node scripts/check-empty-inspector-containers.js --check` both pass
> - `git diff --stat -- plugins/sgs-blocks/src/blocks/nav-menu/` so the dispatching session can see
>   the whole blast radius
>
> Do NOT run any git command other than `git diff`/`git status` for reporting. Do NOT touch
> `render.php`, `block.json`, `style.css` or any file outside your one directory (the reuse ledger
> under `.claude/verify/` is the one exception, and it is the only file you may write there).

---

### Step 8 — Split `render.php` into FOUR PHP files (pure refactor)

> ⛔ **BEAN'S DECISION, 2026-09-11 — this file's split requirement is measured on CODE LINES ONLY,
> not raw `wc -l`.** This is consistent with his own prior ruling **D722**, which already rejected a
> raw-line-count gate on *this exact file* for being comment-heavy (48% comments then, **52% now**).
> **Do not re-litigate this in a future revision without a fresh decision from Bean.**
>
> **The measurement, re-derived against the live tree (command below, output pasted):**
>
> ```
> render.php = 2,032 raw lines / 845 CODE lines (52% comments)
>   above the "── 4. Scoped CSS assembly" banner:  878 raw / 428 code
>   below it (the CSS assembly half):            1,154 raw / 417 code  (58% comments)
>   largest single cluster (mega-trigger / submenu / drawer-fork / indicator):
>                                                  531 raw / 139 code  (68% comments)
> ```
>
> At the 300-line PHP limit measured on CODE lines: `ceil(428/300) = 2` for the markup half and
> `ceil(417/300) = 2` for the CSS half. **On code alone this file needs 4 modules, not 8.**
> **FLOOR AND CEILING: exactly 4 PHP files.** ⛔ Do not split it into more; a further split buys a
> smaller number and costs a boundary nobody needed.
>
> ⛔ **Do NOT "reduce by reuse" here — the lever is already spent.** Verified: `render.php` already
> carries **27 shared-helper call sites** (`sgs_hover_state_rules` ×10, `sgs_colour_value` ×14,
> `sgs_background_paint_decl` ×7, …), and both
> `plugins/sgs-blocks/scripts/migrate-render-closures.py --survey` and
> `plugins/sgs-blocks/scripts/migrate-length-sanitiser.py --survey` return **0 migratable,
> plugin-wide**. A reuse-ledger row of *"none applies — shared helpers already adopted, surveys
> return 0"* is the **correct and expected** answer for this step, not a failure to look. (⚠ This is
> the opposite of step 7, where the `fillRow`/`textRow` lever is real and unspent.)

```
  Model:       sonnet
  Action:      Split `plugins/sgs-blocks/src/blocks/nav-menu/render.php` (2,032 raw / **845 code**
               lines, against a 300-line PHP limit measured on CODE LINES — Bean's decision above)
               into **exactly FOUR PHP files**, the three new ones under
               `plugins/sgs-blocks/includes/`, each required via
               `require_once dirname( __DIR__, 3 ) . '/includes/<name>.php';` — the proven precedent
               (`sgs/product-card` requires `includes/product-card-builtin-render.php`).
               **Suggested seams (judgement call on the exact boundaries; the COUNT is not):**
                 1. `render.php` — the block class / entry, menu resolution + attribute
                    normalisation, and the block-private `sgs_nav_menu_typography_hover_rule()`
                    step 15 adds (~30 code lines, owner ruling 2 — it may NOT move to `includes/`).
                 2. `includes/nav-menu-markup.php` — **REQUIRED, not "possibly"**: `render_items`,
                    `render_items_drawer` and the burger/trigger markup. The markup half is 428 code
                    lines and cannot fit one 300-line file.
                 3. `includes/nav-menu-css.php` — CSS assembly part 1: item/state colour, border,
                    treatments + sweep.
                 4. `includes/nav-menu-submenu-css.php` — CSS assembly part 2: submenu/dropdown,
                    burger + magnet, the drawer fork, indicator.
               ⛔ PURE REFACTOR. Byte-identical emitted CSS.
               ⚠ **Downstream naming note (self-caught contradiction, 2026-09-11):** steps 15, 16 and
               18 name `includes/nav-menu-css.php` singular, from when this step produced one CSS
               module. Read it as SHORTHAND for the CSS-assembly module SET. Step 8 reports its
               landed file roster; the dispatching session repoints steps 15/16/18's `Files:` from
               that roster before dispatching them. Step 16's prompt already says "wherever step 8
               put each rule" and needs no change.
  Files:       plugins/sgs-blocks/src/blocks/nav-menu/render.php
               plugins/sgs-blocks/includes/nav-menu-markup.php (NEW — required, not optional)
               plugins/sgs-blocks/includes/nav-menu-css.php (NEW)
               plugins/sgs-blocks/includes/nav-menu-submenu-css.php (NEW)
               .claude/verify/spec-41-reuse-ledger.md (appended — owner ruling 7)
  Inputs:      Owner ruling 2 (the FR-41-21 emitter is BLOCK-PRIVATE and stays in `render.php`);
               the product-card require precedent; QA-1's answer to question (a)
  Outcome:     **Exactly four PHP files**, each ≤ 300 **CODE** lines (Bean's decision / D722 —
               comments and docblocks do not count toward the limit on this file), asserted PER FILE
               and never on a total; and the emitted CSS for an unchanged set of attributes is
               byte-identical to the pre-split output.
               ⛔ **Report BOTH the raw `wc -l` and the code-line count for every file** in the reuse
               ledger, for future transparency — even though code-lines is the enforced measure. A
               reader two months from now must be able to see both numbers and why they differ.
               ⛔ If a file still exceeds 300 CODE lines after the four-way split, report the measured
               counts to Bean rather than shipping the violation silently — do not invent a fifth
               file to get under a number.
  Exec:        SEQUENTIAL after step 7 (Lane 2's second and last step). Lane 2 as a whole runs
               CONCURRENTLY with Lanes 1, 3 and 4 (steps 3-6, 6a, 9, 11).
  Deps:        step 7 complete + reviewed. ✅ **No open decision blocks this step.** The shipping-path
               half was closed by PD-2 (`includes/`, proven); the FR-41-21 half is closed by owner
               ruling 2 (the typography-hover emitter is BLOCK-PRIVATE and stays in `render.php` —
               it is NOT part of what this step moves).
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
> **⛔ ONE THING THE SPLIT MUST LEAVE BEHIND (owner ruling 2, 2026-09-11).** Step 15 adds
> `sgs_nav_menu_typography_hover_rule()` — the small emitter for the hover-state typography trio
> (decoration / transform / weight), needed because the shared
> `includes/helpers-typography.php::sgs_typography_css_rule` has no hover branch and no other block
> has ever switched the `showHover` flag on. **That function is BLOCK-PRIVATE: it is declared in
> `plugins/sgs-blocks/src/blocks/nav-menu/render.php` itself, inside a `function_exists()` guard —
> NOT in `includes/nav-menu-css.php` and NOT anywhere else under `includes/`.** Spec 41 FR-41-21
> states this literally (*"a file-local function in this block's own `render.php`, not an addition to
> `includes/`"*) and the owner has confirmed the literal reading. It is ~30 lines; budget for it when
> you decide how close to the 300-line limit `render.php` lands, and say in your report what
> `render.php`'s line count will be once step 15 adds it.
>
> **⛔ REDUCE, DON'T RELOCATE (owner ruling 7).** Before extracting a block-private PHP helper, check
> whether `includes/` already ships one — read `includes/render-helpers.php` (the bootstrap require
> list) and `ls plugins/sgs-blocks/includes/helpers-*.php`. Emission code hand-reimplementing
> `sgs_hover_state_rules()`, `sgs_colour_value()`, `sgs_corner_object_shorthand()`,
> `sgs_border_radius_tiers()`, `sgs_shadow_attr_map()` or a typography allowlist is bulk to DELETE,
> not to move. **Append to `.claude/verify/spec-41-reuse-ledger.md`**: one row per extracted module —
> final line count, the shared helper it leans on, the count it would have had without. ⚠ The ONE
> deliberate exception is the FR-41-21 emitter above, which duplicates three of
> `sgs_typography_css_rule()`'s allowlists ON PURPOSE (extending that helper is design-gated and out
> of scope — Spec 41 §12 item 2). Record it as a KNOWN, owner-ruled duplication.
>
> ⛔ **BUT ON THIS FILE THE REUSE LEVER IS ALREADY SPENT, and that is the expected answer.**
> `render.php` already carries **27 shared-helper call sites** (`sgs_hover_state_rules` ×10,
> `sgs_colour_value` ×14, `sgs_background_paint_decl` ×7, …), and both
> `python plugins/sgs-blocks/scripts/migrate-render-closures.py --survey` and
> `python plugins/sgs-blocks/scripts/migrate-length-sanitiser.py --survey` return **0 migratable,
> plugin-wide**. Run both and paste the output. **A ledger row reading *"none applies — shared
> helpers already adopted, surveys return 0"* is CORRECT and expected here** — it is not a
> "didn't look" row, and you must not manufacture a reuse to avoid writing it.
>
> **⛔ WHERE THE SPLITS GO — FOUR FILES, and the count is not a judgement call.** Measured on CODE
> lines (Bean's decision + D722; comments do not count on this file): 845 code lines total, 428
> above the banner and 417 below, against a 300-line limit → 2 + 2 = **4 files**.
> `render.php` carries an explicit section banner — **`── 4. Scoped CSS assembly`** — which is the
> primary seam: everything from that banner to the end of the CSS assembly leaves `render.php`; the
> class definition and the markup-rendering methods above it stay behind. **Then split each half
> again:**
> - **Markup half (428 code lines) → 2 files.** `render.php` keeps the class/entry, menu resolution
>   and attribute normalisation — plus the block-private `sgs_nav_menu_typography_hover_rule()`
>   step 15 adds (owner ruling 2; it may NOT go to `includes/`).
>   `includes/nav-menu-markup.php` takes `render_items`, `render_items_drawer` and the
>   burger/trigger markup.
> - **CSS half (417 code lines) → 2 files.** `includes/nav-menu-css.php` takes item/state colour,
>   border, treatments + sweep. `includes/nav-menu-submenu-css.php` takes submenu/dropdown,
>   burger + magnet, the drawer fork and the indicator. ⚠ The largest single cluster here
>   (mega-trigger / submenu / drawer-fork / indicator) is 531 raw lines but only **139 code** lines
>   — 68% comments — so it does NOT force a boundary through the middle of a cluster.
>
> You may move a seam if the real structure argues for it — say so and show the counts — but the
> file COUNT is exactly four. ⛔ Do not produce five to get a smaller number.
> ⚠ **Grep for the banner, do not use a line number**
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
> - **BOTH counts, per file, in one table** (Bean's decision 2026-09-11 / D722 — the ENFORCED measure
>   is CODE lines; the raw count is reported for transparency only):
>   `wc -l plugins/sgs-blocks/src/blocks/nav-menu/render.php plugins/sgs-blocks/includes/nav-menu-*.php`
>   for the raw figure, and a code-line count (blank lines, `//`, `#`, `/* … */` and `*` continuation
>   lines excluded) for the enforced one. ⛔ Assert EVERY file ≤ 300 **CODE** lines individually
>   (owner ruling 7 — per file, never a total). ⛔ A file over 300 RAW lines but under 300 CODE lines
>   is **PASSING**, not a violation to fix — that is the whole point of Bean's ruling, and re-splitting
>   to satisfy the raw number is the error D722 already rejected once on this file.
> - State `render.php`'s projected CODE count once step 15 adds the ~30-line block-private emitter
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
  Cold-Entry:  this plan file · Spec 41 §8 ENTIRE (8.1–8.6g) + FR-41-25/26/30/31/33/34 ·
               the CURRENT `plugins/sgs-blocks/src/blocks/nav-menu/block.json` ·
               `.claude/verify/spec-41-qc-council-1.md` (step 2's GO verdict) ·
               the annex's **PD-3** (⛔ assert attribute NAMES against §8.4, never a COUNT) ·
               this block's own `supports.sgs.elements.item._note` / `.sublink._note`, which record
               two real last-write-wins collisions and are the reason every state member is explicit
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

### Step 11 — Build `check-ungated-paint-rules.py` — generic detector, WARN-ONLY, `sgs/nav-menu`-scoped enforcement

> ✅ **Owner ruling 4 (2026-09-11) — CONFIRMED AS ALREADY PLANNED, scope now explicit.** The
> detector's **LOGIC** stays generic and framework-wide (⛔ nothing here licenses writing
> `.sgs-nav-menu__` into the script); its **ENFORCEMENT** lands on `sgs/nav-menu` only — WARN-ONLY
> here, hardened at step 26, with framework-wide hard-fail as explicitly separate future work. Keep
> the scope in `gates.json` config, never a dict in the script (R-31-1). Full reasoning in
> §Resolved judgement calls.

```
  Model:       sonnet
  Action:      Create `plugins/sgs-blocks/scripts/check-ungated-paint-rules.py` with `--survey`,
               `--check` and `--self-test`, reusing FR-41-15's corrected statement-aware scan
               verbatim. Wire it into `plugins/sgs-blocks/scripts/gates.json` and `package.json`.
               ⛔ **Land it WARN-ONLY** (exit 0 with findings printed) per the spec's own build
               sequencing — it is flipped to a hard gate at step 26, **scoped to `sgs/nav-menu`**
               (owner ruling 4), after the tree is clean.
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
>   single named module constant, e.g.
>   `HARD_FAIL_BLOCKS = []  # step 26 sets this to the gates.json-configured scope — ['sgs/nav-menu']
>   for this phase (owner ruling 4). Framework-wide hardening is separate future work, triaged
>   against a real --survey run.` — so step 26 changes one line and nothing else, and the SCOPE that
>   line reads comes from `gates.json` config rather than a dict inside the script (R-31-1).
>   Do not make it fail the build today: the tree still contains the eleven
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
  Deps:    steps 3, 4, 5, 6, 6a, 7, 8 complete
  Check:   G1(a) diff ≥3 existing `SgsColourPanel` callers' rendered inspector output pre/post —
             roster live: `grep -l "<SgsColourPanel" plugins/sgs-blocks/src/blocks/*/edit.js`
           G1(b) `grep -rn "sgs_emit_state_colour_css(" plugins/sgs-blocks --include=*.php | wc -l`
             re-derives the count; every site emits byte-identical CSS with the 4th param defaulted
           G1(c) `sgs_fill_states_css()` / `sgs_text_states_css()` / `sgs_border_states_css()`
             byte-identical for every caller whose `$map` has **neither a `current` key nor a
             `suppress_edges` key** (extended by owner ruling 1 — step 6a's additive per-edge
             parameter is covered by the same proof as step 6's third state, not by a new gate).
             Roster live: `grep -rn "sgs_border_states_css(" plugins/sgs-blocks --include=*.php`.
             ⛔ Assert specifically that a `$map` with no `suppress_edges` still emits the flat
             `border-color` SHORTHAND — an implementation that always emits per-edge longhands
             renders identically and is byte-different for 100% of existing callers
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
             `node scripts/inspector-scan/run.js --check` reports IDENTICAL per-row state counts
             pre/post step 7 (owner ruling 3's atomicity test);
             **FILE COUNTS + SIZES:** at least **7** nav-menu JS files, each ≤ 250 lines (`wc -l`);
             exactly **4** nav-menu PHP files, each ≤ 300 **CODE** lines — ⛔ code lines, not raw
             `wc -l`, per Bean's decision 2026-09-11 / D722; a PHP file over 300 raw and under 300
             code is PASSING. **Asserted per file, never on a total** (owner ruling 7). And
             `.claude/verify/spec-41-reuse-ledger.md` exists with a row per split sub-file carrying
             BOTH counts for PHP
  Pass:    All five G1 proofs show zero delta; both split parity checks show zero delta; the reuse
           ledger is present and every sub-file is individually under its limit.
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
  Files:       plugins/sgs-blocks/src/blocks/nav-menu/edit.js — **the `colourRows` literal and its
               `<SgsColourPanel rows={ colourRows } />` mount, IN PLACE.** ⛔ Owner ruling 3: there is
               no `colour-rows.js`; the descriptor array stays in `edit.js` where rule 31 can resolve
               it (see step 7's ⚠ block for the verified corpus limitation and its commands). If
               QA-1 question (b) proved the detector DOES follow a block-folder sibling, this step
               may use one — and the atomicity rule still binds in full.
               **Plus `plugins/sgs-blocks/src/components/colour-variants/fillRow.js` and `::textRow.js`
               (owner directive, 2026-09-11)** — additive `current`/`currentGradient` support, so
               every row in `edit.js` can be built via the helper rather than hand-assembled. This
               is the fix for edit.js landing at 510 lines after step 7's split (the reuse lever was
               real but correctly deferred past a pure-refactor step; this REBUILD step is where it
               lands). Verify byte-identical output for the other 64 blocks' existing calls (no
               `current` key supplied → unchanged behaviour).
  Inputs:      Spec 41 §9.6 table, FR-41-2, FR-41-14, FR-41-16, FR-41-23, FR-41-25, FR-41-26,
               FR-41-33; the frozen `block.json` from step 9; owner ruling 3
  Outcome:     The Colour panel renders the §9.6 table exactly — three groupings via FR-41-16
               headings, every row's states and treatment selector as specified.
  Exec:        PARALLEL with steps 15, 16, 17 (Lane 6 — owner ruling 7 CONFIRMS the two lanes run as
               two concurrent subagents); SEQUENTIAL before step 14
  Deps:        step 10 (manifest frozen + reviewed), step 12 (Wave A closed)
  Marker:      SESSION-START
  Time:        75 min
  Tooling:     /delegate, /subagent-prompt, wp-sgs-developer agent, /subagent-driven-development
  On-Fail:     `git revert` this step's commit.
  Cold-Entry:  this plan file · Spec 41 §9.6 + FR-41-23/25/26 · the frozen `block.json` ·
               `plugins/sgs-blocks/src/blocks/nav-menu/edit.js::colourRows` ·
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
> `plugins/sgs-blocks/src/blocks/nav-menu/` and within it you touch the `colourRows` literal in
> `edit.js` and the `<SgsColourPanel rows={ colourRows } />` mount beside it — nothing else. ⛔ Do
> NOT edit `render.php`, `style.css` or `block.json`; `block.json` is FROZEN and is your contract.
>
> ⛔ **`colourRows` LIVES IN `edit.js` AND STAYS THERE (owner ruling 3).** Do not create a
> `colour-rows.js`, do not import the array from a sibling module, do not build it from a helper.
> `scripts/inspector-scan/rules/31-golden-colour-control.js` only ever parses this block's own
> `edit.js` and `src/components/` — a block-folder sibling is in neither corpus, so an imported
> `colourRows` resolves to nothing and every row silently scores zero states while the editor renders
> perfectly (D738). The array, and every `states: [ … ]` inside it, is ONE ATOMIC LITERAL: never
> `.map()`-ed, never `.filter()`-ed, never `.concat()`-ed, never `Array.from()`-ed, never spread from
> a variable, never split across files.
>
> **Read first:** `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` §9.6 (the full table, both ⓘ
> cross-reference notes, and the two ⛔ blocks beneath it), FR-41-2, FR-41-14, FR-41-16, FR-41-23,
> FR-41-24, FR-41-25, FR-41-26 (the eligibility predicate AND the "ONE DECLARED SOURCE, TWO
> EVALUATORS" section), FR-41-33, and §8.1's `burgerColourHover` vs `burgerHoverColour`
> disambiguation table. Then read `plugins/sgs-blocks/src/blocks/nav-menu/block.json` (frozen), then
> `plugins/sgs-blocks/src/blocks/icon-list/edit.js::Edit` — the reference implementation for
> omit-not-disable. Then read
> **`plugins/sgs-blocks/src/components/SurfaceTreatmentPanel.js`** — *the shipped precedent for a
> `ToggleGroupControl` choosing a visual treatment with conditional sub-controls; **copy the shape,
> not the treatments**.* It already implements exactly what every hover-treatment selector in §9.6
> needs — icon options, a `''`-is-None option, and sub-controls appearing per selection — so ⛔ do
> not invent this pattern from prose.
>
> **⛔ BUILD EVERY FILL/TEXT ROW VIA `fillRow`/`textRow` — this is a hard requirement, not a
> nice-to-have (owner directive, 2026-09-11, closing out Step 7's deferred item).** Step 7's split
> left the OLD `colourRows` literal hand-assembled (258 lines) rather than adopted onto
> `plugins/sgs-blocks/src/components/index.js::fillRow` / `::textRow`, because normalising the old
> item-bg row's asymmetric gradient shape (Normal has `itemBgGradient`, Hover has none) onto a helper
> mid-PURE-REFACTOR would have been a real behaviour change disguised as a reformat — correctly
> deferred, not skipped. **This step is a REBUILD, not a refactor, so the reason to defer no longer
> applies: build every row here directly via `fillRow( { key, label, attrs: { base, hover, current,
> gradient, hoverGradient, currentGradient }, attributes, setAttributes } )` / `textRow( {...} )` from
> the start, on the NEW post-manifest attribute names.**
> ⛔ **Verified — this does NOT blind rule 31.** Read
> `plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js` yourself
> (`d.viaHelper` / `resolveRowDescriptorFromStatesExpr`, ~line 706 and ~line 1253): the detector
> ALREADY resolves a `fillRow(...)`/`textRow(...)` call expression natively — no manual
> `statesCountOverride` wiring by the caller is needed, that machinery is the DETECTOR'S own
> resolution path, not something this step configures. The thing that stays banned is moving the
> `colourRows` ARRAY itself (or any row's `states` array) out of `edit.js` into an imported module —
> that is the corpus limit (owner ruling 3), a completely different constraint from which function
> builds an individual row's object. Confirm by running
> `node plugins/sgs-blocks/scripts/inspector-scan/run.js --check` after the rebuild and pasting the
> per-row state counts — they must be ≥2 per stateful row, matching §9.6's table, not zero.
> ⚠ **Verified — `fillRow`/`textRow` do NOT accept a `current` key today** (read the file: `attrs`
> destructures only `{ base, hover, gradient, hoverGradient }`, and the returned `states` array is
> `hover ? [normal, hoverState] : [normal]` — there is no third branch). Since every stateful row in
> §9.6 needs a Current state, **this step MUST extend `fillRow`/`textRow` additively first** —
> mirroring step 6's own shape for `sgs_fill_decls`/`sgs_text_decls`: add optional `attrs.current` /
> `attrs.currentGradient`, and an optional `currentState` entry appended to the returned `states`
> array only when `current` is supplied (absent → byte-identical to today, so the other 64 blocks
> already calling `fillRow`/`textRow` are unaffected — prove this with a before/after call using one
> of their real `attrs` shapes and diffing the returned object). This is the SAME additive-extension
> discipline as steps 6/6a on the PHP side, applied to the JS side of the same family. Report the
> extension explicitly in this step's output — it is expected work, not scope creep.
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
> a prop.** Verified. **Add `import metadata from './block.json';` to `edit.js`** — the module that
> carries `colourRows` and therefore the module that reads the predicate (owner ruling 3). It is a
> read-only static import identical to what `index.js` already does and does NOT count as editing the
> frozen `block.json`. ⚠ Re-run `node plugins/sgs-blocks/scripts/inspector-scan/run.js --check` after
> adding it and confirm the per-row state counts are unchanged.
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
> selector.
> ⚠ **The control-shape authority is Spec 35 Part O's D810 table, NOT
> `TypographyControls.js::SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED`** (S3). That constant governs the
> typography *target switcher's* own shape, keyed on `targets.length`, and nothing else — an earlier
> edition cited it as the general rule. The framework's real, **gate-backed** contract is Part O:
> 2–4 options with a longest label ≤ 12 characters → `ToggleGroupControl`; 5 is neutral; 6+ →
> `SelectControl`. The gate is `plugins/sgs-blocks/scripts/check-enum-control-shape.py`
> (`gates.json` id `check-enum-control-shape`, tier `fast`, D812) and it runs in step 20's
> `run-gates.py --tier all`. Every treatment selector here is 2–3 segments, so it is inside the band
> either way — read Part O, not the typography constant.
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
               the 250-line limit outranks that guess.
               ⛔ **What this step may NOT do, two ways (owner ruling 3, correcting PD-6):**
               (i) compress `colourRows` into a generated form to save lines — that blinds the
               golden-colour detector (D738); (ii) move `colourRows`, or any GROUPING of it, OUT of
               `edit.js` — rule 31's corpus is this block's `edit.js` plus `src/components/` and
               nothing else, so a block-folder sibling is equally blind. PD-6's "split the literal by
               GROUPING" survives ONLY as multiple complete literals **inside `edit.js`**. If that
               still does not reach 250, report the measured count to Bean rather than shipping the
               violation silently.
               .claude/verify/spec-41-reuse-ledger.md (appended — owner ruling 7)
  Inputs:      Spec 41 §9 entire + its panel roster table; FR-41-12, FR-41-22, FR-41-27, FR-41-29,
               FR-41-30, FR-41-31, FR-41-33
  Outcome:     Every panel in §9's roster is present or has a named new home for each of its
               controls; nothing is dropped without a destination. Every touched file is
               INDIVIDUALLY ≤ 250 lines, and the reuse ledger records what each one leaned on
               (owner ruling 7).
  Exec:        SEQUENTIAL after step 13 (same lane, same files); SEQUENTIAL before step 14a
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
> the `colourRows` literal or its `<SgsColourPanel>` mount in `edit.js` (step 13 owns those, and
> owner ruling 3 keeps them in `edit.js` — ⛔ do not move them out while splitting panels),
> `render.php`, `style.css` or `block.json`.
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
> `node scripts/inspector-scan/run.js --check` reports per-row state counts identical to step 13's ·
> `wc -l plugins/sgs-blocks/src/blocks/nav-menu/*.js` — ⛔ assert EVERY file ≤ 250 individually, not
> a total · paste §9's panel-roster table with each row ticked and the file+symbol where its controls
> now live. Do NOT run git beyond `diff`/`status`.
>
> **⛔ REDUCE, DON'T RELOCATE (owner ruling 7).** ~40 new attributes land here and the naive outcome
> is ~40 hand-written controls. Before writing ANY control, option array, attribute-key map or
> preview helper by hand, find the shared one: read `plugins/sgs-blocks/src/components/index.js` end
> to end plus `src/components/primitives/`, and check whether a universal extension already covers
> the surface. The six reuses the prompt above already names (`IconPicker`, `ToggleGroupControl`,
> `SgsBorderControl`, `ShadowControl` + `shadowAttrKeys()`, `TypographyControls`' `targets` mount,
> `SGS_FONT_WEIGHT_OPTIONS`) are the FLOOR, not the ceiling. **Append to
> `.claude/verify/spec-41-reuse-ledger.md`**: one row per file — final line count, shared components
> leaned on, and for anything hand-rolled, which shared component you checked first and why it did
> not fit. "I did not check" is not an acceptable row.

---

### Step 14a — `sgs/nav-drawer` close button: mirror the Menu Button's label + icon work (FR-41-12)

> **Owner ruling 6 (2026-09-11) — IN SCOPE, built by mirroring the Menu Button, not redesigned.**
> It runs immediately after step 14 so the pattern being copied is finished and reviewed. ⚠ **The
> scope match was CHECKED, not assumed: it is a PARTIAL mirror** — three of four capabilities
> transfer cleanly, one genuinely diverges, stated below rather than forced.

**Scope match, verified against the real files before this step was written:**

| Capability | `sgs/nav-menu` Menu Button (§9.3 / FR-41-30) | `sgs/nav-drawer` close button, TODAY | Mirror? |
|---|---|---|---|
| **Colour, 2-state** | `burgerColour` / `burgerColourHover` (+ gradient) | ✅ **ALREADY EXISTS** — `toggleCloseColour` / `toggleCloseColourHover` / `toggleCloseColourGradient`, declared on the `close` element with explicit base + `states.hover` `attrMap`s, emitted via `sgs_text_colour_decl()` + `sgs_hover_state_rules()` | **No work.** ⛔ Do not rebuild it |
| **Editable label** | `triggerLabel`, `TextControl`, default `"Menu"` | ❌ **HARDCODED** — `'<span class="sgs-nav-drawer__close-text">' . esc_html__( 'Close', 'sgs-blocks' ) . '</span>'` | ✅ **Clean mirror** → new `closeLabel` |
| **Icon choice** | `triggerIcon`, `IconPicker`, source-aware resolver | ❌ **HARDCODED** — `sgs_get_lucide_icon( 'x' )` | ✅ **Clean mirror** → new `closeIcon` |
| **Icon-and-text form** | `triggerMode` = `icon` \| `text` \| `icon-and-text` | ⚠ **DIVERGES — see below** | ⚠ **Partial** |
| **Magnetic pull trio** | `triggerMagnet*` (FR-41-31) | — | ⛔ **NOT in scope.** FR-41-12 names the close gaps as label + icon-and-text. A magnet on a close button inside an open modal is a different design question, not a symmetry gap |

⚠ **THE REAL DIVERGENCE.** `closeStyle` (string, default `"separate-x"`, **a genuine JSON `enum`**
of `separate-x` \| `text-swap` \| `burger-morph`) looks like `triggerMode`'s twin and is not.
`separate-x` and `text-swap` ARE the icon/text display axis, but **`burger-morph` is not a display
mode at all — it is a GLYPH choice**: a CSS-drawn two-bar span
(`<span class="sgs-nav-drawer__close-bars">`) reading as an X, no icon and no text. `closeStyle`
conflates two orthogonal axes, so a naive one-to-one rename onto `triggerMode`'s three values would
**silently delete a shipped look**.

**Resolution — additive, no rename, no deletion** (the prompt below carries the build detail):
`closeStyle` keeps its name, default and three values and gains a FOURTH, `icon-and-text`, added to
**both** the existing JSON `enum` and `render.php::$sgs_nd_allowed_close_styles` in the same commit
(one without the other coerces the stored value away with no error). New `closeLabel` (string,
`"Close"`) and `closeIcon` (object, `{"source":"lucide","name":"x"}`) mirror `triggerLabel` /
`triggerIcon`, the icon resolved through the SAME source-aware resolver `sgs/icon` uses and OMITTED
(never disabled) under `text-swap` and `burger-morph`. ⛔ When `closeLabel` is empty the hardcoded
`aria-label="Close menu"` must SURVIVE — `aria-label=""` is an empty accessible name, strictly worse
than a mismatch (the identical trap FR-41-12 records on the open side). `aria-hidden="true"` on the
glyph under `icon-and-text`, matching the open side.

```
  Model:       sonnet
  Action:      Add `closeLabel` + `closeIcon` to `sgs/nav-drawer`, extend `closeStyle`'s enum with
               `icon-and-text` (JSON + the PHP allowlist), mount the three controls in the existing
               "Close button" `PanelBody` in the SAME order and with the SAME components as §9.3's
               Menu Button panel, and render them. ⛔ Copy the pattern; do not redesign it.
  Files:       plugins/sgs-blocks/src/blocks/nav-drawer/block.json
               plugins/sgs-blocks/src/blocks/nav-drawer/edit.js
               plugins/sgs-blocks/src/blocks/nav-drawer/render.php
               plugins/sgs-blocks/src/blocks/nav-drawer/style.css (only if `icon-and-text` needs a
               gap/flex rule the existing `--close-*` classes do not already give it)
               .claude/verify/spec-41-reuse-ledger.md (appended)
  Inputs:      Spec 41 FR-41-12 (v0.4.7 — the close side is IN SCOPE), §9.3's finished panel,
               FR-41-30(a)'s IconPicker adoption; step 14's landed Menu Button code as the template
  Outcome:     An operator can set the close button's word and its icon, and show both — the same
               three things the open side offers. The open/close pair no longer reads half-finished.
  Exec:        SEQUENTIAL after step 14 (it copies step 14's landed code). Lane 5's last step.
  Deps:        step 14 complete + reviewed
  Marker:      (none)
  Time:        45 min
  Tooling:     /delegate, /subagent-prompt, wp-sgs-developer agent, /subagent-driven-development,
               **`/sgs-update`** (this step changes a SECOND block's manifest — see `Test: Reseed:`)
  On-Fail:     `git revert` this step's commit. ⛔ This is a SECOND block's manifest — revert it
               whole rather than leaving `closeStyle`'s enum and its PHP allowlist disagreeing.
  Test:
    Happy:       set `closeStyle: 'icon-and-text'` with `closeLabel: 'Close menu'` → the button
                 renders the chosen icon AND the word, icon first, and the icon carries
                 `aria-hidden="true"`
    Edge:        `closeLabel: ''` under `text-swap` → the button still has a non-empty accessible
                 name. ⛔ Assert `getAttribute('aria-label')` is NOT the empty string — an empty
                 accessible name passes a "the attribute exists" check and fails a real screen reader
    Fail:        **THE ENUM TRAP, and it is the reason this step can silently half-land.** Add
                 `icon-and-text` to `block.json::attributes.closeStyle.enum` but NOT to
                 `render.php::$sgs_nd_allowed_close_styles` (or the reverse) and the stored value is
                 accepted by one side and coerced away by the other, with NO error on either.
                 Assert BOTH lists contain all four values, in one check
    Reseed:      ⛔ **RUN `/sgs-update` AFTER THIS STEP — it is the only reseed that covers
                 `sgs/nav-drawer`.** The plan's other reseed is step 10, which runs before this step
                 exists, so without this the derived DB carries a stale `sgs/nav-drawer` row set for
                 the rest of the phase and beyond (`sgs-update-v2.py` Stage 1 walks
                 `src/blocks/*/block.json` into `sgs-framework.db`; Stage 9 prunes orphans). Same
                 class as `a-raw-db-update-does-not-survive-a-reseed`, in the mirror direction: the
                 reseed that would make the DB true never runs.
                   `python plugins/sgs-blocks/scripts/sgs-update-v2.py`
                 then ASSERT:
                   `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT attr_name FROM block_attributes WHERE block_slug='sgs/nav-drawer' AND attr_name IN ('closeLabel','closeIcon')"`
                 returns BOTH rows. ⛔ Never patch a DB row directly to make this pass — fix the
                 declaration it derives from and re-run the reseed
    Integration: `closeIcon` unset (its declared default) renders markup byte-identical to today's
                 `sgs_get_lucide_icon( 'x' )` — the same proof shape as G15 on the open side. And
                 `toggleCloseColour*` is UNTOUCHED: `git diff` on the colour attributes and the
                 `$close_colour_*` emission in `render.php` must be empty
```

**Prompt:**

> Mirror `sgs/nav-menu`'s finished Menu Button work onto `sgs/nav-drawer`'s close button. Repo root:
> `c:\Users\Bean\Projects\small-giants-wp`. Your ONE writable directory is
> `plugins/sgs-blocks/src/blocks/nav-drawer/` (plus appending to
> `.claude/verify/spec-41-reuse-ledger.md`). ⛔ Do NOT touch `sgs/nav-menu` — it is finished and
> another lane may still be in it.
>
> **Read first, in this order:** (1) `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` §FR-41-12
> (v0.4.7) + §9.3's panel table; (2) the JUST-LANDED Menu Button code — the `triggerMode` /
> `triggerLabel` / `triggerIcon` controls in `src/blocks/nav-menu/` and their `render.php` branch,
> **including the `$aria_attr` variable that keeps `aria-label` out of the `sprintf()` format
> string**; (3) `src/blocks/nav-drawer/render.php`'s close-button section
> (`$sgs_nd_allowed_close_styles`, `$sgs_nd_close_inner`, the `$close_html` `sprintf()`, and the
> `$close_colour_*` emission above it); (4) `src/blocks/nav-drawer/edit.js`'s existing "Close button"
> `PanelBody` and its `closeStyle` `ToggleGroupControl`; (5) `src/blocks/icon/edit.js` — the live
> `IconPicker` adopter.
>
> **⛔ ALREADY DONE — DO NOT REBUILD.** The close button's 2-state colour pairing works:
> `toggleCloseColour` / `…Hover` / `…Gradient`, declared on `supports.sgs.elements.close` with
> explicit base + `states.hover` `attrMap`s, emitted via `sgs_text_colour_decl()` +
> `sgs_hover_state_rules()`. **No colour control, no touching those attributes or that emission** —
> `git diff` on them must come back empty.
>
> **⛔ THE ONE PLACE THE MIRROR IS NOT A MIRROR — read before planning the change.** `separate-x` =
> icon-only and `text-swap` = text-only ARE the same display axis as `triggerMode`, but
> **`burger-morph` is a GLYPH choice, not a display mode** — a CSS-drawn two-bar
> `<span class="sgs-nav-drawer__close-bars">`, no icon and no text. Renaming or re-valuing
> `closeStyle` onto `triggerMode`'s three values would delete a shipped look. **Keep `closeStyle`'s
> name, default and three values. ADD a fourth, `icon-and-text`.**
>
> **Build exactly this:**
> 1. `block.json` — add `"icon-and-text"` to `attributes.closeStyle.enum` (it carries a REAL JSON
>    enum today; that is existing and stays). Add `closeLabel` (`string`, default `"Close"`) and
>    `closeIcon` (`object`, default `{"source":"lucide","name":"x"}`). ⛔ Give NEITHER new attribute
>    a JSON `enum`. Add their `supports.sgs.elements` entries only where they route a real CSS
>    property — `closeLabel` and `closeIcon` route none, so they get NO element members and NO
>    phantom routing slots (the same ruling §8.6(e) makes for `triggerMode`/`triggerLabel`).
> 2. `render.php` — add `'icon-and-text'` to `$sgs_nd_allowed_close_styles`. ⛔ **Both lists or
>    neither.** An enum value accepted by `block.json` and rejected by the PHP allowlist (or the
>    reverse) coerces silently with no error on either side. Extend the `$sgs_nd_close_inner` branch:
>    `icon-and-text` emits the resolved icon with `aria-hidden="true"` followed by the label span.
>    Resolve `closeIcon` through the SAME source-aware resolver `sgs/icon` uses — ⛔ never a bespoke
>    lookup, and never a second call to `sgs_get_lucide_icon()` with a hand-parsed name.
> 3. **The accessible name.** `$close_html`'s `sprintf()` hardcodes
>    `aria-label="%s"` fed `esc_attr__( 'Close menu', 'sgs-blocks' )`. Under `text-swap` and
>    `icon-and-text` the visible word IS the accessible name, so a differing `aria-label` breaks SC
>    2.5.3 Label in Name — build the attribute segment as a VARIABLE and interpolate it, exactly as
>    the open side now does. ⛔ **But when `closeLabel` resolves empty, KEEP the hardcoded
>    `aria-label`.** Emitting `aria-label=""` is an empty accessible name, strictly worse than the
>    mismatch. Assert this, do not reason about it.
> 4. `edit.js` — in the EXISTING "Close button" `PanelBody`, mount in this order, with these
>    components (copied from §9.3, not chosen afresh): **Icon** (`IconPicker` → `closeIcon`, shown
>    only under `separate-x` / `icon-and-text` — ⛔ OMIT otherwise, never disable) · **Show as** (the
>    existing `ToggleGroupControl` → `closeStyle`, now with a fourth option) · **↳ Label** (native
>    `TextControl` with `__nextHasNoMarginBottom __next40pxDefaultSize` → `closeLabel`, shown under
>    `text-swap` / `icon-and-text`). ⛔ Not `SgsFreeTextField`. Keep this panel's existing
>    `ToolsPanelItem` `hasValue`/`onDeselect` idiom.
>    ⚠ **THE CONTROL-SHAPE QUESTION, CORRECTLY FRAMED (S3) — an earlier edition asked it against the
>    wrong rule.** `TypographyControls.js::SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED` is **not** the
>    authority: it governs the typography target switcher's own shape, keyed on `targets.length`.
>    The framework's real, **gate-backed** contract is **Spec 35 Part O's D810 table** — 2–4 options
>    with a longest label ≤ **12 characters** → `ToggleGroupControl`; 5 neutral; 6+ →
>    `SelectControl` — enforced by `plugins/sgs-blocks/scripts/check-enum-control-shape.py`
>    (`gates.json` id `check-enum-control-shape`, tier `fast`, D812), which step 20 runs.
>    **So a four-value `closeStyle` is squarely INSIDE Part O's 2–4 band and keeps its
>    `ToggleGroupControl`.** ⛔ Do not swap the client's control type on the strength of the
>    typography constant.
>    ⚠ **The real question is the LABEL LENGTH, and it is a genuine edge case:** Part O's 12-character
>    bound was *derived from `nav-drawer.closeStyle` itself* (`burger-morph`, exactly 12), and the new
>    `icon-and-text` label is **13 characters**. Measure the rendered label you actually ship (the
>    human label, e.g. `"Icon and text"` = 13), run the gate, and if it fails, shorten the LABEL —
>    ⛔ never the enum VALUE (the value is the stored contract and must stay `icon-and-text` to match
>    the open side's `triggerMode`). Report the measured length and the gate's verdict either way.
> 5. `style.css` — ONLY if `icon-and-text` needs a gap/flex rule the existing
>    `.sgs-nav-drawer--close-*` classes do not already provide. Check first; report either way.
>
> ⛔ No deprecations, no version bumps (D270/D293 — pre-production).
>
> **Prove it, commands pasted:**
> - `python -m json.tool plugins/sgs-blocks/src/blocks/nav-drawer/block.json > /dev/null` exits 0
> - Paste `block.json::attributes.closeStyle.enum` AND
>   `grep -n "sgs_nd_allowed_close_styles" -A 3 plugins/sgs-blocks/src/blocks/nav-drawer/render.php`
>   side by side — all four values in both
> - `php -l` clean · `cd plugins/sgs-blocks && npm run build` exits 0
> - `node scripts/check-dead-controls.js --check`, `node scripts/check-duplicate-controls.js`,
>   `node scripts/audit-inline-styling.js --check` all pass
> - `git diff -- plugins/sgs-blocks/src/blocks/nav-drawer/` — paste it whole, and confirm in one
>   sentence that nothing in the `toggleCloseColour*` family or its emission changed
> - With `closeIcon` unset, paste the rendered close-button markup and show it is byte-identical to
>   the pre-change `sgs_get_lucide_icon( 'x' )` output
> - `wc -l` on every file you touched — JS ≤ 250, PHP ≤ 300, individually
> - Append your reuse row to `.claude/verify/spec-41-reuse-ledger.md`
> - ⛔ **RESEED THE DERIVED DB — you changed a SECOND block's manifest and step 10's reseed ran
>   before this step existed.** Run `python plugins/sgs-blocks/scripts/sgs-update-v2.py`, then paste
>   the output of
>   `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT attr_name FROM block_attributes WHERE block_slug='sgs/nav-drawer' AND attr_name IN ('closeLabel','closeIcon')"`
>   showing BOTH rows. ⛔ If a row is missing, fix `block.json` and RE-RUN the reseed — never patch
>   the DB row directly; a raw row does not survive the next reseed.
>
> Do NOT run git beyond `diff`/`status`.

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
  Files:       plugins/sgs-blocks/includes/nav-menu-css.php — ⚠ **SHORTHAND for step 8's CSS-assembly
               module SET** (step 8 now lands `nav-menu-css.php` AND `nav-menu-submenu-css.php`).
               Read step 8's reported roster and write into the module that owns each rule; the
               dispatching session repoints this line before dispatching.
               plugins/sgs-blocks/src/blocks/nav-menu/render.php
  Inputs:      Spec 41 FR-41-3, 5, 8, 12, 21, 22, 23, 25, 26, 30, 31; the frozen `block.json`
  Outcome:     Every new attribute is READ and emitted; the resolved (not stored) treatment drives
               every downstream rule; no bare `{sel}:hover` anywhere.
  Exec:        PARALLEL with steps 13, 14, 14a (Lane 5 ∥ Lane 6 — disjoint files; owner ruling 7
               CONFIRMS two concurrent subagent lanes); SEQUENTIAL before 16
  Deps:        step 10 (manifest frozen), step 12 (Wave A closed — it consumes step 6's emitters AND
               step 6a's `suppress_edges` parameter)
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
> 5. **✅ RULED (owner ruling 1) — use step 6a's additive `suppress_edges` parameter. This step
>    writes NO block-private border override.**
>    Background, so you understand what you are calling: `sgs_border_states_css()` was edge-blind —
>    signature `sgs_border_states_css( string $selector, array $attributes, array $map )`, one normal
>    paint, one hover paint, one flat `border-color:` covering all four sides — so FR-41-8's original
>    wording ("the `$map`'s `hover` and `current` keys are UNSET for the `bottom` edge") named an API
>    that did not exist. **Step 6a gave it one**, additively, reusing the project's existing box-object
>    `{top,right,bottom,left}` naming. FR-41-8 in the spec (v0.4.7) now describes that real API.
>    **What you write here:** when the RESOLVED `itemBorderHoverTreatment` is `'sweep'`, call the
>    helper ONCE, normally, for the full three-state border — and pass
>    `'suppress_edges' => array( 'bottom' => true )` in its `$map`. The helper emits the resting
>    `border-color` shorthand plus hover/current rules covering top, right and left only. That is the
>    whole mechanism. ⛔ Do NOT also emit a block-private `border-bottom-color` override "to be
>    sure" — two overlapping fixes are unfalsifiable (you cannot tell which one worked, so neither
>    can ever be safely removed), which is the exact trap
>    `~/.claude/rules/prove-the-cause-before-fix.md` names.
>    ⛔ When the treatment is NOT `'sweep'`, pass NO `suppress_edges` key at all — not an empty
>    array, not all-false. The absent key is what makes the emission byte-identical to the
>    non-sweep case.
>    The OUTCOME is unchanged from the spec's intent: without the suppression, the helper repaints a
>    real border on the border box directly beneath the band on the padding box — **two visible
>    horizontal lines**, one un-asked-for. Every other edge keeps all three states. The Hover and
>    Current swatches stay VISIBLE and STORED; only the bottom edge's non-resting emission is
>    dropped, and switching back to `Swap` restores the plain pair with nothing lost.
>    Also emit `{link}{border-bottom-color:transparent;}` and `{link}{position:relative;}` from the
>    sweep branch — those are still this block's own rules, and `border-bottom-color:transparent` is
>    the RESTING half, which the helper deliberately does not touch.
>    ⚠ **G6 is the assertion that catches a mistake here**
>    (`getComputedStyle(link).borderBottomColor === 'rgba(0, 0, 0, 0)'` while the `::after` band
>    paints) — and it now proves the shared helper's new parameter works end to end, not a
>    block-private hack.
>    A `prefers-reduced-motion: reduce` companion is MANDATORY: keep both end states, drop only the
>    travel.
> 6. **When the RESOLVED treatment is `'sweep'` AND that prefix's hover text-decoration resolves to
>    a permitted non-`none` value, the same block-private emitter also sets `text-decoration-color`
>    to the HOVER colour**, in the SAME `sgs_hover_state_rules()` call as the decoration itself.
>    `text-decoration-color` is not governed by `-webkit-text-fill-color`, so without this the
>    glyphs travel and the line under them stays at the resting colour. ⚠ Add NO transition to it.
> 7. **The block-private typography hover emitter (`sgs_nav_menu_typography_hover_rule()`) is
>    declared in `plugins/sgs-blocks/src/blocks/nav-menu/render.php` ITSELF, inside a
>    `function_exists()` guard — ⛔ NOT in `includes/nav-menu-css.php`, NOT anywhere under
>    `includes/` (owner ruling 2, 2026-09-11).** Spec 41 FR-41-21 says it literally ("*a file-local
>    function in this block's own `render.php`, not an addition to `includes/`*") and the owner has
>    confirmed the literal reading: this is BLOCK-PRIVATE code, and `includes/` — even a file only
>    nav-menu requires — is the shared folder. Step 8's split moved the CSS *assembly* out; it did
>    NOT move this, and step 8's prompt says so. A top-level function declaration in a per-instance
>    `render.php` fatals on the second instance, and this page has two, hence the guard.
>    It validates each value against the SAME
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
  Cold-Entry:  this plan file · Spec 41 §FR-41-15 IN FULL (the corrected statement-aware scan, the
               history table of three failed bounds, the 11-row CENSUSED / GATED / DISMISSED tables,
               the 12-row fate table, census #9's per-declaration table) + §FR-41-4 ·
               **`.claude/verify/spec-41-census-baseline.md`** (step 1's re-verified baseline — the
               fate table is only true as of the command that produced it) ·
               step 8's landed PHP module roster (⛔ `includes/nav-menu-css.php` in this step's
               `Files:` is SHORTHAND for the CSS-assembly module SET) ·
               the annex's **PD-12** (deleting census #5 and #3 deliberately costs the drawer its
               separator and current-page tint — surfaced to Bean at step 25, not hidden)
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

### Step 16a — QA-7 / qc-council #3: multi-rater review of the census execution

> **Added 2026-09-11 (S1).** Steps 13→19 are ~535 minutes of the judgement-heaviest code in the
> phase with **no gate between step 12 and step 20**, and repo `CLAUDE.md` routes *"Multi-rater
> code-review before commit on converter/pipeline/**SGS-block**"* → `/qc-council` (blub.db 255).
> Steps 13–19 are SGS-block commits. `/subagent-driven-development`'s per-task implementer + 2
> reviewers is real mitigation but it is a per-task loop, not a gate with a runnable check.
> ⚠ Numbered `16a` rather than renumbering — `renumbering-breaks-every-pointer-that-lives-elsewhere`.

```
QA Gate — the census execution did not leave half a fix standing
  Model:   inline (+ /qc-council multi-rater)
  Exec:    SEQUENTIAL (blocks step 17 in Lane 6 only; Lane 5 is unaffected)
  Deps:    step 16 complete
  Check:   1. /qc-council on the step-15 + step-16 diff with the mandate:
              "Six DELETEs across two surfaces (PHP emission and style.css). For EACH deleted
               census row, name the OTHER surface and prove nothing equivalent survives there.
               Specifically: census #3 deleted in the PHP while census #10 survives in style.css
               leaves the double-line bug FULLY INTACT through a fix that reads as complete — the
               selectors differ, the painted edge is the same. Then check the three CONVERTs kept
               the attribute-driven half and dropped only the ungated fallback, and that the two
               KEEPs (#2, #11) were kept for the stated reason and not by omission."
           2. Re-run BOTH census commands and paste: the FR-41-15 statement-aware Python over the
              nav-menu PHP module set, and `grep -nE 'background|border'` over style.css
           3. `python plugins/sgs-blocks/scripts/check-ungated-paint-rules.py --survey
              --block sgs/nav-menu`   → zero CENSUSED rows
  Pass:    Council GO. (2) and (3) both report ZERO censused rows. Every DELETE has a written
           two-surface proof; every KEEP has its stated reason.
           ⛔ The verdict is WRITTEN to `.claude/verify/spec-41-qc-council-3.md` (same rule as
           PD-7 — a gate whose pass-condition lives only in scrollback is not a gate). Step 17's
           `Deps:` is THAT FILE existing with a GO verdict.
  Fail:    NO-GO → return to step 16 with the named row, `git revert` its commit and re-dispatch.
           ⛔ Do NOT hand-patch the output.
  Marker:  QA  ·  Time: 25 min  ·  Tooling: /qc-council, python, /verify-loop
```

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
  Exec:        SEQUENTIAL after step 16a (same file family)
  Deps:        **step 16a** (`.claude/verify/spec-41-qc-council-3.md` exists with a GO verdict);
               step 4 (the shared custom property)
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
  Files:       plugins/sgs-blocks/includes/nav-menu-css.php — ⚠ SHORTHAND for step 8's CSS-assembly
               module SET (see step 8's landed roster); the parent-stays-hovered rules belong with
               the item/state colour emission
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
               plugins/sgs-blocks/src/blocks/nav-menu/panels-general.js (the Notice mount) —
               ⚠ **that filename is from the SUPERSEDED four-module guess.** Step 7 now lands ≥ 7 JS
               modules and reports its final roster; read the panel module that actually carries the
               default (Settings) `InspectorControls` group from that roster, and the dispatching
               session repoints this line before dispatching.
               plugins/sgs-blocks/sgs-blocks.php (the registration hook)
  Inputs:      Spec 41 FR-41-34 (a)-(f); the G5a migration path (step 23)
  Outcome:     An operator whose colour visibly changed is told, in the editor, in plain English,
               with the one-step correction — and the notice does not return after dismissal.
  Exec:        **PARALLEL with steps 17 and 18** (S2 — the step-18 sequencing was asserted and never
               justified; the file sets are genuinely disjoint: 18 writes only the nav-menu CSS
               module, 19 writes a NEW `includes/` file + a panel module + `sgs-blocks.php`).
               Running it concurrently takes ~60 min off the Wave C critical path.
  Deps:        **step 14** (it mounts the `<Notice>` in the panel module step 14 lands — ⚠ read step
               7's landed module roster for that file's REAL name; `panels-general.js` is the
               superseded four-module guess); QA-1's answer to question (c).
               ⛔ **NOT step 18** — that dependency was never justified and is removed.
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
  Deps:    steps 13, 14, **14a**, 15, 16, 17, 18, 19 complete
           ⚠ 14a was ABSENT from this list. It is Lane 5's last step and has NO spec gate of its own,
           so a dropped 14a fails none of the 23 tracked gates — the canary could be built and
           deployed with the `sgs/nav-drawer` close-button work missing and nothing downstream would
           notice. This `Deps:` line is the only thing that catches it.
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
           # --- REUSE-LEDGER RE-CHECK (S13) ---------------------------------------------
           # Step 12 checks .claude/verify/spec-41-reuse-ledger.md but runs BEFORE steps 14 and
           # 14a append to it, so the Wave B entries were never gated by anything. Re-check here:
           #   * every nav-menu JS file and every nav-menu PHP file has a ledger row
           #   * each row carries: final size, the shared atom/helper/extension it leaned on (or
           #     "none applies" WITH the reason), and for PHP BOTH the raw and the code-line count
           #   * ⛔ "I did not check" is not an acceptable row (owner ruling 7)
           wc -l plugins/sgs-blocks/src/blocks/nav-menu/*.js      # ≥7 files, each ≤ 250
           # PHP: exactly 4 files, each ≤ 300 CODE lines (Bean 2026-09-11 / D722 — NOT raw wc -l)
  Pass:    Every command exits 0; the grep returns NOTHING; the reuse ledger covers every split
           sub-file from BOTH waves.
           ⚠ **ONE NAMED, PRE-EXISTING EXCEPTION — `node scripts/hover-guard/check.js` (G2).** It
           currently **exits 1 on this tree**, and `plugins/sgs-blocks/package.json`'s `postbuild`
           DELIBERATELY demotes it to advisory (`… || echo [ADVISORY] hover-guard check.js: D943/D948
           findings closed, remaining failures are unresolved cross-file cases the scanner cannot
           prove either way, each needing its own by-hand read before this can return to a hard
           gate`). This is an accepted, disclosed condition that predates this phase — ⛔ **do not
           stall on it, and do not "fix" it to get a green run.** What this step DOES require is that
           the findings are unchanged from the pre-phase baseline: capture `check.js`'s output before
           the phase's first commit, diff it here, and confirm **no NEW finding names a nav-menu
           file**. A new nav-menu finding IS this phase's work and must be fixed, not bypassed.
           Otherwise take the `[gates-ok:hover-guard pre-existing advisory, D943/D948]` bypass the
           `Fail:` field already permits.
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
  Action:      Assert G6, **G13 scenarios 1, 2 and 4 only**, G14 (a)-(g), G15, G17, G18
               (RENDERS/WRITES/EMITS) on the live canary via Playwright + `getComputedStyle`.
               ⛔ **G13 scenario 3 (the UNSET SOURCE) is NOT asserted here** — it requires step 24's
               G5a migration to have run, and is owned by step 24. Asserting 3 of 4 scenarios and
               recording G13 as PASS is the exact fabricated-PASS failure this step's `On-Fail:`
               warns against.
  Files:       .claude/verify/spec-41-gates-mechanism.md (evidence log — **this lane's OWN file**;
               step 25 concatenates it with step 23's into `.claude/verify/spec-41-gates.md` as the
               single sign-off record. ⛔ Do NOT write `spec-41-gates.md` from here: two concurrent
               subagents appending to one file is the collision
               `parallel_agent_dispatch_needs_one_directory_each` records, and prose coordination
               between them is not enforcement)
  Inputs:      Spec 41 §11 G6, G13, G14, G15, G17, G18
  Outcome:     Each gate recorded PASS with the command and the observed value, or FAIL with the
               delta.
  Exec:        PARALLEL with step 23 (different gates, disjoint evidence files).
               ⛔ **A SEPARATE BROWSER CONTEXT PER LANE — mandatory, not tidiness.** Step 23 mutates
               browser-level state that this lane READS: G8 emulates touch and G9 emulates
               `prefers-reduced-motion: reduce`, while this lane's G13/G14/G17 assertions are
               `getComputedStyle` reads on the same page. Share a context and this lane's reads get
               taken under the other lane's emulation — and the failure mode is **a wrong value that
               looks plausible**, not an error.
  Deps:        step 21
  Marker:      (none)
  Time:        90 min
  Tooling:     Playwright MCP, /verify-loop
  On-Fail:     Record the delta, return to the owning step, re-dispatch. ⛔ Never fabricate a PASS.
  Cold-Entry:  this plan file · Spec 41 §11 (G6, G13, G14, G15, G17, G18) ·
               **`.claude/verify/spec-41-baseline/`** — step 1's captured pre-build artefact, which
               is G13's diff target (PD-11); without it there is nothing to be byte-identical TO ·
               **the straddling fixtures built once at step 15 and reused here** (PD-10): for
               `submenuColourHoverTreatment` set `submenuLinkBgHover`, for
               `burgerColourHoverTreatment` set `burgerHoverColour`, for `itemColourHoverTreatment`
               set `itemColourGradient` — ⛔ force the predicate FALSE with a real blocking
               attribute, never by stubbing the registry read ·
               `.claude/verify/spec-41-census-baseline.md` · `.claude/dev-setup.md` +
               `.claude/secrets/sandybrown.env` (canary login, gitignored, always available)
  Test:
    Happy:       G6 — with a bottom border colour AND a sweep direction set, the row renders
                 EXACTLY ONE painted horizontal line and
                 `getComputedStyle(link).borderBottomColor === 'rgba(0, 0, 0, 0)'` while the
                 `::after` band paints. Assert the MECHANISM, not just the appearance
    Edge:        G13 scenario 4 (THE RADIUS) — with an `itemBg` set and `itemBorderRadius`
                 untouched, assert `getComputedStyle(link).borderRadius` is `8px` on all four
                 corners. ⛔ Assert the COMPUTED value, not the emitted declaration: pre-0.4.6 the
                 8px came from a `render.php` `isset()` fallback, post-0.4.6 from a `block.json`
                 default through `sgs_corner_object_shorthand()` — same painted result, different
                 source text, so a source diff fails for the right reason and the wrong verdict.
                 Plus the negative: an item with NO background set renders no `border-radius` rule
                 at all
                 ⚠ **Any `getComputedStyle` read in this lane is taken in a context with NO
                 emulation applied** — no touch emulation, no `prefers-reduced-motion` override, no
                 forced colour scheme. Those belong to step 23's context (see this step's `Exec:`)
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
  Files:       .claude/verify/spec-41-gates-interaction.md (evidence log — **this lane's OWN file**;
               step 25 concatenates it with step 22's into `.claude/verify/spec-41-gates.md` as the
               single sign-off record. ⛔ Do NOT append to `spec-41-gates.md`, and ⛔ do not touch
               step 22's `spec-41-gates-mechanism.md`. The previous "appended — coordinate with step
               22" wording was prose coordination between two concurrent subagents, which this
               project's own lesson `a-prohibition-in-a-subagent-brief-is-not-enforcement` records
               as not working)
  Inputs:      Spec 41 §11 G7, G8, G9, G10, G16, G19, G20
  Outcome:     Each gate recorded PASS with its command and observed value.
  Exec:        PARALLEL with step 22.
               ⛔ **A SEPARATE BROWSER CONTEXT PER LANE — mandatory.** This lane MUTATES
               browser-level state that step 22 reads: G8 emulates touch, G9 emulates
               `prefers-reduced-motion: reduce`. Step 22's G13/G14/G17 are `getComputedStyle` reads
               on the same page. Sharing a context silently contaminates them with a plausible-looking
               wrong value rather than an error. Launch your own context; reset every emulation
               between gates within it too.
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

> ✅ **Owner ruling 5 (2026-09-11) — RUN IT DIRECTLY AGAINST THE CANARY'S CURRENT CONTENT. The
> duplicate-the-pages-first step is REMOVED, not deferred.** The canary is pre-production; there is
> no client content to protect, so duplication hedges a risk that does not exist. The real safety net
> already exists — post revisions (`On-Fail:` below) and step 1's captured baseline (PD-11), which is
> where G13's before/after pair comes from. Full reasoning in §Resolved judgement calls.

```
  Model:       sonnet
  Action:      Run the deleted-attribute sweep over the canary's pulled `post_content`, execute the
               `indicatorStyle → itemBgHoverTreatment` migration with its colour carry-across and
               its three precedence cases, and assert G20b's five notice conditions. ⛔ Do NOT
               duplicate any page first (owner ruling 5) — migrate the live content directly.
               **⛔ BUILD THE MIGRATION AS A NAMED CODEMOD, not a hand-run wp-cli pass.** Create a
               script under `plugins/sgs-blocks/scripts/`, modelled on
               `plugins/sgs-blocks/scripts/migrate-stored-tier-scalars.py`: it operates on an
               **exported `post_content` dump, never on live DB rows directly**; it carries
               `--self-test` with fixtures for **all three precedence cases** — both-set,
               already-set-`itemBgHover`, and the UNSET-SOURCE case; and it carries `--dry-run`.
               Without a codemod, this step is an irreversible live-content migration done by hand
               with post revisions as the only net, and the project's own lesson
               `revert-and-rerun-a-codemod-dont-hand-patch-its-output` has nothing to bite on
               because there is no codemod to re-run.
               **Additionally assert G13 scenario 3 (the UNSET SOURCE), which is owned by this step
               because it straddles the migration.** ⛔ **Capture the pre-migration reading BEFORE
               you migrate, in this step** — take `getComputedStyle(indicator).backgroundColor` on a
               live page with `indicatorStyle='pill'` and BOTH `indicatorColour` and `itemBgHover`
               empty; run the migration; re-read the same page. **The two values must MATCH.** Assert
               the RENDERED colour, never the stored attribute: pre-migration the colour comes from
               `style.css`'s `background-color: var(--wp--preset--color--accent, currentColor)` with
               no PHP emission at all (`render.php` gates the fill on `'' !== $indicator_colour`), so
               an attribute-level diff shows empty-vs-`'accent'` and tells you nothing about what the
               visitor sees.
  Files:       plugins/sgs-blocks/scripts/migrate-nav-menu-indicator-to-treatment.py (NEW — the
               codemod; name it whatever fits the sibling convention and report the final name)
               .claude/verify/spec-41-gates.md (G13 scenario 3 evidence + G5a/G20b — this step SEEDS
               the merged sign-off record; step 25 merges the two Playwright lanes into it)
               (canary post_content, via the exported dump — no other repo file edited)
  Inputs:      Spec 41 §11 G5a + G20b + **G13 scenario 3**; FR-41-34(b);
               `plugins/sgs-blocks/scripts/migrate-stored-tier-scalars.py` (the codemod shape)
  Outcome:     Zero surviving references to any deleted attribute in stored content; every migrated
               key carries the correct value; the notice appears on exactly the changed keys.
  Exec:        SEQUENTIAL after steps 22 and 23
  Deps:        steps 22, 23
  Marker:      (none)
  Time:        45 min
  Tooling:     wp-cli over SSH (EXPORT the dump; the codemod edits the dump, not live rows),
               the NEW codemod (`--self-test`, `--dry-run`, then the live pass),
               `npm run audit:post-content`, Playwright
  On-Fail:     ⛔ Restore the post from its revision, then **revert and re-run the codemod** — ⛔ never
               hand-patch its output (`revert-and-rerun-a-codemod-dont-hand-patch-its-output`). A
               green build proves NOTHING here.
  Test:
    Self-test:   `python plugins/sgs-blocks/scripts/<the-new-codemod>.py --self-test` exits 0, and its
                 fixtures cover ALL THREE precedence cases by name — both-set, already-set
                 `itemBgHover`, and the **UNSET-SOURCE** case (which this step itself calls "the
                 commonest real state"). ⛔ A self-test missing the unset-source fixture is vacuous
                 on the case that matters most
    Dry-run:     `--dry-run` output is REVIEWED before the live pass. ⛔ Do not run the live pass on
                 an unreviewed dry-run
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
  Action:      **First, CONCATENATE the two verification lanes' evidence files into the single
               sign-off record**: `.claude/verify/spec-41-gates-mechanism.md` (step 22) +
               `.claude/verify/spec-41-gates-interaction.md` (step 23) → merged INTO
               `.claude/verify/spec-41-gates.md`, which is what the phase success criteria name.
               ⛔ **Step 24 has ALREADY seeded that file** with its G5a / G20b / G13-scenario-3
               evidence — merge into it, never overwrite it. ⛔ Check every one of the 23 gates
               appears exactly once in the merged
               file — a gate present in neither lane's file is an unrun gate, not a formatting
               problem. Then present the canary at 375 / 768 / 1440 px with the new controls
               exercised, alongside a written summary of what changed and the four accepted residual
               risks (FR-41-17a a-d), and get Bean's explicit yes.
  Files:       .claude/verify/spec-41-gates.md (the merged sign-off record — WRITTEN HERE)
               (read-only) .claude/verify/spec-41-gates-mechanism.md ·
               .claude/verify/spec-41-gates-interaction.md
  Inputs:      steps 22-24's evidence logs
  Outcome:     Bean has looked at it and said yes, or named what to change.
  Exec:        SEQUENTIAL
  Deps:        step 24
  Marker:      HANDOFF
  Time:        20 min (Bean's time: ~10 min)
  Tooling:     design-reviewer agent, Playwright, /visual-qa
  On-Fail:     Bean names a change → it becomes a new step, and the gates it touches re-run.
  Cold-Entry:  this plan file · `.claude/verify/spec-41-gates-mechanism.md` +
               `.claude/verify/spec-41-gates-interaction.md` (the two lanes to merge) ·
               Spec 41 §FR-41-17a (the four residual risks to present explicitly) ·
               **the annex's PD-12** — an untouched drawer now ships NO separator and NO current-page
               tint; that is a deliberate default reduction and Bean must SEE it here rather than
               discover it later · `.claude/dev-setup.md` + `.claude/secrets/sandybrown.env`
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
  Action:      Flip `check-ungated-paint-rules.py --check` from warn-only to hard-fail **for
               `sgs/nav-menu` only** (owner ruling 4) — the one line step 11 left behind a
               clearly-named constant, reading its scope from `gates.json` config rather than a dict
               in the script (R-31-1) — and re-run the reachability proofs.
               ⛔ **Framework-wide hardening is EXPLICITLY SEPARATE FUTURE WORK**, triaged with Bean
               against a real no-filter `--survey` run. It is not part of this phase and must not be
               slipped into it. ⛔ Do not add a parking entry for it without asking Bean first.
  Files:       plugins/sgs-blocks/scripts/check-ungated-paint-rules.py
               plugins/sgs-blocks/scripts/gates.json (the enforcement-scope config + its
               expiry-condition comment)
  Inputs:      step 16's clean tree; Spec 41 §11 G20c; owner ruling 4
  Outcome:     `--check` exits non-zero on an ungated paint rule in `sgs/nav-menu`, and still
               PRINTS (warn-only) every finding it has elsewhere in the framework.
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
    Scope:       ⛔ **A findings-bearing OTHER block must NOT fail the build** (owner ruling 4).
                 Prove the scoping works in both directions: a planted ungated rule in `sgs/nav-menu`
                 exits NON-ZERO, and the same planted rule in any other block exits 0 with the
                 finding PRINTED. A scope that silently hard-fails everything passes the Happy row
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
               plugins/sgs-blocks/CLAUDE.md · .claude/LEDGER.md ·
               **.claude/STOP-CATALOGUE.md** (S4 — this phase produces a genuinely new structural
               defence: the `colourRows` ATOMICITY rule plus rule 31's TWO-CORPUS blindness, a gate
               going silently blind while the editor renders perfectly. D738's shape, and rule 31's
               own header records that class costing a 33-row tree-wide undercount once already.
               Under D101 that belongs in the catalogue, not only in a plan that gets archived.
               ⛔ READ THE PREVIOUS VERSION END TO END FIRST and carry every existing defence
               forward verbatim — count STOP entries before and after; a count that went down
               without a recorded justification is a regression) ·
               .claude/parking.md (ONLY with Bean's explicit yes)
               ⛔ **`.claude/plans/plan.md` REMOVED from this list (S6) — it does not exist and is
               not a path this project's doc conventions define.**
  Inputs:      everything above
  Outcome:     No living doc still describes the pre-Spec-41 world.
  Exec:        SEQUENTIAL
  Deps:        step 26
  Marker:      HANDOFF
  Time:        35 min
  Tooling:     Read/Edit, `python .claude/hooks/handoff-preflight.py --check`
  On-Fail:     `handoff-preflight.py --check` names what is non-conformant; fix and re-run.
  Cold-Entry:  this plan file (its §Resolved judgement calls + the decisions table below) ·
               `.claude/decisions.md` HEAD (re-derive the D-ceiling in the SAME command as the
               write) · `.claude/specs/README.md` row 41 · `.claude/LEDGER.md` ·
               `.claude/STOP-CATALOGUE.md` (READ THE PREVIOUS VERSION END TO END before writing —
               D101 carry-forward: never SUBTRACT a structural defence) ·
               `plugins/sgs-blocks/CLAUDE.md` · `~/.agents/skills/shared-references/doc-templates/`
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
    Integration: `.claude/specs/README.md` row 41 is stale on **THREE** counts today — it says
                 **v0.4.1** (the spec is 0.4.7) and **draft**, and its summary text is wrong TWICE
                 (S5): (i) it still asserts the `showHover` trio is "deliberately NOT adopted" —
                 0.4.2 restored it; (ii) it says the spec *"Builds NO new shared component — **three**
                 small additive extensions only"* — **owner ruling 1 made it FOUR**
                 (`sgs_border_states_css`'s `suppress_edges`). Fix the version, the status to
                 `built`, and BOTH summary claims
```

**Decisions to record (D-numbers assigned at write time, ceiling re-derived in the same command):**

| Decision | Tag | Why it is a decision, not just work |
|---|---|---|
| `SgsBorderControl` gains `showColour` + re-parents the shared `BorderStyleControl` | `[ROUTINE]` | A shared-component change with 40+ mounts — design-gated per project rule 7 |
| `fx-magnet.css` exposes `--sgs-magnet-transition` | `[ROUTINE]` | A shared-stylesheet touch reaching every magnet element in the framework — design-gated |
| `SgsColourPanel` rows accept an optional `heading` | `[ROUTINE]` | Shared-component change; zero blast radius by construction, but gated all the same |
| `sgs_emit_state_colour_css` / `sgs_fill_decls` / `sgs_text_decls` / `sgs_border_states_css` gain an optional third state — **no `_3` family** | `[ROUTINE]` | 122 call sites; the no-triplication rule is the load-bearing half |
| `sgs_border_states_css()` gains an optional `$map['suppress_edges']` in box-object `{top,right,bottom,left}` shape — border COLOUR becomes per-edge-aware for the first time | `[ROUTINE]` | Owner ruling 1. The fourth design-gated shared-component change in this phase, taken deliberately over a block-private override: the capability belongs in the shared painter, reuses the naming `itemBorderWidth` already uses, and the gradient/ring path's exemption is the part worth recording |
| `check-ungated-paint-rules.py` — a new gate whose DETECTOR is framework-wide and generic but whose ENFORCEMENT lands on `sgs/nav-menu` only | `[INCIDENT]` | Born from a defect CLASS found by three consecutive reviews. Owner ruling 4: the split between generic logic and scoped enforcement is the thing worth recording — a gate that fails everywhere on day one is a gate nobody reads |
| `sgs/nav-drawer`'s close button gains `closeLabel` + `closeIcon`, and `closeStyle` gains a fourth value — built by mirroring `sgs/nav-menu`'s Menu Button | `[ROUTINE]` | Owner ruling 6. The recordable part is the DIVERGENCE: `closeStyle` conflated a display axis with a glyph choice (`burger-morph`), so the mirror had to be additive rather than a rename |
| `_sgs_nav_menu_migration_notice` — the first `_sgs_*` post meta registered on `post`/`page`, and the first `<Notice>` in the plugin whose dismissal clears a persisted flag | `[ROUTINE]` | Two genuine firsts, both disclosed as new rather than implied precedented |
| Border colour moves into `SgsColourPanel` for `sgs/nav-menu` only — a named block-scoped exception to that component's three documented exemptions | `[ROUTINE]` | Taken on merit; the general rule is unchanged and no other block moves |
| `edit.js` and `render.php` split into modules following the `cart/` and `product-card` precedents — with the FR-41-21 emitter deliberately left BLOCK-PRIVATE in `render.php` | `[ROUTINE]` | Establishes which precedent applies to which language, and where the shared/block-private line falls inside one language (rulings 2 + 7) |

**`plugins/sgs-blocks/CLAUDE.md` additions (new precedent genuinely created by this build):**
the `showColour={false}` mount pattern and its ten-prop ignore-list · the `supports.sgs.<key>` read
by BOTH surfaces as the canonical shape for a fact `edit.js` and `render.php` both need (the
"one declared source, two evaluators" pattern) · the block-private typography-hover emitter as the
adoption cost of `TypographyControls`' `showHover` flag, and the note that a SECOND adopter should
extend the shared helper instead.

---

## Resolved judgement calls (owner rulings, 2026-09-11)

**All seven are RULED. Nothing in this plan is blocked on a decision.** Each entry keeps the option
set and the reasoning that produced it — that is the record of *why* the tree looks the way it does.
⛔ Do NOT re-open any of these mid-execution. If one turns out wrong, change the requirement and say
so; do not re-litigate it as a question.

**Ruling 1 — `sgs_border_states_css()` gains an ADDITIVE per-edge suppression. (was KJC-7)**
- **RULED: extend the shared helper.** Not the block-private override this plan previously
  recommended, and not a new function sibling.
- **The finding that forced it (verified, not inherited):** FR-41-8 stated the sweep rule as the
  emitter's own condition — *"receives a `$map` whose `hover` (and `current`) keys are UNSET for the
  `bottom` edge"*. The real signature is
  `sgs_border_states_css( string $selector, array $attributes, array $map )`
  (`grep -n "function sgs_border_states_css" -A 60 plugins/sgs-blocks/includes/helpers-colour-variants.php`)
  — **no edge parameter, no per-edge branch.** It resolves one normal paint and one hover paint and
  emits one flat `border-color:` covering all four sides. The instruction could not be executed.
- **Why the shared extension over the block-private override:** the project already has a proven
  per-edge **box object** `{top, right, bottom, left}` — §8.4 declares `itemBorderWidth` with it.
  Border *colour* never got the concept; that is a gap in the shared painter, not a nav-menu
  peculiarity. And FR-41-2/FR-41-3 already resolved the identical PHP-duplication finding the same
  way: **an additive optional parameter on the existing function, never a sibling** (no `_3` family,
  and no `sgs_border_states_css_per_edge()`). A block-private override would also have been a SECOND
  mechanism painting border colour on one selector — two overlapping fixes, neither falsifiable,
  neither ever safely deletable.
- **Cost, stated honestly:** the **fourth** design-gated shared-component change in a phase that
  carried three — treated exactly like the others: its own step (**6a**), its own paste-and-run
  prompt, and its own before/after byte-identity gate folded into **G1(c)**, which now also asserts
  that a caller passing no `suppress_edges` still gets the flat `border-color` SHORTHAND.
- **Lands at:** step 6a (build) · step 12/G1(c) (zero blast radius) · step 15 rule 5 (consume) ·
  step 22/G6 (live). **Spec:** FR-41-8 rewritten in v0.4.7; the retired unset mechanic is deleted,
  not left standing beside the new one.

**Ruling 2 — the FR-41-21 hover-typography emitter is BLOCK-PRIVATE. (was KJC-1)**
- **RULED: it lives in `plugins/sgs-blocks/src/blocks/nav-menu/render.php`, inside a
  `function_exists()` guard. NOT in `includes/nav-menu-css.php`, NOT anywhere under `includes/`.**
- **What it is:** `sgs_nav_menu_typography_hover_rule()`, for the hover-state typography trio —
  needed because `includes/helpers-typography.php::sgs_typography_css_rule` has no hover branch and
  no other block has ever switched `TypographyControls`' `showHover` on. `sgs/nav-menu` is the first
  adopter and pays the cost block-privately.
- **Why it was ambiguous:** KJC-1's other half (where the split-out CSS *assembly* lives) was already
  closed by PD-2 — `includes/nav-menu-css.php`, shipping path proven. That left a literal reading of
  FR-41-21 (*"not an addition to `includes/`"*) in tension with a file under `includes/` that only
  nav-menu requires. **The owner confirms the literal reading:** `includes/` is the shared folder
  regardless of who currently requires a given file in it.
- **Consequence:** step 8's split leaves the emitter behind and reports `render.php`'s projected line
  count once step 15 adds the ~30 lines, so the 300-line limit is budgeted not discovered. ⚠ It
  deliberately duplicates three of `sgs_typography_css_rule()`'s allowlists — OWNER-RULED, recorded
  in the reuse ledger so nobody "cleans it up"; promoting the trio is Spec 41 §12 item 2, taken the
  day a SECOND block wants `showHover`. No spec edit was needed — FR-41-21 already said this
  literally.

**Ruling 3 — the `colourRows` literal is an ATOMIC UNIT, and it stays in `edit.js`. (was KJC-2)**
- **RULED: the atomicity rule is a hard requirement with its own test**, now written into step 7
  (`Atomicity:` in its Test block + constraint 2 of its prompt), step 13 and step 14.
- **The rule:** `colourRows` — and every `states: [ … ]` inside it — is ONE atomic literal: never
  partially extracted, never rebuilt by `.map()` / `.filter()` / `.concat()` / `Array.from()` / a
  spread of a variable, never split across a module boundary. A later grouping must be multiple
  COMPLETE literal `ArrayExpression`s in the SAME file that mounts `<SgsColourPanel>`. **Its test:**
  `node scripts/inspector-scan/run.js --check` reports IDENTICAL per-row state counts before and
  after any split, both runs pasted — a differing count, **including one that silently becomes
  zero**, fails the step.
- ⚠ **NEW FINDING while applying this: atomicity is NECESSARY BUT NOT SUFFICIENT.**
  `31-golden-colour-control.js` has two corpora and a block-folder sibling is in neither. Its
  per-block walk builds `entryEditFile` as `<blocksDir>/<name>/edit.js` and parses nothing else; its
  shared-owner fallback (`core/components.js::getSharedOwnerScan` → `::resolveComponentFiles`)
  enumerates owner files only from `ctx.componentsDir`, which `run.js` sets to `src/components`. So
  an IMPORTED `colourRows` hits `resolveArrayLike`'s `Identifier` branch, matches neither
  `pushedRows` nor `declaredArrays`, and returns `[]` — every row scores zero states, silently, while
  the editor renders perfectly. D738's shape; this rule's own header records the same class of
  blindness costing a 33-row undercount once already.
  **Commands:** `grep -n "entryEditFile" .../rules/31-golden-colour-control.js` ·
  `grep -n "componentsDir" .../inspector-scan/run.js` ·
  `grep -n "resolveComponentFiles" .../inspector-scan/core/components.js` ·
  `grep -n "const colourRows" plugins/sgs-blocks/src/blocks/nav-menu/edit.js` (→ a literal
  `ArrayExpression`, mounted `rows={ colourRows }` — the rule's own supported shape (b)).
- **So: there is no `colour-rows.js`.** Step 7 extracts PANEL COMPONENTS; the array stays in
  `edit.js`. Steps 13/14 corrected to match, and PD-1's `import metadata from './block.json'` goes
  into `edit.js` for the same reason.
- ⛔ **That reading is a static hypothesis until QA-1 question (b) proves it** with a real
  before/after run. If the detector DOES follow a block-folder sibling, the extraction is permitted —
  and the atomicity rule still binds unchanged. **Cost if got wrong:** a blind golden-colour gate is
  invisible — every row renders correctly and the detector reports the wrong count indefinitely.

**Ruling 4 — the detector's first landing is `sgs/nav-menu`-scoped and WARN-ONLY. (was KJC-3)**
- **RULED: CONFIRMED as already planned, with the enforcement scope now explicit.** Two things were
  conflated and are now permanently separated: the detector's **LOGIC** stays generic and
  framework-wide (keys on selector shape and `supports.sgs`, never a block name; `--survey` with no
  filter still enumerates every block; step 11's `grep -c "sgs-nav-menu" …` → 0 is unchanged), while
  its **ENFORCEMENT** lands on `sgs/nav-menu` alone — WARN-ONLY at step 11, hardened at step 26
  scoped to that one block.
- **Framework-wide rollout is EXPLICITLY SEPARATE FUTURE WORK**, triaged with Bean against a real
  no-filter `--survey` run. Not bundled here, not implied. ⛔ Do not add a parking entry for it
  without asking Bean first.
- **Why:** `--survey` will almost certainly find real ungated paint rules elsewhere — this defect
  class was found three times on nav-menu alone — and turning the build red framework-wide for every
  concurrent session, on work nobody scoped, produces a gate nobody reads (recorded:
  `wp-pre-merge-gate` printed FAIL on every commit for months, 220 of 228 findings from a vendored
  competitor plugin). ⚠ Scope lives in `gates.json` config with an expiry-condition comment, never a
  dict inside the script (R-31-1). Step 26 carries a `Scope:` negative control proving it BOTH ways.
  **Spec:** §11 G20c gains (f).

**Ruling 5 — test the G5a migration directly against the canary. (was KJC-4)**
- **RULED: run it against the canary's actual current content. The "duplicate the pages first" step
  is REMOVED — not deferred, not kept as an option.**
- **Why:** the canary is pre-production and there is no real client content to protect. This
  project's standing rule — never reason from what the canary currently renders (Bean-locked
  2026-08-31) — applies in this direction too: hedging against a risk that does not exist spends
  effort for nothing and leaves an extra confusing state on the site.
- **What already provides the safety:** WordPress post revisions (step 24's `On-Fail:`), and step 1's
  captured pre-build baseline under `.claude/verify/spec-41-baseline/`, which is where G13's
  before/after pair comes from (PD-11). Neither needs a duplicated page. **Unchanged:** every G5a and
  G20b assertion stands — the precedence rule (never silently overwrite a non-empty stored
  `itemBgHover`, per-KEY not per-post) and the UNSET-SOURCE case.

**Ruling 6 — the `sgs/nav-drawer` close-button work is IN SCOPE, as a mirrored follow-on. (was KJC-5)**
- **RULED: fold it in.** New **step 14a**, immediately after step 14 (the Menu Button panel), built
  by mirroring it — same shared helpers, same control shape, copied not redesigned.
- **The scope match was CHECKED against the real files, and it is a PARTIAL mirror — step 14a
  carries the full capability table.** In short: the 2-state COLOUR pairing
  (`toggleCloseColour` / `…Hover` / `…Gradient`) already exists and must not be rebuilt; the LABEL and
  the ICON are clean mirrors (→ new `closeLabel`, `closeIcon`); the magnet trio is explicitly NOT
  mirrored. ⚠ **The one real divergence:** `closeStyle` conflates two orthogonal axes —
  `separate-x`/`text-swap` are the icon/text display axis, but **`burger-morph` is a GLYPH choice**
  (a CSS-drawn two-bar span, no icon and no text), so a one-to-one rename onto `triggerMode`'s three
  values would silently delete a shipped look. **Resolution: keep the name, default and three values;
  ADD a fourth, `icon-and-text`** — in the JSON enum AND in
  `render.php::$sgs_nd_allowed_close_styles`, same commit, or a stored value is accepted by one side
  and coerced away by the other with no error on either.
- **Cost accepted:** a second block's manifest enters this phase, with its own byte-identity proof
  (`closeIcon` unset renders markup identical to today's hardcoded `x`) and enum-parity assertion.
  Against that, the open/close pair stops reading half-finished — the operator-visible defect
  FR-41-12 recorded and then deferred. **Spec:** FR-41-12 records it in scope; §12 item 1 becomes a
  tombstone.

**Ruling 7 — `edit.js` and `render.php` DO run as two concurrent lanes, and a split must REDUCE. (was KJC-6)**
- **RULED: yes, two concurrent subagent lanes**, once step 9's manifest is done and step 10 has
  reviewed it. Lane 5 (`edit.js` + sub-modules) ∥ Lane 6 (`render.php` + `includes/` + `style.css`).
  They write genuinely disjoint file sets and share only *declarative data*
  (`block.json::supports.sgs.sweepEligibility`), which neither writes — the shape parallel dispatch
  exists for, and it roughly halves the critical path through the two largest steps.
- **Hard preconditions, unchanged:** one writable directory/file-set per lane, named in its prompt;
  the dispatching session runs `git diff --stat` between every step and reviews it itself. ⚠ Parallel
  agents destroy each other's work in four recorded ways and `git diff --stat` catches all four; an
  agent told "do NOT run any git command" once ran `git stash`/`pop` in the shared tree anyway.
  **A prohibition in a brief is not enforcement** — the dispatcher's diff review is.
- ⛔ **The file-size expectation is CORRECTED, and this is the half that was wrong.** This plan
  implicitly accepted that the split files would simply be "large". They should not be. Proper
  reliance on what the framework already ships — SGS atoms, shared `includes/helpers-*.php`, the
  `src/components/` barrel and `primitives/`, universal injector/extension files — must make the
  split files **meaningfully smaller than a naive line-count reduction**, not the same bulk under
  more filenames. Extract-and-rename is not the deliverable.
- **Made structural rather than aspirational, in three places:** (1) **per-file size assertions**
  in steps 7, 8, 14 and 14a against the project limits (250 JS/TS on raw `wc -l`; **300 PHP on CODE
  LINES ONLY** — see the addendum below), individually, never on a total — step 7 additionally names
  any file within 10 lines of the limit, because it will not survive step 14; (2) an explicit **"find the shared component first"** instruction in each of those
  steps, naming the real files to read; (3) **`.claude/verify/spec-41-reuse-ledger.md`** as a phase
  deliverable — one row per sub-file: final line count, the shared atom/helper/extension it leans on,
  and the count it would have had without. Where something was hand-rolled anyway, the row says which
  shared component was checked first and why it did not fit; "did not check" is not acceptable. In
  the phase success criteria, asserted at step 12.
- **Cost of the alternative:** sequential lanes ≈ +3.5h of critical path; a mis-run parallel dispatch
  = two agents' edits interleaved on `main` and a forensic unwind.

**Ruling 7 addendum — RAW LINES vs CODE LINES, and the resulting file-count floors. (Bean, 2026-09-11)**
- **The question:** a `/qc` pass found steps 7 and 8 each prescribing fewer modules than their own
  size limits require, and offered two shapes — derive the floors from raw `wc -l` (giving 7 JS +
  7 PHP files), or from code lines only. A `/qc-council` was run on it because it changes step
  structure, not step prose.
- **RULED — `render.php` is measured on CODE LINES ONLY, excluding comments.** Consistent with
  Bean's own prior ruling **D722**, which already rejected a raw-line-count gate on *this exact
  file* for being comment-heavy (48% comments then, **52% now**). ⛔ **Do not re-litigate this in a
  future revision without a fresh decision from Bean.**
- **The resulting floors** (derivation and commands in step 8's callout):
  - **`edit.js` → 7 files minimum, expect 8 after step 14.** Measured raw, deliberately: 1,536 lines
    of which 1,303 are code — only 11% comments, so this file's bulk is genuinely real and the raw
    number is the honest one. `ceil(1535/250) = 7`.
  - **`render.php` → exactly 4 files, floor AND ceiling.** 845 code lines (428 markup half / 417 CSS
    half) at 300/file → 2 + 2. ⛔ **Not the 8 a raw-line reading would demand.**
- **The asymmetry is the point, not an inconsistency:** the same rule (measure what a reader
  actually has to hold in their head) gives a raw reading on an 11%-comment file and a code reading
  on a 52%-comment one.
- **One consequence worth stating:** step 8's reuse lever is already spent (27 shared-helper call
  sites; both migration surveys return 0 plugin-wide), so *"none applies"* is the correct ledger row
  there — whereas step 7's `fillRow`/`textRow` lever is real, unspent, and worth ~145 lines.


---

### Pre-emptive decisions (Hidden Decisions pass) — MOVED TO A COMPANION FILE

✅ **The Stage 6 Hidden Decisions pass was RUN** (two cold peer reviewers with distinct personas —
a conscientious senior engineer who hates being blocked, and a pedantically literal junior who
refuses to infer intent — dispatched via `/dispatching-parallel-agents` against this plan with
Step 15 as the representative step). It produced **14 pre-answers (PD-1 … PD-14)**, one genuine
blocker (the `sgs_border_states_css()` edge-blindness, now owner ruling 1) and two corrections to
this plan's own factual claims. **Every factual claim either reviewer made about the real code was
re-verified with a command before being acted on.**

**The full record now lives at
[`.claude/plans/phase-nav-menu-colour-state-hidden-decisions.md`](phase-nav-menu-colour-state-hidden-decisions.md)**
— split out on 2026-09-11 to keep this file under its 3,000-line doc-shape cap. ⛔ **Nothing was
deleted.** The `PD-n` IDs are unchanged and stable, so every `PD-n` citation in the steps above
still resolves. Read it before dispatching any of steps 7, 8, 9, 13, 14 or 15 — six of the
pre-answers are the reason those steps read the way they do.

⚠ **Three entries were corrected by the owner rulings above and say so in place:** PD-1 (the
`block.json` import goes into `edit.js`, because there is no `colour-rows.js`), PD-2 (the FR-41-21
emitter stays block-private in `render.php`), PD-6 (a `colourRows` GROUPING may not leave
`edit.js` either).

---

## Gate → step map (all 23 acceptance gates, none unowned)

| Gate | Owned by | Kind |
|---|---|---|
| G1 (a)-(e) | Step 12 (QA-3) | byte-identity, 5 proofs — **(c) now also covers step 6a's `suppress_edges`** (owner ruling 1) |
| G2 | Step 20 (QA-6) + step 15 | static |
| G3 | Step 20 (QA-6) | static |
| G4 | Step 10 (QA-5) | DB negative control |
| G5 | Step 20 (QA-6) | static, 3 search scopes |
| G5a | Step 24 | stored content, live |
| G6 | Step 22 | live mechanism — now also the end-to-end proof of step 6a's `suppress_edges` |
| G7 | Step 23 | live, both forks + Bean's eye |
| G8 | Step 23 | touch emulation |
| G9 | Step 23 | reduced motion + its CAUSE |
| G10 (a)(b) | Step 23 | renders, not just computes |
| G11 | Step 10 (QA-5) | reseed |
| G12 | Step 10 (QA-5) + step 20 | manifest conformance |
| G13 (4 scenarios) | **Step 22 (1, 2, 4) + Step 24 (3 — straddles the G5a migration)** | byte-identity + input-mapped |
| G14 (a)-(g) | Step 22 | cross-mechanism, 5 paths on (f) |
| G15 | Step 22 | icon default byte-identity |
| G16 (a)(b)(c) | Step 23 | relocated control still ACTS |
| G17 | Step 22 | magnet default costs zero bytes |
| G18 (a)(b)(c) | Step 22 (+ static half at step 20) | RENDERS / WRITES / EMITS |
| G19 (a)-(e) | Step 23 | trio renders, emits, is not the default |
| G20 (a)(b)(c) | Step 23 | tiers persist + render, both prefixes |
| G20b (a)-(e) | Step 24 | notice appears ONLY on a real change |
| G20c (a)-(e) | Step 26 | detector exists, reachable, can still fail — **plus its own scope negative control** (owner ruling 4): hard-fails on `sgs/nav-menu`, warns-and-passes elsewhere |

⚠ **Two steps carry acceptance criteria that are NOT one of the spec's 23 gates, deliberately.**
Step 6a's zero-blast-radius proof is folded into **G1(c)** rather than given a new number (ruling 1).
**Step 14a has no spec gate at all** — it lands on `sgs/nav-drawer`, and Spec 41's gate set is scoped
to `sgs/nav-menu`; its acceptance conditions live in its own `Test:` block (enum parity across
`block.json` and `$sgs_nd_allowed_close_styles`, a non-empty accessible name, and the
`closeIcon`-unset byte-identity proof — G15's shape on the open side). ⛔ Do not count it among the
23, and do not invent a G24 for it.

---

## Docscore (Stage 7)

Run against the `archived-plan` template (the in-flight `plans/phase-*.md` location has no dedicated
`plan` doc_type; per the skill this is acceptable for in-flight work, and the file moves to
`plans/archive/` on completion where it picks up the template correctly).

**Tool grade after the 2026-09-11 QC + council fold-in: A- (94.3%)** — Structural **85.7% (6/7)** /
Completeness 100 / Quality 100 / Freshness 100. **Honest qualitative self-assessment: A-** (up from
B+ — the four defects that made the previous edition non-executable as written are closed).

⚠ **The single structural failure is the 3,000-line cap, and it is DISCLOSED rather than chased.**
`structural_max_lines: 3,409 lines exceeds cap of 3000` (re-derive with `wc -l`; the figure moves
every time this file is touched). Folding in 7 MUST-FIXes and 13 SHOULD-FIXes added ~510 lines to a
file that was already at 2,896 after the previous split. **The tool's remedy
("move detail to references/") was considered and DELIBERATELY NOT TAKEN this time**, for a reason
worth recording:

- The obvious candidates are §Resolved judgement calls (189 lines) and this §Docscore section (42).
  Moving both lands the file at **~3,160 — still over the cap**, so the split buys no grade and
  costs a cold executor the rulings they are told in three places never to re-open mid-execution.
- Getting genuinely under 3,000 would mean splitting the **pre-written subagent prompts** away from
  their steps. Those prompts are the plan's primary deliverable — paste-and-run, beside the step
  they run — and separating them converts a one-read dispatch into a two-file lookup.
- ⛔ This is a cap on a DOC SHAPE, not on correctness. Trading executability for a template
  threshold is the wrong trade, and the honest move is to say so here rather than to score higher by
  making the plan harder to run. **The previous split (the Hidden Decisions annex) WAS worth it and
  stands; a second one is not.**

The tool grades structure against the template; the qualitative caveats below are mine, not its.

⚠ **One structural change was forced by that revision and is disclosed rather than hidden.** Applying
the seven rulings added two steps and ~500 lines, which pushed the file past the template's
3,000-line cap (measured: 3,030 lines, Structural 6/7, grade **A-**). The Stage 6 Hidden Decisions
record was therefore **split into
[`phase-nav-menu-colour-state-hidden-decisions.md`](phase-nav-menu-colour-state-hidden-decisions.md)**
— the tool's own remedy ("move detail to references/"), and lossless: every `PD-n` entry is unchanged
except where a ruling corrected it, the IDs are stable, and every citation in the steps still
resolves. ⛔ It is a SPLIT, not a deletion; do not treat the annex as optional reading.

Strengths: every step carries all nine required annotation fields plus a four-layer Test block;
every QA gate's `Check` is a runnable command; all 23 acceptance gates map to a named owning step;
every pre-written prompt is paste-and-run and cites code by SYMBOL, never by line; the Hidden
Decisions pass was RUN and produced one genuine blocker (the `sgs_border_states_css()`
edge-blindness, now ruling 1) plus two corrections to this plan's own factual claims, all re-verified
with commands; and **all seven judgement calls are now RULED**, each keeping its option set and
reasoning.

Deductions: (1) 30 steps is past the upper bound of a single phase, and the `[HANDOFF]` markers at
25 and 27 are the only two natural boundaries in work that will realistically span four sessions;
(2) time estimates are optimistic by policy (`~/.claude/rules/time-estimates.md`) with no per-step
confidence band; (3) **step 14a lands on a SECOND block (`sgs/nav-drawer`)**, widening the blast
radius onto a manifest Spec 41 does not govern — accepted on ruling 6, mitigated by running it last
in its lane with its own enum-parity and byte-identity assertions; (4) one of ruling 3's load-bearing
inputs (rule 31's two-corpus limitation) is a STATIC READ, not yet an empirical run — QA-1 question
(b) converts it, and the plan sets the safe default meanwhile rather than acting on the inference.

✅ **The previous edition's fourth deduction — "the plan is not fully executable as it stands, Step
15 rule 5 is blocked on an owner ruling" — is CLOSED.** Ruling 1 resolves it, step 6a builds the API
it needs, and Spec 41 v0.4.7 rewrites FR-41-8 to describe the real mechanism.

---

## ADHD anchors

- **Rule 1 (full map + ranked menu):** the execution-shape diagram and the gate→step map make the
  whole phase visible before step 1; every judgement call was put as a ranked menu with a
  recommendation, never a forced choice, and each ruling keeps that menu beside the answer.
- **Rule 2 (smallest first action <5 min, zero dependencies):** Step 1 is re-running one Python
  snippet and one grep. Nothing depends on anything.
- **Rule 3 / 7 (motivation layer):** the USP at the top — this is the block on every page of every
  client site, and the 3-state shape built here is the shape every future stateful block copies.
- **Rule 4 (verification before completion):** every step proposes its verification command in its
  own prompt; no step reports done on a claim.
- **Rule 5 (scope check after 5+ file edits):** QA-3, QA-5 and QA-6 are exactly that, three times.
- **Rule 8 (scores ship with remediations):** every gate's `Fail:` names the step to return to.
- **Rule 9 (negotiated decisions):** all seven judgement calls went to Bean as ranked menus and all
  seven are now RULED (2026-09-11). Both positions are logged in each ruling, including the two where
  Bean's call overrode this plan's own recommendation (ruling 1: extend the shared helper, not a
  block-private override; ruling 6: fold the close-button work in rather than defer it).
- **Rule 13 (session sprawl):** `[SESSION-START]` at steps 1, 13, 15, 21 and `[HANDOFF]` at 25, 27.
  Realistically this is **four SESSIONS** — ⚠ and these are session boundaries, **not** the
  execution diagram's WAVE labels, which mean something different and narrower. Deliberately named
  by number so a reader cross-referencing "Wave C" between the two sections gets one answer, not two
  (S10): **Session 1** = steps 1–12 (Wave A, including 6a and 16a's sibling gates) · **Session 2** =
  steps 13–20 (Waves B + C, including 14a and 16a) · **Session 3** = steps 21–24 (deploy +
  verification) · **Session 4** = steps 25–27 (close). The diagram's own scopes are unchanged:
  WAVE A = 1–12, WAVE B = 13–17, WAVE C = 18–20, WAVE D = 21–27.
