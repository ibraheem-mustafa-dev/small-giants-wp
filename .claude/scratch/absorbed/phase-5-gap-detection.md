---
doc_type: phase-plan
phase_id: 5
project: small-giants-wp
parent_spec: .claude/specs/14-CLONING-PIPELINE-CATALOGUE.md
parent_plan: .claude/plans/master-spec14-build-plan.md
title: Phase 5 — Gap detection + leftover-bucket-router patch
session_date: 2026-05-11
plan_label: PLAN sonnet
estimated_minutes: 120
---

# Phase 5 — Gap detection

**USP:** Every clone produces a gap-candidate manifest. The library compounds.

**Success criteria:**

- [ ] `leftover-bucket-router.py` patched to split into 4 gap-level buckets (`pattern-gap`, `atomic-block-gap`, `attribute-gap`, `functionality-gap`) plus 3 existing (`animation-unclassified`, `extraction-failed`, `structural-mismatch-or-orphan`)
- [ ] Bucket C frequency tracker writes rows to `attribute_gap_candidates` (FR10) with `status='pending'`
- [ ] Functionality gap detector writes to `functionality_gap_candidates`
- [ ] Each gap row carries `confidence` field; entries < 0.7 skip auto-promotion at FR21
- [ ] Smoke test: Mama's mockup run produces ≥ 1 row in each new gap table
- [ ] Commit: `feat(p5): gap detection at 4 levels + status=pending lifecycle`

**Entry context:** Spec 14 FR9, FR10. `leftover-bucket-router.py` (existing, P7 ship). Layer 2 role-templates.json (from P3). `attribute_gap_candidates` + `functionality_gap_candidates` tables (from P2).

**Tooling Index:** Python sqlite3 + Edit tool + recursion-guard.py from P2 + git.

---

## Step 1 — [SESSION-START] Pre-flight

```
Step 1 — Pre-flight
  Model:       inline
  Action:      Master pre-flight. Read current `leftover-bucket-router.py`. Identify the existing 5-bucket router function.
  Marker:      SESSION-START
  Time:        5 min
  Cold-Entry:  master plan + spec 14 FR9 + FR10
```

## Step 2 — Patch leftover-bucket-router.py for 4 gap-level routing

```
Step 2 — Bucket router patch
  Model:       sonnet
  Action:      Refactor `route_leftover(entry)` to dispatch to one of 7 buckets (was 5):
    - pattern-gap: Stage 2 MATCH returned no SGS pattern slug for a section
    - atomic-block-gap: Stage 2 MATCH returned no SGS block slug for an atomic role within a section
    - attribute-gap: Bucket C entry on CSS property in role taxonomy + confidence ≥ 0.7
    - functionality-gap: pseudo-state/media-query/animation rule on block lacking matching extension
    - animation-unclassified: existing
    - extraction-failed: existing (Stage 4 returned None for a required slot)
    - structural-mismatch-or-orphan: existing
  Each bucket entry is dict shape: { kind, block_slug, evidence (specifics — selector/css_property/feature_type), confidence, provenance (run_id) }. Write to `attribute_gap_candidates` table (for attribute-gap), `functionality_gap_candidates` (for functionality-gap), `component_libraries.is_gap_candidate=1` (for atomic-block-gap), or `patterns.is_gap_candidate=1` (for pattern-gap). All writes use `status='pending'`.
  Files:       plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py (modified)
  Outcome:     Router handles 7 buckets correctly; writes to right uimax tables
  Time:        45 min
  Tooling:     Edit + Python sqlite3
  Test:
    Happy:       Mock 7 entries (one per bucket), router dispatches correctly
    Edge:        Entry with ambiguous shape → defaults to extraction-failed + logs
    Fail:        SQL constraint violation (duplicate UNIQUE) → handle with INSERT OR IGNORE + UPDATE seen_count + 1
    Integration: Stage 9 REPORT calls this router for every leftover
```

## Step 3 — Build Bucket C role-taxonomy classifier (FR10)

```
Step 3 — Bucket C classifier
  Model:       sonnet
  Action:      Add a `classify_bucket_c(entry)` helper. For each Bucket C entry (one-time-custom CSS declaration), check if its `css_property` is mapped in Layer 2 role-templates (any role's `css_property` field or `applies_to_attribute_names` list). If yes AND confidence ≥ 0.7: emit as attribute-gap; route via router (Step 2) to write `attribute_gap_candidates` with `status='pending'`. If no OR low confidence: keep as scoped wp:html style (existing behaviour).
  Files:       plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py (helper added)
  Outcome:     Function exists; correctly classifies a known-eligible CSS property as attribute-gap
  Time:        25 min
  Tooling:     Edit + Python
  Test:
    Happy:       `letter-spacing` on `.sgs-hero__headline` → attribute-gap with role-tag `number-css-px`
    Edge:        `clip-path` on `.sgs-hero` → no role match → scoped wp:html (existing path)
    Fail:        confidence < 0.7 → scoped wp:html, NO promotion
    Integration: Stage 6 CLASSIFY invokes this on every Bucket C entry
```

## Step 4 — Functionality gap detector

```
Step 4 — Functionality gap detector
  Model:       sonnet
  Action:      Add `detect_functionality_gap(stage5_harvest)` helper. Scan harvested CSS rules for: (a) pseudo-state selectors (`:hover`, `:focus`, `:active`) on a block lacking matching extension; (b) media-query variants with `@media (min-width: ...)` modifying attributes the block has no responsive variants for; (c) animation/transition rules on blocks without animation attributes. Emit functionality-gap entries with `feature_type` (hover|responsive|animation), `css_signal` (the matched selector + property), `block_slug`. Cross-reference current extensions registry: `supports.sgs.hoverEffects`, `supports.sgs.imageControls`, etc., to know which blocks already have which features.
  Files:       plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py (helper added)
  Outcome:     Function exists; correctly flags a block without hover-effects that has hover CSS rules in mockup
  Time:        30 min
  Tooling:     Edit + Python
  Test:
    Happy:       Hover CSS on sgs/card-grid where hoverEffects already enabled → no gap (already covered)
    Edge:        Hover CSS on sgs/heritage-strip where hoverEffects NOT enabled → emit functionality-gap
    Fail:        Block name not in registry → log + treat as gap
    Integration: Stage 5 HARVEST + Stage 9 REPORT
```

## Step 5 — Wire `provenance` and run_id stamping

```
Step 5 — Provenance + run_id
  Model:       haiku
  Action:      Ensure every gap-candidate row written by router carries `provenance = <run_id>`. Run ID format: `clone-<UTC-timestamp>-<short-hash>`. Source from `sgs-clone-orchestrator.py`'s existing `run_id` variable.
  Files:       leftover-bucket-router.py + sgs-clone-orchestrator.py (small change)
  Outcome:     All gap rows traceable to the run that created them
  Time:        10 min
  Test:
    Happy:       Row's provenance matches the run_id of the orchestrator invocation
    Integration: FR21 status flip queries by provenance to flip just this run's rows
```

## QA Gate — P5 acceptance

```
QA Gate — P5 integrity
  Model:       haiku
  Check:       Run mock-test that pushes 7 mock leftover entries through the router and verifies each landed in the correct table with status='pending' and correct provenance. Cross-check `attribute_gap_candidates` schema accepts the writes.
  Pass:        Stdout "PASS: 7/7 routing correct"
  Marker:      QA
```

## Step 6 — [HANDOFF] Commit P5

```
Step 6 — Commit
  Model:       inline
  Action:      Stage. Commit `feat(p5): gap detection at 4 levels with pending status lifecycle`. Push.
  Outcome:     Commit on origin/main
  Marker:      HANDOFF
  Time:        3 min
```
