---
doc_type: phase-plan
phase: 1
parent_plan: .claude/plans/2026-05-24-strategic-plan.md
plan_label: opus
docscore_grade: B+ (self-assessed)
generated: 2026-05-23
primary_goal: "Close the structural pixel-diff blockers + complete the 2026-05-21 architecture programme leftovers identified by 2026-05-23 fact-check."
---

# Phase 1 — Structural pipeline recovery

**USP:** This phase IS the pixel-diff lever. 5 of 9 sections fall through to fallback at Stage 2 because the walker-entry CSS-class pre-pass (Spec 16 §15 steps 1-3) was never built. Closing this unblocks every per-section pixel-diff drop from current 70.5% mean toward the ≤1% target. Without it, no amount of cosmetic improvement moves the numbers.

**Plan label:** `[PLAN: opus]` — architectural rewrite, multi-hop reasoning, expensive-to-undo.

**Aggregate cost estimate:** ~4-6 hrs wall-clock across 1-2 sessions.

## Phase success criteria (done when)

- [ ] Hero `stage_3_slot_list` failures drop from 142 to under 30 (per Spec 16 §15 numeric acceptance)
- [ ] Hero `variation_css_rules` rises from 0 to at least 8
- [ ] Brand pixel-diff at 1440 drops below 20% (from 83.4%)
- [ ] 5 currently-falling-through sections (header, featured-product, gift-section, social-proof, footer) emit with structured attrs (not just `sgs/container className-only`)
- [ ] Phase 1 hooks completion: `SELECT COUNT(*) FROM hooks` in sgs-framework.db matches legacy hooks.db count (7,283) ±2%
- [ ] `role='content'` DB rows match source files: 87 attrs across 40 blocks (currently 17 across 11)
- [ ] Legacy `blocks.db` + `hooks.db` removed OR retained as cache only (write a parking entry documenting which choice)
- [ ] Spec 17 §6.4 stale "Option A pending" claim corrected to "shipped" (with renderer.php:73-78 cite)
- [ ] Plan 2026-05-21 block count refreshed 73 → 69 (4 occurrences)
- [ ] Every commit in this phase passed /qc-council Stage 5 + the predicted-delta gate landed within ±5%

## Entry context (read before starting — MANDATORY)

1. `.claude/pipeline-state-debug-artefacts-inventory.md` — diagnostic artefact map
2. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §15 — Wave 2 reshape full 4-step requirement
3. `.claude/cloning-pipeline-flow.md` Stage 0.7-9c blocks + Stage 11 block (new 2026-05-23)
4. `pipeline-state/mamas-munches-homepage-2026-05-23-145045/` — canonical baseline
   - Read `summary.log` first
   - Then `trace.jsonl` (filter by stage_2 + stage_4 for the 5 fall-through boundaries)
   - Then `leftover-buckets.json` for gap distribution
   - Then `stage-11-pixel-diff.json` for per-section baseline numbers
5. `reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md` — original G1-G5 honest-path council
6. `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` lines 3790-3900 — current walk() function shape (the function that needs the new pre-pass)
7. `plugins/sgs-blocks/scripts/sgs-update-v2.py` lines 540-720 — current hooks import logic
8. `.claude/architecture.md` post-update notes — DB-first rule + Phase 5a context

## References

- blub.db row 254 — leftover-buckets discipline
- blub.db row 255 — multi-model /qc-council per commit
- blub.db row 256 — per-section cropped pixel-diff
- blub.db row 269 — universal extraction only, no per-block fixes
- blub.db row 272 — schema enumeration before missing-X claims
- blub.db row 284 — no per-client CSS variation files as deploy artefacts (captured 2026-05-23)

## Tooling Index

| Type | Name | Used in step |
|---|---|---|
| skill | `/qc-council` | Steps 1.4, 1.7, 1.10, 1.13 (before every converter/pipeline commit) |
| skill | `/qc-inline` | Steps 1.2, 1.6 (single-file checks) |
| skill | `/verify-loop` | Steps 1.5, 1.9 (2nd attestation per claim) |
| skill | `/systematic-debugging` | Step 1.3 root-cause investigation |
| skill | `/sgs-clone` | Steps 1.7, 1.10, 1.13 (pipeline test after every commit touching converter) |
| skill | `/sgs-update` | Step 1.11 (re-run after block.json source state matches DB target) |
| skill | `/subagent-prompt` | Steps 1.6, 1.10 cold prompts for implementers |
| agent | `wp-sgs-developer` | Step 1.6 (walker-pre-pass implementation) |
| mcp | Playwright | Stage 11 auto-uses |
| python | `~/.claude/hooks/wp-blocks.py dump` | Step 1.3 (schema enumeration before any claim) |
| python | `~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | Steps 1.1, 1.5, 1.11 (DB query) |
| python | `scripts/pixel-diff.py` | Stage 11 auto-uses |

---

# Steps

## Step 1.1 — Resume context anchor `[SESSION-START]`

```
Step 1.1 — Read all entry-context artefacts
  Model:       inline
  Action:      Read every file listed in "Entry context (read before starting)" above. Spend 5-10 min on the trace.jsonl + leftover-buckets.json from the baseline run. Build mental model of which boundaries fall through where + why.
  Files:       (read-only — entry-context list)
  Inputs:      none
  Outcome:     One-paragraph mental model written to chat: "Phase 1 baseline state is X; the walker pre-pass needs to produce Y for sections Z; the empirical gate is W."
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        15 min
  Tooling:     Read tool only
  On-Fail:     If any entry-context file is missing/moved, surface to Bean before continuing
  Cold-Entry:  .claude/pipeline-state-debug-artefacts-inventory.md + specs/16 §15 + the strategic-plan
  Test:
    Happy:       Mental-model paragraph written + matches the artefacts
    Edge:        Baseline run dir gone → run `/sgs-clone --deploy-target page:144` to recreate
    Fail:        Spec 16 §15 missing/changed → fall back to git log + cite commit SHA
    Integration: standalone (no system test needed)
```

## Step 1.2 — Refresh stale doc claims (quick wins)

```
Step 1.2 — Fix 3 stale doc claims surfaced by 2026-05-23 fact-check
  Model:       inline
  Action:      Three small edits:
                (a) `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` and parking entry P-PHASE-5B-INERT-CUSTOMISER-OUTPUT: correct the "Option A pending" claim — Option A SHIPPED (renderer.php:73-78 emits :root --sgs-header-bg / footer-bg). Update parent plan §6.4 amendment text to match.
                (b) `.claude/plans/2026-05-21-architecture-staging.md` lines 116, 118, 199, 317: refresh "73 blocks" → "69 blocks" (4 occurrences). Cite CLAUDE.md + DB count (69) as evidence.
                (c) `.claude/plans/2026-05-21-architecture-staging.md` line 87 (Decision 12 — Phase 3 scope): add an inline note "Implementation landed step 4 of Spec 16 §15 only. Steps 1-3 (walker-entry pre-pass) remain open per 2026-05-23 fact-check — see Phase 1 of 2026-05-24-strategic-plan.md."
  Files:       .claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md, .claude/plans/2026-05-21-architecture-staging.md, .claude/parking.md
  Inputs:      Step 1.1 mental model
  Outcome:     3 doc edits committed; parent plan no longer overstates Phase 3 completion
  Exec:        SEQUENTIAL
  Deps:        Step 1.1
  Marker:      (none)
  Time:        15 min
  Tooling:     Edit, Read
  On-Fail:     If git pre-commit hook objects, revert + adjust message
  Test:
    Happy:       3 edits commit cleanly; grep "73 blocks" in plan returns 0
    Edge:        Plan also has "73 blocks" in archived plans (plans/archive/) — leave archived plans untouched
    Fail:        Spec 17 has been edited since by another process — re-read and merge
    Integration: docs-only; no pipeline impact
```

## Step 1.3 — Pre-implementation diagnostic dispatch `[QA]`

```
QA Gate 1.A — Pre-implementation diagnostic confirmation
  Model:   inline (read trace.jsonl + leftover-buckets) + 1 verify-loop subagent
  Exec:    SEQUENTIAL
  Deps:    Step 1.2 commit
  Check:   Confirm 5 fall-through boundaries (b1 header, b4 featured-product, b7 gift-section, b8 social-proof, b9 footer) emit `sgs/container` at confidence 0.0 in latest run AND confirm `block_compositions` table is WRITE-ONLY (no readers in converter_v2/) AND confirm `blocks.parent_block` HAS the seed data the walker pre-pass will need
  Pass:    All 3 confirmations cited with file:line or SQL output
  Fail:    Surface contradiction to Bean before dispatching the implementer
  Marker:  QA
```

## Step 1.4 — Hidden-decisions pass (peer review)

```
Step 1.4 — Hidden-Decisions peer review before implementer dispatch
  Model:       /dispatching-parallel-agents (gemini-flash + cerebras as 2 cold raters)
  Action:      Both raters get: (a) the Phase 1 plan; (b) Step 1.6's planned cold prompt for the wp-sgs-developer agent; (c) Spec 16 §15. Question: "What ambiguities would pause execution mid-step? What decisions would you need clarified before starting?"
  Files:       (no file ops — discussion)
  Inputs:      Phase 1 plan + Step 1.6 cold prompt draft
  Outcome:     Append novel pre-emptive decisions to the KJC section below
  Exec:        PARALLEL (2 raters simultaneously)
  Deps:        Step 1.3 QA pass
  Marker:      (none)
  Time:        15 min
  Tooling:     Skill /dispatching-parallel-agents
  On-Fail:     If neither rater surfaces anything novel, proceed
  Test:
    Happy:       Pre-emptive decisions list grows by 1-3 items
    Edge:        Both raters return identical findings → log + de-dupe
    Fail:        Both raters time out → proceed with the current plan + flag risk
    Integration: standalone
```

## Step 1.5 — /qc-council baseline measurement `[GATE]`

```
Step 1.5 — Empirical baseline for the walker pre-pass fix
  Model:       inline /qc-council
  Action:      Run /qc-council with the walker pre-pass as a fix-shape proposal. Empirical baseline (from baseline run trace.jsonl): hero stage_3_slot_list failures = 142, hero variation_css_rules = 0, brand pixel-diff at 1440 = 83.4%. Predicted post-fix: < 30, ≥ 8, < 20% respectively (per Spec 16 §15).
  Files:       (no file edits — council artefact only)
  Inputs:      Phase 1 plan, Spec 16 §15, baseline trace.jsonl
  Outcome:     /qc-council Stage 5 verdict: proceed / refine / falsified
  Exec:        SEQUENTIAL
  Deps:        Step 1.4
  Marker:      QA
  Time:        20 min
  Tooling:     Skill /qc-council
  On-Fail:     If council Stage 5 falsifies the predicted delta, STOP and surface to Bean
  Test:
    Happy:       Council verdict = proceed; baseline metric captured
    Edge:        Council finds the fix-shape is technically right but the predicted delta is too aggressive — relax target or surface
    Fail:        Council falsifies the diagnosis → return to systematic-debugging
    Integration: gates Step 1.6 dispatch
```

## Step 1.6 — Implement walker pre-pass (delegated)

```
Step 1.6 — Implement Spec 16 §15 steps 1-3 (walker-entry CSS-class pre-pass)
  Model:       wp-sgs-developer (Sonnet 4.6 — Opus reserved for council orchestration)
  Action:      Implement the walker-entry pre-pass in convert.py. The agent must add (or modify existing functions in) the walker entry path:
                1. Walk every CSS class encountered in each section (currently walk() processes node-by-node depth-first; needs a pre-pass that builds a complete class set per section BEFORE emit)
                2. Assign CSS ownership per class via direct/descendant/parent-qualified selectors (build a `class → owning_rules: list` map per section)
                3. Record parent-child class relations via natural BEM relations + blocks.parent_block (build a DAG keyed on class strings, NOT block slugs — this is the universal-extraction primitive per blub.db row 269)
                4. Wire this graph into the existing emit logic so unmatched sections (those Stage 2 falls to sgs/container) emit with structured attrs based on the graph
  Files:       plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py (walker entry around line 3790) + plugins/sgs-blocks/scripts/orchestrator/converter_v2/slot_list.py (query property_suffixes for visual slots, not just text)
  Inputs:      Spec 16 §15 full text, baseline trace.jsonl, Step 1.5 council verdict
  Outcome:     Code change shipped with measurable improvement on the empirical metrics
  Exec:        SEQUENTIAL
  Deps:        Step 1.5 council = proceed
  Marker:      (none)
  Time:        90-120 min wall-clock
  Tooling:     Read, Edit, Bash, subprocess /sgs-clone for verification
  On-Fail:     If predicted-delta gate fails AFTER implementation, revert + return to council for re-diagnosis
  Cold-Entry:  See Prompt below
  Prompt:      |
    You are dispatched 2026-05-24 to implement Spec 16 §15 steps 1-3 (the walker-entry CSS-class pre-pass) in the SGS converter v2. This is the dominant pixel-diff blocker per the 2026-05-23 fact-check.

    CONTEXT — what's already done:
    - Phase 3 (commit 79158da5) retired INNER_BLOCK_PATTERNS dict + made _lift_inner_blocks DB-driven via blocks.parent_block. This is STEP 4 of Spec 16 §15.
    - Steps 1-3 were NEVER built. 2026-05-23 fact-check by 5 investigators confirmed.
    - Today's empirical baseline (run mamas-munches-homepage-2026-05-23-145045): 5 of 9 sections fall through to sgs/container @ confidence 0.0 at Stage 2 (header, featured-product, gift-section, social-proof, footer). Mean pixel-diff 70.5%.

    YOUR JOB — implement steps 1-3 per Spec 16 §15:
    1. Walker walks every CSS class encountered per section (NOT node-by-node depth-first only)
    2. Assigns CSS ownership per class (direct + descendant + parent-qualified selectors)
    3. Records parent-child class relations using BEM + blocks.parent_block table
    4. Wire the resulting class-graph into emit logic so unmatched sections still produce structured cv2 output (not just sgs/container className-only)

    EMPIRICAL ACCEPTANCE (Spec 16 §15 numeric gate):
    - Hero stage_3_slot_list failures: 142 → < 30
    - Hero variation_css_rules: 0 → ≥ 8
    - Brand pixel-diff at 1440: 83.4% → < 20%

    METHODOLOGY GUARDRAILS (mandatory, per blub.db):
    - Row 254: read pipeline-state/<run>/leftover-buckets.json BEFORE conjecturing
    - Row 255: multi-model /qc-council BEFORE commit (this IS a converter touch)
    - Row 256: per-section cropped pixel-diff via Stage 11 auto-capture
    - Row 269: NO per-block legacy patches. UNIVERSAL extraction primitive only.
    - Row 272: schema enumeration via `python ~/.claude/hooks/wp-blocks.py dump` BEFORE any missing-X claim
    - Row 284: NO per-client CSS variation files as deploy artefacts

    PIPELINE TEST (Bean directive 2026-05-23):
    After EVERY commit, run `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --deploy-target page:144 --debug-trace`. Stage 11 auto-captures pixel-diff numbers in stage-11-pixel-diff.json. Compare against baseline run mamas-munches-homepage-2026-05-23-145045.

    SAFETY:
    - Never use `git stash` (blub.db lesson — wipes work)
    - Never use `git add .` or `-A` (scope by exact path)
    - Never use `--no-verify` on commits
    - Branch discipline: this is core SGS work → commit to main
    - DO NOT commit if Stage 11 numbers REGRESS beyond ±5% from baseline (revert + report)

    OUTPUT:
    1. Commit SHA
    2. Files touched with line ranges
    3. Pre/post Stage 11 numbers (per-section, all 3 viewports)
    4. /qc-council Stage 5 verdict + run-id
    5. Any new architectural rules surfaced (for /capture-lesson)

    Budget: 90 min wall-clock. If you exceed it, STOP and report progress.
  Test:
    Happy:       Empirical gate met (failures < 30, css_rules ≥ 8, brand 1440 < 20%); commit lands
    Edge:        Partial improvement (some metrics met, some not) — surface to Bean; do NOT commit unless ALL 3 metrics improve
    Fail:        /qc-council Stage 5 falsifies the predicted delta — REVERT + return to Step 1.5
    Integration: Stage 11 captures the empirical delta automatically; recognised by stage-11-pixel-diff.json delta vs baseline
```

## Step 1.7 — Post-implementation pipeline test `[QA]`

```
QA Gate 1.B — Post walker-pre-pass pipeline test
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Step 1.6 commit
  Check:   Read pipeline-state/<latest>/stage-11-pixel-diff.json; assert (a) hero stage_3_slot_list failures < 30 (from trace.jsonl per-boundary), (b) hero variation_css_rules ≥ 8, (c) brand pixel-diff at 1440 < 20%, (d) NO regression on previously-converging sections (ingredients 31.9% stays ≤ 35%, trust-bar 84.1% stays ≤ 90%)
  Pass:    All 4 conditions met; commit confirmed as the walker-pre-pass fix
  Fail:    Any regression beyond ±5% → revert Step 1.6 + return to Step 1.5 council
  Marker:  QA
```

## Step 1.8 — Phase 1 hooks completion

```
Step 1.8 — Import the 2,049 missing hooks from legacy hooks.db
  Model:       inline
  Action:      The 2026-05-23 fact-check found sgs-framework.db hooks = 5,234; legacy hooks.db has 7,283. Gap = 2,049. Investigate root cause:
                  (a) Does `sgs-update-v2.py` Stage 2 (Mode A) skip certain hook rows? Read the import logic at lines 692-720. Likely there's a filter (e.g. JS hook types skipped) — quantify it.
                  (b) Run `python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 2` and observe what changes.
                  (c) If the 2,049 are JS hooks intentionally excluded, document the rationale in `.claude/decisions.md` + close as "by design".
                  (d) If they're a genuine import gap, fix the filter logic + re-run.
  Files:       plugins/sgs-blocks/scripts/sgs-update-v2.py (Stage 2 import logic at lines 540-720)
  Inputs:      Step 1.7 pipeline test passed
  Outcome:     Either (a) `SELECT COUNT(*) FROM hooks` matches legacy hooks.db within ±2%, OR (b) decision documented explaining the gap as intentional
  Exec:        SEQUENTIAL
  Deps:        Step 1.7 QA pass
  Marker:      (none)
  Time:        30-45 min
  Tooling:     Read, Edit, Bash, /sgs-update, sgs-db.py
  On-Fail:     If the import re-run also produces 5,234, the filter logic is intentional — document as decision
  Test:
    Happy:       Hook count matches legacy ±2% OR documented as intentional exclusion
    Edge:        Some hooks excluded for valid reason (e.g. PHP-only filter) — surface the breakdown
    Fail:        Re-run breaks sgs-framework.db → revert; investigate filter logic with /qc-inline
    Integration: /sgs-update Stage 9 drift gate will catch schema mismatches if any
```

## Step 1.9 — role='content' DB sync

```
Step 1.9 — Re-run /sgs-update to sync role='content' from source block.json
  Model:       inline
  Action:      The 2026-05-23 fact-check found source files have 87 `role='content'` attrs across 40 blocks but DB has only 17 across 11. /sgs-update was never run after Phase 6 block.json changes landed. Re-run /sgs-update Stage 1 (SGS codebase scan) to sync.
  Files:       (no file edits — DB writes only via /sgs-update)
  Inputs:      Step 1.8 hooks state stable
  Outcome:     `SELECT COUNT(*) FROM block_attributes WHERE role='content'` = 87 + DISTINCT(block_slug) = 40
  Exec:        SEQUENTIAL
  Deps:        Step 1.8
  Marker:      (none)
  Time:        10 min
  Tooling:     /sgs-update (or `python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1`)
  On-Fail:     If /sgs-update errors on Stage 1, surface error + /qc-inline the import logic
  Test:
    Happy:       DB matches source (87/40)
    Edge:        Some attrs in source but block.json hasn't propagated through /sgs-update — surface specific drift
    Fail:        /sgs-update fails to write — surface DB-lock or schema issue
    Integration: /sgs-update Stage 9 drift gate
```

## Step 1.10 — Combined verification + commit

```
Step 1.10 — /qc-council verification of Steps 1.8+1.9 + combined commit
  Model:       inline /qc-council
  Action:      /qc-council Stage 5 on the combined Step 1.8 + 1.9 state. Baseline: hooks=5234, role=content/17/11. Predicted post-fix: hooks≈7283, role=content/87/40. Validation commands: `SELECT COUNT(*) FROM hooks` + `SELECT COUNT(*) FROM block_attributes WHERE role='content'`. Commit message includes empirical pre/post numbers.
  Files:       (DB-only changes from steps 1.8+1.9 — no git-tracked file commits unless 1.8 needed an import-logic fix)
  Inputs:      Step 1.9 complete
  Outcome:     /qc-council verdict = proceed + commit lands (if 1.8 touched source) OR documented-as-data-only if neither step touched source code
  Exec:        SEQUENTIAL
  Deps:        Step 1.9
  Marker:      QA
  Time:        15 min
  Tooling:     /qc-council, git
  On-Fail:     Council falsifies → return to step 1.8 or 1.9 root cause
  Test:
    Happy:       Numbers match prediction; /qc-council verdict proceed
    Edge:        Numbers mostly match but one outlier — investigate, do not blanket commit
    Fail:        Council finds the fix didn't take — return to step 1.8 OR 1.9 root cause
    Integration: closes Phase 1 data-completeness gates
```

## Step 1.11 — Phase 1 close handoff `[HANDOFF]`

```
Step 1.11 — Phase 1 close + Phase 2 next-session prompt
  Model:       inline
  Action:      Invoke /handoff. Update state.md (current_phase → "phase-2-parking-sweep"). Write next-session-prompt scoped to Phase 2 (reference 2026-05-24-phase-2-parking-sweep.md). Cite Phase 1 deltas: hero failures Y→Z, brand 1440 W→V, hooks A→B, role=content C→D.
  Files:       .claude/handoff.md, .claude/next-session-prompt.md, .claude/state.md
  Inputs:      All Step 1.* complete + /qc-council gates passed
  Outcome:     Clean phase boundary; Phase 2 ready to start
  Exec:        SEQUENTIAL
  Deps:        Step 1.10 QA
  Marker:      HANDOFF
  Time:        15 min
  Tooling:     /handoff
  On-Fail:     If /handoff stalls → manual edit + commit
  Cold-Entry:  .claude/plans/2026-05-24-phase-2-parking-sweep.md
  Test:
    Happy:       handoff.md regenerated; state.md timestamp updated; next-session-prompt scoped to Phase 2
    Edge:        Phase 1 had partial success (some metrics met) — document residual + carry to Phase 2 scope
    Fail:        /handoff fails → manual file edits + git commit
    Integration: closes loop with /autopilot next session
```

---

## Key Judgement Calls

### Primary decisions

- **Decision 1A — Walker pre-pass implementation shape: in-place modify `walk()` OR new pre-pass function called once per section?**
  - Options: (A) modify walk() to take pre-built class-ownership map; (B) add `_walker_pre_pass(section_node) → ClassGraph` called before walk(); (C) split into two functions: `_build_class_graph` + `_walk_with_graph`
  - Recommendation: B (new pre-pass function, clean separation of concerns)
  - Why: walk() is already 800+ lines; adding pre-pass logic inline would push it over 1000. A separate pre-pass function is testable independently + the graph can be reused for /sgs-clone debugging output.
  - Cost of wrong choice: A might break existing FR1 fast-path (currently working for hero + trust-bar). C is over-engineering for current scope.
  - Who decides: locked at plan time, implementer can deviate with /qc-council validation

- **Decision 1B — Acceptance for the data-completeness sub-tasks: strict (matches legacy ±2%) OR relaxed (documents the gap)?**
  - Options: (A) strict — Step 1.8 must close the 2,049-hook gap; (B) relaxed — if Step 1.8 reveals the gap is intentional (JS hooks excluded), accept + document
  - Recommendation: B
  - Why: the gap may be a deliberate filter (JS hooks excluded from the PHP-focused hook table). Force-closing without root cause investigation would import the wrong data.
  - Cost of wrong choice: A locks in unhelpful work if the gap is intentional.
  - Who decides: locked at plan time

### Pre-emptive decisions (Hidden Decisions pass)

- **Pre-empt 1: What if the walker pre-pass takes more than 90 min to implement?**
  - Pre-answer: If the wp-sgs-developer agent reports stuck at ~70 min, STOP. Park what's done. Re-scope into smaller sub-steps for next session. Do NOT push through — context degradation past the 90-min budget is real.

- **Pre-empt 2: What if Stage 11 pixel-diff numbers improve for some sections but regress for others?**
  - Pre-answer: Per Step 1.7 QA gate, NO regression beyond ±5% on previously-converging sections. If hero improves but trust-bar regresses 84%→92%, REVERT the commit. Surface the trade-off for Bean's KJC.

- **Pre-empt 3: What if /qc-council Stage 5 wants more data before approving?**
  - Pre-answer: Run an EXTRA /sgs-clone with --debug-trace to capture per-section trace.jsonl events. Re-invoke /qc-council with the deeper artefact set.

- **Pre-empt 4: What if Step 1.9's /sgs-update Stage 1 wipes other attributes during the role='content' sync?**
  - Pre-answer: Per Phase 4 spec, /sgs-update Stage 1 is idempotent (re-runs produce zero diffs). If diff is non-zero, that's diagnostic — surface it. Do not undo /sgs-update; investigate WHY the diff appeared.

- **Pre-empt 5: What if the walker pre-pass increases extraction so much that Stage 11 numbers IMPROVE but leftover-buckets total INCREASES?**
  - Pre-answer: That's expected. More attrs extracted → more potential gaps detected → more leftover-bucket entries. NOT a regression. Focus the QA gate on pixel-diff + the 3 Spec 16 §15 metrics, not bucket count.

- **Pre-empt 6: What if the implementer needs to add a new DB table for the class-graph cache?**
  - Pre-answer: Allowed but flag explicitly in commit message. Update `.claude/architecture.md` DB-first rule table + run /sgs-update Stage 1 to register the new table.

---

## Living docs to update at Phase 1 close

- `.claude/state.md` — current_phase → "phase-2-parking-sweep"
- `.claude/decisions.md` — add 1-3 decisions: (a) walker pre-pass implementation shape; (b) hooks gap resolution; (c) any new architectural rules from /capture-lesson
- `.claude/parking.md` — close P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP + P-UNIVERSAL-EXTRACTION-RC-FIXES + P-G1-HERO-INNERBLOCKS + P-G2-PAGE-ID-SCOPE-STRIP + P-G3-STAGE-3-VISUAL-SLOT-MAPPING + P-G5-PER-BLOCK-DOM-SHAPE-FIXES (all should resolve simultaneously per Spec 16 §15)
- `.claude/cloning-pipeline-flow.md` — update Stage 2 + Stage 3 + Stage 4 blocks if their R/W or behaviour changed
- `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §15 — mark steps 1-3 SHIPPED with commit SHAs
- `.claude/architecture.md` — if a new DB table or read path landed, document it
- `.claude/handoff.md` + `.claude/next-session-prompt.md` — Phase 1 close + Phase 2 entry

## What success looks like (one-line)

After Phase 1: re-running `/sgs-clone --deploy-target page:144` produces a stage-11-pixel-diff.json where ≥7 of 9 sections converge below 20% mean and hero's stage_3_slot_list failures dropped from 142 to under 30. The pipeline-fidelity needle moved for the first time this week.
