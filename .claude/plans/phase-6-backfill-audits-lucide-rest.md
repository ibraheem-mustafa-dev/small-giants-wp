---
doc_type: phase-plan
project: small-giants-wp
phase: 6
phase_name: Markup Examples + Supports Backfill + WP 7.0 Audits + Lucide REST
session_marker: Step 6.3 (canary group passes iframed editor test) — safe session boundary before bulk apiVersion bump
calibrated_time: ~135-215 min build + 15 min /qc-inline per sub-step = ~150-230 min total
prerequisites:
  - Phase 1 (merged sgs-framework.db — markup_examples and block_supports tables exist)
  - Phase 2 (variations table seeded — needed for variant-aware markup examples on sgs/button etc.)
  - Phase 5b (must have shipped BEFORE Phase 6 dispatches — button preset changes affect button block markup examples)
parallel_with: Phases 4, 5a can run in parallel sessions once Phase 1 + 2 land. Phase 5b must precede Phase 6. Phase 7 must NOT run in parallel (skills audit in Phase 7 affects the same blocks Phase 6 is editing).
qc_gate_after: /qc-inline after each sub-step; /qc-council Stage 5 after full phase
generated: 2026-05-21
---

# Phase 6 — Markup Examples + Supports Backfill + WP 7.0 Audits + Lucide REST

## Plain-English goal

SGS has 73 blocks and zero markup examples anywhere. WP core has 331. This phase closes that gap — one markup example per block minimum, more for variation-heavy blocks, seeded into the merged `sgs-framework.markup_examples` table that Phase 1 created. About 60% of these are scriptable from block.json attributes; the other 15 complex composites (hero, card-grid, tabs, etc.) need hand-authored examples. Alongside markup examples, the block_supports table is audited and backfilled — SGS has 404 rows against core's 819, an under-documentation ratio of 2:1 that translates to missing editor inspector controls for operators. Then WP 7.0 alignment: all 73 block.json files get `role: content` on content-bearing attributes (required for contentOnly patterns), `apiVersion: 2 → 3` (required for consistent iframed editor rendering in WP 7.0+), and `wp_set_script_module_translations()` wired for every block using `viewScriptModule`. The `apiVersion` bump has a mandatory canary group gate before any bulk operation. Finally, our bespoke `lucide-icons.php` icon delivery is refactored to register via the native `WP_REST_Icons_Controller` endpoint added in WP 7.0, with a compatibility shim kept until Playwright confirms the editor icon picker works.

## Decisions in scope

- **Decision 9** (§3 Phase 6, §6.1 §21) — Author `markup_examples` for 73 SGS blocks. ~60% scriptable from block.json attributes; ~15 complex composites need hand-authored examples. Seed into merged `markup_examples` table with `generated_from` column storing block.json mtime at generation time.
- **Decision 10** (§3 Phase 6, §6.1 §21) — Audit + backfill `block_supports` gaps (SGS 404 rows vs core 819). One pass per block confirming declared supports match the block.json supports field.
- **Decision 23** (§3 Phase 6, §4.2, §4.12, §4.15) — Audit all 73 block.json files: (a) add `role: content` on every content-bearing attribute; (b) bump every block to `apiVersion: 3`; (c) wire `wp_set_script_module_translations()` / `load_script_module_textdomain()` for every block using `viewScriptModule`. CANARY GROUP REQUIRED before bulk bump — see Step 6.3.
- **Decision 25** (§3 Phase 6, §4.6, §12.4) — Adopt WP 7.0 native block visibility (toolbar/inspector device-type show/hide) alongside existing `device-visibility.php` extension. Document precedence. Two UIs coexist short-term; retire ours when WP-native reaches feature parity.
- **Decision 28** (§11 Decision 28, §4.17) — Refactor `lucide-icons.php` to register icons via `WP_REST_Icons_Controller`. Keep compatibility shim until Playwright confirms editor icon picker works.

## Risk mitigations (from risk-assessment.md)

| Risk | Mitigation step |
|---|---|
| apiVersion 3 bump → WP 7.0 iframed editor → static blocks produce "unexpected content" errors | Step 6.3: CANARY GROUP of 3 representative static blocks. Bump + test in iframed editor on dev site. Confirm save output renders identically. NO bulk-bump without canary passing. |
| Auto-generated markup examples become stale when attributes refactor | Step 6.1: Add `generated_from` column to `markup_examples` storing block.json mtime. Phase 4 drift gate cross-references against current mtimes. |
| Lucide REST migration changes delivery for ALL consumers simultaneously → broken icon picker | Step 6.5: Keep `sgs_get_lucide_icon()` PHP shim working alongside new REST registration. Delete shim only after Playwright confirms icon picker loads. |
| Phase 7 skill revisions affect same blocks being audited in Phase 6 | Phase 6 must complete + merge BEFORE Phase 7 dispatches. Annotated in prerequisites + parallel_with. |

## Pre-resolved decisions (from hidden-decisions.md)

- **markup_examples format:** RESOLVED: Match core blocks.db schema exactly — stringified HTML with WP block comment markup. Auto-generate where attributes are templatable; hand-author the ~15 complex composites (sgs/hero, sgs/card-grid, sgs/tabs, sgs/testimonial, sgs/accordion, sgs/gallery, sgs/post-grid, sgs/form, and related).
- **role: content definition:** RESOLVED: "Attribute whose value is rendered as user-visible text or media content" per WP 7.0 docs. Excludes spacing, colour, visibility toggles, layout, behaviour switches. Applies to: heading text, body text, image URL, alt text, button label, link URL, caption.
- **apiVersion 3 bump safety:** RESOLVED: NOT safe without canary. Canary group of 3 representative static blocks tested in iframed editor on dev site. Bulk-bump only after canary passes.
- **Block visibility coexistence (Decision 25):** RESOLVED: Two UIs coexist short-term. Operators use WP-native (toolbar/inspector) for simple show/hide; SGS `device-visibility.php` for finer-grained controls only. Document precedence in `device-visibility.php` header comment.
- **Script module translations timing:** RESOLVED: Wire `wp_set_script_module_translations()` infrastructure NOW (Phase 6 / Decision 23c); defer non-English .json translation files until first non-English client.

---

## Steps

### Step 6.1 — Seed markup_examples for 73 SGS blocks (Decision 9)

- **Action:** Two-track approach:
  **Track A — Scriptable (~44 blocks):** Write `plugins/sgs-blocks/scripts/generate-markup-examples.py`. Script reads each block's `block.json`, extracts attribute defaults, and generates a minimal WP block comment + inner HTML. Template: `<!-- wp:sgs/<slug> {<defaults_json>} /-->` for static blocks; for dynamic blocks with required attributes, construct a representative attribute set from defaults. Insert rows into `sgs-framework.markup_examples` with `(block_slug, title, markup_html, is_hand_authored=false, generated_from=<block.json mtime>)`.
  **Track B — Hand-authored (~15 complex composites):** Author markup examples for: `sgs/hero`, `sgs/card-grid`, `sgs/tabs`, `sgs/testimonial`, `sgs/accordion`, `sgs/gallery`, `sgs/post-grid`, `sgs/form`, `sgs/form-row`, `sgs/pricing-table`, `sgs/countdown-timer`, `sgs/team-member`, `sgs/multi-column`, `sgs/stats-bar`, `sgs/icon-grid`. Each example must be a complete, copy-pasteable WP block string that renders a representative instance of the block with correct inner block structure (including innerBlocks where applicable). Mark these rows `is_hand_authored=true`.
  Add `generated_from` column to `markup_examples` table if Phase 1 didn't include it (schema check first via `PRAGMA table_info(markup_examples)`).
- **Files:** CREATE `plugins/sgs-blocks/scripts/generate-markup-examples.py`; `sgs-framework.db` (INSERT rows)
- **Inputs:** All 73 `plugins/sgs-blocks/src/<block>/block.json` files; Phase 1 merged DB with `markup_examples` table; Phase 2 `variations` table (for variant-aware examples on sgs/button primary/secondary/outline)
- **Outputs:** 73 rows in `markup_examples` (44 auto-generated + 15+ hand-authored); `generated_from` column populated
- **Time:** 40-70 min
- **Tooling:** Write tool for Python script; sqlite3 Python module; Read on block.json files for complex composites; `python ~/.claude/hooks/wp-blocks.py dump` for schema enumeration BEFORE claiming any schema gap
- **On-Fail:** If `markup_examples` table doesn't exist post-Phase-1 merge, run `PRAGMA table_info(markup_examples)` first, then create it. Never claim "table missing" without schema enumeration.

### Step 6.2 — Audit + backfill block_supports gaps (Decision 10)

- **Action:** Run `python ~/.claude/hooks/wp-blocks.py dump` to enumerate full DB schema + current SGS block_supports row count. Then:
  1. For each of the 73 SGS blocks: read `plugins/sgs-blocks/src/<block>/block.json` `supports` object. Compare against DB rows for that block in `block_supports`.
  2. For every support declared in block.json that has NO corresponding DB row: INSERT into `block_supports` with `(block_slug, support_key, support_value_json, source='sgs')`.
  3. For every support in `block_supports` that is NOT in block.json (orphaned row): add `is_stale=true` flag, do NOT delete — flag for manual review.
  4. After backfill: verify `SELECT COUNT(*) FROM block_supports WHERE source='sgs'` exceeds 500 (current 404 should rise to at least 500 with accurate coverage).
- **Files:** `sgs-framework.db` (INSERT/UPDATE rows); no PHP changes
- **Inputs:** Phase 1 merged DB; all 73 block.json files
- **Outputs:** Backfilled `block_supports` table; audit report at `reports/phase-6-supports-audit.json` listing counts before/after + stale rows flagged
- **Time:** 20-35 min
- **Tooling:** Bash script or Python for bulk comparison; sqlite3; Grep for block.json files
- **On-Fail:** If count doesn't rise as expected, enumerate specific blocks missing supports rows rather than assuming the table is wrong

### Step 6.3 — apiVersion canary group + role:content audit + script-module translations (Decision 23)

- **Action:** Three sub-steps, in order:
  **23a — Canary group first (MANDATORY before bulk bump):**
  Pick 3 representative static blocks covering: (1) a simple static block with `save.js` (e.g. `sgs/divider`), (2) a block with InnerBlocks in save.js (e.g. `sgs/columns`), (3) a dynamic block (e.g. `sgs/post-grid`). For each: bump `apiVersion: 2 → 3` in block.json. Deploy to dev site. Playwright: open the block editor for a page containing each block. Confirm (a) editor loads in iframed mode, (b) the block renders without "unexpected content" error, (c) save output is identical to pre-bump. All 3 canary blocks must pass before bulk-bump. If any fails: debug the save.js deprecation path for that block category, then re-test.
  **23b — Bulk bump all 73 blocks (only after canary passes):**
  Run `find plugins/sgs-blocks/src -name block.json | xargs grep -l '"apiVersion": 2'`. For each file: bump `apiVersion: 2 → 3`. ALSO run `find plugins/sgs-blocks/src -name block.json | xargs grep -l '"apiVersion"'` to catch any that skipped v2 or use v1.
  **23c — role: content on content-bearing attributes:**
  For every block.json attribute that represents user-visible text, media, or content (heading, body text, image URL, alt, label, caption, link URL): add `"role": "content"` to the attribute definition. Exclude: spacing, colour, layout, visibility, behaviour toggles.
  **23d — Script module translations:**
  For every block using `viewScriptModule` in block.json: in the block's PHP render or init file, add `wp_set_script_module_translations( 'sgs/<block-slug>--view-module', 'sgs-blocks', get_template_directory() . '/languages' )`. Wire `load_script_module_textdomain()` where needed. Infrastructure only — no translation .json files required until first non-English client.
- **Files:** All 73 `plugins/sgs-blocks/src/<block>/block.json` (bulk edit for 23b+23c); PHP render/init files for viewScriptModule blocks (23d)
- **Inputs:** Phase 2 built and deployed (iframed editor works on dev site); canary block list; `grep -r "viewScriptModule" plugins/sgs-blocks/src/` output
- **Outputs:** All 73 blocks at `apiVersion: 3`; all content-bearing attributes have `role: content`; script-module text domains registered
- **Time:** 30-60 min (canary testing adds wall-clock wait time for Playwright)
- **Tooling:** Bash find+grep+sed for bulk apiVersion bump (after canary passes); Edit tool for role:content additions; Playwright (canary iframed editor test); `wp eval-file` for canary deploy confirmation
- **On-Fail:** Canary failure — check `save.js` output diff between v2 and v3 rendering. Most common cause: different CSS cascade in iframe changes spacing. Fix via deprecation entry if save output changed, or CSS specificity fix if only visual.
- **QC gate:** ALL 3 canary blocks pass before bulk bump. Record canary results.
- **Session marker:** Safe boundary after canary passes (Step 6.3 canary complete) — if time runs short, pause here and continue bulk bump + role:content + script-module work in next session.

### Step 6.4 — Document block visibility coexistence (Decision 25)

- **Action:** Two-part minimal intervention:
  1. Add a header comment block to `plugins/sgs-blocks/includes/device-visibility.php` documenting the coexistence rule: "WP 7.0+ includes native device-type show/hide controls in the block toolbar and inspector. Operators should prefer WP-native for simple show/hide scenarios. This extension provides finer-grained controls — use only when WP-native is insufficient (e.g. show-on-mobile AND only-when-logged-in, combined conditions). This extension will retire when WP-native reaches feature parity with all conditions supported here."
  2. In `plugins/sgs-blocks/src/<relevant-blocks>/block.json`, confirm or add the WP 7.0 native visibility support declaration (`"supports": {"interactivity": {"clientNavigation": true}}` or relevant native visibility support key per WP 7.0 API). Cross-check against `developer.wordpress.org/reference/since/7.0.0/` for the correct support key name.
- **Files:** `plugins/sgs-blocks/includes/device-visibility.php` (header comment); block.json files for blocks that should declare native visibility support
- **Inputs:** WP 7.0 block supports reference (web search for `WP 7.0 block visibility native support key` to confirm exact attribute name before writing)
- **Outputs:** `device-visibility.php` has precedence documentation; relevant blocks declare native visibility support
- **Time:** 10-20 min
- **Tooling:** Edit tool; web search for WP 7.0 native block visibility support key name
- **On-Fail:** If WP 7.0 native visibility API key is unclear from docs, add the header comment to `device-visibility.php` only and note "native support key to confirm on WP 7.0 reference page" as a TODO in the comment — don't guess the support key name

### Step 6.5 — Lucide REST migration via WP_REST_Icons_Controller (Decision 28)

- **Action:** Refactor `plugins/sgs-blocks/includes/lucide-icons.php` to register icons via the native `WP_REST_Icons_Controller` endpoint added in WP 7.0. Steps:
  1. Research the `WP_REST_Icons_Controller` registration API: web search for `WP_REST_Icons_Controller wp_register_icon_collection` to confirm the correct registration function(s) before writing a line of code.
  2. Add a registration call in `lucide-icons.php` (or a new `class-sgs-lucide-icons-rest.php`) that registers the Lucide icon collection via the WP 7.0 native endpoint.
  3. KEEP the existing `sgs_get_lucide_icon( $icon_name )` PHP function as a compatibility shim. Add a comment: "Shim: preserved until REST endpoint confirmed working in editor. See Phase 6 step 6.5."
  4. Playwright test: Open block editor on dev site, locate an SGS block with an icon picker (sgs/icon-block or any block using the Lucide picker). Confirm icon picker loads and displays icons from the REST endpoint. If it works: the shim is confirmed redundant (leave deletion to Phase 7 or a follow-up commit).
  5. If `WP_REST_Icons_Controller` is not yet available on the dev site's WP version (check `wp eval 'echo class_exists("WP_REST_Icons_Controller") ? "yes" : "no";'`): add a `class_exists` guard around the registration — graceful degradation, not fatal error.
- **Files:** `plugins/sgs-blocks/includes/lucide-icons.php` (MODIFY — add REST registration + class_exists guard); optionally CREATE `plugins/sgs-blocks/includes/class-sgs-lucide-icons-rest.php` if cleaner to separate concerns
- **Inputs:** Current `lucide-icons.php`; WP 7.0 Icons REST API docs (web search); dev site WP 7.0 instance
- **Outputs:** Lucide icons registered via WP_REST_Icons_Controller; shim retained; Playwright confirms icon picker loads
- **Time:** 25-45 min
- **Tooling:** Web search (for WP_REST_Icons_Controller API); Edit tool; Playwright (icon picker functional test); WP-CLI eval for class_exists check
- **On-Fail:** If `WP_REST_Icons_Controller` doesn't exist in current WP 7.0 (name may differ from §4.17 — confirm via `wp eval 'print_r(get_declared_classes());' | grep -i icon`), the phase deliverable becomes: research correct WP 7.0 icon REST class name, file a TODO in lucide-icons.php, surface findings to Bean.

---

## Acceptance criteria

- `SELECT COUNT(*) FROM markup_examples WHERE source='sgs'` returns ≥ 73 (one per block minimum)
- `generated_from` column exists in `markup_examples`; all auto-generated rows have non-null mtime value
- 15 complex composite blocks have `is_hand_authored=true` rows with complete WP block markup strings
- `SELECT COUNT(*) FROM block_supports WHERE source='sgs'` returns > 500 (up from 404)
- All 73 block.json files have `apiVersion: 3`
- All content-bearing attributes in all 73 block.json files have `"role": "content"`
- `grep -r "viewScriptModule" plugins/sgs-blocks/src/` output: every match has a corresponding `wp_set_script_module_translations()` call in PHP
- `device-visibility.php` header comment documents WP 7.0 native coexistence + precedence rule
- Lucide icons registered via `WP_REST_Icons_Controller` (or class_exists guard in place with TODO if WP version not confirmed)
- Playwright confirms: editor icon picker loads with Lucide icons on dev site
- No console errors in editor after apiVersion 3 bump across all 73 blocks (spot-check 5 representative blocks)

## Subagent cold prompt (for the orchestrator to dispatch)

```
You are implementing Decisions 9, 10, 23, 25, 28 from the SGS architecture programme — markup examples, supports backfill, WP 7.0 audits (role:content + apiVersion 3 + script-module translations), block visibility coexistence, and Lucide REST migration.

# CRITICAL: Phase sequencing check

Before writing any code, verify:
1. Phase 1 shipped: python ~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py → all assertions pass. If not, STOP.
2. Phase 2 shipped: SELECT COUNT(*) FROM variations WHERE source='sgs' in sgs-framework.db → expect >0. If 0, STOP.
3. Phase 5b shipped: grep -rn "sgs_button_presets" plugins/sgs-blocks/ → should return only the migration-backup reference, not the admin page. If class-button-presets-admin.php still exists, STOP — Phase 5b not complete.

# Read first

- .claude/plans/2026-05-21-architecture-staging.md §3 Phase 6 row + §11 Decisions 23, 25, 28
- .claude/reports/strategic-plan-2026-05-21/risk-assessment.md Phase 6 section (3 risks)
- .claude/reports/strategic-plan-2026-05-21/hidden-decisions.md Phase 6 section

# SCHEMA ENUMERATION FIRST (blub.db 272 — mandatory)

BEFORE claiming any table or column is missing, run:
  python ~/.claude/hooks/wp-blocks.py dump
This emits the full schema for all 3 DBs. Any DB-schema claim must cite this enumeration. Uncited claims are unverified.

# What to build — 5 steps

## Step 1: Markup examples for 73 blocks (Decision 9)

Two tracks:

Track A (scriptable ~44 blocks):
Write plugins/sgs-blocks/scripts/generate-markup-examples.py
- Read each block.json, extract attribute defaults
- Generate minimal WP block comment markup: <!-- wp:sgs/<slug> {<defaults_json>} /-->
- For dynamic blocks with required inner structure, construct representative attrs
- INSERT rows with (block_slug, title, markup_html, is_hand_authored=false, generated_from=<block.json mtime>)

Track B (hand-authored ~15 composites):
Write complete WP block markup strings for:
sgs/hero, sgs/card-grid, sgs/tabs, sgs/testimonial, sgs/accordion, sgs/gallery,
sgs/post-grid, sgs/form, sgs/form-row, sgs/pricing-table, sgs/countdown-timer,
sgs/team-member, sgs/multi-column, sgs/stats-bar, sgs/icon-grid
Insert as is_hand_authored=true rows.

## Step 2: Block supports backfill (Decision 10)

(1) For each of the 73 blocks: read block.json supports object vs DB rows
(2) INSERT missing rows (source='sgs')
(3) Flag orphaned DB rows as is_stale=true (don't delete)
(4) Report at reports/phase-6-supports-audit.json

Target: SELECT COUNT(*) FROM block_supports WHERE source='sgs' > 500.

## Step 3: apiVersion 3 canary + bulk bump + role:content + script-module (Decision 23)

MANDATORY CANARY GROUP FIRST (do not skip):

Pick 3 static blocks:
  (a) simple static block with save.js (e.g. sgs/divider or sgs/spacer)
  (b) block with InnerBlocks in save.js (e.g. sgs/columns or sgs/group-wrapper)
  (c) dynamic block (e.g. sgs/post-grid)

For each: bump apiVersion 2 → 3 in block.json. Deploy to dev site.
Playwright test: open block editor for a page containing each block.
Assert: (a) iframed editor loads, (b) no "unexpected content" error, (c) save output matches pre-bump.

ALL 3 must pass. If any fails: debug save.js deprecation for that block category, fix, retest. Do NOT bulk-bump until canary passes.

After canary passes:
Bulk bump: find plugins/sgs-blocks/src -name block.json | xargs grep -l '"apiVersion": 2' → bump all
role:content: for every attribute that is user-visible text/media (heading, body, label, alt, caption, imageUrl, linkUrl) → add "role": "content"
Script-module translations: for every block with viewScriptModule → add wp_set_script_module_translations() call in PHP

## Step 4: Block visibility coexistence (Decision 25)

Add header comment to plugins/sgs-blocks/includes/device-visibility.php documenting:
- WP 7.0 native device visibility is the preferred path for simple show/hide
- This extension handles finer-grained multi-condition visibility only
- Retire criteria: when WP-native covers all condition types this extension supports

Add native visibility support declaration to block.json for blocks where appropriate
(web search for "WP 7.0 block visibility support key" BEFORE writing — confirm exact key name)

## Step 5: Lucide REST migration (Decision 28)

(1) web search "WP_REST_Icons_Controller wp_register_icon_collection" to confirm API
(2) Check dev site: wp eval 'echo class_exists("WP_REST_Icons_Controller") ? "yes" : "no";'
(3) If class exists: register Lucide collection via native endpoint in lucide-icons.php
    If class doesn't exist: add class_exists guard + TODO comment + surface findings
(4) KEEP sgs_get_lucide_icon() PHP shim — do NOT delete
(5) Playwright: confirm icon picker loads in block editor

# Commit gates

Do NOT commit if:
- Phase 1/2/5b grep checks show any phase is incomplete
- markup_examples count < 73 after Step 1
- Any of the 3 canary blocks produce "unexpected content" error after apiVersion 3
- block_supports count ≤ 404 after Step 2 (no improvement)
- Playwright icon picker test fails (Step 5)

Commit message: "feat(phase-6): markup examples + supports backfill + WP 7.0 audit — Decisions 9/10/23/25/28 [qc:phase-6-self-verify]"

# Time budget

135-215 min realistic. Session boundary safe after canary passes (Step 3 canary). At 200 min ceiling, commit completed steps with WIP tag.

# Safety clauses

- apiVersion 3 bulk-bump ONLY after all 3 canary blocks pass. No exceptions.
- Lucide shim sgs_get_lucide_icon() MUST remain until Playwright confirms REST icon picker works.
- role:content applies to TEXT/MEDIA content attributes only. Not to layout, colour, spacing, visibility controls.
- Script-module translations: wire infrastructure (PHP function calls), NOT .json translation files. Those come when the first non-English client onboards.

# Methodology guardrails (do not skip)
- blub.db 254 — Read pipeline-state/<run>/leftover-buckets.json BEFORE conjecturing
- blub.db 255 — Multi-model /qc panel BEFORE every converter/pipeline/SGS-block commit (Decision 31 hook from Phase 0.5)
- blub.db 256 — Per-section cropped pixel-diff, never full-page
- blub.db 272 — Schema enumeration BEFORE missing-X claims
- blub.db 276 — Council fix-shape proposals are hypotheses; empirical pre/post baseline required
- blub.db 281 — QC gate must be structural; commit messages MUST cite [qc:<run_id>]
- blub.db 282 — Fix what QC surfaces regardless of provenance
- No git stash, reset --hard, restore, checkout --, clean -f
- No --no-verify
- No Co-Authored-By
- Commit by exact path (never git add . or -A)
- Stay on main directly
```

## Post-phase QC

/qc-council Stage 5 (Sonnet + Haiku + Gemini Flash + Cerebras):

1. **Sonnet primary:** Review 15 hand-authored markup examples for correctness — each must be a valid WP block string. Spot-check 5 auto-generated examples against actual block.json to confirm attribute encoding is correct. Verify `role: content` is on content attributes and NOT on layout/spacing attributes.
2. **Haiku cross-check:** Run `SELECT COUNT(*) FROM markup_examples WHERE source='sgs'` + `SELECT COUNT(*) FROM block_supports WHERE source='sgs'`. Confirm counts meet acceptance criteria (≥73 examples, >500 supports). Run `find plugins/sgs-blocks/src -name block.json | xargs grep '"apiVersion"' | grep -v '"apiVersion": 3'` → expect 0 results.
3. **Gemini Flash:** Playwright canary block test — open block editor, place one of the 3 canary blocks, confirm no "unexpected content" error, confirm iframed editor mode. Screenshot evidence.
4. **Cerebras:** Playwright Lucide icon picker test — open a block with icon picker on dev site, confirm icons load from REST endpoint or shim still working cleanly. Check browser console for errors.

All 4 raters must agree before Phase 7 dispatches.
