# QC — 2026-08-15 session work (colour placement + derivation fixes)

```
doc_type: report
date: 2026-08-15
target: this session's shipped work on `main` (69ef7faa)
type: feature / framework tooling
goal source: .claude/LEDGER.md + .claude/decisions.md D621/D622
```

## Verdict

**GRADE: pass · CONFIDENCE 92/100 · RECOMMENDATION: ship (already merged)**

**Certainty:** unavailable — `certainty_calc` module not loaded (single-operator run, no rater panel).

Every gate green, every self-test green, both negative controls prove the gates can fail, and the
converter suite is at 674 passing (669 baseline + 5 new). −8 for the two items that are honestly
unverified until the next reseed, and for SonarCloud being merged over.

## Goal (Stage 1)

From LEDGER + D621/D622: *settle where a colour control lives, enforce it so the rule cannot drift
again, and reduce `css_element` drift and element-manifest style defects without degrading correct
CSS to satisfy a detector.*

## Structural pre-gates (Stage 0.5) — 10/10 pass

All 6 touched JSON files parse; all 4 new script/test files exist at their committed paths.

## Scenarios (Stage 2-4)

| # | Scenario | Category | Verdict | Evidence |
|---|---|---|---|---|
| 1 | All gates pass on `main` | golden | **PASS** | element-manifest `exit 0`; db-consistency `exit 0`; `[F6] Gate passed — 0 NEW` |
| 2 | Converter suite unbroken | golden | **PASS** | `674 passed, 1 skipped, 12 xfailed` (baseline 669 + 5 new) |
| 3 | Drift detector self-test | golden | **PASS** | `Self-test: 8 passed, 0 failed` |
| 4 | Colour-coverage detector self-test | golden | **PASS** | `Self-test: 19 passed, 0 failed` |
| 5 | New regression tests | golden | **PASS** | `9 passed` (reseed-reset 4 + Max-suffix 5) |
| 6 | Placement resolver: zero contested | golden | **PASS** | `placement-reach.py` prints no CONTESTED section |
| 7 | **Gate can FAIL** (baseline −1) | failure | **PASS** | mutated `exit=1`, restored `exit=0` |
| 8 | **Max/Min removal scoped correctly** | edge | **PASS** | rows 156→154; `Min`/`Max` absent; `Width`/`Height`/`Colour`/`Radius`/`Padding` all still present |
| 9 | Removal is documented | edge | **PASS** | `__why_min_max_removed` key present |
| 10 | DB integrity after 2 reseeds | failure | **PASS** | 36 tables; `property_suffixes` 156→154 rows as intended; `block_attributes` 2,768 |

**10/10 auto-verifiable scenarios pass. 0 fail. 0 manual skips.**

## ⚠ Two false alarms I raised and corrected DURING this QC run

Recorded because the pattern matters more than the result — both were **my own measurement**, not the
code, and both would have been reported as defects if I had stopped at the first reading.

1. **"element-manifest gate exits 1".** My command was `cd X && … && node … ; echo $?`. The `cd`
   failed (already in that directory), the `&&` chain short-circuited so the gate **never ran**, and
   `$?` captured the *cd's* failure. Re-run three ways: `exit 0` every time.
2. **"`Width` suffix was removed too"** — an apparent scope breach in the Max/Min fix. My parser used
   `row.get('suffix')`, but rows in `property-suffixes.json` are **arrays**
   (`["Colour","color","color",1,"palette",null,null]`), so every lookup returned nothing and every
   suffix read as absent. Re-checked with correct indexing: exactly 2 rows removed, all scope
   controls intact.

Sibling of the `ls -1 | wc -l` vs PowerShell `-Force` false alarm earlier the same session
(970 vs 973 `node_modules`). **Three measurement artefacts in one session, all self-caught.** The
common shape: changing measurement tool or command structure mid-comparison.

## Honest gaps (the −8)

1. **Two fixes are unverified until the next reseed.** The `css_element`/role corrections from the
   Class 1/2/4 work and the Max/Min removal only reach the DB on a reseed. Proven at unit level
   against real `render.php`/`style.css`; **not** proven end-to-end. Deliberate — a reseed is a
   cross-track action and two already ran today.
2. **SonarCloud Security Rating C was merged over**, on explicit instruction, unread. Not a test
   failure, but an unresolved signal on new code.
3. **No live-editor verification.** Not applicable to this work — the manifest edits are inert for
   the client (no runtime JS reads `supports.sgs.elements`; verified). Would be mandatory for wave 2.

## Next actions, experiment-shaped

**1. Read the SonarCloud finding** — *hypothesis:* the C rating is one identifiable issue in
new code. *Baseline:* Security Rating C on PR #27's new code. *Validation:* rating returns to A.
*Commit gate:* do not merge the next PR while the rating is below A.

**2. Reseed and re-measure** — *hypothesis:* drift orphans fall 3→2 and style defects 7→6, with the
residue being only the two known schema-limit cases. *Baseline:* drift 3, defects 7.
*Validation:* `audit-css-element-drift.py` + `check-element-manifest-conformance.js --json`.
*Commit gate:* do not accept if any NEW db-consistency violation appears — that is the pattern that
produced three regressions today.

**3. The 1:N schema decision** — *hypothesis:* a list-valued `css_element` (or a join table) removes
the last 2 orphans permanently. *Baseline:* 2 orphans that no manifest edit can fix
(`hero.split-media`, `trust-bar.badge-label`, plus `breadcrumbs.current`). *Success is goal-shaped,
not numeric:* every `css_element` consumer handles a set without regression, and the converter still
passes 674. **Design gate first — do not implement inline.**

## Top outcome unlocked

Wave 2 (34 blocks) is unblocked with **placement decided by a resolver rather than per-block
judgement**, and the rule is now gate-enforced — so the D537-vs-D609 contradiction class cannot
recur silently. Fixing action 1 lifts confidence 92 → ~97.
