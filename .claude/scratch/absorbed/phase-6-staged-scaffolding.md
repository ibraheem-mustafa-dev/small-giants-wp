---
doc_type: phase-plan
phase_id: 6
project: small-giants-wp
parent_spec: .claude/specs/14-CLONING-PIPELINE-CATALOGUE.md
parent_plan: .claude/plans/master-spec14-build-plan.md
title: Phase 6 — Staged scaffolding (FR11/12/13/14/19/20)
session_date: 2026-05-11
plan_label: PLAN opus (FR12/13/14 design) + PLAN sonnet (FR11/19/20 implementation)
estimated_minutes: 360-480
---

# Phase 6 — Staged scaffolding

**USP:** The pipeline's hands. After P6, every detected gap PRODUCES a staged mutation in `pipeline-state/<run-id>/staging/` — canonical untouched.

**Split into 4 sub-phases to manage scope + commit at boundaries:**

- P6a — Build mutex (FR20) + media sideloader (FR19) + pattern auto-scaffold (FR11). Independent infrastructure.
- P6b — Attribute staged-application (FR12) — block.json edits + deprecation templates.
- P6c — Functionality bulk-application (FR13) — extension toggles via /sgs-db impact.
- P6d — Atomic-block auto-scaffold (FR14) — 6-file block dir from template.

**Success criteria:**

- [ ] `pipeline-state/<run-id>/staging/` directory structure mirrors canonical layout
- [ ] `pipeline-state/<run-id>/build.lock` file mutex serialises npm builds across FR12 + FR14
- [ ] FR11 produces valid pattern PHP files at staging path
- [ ] FR12 produces block.json diffs + deprecated.js stubs (using P1 snapshots) at staging path
- [ ] FR13 produces multi-block.json diffs with `supports.sgs.<feature>=true` at staging path
- [ ] FR14 produces full 6-file block directories at staging path
- [ ] FR19 sideloads local image URLs to WP Media Library + rewrites attribute URLs
- [ ] Smoke test: Mama's mockup run produces non-zero staged artefacts; canonical files UNCHANGED
- [ ] 4 commits (one per sub-phase): `feat(p6a)`, `feat(p6b)`, `feat(p6c)`, `feat(p6d)`

**Entry context:** Spec 14 FR11/12/13/14/19/20. P1 static-block snapshots. P3 catalogue. P5 gap tables.

**Tooling Index:** Python + Edit + git + `/sgs-db impact` + `/wp-blocks validate` + `/wp-hook-graph validate` + WP REST API for media sideload (FR19).

---

## Sub-phase P6a — Build mutex + media sideloader + pattern auto-scaffold

### Step 1 — [SESSION-START] Pre-flight + create staging dir helper

```
Step 1 — Pre-flight + staging dir
  Model:       inline
  Action:      Master pre-flight. Build a Python helper `pipeline_state_paths(run_id)` that returns paths for `pipeline-state/<run-id>/staging/`, `pipeline-state/<run-id>/build.lock`, `pipeline-state/<run-id>/media-map.json`, etc.
  Outcome:     Helper exists; paths are predictable
  Marker:      SESSION-START
  Time:        10 min
  Cold-Entry:  master plan + spec 14 FR11/12/13/14/19/20
```

### Step 2 — FR20 build mutex

```
Step 2 — Build mutex helper
  Model:       sonnet
  Action:      Implement `acquire_build_mutex(run_id, timeout=300)` and `release_build_mutex(run_id)` at `plugins/sgs-blocks/scripts/recogniser/build_mutex.py`. Uses lock file at `pipeline-state/<run-id>/build.lock`. Acquire-or-wait pattern with timeout (default 5 min). Raises `BuildMutexTimeout` if can't acquire. Idempotent release.
  Files:       plugins/sgs-blocks/scripts/recogniser/build_mutex.py (new, ~80 LOC)
  Outcome:     Two concurrent calls serialise; second waits for first; timeout works
  Time:        25 min
  Tooling:     Write tool
  Test:
    Happy:       Sequential acquire/release succeeds
    Edge:        Stale lock from killed process → use lock file age check; force-acquire if > 1 hr old + log
    Fail:        Concurrent test: spawn 2 threads; both call acquire; one blocks until other releases
    Integration: FR12 + FR14 wrap npm build calls with this
```

### Step 3 — FR19 media sideloader

```
Step 3 — Media sideloader
  Model:       sonnet
  Action:      Implement `sideload_media(local_path, wp_base_url, app_password)` at `plugins/sgs-blocks/scripts/recogniser/media_sideloader.py`. Uses WP REST `/wp-json/wp/v2/media` POST with multipart upload. Returns dict { attachment_id, url, alt, width, height }. Cache results in `pipeline-state/<run-id>/media-map.json` keyed by SHA256 hash of file content (idempotency: re-runs skip uploads for known hashes). Update extract.py's image-extraction step to call this and replace local URLs with attachment IDs.
  Files:       plugins/sgs-blocks/scripts/recogniser/media_sideloader.py (new, ~150 LOC)
              tools/recogniser-v2/extract.py (small change: image strategy calls sideloader at deploy time)
  Outcome:     Local image references in mockup → WP attachment IDs in extracted attributes
  Time:        45 min
  Tooling:     Write tool + Python requests
  On-Fail:     WP REST 4xx → log + skip that image (mark `media-pending` in attribute); continue run
  Test:
    Happy:       Upload a test image; verify attachment ID returned + image accessible via /wp-content/uploads/...
    Edge:        Same image referenced twice → second call returns cached attachment ID via hash lookup
    Fail:        WP unreachable (timeout) → bail with clear error; pipeline run flags media-pending state
    Integration: FR21 deploy step happens AFTER media sideload completes
```

### Step 4 — FR11 pattern auto-scaffold

```
Step 4 — Pattern scaffolder
  Model:       sonnet
  Action:      Implement `scaffold_pattern(pattern_slug, block_markup, run_id)` at `plugins/sgs-blocks/scripts/recogniser/pattern_scaffolder.py`. Generates PHP file at `pipeline-state/<run-id>/staging/theme/sgs-theme/patterns/<slug>.php` with header comment block (Title / Slug / Categories / Description) + the captured serialised block markup body. Idempotent: skip if pattern with same slug already exists in `theme/sgs-theme/patterns/<slug>.php` (canonical).
  Files:       plugins/sgs-blocks/scripts/recogniser/pattern_scaffolder.py (new, ~120 LOC)
  Outcome:     Function exists; produces valid WP pattern PHP at staging path
  Time:        40 min
  Tooling:     Write tool
  Test:
    Happy:       Scaffold a pattern with 3 inner blocks; file content has correct header + body; `/wp-blocks validate` PASS on the markup
    Edge:        Pattern slug collides with existing canonical → idempotent skip + log
    Fail:        Markup body malformed → `/wp-blocks validate` FAIL → halt with diagnostic
    Integration: Stage 9 +REGISTER tail calls this for every pattern-gap row
```

### QA Gate P6a — Pre-build infrastructure ready

```
QA Gate — P6a integrity
  Model:       haiku
  Check:       Smoke-call each of the 3 helpers (mutex / sideloader / scaffolder) with a fixture; verify outputs exist at expected paths
  Pass:        3/3 PASS
  Marker:      QA
```

### Step 5 — [HANDOFF] Commit P6a

```
Step 5 — Commit
  Action:      Stage. Commit `feat(p6a): build mutex + media sideloader + pattern auto-scaffold`. Push.
  Marker:      HANDOFF
  Time:        3 min
```

## Sub-phase P6b — FR12 attribute staged-application

### Step 6 — [SESSION-START] Build attribute applicator

```
Step 6 — Attribute applicator
  Model:       opus inline
  Action:      Implement `apply_attribute(block_slug, attr_name, attr_def, run_id)` at `plugins/sgs-blocks/scripts/recogniser/attribute_applicator.py`. Logic:
    1. Read CURRENT `plugins/sgs-blocks/src/blocks/<slug>/block.json` (canonical, pre-mutation)
    2. Check if attribute with same name exists. If exists with same type → no-op (idempotency). If exists with different type → escalate operator review (log + flag).
    3. Add the new attribute to `attributes` field of a STAGED copy at `pipeline-state/<run-id>/staging/plugins/sgs-blocks/src/blocks/<slug>/block.json`
    4. If block is static (per P1 snapshot manifest), ALSO generate deprecated.js entry at `staging/plugins/sgs-blocks/src/blocks/<slug>/deprecated.js`. Content per FR12 spec: attributes (verbatim from P1 snapshot's attributes field), save function (verbatim from P1 snapshot's source_save — string-quoted as JS export), migrate function (returns existing attrs + new attr's default), isEligible (string-compare snapshot's compiled_save against current HTML).
    5. Update `attribute_gap_candidates.staged_at` to NOW; status stays `pending` until FR21 PASS.
  Files:       plugins/sgs-blocks/scripts/recogniser/attribute_applicator.py (new, ~180 LOC)
  Outcome:     Staged block.json + (for static blocks) deprecated.js exist for each promoted attribute
  Marker:      SESSION-START
  Time:        90 min
  Cold-Entry:  master plan + spec 14 FR12 + P1 snapshot manifest at tests/golden/static-block-snapshots/_manifest.json
  Tooling:     Write tool + Python json
  Test:
    Happy:       Add `letterSpacing` to sgs/hero → staged block.json has new field; sgs/hero is dynamic so no deprecated.js generated
    Edge:        Add attribute to static block (e.g. sgs/notice-banner) → staged deprecated.js generated with verbatim source_save from P1 snapshot
    Fail:        Conflicting type (existing string, new number) → log + escalate; do NOT stage the diff
    Integration: FR21 reads staged files; merges to canonical on PASS
```

### Step 7 — Wire FR12 into Stage 9 REPORT for attribute-gap rows

```
Step 7 — FR12 wiring
  Model:       sonnet
  Action:      In sgs-clone-orchestrator.py's Stage 9 (or +REGISTER tail), after gap-candidate rows are written by P5's router, iterate `attribute_gap_candidates WHERE status='pending' AND provenance=<run_id>` and invoke `apply_attribute()` for each. Capture failures (operator-review escalations) in the run's report.
  Files:       sgs-clone-orchestrator.py (modified)
  Outcome:     Per-run application loop wired in
  Time:        20 min
  Test:
    Happy:       Run pipeline; staged block.jsons exist matching gap rows
    Integration: FR21 staged-merge merges these
```

### QA Gate P6b

```
QA Gate — P6b
  Check:       Smoke run on hero with a fake gap entry → staged block.json contains the new attr; no canonical file mutated
  Pass:        Both checks PASS
  Marker:      QA
```

### Step 8 — [HANDOFF] Commit P6b

```
Step 8 — Commit
  Action:      Stage. Commit `feat(p6b): attribute staged-application + deprecated.js auto-gen`. Push.
  Marker:      HANDOFF
  Time:        3 min
```

## Sub-phase P6c — FR13 functionality bulk-application

### Step 9 — [SESSION-START] Build functionality extension applicator

```
Step 9 — Functionality applicator
  Model:       opus inline
  Action:      Implement `apply_functionality(feature_type, run_id)` at `plugins/sgs-blocks/scripts/recogniser/functionality_applicator.py`. Logic:
    1. Read `functionality_gap_candidates WHERE feature_type=? AND status='pending' AND provenance=<run_id>`
    2. Run `/sgs-db impact <existing-block-with-feature>` to enumerate ALL eligible blocks (those that render an interactive element + match the feature-type's eligibility criteria)
    3. For each eligible block, check if `supports.sgs.<feature>` is already true in canonical block.json. If yes → no-op (idempotency). If no → stage a block.json diff at `pipeline-state/<run-id>/staging/...` setting `supports.sgs.<feature>=true`.
    4. Build batch impact summary: which blocks were touched, which were no-ops, total LOC affected. Bundle into operator deliverable.
    5. Update functionality_gap_candidates.staged_at to NOW; status stays `pending`.
  Files:       plugins/sgs-blocks/scripts/recogniser/functionality_applicator.py (new, ~150 LOC)
  Outcome:     Bulk-staged block.json updates; no canonical mutation
  Marker:      SESSION-START
  Time:        60 min
  Cold-Entry:  master plan + spec 14 FR13 + P3 catalogue
  Tooling:     Write tool + `/sgs-db impact` subprocess
  Test:
    Happy:       Functionality gap on heritage-strip for hover-effects → audit shows 5 eligible blocks → 5 staged block.json diffs
    Edge:        Functionality gap where 0 eligible blocks exist → no-op + log
    Fail:        `/sgs-db impact` returns malformed output → halt + diagnostic
    Integration: FR21 merges these on PASS
```

### Step 10 — Wire into Stage 9 +REGISTER

```
Step 10 — FR13 wiring
  Model:       sonnet
  Action:      Add functionality-application loop alongside FR12 attribute-application loop in orchestrator's Stage 9.
  Files:       sgs-clone-orchestrator.py (modified)
  Time:        15 min
  Test:
    Happy:       Run pipeline; staged block.jsons exist for the bulk-applied feature
    Integration: FR21 merges
```

### QA Gate P6c

```
QA Gate — P6c
  Check:       Smoke run with synthetic functionality gap → staged diffs across ≥ 2 blocks; canonical untouched
  Marker:      QA
```

### Step 11 — [HANDOFF] Commit P6c

```
Step 11 — Commit
  Action:      Stage. Commit `feat(p6c): functionality bulk-application via /sgs-db impact audit`. Push.
  Marker:      HANDOFF
  Time:        3 min
```

## Sub-phase P6d — FR14 atomic-block auto-scaffold

### Step 12 — [SESSION-START] Build block scaffolder

```
Step 12 — Block scaffolder
  Model:       opus inline
  Action:      Implement `scaffold_block(component_libraries_row, extraction_artefacts, run_id)` at `plugins/sgs-blocks/scripts/recogniser/block_scaffolder.py`. Reads from `component_libraries WHERE is_gap_candidate=1`. Generates 6 files at `pipeline-state/<run-id>/staging/plugins/sgs-blocks/src/blocks/<slug>/`:
    - block.json: name, title, attributes (one per extracted slot), category, supports
    - edit.js: auto-generated InspectorControls per attribute type (TextControl for strings, ColorPicker for colours, UnitControl for spacing, etc.)
    - save.js: `export default function Save() { return null; }` (dynamic by default — sgs-db classifies as dynamic)
    - render.php: template echoing block content using `$attributes['x']` interpolation; matches the extracted markup shape
    - style.css: harvested Bucket-C scoped CSS for this block (from Stage 6 CLASSIFY output)
    - view.js: empty stub unless interactivity detected
  Pre-flight: invoke `/sgs-db impact <similar-existing-slug>` to gauge naming-collision risk.
  Hook validation: after scaffold, run `/wp-hook-graph validate <staging-block-dir>` to ensure no hallucinated hook references in render.php.
  Files:       plugins/sgs-blocks/scripts/recogniser/block_scaffolder.py (new, ~300 LOC)
  Outcome:     6 files exist per scaffolded block; `/wp-hook-graph validate` PASS; `/wp-blocks validate` PASS on a serialised example
  Marker:      SESSION-START
  Time:        120 min
  Cold-Entry:  master plan + spec 14 FR14 + P3 catalogue
  Tooling:     Write tool + `/sgs-db impact` + `/wp-hook-graph validate` + `/wp-blocks validate`
  Test:
    Happy:       Scaffold a fake gap block; build succeeds (`npm run build` in staging context); editor would load it (smoke test deferred to P9 visual-qa)
    Edge:        Block name collides with planned/reserved namespace → halt + escalate; do NOT overwrite
    Fail:        `/wp-hook-graph validate` FAIL → halt; missing hook ref means a fabricated function in render.php
    Integration: FR21 merges 6-file dir on PASS
```

### Step 13 — Wire into Stage 9 +REGISTER (with build mutex)

```
Step 13 — FR14 wiring + build invocation
  Model:       sonnet
  Action:      In orchestrator Stage 9, iterate `component_libraries WHERE is_gap_candidate=1 AND status='pending'`. Per row: acquire build mutex (FR20), invoke `scaffold_block()`, run `npm run build` against staging dir, release mutex. Capture build output in run report.
  Files:       sgs-clone-orchestrator.py (modified)
  Time:        25 min
  Test:
    Happy:       Build succeeds; staged build/ dir exists
    Edge:        Mutex timeout (concurrent FR12 also building) → wait + retry once
    Fail:        Build error → halt + bundle error in operator deliverable
    Integration: FR21 staged deploy uses the built artefacts
```

### QA Gate P6d

```
QA Gate — P6d
  Check:       Smoke run with synthetic component_libraries gap → 6-file dir staged; npm build succeeds; canonical block dirs untouched
  Marker:      QA
```

### Step 14 — [HANDOFF] Commit P6d

```
Step 14 — Commit
  Action:      Stage all P6d files. Commit `feat(p6d): atomic-block auto-scaffold with hook-graph validation`. Push.
  Marker:      HANDOFF
  Time:        3 min
```

## Phase 6 overall acceptance

After P6a + P6b + P6c + P6d all shipped:

- [ ] Smoke run on Mama's mockup produces non-zero staged artefacts in `pipeline-state/<run-id>/staging/`
- [ ] Canonical files (`plugins/sgs-blocks/src/blocks/*` + `theme/sgs-theme/*` + `theme/sgs-theme/styles/<client>.json`) UNCHANGED
- [ ] 4 P6 commits on origin/main: P6a, P6b, P6c, P6d
- [ ] Total LOC added: ~1000 across 6 new helper modules + orchestrator wiring
