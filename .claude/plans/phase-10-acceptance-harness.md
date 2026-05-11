---
doc_type: phase-plan
phase_id: 10
project: small-giants-wp
parent_spec: .claude/specs/14-CLONING-PIPELINE-CATALOGUE.md
parent_plan: .claude/plans/master-spec14-build-plan.md
title: Phase 10 — critical-fix-verification.py acceptance harness
session_date: 2026-05-11
plan_label: PLAN haiku
estimated_minutes: 45
---

# Phase 10 — Acceptance harness

**USP:** Mechanical gate for the 5 canonical-mutation-boundary invariants that no other gate catches. Run after every spec-14 autonomous-clone session to confirm framework integrity.

**Plan label:** `[PLAN: haiku]` — 5 git-diff + filesystem assertions; small standalone script.

**Success criteria:**

- [ ] `plugins/sgs-blocks/scripts/recogniser/critical-fix-verification.py` exists; ~150 LOC
- [ ] Runs all 5 checks against a run_id + repo state
- [ ] Exit 0 on all-PASS; exit 1 on any-FAIL with structured stderr listing failed check(s)
- [ ] Integrated into FR21 staged-merge as post-merge verification
- [ ] Smoke test on a synthetic PASS scenario + synthetic FAIL scenario per check
- [ ] Commit: `feat(p10): critical-fix-verification.py acceptance harness — 5 spec-14 invariants`

**Entry context:** Spec 14 FR18 + P1 KJC2 (the 5 checks). All preceding phases done.

**Tooling Index:** Python + git diff subprocess + sqlite3 + filesystem checks.

---

## Step 1 — [SESSION-START] Pre-flight + read FR18 + KJC2

```
Step 1 — Pre-flight
  Model:       inline
  Action:      Master pre-flight. Re-read spec 14 FR18 + P1 KJC2 from decisions.md.
  Marker:      SESSION-START
  Time:        5 min
  Cold-Entry:  master plan + spec 14 FR18 + .claude/decisions.md
```

## Step 2 — Build critical-fix-verification.py

```
Step 2 — Verification harness
  Model:       sonnet
  Action:      Write `plugins/sgs-blocks/scripts/recogniser/critical-fix-verification.py`. The 5 checks:

  Check 1 — No root theme.json mutation in this run's commit
  ===========================================================
  `git show --stat HEAD --name-only | grep -c "^theme/sgs-theme/theme.json$"` must equal 0.
  Acceptable: changes to `theme/sgs-theme/styles/*.json` (variation overlays).
  FAIL signal: root theme.json appears in the diff → framework-poisoning regression.

  Check 2 — No canonical-block file mutated outside FR21 commit message
  ====================================================================
  Walk every changed file under `plugins/sgs-blocks/src/blocks/<slug>/` and `plugins/sgs-blocks/build/<slug>/`. Verify the latest commit message matches the pattern `^feat\(clone\): clone-\d{8}-\d{6}-\w+$` (FR21's auto-commit format). Any other commit message mutating these paths → operator manually edited; not necessarily a fail but flag for review.
  FAIL signal: canonical-block files mutated in a commit not produced by FR21 → manual mutation slipped past the staged-merge gate.

  Check 3 — No licensing strings in uimax writes since run started
  =================================================================
  Query uimax SELECT-ANY-WHERE on the FORBIDDEN-WORD list (license, provenance_license, IP-firewall, redistribution, promotion_path) across `patterns`, `component_libraries`, `naming_conventions`, `animations` tables filtered by `created_at >= <run-start-time>` OR for FR8 tables filter by `provenance = <run-id>`.
  FAIL signal: any row contains a forbidden word → uimax-write-validator slipped (should never happen but verify).

  Check 4 — Idempotency: no duplicate gap-candidate rows for this run_id
  ======================================================================
  Reframed post-QC round-2 (Gemini Pro caught: original re-invocation would recursively call sgs-clone-orchestrator inside FR21 and deadlock the FR20 build mutex).
  New shape: query `SELECT block_slug, selector, css_property, COUNT(*) FROM attribute_gap_candidates WHERE provenance = <run_id> GROUP BY block_slug, selector, css_property HAVING COUNT(*) > 1`. Same query against `functionality_gap_candidates`. Idempotency requires: no row appears twice for the same (block, selector, property) tuple within a single run. If a duplicate exists, FR12/FR14 write path skipped its existence check.
  FAIL signal: any duplicate group in either table for this run_id → idempotency broken at the write path.

  Check 5 — Staging dir empty after PASS run
  ==========================================
  `os.listdir(f'pipeline-state/<run-id>/staging/')` must be empty (or directory absent). FR21 PASS branch should have moved everything to canonical via rsync.
  FAIL signal: staged files remain → rsync was incomplete or rollback ran.

  Output: structured JSON to stdout: { run_id, checks: [{name, status, evidence}], overall: 'PASS' | 'FAIL' }. Exit 0 on overall PASS, 1 on FAIL.
  Files:       plugins/sgs-blocks/scripts/recogniser/critical-fix-verification.py (new, ~180 LOC)
  Outcome:     Script exists; smoke tests pass; integrated into FR21
  Time:        25 min
  Tooling:     Write tool + Python subprocess + sqlite3
  On-Fail:     A check's logic is wrong → fix; re-run smoke test
  Test:
    Happy:       Synthetic clean run → all 5 PASS
    Edge:        Run with --no-deploy (no merge) → checks 1, 2, 5 PASS; check 4 N/A (no comparison run); check 3 checks scoped rows from this dry-run
    Fail:        Synthetic FAIL: manually `touch theme/sgs-theme/theme.json` between staged-merge and verification → check 1 fails with clear evidence
    Integration: FR21 staged_merge invokes this between rsync and commit (catch failures BEFORE committing)
```

## Step 3 — Wire into FR21 staged-merge

```
Step 3 — FR21 wiring
  Model:       sonnet
  Action:      In `tools/recogniser-v2/staged_merge.py` PASS branch, AFTER rsync + npm build but BEFORE `git commit`, invoke `critical-fix-verification.py --run-id <run-id>`. If exit != 0: rollback via backup-dir + flip FR8 rows to discarded + bundle failure report.
  Files:       tools/recogniser-v2/staged_merge.py (modified)
  Outcome:     Critical-fix gate fires inline during PASS branch; failures roll back
  Time:        10 min
  Test:
    Happy:       Verification PASS → commit proceeds
    Edge:        Check 4 (idempotency) requires a second invocation — may add 10-30s to runs; acceptable cost
    Fail:        Any verification FAIL → rollback fires; canonical state preserved
    Integration: Final mechanical gate before canonical mutation
```

## Step 4 — Smoke test on a real Mama's run

```
Step 4 — Smoke test
  Model:       inline
  Action:      Run a full `sgs-clone <draft>` cycle. Verify critical-fix-verification.py fires inside FR21 PASS branch. Verify all 5 checks pass.
  Outcome:     5/5 PASS observed in run log
  Time:        5 min wall-clock (mostly waiting for the autonomous run)
  Test:
    Happy:       Run completes; verification PASS; canonical commit lands
    Fail:        Verification FAIL on a real run → diagnose which check + the underlying issue
```

## Step 5 — [HANDOFF] Commit P10

```
Step 5 — Commit
  Action:      Stage. Commit `feat(p10): critical-fix-verification.py acceptance harness — 5 spec-14 invariants`. Push.
  Marker:      HANDOFF
  Time:        3 min
```

## Spec 14 acceptance

After P10 commits, spec 14 is COMPLETE. All 34 FRs shipped. Run the full acceptance against Mama's mockup:

```bash
# From repo root:
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py sites/mamas-munches/mockups/homepage/

# Expected: exit 0, deliverable.md exists, deploy URL live, /visual-qa PASS, all 5 critical-fix checks PASS
```

Bean opens the deploy URL at 375 / 768 / 1440. If PASS: spec 14 is shipped. If FAIL: bundle the specific failure mode and triage which phase needs revisiting.
