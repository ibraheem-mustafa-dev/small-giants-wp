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
- [ ] **5 currently-falling-through body sections** (featured-product, brand, ingredients-section, gift-section, social-proof) emit with structured attrs (not just `sgs/container className-only`). Updated from 3 → 5 per 2026-05-23 Step 1.3 QA gate — match.json showed brand (conf 0.3) + ingredients-section (conf 0.0) also fall through, beyond the 3 named in leftover-buckets's `unrecognised_section` bucket. **Header + footer excluded from this gate** — they are Phase 2's scope (specialised cloning pipeline per Spec 17). Stage 11 continues capturing header/footer pixel-diff for regression monitoring only.
- [ ] **Stage 11 pixel-diff: ≤ 1% on every (body-section × viewport) cell** — STAGED across 3 sequenced gates per /qc-council 2026-05-23 finding that single walker pre-pass cannot reach ≤ 1% alone. All 7 body sections × 3 viewports = 21 cells must close at ≤ 1% by Phase 1 end via the three staged gates:
    - **Gate 1 (Step 1.7):** structural fall-through closed — every body section emits a registered block (not bare `sgs/container`), 0 sections still at confidence < 0.5 in match.json
    - **Gate 2 (Step 1.7.5):** per-section CSS lift + operator-promotion shipped — every body cell ≤ 10% pixel-diff (matches Wave 2 archived plan's medium-confidence prediction for brand 1440 < 20% + Spec 16 §15:203 promotion path closing last 5-10%)
    - **Gate 3 (Step 1.7.6):** F5 D1 responsive media variants shipped — every body cell ≤ 1% pixel-diff across 375/768/1440 (final closure, including hero 375 mobile +13.3pt regression that traces to F5 D1)
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

## Dispatch bindings — APPLY TO EVERY AGENT DISPATCH IN THIS PHASE (Steps 1.6 / 1.7.5 / 1.7.6)

Per `feedback_dispatched_agents_no_commit_authority.md` (captured 2026-05-23 from Bean's pre-dispatch correction). Every Agent tool dispatch for code changes in Phase 1 MUST embed all four bindings verbatim in the cold prompt:

### Binding A — NO commit authority

The dispatched agent makes changes (Edit/Write), runs validation (`/sgs-clone`, `/qc-inline`), captures artefacts (Stage 11 numbers, match.json deltas, leftover-buckets.json deltas, `git diff --stat`, `git diff`), then RETURNS the **uncommitted** state to main thread. Main thread analyses + presents to Bean. Bean decides commit. The agent NEVER commits. The cold prompt must explicitly forbid `git commit`, `git add`, `git push` by the agent.

### Binding B — `/sgs-clone` per sub-change (MANDATORY, NOT bundled)

For each incremental code change the agent makes (every Edit/Write that affects pipeline code), the agent runs `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --deploy-target page:144 --debug-trace` IMMEDIATELY after the change. Stage 11 numbers, match.json deltas, and leftover-buckets.json deltas are captured per-change and reported per-change. If the agent makes 5 changes, the report has 5 sets of pre/post numbers — not 1 final set. Catches per-change regressions early instead of after-the-fact attribution work.

### Binding C — Living-docs + /capture-lesson inline per change

The agent updates the matching doc the moment the event fires (per autopilot Living Docs Protocol):

| Trigger | Doc to update |
|---|---|
| Architectural decision surfaced | `.claude/decisions.md` |
| Bug, mistake, or anti-pattern surfaced | `.claude/mistakes.md` |
| Deferred work / scope-creep | `.claude/parking.md` |
| Pipeline stage behaviour changed | `.claude/cloning-pipeline-flow.md` |
| DB schema, table, or read-path changed | `.claude/architecture.md` + `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."` verify |
| New pipeline-state artefact added | `.claude/pipeline-state-debug-artefacts-inventory.md` |
| New architectural RULE that should outlive session | Invoke `/capture-lesson` |
| Correction (user-facing recurring mistake) | POST to `http://localhost:5050/api/corrections` with blub_auth cookie |

Doc updates are part of the agent's per-change cycle, not saved for handoff.

### Binding D — TodoWrite breakdown + per-sub-task status

At dispatch start, the agent creates a TodoWrite list breaking the work into sub-tasks (one per code-change candidate). Status updates per sub-task as they complete. The agent's progress is visible mid-dispatch in the main thread — not silent for 90+ min until completion.

### Required output block (cold prompt MUST include)

Every dispatched agent's cold prompt ends with this OUTPUT requirement:

```
RETURN to main thread (do NOT commit):
1. TodoWrite final state (all sub-tasks + status)
2. Per sub-change:
   a. File path + line range changed
   b. `git diff <path>` (the actual diff, uncommitted)
   c. Pre-change /sgs-clone artefact paths (Stage 11 json, match.json, leftover-buckets.json)
   d. Post-change /sgs-clone artefact paths (same set)
   e. Numeric deltas (mean pixel-diff, per-cell, fall-through count)
3. Living-docs updates made (which docs, what sections)
4. /capture-lesson invocations made (with pattern-keys)
5. blub.db corrections POSTed (if any)
6. Architectural surprises / new rules surfaced (flag for main-thread review)
7. Overall recommendation: "commit all changes" / "commit changes 1+3 only, revert 2" / "do not commit; needs re-scope"
```

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
                (c) **VERIFY-FIRST:** `.claude/plans/2026-05-21-architecture-staging.md` line 87 (Decision 12 — Phase 3 scope) should already carry the footnote about steps 1-3 being un-built (added 2026-05-23 — verify with `grep -A2 "Decision 12" .claude/plans/2026-05-21-architecture-staging.md`). If the footnote is PRESENT, skip; this sub-step is a re-verification, not a fresh insertion. If ABSENT, add an inline note: "Implementation landed step 4 of Spec 16 §15 only. Steps 1-3 (walker-entry pre-pass) remain open per 2026-05-23 fact-check — see Phase 1 of 2026-05-24-strategic-plan.md."
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
    - **SCOPE: header + footer are EXCLUDED from this phase's gates.** They are handled by Phase 2's specialised cloning pipeline (Spec 17 architecture). Your acceptance criteria below target ALL 7 BODY sections (hero, trust-bar, featured-product, brand, ingredients-section, gift-section, social-proof) — including hero + trust-bar which already match registered blocks at Stage 2 confidence 1.0 but have high pixel-diff from incomplete slot extraction. Stage 11 still captures all 9 sections — header + footer are for regression monitoring only, not gating. If your changes happen to improve header + footer extraction as a side-effect, that's a bonus; if they regress beyond ±5%, flag it. Do not over-fit the walker pre-pass to header/footer DOM patterns.
    - **Bean's 2026-05-23 directive applied:** every body cell (7 sections × 3 viewports = 21 cells) must close at ≤ 1% pixel-diff. No sliding-scale per-section thresholds — same bar across the board. Once the walker pre-pass + per-section CSS lift land, the 1% bar becomes the validation: anything still > 1% is a structural gap the walker pre-pass missed.

    YOUR JOB — implement steps 1-3 per Spec 16 §15:
    1. **Walker walks every CSS class encountered per section** (NOT node-by-node depth-first only). Implementation: add a NEW function `_walker_pre_pass(section_node, css_rules) → ClassGraph` called ONCE per section boundary by `convert_section()` (or the orchestrator-level callsite that wraps `walk()`). It is NOT called inside `walk()` recursively — that would defeat the "pre-pass" intent and inflate runtime.
    2. **Assigns CSS ownership per class.** Algorithm: a class `C` owns rule `R` iff R's selector matches one of: (a) direct (`.C` alone or `tag.C`); (b) descendant combinator (`.parent .C`, `.parent > .C`); (c) compound (`.C.other`). EXCLUDE: parent-qualified scope-breaks like `.page-id-N .C` — those are stripped by Stage 2's css_strip per §U common-wp-styling-errors before this code runs.
    3. **Records parent-child class relations using BEM + DB.** READ SOURCES (both already populated, verified via sgs-db.py dump 2026-05-23): `blocks.parent_block` (22 parented blocks — accordion-item→accordion, form-field-*→form, button→multi-button) + `slot_synonyms.standalone_block` (BEM-element → standalone-block lookup). DO NOT query `block_compositions` — it is WRITE-ONLY at runtime (Spec 16 §15:971 inline comment; converter_v2/ has zero readers — confirmed by grep 2026-05-23).
    4. **Wire the resulting class-graph into emit logic — for UNMATCHED sections ONLY.** The FR1 fast path at convert.py:3826-3870 already handles registered blocks (hero + trust-bar match at conf 1.0; Wave 2 Change 1 commit at lines 3851-3859 already lands variation_buf.append). DO NOT TOUCH FR1. The pre-pass feeds a NEW fallback emit branch that fires when Stage 2 falls a section through to `sgs/container` (conf < 0.5). Path: in `walk()`'s sgs/container fallback (find it around line 3946+), check if the class-graph has structured matches for the section's children; if yes, emit those as nested blocks instead of `<className-only>` sgs/container.

    EMPIRICAL ACCEPTANCE (updated 2026-05-23 Step 1.5 /qc-council gate — STRUCTURAL CLOSURE ONLY; CSS lift + promotion + responsive variants are Steps 1.7.5 + 1.7.6 NOT this step):
    - Hero stage_3_slot_list failures: 142 → < 30 (per Spec 16 §15 numeric acceptance)
    - Hero variation_css_rules: 0 → ≥ 8 (per Spec 16 §15 — likely already passing post Wave 2 Change 1 commit 2026-05-22 lines 3851-3859)
    - **Stage 2 fall-through closure:** of the 5 currently-falling-through body sections (featured-product, brand, ingredients-section, gift-section, social-proof), 0 still emit `sgs/container` at confidence < 0.5 in match.json. Hero + trust-bar already match at conf 1.0 (don't break that).
    - **Stage 11 pixel-diff is captured but NOT gated at ≤ 1% in this step.** The Wave 2 archived plan's empirical evidence (medium-confidence brand 1440 < 20% from full Wave 2; promotion closes last 5-10%; F5 D1 closes mobile residual) confirms ≤ 1% requires Steps 1.7.5 + 1.7.6. THIS step's pixel-diff gate is: every body cell improves vs baseline (no regression); structural failures captured by match.json + leftover-buckets.json drop to 0. Numeric targets per cell are deferred — your job is to land the structural primitive.

    METHODOLOGY GUARDRAILS (mandatory, per blub.db):
    - Row 254: read pipeline-state/<run>/leftover-buckets.json BEFORE conjecturing
    - Row 255: multi-model /qc-council BEFORE commit (this IS a converter touch)
    - Row 256: per-section cropped pixel-diff via Stage 11 auto-capture
    - Row 269: NO per-block legacy patches. UNIVERSAL extraction primitive only.
    - Row 272: schema enumeration via `python ~/.claude/hooks/wp-blocks.py dump` BEFORE any missing-X claim
    - Row 284: NO per-client CSS variation files as deploy artefacts

    MANDATORY DISPATCH BINDINGS (see "Dispatch bindings" section near top of this plan for full text):
    - **Binding A — NO commit authority.** You do not run `git commit`, `git add`, or `git push`. You return the uncommitted git diff + artefacts to main thread. Main thread + Bean decide commits.
    - **Binding B — /sgs-clone per sub-change.** After EVERY code change (each Edit/Write that affects pipeline), run `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --deploy-target page:144 --debug-trace` immediately. Capture per-change Stage 11 numbers, match.json deltas, leftover-buckets.json deltas. Do not bundle.
    - **Binding C — Living-docs + /capture-lesson inline.** Update mistakes.md / decisions.md / parking.md / cloning-pipeline-flow.md / architecture.md / pipeline-state-debug-artefacts-inventory.md as the work fires. Invoke /capture-lesson for new architectural rules.
    - **Binding D — TodoWrite breakdown + per-sub-task status.** Create TodoWrite list at start; update per sub-task as they complete.

    SAFETY:
    - Never use `git stash` (blub.db lesson — wipes work)
    - Never use `git add .` or `-A` (scope by exact path IF you stage at all — Binding A says you do not commit, but if you stage to inspect, scope by path)
    - Never use `--no-verify`
    - Branch discipline: you do not commit (Binding A); main thread will commit to main if approved
    - If Stage 11 numbers REGRESS beyond ±5% on any body section from baseline: STOP, do NOT continue making changes, report the regression to main thread

    OUTPUT (per Required Output Block in the Dispatch bindings section):
    1. TodoWrite final state (all sub-tasks + status)
    2. Per sub-change:
       a. File path + line range changed
       b. `git diff <path>` (the actual diff, UNCOMMITTED)
       c. Pre-change /sgs-clone artefact paths (Stage 11 json, match.json, leftover-buckets.json)
       d. Post-change /sgs-clone artefact paths (same set)
       e. Numeric deltas (mean pixel-diff, per-cell, fall-through count)
    3. Living-docs updates made (which docs, what sections)
    4. /capture-lesson invocations made (with pattern-keys)
    5. blub.db corrections POSTed (if any)
    6. Architectural surprises / new rules surfaced (flag for main-thread review)
    7. Overall recommendation: "commit all changes" / "commit changes 1+3 only, revert 2" / "do not commit; needs re-scope"

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
  Check:   Read pipeline-state/<latest>/match.json + trace.jsonl + stage-11-pixel-diff.json. Assert ALL of (STRUCTURAL-CLOSURE-ONLY per Step 1.5 /qc-council finding; ≤1% × 21 cells gate STAGED to Steps 1.7.5 + 1.7.6):
              (a) hero `stage_3_slot_list` failures < 30 (from trace.jsonl per-boundary)
              (b) hero `variation_css_rules` ≥ 8 (already achievable post Wave 2 Change 1 commit 2026-05-22 — walker pre-pass should not regress this)
              (c) **Stage 2 fall-through closure (NEW primary gate this step):** match.json shows 0 of the 5 originally-falling-through body sections (featured-product, brand, ingredients-section, gift-section, social-proof) still emitting `sgs/container` at confidence < 0.5
              (d) No regression on currently-matching sections at Stage 2 (hero + trust-bar conf 1.0 must stay 1.0)
              (e) Stage 11 pixel-diff: every body cell IMPROVES vs baseline (no regression > ±5%); absolute thresholds NOT gated this step
              (f) Header + footer pixel-diff captured but NOT gated (Phase 2 scope); ONLY flag if regression > ±5% from baseline as a side-effect
  Pass:    All 6 conditions met simultaneously. AND, not OR. The ≤ 1% cell gate is reserved for Step 1.7.6 — do not assert it here.
  Fail:    Surface specific failing assertion + return to Step 1.6 with extended-measurement evidence per `~/.claude/rules/measurement-vs-eye.md`
  Pass:    All 4 conditions met; commit confirmed as the walker-pre-pass fix
  Fail:    Any regression beyond ±5% → revert Step 1.6 + return to Step 1.5 council
  Marker:  QA
```

## Step 1.7.5 — Per-section CSS lift + operator-promotion (Gate 2)

```
Step 1.7.5 — Ship Wave 2 Changes 2+3+4 (CSS lift) + operator-promotion → body cells ≤ 10%
  Model:       wp-sgs-developer (Sonnet 4.6)
  Action:      Step 1.6 closed structural fall-through but Wave 2 archived plan (line 164) predicted brand 1440 only reaches < 20% with full Wave 2; promotion path closes "last 5-10%" (line 203). Ship that work as a single tight commit chain:
                - Wave 2 Change 2: cv2 queries property_suffixes for visual/structural slot types (not just text — fixes the 142-failure hero slot extraction's "visual roles" cluster like backgroundImage, overlayColour, minHeight)
                - Wave 2 Change 3: cv2 lifts inline `style` declarations onto block.json-supported attrs gated by block_supports (per-section style decls land as inline `style.color.background` etc. on the emitted block, not as freeform CSS)
                - Wave 2 Change 4: preserve mockup tag/class info so `<blockquote>` → `<blockquote>` (not `<section>`), `<aside>` → `<aside>` etc. — fixes brand's tag-mismatch contribution to pixel-diff
                - Operator-promotion (P2.ii from Spec 16 §FR6 promotion path): for residual non-token CSS values, promote them as inline `style` per the block_supports gate. Closes last 5-10% after structural work.
                Run `/sgs-clone --deploy-target page:144 --debug-trace` between each commit; per-section pixel-diff via `scripts/pixel-diff.py --selector .sgs-{section}` at 375/768/1440 captured per commit. Acceptance: every body cell ≤ 10% (matches archived-plan medium-confidence prediction).
  Files:       plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py (multiple change sites — see archived Wave 2 plan), plugins/sgs-blocks/scripts/orchestrator/converter_v2/slot_list.py, scripts/operator-promotion.py (if separate; else inline)
  Inputs:      Step 1.7 QA pass (structural closure confirmed)
  Outcome:     Every body cell (7 sections × 3 viewports = 21 cells) ≤ 10% pixel-diff. Hero stage_3_slot_list failures < 30 holds.
  Exec:        SEQUENTIAL
  Deps:        Step 1.7 QA pass
  Marker:      (none)
  Time:        90-120 min
  Tooling:     Read, Edit, Bash, /sgs-clone, scripts/pixel-diff.py, /qc-inline between commits
  On-Fail:     If predicted-delta gate (every cell ≤ 10%) misses by > 5pp on any cell: revert last commit + return to /qc-council Stage 5 with the specific failing cell + extended-measurement evidence
  Cold-Entry:  Wave 2 archived plan at `.claude/plans/archive/phase-wave-2-wiring-fix-complete.md` + Spec 16 §15 + §FR6 promotion path
  Prompt:      |
    You are dispatched to ship Wave 2 Changes 2+3+4 + operator-promotion as a tight commit chain. Step 1.6 of Phase 1 already shipped the walker pre-pass + structural fall-through closure. Your job is the per-section CSS lift work that closes body cells from ~20-40% to ≤ 10% pixel-diff per Spec 16 §15 + Wave 2 archived plan predictions.

    READ FIRST:
    - `.claude/plans/archive/phase-wave-2-wiring-fix-complete.md` — full Wave 2 spec; you implement Changes 2+3+4 (Change 1 already shipped 2026-05-22 at convert.py:3851-3859)
    - `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §FR6 (operator-promotion path) + §15 (Wave 2 acceptance)
    - latest `pipeline-state/<run>/stage-11-pixel-diff.json` (post-Step-1.6 baseline)

    SHIP AS A TIGHT COMMIT CHAIN (one commit per change, /qc-inline between):
    1. Wave 2 Change 2: cv2 queries property_suffixes for visual/structural slot types
    2. Wave 2 Change 3: cv2 lifts inline style decls onto block.json-supported attrs gated by block_supports
    3. Wave 2 Change 4: preserve mockup tag/class info (don't normalise <blockquote> → <section>)
    4. Operator-promotion (P2.ii): for residual non-token CSS values, promote as inline style per block_supports gate

    MANDATORY DISPATCH BINDINGS — apply Binding A + B + C + D from the "Dispatch bindings" section at the top of this plan. Summary: NO commit authority (return uncommitted diff to main thread); /sgs-clone after EVERY code change (not bundled); living-docs + /capture-lesson inline; TodoWrite breakdown at start.

    PER-CHANGE VALIDATION:
    After each code change (each of the 4 Wave 2 changes + operator-promotion): run `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --deploy-target page:144 --debug-trace` immediately. Per-section pixel-diff via `scripts/pixel-diff.py --selector .sgs-{section}` at 375/768/1440. Record per-change cell deltas; report per-change in OUTPUT block.

    PER-CHANGE GATE (advisory to YOU, decision belongs to main thread): each change should improve at least one body cell by ≥ 5pp without regressing any cell by > 5pp. Flag any change that misses this in your OUTPUT block "Overall recommendation". DO NOT commit.

    Safety: no `git stash`; no `git commit`/`add`/`push` (per Binding A); branch discipline owned by main thread.

    OUTPUT: per the Required Output Block in the Dispatch bindings section. Specifically: TodoWrite final state + per-change uncommitted git diff + per-change /sgs-clone artefact paths + numeric deltas + living-docs updates made + /capture-lesson invocations + recommendation per change.

    Budget: 120 min wall-clock. STOP and report if exceeded.
  Test:
    Happy:       All 21 body cells ≤ 10%; hero stage_3_slot_list failures stay < 30; no regression on currently-matching sections
    Edge:        1-2 cells in 10-15% band → flag as "Step 1.7.6 candidate" + commit if structural improvement clear
    Fail:        Any cell regresses > 5pp from Step 1.7 baseline → revert + return to /qc-council
    Integration: Step 1.7.6 (F5 D1) consumes the ≤ 10% baseline and closes to ≤ 1%
```

## Step 1.7.6 — F5 D1 responsive variants (Gate 3 — final ≤ 1% closure)

```
Step 1.7.6 — Ship F5 D1 media-field flow → body cells ≤ 1% across 375/768/1440
  Model:       wp-sgs-developer (Sonnet 4.6)
  Action:      F5 D1 is the "media-field responsive variants" task — extracts `*Mobile` / `*Tablet` / `*Desktop` suffixed attrs from source mockup media queries and emits them as block attrs (per Spec 16 §FR6 D1 destination). This closes the mobile pixel-diff gap (the hero 375 +13.3pt regression traces here per archived Wave 2 plan line 201). After F5 D1 ships, every body cell at 375 + 768 + 1440 reaches ≤ 1%.
  Files:       plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py + plugins/sgs-blocks/scripts/orchestrator/converter_v2/slot_list.py (responsive-suffix lift logic) + relevant block.json files for attrs lacking *Mobile/*Tablet/*Desktop variants
  Inputs:      Step 1.7.5 QA pass (body cells ≤ 10%)
  Outcome:     Every body cell (21 cells) ≤ 1% pixel-diff. Phase 1 fully closed on the body side.
  Exec:        SEQUENTIAL
  Deps:        Step 1.7.5
  Marker:      (none)
  Time:        60-90 min
  Tooling:     Read, Edit, Bash, /sgs-clone, scripts/pixel-diff.py, /qc-inline
  On-Fail:     If any cell still > 1% after F5 D1 ships → investigate the specific cell + measurement-extension per ~/.claude/rules/measurement-vs-eye.md; may indicate a new-attribute-proposal (D3 candidate per Spec 16 R5) for the block.json
  Cold-Entry:  Spec 16 §FR6 D1 + archived plan line 201
  Test:
    Happy:       All 21 cells ≤ 1%; Phase 1 success criteria fully met
    Edge:        1-2 cells in 1-3% band → flag as Phase 3 polish parking entry (not Phase 1 close-blocker)
    Fail:        ≥ 3 cells > 3% OR any cell > 5% → return to /qc-council; may need new-attribute work (D3)
    Integration: closes the body-side gate; Phase 1 success criteria fully met; clean handoff to Phase 2 (chrome/header/footer cloner)
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
  Action:      Invoke /handoff. Update state.md (current_phase → "phase-2-header-footer-cloner"). Write next-session-prompt scoped to Phase 2 (reference 2026-05-24-phase-2-header-footer-cloner.md). Cite Phase 1 deltas: hero failures Y→Z, brand 1440 W→V, hooks A→B, role=content C→D. Note header/footer numbers from Stage 11 as Phase 2 entry baseline.
  Files:       .claude/handoff.md, .claude/next-session-prompt.md, .claude/state.md
  Inputs:      All Step 1.* complete + /qc-council gates passed
  Outcome:     Clean phase boundary; Phase 2 ready to start
  Exec:        SEQUENTIAL
  Deps:        Step 1.10 QA
  Marker:      HANDOFF
  Time:        15 min
  Tooling:     /handoff
  On-Fail:     If /handoff stalls → manual edit + commit
  Cold-Entry:  .claude/plans/2026-05-24-phase-2-header-footer-cloner.md
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

### Hidden-Decisions (2026-05-23 Step 1.4 cross-rater pass — Sonnet + Haiku)

- **Pre-empt 7 (BOTH RATERS — confirmed): Where exactly does the walker pre-pass plug into walk()?** Resolved in Step 1.6 cold prompt (item 4): pre-pass is per-section ONE-TIME, not recursive inside walk(); feeds ONLY the sgs/container fallback emit branch around convert.py:3946+; does NOT touch the FR1 fast path (which already works for hero + trust-bar).

- **Pre-empt 8 (Haiku — confirmed): block_compositions vs blocks.parent_block READ source ambiguity.** Resolved in Step 1.6 cold prompt (item 3): READ sources are `blocks.parent_block` (22 parented blocks) + `slot_synonyms.standalone_block`. `block_compositions` is WRITE-ONLY at runtime (zero readers in converter_v2/ confirmed by grep 2026-05-23).

- **Pre-empt 9 (Sonnet + Haiku — premature commit risk): Step 1.7 QA gate vs Step 1.6 acceptance gate misalignment.** Resolved by tightening Step 1.7 to 6 conditions (a-f) including the ≤1% × 21 cells gate AND failed-cell-list output to drive re-iteration. AND semantics enforced — no partial commits.

- **Pre-empt 10 (Sonnet — STALE-SPEC FALSE-POSITIVE caught by verification): variation_css_rules ≥ 8 gate already achievable.** Spec 16 §15:967 originally claimed hero variation_css_rules stuck at 0 from FR1 fast-path bypass. Verification (convert.py:3851-3859) shows the one-liner SHIPPED 2026-05-22 (Wave 2 Change 1). Spec corrected inline 2026-05-23. Gate is reachable.

- **Pre-empt 11 (Haiku — confirmed): CSS ownership algorithm undefined.** Resolved in Step 1.6 cold prompt (item 2): a class C owns rule R iff R's selector matches direct (`.C` / `tag.C`), descendant (`.parent .C` / `.parent > .C`), or compound (`.C.other`). EXCLUDE parent-qualified scope-breaks (already stripped by Stage 2 css_strip per common-wp-styling-errors §U).

- **Pre-empt 12 (Sonnet — header/footer side-effect ambiguity): Walker pre-pass might over-fit to header/footer DOM patterns.** Resolved in Step 1.6 cold prompt (SCOPE block): focus on 7 body sections only; header/footer regression > ±5% is a Spec 17 phase-boundary violation, not a walker bug; do NOT tweak walker to "fix" header/footer.

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
