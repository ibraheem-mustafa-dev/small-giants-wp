---
doc_type: phase-plan
phase_id: 9
project: small-giants-wp
parent_spec: .claude/specs/14-CLONING-PIPELINE-CATALOGUE.md
parent_plan: .claude/plans/master-spec14-build-plan.md
title: Phase 9 — Visual-qa gate + autonomy (FR15/16/21/31/32/33)
session_date: 2026-05-11
plan_label: PLAN opus
estimated_minutes: 180-240
---

# Phase 9 — Autonomy + visual-qa gate

**USP:** The structural keystone. Single command in, single output back. All staged mutations gated by pre-commit chain + visual-qa pixel parity. No canonical mutation until both pass.

**Plan label:** `[PLAN: opus]` — staged-merge orchestration is the highest-stakes architecture in the spec.

**Success criteria:**

- [ ] `/sgs-clone <draft-path>` runs end-to-end autonomously without operator interaction
- [ ] FR15 pre-flight chain: `/sgs-db context <variation>`, `/wp-blocks health`, `git status --porcelain`
- [ ] FR16 auto-invokes `/visual-qa` on the staged deployment
- [ ] FR21 stage-then-merge:
  - Pre-commit gate chain (FR32) runs against staging
  - Deploy via tar/scp pointing at staging dir
  - `/visual-qa` runs; captures approved screenshots
  - ON PASS: rsync staging → canonical with `--backup-dir`; rebuild canonical under FR20 mutex; redeploy + pixel-diff against approved screenshots (post-merge verification); single `git commit`; FR8 rows flip pending → applied
  - ON FAIL: discard staging; FR8 rows flip pending → discarded; canonical untouched
- [ ] FR31 pre-flight: `/wp-blocks health` check
- [ ] FR32 pre-commit gate chain: `/lint` → `/diagnostics` → `/wp-perf-gate` → `/wp-theme-check validate` → `/wp-hook-graph validate`
- [ ] FR33 auto-invokes `/sgs-update` after PASS merge
- [ ] Smoke test: full Mama's mockup autonomous run terminates with deployed URL + visual-qa report + gap-candidate manifest in operator deliverable
- [ ] Commit: `feat(p9): autonomous run + visual-qa gated stage-then-merge`

**Entry context:** Spec 14 FR15/16/21/31/32/33 + Section 5.4 autonomous-flow diagram. P6 staged artefacts. `/visual-qa` skill. Existing deploy infrastructure (tar/scp).

**Tooling Index:** Python + Edit + git + rsync + `/visual-qa` subprocess + `/lint`/`/diagnostics`/`/wp-perf-gate`/`/wp-theme-check`/`/wp-hook-graph` subprocesses + `/sgs-update` subprocess + `/sgs-db context`.

---

## Step 0 — Define `visual_qa_config.json` (resolves Adversarial QC concern)

```
Step 0 — Visual-qa thresholds + scope
  Model:       sonnet
  Action:      Author `tools/recogniser-v2/visual_qa_config.json` defining the deterministic gate criteria:
    {
      "viewports": [375, 768, 1440],
      "delta_thresholds_per_viewport": { "375": 0.025, "768": 0.025, "1440": 0.02 },  // 2.5%/2.5%/2% perceptual pixel deviation
      "excluded_regions": [
        { "selector": "body > .wp-admin-bar", "reason": "browser chrome" },
        { "selector": "time.timestamp", "reason": "dynamic content" },
        { "selector": ".sgs-trustpilot-reviews__live-data", "reason": "external sync data, varies between captures" }
      ],
      "in_scope_selectors": ["main", "header.site-header", "footer.site-footer"],
      "a11y_blocking_violations": ["color-contrast", "image-alt", "label", "link-name", "button-name"],
      "a11y_warning_violations": ["heading-order", "landmark-one-main", "region"],
      "parity_validator_kill_severity": "FAIL"
    }
    This config makes /visual-qa deterministic — same screenshots produce same verdict. Without this, the visual-qa "gate" is advisory only.
  Files:       tools/recogniser-v2/visual_qa_config.json (new)
  Outcome:     Deterministic pass/fail criteria committed; /visual-qa wrapper reads this for thresholds
  Time:        20 min
  Cold-Entry:  master plan + spec 14 FR16/FR21
  Test:
    Happy:       Config file parses; thresholds in valid ranges
    Edge:        Threshold too tight (e.g. 0.5%) catches noise → tune per Bean's reasonable-tolerance preference
    Fail:        Schema invalid → fix
    Integration: Step 5 visual_qa_runner.py reads this; FR21 quick-diff uses these thresholds
```

## Step 1 — [SESSION-START] Pre-flight + read existing orchestrator

```
Step 1 — Pre-flight
  Model:       inline (opus)
  Action:      Master pre-flight. Read current `sgs-clone-orchestrator.py` end-to-end. Identify the entry point, stage handler signatures, and where +DEPLOY currently dispatches. Map out where FR15 pre-flight, FR16 visual-qa, FR21 staged-merge, FR33 post-success integrate.
  Marker:      SESSION-START
  Time:        20 min
  Cold-Entry:  master plan + spec 14 FR15-FR33
```

## Step 2 — FR15 pre-flight chain

```
Step 2 — Pre-flight chain
  Model:       sonnet
  Action:      Add `run_preflight(draft_path, run_id)` at start of `sgs-clone-orchestrator.py`. Checks in order:
    1. `git status --porcelain` — if any uncommitted changes touch `plugins/sgs-blocks/src/blocks/` OR `theme/sgs-theme/`, abort with clear message
    2. `/wp-blocks health` — if exit != 0, abort + tell operator to run /sgs-update
    3. `/sgs-db context <variation>` — activate the client's style variation; if no variation specified, prompt via the draft folder's naming or .claude/state.md project context
    4. Verify `pipeline-state/` is writable
    5. **Stale-pending recovery (resolves Gemini Pro QC concern about DB leak on crash):** Query `attribute_gap_candidates` + `functionality_gap_candidates` for rows where `status='pending' AND staged_at < datetime('now', '-24 hours')`. Flip those to `status='discarded'` with a log entry. These are orphaned pending rows from crashed sessions — clean them up at the start of every run.
    6. **Pipeline-state cleanup pass (resolves Gemini Pro QC concern about disk bloat at 50 clones):** Archive run dirs older than 30 days to `pipeline-state/_archive/<run-id>.tar.gz` then delete the originals. Keep `_archive/` for forensic access.
    7. Initialize run_id (ISO timestamp + short hash) + create `pipeline-state/<run-id>/`
  Files:       sgs-clone-orchestrator.py (modified)
  Outcome:     Pre-flight runs cleanly OR aborts with operator-actionable message
  Time:        30 min
  Tooling:     Python subprocess + Edit
  Test:
    Happy:       Clean repo + healthy DB + valid variation → pre-flight PASS
    Edge:        Stale .pyc files in scripts/ → not in scope; ignore
    Fail:        Uncommitted changes touch likely-mutated paths → abort + clear error
    Integration: Subsequent stages assume pre-flight succeeded
```

## Step 3 — FR32 pre-commit gate chain

```
Step 3 — Pre-commit gate chain
  Model:       sonnet
  Action:      Implement `run_precommit_gates(staging_dir, run_id)` at `tools/recogniser-v2/precommit_gates.py`. Runs 5 gates sequentially against the staging dir:
    1. `/lint <changed-files>` — pass/fail
    2. `/diagnostics <changed-files>` — pass/fail
    3. `/wp-perf-gate` — auto-fires on commit; check exit status separately
    4. `/wp-theme-check validate <staging-theme.json>` — only if theme.json mutated
    5. `/wp-hook-graph validate <staging-plugin-dir>` — only if render.php scaffolded (FR14)
  Aggregates results; returns first non-zero exit OR all-pass status. On any failure: preserve staging dir for inspection + bundle failure log into operator deliverable.
  Files:       tools/recogniser-v2/precommit_gates.py (new, ~180 LOC)
  Outcome:     Function returns dict { all_passed: bool, gate_results: {gate_name: {exit_code, stdout, stderr}}, failed_gate: name | None }
  Time:        45 min
  Tooling:     Write tool + Python subprocess
  Test:
    Happy:       Staging dir with clean diffs → all 5 gates pass
    Edge:        Only some gates apply (e.g. no theme.json mutated → wp-theme-check skipped) → aggregate handles cleanly
    Fail:        Malformed JSON in a staged block.json → /lint fails → return early; do NOT run remaining gates
    Integration: FR21 invokes this BEFORE deploy
```

## Step 4 — FR21 staged-merge orchestrator (the keystone)

```
Step 4 — Staged-merge
  Model:       opus inline
  Action:      Implement `staged_merge(run_id, deploy_url, viewports)` at `tools/recogniser-v2/staged_merge.py`. The full FR21 sequence:
    1. Run FR32 pre-commit gates against staging. If FAIL → abort, return failure report.
    2. Deploy STAGED build to sandybrown (existing tar/scp infrastructure points at staging dir, not canonical). Capture deploy URL.
    3. Invoke `/visual-qa <deploy-url> --viewports 375,768,1440 --bundle-output pipeline-state/<run-id>/visual-qa-report.md`. Wait for completion. Capture pass/fail verdict + approved screenshot paths.
    4. ON PASS:
       a. Acquire FR20 build mutex
       b. **MERGE STRATEGY (revised post-QC round-2 — `--delete` was catastrophic):** Walk `pipeline-state/<run-id>/staging/` recursively. For each staged file, copy to its mirror canonical path, backing up the existing canonical version (if any) to `pipeline-state/<run-id>/rollback/<relative-path>` first. NEVER delete canonical files not present in staging — staging is additive-only by design. Pseudo: `for src in find staging -type f; do dst=$(canonical_path src); mkdir -p $(dirname rollback/$src) && [ -f $dst ] && cp $dst rollback/$dst; cp $src $dst; done`. This is per-file additive merge with full rollback support.
       c. Run `cd plugins/sgs-blocks && npm run build` on canonical
       d. Redeploy canonical-built artefact (single deploy invocation)
       e. Run `/visual-qa --quick-diff <deploy-url>` (lightweight pixel-diff against approved screenshots from step 3 — POST-MERGE BUILD VERIFICATION per round-2 Adversarial fix)
       f. If quick-diff PASS: single `git add . && git commit -m "feat(clone): <run-id>"`; release mutex; UPDATE FR8 rows `status='applied' WHERE provenance=<run-id> AND status='pending'`
       g. If quick-diff FAIL: rollback by walking `pipeline-state/<run-id>/rollback/` and copying each backup file back to its canonical mirror path (delete files in canonical that came from staging and have no rollback entry); release mutex; bundle failure report (signals dependency/build-config drift between staging build and canonical build). On FR21 FAIL also invoke `media_sideloader.cleanup_orphans(run_id)` to delete attachment IDs uploaded during this run from WP Media Library (closes Adversarial FM-2 media orphan concern).
    5. ON FAIL (visual-qa or pre-commit): preserve staging for inspection; UPDATE FR8 rows `status='discarded' WHERE provenance=<run-id> AND status='pending'`; return failure report
  Files:       tools/recogniser-v2/staged_merge.py (new, ~350 LOC)
  Outcome:     Function returns dict { verdict: 'PASS' | 'FAIL', merged_files: [...], failure_reason: str | None, visual_qa_report_path, gap_manifest_path, deploy_url }
  Time:        90 min
  Tooling:     Write tool + Python subprocess + rsync
  Test:
    Happy:       Clean run on a synthetic 1-section mockup → PASS path executes end-to-end
    Edge:        Visual-qa PASSES on staging but post-merge build pixel-diff FAILS (build divergence) → rollback fires; canonical preserved
    Fail:        rsync fails mid-merge (disk full) → halt; backup-dir restores state
    Integration: This is the keystone — all FR11/12/13/14/19 staged outputs go through here
```

## Step 5 — FR16 visual-qa auto-invoke + bundle

```
Step 5 — Visual-qa invocation
  Model:       sonnet
  Action:      Wrap `/visual-qa` invocation in `tools/recogniser-v2/visual_qa_runner.py`. Captures multi-frame screenshots at 375/768/1440. Runs axe-core a11y, mockup-parity-validator, screenshot-diff. Outputs report at `reports/visual-diff/<run-id>.md`. Returns dict { verdict, approved_screenshots: {viewport: path}, a11y_violations: [...], parity_deltas: [...] }.
  Files:       tools/recogniser-v2/visual_qa_runner.py (new, ~150 LOC)
  Outcome:     Helper exists; invocation captures expected outputs
  Time:        30 min
  Tooling:     Write + /visual-qa subprocess
  Test:
    Happy:       /visual-qa exits clean; report file exists; verdict accessible
    Edge:        a11y violations present but non-blocking → verdict reflects WARN, not FAIL
    Fail:        /visual-qa hangs or times out → 30-min timeout fires; verdict=FAIL with timeout reason
    Integration: FR21 calls this in step 3
```

## Step 6 — FR33 auto-invoke /sgs-update on PASS

```
Step 6 — Post-success refresh
  Model:       haiku
  Action:      In FR21 PASS branch, after `git commit` succeeds, invoke `/sgs-update` to refresh sgs-db + uimax + block reference. Capture output in run report.
  Files:       sgs-clone-orchestrator.py (modified)
  Outcome:     Post-success refresh runs; new blocks / patterns / attributes registered
  Time:        10 min
  Test:
    Happy:       /sgs-update completes; sgs-db row counts increase appropriately
    Edge:        /sgs-update Stage 3 partial failure (some CSV not synced) → log; do NOT roll back canonical
    Fail:        /sgs-update fully fails → log + flag for operator review; canonical still committed
    Integration: Next clone's pre-flight via /wp-blocks health benefits from this
```

## Step 7 — Output deliverable bundling

```
Step 7 — Deliverable
  Model:       sonnet
  Action:      Implement `bundle_deliverable(run_id, verdict, staged_merge_result)` at `tools/recogniser-v2/deliverable_bundler.py`. Output: `pipeline-state/<run-id>/deliverable.md` containing:
    - Run metadata: run_id, draft path, deploy URL (live), visual-qa verdict
    - Visual-qa report link
    - Gap-candidate manifest: what was auto-added (patterns / blocks / attrs / extensions) — read from FR8 tables filtered by provenance=<run-id>
    - Coverage report: per-section attribute fill rate from Stage 9 outputs
    - If FAIL: which gate failed + specific output
    - Next steps suggested (e.g. "open URL at 375/768/1440 for final eyes-on review per lesson 221")
  Files:       tools/recogniser-v2/deliverable_bundler.py (new, ~120 LOC)
  Outcome:     One markdown file at predictable path; readable by Bean on completion
  Time:        30 min
  Tooling:     Write + Python
  Test:
    Happy:       Bundle on a synthetic PASS run; markdown renders cleanly
    Edge:        FAIL run still produces a deliverable (with the failure details)
    Fail:        Missing data → emit "data unavailable" placeholders; don't halt
    Integration: This is what Bean opens at the end of any run
```

## Step 8 — Wire FR15 + FR21 + FR33 into orchestrator main()

```
Step 8 — Main() rewrite
  Model:       opus inline
  Action:      Refactor `sgs-clone-orchestrator.py main()` to be the new top-level orchestrator. Sequence:
    1. Parse args (draft_path, --no-deploy flag, etc.)
    2. `run_preflight()` (FR15) — abort on fail
    3. Initialize run state at pipeline-state/<run-id>/
    4. Execute 9 stages (BOUNDARY → MATCH → SLOT-LIST → EXTRACT → HARVEST → CLASSIFY → COMPOSE → SERIALISE → REPORT) — all staged-output-only; canonical untouched
    5. Run +DEPLOY (against staging dir) → call `staged_merge()` (FR21) → handles deploy + visual-qa + merge-on-PASS
    6. If PASS: invoke `/sgs-update` (FR33)
    7. Bundle deliverable (Step 7)
    8. Return exit code 0 on PASS, 1 on FAIL
  Files:       sgs-clone-orchestrator.py (heavily modified)
  Outcome:     `python sgs-clone-orchestrator.py <draft>` runs the full autonomous chain
  Time:        45 min
  Tooling:     Edit
  Test:
    Happy:       Run on Mama's mockup → exits clean with PASS deliverable
    Edge:        --no-deploy flag → skips +DEPLOY through FR33; bundles deliverable with staged-but-not-merged state
    Fail:        Any step aborts → clean exit with FAIL deliverable; pipeline-state preserved for inspection
    Integration: This IS the operator-facing entry point
```

## QA Gate — P9 acceptance (smoke test on Mama's mockup)

```
QA Gate — P9
  Model:       inline (manual run + verification)
  Check:       Run `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py sites/mamas-munches/mockups/homepage/`. Expected: pipeline completes; deliverable exists at pipeline-state/<run-id>/deliverable.md; deploy URL accessible; visual-qa report renders. Bean opens deploy URL at 375/768/1440 — confirms RENDERING ACCEPTABLE (lesson 221 — operator eyes verify, no agent fallback).
  Pass:        Pipeline exits 0 + deliverable exists + Bean confirms rendered output
  Fail:        Halt; bundle the failure mode for diagnostic
  Marker:      QA
```

## Step 9 — [HANDOFF] Commit P9

```
Step 9 — Commit
  Action:      Stage. Commit `feat(p9): autonomy + visual-qa gated stage-then-merge — full pipeline operational`. Push.
  Marker:      HANDOFF
  Time:        3 min
```
