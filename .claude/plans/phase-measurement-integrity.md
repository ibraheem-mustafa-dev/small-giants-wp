---
plan_id: measurement-integrity-2026-09-09
phase_name: Measurement Integrity
project: small-giants-wp
cost_estimate: ~2h wall-time across 13 steps + 4 QA gates
docscore_grade: pending
mode: ad-hoc (council-scoped, no parent strategic-plan)
---

# Phase — Measurement Integrity

**USP:** Every downstream decision about clone fidelity — including whether to build a CSS
dictionary at all — currently rests on a number that is provably wrong. This phase makes the
ruler trustworthy, which is the precondition for all remaining cloning work. It is also owed
work: the 59% is a regression introduced in `2baf3171e` during the 2026-09-08 session.

**Plan label:** `[PLAN: opus]` — one step (Step 7) is an architectural judgement with a live
regression risk; the rest are surgical but must not be executed without that context.

**Docscore:** pending (Stage 7)

**Aggregate estimate:** ~2 hours wall-time across 13 steps + 4 QA gates. Every step is a
surgical edit to ONE file with a proven cause and a fixture that tells you within seconds whether
it worked. Treat these as the expected figure, not a floor.

---

## Phase success criteria (done when)

- [ ] `node plugins/sgs-blocks/scripts/parity/computed-parity.js --self-test` exits 0 with the
      seven new fixtures passing — blocklist, tag-substitution, tier-duplication, SVG skip, longhand
      collapse, same-tag tie-break, over-exclusion — each proven to FAIL before its fix.
      (Step 0 first clears four pre-existing typography failures; without it no gate's exit code
      is readable.)
- [ ] A re-run against the unchanged draft + page 3448 drops unmatched elements from **46 to
      under 15**, and **every surviving entry is individually named with its mechanism**.
      ⛔ Do not use "≤ 5" as the gate. That figure came from an unsaved probe script that
      reimplemented the tool, and it was measured on a variant that drops the tag from the key
      outright — which is exactly the design KJC-1 rejects. A named-residue gate is falsifiable
      against artefacts that exist; 5 is not.
- [ ] **The regression is closed on its own terms:** the repaired tool, run against page **2742**
      (the target the pre-regression runs used), returns to ≈80–81% — or the residual gap is
      explained. This is the only apples-to-apples check; a 3448 number cannot demonstrate it,
      because 3448 is a virgin clone lacking 2742's manual fixes.
- [ ] The tool's property blocklist derives from `excluded_properties` (DB), not a hardcoded
      literal — R-31-1 and Spec 20 FR-20-2 both satisfied.
- [ ] The artefact emits per-property **PASS** counts, so a future session can audit the score
      from the artefact alone (today it records only mismatches — it cannot audit itself).
- [ ] `converter/services/fold_helpers.py::route_area_css_to_block_attrs` records every
      discarded declaration; **zero** silent drops remain.
- [ ] A published, defensible parity number for page 3448, with its denominator, replacing both
      the discredited 59% and the un-publishable 78%.

## Non-goals (explicitly out of scope — do not scope-creep into these)

- Building any CSS dictionary, decomposition table, or new DB column. The mechanism already
  exists, and **152 of the 209 reported drops (73%) are fabricated by three over-coarse
  `property_suffixes` rows** — proven: the draft contains exactly ONE gradient declaration while the
  report claims 100 gradient drops. The genuinely dictionary-addressable residue has NOT been
  reliably counted (Seat B gives 143/146/151/8 for overlapping quantities); re-derive it before any
  number is published. Revisit the decision only after re-measurement.
- Reconnecting or deleting `orchestrator/css_router.py`. Separate decision, needs its own gate.
- Changing converter emit behaviour to match the draft's DOM. Seat A: 0 of 41 unmatched elements
  justify it, and it would violate CLAUDE.md rule 1 (CONVERT, don't mirror).
- `sgs/testimonial`'s `<div>`→`<article>` root. Real but unrelated; belongs to a block-semantics
  task, not the ruler.

---

## Entry context (read before starting)

- `.claude/reports/2026-09-09-council-seat-a-domshape.md` — the 41-element classification and the
  mechanism partition. ⚠ The 418 is partitioned by FIVE mechanisms plus a sibling-index residue:
  90 (M1) + 139 (M2) + 146 (M3) + 9 (M4) + 6 (M5) + 28 (sibling-index) = 418. **M6's 54 props of
  double-count are an OVERLAY inside M3's 146, not a sixth addend — never add it to the others.**
  Its V0–V5 counterfactual table is unreproducible (no script was saved); treat it as indicative
  only, never as a target.
- `.claude/reports/2026-09-09-council-seat-c-measurement.md` — the five ruler defects, the
  corrected-band arithmetic, and the five specified fixtures.
- `.claude/reports/2026-09-09-council-seat-b-dictionary.md` — the `_area_excluded` silent-drop
  finding (its "only truly silent CSS drop" section).
- `.claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md` — FR-20-2 (blocklist bound to
  `property_suffixes`), FR-20-4 (the fix that must not be reverted), FR-20-6 (declared geometry
  exclusion — a spec limit, not a bug; do not silently reopen it).
- `pipeline-state/mamas-munches-3448-2026-09-08-232235/computed-parity.json` — the artefact under
  repair. Baseline: `overall_css_pct` 59, `unmatched_elements` 46, `meaningful_props_lost_to_unmatched` 418.

## References

- Commit `2baf3171e` (2026-09-08) — introduced the regression. Its purpose was to close a
  wrapper/child key collision; **that closure must survive this phase** (see KJC-1).
- **Pre-regression baseline, measured on page 2742:** 80% (`mamas-munches-homepage-2026-09-07-233003`)
  and 81% (`mamas-munches-homepage-2026-09-08-105524`), both with `unmatched: 4`, `lost: 3`.
- **The regression is proven, not inferred:** the current tool run against page **2742** — the same
  target as those 80–81% runs — scores **59%**. Identical inputs, ~21 points lost. The tool is the
  cause; the clone target is irrelevant to the drop.
- ⛔ **Never cross-compare a page-2742 figure with a page-3448 figure.** 2742 is the live homepage
  carrying the 2026-09-08 session's manual fixes; 3448 is a virgin clone with none of them. They are
  different populations, and a before/after spanning both proves nothing about either.
- `~/.claude/rules/measurement-vs-eye.md` — a measurement can be wrong in both directions.
- MEMORY `feedback_negative_control_or_the_test_is_vacuous` + `feedback_a_negative_control_has_its_own_vacuity_mode`.
- MEMORY `feedback_a_gates_scope_is_not_the_defects_scope` — read the emitted output, never close on a green gate.

## Tooling Index

| Type | Name | Used in |
|---|---|---|
| cli | `node … computed-parity.js --self-test` | Steps 2–11, all QA gates |
| cli | `node … computed-parity.js --draft … --clone …` | Steps 1, 12, QA-4 |
| cli | `python … sgs-db.py sql` | Step 10 |
| skill | `/qc-council` | QA-3 (Step 7 only — the risky change) |
| skill | `/verify-loop` | Step 13 |
| mcp | Playwright | Step 6 (confirming previously-unmeasured attributions appear) |
| git | explicit-pathspec commit | every step |

---

## Steps

### Step 0 — Clear the four pre-existing self-test failures

```
Model:       sonnet
Action:      `--self-test` ALREADY FAILS at HEAD with 4 failures, and every later gate in this
             phase depends on being able to read its result. Cause: `computed-parity.js::THEME_FLUID`
             hardcodes a font-size ladder that `theme/sgs-theme/theme.json` no longer matches — D1007
             (commits `ea877e35a` / `67253fb03`, 2026-09-08) moved the whole ladder to `fluid:false`
             and renamed presets. `::verifyThemeFluidFreshness` therefore reports drift on every
             preset plus an unrecognised `regular`=16px, and fails closed; self-test Test 1 asserts
             fluid-equivalence IS granted, which can no longer happen.
             Either re-sync THEME_FLUID to the current theme.json ladder, or quarantine the 4
             typography assertions with an explicit skip naming D1007. Do NOT silently delete them.
             ⛔ This is NOT the cause of the 59% — `fluid_equivalent_total` is 0 in all three runs
             (both 80/81% baselines and the 59% run), so no equivalence grants were lost. It is a
             gate defect, not a score defect. Do not chase it as part of the regression.
Files:       plugins/sgs-blocks/scripts/parity/computed-parity.js (::THEME_FLUID, ::verifyThemeFluidFreshness, ::selfTest)
Inputs:      theme/sgs-theme/theme.json (settings.typography.fontSizes); decisions.md D1007
Outcome:     `--self-test` exits 0 at HEAD, so a later gate's exit code means something.
Exec:        SEQUENTIAL
Deps:        none
Marker:      SESSION-START
Time:        10 min
Tooling:     node --self-test
On-Fail:     If re-syncing changes any scored result, STOP — this step must be gate-only.
Cold-Entry:  This plan; theme/sgs-theme/theme.json; decisions.md D1007
Prompt:      `node plugins/sgs-blocks/scripts/parity/computed-parity.js --self-test` fails with 4
             pre-existing failures at HEAD. Cause: ::THEME_FLUID hardcodes a font-size ladder that
             theme.json no longer matches after D1007 moved every preset to fluid:false.
             Re-sync THEME_FLUID to the live theme.json ladder if that restores the assertions'
             meaning; otherwise quarantine those 4 assertions with a skip that names D1007 as the
             reason. Never silently delete an assertion. Confirm --self-test then exits 0, and
             confirm no SCORED output changed (this is a gate fix, not a scoring fix): re-run
             against page 2742 and show overall_css_pct is still 59. Commit with an explicit pathspec.
Test:
  Happy:       --self-test exits 0 at HEAD.
  Edge:        A future theme.json change re-trips the freshness gate loudly rather than silently.
  Fail:        Scored output moves → revert; this step must not touch scoring.
  Integration: Page-2742 re-run still reports 59% (proving Step 0 changed nothing but the gate).
```

### Step 1 — Capture the pre-fix baseline artefact

```
Model:       haiku
Action:      Re-run the parity tool at current HEAD against the SAME inputs as the 2026-09-08
             run (draft sites/mamas-munches/mockups/homepage/index.html, clone page 3448) and
             save the artefact to reports/parity-baseline/2026-09-09-pre-fix.json. Do NOT fix
             anything. Record: overall_css_pct, unmatched_elements length,
             meaningful_props_lost_to_unmatched, and the per-viewport css.match / css.meaningful_props.
Files:       reports/parity-baseline/2026-09-09-pre-fix.json (new)
Inputs:      pipeline-state/mamas-munches-3448-2026-09-08-232235/computed-parity.json (for comparison)
Outcome:     A committed pre-fix artefact whose numbers reproduce the 2026-09-08 run (59 / 46 / 418),
             proving the run is deterministic and giving every later step a fixed reference.
Exec:        SEQUENTIAL
Deps:        none
Marker:      SESSION-START
Time:        5 min
Tooling:     node, git
On-Fail:     If the numbers do NOT reproduce (59/46/418), STOP and report — non-determinism is a
             separate defect that invalidates the whole phase's before/after method.
Cold-Entry:  This plan; .claude/reports/2026-09-09-council-seat-c-measurement.md
Prompt:      Run: node plugins/sgs-blocks/scripts/parity/computed-parity.js --draft
             sites/mamas-munches/mockups/homepage/index.html --clone
             https://sandybrown-nightingale-600381.hostingersite.com/fresh-clone-verification-mamas-munches-homepage-re-clone/
             --out reports/parity-baseline/2026-09-09-pre-fix.json
             Then print overall_css_pct, viewports["1440"].css.unmatched_elements.length, and
             viewports["1440"].css.meaningful_props_lost_to_unmatched. Report all three verbatim.
             Do not edit any source file. Commit ONLY the new artefact with an explicit pathspec.
Test:
  Happy:       Tool exits 0; artefact written; overall_css_pct == 59.
  Edge:        Canary unreachable → tool errors rather than emitting a partial artefact.
  Fail:        Numbers differ from 59/46/418 → STOP, escalate (non-determinism).
  Integration: Artefact is byte-comparable with the pipeline-state original.
```

### Step 2a — Make the tier-scoring loop testable

```
Model:       sonnet
Action:      Fixtures 2, 3 and 6 cannot be written against the current structure. `::selfTest` calls
             `capture()` then `comparePair()` DIRECTLY — it never reaches the pairing machinery,
             because `runTier` and `bestPairing` are closures declared INLINE inside `main()`, along
             with the `T`/`M` accumulators and the unmatched-charging path. Fixture 2 needs the
             pairing path, fixture 3 needs the `meaningful_props` totals, fixture 6 needs to report
             WHICH draft record paired with WHICH clone record.
             Extract the tier-scoring loop (`runTier` + `bestPairing`) out of `main()` into a
             callable function returning `{ T, M, unmatched, pairings }`. Behaviour change: NONE.
Files:       plugins/sgs-blocks/scripts/parity/computed-parity.js (main(), ::runTier, ::bestPairing)
Inputs:      Step 1's baseline artefact
Outcome:     The scoring loop is callable from a test, and a live re-run produces numbers
             BYTE-IDENTICAL to reports/parity-baseline/2026-09-09-pre-fix.json.
Exec:        SEQUENTIAL
Deps:        Steps 0, 1
Marker:      (none)
Time:        15 min
Tooling:     node --self-test; node against page 3448
On-Fail:     git revert. A pure extraction that moves any number is not a pure extraction.
Prompt:      In computed-parity.js, `runTier` and `bestPairing` are closures inside `main()`, so
             selfTest cannot reach the pairing path, the T/M accumulators, or the unmatched-charging
             path. Extract the tier-scoring loop into a callable function returning
             { T, M, unmatched, pairings }, with ZERO behaviour change. Prove it: re-run against
             page 3448 and show the output numbers are byte-identical to
             reports/parity-baseline/2026-09-09-pre-fix.json. If ANY number moves, you have changed
             behaviour — revert and retry. Commit with an explicit pathspec.
Test:
  Happy:       Re-run numbers byte-identical to the Step 1 baseline.
  Edge:        The box tier (called with exact=true) still behaves identically.
  Fail:        Any scored number moves → revert.
  Integration: --self-test still exits 0 (Step 0's precondition holds).
```

### Step 2 — Write the seven negative-control fixtures (six MUST fail)

```
Model:       sonnet
Action:      Extend computed-parity.js::selfTest with SEVEN fixtures, each asserting the CORRECT
             behaviour for one defect:
             (1) a property in excluded_properties is not scored;
             (2) a draft <button>text</button> paired with a clone <label>text</label> matches;
             (3) an element with children + short direct text is counted ONCE, not twice —
                 MUST assert the EXACT reduction (a container with N unique properties reduces
                 meaningful_props by exactly N), never merely "fewer than before", or a
                 half-applied de-duplication passes;
             (4) an inline <svg><path> is skipped regardless of tagName case;
             (5) a single authored `border: 1px solid red` diff counts as ONE, not eight;
             (6) THE TIE-BREAK CONTROL — two elements with identical text and DIFFERENT tags, in
                 the SAME map, must pair to their same-tag counterparts. MUST assert WHICH draft
                 element paired with WHICH clone element, never merely that both survived, and MUST
                 be verified to FAIL when the same-tag tie-break is removed.
                 ⛔ Do NOT write this as "a wrapper and its only child with identical text stay
                 distinguishable" — that tests `norm()`'s 300-char cap, which Step 7 never touches,
                 so it would pass before and after regardless and control nothing;
             (7) THE OVER-EXCLUSION CONTROL — `background-size`
                 diverging on a <div> MUST still score, while the same property on an <img> must
                 not. Without this, Step 9 can ship a global background-* exclusion and every
                 other fixture still passes.
             Fixtures 1-5 and 7 MUST FAIL today. Fixture 6 MUST PASS today.
Files:       plugins/sgs-blocks/scripts/parity/computed-parity.js (::selfTest only)
Inputs:      .claude/reports/2026-09-09-council-seat-c-measurement.md (fixture specifications)
Outcome:     --self-test reports exactly 5 failures (1-5) and fixture 6 passing. The 5 failures
             ARE the positive control: they prove each fixture detects its defect.
Exec:        SEQUENTIAL
Deps:        Steps 0, 1, 2a
Marker:      (none)
Time:        12 min
Tooling:     node --self-test
On-Fail:     If a fixture PASSES before its fix, the fixture is vacuous — rewrite it until it
             fails for the right reason. Do not proceed with a vacuous fixture.
Prompt:      Read .claude/reports/2026-09-09-council-seat-c-measurement.md's fixture section and
             computed-parity.js::selfTest. Add the six fixtures above to selfTest, following the
             existing fixture style (real fixtures through the real pipeline — do not stub
             internals). Run --self-test and paste the FULL output. State explicitly, per fixture,
             whether it passed or failed and WHY. Do not fix any defect in this step — the failures
             are the deliverable. Commit with an explicit pathspec naming only computed-parity.js.
Test:
  Happy:       --self-test exits non-zero; fixtures 1-5 fail; fixture 6 passes.
  Edge:        A fixture that passes today → rewrite (vacuity).
  Fail:        Fixture 6 fails today → the collision guard is ALREADY broken; STOP and report.
  Integration: Existing fluid font-size assertions still pass unchanged.
```

> **QA Gate 1 — the fixtures are real controls**
> ```
> Model:  haiku
> Exec:   SEQUENTIAL
> Deps:   Steps 0, 2a, 2
> Check:  PowerShell (see Execution notes — do NOT use Git Bash for node on this project):
>         node plugins/sgs-blocks/scripts/parity/computed-parity.js --self-test
>         Write-Host "exit=$LASTEXITCODE"
> Pass:   exit != 0, with exactly 6 named failures (fixtures 1-5 and 7) and fixture 6 reported passing.
> Fail:   Any of 1-5 or 7 passing → that fixture is vacuous, return to Step 2. Fixture 6 failing → STOP
>         (the collision guard is already broken, which changes the whole phase).
> Marker: QA
> ```

### Step 3 — Fix the dead SVG skip (M5/D-3)

```
Model:       haiku
Action:      computed-parity.js::SKIP_TAGS is keyed uppercase (SVG, PATH) but is tested against
             raw el.tagName, which is LOWERCASE for inline SVG elements — so the skip has never
             fired. Normalise the lookup (uppercase the tagName at the test site, or key the map
             by namespace). Prefer namespace detection (el.namespaceURI) so child SVG tags
             (circle, polygon, rect) are covered too, not just the two listed.
Files:       plugins/sgs-blocks/scripts/parity/computed-parity.js (::SKIP_TAGS and its call site inside ::CAPTURE_SRC)
Inputs:      Step 2 fixture 4
Outcome:     Fixture 4 flips to PASS; no SVG-internal property (stroke-linecap, stroke-linejoin,
             d, stroke) appears in a fresh run's mismatch list.
Exec:        PARALLEL with Step 4
Deps:        Step 2
Marker:      (none)
Time:        5 min
Tooling:     node --self-test
On-Fail:     git revert the single commit; fixture 4 returns to failing.
Prompt:      In computed-parity.js, SKIP_TAGS is keyed uppercase but tested against raw
             el.tagName which is lowercase for inline SVG. Fix so inline SVG and its children are
             skipped. Prefer el.namespaceURI === 'http://www.w3.org/2000/svg' over an expanded tag
             list — justify your choice in a code comment. Run --self-test: fixture 4 must flip to
             PASS and fixtures 1,2,3,5 must STILL FAIL (you are fixing one defect only). Paste the
             full output. Commit with an explicit pathspec.
Test:
  Happy:       Fixture 4 passes; fixtures 1,2,3,5 still fail.
  Edge:        An <svg> nested inside a matched element does not remove its parent from scoring.
  Fail:        A non-SVG element named e.g. <path> in HTML namespace is NOT skipped.
  Integration: Fixture 6 (collision control) still passes.
```

### Step 4 — Fix the double-scoring (M6/D-1)

```
Model:       sonnet
Action:      Inside computed-parity.js::CAPTURE_SRC's element-collection loop, an element with
             children and short direct text is pushed into BOTH textElsRaw and boxElsRaw (branch 1
             fires via its else, branch 2 via an independent if), and ::collapseRaw feeds both into
             the same tier totals — so it is scored twice. Make the two collections mutually
             exclusive, or de-duplicate by element identity before scoring. Preserve the intent:
             an element may legitimately contribute BOTH a text anchor and a box anchor; what must
             not happen is its properties counting twice toward meaningful_props/match.
Files:       plugins/sgs-blocks/scripts/parity/computed-parity.js (::CAPTURE_SRC collection loop, ::collapseRaw)
Inputs:      Step 2 fixture 3; Seat A "M6 — 54 props of pure double-count"
Outcome:     Fixture 3 passes; a re-run's total meaningful_props falls by ~54 at 1440 with no
             change to the match RATIO for correctly-scored elements.
Exec:        PARALLEL with Step 3
Deps:        Step 2
Marker:      (none)
Time:        10 min
Tooling:     node --self-test
On-Fail:     git revert; re-approach by de-duplicating at scoring time rather than collection time.
Prompt:      Read computed-parity.js::CAPTURE_SRC's collection loop and ::collapseRaw. An element
             with children and short direct text enters BOTH textElsRaw and boxElsRaw and is scored
             twice (Seat A M6: 54 props). Fix the double-count WITHOUT losing an element that
             legitimately needs both a text and a box anchor — de-duplicate at scoring, or make the
             branches exclusive, whichever you can defend; state which and why in a comment. Run
             --self-test: fixture 3 must flip to PASS, fixtures 1,2,5 must still FAIL, fixture 6
             must still PASS. Paste full output. Commit with an explicit pathspec.
Test:
  Happy:       Fixture 3 passes; 1,2,5 still fail.
  Edge:        An element needing both anchors still matches on both, scored once.
  Fail:        Over-correction drops an element from scoring entirely → meaningful_props falls far more than ~54.
  Integration: Fixture 6 still passes.
```

### Step 5 — Fix `norm()` strip-before-trim (M3)

```
Model:       sonnet
Action:      computed-parity.js::norm (and its sibling ::normFull) apply .trim() BEFORE stripping
             the non-alphanumeric character class, so text beginning with a stripped character —
             the draft's literal "★★★★★" — leaves a phantom leading space and never matches the
             clone's SVG-star equivalent. Reorder: strip the class first, then collapse whitespace,
             then trim. Apply the same ordering to BOTH functions so keys stay consistent.
Files:       plugins/sgs-blocks/scripts/parity/computed-parity.js (::norm, ::normFull)
Inputs:      Seat A "M3 — 146 props"
Outcome:     The testimonial cluster pairs; a re-run's unmatched count falls materially (Seat A
             counterfactual V2 measured 46 → 43 for this change alone; the mechanisms compound,
             so judge by the fixture, not this number).
Exec:        SEQUENTIAL
Deps:        Steps 3, 4
Marker:      (none)
Time:        5 min
Tooling:     node --self-test
On-Fail:     git revert. Note both functions must change together — changing one silently
             desynchronises the two key namespaces.
Prompt:      computed-parity.js::norm and ::normFull trim before stripping their character class,
             so text starting with a stripped char (e.g. "★★★★★") retains a phantom leading space
             and never matches. Reorder to strip → collapse whitespace → trim, in BOTH functions
             (they must stay consistent or the two key namespaces desynchronise). Run --self-test
             and confirm no previously-passing fixture regressed. Paste full output. Commit with an
             explicit pathspec.
Test:
  Happy:       A draft "★★★★★ Excellent" key equals the clone's "Excellent" key form.
  Edge:        Text that is ENTIRELY stripped characters yields empty → falls to structural anchor, not a crash.
  Fail:        Over-stripping merges two genuinely different texts → fixture 6 catches it.
  Integration: Fixtures 3, 4, 6 still pass.
```

> **QA Gate 2 — three defects closed, nothing regressed**
> ```
> Model:  haiku
> Exec:   SEQUENTIAL
> Deps:   Steps 3, 4, 5
> Check:  PowerShell (see Execution notes — do NOT use Git Bash for node on this project):
>         node plugins/sgs-blocks/scripts/parity/computed-parity.js --self-test
>         Write-Host "exit=$LASTEXITCODE"
> Pass:   Fixtures 3, 4 and 6 PASS. Fixtures 1, 2, 5 still FAIL (not yet fixed — this is correct).
> Fail:   Fixture 6 failing → the collision guard regressed; git revert the offending step immediately.
> Marker: QA
> ```

### Step 6 — Fix the `inChrome()` blind spot (M4)

```
Model:       sonnet
Action:      INVESTIGATE FIRST, fix second.
             `::inChrome`'s helper `::isPageLevelChromeTag` already walks up to BODY and returns
             "not chrome" on meeting a SECTION / ARTICLE / MAIN ancestor — so a <footer> inside an
             <article> is already exempt. The defect is narrower than "any FOOTER ancestor": the
             bail-out only fires for those three content-sectioning tags, so it misses when the
             wrapping block root is a bare <div>, which is sgs/testimonial's current markup. The
             consequence is a blind spot, not a miscount — those attributions are removed from the
             clone capture and never measured at all.
             Confirm on the live page which element actually wraps the attribution before writing
             anything. Two legitimate outcomes: (a) the bail-out should recognise content context
             rather than tag identity — fix it here; or (b) the correct fix is the block's own
             <div>→<article> root, which is a stated Non-goal — in which case STOP and re-scope.
             ⛔ Do not patch the ruler to compensate for a block-markup inconsistency.
Files:       plugins/sgs-blocks/scripts/parity/computed-parity.js (::inChrome)
Inputs:      Seat A "M4 — 9 props + a silent blind spot"
Outcome:     Either the attributions appear in the capture for the first time, OR a written finding
             that the correct fix is the block's markup and this step is closed as not-a-ruler-bug.
             NOTE: a genuine fix here makes the score go DOWN by admitting never-before-measured
             elements. That is CORRECT — but "it went down" is NOT a pass condition on its own
             BEFORE changing code, predict the expected unmatched-count
             movement for THIS fix alone and record it. A move materially larger than predicted
             means the chrome test has been loosened too far and the site footer is re-entering
             scoring — investigate rather than accept.
Exec:        SEQUENTIAL
Deps:        Step 5
Marker:      (none)
Time:        10 min (investigate-first; may close without a code change)
Tooling:     node --self-test; Playwright (confirm the attributions exist live on page 3448)
On-Fail:     git revert. If site-chrome bleeds INTO scoring instead, tighten to an explicit
             "outside <main>" test rather than reverting the content-footer fix.
Prompt:      INVESTIGATE BEFORE YOU EDIT. Read computed-parity.js::inChrome AND its helper
             ::isPageLevelChromeTag. Note that isPageLevelChromeTag ALREADY returns "not chrome" on
             meeting a SECTION/ARTICLE/MAIN ancestor, so a <footer> inside an <article> is already
             exempt — the plan's earlier description of this defect was wrong. Then open
             https://sandybrown-nightingale-600381.hostingersite.com/fresh-clone-verification-mamas-munches-homepage-re-clone/
             in Playwright and report the ACTUAL ancestor chain of the testimonial attribution and
             the sgs/quote citation: what element wraps them, and what tag is it?
             THEN decide and report BEFORE editing: is this (a) a ruler bug — the bail-out should
             recognise content context beyond those three tags; or (b) a block-markup bug — the
             wrapper should be <article> and the ruler is behaving correctly? If (b), STOP and report;
             do NOT patch the ruler to compensate for block markup.
             If you proceed with (a): first state your PREDICTED unmatched-count movement for this
             fix alone, then measure it. Confirm the SITE footer is still excluded. If the movement
             is materially larger than predicted, you have loosened the chrome test too far —
             investigate, do not accept. Commit with an explicit pathspec.
Test:
  Happy:       Testimonial/quote attributions present in capture; site footer absent.
  Edge:        A page with no <main> still excludes its site footer.
  Fail:        Site footer enters scoring → tighten the test, do not revert.
  Integration: Fixtures 3, 4, 6 still pass.
```

### Step 7 — Tag-tolerant matching (M2/D-2) — THE RISKY ONE

```
Model:       inline
Action:      computed-parity.js::structuralAnchor embeds el.tagName in the key, and the text-key
             path does likewise, so a legitimate tag substitution (draft <button> → clone <label>,
             <article> → <div>, <p> → <blockquote>) makes the element unmatchable and
             ::meaningfulCountUnmatched then charges EVERY property as lost — 139 props. This
             contradicts the tool's own docstring, which states tag divergence is expected Rule-1
             behaviour, reported separately, and "must not dilute CSS".
             ⛔ DO NOT simply delete the tag from the key — that re-opens the wrapper/child
             collision `2baf3171e` was written to close, trading one defect for its predecessor.
             Demote tag to a TIE-BREAK instead. Three parts:
             (1) STRIP the tag from THREE separate key-construction sites, not one — ::structuralAnchor,
                 the text-key (`anchorEl.tagName + '|' + dkey`), and the box-anchor
                 (`el.tagName + '|' + anchorText`);
             (2) WRITE a same-tag-wins tie-break inside ::bestPairing FROM SCRATCH — it currently has
                 zero tag-awareness and purely minimises diff count. The candidate-array plumbing does
                 already exist (`textElsRaw[key] = textElsRaw[key] || []`) and will naturally bucket
                 same-text-different-tag candidates together once the tag is gone from the key;
             (3) VERIFY the box tier's exact-match semantics did not silently loosen — `runTier` is
                 called with `exact=true` for boxEls, and removing tag from the box key changes what
                 "exact" now admits. This is un-discussed risk and must be asserted, not assumed.
Files:       plugins/sgs-blocks/scripts/parity/computed-parity.js (::structuralAnchor, ::findByAnchor, ::bestPairing, ::CAPTURE_SRC key construction)
Inputs:      Step 2 fixtures 2 and 6; Seat A counterfactual (V1 tag-agnostic: 46 → 10 unmatched)
Outcome:     Fixture 2 (button→label) passes AND fixture 6 (wrapper/child collision) still passes.
             Both together, or the change is not done.
Exec:        SEQUENTIAL
Deps:        Step 6
Marker:      SESSION-START
Time:        20 min — the largest step in the phase, but it is still three small edits plus a
             tie-break function in one file, with the fixtures already written to tell you
             immediately whether it worked.
Tooling:     node --self-test; /qc-council at QA Gate 3
On-Fail:     git revert immediately (project STOP #19 — roll back fast on regression; do not
             iterate a failing sensitive fix inline under context pressure). Re-approach across a
             session boundary with the measured evidence in hand.
Cold-Entry:  This plan; .claude/reports/2026-09-09-council-seat-a-domshape.md (M2 + counterfactual);
             commit 2baf3171e's message and diff (what the collision fix was FOR)
Prompt:      (inline — do not dispatch. This step needs the session's own judgement and an
             immediate rollback decision if fixture 6 breaks.)
Test:
  Happy:       Draft <button>8pack</button> pairs with clone <label>…8pack…</label>; fixture 2 passes.
  Edge:        Two candidates with identical text, different tags — same-tag pairing wins the tie-break.
  Fail:        A wrapper and its only child with identical text collapse into one → fixture 6 FAILS → revert.
  Integration: Unmatched count on a live re-run falls toward Seat A's measured V1 (~10) and no
               previously-passing fixture regresses.
```

> **QA Gate 3 — the risky change, multi-rater**
> ```
> Model:  inline (+ /qc-council)
> Exec:   SEQUENTIAL
> Deps:   Step 7
> Check:  PowerShell (see Execution notes — do NOT use Git Bash for node on this project):
>         node plugins/sgs-blocks/scripts/parity/computed-parity.js --self-test
>         Write-Host "exit=$LASTEXITCODE"
>         AND run /qc-council on the Step 7 diff (per blub.db 255: multi-model review on any
>         converter/pipeline/measurement change of this blast radius).
> Pass:   Fixtures 2, 3, 4, 6 all PASS. Council returns no unaddressed CONFIRMED finding.
> Fail:   Fixture 6 fails, OR council raises a confirmed collision risk → git revert Step 7 and
>         re-plan across a session boundary. Do NOT patch forward under pressure.
> Marker: QA
> ```

### Step 8 — Fix the struct-anchor mid-string invalidation (M1)

```
Model:       sonnet
Action:      computed-parity.js::structuralAnchor keys on ::nearestQualifyingAncestorAnchor's
             normalised ancestor innerText. When the clone injects accessible text mid-string —
             sgs/option-picker emits <legend class="sgs-sr-only">Pack size</legend> — every
             descendant key changes, and ::findByAnchor's fuzzy fallback is a substring test that
             cannot survive a MID-string divergence (only a prefix/suffix one). 90 props.
             Make the ancestor anchor resilient: prefer a token-set / longest-common-subsequence
             similarity over raw substring, or exclude aria-hidden and visually-hidden text from
             the anchor. Excluding sr-only text is the narrower, safer change — but verify it does
             not delete text that is genuinely visible.
Files:       plugins/sgs-blocks/scripts/parity/computed-parity.js (::structuralAnchor, ::nearestQualifyingAncestorAnchor, ::findByAnchor)
Inputs:      Seat A "M1 — 90 props"; Seat A's correction that the option-picker key is SPAN|8pack
             (the inline-wrapper hoist stops because <label> has two children) — so a hoist-only
             patch will NOT close this.
Outcome:     The option-picker pill cluster pairs; unmatched count falls toward Seat A's V5 (~5).
Exec:        SEQUENTIAL
Deps:        Step 7
Marker:      (none)
Time:        10 min
Tooling:     node --self-test
On-Fail:     git revert. Note Seat A's correction — do not attempt to solve this by extending the
             inline-wrapper hoist; it provably stops at the two-child <label>.
Prompt:      computed-parity.js::structuralAnchor anchors on ancestor innerText, so clone-injected
             screen-reader text (sgs/option-picker's <legend class="sgs-sr-only">Pack size</legend>)
             invalidates every descendant key; ::findByAnchor's substring fallback cannot survive a
             MID-string divergence. Seat A proved a hoist-only patch will not close this (the key is
             SPAN|8pack; the hoist stops at the two-child <label>). Fix by making the ancestor anchor
             resilient — prefer excluding visually-hidden/aria-hidden text from the anchor if you can
             show it never removes genuinely visible text; otherwise a similarity match. State which
             you chose and why. Run --self-test; no previously-passing fixture may regress. Paste full
             output. Commit with an explicit pathspec.
Test:
  Happy:       Draft pill "8pack" pairs with the clone pill despite the injected legend.
  Edge:        A clone that injects sr-only text as a PREFIX still pairs (the old substring path).
  Fail:        Excluding hidden text removes visible text → a visible-text fixture catches it.
  Integration: Fixtures 2, 3, 4, 6 still pass.
```

### Step 9 — Collapse longhands + per-element applicability (D-4, D-5)

```
Model:       sonnet
Action:      Three separate mechanisms. Execute and COMMIT them separately.

             ⛔ There is NO existing longhand-collapse mechanism to extend. The only colour-family
             logic in the file sits inside the ::BLOCK Set, where the colour longhands are
             BLOCKLISTED (never scored) — structurally a different thing from a COLLAPSE (scored,
             counted once). Do not go looking for one. Border width/style longhands are confirmed
             ABSENT from ::BLOCK, so one authored `border: 1px solid red` genuinely produces 8
             scored diffs today.

             (9a) LONGHAND COLLAPSE — ⛔ do NOT hand-write a family map.
                  The shorthand→longhand relationship is ALREADY DATA in `sgs-framework.db`:
                  `property_suffixes` carries both the shorthand row and its longhands side by side
                  (`BorderWidth`→`border-width` alongside `BorderTopWidth`→`border-top-width`,
                  `BorderRadius` alongside `BorderTopLeftRadius`, `MarginTop`/`MarginLeft`, …), and
                  `modifier_suffixes` holds the generating vocabulary explicitly (`kind='side'`:
                  Top/Right/Bottom/Left; `kind='corner'`: TL/TR/BL/BR).
                  DERIVE the families from those two tables — a longhand belongs to the family whose
                  shorthand row remains after stripping a known side/corner token. A hardcoded family
                  map in the tool would violate R-31-1 and create a SECOND list to drift against the
                  DB, which is the exact defect Step 10 exists to remove from this same file.
                  Document any property that cannot be derived this way rather than special-casing it
                  silently — an underivable case is a DB gap to report, not a literal to add.
             (9b) PER-ELEMENT APPLICABILITY — background-size/-position/-repeat and border-image-slice
                  are inert on a replaced <img> but load-bearing on a <div>. Exclude PER ELEMENT TYPE,
                  never via the global blocklist. Fixture 7 is the control that proves you did not
                  overshoot; it must go green WITHOUT fixture 1's DB-driven exclusions regressing.
             (9c) PER-PROPERTY PASS COUNTS — thread a pass-count accumulator through the comparison
                  and report assembly so the artefact records passes as well as mismatches. Today the
                  artefact cannot audit its own score, which is why the corrected band could not be
                  computed from it.
Files:       plugins/sgs-blocks/scripts/parity/computed-parity.js (::subVisibleBucket, ::BLOCK region, artefact assembly)
Inputs:      Step 2 fixtures 1 and 5; clone-fidelity item 3.22 (the img-background class, already
             closed as noise on live evidence)
Outcome:     Fixture 5 passes (9a), fixture 7 passes (9b), and the artefact contains per-property
             pass counts that sum with the mismatch counts to meaningful_props (9c).
Exec:        SEQUENTIAL
Deps:        Step 8
Marker:      (none)
Time:        25 min total — 9a 10 / 9b 7 / 9c 8. Three commits, not one.
Tooling:     node --self-test
On-Fail:     git revert. Do NOT settle for a global blocklist entry for background-* — that is the
             failure mode this step exists to avoid.
Prompt:      THREE separate changes, THREE separate commits. Do not bundle them.
             READ FIRST: the ::BLOCK Set blocklists the colour longhands — that is NOT a collapse
             mechanism and there is nothing to "generalise". You are building grouping from scratch.
             (9a) Make one authored declaration count once, not once per longhand (border is 8x
             today). DERIVE the families from the DB — do not hand-write a map. Query:
               python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT suffix, role, css_property FROM property_suffixes"
               python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT suffix, kind FROM modifier_suffixes WHERE kind IN ('side','corner')"
             property_suffixes holds shorthand and longhand rows together (BorderWidth alongside
             BorderTopWidth/BorderLeftWidth; BorderRadius alongside BorderTopLeftRadius; MarginTop…),
             and modifier_suffixes holds the side/corner vocabulary that generates the expansion. A
             longhand joins the family whose shorthand row remains once a known side/corner token is
             stripped. A hardcoded family literal violates R-31-1 and would drift against the DB —
             the same defect Step 10 removes from this file. Report any underivable property as a DB
             gap; do not special-case it. Fixture 5 must flip to PASS.
             (9b) Make background-size/-position/-repeat and border-image-slice non-scoring ONLY on
             replaced elements (img/video/iframe) — per element type, NEVER a global blocklist entry,
             because they are load-bearing on a <div>. Fixture 7 is your control: it asserts
             background-size still scores on a <div> while not scoring on an <img>. If you find
             yourself adding these to ::BLOCK, you have done it wrong.
             (9c) Thread a per-property PASS-count accumulator through the comparison and report
             assembly, so passes as well as mismatches land in the artefact and the score becomes
             auditable from the artefact alone.
             After each: run --self-test, paste full output, confirm no previously-passing fixture
             regressed, and commit with an explicit pathspec naming only computed-parity.js.
Test:
  Happy:       One authored border divergence = 1 diff; background-size on a <div> still scores.
  Edge:        A shorthand diverging in only ONE longhand still reports (not swallowed by collapse).
  Fail:        background-size silently stops scoring on <div> → a <div> fixture catches it.
  Integration: Artefact's pass+fail counts per property sum to meaningful_props.
```

### Step 10 — Bind the blocklist to the DB (R-31-1 / FR-20-2)

```
Model:       sonnet
Action:      computed-parity.js::BLOCK is a hardcoded literal Set; nothing reads the
             excluded_properties DB table. Measured drift: 5 of the DB's 10 rows are absent from the
             tool (overflow-x, overflow-y, flex-grow, flex-shrink, flex-basis), and ~60 tool
             exclusions have no DB record. Spec 20 FR-20-2 already BINDS the blocklist to the DB, so
             this is a conformance repair, not a new design. Read excluded_properties at run time;
             keep any tool-only exclusion ONLY if it is first added to the DB with a reason and a
             decider (that table's schema requires both).
Files:       plugins/sgs-blocks/scripts/parity/computed-parity.js (::BLOCK and its CAPTURE_SRC serialisation)
Inputs:      python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT * FROM excluded_properties"
Outcome:     One source of truth. Fixture 1 passes. Adding a DB exclusion changes tool behaviour with
             no code edit.
Exec:        SEQUENTIAL
Deps:        Step 9
Marker:      (none)
Time:        10 min
Tooling:     node --self-test; sgs-db.py
On-Fail:     git revert. If the DB is unreachable, the tool must FAIL LOUD, never silently fall back
             to an empty or hardcoded set (a silent fallback would make the gate vacuous).
Prompt:      computed-parity.js::BLOCK is hardcoded while Spec 20 FR-20-2 binds the blocklist to the
             DB's excluded_properties table (query it read-only via
             python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT * FROM excluded_properties").
             Make the DB the source of truth. Five DB rows are missing from the tool
             (overflow-x/y, flex-grow/shrink/basis) and ~60 tool entries have no DB row — for each
             tool-only entry, either add a DB row WITH a reason and decider, or drop it; list your
             decision per entry. On DB-unreachable the tool must fail loudly, never fall back
             silently. Run --self-test; fixture 1 must flip to PASS. Paste full output. Commit with
             an explicit pathspec. Do NOT hand-edit DB rows for anything other than
             excluded_properties.
Test:
  Happy:       Fixture 1 passes; the 5 missing DB rows now suppress scoring.
  Edge:        A DB row added at run time changes behaviour with no code change.
  Fail:        DB unreachable → tool exits non-zero with a clear message (never a silent empty set).
  Integration: FR-20-6's declared geometry exclusion is preserved, not silently reopened.
```

> **QA Gate 4 — the whole tool, end to end**
> ```
> Model:  sonnet
> Exec:   SEQUENTIAL
> Deps:   Steps 3-10
> Check:  PowerShell:
>         node plugins/sgs-blocks/scripts/parity/computed-parity.js --self-test
>         Write-Host "selftest=$LASTEXITCODE"
>         then re-run against draft + page 3448 and diff against reports/parity-baseline/2026-09-09-pre-fix.json
> Pass:   --self-test exits 0 with all SEVEN fixtures passing; live re-run drops unmatched_elements
>         from 46 to under 15, AND every surviving entry is named with the mechanism explaining it.
> Fail:   Any surviving entry that cannot be attributed to a named mechanism → that is an unclosed
>         defect; return to the step that owns it. Do not adjust the target to fit the result, and do
>         not substitute "<= 5" — that came from an unsaved probe of a design this plan rejects.
> Marker: QA
> ```

### Step 11 — Split the reported score (CONTENT / STRUCTURE / LAYOUT / PAINT+TYPE)

```
Model:       inline
Action:      Replace the single aggregate CSS percentage with four reported numbers, each carrying
             its DENOMINATOR: CONTENT, STRUCTURE (new — absorbs unmatched + tag substitutions, so a
             tag substitution reads as ONE structural finding rather than every property on that
             element being charged as a CSS miss), LAYOUT, and PAINT+TYPE.
             ⛔ Do not quote the figure 198 here: it double-counts the three testimonial articles by
             54 props and stops being true the moment Step 4 lands. The stable figure for
             tag-substitution cost is 139. No headline aggregate — a single number is what let a structural
             matcher defect masquerade as a CSS-transfer failure for a full session.
Files:       plugins/sgs-blocks/scripts/parity/computed-parity.js (artefact assembly + console summary)
Inputs:      Seat C's recommended model; Seat A's Q4 answer (parity = the draft's painted result
             reproduced on whatever element the clone chose, identity from content and paint, never
             tag/class/position)
Outcome:     The artefact and console report four labelled numbers with denominators. A structural
             divergence can never again be reported as a CSS deficit.
Exec:        SEQUENTIAL
Deps:        QA Gate 4
Marker:      (none)
Time:        12 min
Tooling:     node
On-Fail:     git revert. Keep the four-number model even if the exact bucket boundaries need
             another pass — the aggregate is the defect.
Prompt:      (inline — this is a reporting-model design decision, not a mechanical edit.)
Test:
  Happy:       Four numbers emitted, each with numerator and denominator.
  Edge:        A property fitting two buckets is counted in exactly one (documented rule).
  Fail:        Buckets do not sum to the measured population → arithmetic error surfaced in the artefact.
  Integration: Downstream readers (Stage 11.6 orchestrator) still parse the artefact.
```

### Step 12 — Close the only silent CSS drop (`_area_excluded`)

```
Model:       sonnet
Action:      In converter/services/fold_helpers.py::route_area_css_to_block_attrs, the local
             _area_excluded set (grid-area, width, height, the min/max forms, the cross-node
             excluded props, and EVERY custom property `--*`) is tested and `continue`d nine lines
             BEFORE the cross_node_gap_candidate trace fires. Those declarations are discarded with
             NO record anywhere — the pipeline's only truly silent CSS drop. Move the exclusion test
             to AFTER the trace, or emit an explicit excluded-with-reason entry, so every discarded
             declaration leaves evidence.
             ⛔ The count is UNKNOWN and that is the point — producing it IS the deliverable. Do not
             expect a particular number: this run emitted ZERO cross_node_gap_candidate traces, so
             there is no denominator to reason from. Report the count that appears as a NEW measurement.
             SCOPE DISCIPLINE: this step makes the drop VISIBLE. It does NOT change what is
             excluded — that is a separate decision needing its own evidence.
Files:       plugins/sgs-blocks/scripts/converter/services/fold_helpers.py (::route_area_css_to_block_attrs)
Inputs:      .claude/reports/2026-09-09-council-seat-b-dictionary.md ("the only truly silent CSS drop")
Outcome:     A clone run records its previously-invisible discards, each with a reason, and reports
             the count as a new measurement. Emitted block markup is BYTE-IDENTICAL to before, proven
             by sha256 of the emitted markup either side (this is a logging change only).
Exec:        PARALLEL with Steps 3-11 (different file, no shared state)
Deps:        none
Marker:      SESSION-START
Time:        10 min
Tooling:     python; a clone re-run to confirm the trace entries appear
On-Fail:     git revert. If emitted markup changes at all, the change was not logging-only — revert
             and re-approach.
Cold-Entry:  This plan; .claude/reports/2026-09-09-council-seat-b-dictionary.md
Prompt:      In plugins/sgs-blocks/scripts/converter/services/fold_helpers.py, function
             route_area_css_to_block_attrs: the local _area_excluded set is tested and the loop
             `continue`s BEFORE the cross_node_gap_candidate trace, so those declarations vanish with
             no record. Make every discarded declaration leave a trace entry carrying its reason.
             CRITICAL: change ONLY the logging/visibility — do not change WHICH properties are
             excluded, and do not change emitted block markup. Prove it: re-run the clone and show
             the emitted markup is byte-identical to the previous run while the new trace entries
             appear. Paste both proofs. Commit with an explicit pathspec.
Test:
  Happy:       Non-zero trace entries appear, each carrying a reason; sha256 of emitted markup
               identical either side.
  Edge:        A custom property (--*) discard is also traced.
  Fail:        Emitted markup sha256 differs → revert (the change leaked into behaviour).
  Integration: leftover-buckets.json is UNCHANGED — it is produced by a different script
               (leftover-bucket-router.py) and this change cannot move it. If it moves, investigate.
```

### Step 13 — Re-measure and publish the honest number

```
Model:       inline
Action:      Re-run the repaired tool against the unchanged draft and page 3448. Publish the four
             numbers with denominators. Explicitly retire BOTH discredited figures (59% — regression
             artefact; 78% — an estimate over an incomplete population that Seat A showed could not
             be corroborated). Record the result and the retirement in .claude/LEDGER.md, and add a
             decisions.md entry for the reporting-model change.
Files:       .claude/LEDGER.md; .claude/decisions.md; reports/parity-baseline/2026-09-09-post-fix.json
Inputs:      Steps 1-12
Outcome:     One defensible, denominator-carrying set of numbers, with the before/after and the
             reason the old numbers were wrong, so no future session re-quotes them.
Exec:        SEQUENTIAL
Deps:        Steps 11, 12
Marker:      HANDOFF
Time:        10 min
Tooling:     node; /verify-loop (2 independent evidence sources per load-bearing claim)
On-Fail:     If the new number is materially worse than the pre-regression 83-84%, do NOT publish
             it as a fidelity verdict — investigate whether Step 6 added genuinely-unmeasured
             elements (expected, correct) before concluding anything about the clone.
Prompt:      (inline — publishing a number to Bean is a judgement step, and Step 6 deliberately
             makes the score move DOWN for a correct reason that must be explained, not buried.)
Test:
  Happy:       Four numbers published with denominators; LEDGER + decisions updated.
  Edge:        Score lower than baseline because previously-unmeasured elements entered — explained explicitly.
  Fail:        A single aggregate number gets quoted anywhere → the phase's core lesson was lost.
  Integration: Stage 11.6 orchestrator consumes the new artefact shape without error.
```

---

## Key Judgement Calls

### KJC-1 — How to make matching tag-tolerant without re-opening the collision

- **Decision:** Tag is currently part of the match key. How do we stop it charging 139 props?
- **Options:**
  **(A)** Remove the tag from the key outright.
  **(B)** Keep keys tag-agnostic but demote tag to a tie-break inside the existing `::bestPairing`
  candidate machinery.
  **(C)** Leave the key and special-case known-equivalent tag pairs.
- **Recommendation:** **(B)**.
- **Why:** (A) is what Seat A flagged as the honest risk — it re-opens the wrapper/child collision
  `2baf3171e` was written to close, trading one defect for its predecessor. (C) is a hardcoded
  equivalence dict, which R-31-1 forbids and which would need endless extension. (B) reuses
  machinery that already exists and is currently unused for this purpose, and it degrades safely:
  when a same-tag pairing exists it still wins.
- **Cost of wrong choice:** (A) removes a disambiguation guard and risks collapsing two genuinely
  different elements into one pairing — a false-GOOD, the most dangerous direction for a
  measurement tool.
  ⚠ Be precise about what `2baf3171e` actually fixed: its own commit message attributes the
  wrapper/child closure to raising `norm()`'s truncation cap from 80 to 300, and describes
  tag-prefixing as an auxiliary tie-break that came "for free" on top of it. Removing the tag
  therefore does NOT revert that fix — and in the canonical `<div>` wrapping `<div>` case the tag
  prefix disambiguates nothing anyway, both tags being identical. What removing it DOES lose is the
  weaker second guard for same-text-DIFFERENT-tag elements, which is what fixture 6 must test.
- **Who decides:** joint — Bean has approved the phase; the implementer must stop and escalate if
  fixture 6 fails rather than patching forward.

### KJC-2 — Per-element applicability vs a global blocklist entry

- **Decision:** How to stop scoring `background-*` / `border-image-slice` on `<img>`.
- **Options:** **(A)** Add them to the global blocklist. **(B)** Exclude per element type.
- **Recommendation:** **(B)**.
- **Why:** These properties are inert on a replaced element but load-bearing on a `<div>`. A global
  entry silences real defects everywhere to remove noise in one place.
- **Cost of wrong choice:** (A) creates a permanent blind spot for every background defect on every
  non-replaced element — exactly the class of silent failure this phase exists to eliminate.
- **Who decides:** architect (settled — recorded here so it is not re-litigated mid-step).

### KJC-3 — Fixtures before fixes

- **Decision:** Write the six controls first (Step 2), or fix defects and add tests after?
- **Options:** **(A)** Fixtures first, each proven to fail. **(B)** Fix first, test after.
- **Recommendation:** **(A)**.
- **Why:** A test written after a fix cannot prove it detects the defect — it may pass for unrelated
  reasons. This project has recorded repeated incidents of exactly that (a check that stopped
  checking; a gate whose scope was not the defect's scope). Fixtures 1-5 failing today IS the
  positive control.
- **Cost of wrong choice:** (B) risks shipping six green assertions that would not catch a
  regression, leaving the tool no more trustworthy than it is now — while feeling finished.
- **Who decides:** architect (settled).

### KJC-4 — What if the corrected number is still low?

- **Decision:** If the repaired tool reports, say, 70%, is that a clone-quality verdict?
- **Options:** **(A)** Treat it as fidelity and open CSS-transfer work. **(B)** Treat it as a new
  baseline and re-triage before concluding anything.
- **Recommendation:** **(B)**.
- **Why:** Step 6 deliberately admits elements that were NEVER measured before, so the denominator
  grows and the percentage can legitimately fall while fidelity is unchanged or better. Comparing
  a post-fix number to a pre-fix one is comparing different populations.
- **Cost of wrong choice:** (A) restarts the exact error this phase exists to end — building
  transfer work against a number whose meaning has not been established.
- **Who decides:** Bean, at Step 13.

### Pre-emptive decisions (answered here so execution does not pause)

- **Step 10 — how "fail loud on DB-unreachable" is enforced.** The implementer must show there is
  NO catch-and-continue path: the handler re-throws or exits non-zero. A fallback kept "just for
  tests" makes the entire DB binding vacuous. Verified at QA Gate 4 by READING the handler, not by
  running the happy path.

- **Step 11 — the STRUCTURE bucket's definition.** Write it in plain English before coding:
  *one miss per draft element that cannot be matched in the clone by content, or that matches but
  under a different tag.* An element that is both unmatched AND tag-substituted counts **once**.
  Splitting one number into four does not by itself make any of the four correct.

- **Step 12 — how "byte-identical" is proven.** sha256 the emitted block markup before and after,
  and publish both hashes. "Looks the same" is not a check.

- **Open: reconcile 139 vs 198.** Both figures are cited for the cost of tag-divergence
  mismeasurement (Step 7 and Step 11 respectively) with no stated relationship. Establish which is
  correct, and what the other counts, BEFORE either is published at Step 13 — whose whole purpose
  is that no unreconciled number gets quoted again.

- **Already checked, do not re-investigate:** Step 8's substring reasoning is sound (a mid-string
  insertion breaks the draft's contiguous phrase into two non-adjacent pieces, which a
  position-agnostic `.includes()` still cannot match, whereas a prefix/suffix insertion leaves the
  phrase intact at one end). Seat A's `SPAN|8pack` key is correct — the inline-wrapper hoist stops
  at `childElementCount === 1`, so a hoist-only patch will not close M1.

---

## Execution notes (binding)

- **Explicit pathspec on every commit.** This worktree is shared and has already had another
  session's staged work sitting in the index during this programme. Never `git add -A`, never a
  glob, never `git commit --amend` (it flushes the whole index regardless of the original pathspec).
- **No deploy needed for Steps 1-11.** The parity tool is a local Node script — it is not part of
  the plugin payload. Step 12 touches the converter, which also runs locally. Nothing here requires
  `build-deploy.py`.
- **One defect per commit.** The six mechanisms compound (Seat A's V3 measured zero movement alone),
  so a combined commit makes it impossible to attribute a regression.
- **Re-read the emitted output, never close on a green gate** — the recorded failure mode is a gate
  whose scope is narrower than the defect it appears to cover.
