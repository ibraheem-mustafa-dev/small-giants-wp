---
doc_type: phase-plan
project: small-giants-wp
phase: 3
phase_name: INNER_BLOCK_PATTERNS Retirement
session_marker: Step 3.4 (regression tests pass + pixel-diff clean) — safe session boundary before Step 3.5 commit
calibrated_time: ~60-105 min build + 15 min /qc-council + pixel-diff = ~75-120 min total
prerequisites: Phase 1 (merged sgs-framework.db with blocks.parent_block + slot_synonyms.standalone_block seeded by Phase 0)
parallel_with: Phase 2 (variations indexing) — can run in a parallel session after Phase 1 ships
qc_gate_after: /qc-council Stage 5 + per-section cropped pixel-diff via scripts/pixel-diff.py --selector .sgs-hero
generated: 2026-05-21
---

# Phase 3 — INNER_BLOCK_PATTERNS Retirement

## Plain-English goal

The mockup-to-WordPress converter (cv2) contains a hardcoded Python dict `INNER_BLOCK_PATTERNS` that tells it which parent blocks emit which child blocks. It currently has 2 entries — the hero CTA entry added in Wave 2 commit `ad706d0d` is the most recent. After this phase: the dict is deleted; cv2 reads `sgs-framework.db.blocks.parent_block` + `sgs-framework.db.slot_synonyms.standalone_block` for the same information. This is the DB-backed lookup that Phase 0 seeded and Phase 1 merged. The Wave 2 hardcoded hero entry becomes obsolete and is removed. Hero CTAs must still render correctly via the new DB path — regression tests confirm this explicitly. The adjacent-button grouping logic handles N CTAs (not just pairs). Silent NULL lookups from unseeded slots fire named warnings to `errors.log` instead of silently dropping blocks.

## Decisions in scope

- **Decision 24** (§3 Phase 3, §9.3) — RESOLVED in this session. Pattern Overrides is operator UX layer, NOT a converter logic replacement. DB-backed approach is the chosen path. Research report at `.claude/reports/2026-05-21-pattern-overrides-research.md`. **Phase 3 implementer must NOT re-investigate this.**
- **Decision 12** (§3 Phase 3) — Rewrite `_lift_inner_blocks` to `(node, parent_slug)` signature; delete `INNER_BLOCK_PATTERNS` dict; update all call sites

## Risk mitigations (from risk-assessment.md)

| Risk | Mitigation step |
|---|---|
| N=3+ CTA adjacent-grouping drops buttons — wrap-adjacent-siblings assumes pairs | Step 3.3: explicit regression tests for N=3 and N=4 before deleting the dict |
| slot_synonyms.standalone_block returns NULL for unseeded slots — silent omission | Step 3.2: WARNING log via Spec 20 structured pipeline log on every NULL lookup — named gap > invisible data loss |
| Decision 24 re-investigation wastes 30-45 min | Phase 3 cold prompt cites explicit "RESOLVED — do NOT re-investigate" with report path |
| INNER_BLOCK_PATTERNS references exist outside convert.py (test fixtures, docstrings) | Step 3.1: mandatory pre-dispatch grep — surfaces all references before the dict is deleted |
| Wave 2 hero entry deletion breaks hero CTA emission | Step 3.2 DB query path replaces it; test_hero_2_ctas regression test confirms hero CTAs still render |

## Pre-resolved decisions (from hidden-decisions.md)

- **Decision 24 status:** FULLY RESOLVED. Pattern Overrides is additive operator UX (Phase 6), not a converter replacement. DB-backed approach confirmed. Cold prompt must cite `.claude/reports/2026-05-21-pattern-overrides-research.md` and forbid re-investigation.
- **Adjacent grouping — same-parent definition:** siblings count as "same parent" when (a) same `parent_block` value in DB AND (b) no non-matching siblings between them in DOM. Use BeautifulSoup `find_next_sibling` iteratively.
- **Source filter in DB queries:** Phase 3's `_lift_inner_blocks` MUST add `WHERE source='sgs'` filter on both blocks and slot_synonyms queries (Phase 1 integration risk — native_wp rows would otherwise be returned intermixed).

---

## Steps

### Step 3.1 — Pre-dispatch grep audit (MANDATORY)

- **Action:** Run `grep -rn "INNER_BLOCK_PATTERNS" plugins/sgs-blocks/scripts/` and `grep -rn "INNER_BLOCK_PATTERNS" plugins/sgs-blocks/`. List every reference. If any reference is OUTSIDE `convert.py` (test fixtures, imports, docstrings, comment blocks), those files must be updated in this phase before the dict is deleted. Surface findings before writing any code.
- **Files:** Read-only grep pass; no writes yet
- **Inputs:** Current filesystem state; Phase 1 must have shipped before this runs
- **Outputs:** Complete list of `INNER_BLOCK_PATTERNS` references with file:line locations
- **Time:** 3-5 min
- **Tooling:** Bash grep; Read on any referenced files outside convert.py
- **On-Fail:** If grep finds references in files you cannot update (vendored library, generated output), flag to Bean before continuing — do not delete the dict leaving dangling references

### Step 3.2 — Rewrite `_lift_inner_blocks` with DB-backed lookup

- **Action:** Rewrite function signature from `_lift_inner_blocks(node: Tag, pattern: dict) -> list[str]` to `_lift_inner_blocks(node: Tag, parent_slug: str) -> list[str]`. New implementation:
  1. Opens sgs-framework.db connection (or uses existing shared connection)
  2. Queries `SELECT slug FROM blocks WHERE parent_block = ? AND source = 'sgs'` with `parent_slug` as param
  3. For each matched child slug, queries `SELECT slot_name FROM slot_synonyms WHERE standalone_block = ? AND source = 'sgs'`
  4. For each (child_slug, slot_name) pair, walks `node.find_all()` for descendant elements matching the slot's BEM class pattern
  5. Adjacent-sibling grouping: iterates `find_next_sibling` collecting siblings with matching `parent_block` until a non-matching sibling breaks the sequence; wraps the full group under one parent block
  6. On NULL return from slot_synonyms query: logs WARNING to Spec 20 structured pipeline log (`pipeline-state/<run>/errors.log` via the surface_pipeline_logs infrastructure). Named gap: "Slot '{slot_name}' for block '{child_slug}' has no standalone_block mapping in DB — slot omitted"
  7. Returns list of WP block markup strings
- **Files:** `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` (lines ~1303-1389 for the dict + function; lines ~3684-3812 for call sites)
- **Inputs:** Merged sgs-framework.db from Phase 1; Wave 2 commit `ad706d0d` as the hero entry being retired; Spec 20 structured pipeline log infrastructure in `surface_pipeline_logs.py`
- **Outputs:** New `_lift_inner_blocks` function that reads from DB; no dict; WARNING logs for NULL slots
- **Time:** 25-40 min
- **Tooling:** Edit tool (surgical edits to convert.py — do NOT rewrite the whole file); sqlite3 Python module; Grep for the 6 call sites at ~3684, ~3685, ~3756, ~3757, ~3811, ~3812
- **On-Fail:** If call sites are at different line numbers than documented (file has been modified since staging doc was written), use grep to find actual locations: `grep -n "_lift_inner_blocks\|INNER_BLOCK_PATTERNS" convert.py`. Never guess line numbers.

### Step 3.3 — Delete `INNER_BLOCK_PATTERNS` dict + update all call sites

- **Action:** Remove lines containing the dict definition and its comment block. Update ALL 6 call sites identified in Step 3.2 to call `_lift_inner_blocks(node, target_slug)` with the target block slug as `parent_slug`. The `target_slug` at each call site is the block being processed — it is already available in the surrounding function scope. Verify via `grep -n "INNER_BLOCK_PATTERNS" convert.py` returns 0 results.
- **Files:** `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py`
- **Inputs:** Step 3.2 completed; call-site line numbers confirmed via grep
- **Outputs:** Zero `INNER_BLOCK_PATTERNS` references in convert.py; all 6 call sites updated
- **Time:** 10-15 min
- **Tooling:** Edit tool; Bash grep for post-delete verification
- **On-Fail:** If any call site references a variable name that doesn't map to a parent_slug (e.g. the call site doesn't have a `target_slug` in scope), surface the context and ask Bean what the correct slug is — do not guess

### Step 3.4 — Write regression tests

- **Action:** Create `plugins/sgs-blocks/scripts/orchestrator/converter_v2/test_phase_3_inner_blocks.py` with 5 test cases. Each test constructs minimal BeautifulSoup HTML representing a mockup section + calls `_lift_inner_blocks(node, parent_slug)` + asserts the returned block markup.
  - `test_hero_2_ctas`: hero with 2 `.sgs-hero__cta` buttons → expect 1 `sgs/multi-button` containing 2 `sgs/button` blocks
  - `test_hero_3_ctas`: hero with 3 `.sgs-hero__cta` buttons → expect 1 `sgs/multi-button` containing 3 `sgs/button` blocks (no dropping)
  - `test_hero_4_ctas`: hero with 4 `.sgs-hero__cta` buttons → expect 1 `sgs/multi-button` containing 4 `sgs/button` blocks
  - `test_no_ctas`: hero with zero button descendants → expect empty list returned, no error
  - `test_unseeded_slot`: mockup node with a slot that has no `standalone_block` mapping → expect WARNING in errors.log + slot gracefully omitted from output (test checks log entry, not just absence from output)
- **Files:** CREATE `plugins/sgs-blocks/scripts/orchestrator/converter_v2/test_phase_3_inner_blocks.py`
- **Inputs:** Completed Step 3.2-3.3; sgs-framework.db with Phase 0 hero CTA slot seeding
- **Outputs:** 5 passing tests; test file committed alongside the convert.py change
- **Time:** 15-20 min
- **Tooling:** Python unittest or pytest; BeautifulSoup (already a convert.py dependency); sqlite3
- **On-Fail:** If test_hero_3_ctas or test_hero_4_ctas fails (adjacent-grouping bug), debug the `find_next_sibling` loop before committing. The N-button case must pass — do not commit a partial fix.
- **QC gate:** All 5 tests pass before proceeding to Step 3.5
- **Session marker:** Safe boundary — if time runs out after tests pass, commit the work done so far (Steps 3.1-3.4) with a WIP marker and continue pixel-diff + final commit in next session.

### Step 3.5 — Pixel-diff verification (per blub.db 256)

- **Action:** Run cv2 pipeline on Mama's Munches mockup: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --client mamas-munches --converter-v2`. Capture pre-run baseline metrics (extraction_failed count, variation_css_rules count) from the previous pipeline run. After Phase 3 run, compare. Per-section cropped pixel-diff on the hero section: `python scripts/pixel-diff.py --selector .sgs-hero` against the pre-Phase-3 baseline. Hero pixel-diff must not regress by >5%.
- **Files:** Read-only verification pass; no code changes
- **Inputs:** Deployed dev site (sandybrown); Phase 3 code in place; pixel-diff baseline from last clean run
- **Outputs:** Pixel-diff numbers per section; extraction_failed count (should not increase); confirmed hero CTAs still render
- **Time:** 10-15 min
- **Tooling:** Bash (pipeline run); `scripts/pixel-diff.py`; Playwright (for screenshot capture if needed)
- **On-Fail:** If pixel-diff regresses >5% on hero: do NOT commit; investigate which slot lookup is returning NULL (check `pipeline-state/<run>/errors.log`); fix the DB lookup before proceeding

---

## Acceptance criteria

- `grep -rn "INNER_BLOCK_PATTERNS" plugins/sgs-blocks/` returns 0 results
- All 5 regression tests pass (`python -m pytest test_phase_3_inner_blocks.py` exits 0)
- Hero section pixel-diff ≤ pre-Phase-3 baseline + 5% tolerance
- `test_unseeded_slot` test confirms WARNING entry appears in `pipeline-state/<run>/errors.log`
- `_lift_inner_blocks` function signature is `(node: Tag, parent_slug: str) -> list[str]`
- All 6 former call sites updated to new signature
- No references to the deleted dict outside convert.py

## Subagent cold prompt (for the orchestrator to dispatch)

```
You are implementing Decision 12 (INNER_BLOCK_PATTERNS retirement) from the SGS architecture programme.

# CRITICAL CONTEXT — read these FIRST before writing a single line of code

Decision 24 is RESOLVED. DO NOT re-investigate Pattern Overrides as an alternative. The full research report is at:
  .claude/reports/2026-05-21-pattern-overrides-research.md
The conclusion: Pattern Overrides is an operator UX layer (Phase 6 additive), NOT a replacement for converter logic. The DB-backed approach is the chosen path. This is final.

# Plain-English context

The mockup-to-WordPress converter (cv2) has a hardcoded Python dict `INNER_BLOCK_PATTERNS` that tells it which parent blocks emit which child blocks. After this phase: the dict is gone; cv2 reads from sgs-framework.db (merged in Phase 1). This is the fix for the "hero CTAs sometimes missing" bug traced to the hardcoded dict having stale/incomplete entries.

# Phase 1 must have shipped before you run

Check: python ~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py
All 8 assertions must pass. If any fail, STOP and report — Phase 3 cannot proceed until Phase 1's DB is correct.

# Read first

- .claude/plans/2026-05-21-architecture-staging.md §3 Phase 3 row + §11 Decision 24 resolution
- .claude/reports/2026-05-21-pattern-overrides-research.md — Decision 24 RESOLVED — do NOT re-investigate
- .claude/reports/strategic-plan-2026-05-21/risk-assessment.md Phase 3 section (3 risks)
- .claude/reports/strategic-plan-2026-05-21/hidden-decisions.md Phase 3 section
- plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py — use Grep first to find INNER_BLOCK_PATTERNS + _lift_inner_blocks line numbers (do NOT read the whole file — it is long)

# What to build — 5 steps

## Step 1: Pre-dispatch grep (MANDATORY, do this before touching any code)
grep -rn "INNER_BLOCK_PATTERNS" plugins/sgs-blocks/scripts/
List every reference with file:line. Surface any files outside convert.py — those need updates too. Do not proceed to Step 2 until this list is complete.

## Step 2: Rewrite _lift_inner_blocks
Current signature: _lift_inner_blocks(node: Tag, pattern: dict) -> list[str]
New signature:     _lift_inner_blocks(node: Tag, parent_slug: str) -> list[str]

New function body:
1. Query: SELECT slug FROM blocks WHERE parent_block = ? AND source = 'sgs'  ← MUST include source='sgs' filter
2. For each child_slug: SELECT slot_name FROM slot_synonyms WHERE standalone_block = ? AND source = 'sgs'
3. Walk node descendants matching slot BEM class pattern for each (child_slug, slot_name)
4. Adjacent-sibling grouping: iterate find_next_sibling() collecting siblings with same parent_block value until a non-matching sibling breaks the chain; wrap the entire collected group under ONE parent block emission
5. On NULL return from slot_synonyms: log WARNING to pipeline-state/<run>/errors.log via the Spec 20 surface_pipeline_logs infrastructure. Message: "Slot '{slot_name}' for block '{child_slug}' has no standalone_block mapping — omitted"
6. Return list of WP block markup strings

## Step 3: Delete INNER_BLOCK_PATTERNS dict
After rewriting the function in Step 2, remove the dict definition. Update ALL 6 call sites to call _lift_inner_blocks(node, target_slug) with the block slug that's already in scope at each call site.
Verify: grep -n "INNER_BLOCK_PATTERNS" convert.py → 0 results.

## Step 4: Regression tests
CREATE plugins/sgs-blocks/scripts/orchestrator/converter_v2/test_phase_3_inner_blocks.py
5 tests:
- test_hero_2_ctas: 2 .sgs-hero__cta buttons → 1 sgs/multi-button containing 2 sgs/button blocks
- test_hero_3_ctas: 3 .sgs-hero__cta buttons → 1 sgs/multi-button containing 3 sgs/button blocks
- test_hero_4_ctas: 4 .sgs-hero__cta buttons → 1 sgs/multi-button containing 4 sgs/button blocks
- test_no_ctas: zero button descendants → empty list, no error
- test_unseeded_slot: slot with no standalone_block mapping → WARNING in errors.log + graceful omission from output

All 5 must pass before Step 5.

## Step 5: Pixel-diff verification (blub.db 256)
Run: python sgs-clone-orchestrator.py --client mamas-munches --converter-v2
Then: python scripts/pixel-diff.py --selector .sgs-hero
Hero pixel-diff must not regress >5% vs pre-Phase-3 baseline. If regression: investigate errors.log, fix NULL lookup, rerun. Do NOT commit if regression >5%.

# Commit gate

Do NOT commit if:
- grep returns any INNER_BLOCK_PATTERNS references outside convert.py that you didn't update
- Any of the 5 regression tests fail
- Hero pixel-diff >5% regression
- WARNING log doesn't fire for test_unseeded_slot

Commit message: "feat(phase-3): retire INNER_BLOCK_PATTERNS — Decision 12 [qc:phase-3-self-verify]"

# Time budget

75 min realistic. 105 min ceiling. At ceiling, commit completed steps with WIP tag + report status.

# Safety clauses

Wave 2 hero entry from commit ad706d0d is deliberately retired by this phase — that is the expected outcome, not a regression.
DB queries MUST include source='sgs' filter on both tables to prevent native_wp rows from contaminating cv2 lookups.

# Methodology guardrails (do not skip)
- blub.db 254 — Read pipeline-state/<run>/leftover-buckets.json BEFORE conjecturing
- blub.db 255 — Multi-model /qc panel BEFORE every converter/pipeline/SGS-block commit (use Decision 31 hook from Phase 0.5)
- blub.db 256 — Per-section cropped pixel-diff, never full-page
- blub.db 272 — Schema enumeration BEFORE missing-X claims
- blub.db 276 — Council fix-shape proposals are hypotheses; empirical pre/post baseline required
- blub.db 281 — QC gate must be structural; commit messages MUST cite [qc:<run_id>] for converter/orchestrator path commits
- No git stash, reset --hard, restore, checkout --, clean -f
- No --no-verify
- No Co-Authored-By
- Commit by exact path (never `git add .` or -A)
- Stay on main directly
```

## Post-phase QC

/qc-council Stage 5 (Sonnet + Haiku + Gemini Flash + Cerebras):

1. **Sonnet primary:** Review new `_lift_inner_blocks` signature + DB query correctness; verify `source='sgs'` filter on both tables; confirm adjacent-grouping handles N>2
2. **Haiku cross-check:** Run 5 regression tests independently; confirm all pass; check test_unseeded_slot fires the WARNING log
3. **Gemini Flash:** Grep for any remaining `INNER_BLOCK_PATTERNS` references anywhere in `plugins/sgs-blocks/`
4. **Cerebras:** Pixel-diff verification — run `scripts/pixel-diff.py --selector .sgs-hero` and confirm ≤ pre-Phase-3 baseline + 5%

All 4 raters must agree before Phase 5a dispatches.
