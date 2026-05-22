---
doc_type: phase-plan
project: small-giants-wp
phase: 4
phase_name: /sgs-update Rebuild + Option B Port + Completeness Assurance
session_marker: Step 4.4 (core/gutenberg cache refresh script committed) — safe session boundary
calibrated_time: ~120-240 min build + 20 min /qc-council Stage 5 = ~140-260 min total (multi-session)
prerequisites: Phase 1 (merged DB schema; indexed_files table; sgs-db-assert.py baseline)
parallel_with: Phases 2, 3, 5a, 5b, 6, 7 once Phase 1 ships (see staging doc §13)
qc_gate_after: /qc-council Stage 5 (idempotency test + 10-source completeness check + drift-gate smoke test)
generated: 2026-05-21
---

# Phase 4 — /sgs-update Rebuild + Option B Port + Completeness Assurance

## Plain-English goal

Today `/sgs-update` has 4 stages. The wp-blockmarkup-mcp and wp-devdocs-mcp servers that populated blocks.db and hooks.db have been deleted — only their cached `.db` files remain. There is no automated path to refresh that data when WordPress releases a new version. After this phase: a new `sgs-update-v2.py` co-exists alongside the old script. It has 9 holistic stages including pulling from 10 canonical upstream sources (Decision 30), populating the merged sgs-framework.db, auto-seeding slot synonyms, building block-replacement mappings, regenerating spec docs, mirroring the uimax DB, and running a drift gate that warns when the live site's WP version diverges from the indexed version. The new script is idempotent — a second run produces zero DB changes. At Phase 4 gate, the entrypoint swaps from the old script to the new one. The old file is kept (not deleted) for one session before final removal.

## Decisions in scope

- **Decision 13** (§3 Phase 4) — Port wp-blockmarkup-mcp + wp-devdocs-mcp scraping logic into `/sgs-update --refresh-upstream`. Rebuild as a 9-stage holistic refresh. Pin to WP 7.0 tag (not trunk). New file `sgs-update-v2.py` co-exists with old, swap entrypoint after all 9 stages complete.
- **Decision 30** (§11 Round 6) — `/sgs-update --refresh-upstream` MUST pull from all 10 canonical sources (see table below). Per-release verification gate checks `developer.wordpress.org/reference/since/<version>/` against DB. Drift-check integration: when SGS deploys to a site, warn if `WP_Version` on the site diverges from `wp_version_indexed` in `sgs-framework.db`.

## Risk mitigations (from risk-assessment.md Phase 4)

| Risk | Mitigation step |
|---|---|
| Largest phase (~5.5 hr) likely to spill across sessions mid-rewrite, leaving sgs-update.py in hybrid state | Structure as NEW file `sgs-update-v2.py` co-existing with old (Step 4.2). Only delete old + swap entrypoint after all 9 stages pass Phase 4 gate. Subagent MUST commit each stage independently so progress survives session end. |
| `developer.wordpress.org/reference/since/<version>/` scraper hits rate limiting or returns JS-rendered HTML with zero items | Hard minimum threshold: if <100 functions/classes/hooks found for current WP version (7.0), gate FAILS with explicit count output. Use Playwright headless for JS-rendered pages. Never trust "scrape returned 0" as "no new APIs". |
| Per-release drift check fires on EVERY deploy (7.0.x vs 7.0.y) → daily false-positives | Drift check compares MAJOR.MINOR only (`7.0` not `7.0.1`). Only fire on minor-version mismatch (`7.1+` against `7.0` index). |
| New script introduces import errors or schema mismatches → silently corrupts merged DB | Step 4.3 adds `sgs-update-v2.py --dry-run` mode that computes what WOULD be written and counts rows without committing to DB. Dry-run runs FIRST; actual write only after dry-run shows expected row counts. |
| WP 7.1 ships mid-programme (~4-month cadence from 7.0) before Phase 4 completes | Phase 4 cold prompt notes: if `developer.wordpress.org/news` shows 7.1 released during Phase 4, expand `--wp-version` default from `7.0` to `7.1` and re-run Stage 2 with the new tag. |

## Pre-resolved decisions (from hidden-decisions.md Phase 4)

- **Cached MCP .db file locations:** `~/.wp-blockmarkup-mcp/blocks.db` (121 blocks) and `~/.wp-devdocs-mcp/hooks.db` (7283 hooks) — same as Phase 1 (local cache from previously-deleted MCP servers).
- **Pin to WP 7.0 tag forever?** No. Add `--wp-version` flag defaulting to `latest-stable-major`. Operators override for testing future versions. Phase 4 initial build targets WP 7.0 tag on `WordPress/gutenberg` and `WordPress/wordpress-develop`.
- **9 stages — phases or stages of single script?** 9 stages of a single `sgs-update-v2.py` script. Each stage is a function with explicit pre/post conditions. Not sub-scripts.
- **Entrypoint swap timing:** only after ALL 9 stages pass + `/qc-council` Stage 5 gate. The existing `sgs-update.py` (4-stage) continues to work for Stages 1+3+4+Stage-legacy-uimax until the swap.

## Decision 30 — 10 canonical upstream sources

| # | Source | What it gives | Stage |
|---|---|---|---|
| 1 | `WordPress/gutenberg` repo `packages/block-library/src/` | block.json schemas + variations + supports | Stage 2 |
| 2 | `WordPress/wordpress-develop` repo | PHP API + hooks + classes | Stage 2 |
| 3 | `wp-cli/handbook` repo | CLI commands + flags + examples | Stage 3 |
| 4 | `developer.wordpress.org/reference/since/<version>/` | Canonical added-API list per WP version — **the source missed in this session's audit** | Stage 2 |
| 5 | `make.wordpress.org/core/<release-tag>-field-guide` | Architectural changes per release | Stage 2 |
| 6 | `developer.wordpress.org/news` (monthly dev blog) | Forward-looking dev changes | Stage 2 |
| 7 | `developer.wordpress.org/block-editor` | Block API reference | Stage 2 |
| 8 | `developer.wordpress.org/themes` | Theme handbook | Stage 2 |
| 9 | `developer.wordpress.org/plugins` | Plugin handbook | Stage 2 |
| 10 | `developer.wordpress.org/rest-api` | REST handbook | Stage 2 |

---

## Steps

### Step 4.1 — Pre-flight: verify Phase 1 gate + schema baseline

- **Action:** Run `python ~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py`. All Phase 1 assertions must pass before writing any Phase 4 code. Also run `python ~/.claude/hooks/wp-blocks.py dump` to emit full current schema manifest — this is the baseline for post-Phase-4 comparison (blub.db 272).
- **Files:** None modified; read-only verification
- **Inputs:** sgs-framework.db; sgs-db-assert.py (Phase 1 + 2 suite)
- **Outputs:** Schema manifest saved to `reports/phase4-pre-schema-baseline.txt`; assertion exit code 0 confirmed
- **Time:** 5 min
- **Tooling:** Python; Bash
- **On-Fail:** If Phase 1 assertions fail, STOP. Phase 4 writes to the merged DB — a broken base corrupts all 9 stages. Surface the failing assertion and route to Phase 1 remediation.

### Step 4.2 — Scaffold `sgs-update-v2.py` with 9-stage skeleton

- **Action:** CREATE `plugins/sgs-blocks/scripts/sgs-update-v2.py`. Structure: `def main()` dispatcher with `--stage` flag (run single stage for debugging) + `--refresh-upstream` flag (triggers Stages 2+3 network fetches) + `--dry-run` flag (compute without writing). 9 stage functions, each with a `pre_condition()` check and `post_condition()` assertion:
  - Stage 1: `sgs_codebase_scan()` — walk `src/blocks/*/block.json`, extract blocks + attributes + supports; INSERT OR IGNORE into sgs-framework.db; update `indexed_files` mtimes
  - Stage 2: `core_gutenberg_cache_refresh()` — scrape 10 canonical sources (only active with `--refresh-upstream`; reads cached .db files otherwise)
  - Stage 3: `wpcli_handbook_refresh()` — scrape `wp-cli/handbook` repo; update `docs WHERE doc_type='cli-command'` rows
  - Stage 4: `style_variation_sync()` — walk `sites/*/theme-snapshot.json`; ensure each client's tokens exist in `sgs-framework.db`; no-op today (pre-Phase-5a)
  - Stage 5: `slot_synonym_auto_seed()` — heuristic: for each block_slug where `slot_synonyms.standalone_block IS NULL`, check if a SGS block with matching name pattern exists; propose + insert
  - Stage 6: `block_replacement_mapping()` — walk `blocks.replaces` column; verify each mapping still valid against current block roster; flag stale mappings
  - Stage 7: `spec_doc_regen()` — regenerate `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` from DB (existing Stage 2 logic)
  - Stage 8: `uimax_mirror()` — mirror sgs-blocks → uimax component-libraries.csv (existing Stage 3 logic)
  - Stage 9: `drift_gate()` — check `sgs-framework.db` `schema_metadata.wp_version_indexed` against live site WP version; emit warning if MAJOR.MINOR mismatch
  
  Add `schema_metadata` table: `(key TEXT PRIMARY KEY, value TEXT)` — stores `wp_version_indexed`, `last_full_refresh_ts`, `indexed_blocks_count`.
- **Files:** CREATE `plugins/sgs-blocks/scripts/sgs-update-v2.py`
- **Inputs:** Existing `sgs-update.py` (Stages 1+3+4+legacy-uimax) for reference on Stage 1/7/8 logic; staging doc §3 Decision 13 + §11 Decision 30
- **Outputs:** Scaffold with 9 stubs; `--dry-run` mode prints "would write N rows to table X" per stage; script runs without error in dry-run
- **Time:** 25 min
- **Tooling:** Python; Read on existing sgs-update.py for copy-eligible logic
- **On-Fail:** If existing sgs-update.py import structure is incompatible (different Python version, missing deps), write Stage 1 from scratch rather than adapting — document the decision in a code comment

### Step 4.3 — Implement Stage 1 (SGS codebase scan) + Stage 7 (spec regen) + Stage 8 (uimax mirror)

- **Action:** Port logic from existing `sgs-update.py` Stages 1, 2, 3 into new Stage 1, 7, 8. Key differences from the old script:
  - Stage 1 now writes to the merged sgs-framework.db (not a separate DB) with `source='sgs'` on every INSERT
  - Stage 1 updates `indexed_files` mtime + content_hash (new in Phase 1)
  - Stage 1 updates `schema_metadata.indexed_blocks_count` after scan
  - Stage 7 still generates `02-SGS-BLOCKS-REFERENCE.md` (unchanged logic, different DB path)
  - Stage 8 still writes to `~/.agents/skills/ui-ux-pro-max/data/component-libraries.csv` (unchanged logic)
  
  Run `python sgs-update-v2.py --stage 1 --dry-run` and confirm row count matches current `SELECT COUNT(*) FROM blocks WHERE source='sgs'`. Run without `--dry-run` and re-run `sgs-db-assert.py` to confirm no regressions.
- **Files:** MODIFY `plugins/sgs-blocks/scripts/sgs-update-v2.py` (implement Stages 1, 7, 8)
- **Inputs:** `plugins/sgs-blocks/src/blocks/*/block.json` (73 files); existing sgs-update.py logic
- **Outputs:** Stage 1 idempotent — running twice produces zero additional rows (INSERT OR IGNORE); Stage 7 regenerates spec; Stage 8 mirrors uimax; sgs-db-assert.py still exits 0
- **Time:** 30 min
- **Tooling:** Python; Bash for diff on spec regen output
- **Session marker (Step 4.3 commit):** `feat(phase-4): sgs-update-v2 Stages 1+7+8 — codebase scan + spec regen + uimax mirror [qc:phase-4-stage-1-3-self-verify]`

### Step 4.4 — Implement Stage 2 (core/gutenberg cache refresh + `--refresh-upstream`) [SESSION BOUNDARY]

- **Action:** Implement `core_gutenberg_cache_refresh()` with two modes:
  
  **Mode A (default, no `--refresh-upstream`):** Read cached `~/.wp-blockmarkup-mcp/blocks.db` + `~/.wp-devdocs-mcp/hooks.db`. Check `schema_metadata.last_full_refresh_ts` — if <7 days ago, skip and log "cached data current". If stale, re-run from Mode B.
  
  **Mode B (`--refresh-upstream` flag):** Scrape from 10 canonical sources (Decision 30 table). Implementation per source:
  - Sources 1+2 (GitHub repos): clone `WordPress/gutenberg` + `WordPress/wordpress-develop` at `v7.0.0` tag into `/tmp/wp-gutenberg` + `/tmp/wp-develop`. Parse `packages/block-library/src/*/block.json` files. Parse PHP hook files (`do_action`, `apply_filters`). INSERT OR IGNORE into merged DB with `source='native_wp'`.
  - Source 3 (WP-CLI handbook): clone `wp-cli/handbook` or fetch via GitHub API. Parse markdown files for command syntax. INSERT OR IGNORE into `docs` with `doc_type='cli-command'`, `source='native_wp'`.
  - Source 4 (`developer.wordpress.org/reference/since/7.0.0/`): Playwright headless fetch (JS-rendered). Extract all function/class/hook names. Hard minimum: if <100 items found, FAIL with count + error message. INSERT into `docs` with `doc_type='api-reference'`.
  - Sources 5-10 (`developer.wordpress.org/*`): Playwright headless fetch per URL. Extract key content sections. INSERT into `docs` with appropriate `doc_type`.
  
  After all sources processed: UPDATE `schema_metadata` SET `wp_version_indexed='7.0'`, `last_full_refresh_ts=<now>`.
  
  **Idempotency test:** run `--refresh-upstream` twice in sequence. Second run must produce zero DB changes (INSERT OR IGNORE throughout). Log: "0 new rows inserted — DB current."
- **Files:** MODIFY `plugins/sgs-blocks/scripts/sgs-update-v2.py` (implement Stage 2); CREATE `schema_metadata` table entries
- **Inputs:** GitHub repos (network); developer.wordpress.org (Playwright); cached .db files
- **Outputs:** sgs-framework.db `blocks` updated with any new native_wp rows from gutenberg v7.0; `docs` has Source 4 (`since/7.0.0/`) items; `schema_metadata.wp_version_indexed='7.0'`; idempotency confirmed
- **Time:** 45 min (genuine scraping work; estimate anchors to blub.db row 159 Sonnet mechanical baseline)
- **Tooling:** Python + git clone or GitHub API; Playwright MCP for JS-rendered pages; sqlite3
- **On-Fail:** If GitHub rate-limiting blocks clone, fall back to GitHub API (`https://api.github.com/repos/WordPress/gutenberg/contents/packages/block-library/src` with auth header). If Playwright fails on developer.wordpress.org, use `python ~/.claude/hooks/search.py` as fallback scraper. Document which sources succeeded/failed in `schema_metadata`.
- **Session marker:** THIS IS THE SAFE SESSION BOUNDARY. Commit everything through Step 4.4 with message `feat(phase-4): sgs-update-v2 Stage 2 — core/gutenberg cache refresh + refresh-upstream [qc:phase-4-stage-2-self-verify]` before ending session. Resume from Step 4.5 next session.

### Step 4.5 — Implement Stages 3, 5, 6 (WP-CLI refresh + slot synonym auto-seed + block-replacement mapping)

- **Action:**
  
  **Stage 3 (WP-CLI handbook refresh):** Read WP-CLI handbook from `/tmp/wp-cli-handbook` (clone in Stage 2). For each `.md` file under `commands/`, extract command name + syntax + examples. UPDATE existing `docs` rows where `doc_type='cli-command' AND source='native_wp'` with refreshed content. Add any new commands not yet in DB. Cross-check: `wp help --list` output on dev site vs DB command list — missing commands = Stage 3 failure.
  
  **Stage 5 (slot synonym auto-seed):** Query `SELECT DISTINCT standalone_block FROM slot_synonyms WHERE standalone_block IS NULL` — these are Phase 0's unseeded rows. Heuristic: for each slot name (e.g. `buttonSecondary`, `cardItem`), check if `SELECT slug FROM blocks WHERE slug LIKE '%' || lower_name || '%' AND source='sgs'` returns a match. If yes, propose `UPDATE slot_synonyms SET standalone_block=matched_slug WHERE standalone_block IS NULL`. Only INSERT if heuristic confidence is high (exact or near-exact slug match). Log proposed-but-not-inserted rows to `reports/phase4-slot-synonym-proposals.txt` for manual review.
  
  **Stage 6 (block-replacement mapping):** Walk `SELECT slug, replaces FROM blocks WHERE source='sgs' AND replaces IS NOT NULL`. For each `replaces` value, verify it exists in `blocks WHERE source='native_wp'`. Stale mappings (pointing to deleted/renamed native blocks) → log to `reports/phase4-stale-replacements.txt`. No automated deletion — flag for manual review.
- **Files:** MODIFY `plugins/sgs-blocks/scripts/sgs-update-v2.py` (Stages 3, 5, 6); CREATE `reports/phase4-slot-synonym-proposals.txt`; CREATE `reports/phase4-stale-replacements.txt`
- **Inputs:** WP-CLI handbook (cloned in Stage 2); sgs-framework.db `slot_synonyms` + `blocks` tables
- **Outputs:** WP-CLI handbook docs refreshed; slot synonym auto-seed proposals logged; stale replacement mappings flagged; no automated writes to `blocks.replaces` without review
- **Time:** 20 min
- **Tooling:** Python sqlite3; Bash for wp help --list cross-check
- **On-Fail:** If slot synonym heuristic produces too many false-positive proposals (>20 "maybe" rows), reduce confidence threshold and re-run. Stage 5 is a heuristic assist, not a hard requirement — zero auto-seeds is acceptable if confidence is low.

### Step 4.6 — Implement Stage 4 (style-variation sync) + Stage 9 (drift gate)

- **Action:**
  
  **Stage 4 (style-variation sync):** Walk `sites/*/theme-snapshot.json`. For each file: extract custom property keys from the `settings.custom` block. For each key not yet in `sgs-framework.db` `design_tokens` (or equivalent table), log to `reports/phase4-variation-token-gaps.txt`. No writes to DB — this stage is observational until Phase 5a ships the snapshot model. After Phase 5a, this stage will auto-sync. Document the no-op in a code comment: `# TODO: activate writes after Phase 5a ships`.
  
  **Stage 9 (drift gate):** CREATE `schema_metadata` row `wp_version_indexed` (set by Stage 2). Implement `drift_gate()`:
  1. Read `schema_metadata` `wp_version_indexed` (e.g. `'7.0'`)
  2. Fetch live site WP version via `wp eval 'echo get_bloginfo("version");'` on dev site SSH — parse MAJOR.MINOR only
  3. Compare: if MAJOR.MINOR mismatch (e.g. site is `7.1`, DB indexed for `7.0`), emit systemMessage warning: "Site is WP {site_version}. DB indexed for WP {db_version}. Run /sgs-update --refresh-upstream before deploying knowledge-dependent features."
  4. Same-version check passes silently
  
  This gate runs at end of `sgs-update-v2.py` AND as a standalone check via `python sgs-update-v2.py --stage 9`. Wire into the deploy hook (`.claude/hooks/`) as a future integration point — add a TODO comment with the hook file path.
- **Files:** MODIFY `plugins/sgs-blocks/scripts/sgs-update-v2.py` (Stages 4, 9); CREATE `reports/phase4-variation-token-gaps.txt` (may be empty)
- **Inputs:** `sites/*/theme-snapshot.json` (may not exist pre-Phase-5a — handle gracefully); `schema_metadata` table; SSH to dev site for WP version
- **Outputs:** Stage 4 no-op with TODO; Stage 9 drift gate produces correct output for same-version (silent) + different-version (warning) cases
- **Time:** 20 min
- **Tooling:** Python; SSH Bash for WP version check
- **On-Fail:** If SSH unreachable for Stage 9 version check, catch the exception and log "drift check skipped — SSH unavailable" rather than failing the whole script. Drift gate is observational, not blocking.

### Step 4.7 — Full idempotency test + entrypoint swap + schema assertion extension

- **Action:**
  1. **Idempotency test:** Run `python sgs-update-v2.py` twice in sequence WITHOUT `--refresh-upstream`. Second run must produce: "0 new rows inserted across all stages." Capture output to `reports/phase4-idempotency-test.txt`.
  2. **--refresh-upstream test (dry-run):** Run `python sgs-update-v2.py --refresh-upstream --dry-run`. Verify >100 items found from Source 4 (`since/7.0.0/`). No actual DB writes.
  3. **Entrypoint swap:** In `.claude/CLAUDE.md` + `plugins/sgs-blocks/package.json` (or wherever the old entrypoint is referenced), update the reference from `sgs-update.py` to `sgs-update-v2.py`. Keep old file — do NOT delete (two-commit pattern: swap entrypoint now, delete old file next session after confirming correct operation).
  4. **Extend sgs-db-assert.py:** Add Phase 4 assertions:
     - `SELECT value FROM schema_metadata WHERE key='wp_version_indexed'` → non-null, matches `'7.0'` or later
     - `SELECT COUNT(*) FROM docs WHERE source='native_wp' AND doc_type='api-reference'` → ≥100 (Source 4 minimum)
     - `SELECT COUNT(*) FROM docs WHERE doc_type='cli-command' AND source='native_wp'` → ≥12 (WP-CLI handbook)
     - `SELECT COUNT(*) FROM blocks WHERE source='native_wp'` → ≥100 (Phase 1 check, regression guard)
- **Files:** MODIFY `plugins/sgs-blocks/scripts/sgs-update-v2.py` (idempotency logging); MODIFY `~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py` (Phase 4 assertions); UPDATE entrypoint reference
- **Inputs:** All 9 stages complete; sgs-framework.db in post-Phase-4 state
- **Outputs:** Idempotency test passes; entrypoint swapped; sgs-db-assert.py Phase 4 assertions pass; `reports/phase4-idempotency-test.txt` saved
- **Time:** 15 min
- **Tooling:** Python; Bash; text editor for entrypoint reference
- **On-Fail:** If idempotency test shows non-zero rows on second run (INSERT OR IGNORE failed somewhere), grep the script for any `INSERT OR REPLACE` or bare `INSERT` calls — every insert must use `INSERT OR IGNORE`. Fix all instances before committing.
- **QC gate:** Run full `sgs-db-assert.py` suite after entrypoint swap. All Phase 1 + 2 + 4 assertions must pass.

---

## Acceptance criteria

- `python sgs-db-assert.py` exits 0 with Phase 1 + Phase 2 + Phase 4 assertions all passing
- `python sgs-update-v2.py` (no flags) runs without error; second run produces "0 new rows inserted"
- `python sgs-update-v2.py --refresh-upstream --dry-run` finds ≥100 items from Source 4 (`since/7.0.0/`)
- `schema_metadata` has `wp_version_indexed='7.0'` + `last_full_refresh_ts` (non-null after `--refresh-upstream`)
- `reports/phase4-idempotency-test.txt` exists; shows 0 new rows on second run
- Stage 9 drift gate: same-version check passes silently; MAJOR.MINOR mismatch emits correct warning
- Entrypoint swapped to `sgs-update-v2.py`; old `sgs-update.py` still present (not deleted)
- Phase 1 + 2 rows unchanged (regression guard via full assertion suite)
- `reports/phase4-slot-synonym-proposals.txt` and `reports/phase4-stale-replacements.txt` exist (may be empty)

## Subagent cold prompt (for the orchestrator to dispatch)

```
You are implementing Decisions 13 and 30 (/sgs-update rebuild + Option B port + completeness assurance) from the SGS architecture programme.

# Plain-English context

The wp-blockmarkup-mcp and wp-devdocs-mcp servers that populated blocks.db and hooks.db have been deleted.
Only their cached .db files remain. There is no automated path to refresh WP knowledge when WP versions change.
After this phase: sgs-update-v2.py has 9 stages, pulls from 10 canonical upstream sources, is idempotent,
and warns when the live site's WP version diverges from the indexed version.

This is the longest phase (~5.5 hr genuine novel scraping work). Structure it as a NEW file (sgs-update-v2.py)
co-existing with the old. Only swap the entrypoint AFTER all 9 stages pass the Phase 4 gate.
Commit each stage independently so progress survives session end.

# Read first (mandatory before any code)

- .claude/plans/2026-05-21-architecture-staging.md §3 Phase 4 rows + §11 Decisions 13 and 30 (10-source table)
- .claude/reports/strategic-plan-2026-05-21/risk-assessment.md Phase 4 section (3 risks + plan-level risk 1)
- .claude/reports/strategic-plan-2026-05-21/hidden-decisions.md Phase 4 section (4 pause-points resolved)
- python ~/.claude/hooks/wp-blocks.py dump → emit full schema manifest BEFORE any writes (blub.db 272)
- git log --oneline -20 → check Phase 1 completion commit exists

# Prerequisite check

Phase 1 MUST be complete before this phase. Verify:
  python ~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py
  → All Phase 1 assertions must pass.
  → If assertion fails, STOP and surface the failure. Do NOT proceed on a broken DB.

Also run: python ~/.claude/hooks/wp-blocks.py dump > reports/phase4-pre-schema-baseline.txt
Save this as the pre-phase baseline for post-phase comparison.

# Source file locations

- sgs-framework.db: ~/.agents/skills/sgs-wp-engine/sgs-framework.db
- blocks.db cache: ~/.wp-blockmarkup-mcp/blocks.db
- hooks.db cache: ~/.wp-devdocs-mcp/hooks.db
- Old sgs-update.py: plugins/sgs-blocks/scripts/sgs-update.py (reference only — do NOT modify)
- New script: plugins/sgs-blocks/scripts/sgs-update-v2.py (CREATE this)
- sgs-db-assert.py: ~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py (extend with Phase 4 assertions)

# Decisions resolved (do not re-investigate)

- WP version pin: --wp-version flag defaulting to 'latest-stable-major' (currently '7.0'). NOT hardcoded.
- 9 stages: all stages inside single sgs-update-v2.py script. NOT sub-scripts.
- Entrypoint swap: only after all 9 stages pass + /qc-council Stage 5 gate passes.
- Cached .db files: use as Stage 2 "Mode A" (default). --refresh-upstream triggers live scrape (Mode B).

# What to build — 7 steps

## Step 1: Pre-flight
Run sgs-db-assert.py. Save schema baseline to reports/phase4-pre-schema-baseline.txt.

## Step 2: Scaffold sgs-update-v2.py
CREATE plugins/sgs-blocks/scripts/sgs-update-v2.py with:
- main() dispatcher with --stage, --refresh-upstream, --dry-run flags
- 9 stage function stubs, each with pre_condition() + post_condition() assertions
- schema_metadata table: CREATE TABLE IF NOT EXISTS schema_metadata (key TEXT PRIMARY KEY, value TEXT)
- --dry-run mode: compute + count rows without writing to DB

## Step 3: Implement Stages 1 + 7 + 8 (port from existing sgs-update.py)
Stage 1: walk src/blocks/*/block.json → INSERT OR IGNORE into blocks/block_attributes/block_supports WHERE source='sgs'; UPDATE indexed_files
Stage 7: regenerate .claude/specs/02-SGS-BLOCKS-REFERENCE.md from DB
Stage 8: mirror sgs-blocks to ~/.agents/skills/ui-ux-pro-max/data/component-libraries.csv
Idempotency test: run Stage 1 twice → 0 new rows on second run.
Commit: "feat(phase-4): sgs-update-v2 Stages 1+7+8 — codebase scan + spec regen + uimax mirror [qc:phase-4-stage-1-3-self-verify]"

## Step 4: Implement Stage 2 (core/gutenberg cache refresh) — SESSION BOUNDARY
Two modes:
Mode A (default): read ~/.wp-blockmarkup-mcp/blocks.db + ~/.wp-devdocs-mcp/hooks.db; INSERT OR IGNORE into sgs-framework.db
Mode B (--refresh-upstream): scrape all 10 canonical sources listed in Decision 30 (staging doc §11).

10 sources:
1. WordPress/gutenberg repo packages/block-library/src/ — block.json files, pin to v7.0.0 tag
2. WordPress/wordpress-develop repo — PHP hooks + classes
3. wp-cli/handbook repo — CLI command docs
4. developer.wordpress.org/reference/since/7.0.0/ — HARD MIN: <100 items = GATE FAILS (use Playwright headless for JS-rendered)
5. make.wordpress.org/core/7.0-field-guide — architectural changes
6. developer.wordpress.org/news — forward-looking dev changes
7. developer.wordpress.org/block-editor — block API reference
8. developer.wordpress.org/themes — theme handbook
9. developer.wordpress.org/plugins — plugin handbook
10. developer.wordpress.org/rest-api — REST handbook

After all sources: UPDATE schema_metadata SET wp_version_indexed='7.0', last_full_refresh_ts=<now>

Idempotency: run --refresh-upstream twice → 0 new rows on second run (INSERT OR IGNORE throughout).
Commit: "feat(phase-4): sgs-update-v2 Stage 2 — core/gutenberg cache refresh + refresh-upstream [qc:phase-4-stage-2-self-verify]"
THIS STEP IS THE SAFE SESSION BOUNDARY — commit and stop here if time is running out.

## Step 5: Implement Stages 3 + 5 + 6
Stage 3: read WP-CLI handbook (cloned in Stage 2); refresh docs WHERE doc_type='cli-command' AND source='native_wp'
Stage 5: slot synonym auto-seed (heuristic only; log proposals to reports/phase4-slot-synonym-proposals.txt; no auto-writes unless exact match)
Stage 6: verify blocks.replaces mappings still valid; log stale to reports/phase4-stale-replacements.txt

## Step 6: Implement Stages 4 + 9
Stage 4: walk sites/*/theme-snapshot.json; log token gaps to reports/phase4-variation-token-gaps.txt; NO DB writes (pre-Phase-5a); add TODO comment "activate writes after Phase 5a ships"
Stage 9: drift_gate() — read schema_metadata.wp_version_indexed; fetch site WP version via SSH `wp eval 'echo get_bloginfo("version");'`; compare MAJOR.MINOR only; emit systemMessage warning on mismatch

## Step 7: Idempotency test + entrypoint swap + assertion extension
1. Run full sgs-update-v2.py twice → second run shows "0 new rows inserted" in all 9 stages
2. Run --refresh-upstream --dry-run → confirm ≥100 items from Source 4
3. Swap entrypoint reference from sgs-update.py to sgs-update-v2.py (do NOT delete old file yet)
4. Extend sgs-db-assert.py:
   - SELECT value FROM schema_metadata WHERE key='wp_version_indexed' → non-null
   - SELECT COUNT(*) FROM docs WHERE source='native_wp' AND doc_type='api-reference' → ≥100
   - SELECT COUNT(*) FROM docs WHERE doc_type='cli-command' AND source='native_wp' → ≥12
   - SELECT COUNT(*) FROM blocks WHERE source='native_wp' → ≥100 (regression guard)

# Verification gate

Run: python ~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py
All Phase 1 + Phase 2 + Phase 4 assertions must pass (full suite, not just new ones).
reports/phase4-idempotency-test.txt must exist showing 0 new rows on second run.

# Commit gate

Do NOT commit the entrypoint swap if:
- sgs-db-assert.py exits non-zero on any Phase 1, 2, or 4 assertion
- Idempotency test shows non-zero rows on second run (INSERT OR IGNORE broken somewhere)
- Source 4 (since/7.0.0/) dry-run returns <100 items
- Phase 1 rows (sgs/hero, core/button, hooks ≥7000) missing (regression check)

Final commit message: "feat(phase-4): sgs-update-v2 complete — Decisions 13, 30 — entrypoint swap [qc:phase-4-complete]"
Stage by exact path. Never git add . or -A.

# Time budget

140 min realistic. 260 min ceiling (multi-session expected).
Stage milestones for session-boundary commits:
  - After Step 3 (Stages 1+7+8): commit and continue or stop
  - After Step 4 (Stage 2): THIS IS THE SESSION BOUNDARY COMMIT — commit and stop here if >90 min elapsed
  - Each subsequent step: commit independently

# Methodology guardrails (do not skip)
- blub.db 254 — Read pipeline-state/<run>/leftover-buckets.json BEFORE conjecturing
- blub.db 255 — Multi-model /qc panel BEFORE every converter/pipeline/SGS-block commit
- blub.db 256 — Per-section cropped pixel-diff, never full-page
- blub.db 272 — Schema enumeration BEFORE missing-X claims (wp-blocks.py dump FIRST)
- blub.db 276 — Council fix-shape proposals are hypotheses; empirical pre/post baseline required
- blub.db 281 — QC gate must be structural; commit messages MUST cite [qc:<run_id>]
- blub.db 282 — Fix what QC surfaces regardless of provenance; pre-existing bugs in scope when discovered
- No git stash, reset --hard, restore, checkout --, clean -f
- No --no-verify
- No Co-Authored-By
- Commit by exact path (never `git add .` or -A)
- Stay on main directly
```

## Post-phase QC

/qc-council Stage 5 (Sonnet + Haiku + Gemini Flash + Cerebras rater panel):

1. **Idempotency verification** (Sonnet primary): run `sgs-update-v2.py` twice; confirm second run outputs "0 new rows" across all 9 stages. Any non-zero count = INSERT OR REPLACE used somewhere.
2. **Source-4 completeness gate** (Haiku cross-check): confirm `SELECT COUNT(*) FROM docs WHERE doc_type='api-reference' AND source='native_wp'` returns ≥100 rows. Count matched against the count the script reported during `--refresh-upstream --dry-run` run.
3. **Phase 1+2 regression guard** (Gemini Flash): sgs/hero, core/button, sgs/button variations (4 rows), hooks ≥7000 — all still present after Phase 4 writes.
4. **Drift gate behaviour** (Cerebras independent): stage 9 emits correct systemMessage on simulated version mismatch. Verify: temporarily SET `schema_metadata WHERE key='wp_version_indexed'` to `'6.9'`; run Stage 9; confirm warning fires with correct message; restore to `'7.0'`.

If any rater raises a gap, fix before Phase 5a/5b/6/7 dispatches. Those phases all depend on `/sgs-update` being reliable — a broken Stage 2 silently serves stale WP knowledge to every downstream operation.
