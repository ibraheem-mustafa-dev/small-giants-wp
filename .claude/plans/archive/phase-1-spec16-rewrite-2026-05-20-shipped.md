---
doc_type: plan
project: small-giants-wp
plan_name: spec16-architectural-rewrite-and-future-capabilities
created: 2026-05-20
status: ACTIVE — Phase 1 sequential, Phase 2 parallel; both in same Opus session
predecessor_plan: shipped 2026-05-20 commit 8ceb8787 (Council R1 Stage 10 variation activation)
target_outcome: ≤ 5% per-section cropped pixel-diff at 1440/768/375 viewports for Mama's Munches mockup → page 144 clone, generalising to all future client clones
---

# Phase 1 + Phase 2 — Spec 16 Architectural Rewrite + Future Capabilities

Lightweight execution plan (Bean Option B per 2026-05-20 session). Skips the formal /strategic-plan 8-phase protocol because the implementation surface is already deeply analysed in `reports/2026-05-20-pipeline-root-gap-council/systematic-debugging.md`. Cold prompts pre-written for each step; multi-rater /qc panel + pixel-diff re-measure gate every commit.

## Current pipeline state (baseline for this plan)

- **C shipped (commit 8ceb8787):** Stage 10 variation activation via new `sgs/v1/active-variation` REST endpoint + read-back confirmation + exit code 3 on variation failure. Empirical: 18/21 pixel-diff cells improved post-C, avg -17pt (desktop -25pt, tablet -14pt, mobile -12pt).
- **Live canary:** page 144 on sandybrown (`https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/`) carries cv2 output with mamas-munches variation active.
- **Latest run dir:** `pipeline-state/mamas-munches-homepage-2026-05-19-222031/`
- **Residual gap:** sections still 20-78% mismatch. Dominant causes (per council R2 + R3): dead CSS selectors (mockup class names don't match render.php output) + Stage 0.7 verbatim CSS dump bypassing block attrs entirely.

## Binding rules (apply throughout)

1. Multi-rater /qc panel before every commit (Sonnet + Haiku + Gemini Flash; Cerebras allowed to no-op). blub.db row 255.
2. Schema enumeration via `python ~/.claude/hooks/wp-blocks.py dump` before any "missing X" claim. blub.db row 272.
3. Per-section cropped pixel-diff, never full-page. blub.db row 256.
4. Header + footer are template parts, NOT Gutenberg blocks. blub.db row 274 (4th occurrence already this session).
5. Read `leftover-buckets.json` before any pixel-diff conjecture. blub.db row 254.
6. Universal-extraction-no-per-block-legacy. No per-section patches.
7. No `git stash` / reset / checkout-- / restore / clean in subagents.
8. No `Co-Authored-By:` lines in commits.
9. Always merge to main (squash + delete branch + checkout main + pull).
10. `--exclude='plugins/sgs-blocks/src'` path-anchored in tar (NOT bare `--exclude='src'`). blub.db row 275.

## Phase 1 — Sequential (A → B)

A and B both touch `convert.py` value-lift path. B feeds D1 assignments to cv2; A applies token-snap to those D1-routed values. **Sequential, NOT parallel.**

### Step P1.A — Wire token_resolver.resolve_batch into cv2 value lift

**Goal:** every value lifted by cv2 (colour, spacing, font-size, shadow, font-family) gets snapped to a theme.json token reference when confidence ≥ 0.6. Bean's cascade-on-edit property activates — clients change global colour-2, every block using colour-2 updates.

**Files touched:**
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` — call `token_resolver.resolve_batch` in `_lift_root_supports_to_style` (line ~1998) and `_lift_core_block_style` (line ~1611) after extracting raw values; rewrite literal value to `css_var` when `confidence >= 0.6`; preserve literal when below threshold.
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` — populate `token_resolutions: <real list>` (lines 1195, 1296, 1353, 1394) using `token_resolver().resolve_batch()`; reflect new tokens via existing `_reflect_new_token_in_theme_json` helper.
- (No other files. ~100-150 LOC across two files.)

**Verification:**
- `python -c "import json; d=json.load(open('pipeline-state/<latest-run>/extract.json',encoding='utf-8')); print(sum(len(s.get('token_resolutions',[])) for s in d['per_section_results']))"` returns >0 (currently returns 0).
- Sample hero section in extract.json: `headlineColour: "text"` (current literal) becomes `headlineColour: "var(--wp--preset--color--text)"` OR remains `"text"` if the schema already uses palette slugs.
- /qc-inline runs the full pipeline (not isolated units) — confirms snap fires on `core/heading.fontSize`, `core/paragraph.color`, sgs/hero attrs.

**Acceptance criteria:**
- Per-section `token_resolutions` non-empty for every section.
- At least 50% of colour values across all sections snap (confidence ≥ 0.6) — typical Mama's mockup uses palette colours heavily.
- At least 30% of font-size values snap — Mama's uses sizes like 16/18/24px that match theme.json font-size presets.
- No regression: existing pipeline tests still green (`pytest plugins/sgs-blocks/scripts/orchestrator/ -k 'not slow'`).
- Live pipeline run succeeds + Stage 10 deploys to page 144.

**Expected pixel-diff impact:** -3 to -8pt on sections with high palette-colour density. Token references generally render identically to literals at the pixel level — the win is operator UX (cascade-on-edit), not pixel parity. P1.A alone may not move pixel-diff much; P1.B is where the bulk of the drop happens.

**Cold subagent prompt (Sonnet):**
```
You are implementing Step P1.A of `.claude/plans/phase-1-spec16-rewrite-2026-05-20.md` in the small-giants-wp repo. Wire token_resolver.resolve_batch into cv2's value-lift path so every lifted value snaps to a theme.json token reference when confidence ≥ 0.6.

READ FIRST:
1. `.claude/plans/phase-1-spec16-rewrite-2026-05-20.md` Step P1.A (this step's full context)
2. `reports/2026-05-20-pipeline-root-gap-council/systematic-debugging.md` Section "Issue A" (root cause writeup)
3. `plugins/sgs-blocks/scripts/orchestrator/token_resolver.py` (the resolver — understand resolve_batch signature)
4. `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` `_lift_root_supports_to_style` (line ~1998) and `_lift_core_block_style` (line ~1611) — current value-lift sites
5. `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` lines 462-568 (token_resolver lazy-loader + _reflect_new_token_in_theme_json helper) and lines 1190-1400 (per-section result construction with hard-coded `token_resolutions: []`)
6. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §FR6 Destination 1 (token-snap mechanic)

TASK:
1. In `convert.py`, after each value extraction in `_lift_root_supports_to_style` and `_lift_core_block_style`, collect the (block_slug, attr_name, raw_value) tuples into a list. Pass that list to `token_resolver().resolve_batch(items, theme_json, min_confidence=0.6)`. For each result with `confidence >= 0.6` AND `css_var` non-null, REPLACE the raw value in the emitted attrs dict with the css_var string. For results below threshold, KEEP the raw literal AND surface a row to `attribute_gap_candidates` via the existing `_record_gap_candidate` helper.
2. In `sgs-clone-orchestrator.py`, replace the 4 hard-coded `"token_resolutions": []` literal initialisations (lines 1195, 1296, 1353, 1394) with the actual list returned by `token_resolver().resolve_batch()`. For the cv2 branch, accumulate the resolutions during the per-section walk.
3. Existing `_reflect_new_token_in_theme_json` helper is wired — call it for each snapped result so newly-minted tokens land in the in-memory theme_json for downstream sections.

CONSTRAINTS:
- DO NOT touch token_resolver.py — the resolver itself is correct and unit-tested.
- DO NOT add fallback logic that skips the resolver when theme_json is empty — surface the empty-registry case as a warning per existing pattern in token_resolver.py:182.
- DO NOT delete any existing extracted_attributes — token-snap REWRITES values in place, doesn't drop them.
- Universal-extraction principle: code paths apply to ALL sections (hero, brand, social-proof, etc.), not Mama-specific.
- Schema enumeration before any "missing X" claim: `python ~/.claude/hooks/wp-blocks.py dump`.

VERIFICATION (after implementation):
1. Run `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --converter-v2 --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --skip-autonomy-gate --skip-register --mode draft --debug-trace` (NO --deploy-target — we test locally first).
2. Confirm `pipeline-state/<latest-run>/extract.json` has non-empty `token_resolutions` for every section.
3. Print the count: `python -c "import json; d=json.load(open('pipeline-state/<run>/extract.json',encoding='utf-8')); print(sum(len(s.get('token_resolutions',[])) for s in d['per_section_results']))"` — must return >0.
4. Run existing tests: `cd plugins/sgs-blocks && python -m pytest scripts/orchestrator/test_token_resolver.py -v` (8 tests, all should still pass).

DELIVERABLE: a single commit on main with:
- Modified `convert.py` (value-lift sites)
- Modified `sgs-clone-orchestrator.py` (4 hard-coded `[]` replaced)
- Commit message format: `feat(cv2): wire token_resolver into Stage 4 value lift — cascade-on-edit property activated`
- Include in the commit message: a token-resolution sample (3-5 example resolutions from the run) showing literal→token rewrites.

DO NOT push to main yet — the main thread runs the multi-rater /qc panel before merge. Report the commit hash + run dir.

NO `git stash`, NO `git reset --hard`, NO `git checkout -- <file>`, NO `git restore`, NO `git clean`. NO `Co-Authored-By:` in commit messages.
```

**/qc panel after Step P1.A (Sonnet + Haiku + Gemini Flash):** review the commit diff + the token-resolution sample. Verdict gates the push to main.

**Pixel-diff re-measure after Step P1.A:** `python reports/2026-05-20-pipeline-root-gap-council/run-pixel-diff-matrix.py` — save as `pixel-diff-post-P1A/`. Compare to `pixel-diff-before-C` and `pixel-diff/` (post-C). Document delta in `reports/2026-05-20-pipeline-root-gap-council/phase-1-progress.md`.

---

### Step P1.B — Replace Stage 0.7 verbatim CSS dump with four-destination router

**Goal:** every CSS rule from the mockup gets routed to its correct destination per Spec 16 §FR6. Block-attr-able values (colours, spacing, typography on identifiable blocks) lift into block attrs with token-snap (D1). Wrapper styles that have no attr destination ship to scoped variation CSS (D2). Global rules ship unscoped to variation CSS (D0). Genuinely-orphaned styling surfaces as `attribute_gap_candidates` (D3).

**Files touched:**
- NEW: `plugins/sgs-blocks/scripts/orchestrator/css_router.py` — module that parses mockup CSS via `tinycss2` or `cssutils`, classifies each rule by destination, returns per-section D1 assignments + buckets for D0/D2/D3.
- MODIFIED: `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` — `stage_0_7_css_lift` rewritten to use `css_router`. Writes D0 + D2 + D3-fallback rules to `theme/sgs-theme/styles/<client>.css`. Stages D1 assignments to a JSON sidecar in `pipeline-state/<run>/css-d1-assignments.json` for cv2 to consume.
- MODIFIED: `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` — cv2 walker reads `css-d1-assignments.json` instead of re-deriving via `_collect_css_decls_for_element`. The walker's existing token-snap (from P1.A) applies to lifted D1 values.
- NEW: `plugins/sgs-blocks/scripts/orchestrator/test_css_router.py` — unit tests for the router (each destination, edge cases).

**Estimated LOC:** ~300-500.

**Verification:**
- Schema enumeration via `wp-blocks dump` confirms `attribute_gap_candidates` table exists + schema is correct (today: 1009 rows).
- Unit tests: `python -m pytest plugins/sgs-blocks/scripts/orchestrator/test_css_router.py -v` — every destination has a passing test.
- Live pipeline: `pipeline-state/<run>/css-d1-assignments.json` exists, non-empty, schema-valid.
- `theme/sgs-theme/styles/mamas-munches.css` is SHORTER than today's 23,038-char verbatim dump (D1 rules removed). Likely 6,000-12,000 chars (D0 + D2 + D3-fallback only).
- Bean's "no licensing-validation" rule preserved — no licensing keyword scans introduced.

**Acceptance criteria:**
- 100% of mockup CSS rules land in exactly one of D0/D1/D2/D3 (counted in stage-9 surface).
- D1 lift rate: ≥ 40% of mockup rules lift into block attrs (the rest are wrapper/global/orphan).
- `mamas-munches.css` file size drops ≥ 30% from today's value.
- Block markup in `extract.json` carries more inline-style attrs than before P1.B (visible drop in `attribute_gap_candidates` row count for this run since D1 absorbs them).
- Live pipeline run succeeds + Stage 10 deploys to page 144.

**Expected pixel-diff impact:** This is where most of the residual gap closes. Predictions:
- Hero 1440: 67.8% → ~5-15% (the dead-CSS-selector problem resolves because cv2 emits the canonical render.php class names, and D1 lifts values into matching block attrs).
- Social-proof 1440: 56.8% → ~5-15%.
- Gift-section 1440: 47.4% → ~5-10%.
- Mobile cells: similar pattern but smaller absolute drops (mobile baseline already closer).

**Cold subagent prompt (Sonnet):**
```
You are implementing Step P1.B of `.claude/plans/phase-1-spec16-rewrite-2026-05-20.md`. Replace the Stage 0.7 verbatim CSS dump with the Spec 16 §FR6 four-destination router.

READ FIRST:
1. `.claude/plans/phase-1-spec16-rewrite-2026-05-20.md` Step P1.B (this step)
2. `reports/2026-05-20-pipeline-root-gap-council/systematic-debugging.md` Section "Issue B"
3. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §R5 + §FR6 (the four-destination policy — this is the authoritative spec)
4. `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` `stage_0_7_css_lift` (line 313-398) — current verbatim implementation
5. `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` `_collect_css_decls_for_element` (line ~2176) — the function cv2 uses today to re-derive CSS; will be replaced by reading the router's D1 sidecar
6. `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` (look for `property_suffixes` + role mapping — D1 routing needs this)
7. Sample mockup CSS to understand input: `sites/mamas-munches/mockups/homepage/index.html` lines 40-300 (the `<style>` block)
8. `~/.claude/hooks/wp-blocks.py dump | grep -E "attribute_gap_candidates|property_suffixes|design_tokens"` — schema enumeration BEFORE writing D3 inserts

TASK (build in this order):
1. Create `plugins/sgs-blocks/scripts/orchestrator/css_router.py`. Public API:
   ```python
   def route_css(css_text: str, parsed_blocks_meta: dict, theme_json: dict, run_id: str) -> dict:
       \"\"\"Returns {d0: [rules], d1: {block_id: {attr_path: value}}, d2: [rules], d3: [gap_candidates], stats: {...}}.\"\"\"
   ```
   - Parse css_text with `tinycss2` (already a project dep? if not, use `cssutils` — verify which exists via `pip show`).
   - For each rule, inspect the selector:
     - No class component + global element/pseudo (`body`, `:root`, `*`, `::before`) → D0.
     - Class component targets a known block-root or BEM child of a block-root → D1 candidate; look up `property_suffixes` to confirm the property maps to a typed attr; if yes → D1, if no → D3.
     - Class component but no matching block-root → D2 (ship in variation CSS scoped to `.page-id-N`).
2. Write `plugins/sgs-blocks/scripts/orchestrator/test_css_router.py` covering every destination + edge cases (empty CSS, malformed rules, multi-class selectors, @media queries, pseudo-class on classed selectors).
3. Replace `stage_0_7_css_lift` in `sgs-clone-orchestrator.py`:
   - Call `route_css()` on the mockup CSS.
   - Write D0 + D2 rules to `theme/sgs-theme/styles/<client>.css` (D0 first, D2 with `.page-id-N` scoping prepended).
   - Write D1 assignments to `pipeline-state/<run>/css-d1-assignments.json` (sidecar for cv2).
   - Write D3 rows to `attribute_gap_candidates` table (via existing `_record_gap_candidate` if signature compatible, OR direct DB insert with sanitised values).
   - Surface stats in stage-9 report.
4. Update `convert.py` to read `css-d1-assignments.json` instead of `_collect_css_decls_for_element` re-derivation. Specifically: when `_lift_root_supports_to_style` and `_lift_core_block_style` need CSS context for a section, load the section's slice from the D1 sidecar.
5. Keep `_collect_css_decls_for_element` as a fallback used ONLY when `css-d1-assignments.json` is missing (graceful degradation for runs that don't use Stage 0.7's new path).

CONSTRAINTS:
- Universal-extraction-no-per-block-legacy: no Mama-specific routing logic.
- Spec 16 hard rule: every CSS rule MUST hit one of D0/D1/D2/D3. If a rule can't route, log halt-level error.
- Header + footer chrome-skip: rules whose selectors target `<header>`, `<footer>`, `<nav>` top-level elements get NO D2 emission (they're template parts; their styling lives in the template part patterns, not variation CSS).
- No licensing-validation infrastructure. No keyword scans. Cloning has no licensing concept (mistakes.md 2026-05-21 + blub.db row 213).

VERIFICATION (after implementation):
1. Unit tests pass: `cd plugins/sgs-blocks && python -m pytest scripts/orchestrator/test_css_router.py -v`.
2. Live pipeline run completes cleanly (existing 21-cell run command from Step P1.A).
3. `pipeline-state/<run>/css-d1-assignments.json` exists, schema-valid.
4. `theme/sgs-theme/styles/mamas-munches.css` is shorter than the 23,038-char baseline (compare with `wc -c`).
5. Stage 9 report counts: D0 + D1 + D2 + D3 sum to 100% of parsed rules.
6. Spot-check 3 sections in `extract.json` — each carries more inline-style block attrs than the post-P1.A baseline.

DELIVERABLE: a single commit on main with:
- NEW `css_router.py` + `test_css_router.py`
- MODIFIED `sgs-clone-orchestrator.py:stage_0_7_css_lift`
- MODIFIED `convert.py` to read D1 sidecar
- Commit message format: `feat(pipeline): replace Stage 0.7 verbatim CSS dump with Spec 16 §FR6 four-destination router`
- Include in the commit message: routing stats from the live run (D0/D1/D2/D3 counts).

NO destructive git operations. NO Co-Authored-By.
```

**/qc panel after Step P1.B (Sonnet + Haiku + Gemini Flash):** review the new module + spec compliance + unit test coverage + the destination distribution stats. Verdict gates push.

**Pixel-diff re-measure after Step P1.B:** save as `pixel-diff-post-P1B/`. Headline metric: how many 1440 cells reached ≤ 5%? How many mobile cells reached ≤ 10%? Document in `phase-1-progress.md`.

---

### Step P1.C — Phase 1 wrap-up gate

After P1.A + P1.B both committed and pushed:
1. Re-run full 21-cell pixel-diff matrix (clean baseline).
2. Compute deltas across all four baselines: before-C / post-C / post-P1A / post-P1B.
3. Verify: header + footer not scaffolded as blocks (4th-occurrence check — `ls plugins/sgs-blocks/src/blocks/header plugins/sgs-blocks/src/blocks/footer` must return error).
4. Document Phase 1 outcome in `reports/2026-05-20-pipeline-root-gap-council/phase-1-outcome.md`.
5. **GO/NO-GO gate to Phase 2:** if pixel-diff at 1440 across 7 sections averages ≤ 10% AND mobile averages ≤ 15%, Phase 1 PASSES. If not, Phase 2 still proceeds but flag the gap for next session's investigation.

---

## Phase 2 — Parallel (four concurrent Sonnet subagents)

Four steps. All touch DIFFERENT files. Dispatchable in parallel.

- **P2.0** — Header/footer/nav blocker hook (structural enforcement against 4th-occurrence anti-pattern). Independent of capabilities (i)/(ii)/(iii).
- **P2.i** — Capability (i): tighten Stage 9b autonomy chain so 100% of unmatched sections scaffold cleanly into new SGS blocks. Today scaffolded=2/promoted=2, but `block-scaffolder.py` output quality is uneven (some scaffolds emit incomplete block.json / render.php).
- **P2.ii** — Capability (ii): attribute-gap promotion stage. `attribute_gap_candidates` (1,009 rows) become block.json schema additions when operator approves.
- **P2.iii** — Capability (iii): block-variation system for "essence-match-with-differences" via `register_block_variation()` + Block Style Variations.

### Step P2.0 — Header/footer/nav blocker hook (structural enforcement)

**Goal:** make the 5th occurrence of `src/blocks/header/` + `src/blocks/footer/` recurrence IMPOSSIBLE via PostToolUse hook. Prompt-discipline has failed 4 times (blub.db row 274). This step is independent of capability (i) — it's pure defence-in-depth at the tool layer.

**Files touched:**
- NEW: `.claude/hooks/no-header-footer-block.py` (PostToolUse hook) — hard-rejects Write/Edit on `plugins/sgs-blocks/src/blocks/(header|footer|nav)/`.
- MODIFIED: `.claude/settings.json` — wires the hook in `hooks.PostToolUse`.

**Estimated LOC:** ~40-60.

**Verification:**
- Test the hook directly: try a Write call to `plugins/sgs-blocks/src/blocks/header/block.json` — hook returns non-zero with clear error.
- Hook does NOT block legitimate template-part edits at `theme/sgs-theme/parts/header.html` or `theme/sgs-theme/parts/footer.html`.
- Hook does NOT block edits to files with `header` or `footer` in the name outside `src/blocks/` (e.g. `mobile-nav-renderer.php`, `core-blocks-critical.css`, `header-helpers.php`).

**Cold subagent prompt (Sonnet):**
```
Implement Step P2.0 per `.claude/plans/phase-1-spec16-rewrite-2026-05-20.md`. Goal: prevent the 5th occurrence of `src/blocks/header/` + `src/blocks/footer/` being scaffolded as Gutenberg blocks. This is the 4th time (blub.db row 274). Prompt-discipline has failed; structural enforcement at the tool layer.

READ:
1. `.claude/plans/phase-1-spec16-rewrite-2026-05-20.md` Step P2.0
2. `.claude/parking.md` P-NO-HEADER-FOOTER-BLOCK-HOOK (the parked entry, ~30 LOC estimate)
3. `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S1-2 (template-part architecture — what header/footer ARE)
4. Existing PostToolUse hook example: `grep -rln "PostToolUse" .claude/settings.json .claude/hooks/`
5. CC hook output schema: `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_cc_hook_schema_decision_allow.md` (use `permissionDecision: "allow"` not `decision: "allow"`; `systemMessage` not `message`; `decision: "block"` is valid).

TASK:
1. Create `.claude/hooks/no-header-footer-block.py`. PostToolUse hook that:
   - Triggers ONLY on Write OR Edit tool calls
   - Reads tool input from stdin (CC standard hook payload)
   - Rejects if `file_path` matches the regex `plugins/sgs-blocks/src/blocks/(header|footer|nav)(/|$)` (path-anchored)
   - Returns JSON `{"decision": "block", "reason": "Header/footer/nav are template parts per Spec 17, NOT Gutenberg blocks. 5th-occurrence prevention via PostToolUse hook (blub.db row 274). To edit template parts, edit theme/sgs-theme/parts/header.html or footer.html. To override, delete this hook from .claude/settings.json."}` (per CC hook schema feedback).
   - Exit code 2 to block (per CC hook convention).
2. Register the hook in `.claude/settings.json` under `hooks.PostToolUse`:
   ```json
   {
     "matcher": "Write|Edit",
     "hooks": [{"type": "command", "command": "python .claude/hooks/no-header-footer-block.py"}]
   }
   ```
3. Test the hook: write a temporary test script that simulates the hook input (`{"tool_name": "Write", "tool_input": {"file_path": "plugins/sgs-blocks/src/blocks/header/block.json"}}`) and pipes it to the hook. Confirm exit code 2 + correct decision JSON.
4. Test the negative case: same script with `file_path: "theme/sgs-theme/parts/header.html"` — confirm exit code 0 (no decision returned, tool proceeds).
5. Test path-traversal edge case: `file_path: "header"` (just the filename, no `src/blocks/` prefix) — confirm exit code 0 (not under the protected path).

CONSTRAINTS:
- Hook must NOT block edits to:
  - `theme/sgs-theme/parts/header.html`, `theme/sgs-theme/parts/footer.html` (legitimate template parts)
  - `plugins/sgs-blocks/includes/class-sgs-header-rules.php`, `class-sgs-footer-rules.php` (rules engines per Spec 17)
  - `plugins/sgs-blocks/src/blocks/mobile-nav/` (mobile-nav is a legitimate block, NOT a chrome anti-pattern)
  - `plugins/sgs-blocks/assets/css/*-critical.css` or similar that mention "header" in CSS rules
- Regex must use `(header|footer|nav)(/|$)` boundary, NOT a substring match. Test thoroughly.
- Hook NEVER auto-modifies files. Reject-only.

DELIVERABLE: a single commit on main with:
- NEW `.claude/hooks/no-header-footer-block.py`
- MODIFIED `.claude/settings.json`
- Commit message: `feat(hooks): PostToolUse blocker for src/blocks/(header|footer|nav)/ — 5th-occurrence prevention`
- Include the test simulation script's output (positive + negative + edge case) in the commit message body.

NO destructive git operations. NO Co-Authored-By.
```

---

### Step P2.i — Capability (i): Tighten Stage 9b autonomy chain (100% clean scaffolds)

**Goal:** every unmatched section that SHOULD become a new SGS block does — cleanly, with valid block.json + render.php + edit.js + style.css + index.js, ready for the operator to promote into the catalogue. Today's run scaffolded 2 + promoted 2, but scaffold output quality is uneven (incomplete attrs schema, missing render.php for some scaffolds, no edit.js for others).

**Files touched:**
- `plugins/sgs-blocks/scripts/orchestrator/stage_9b_autonomy.py` (confirm via grep) — orchestration of the scaffold + promote chain.
- `plugins/sgs-blocks/scripts/orchestrator/block_scaffolder.py` (or wherever block-scaffolder lives — grep) — the actual scaffold generator.
- Section chrome-skip list addition: when section's top-level tag is `<header>`/`<footer>`/`<nav>` OR top-level class contains `header|footer|nav` BEM root, route to template-parts pathway instead of block-scaffolding (this prevents the autonomy chain CAUSING the 4th-occurrence anti-pattern that P2.0 prevents at the tool layer).

**Estimated LOC:** ~100-180.

**Verification:**
- Run pipeline on Mama's mockup: every scaffolded block has valid `block.json` (`wp-blocks validate <markup>` returns valid), non-empty `render.php`, working `edit.js`, registered correctly.
- Stage 9b output includes a `scaffold_quality_report` listing each scaffolded block with a quality score (e.g. 5/5 if all five files present + valid).
- No header/footer/nav directories appear under `src/blocks/` after the run (the autonomy chain skips them at SOURCE; P2.0 hook is the safety net).

**Cold subagent prompt (Sonnet):**
```
Implement Step P2.i per `.claude/plans/phase-1-spec16-rewrite-2026-05-20.md`. Goal: every unmatched section scaffolds cleanly — valid block.json + non-empty render.php + functional edit.js + style.css + index.js. Today's quality is uneven.

READ:
1. `.claude/plans/phase-1-spec16-rewrite-2026-05-20.md` Step P2.i
2. `reports/2026-05-20-pipeline-root-gap-council/systematic-debugging.md` Phase 2 (i)
3. Grep for autonomy + scaffolder files: `grep -rln "stage_9b\|block_scaffolder\|scaffold" plugins/sgs-blocks/scripts/ | head -10`
4. Sample existing block to use as template structure: `plugins/sgs-blocks/src/blocks/info-box/` (block.json + edit.js + render.php + style.css + index.js + view.js if applicable)
5. `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S1-2 (template-parts NOT blocks — for the chrome-skip logic)

TASK:
1. Audit current scaffolder output: run pipeline on Mama's, inspect `pipeline-state/<run>/stage-9b.json` + `src/blocks/<scaffolded-slug>/` for the 2 scaffolded blocks. Document what's missing.
2. Tighten the scaffolder to produce ALL FIVE files per scaffold:
   - `block.json` (with valid `name`, `title`, `category`, `attributes`, `supports`)
   - `render.php` (non-empty — emits the slot markup with the attribute-bound classes)
   - `edit.js` (inspector controls for every attr in block.json — even if just text inputs as placeholders)
   - `style.css` (frontend + editor styles, BEM-prefixed)
   - `index.js` (block registration with deprecation array empty)
3. Add the section chrome-skip list to the autonomy entry point: when the unmatched section's selector or class signature matches `(header|footer|nav)` BEM root OR top-level tag is `<header>`/`<footer>`/`<nav>`, DO NOT call the scaffolder. Surface as `unmatched-chrome-skipped` in stage 9 output instead.
4. Add a `scaffold_quality_report` to stage-9b.json: per scaffolded block, score 0-5 (one point per file present + valid).
5. /qc-inline against the live pipeline (not isolated units): every scaffolded block must score 5/5.

CONSTRAINTS:
- Universal-extraction-no-per-block-legacy: scaffolder must work for ANY unmatched section, not Mama-specific.
- Header/footer/nav chrome-skip is the SOURCE-LEVEL prevention; P2.0 hook is the tool-layer safety net. Both ship — defence in depth.
- Subagent collaboration note: P2.0 may ship before this step. If you see `.claude/hooks/no-header-footer-block.py` already present, that's fine — your work is the source-side fix.
- Schema enumeration before any "missing column" claim.

DELIVERABLE: a single commit on main with:
- Modified `stage_9b_autonomy.py` (chrome-skip + quality report)
- Modified `block_scaffolder.py` (5-file generation)
- Commit message: `feat(autonomy): 100% clean scaffolds — five-file generation + scaffold quality report + chrome-skip header/footer/nav`
- Include in commit message: the scaffold_quality_report from a live test run (Mama's mockup).

NO destructive git operations. NO Co-Authored-By.
```

---

### Step P2.ii — Capability (ii): Attribute-gap promotion stage

**Goal:** `attribute_gap_candidates` (today 1,009 rows) become actual block.json schema additions when operator approves.

**Files touched:**
- NEW: `plugins/sgs-blocks/scripts/orchestrator/stage_attribute_promotion.py` — operator-driven CLI that surfaces top-confidence candidates, asks for promotion confirmation, mutates the matching block.json + render.php to support the new attr.
- MODIFIED: `~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` (or `/sgs-update`) — integration: `python plugins/sgs-blocks/scripts/orchestrator/stage_attribute_promotion.py --top 10` surfaces candidates ranked by occurrence count × confidence.
- NEW: tests for the promotion logic.

**Estimated LOC:** ~150-250.

**Verification:**
- `python ~/.claude/hooks/wp-blocks.py dump | grep attribute_gap_candidates` — schema enumeration confirms.
- Run the new CLI in `--dry-run` mode — top 10 candidates surface with confidence scores.
- Operator approves 1 candidate (e.g. `sgs/button: hoverScale`) — block.json + render.php updated.
- Pipeline re-run picks up the new attr — gap candidate for `hoverScale` no longer surfaces for sgs/button.

**Cold subagent prompt (Sonnet):**
```
Implement Step P2.ii per `.claude/plans/phase-1-spec16-rewrite-2026-05-20.md`. Goal: operator-driven promotion of attribute_gap_candidates into block.json schema additions.

READ:
1. `.claude/plans/phase-1-spec16-rewrite-2026-05-20.md` Step P2.ii
2. `reports/2026-05-20-pipeline-root-gap-council/attribute-gap-candidates.txt` (DB snapshot)
3. Schema dump: `python ~/.claude/hooks/wp-blocks.py dump | grep -B1 -A2 attribute_gap_candidates`
4. Sample block.json: `plugins/sgs-blocks/src/blocks/button/block.json` (typical attribute schema)
5. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §FR6 D3 (the gap-candidate spec)

TASK:
1. Create `plugins/sgs-blocks/scripts/orchestrator/stage_attribute_promotion.py`. CLI:
   - `python stage_attribute_promotion.py list --top 10` — lists top candidates by occurrence × confidence (ranked).
   - `python stage_attribute_promotion.py promote --id <row_id>` — surfaces the candidate's full context (block_slug, css_property, sample values, occurrence count), asks operator to confirm + provide attr_type + default_value, then:
     - Adds the attr to `plugins/sgs-blocks/src/blocks/<slug>/block.json` under `attributes`.
     - Adds an inline-style branch to `render.php` (or `style-index.css` if non-instance).
     - Marks the DB row as `promoted: true` with `promoted_at`, `promoted_to_block`.
   - `python stage_attribute_promotion.py status` — counts promoted vs pending.
2. Manual confirmation gate (operator must type "promote" to proceed) for safety.
3. Idempotency: re-running with the same `row_id` is a no-op if already promoted.
4. Write tests for the CLI + the block.json mutation logic.

CONSTRAINTS:
- Universal-extraction principle: code paths apply to ALL block_slugs, not Mama-specific.
- Schema enumeration before writing: confirm the candidate's `block_slug` exists in `blocks` table.
- DO NOT bulk-promote without operator confirmation — every promotion is a deliberate schema change.

DELIVERABLE: commit with NEW script + tests + commit message `feat(orchestrator): attribute-gap promotion stage — operator-driven block.json schema additions`.

NO destructive git operations. NO Co-Authored-By.
```

---

### Step P2.iii — Block-variation system

**Goal:** when cv2 matcher detects "looks like sgs/X with 70-90% confidence + attribute differences," route to `register_block_variation()` OR Block Style Variations instead of scaffolding a new block.

**Files touched:**
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` — block-variation detection in the matcher tier (between full-match and unmatched).
- NEW: `plugins/sgs-blocks/includes/variations/` directory with variation registrations per block.
- MODIFIED: matcher confidence-tier logic in `plugins/sgs-blocks/scripts/orchestrator/match.py` (or equivalent).

**Estimated LOC:** ~200-300.

**Verification:**
- Mockup with a section that's "product-card with featured styling" → cv2 emits `wp:sgs/product-card {variant:'featured'}` instead of `wp:sgs/featured-product-card`.
- New variation registrations show up in WP Admin block inserter under the parent block.

**Cold subagent prompt (Sonnet):**
```
Implement Step P2.iii per `.claude/plans/phase-1-spec16-rewrite-2026-05-20.md`. Goal: cv2 detects "essence-match-with-differences" and routes to register_block_variation() instead of scaffolding a new block.

READ:
1. `.claude/plans/phase-1-spec16-rewrite-2026-05-20.md` Step P2.iii
2. `reports/2026-05-20-pipeline-root-gap-council/systematic-debugging.md` (Phase 2 (iii) section)
3. WordPress docs for `register_block_variation()` and Block Style Variations — `/library-docs` if needed.
4. `plugins/sgs-blocks/scripts/orchestrator/match.py` (matcher confidence-tier logic) — grep for it
5. `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` (cv2 dispatch)

TASK:
1. Add a new matcher tier: "essence-match-with-differences" fires when confidence is 0.70-0.90 AND the candidate block already exists in the catalogue.
2. When this tier fires, detect WHAT the differences are:
   - Pure CSS preset differences (just style changes) → Block Style Variation (CSS preset only, no schema change).
   - Pre-filled attribute differences (e.g. `variant: 'featured'`, `size: 'large'`) → `register_block_variation()` (named variation, inserter discoverable).
3. Create `plugins/sgs-blocks/includes/variations/` directory. Per-block PHP files (e.g. `sgs-product-card-variations.php`) register variations via `wp_enqueue_script` on `enqueue_block_editor_assets`.
4. cv2 emits block markup using the existing block name + the variation attrs, NOT a new block.

CONSTRAINTS:
- Universal-extraction principle.
- Schema enumeration before block-existence claim.
- Block Style Variations live in `block.json` `styles` array OR `register_block_style()` PHP call.

DELIVERABLE: commit with cv2 detection + variations directory + matcher tier logic + commit message `feat(cv2): block-variation system for essence-match-with-differences`.

NO destructive git operations. NO Co-Authored-By.
```

---

## Phase 2 wrap-up

After all three P2 subagents complete + commit + /qc panels pass + merge:
1. Run final 21-cell pixel-diff matrix.
2. Document Phase 2 outcome in `reports/2026-05-20-pipeline-root-gap-council/phase-2-outcome.md`.
3. Update `.claude/state.md` + `.claude/handoff.md` + `.claude/decisions.md` per the docs-registry walk.
4. Final commit + push.
5. `/handoff` to close session.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| P1.A token-snap rewrites a value that breaks rendering (e.g. mismatched css_var reference) | Medium | High | Confidence threshold ≥ 0.6; below-threshold values stay literal. Live pipeline run verifies. /qc panel catches before push. |
| P1.B css_router classification logic is wrong for some rule (drops styling) | High | High | Hard rule: every rule routes to D0/D1/D2/D3 — no silent drops. Unit tests cover all destinations. D3 fallback to D2 ensures degraded mode. |
| Cerebras free-tier queue stalls during /qc panel | High | Low | Already a known pattern; 3-rater panel sufficient (Sonnet + Haiku + Gemini Flash). Cerebras absence non-blocking. |
| Gemini Flash fabricates file:line citations in /qc | High | Medium | Verify-by-grep binding rule. Main thread grep-confirms before relaying. |
| Phase 2.i hook regex too broad — blocks legitimate edits | Low | Medium | Path-anchored regex matches `src/blocks/(header\|footer\|nav)/` segment only. Tests cover edge cases (header-style.css, etc.). |
| Phase 2.iii block-variation detection mis-classifies a unique block as a variation | Medium | Medium | Confidence threshold 0.70-0.90 narrow band. Below 0.70 still scaffolds new. Above 0.90 emits as full match. |
| Subagent uses git stash and loses tracked work | Low | Critical | Cold prompts explicitly forbid `git stash`/reset/checkout--/restore/clean. blub.db row 248. |
| Subagent re-creates src/blocks/header/ — 5th occurrence | Medium | Critical | P2.0 PostToolUse hook ships first within Phase 2 dispatch wave (or as soon as the subagent returns). Tool-layer enforcement makes the directory creation impossible. P2.i adds source-side chrome-skip on the autonomy chain (defence in depth). Even a wandering subagent gets hard-blocked at the Write/Edit tool boundary. |
| Phase 2 dispatch order matters for the hook — if P2.i, P2.ii, P2.iii run before P2.0 lands, a subagent could re-create header/ during their work | Medium | Critical | Dispatch P2.0 in the FIRST parallel wave; explicitly mention in the other three subagents' prompts that the hook is shipping concurrently and they must not attempt to write under src/blocks/(header\|footer\|nav)/ regardless. |

## ADHD-safe entry point (first action ≤ 5 min)

Run this command to dispatch the P1.A subagent:

```bash
# Verify clean working tree
cd C:/Users/Bean/Projects/small-giants-wp && git status --short
# (expect only pre-existing .claude/next-session-prompt.md + deletion + tracked auto-regens)
```

Then main thread dispatches the P1.A Sonnet subagent with the cold prompt from this plan.

## Estimated total wall-clock (subagent-driven)

- P1.A: ~30-45 min (subagent execution + /qc panel + pixel-diff re-measure + commit)
- P1.B: ~60-90 min
- P1.C gate: ~10 min
- P2.0 + P2.i + P2.ii + P2.iii in parallel: ~30-45 min wall-clock (each is ~30-45 min Sonnet time; P2.0 is fastest at ~15-20 min)
- Phase 2 wrap-up + handoff: ~20 min

**Total: ~2.5-3.5 hours.** Bean's "comfortably in one Opus session" target holds.

## Acceptance criteria for entire plan

- All commits on main (squash-merged where applicable).
- 21-cell pixel-diff matrix shows:
  - Average 1440 mismatch ≤ 10%.
  - Average 768 mismatch ≤ 12%.
  - Average 375 mismatch ≤ 15%.
- Zero header/footer/nav blocks in `src/blocks/`.
- `token_resolutions` non-empty across all sections in latest extract.json.
- `mamas-munches.css` file ≤ 12,000 chars (down from 23,038).
- All binding rules respected.
