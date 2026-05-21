---
doc_type: phase-plan
project: small-giants-wp
phase: 1
phase_name: DB Merge — Single Source of Truth
session_marker: Step 1.6 (schema-assertion script commit) — safe session boundary if time runs out
calibrated_time: ~45-75 min build + 15 min /qc-council Stage 5 = ~60-90 min total
prerequisites: Phase 0.5 (QC hook active before first converter commit)
parallel_with: Phase 0.5 can overlap in theory but must not share the commit gate
qc_gate_after: /qc-council Stage 5 (row-count assertions + cross-domain query verification)
generated: 2026-05-21
---

# Phase 1 — DB Merge

## Plain-English goal

Today every WP-knowledge query checks three separate databases: `blocks.db` (core WP blocks — 121 blocks, 475 attributes), `hooks.db` (7283 hooks, 1150 docs), and `sgs-framework.db` (SGS blocks + framework data). After this phase: `sgs-framework.db` is the single source of truth. Every row carries a `source` column (`sgs` / `native_wp` / `third_party`) so queries can filter by origin. The Phase 3 converter rewrite, Phase 5a snapshot push CLI, and all downstream `/sgs-update` work in Phase 4 depend on this consolidated schema being correct and performant. Phase 1 also adds the `indexed_files` table (enabling incremental `/sgs-update` scans) and extends `docs` with `doc_type='cli-command'` rows for every `wp sgs` command.

## Decisions in scope

- **Decision 1** (§3 Phase 1) — `source` column on `blocks`, `block_attributes`, `block_supports`; import all blocks.db + hooks.db rows
- **Decision 2** (§3 Phase 1) — Extend `docs` table with `doc_type='cli-command'`; seed from Spec 19 + WP-CLI handbook + SGS pipeline commands
- **Decision 11** (§3 Phase 1) — `indexed_files` table (mtime + content_hash per SGS block.json + style file)

## Risk mitigations (from risk-assessment.md)

| Risk | Mitigation step |
|---|---|
| SQLite WAL + AV scanning → hot-path latency >500ms on Windows | Step 1.7: benchmark `wp-blocks.py block sgs/hero`; if >200ms, add covering index before Phase 3 reads from merged DB |
| Duplicate rows on import — no dedup guard | Step 1.2: `UNIQUE(slug, source)` constraint added BEFORE import; `INSERT OR IGNORE` throughout |
| `doc_type='cli-command'` conflates command docs with prose docs | Step 1.4: enumerate all `wp help --list` commands first; treat mismatches as failures not warnings |
| Phase 0 SGS rows (parent_block, slot_synonyms) silently overwritten | Steps 1.2-1.3: `INSERT OR IGNORE` never `DROP + RECREATE`; verify SGS row counts unchanged post-import |
| Phase 3 queries merged DB without `source='sgs'` filter → native_wp rows intermixed | Step 1.6: schema-assertion script includes slot_synonyms + parent_block queries scoped to source='sgs'; Phase 3 cold prompt carries explicit filter reminder |

## Pre-resolved decisions (from hidden-decisions.md)

- **Merge key:** `(slug OR hook_name, source)` composite — NOT by id (auto-increment, not portable)
- **Cached .db file locations:** `~/.wp-blockmarkup-mcp/blocks.db` (121 blocks) + `~/.wp-devdocs-mcp/hooks.db` (7283 hooks) — local MCP caches
- **indexed_files scans:** `src/` directory only — not `build/` (compiled output, not source of truth)
- **hooks table:** new table distinct from existing SGS hooks in sgs-framework.db (different schema shape); existing SGS hooks get `source='sgs'` applied in place

---

## Steps

### Step 1.1 — Schema migration: add `source` column + `indexed_files` table

- **Action:** ALTER TABLE to add `source TEXT NOT NULL DEFAULT 'sgs'` to `blocks`, `block_attributes`, `block_supports`. Backfill existing SGS rows to `'sgs'`. Add `UNIQUE(slug, source)` constraints on `blocks` (or `block_name, source` — check actual column name). Add `UNIQUE(attr_name, block_slug, source)` on `block_attributes`. CREATE TABLE `indexed_files (file_path TEXT PRIMARY KEY, source TEXT, mtime_ms INTEGER, content_hash TEXT, last_indexed TIMESTAMP)`. CREATE TABLE `hooks (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT, name TEXT, type TEXT, php_function TEXT, params TEXT, docblock TEXT, file_path TEXT, UNIQUE(name, source))`. CREATE TABLE `docs (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT, file_path TEXT, slug TEXT, title TEXT, doc_type TEXT, category TEXT, content TEXT, UNIQUE(slug, source))`.
- **Files:** `~/.agents/skills/sgs-wp-engine/sgs-framework.db` (schema only, no data yet)
- **Inputs:** Staging doc §3 Decision 1 schema list; existing sgs-framework.db schema (run `.schema` to confirm column names before ALTER)
- **Outputs:** sgs-framework.db has source columns on 3 tables + 3 new tables (indexed_files, hooks, docs)
- **Time:** 10 min
- **Tooling:** Bash (sqlite3 or Python sqlite3 module); Read on existing schema first
- **On-Fail:** If UNIQUE constraint conflicts on existing rows (duplicate slug within SGS source), surface which rows conflict and resolve by dedup before proceeding — never force-delete

### Step 1.2 — Import core blocks.db into sgs-framework.db

- **Action:** Python migration script. Read `~/.wp-blockmarkup-mcp/blocks.db`. For each block row: INSERT OR IGNORE into `sgs-framework.blocks` with `source='native_wp'`, mapping `block_name → slug`, preserving title, description, category, block_type, api_version. For each attribute: INSERT OR IGNORE into `block_attributes` with `source='native_wp'`. For each support: INSERT OR IGNORE into `block_supports` with `source='native_wp'`. Do NOT import variations (Phase 2) or markup_examples (Phase 6).
- **Files:** CREATE `~/.agents/skills/sgs-wp-engine/scripts/phase1-migrate-blocks.py` (migration script, committed)
- **Inputs:** `~/.wp-blockmarkup-mcp/blocks.db`; sgs-framework.db after Step 1.1
- **Outputs:** sgs-framework.db `blocks` has ~73 SGS + ~121 native_wp rows; `block_attributes` has ~1343 SGS + ~475 native_wp rows; `block_supports` has ~370 SGS + ~819 native_wp rows
- **Time:** 15 min
- **Tooling:** Python sqlite3 (no external deps); Bash for verification queries
- **On-Fail:** If import errors on type mismatch (column schema differs), print the offending row + skip with a warning log — never silent-fail. Review warning log before continuing.

### Step 1.3 — Import hooks.db (hooks + docs) into sgs-framework.db

- **Action:** Python migration script. Read `~/.wp-devdocs-mcp/hooks.db`. Import all ~7283 hook rows into `sgs-framework.hooks` with `source='native_wp'` for wp-core/gutenberg origins, `source='third_party'` for woocommerce origins. Cross-check existing SGS hooks (grep `sgs-blocks` PHP for `do_action` / `apply_filters` with `sgs_` prefix) — those get `source='sgs'`. Import all ~1150 doc rows into `sgs-framework.docs`. Mark doc sources based on origin slug prefix (wp-cli-handbook → source='native_wp', etc.).
- **Files:** CREATE `~/.agents/skills/sgs-wp-engine/scripts/phase1-migrate-hooks.py` (migration script, committed)
- **Inputs:** `~/.wp-devdocs-mcp/hooks.db`; sgs-framework.db after Step 1.2
- **Outputs:** sgs-framework.db `hooks` has ~7283 native_wp + third_party rows + ~13 sgs rows; `docs` has ~1150 imported rows
- **Time:** 15 min
- **Tooling:** Python sqlite3; grep for SGS hooks cross-reference
- **On-Fail:** If hooks.db is absent at expected path, check for alternate cache location (`~/.wp-devdocs-mcp/` root); if genuinely absent, create empty `hooks` table with correct schema — Phase 3 does not depend on hooks, only on `blocks` + `slot_synonyms`

### Step 1.4 — Extend docs with `doc_type='cli-command'` rows

- **Action:** For each of the 12 `wp sgs` commands in `.claude/specs/19-SGS-CLI-COMMANDS.md`, INSERT into `docs` with `source='sgs'`, `doc_type='cli-command'`, slug=command-name, content=syntax+examples from spec. Add additional rows for SGS pipeline commands: `sgs-clone-orchestrator.py`, `sgs-db.py`, `wp-blocks.py dump`. Use `INSERT OR IGNORE` to protect against re-runs.
- **Files:** MODIFY `~/.agents/skills/sgs-wp-engine/scripts/phase1-migrate-hooks.py` OR CREATE separate `phase1-seed-cli-docs.py`
- **Inputs:** `.claude/specs/19-SGS-CLI-COMMANDS.md`; CLAUDE.md (pipeline commands section)
- **Outputs:** `docs` table has ≥12 new `doc_type='cli-command'` rows + 3 pipeline command rows
- **Time:** 10 min
- **Tooling:** Python sqlite3; Read on Spec 19
- **On-Fail:** If Spec 19 has fewer than 12 commands documented, note the gap and seed what exists — do not pad with fabricated content

### Step 1.5 — Seed `indexed_files` table

- **Action:** Walk `plugins/sgs-blocks/src/blocks/*/block.json`, `theme/sgs-theme/parts/*.html`, `theme/sgs-theme/theme.json`, `theme/sgs-theme/style.css`, `plugins/sgs-blocks/sgs-blocks.php`. For each file: compute SHA256 hash + read mtime_ms. INSERT into `indexed_files` with `source='sgs'`. This is the baseline scan; `/sgs-update` Phase 4 will use mtimes for incremental rescans.
- **Files:** `~/.agents/skills/sgs-wp-engine/sgs-framework.db` (data only); CREATE `~/.agents/skills/sgs-wp-engine/scripts/phase1-seed-indexed-files.py`
- **Inputs:** Local filesystem; Python hashlib; os.path.getmtime
- **Outputs:** `indexed_files` has ≥73 block.json rows + theme/plugin key files; each row has valid SHA256 + mtime_ms
- **Time:** 10 min
- **Tooling:** Python os + hashlib; no external deps
- **On-Fail:** If any block.json is missing (block not yet built), skip + log. Missing files are expected for gap-candidate blocks — not a gate failure.

### Step 1.6 — Schema assertion script (HARD GATE)

- **Action:** Write `~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py`. Runs these queries and verifies non-empty / exact-count results. Exits 0 only if ALL pass; exits 1 with the failing assertion printed.
  - `SELECT * FROM blocks WHERE source='sgs' AND slug='sgs/hero'` → 1 row
  - `SELECT * FROM blocks WHERE source='native_wp' AND slug='core/button'` → 1 row
  - `SELECT * FROM blocks WHERE source='sgs' AND parent_block='sgs/multi-button'` → ≥1 row (Phase 0 seeded)
  - `SELECT * FROM slot_synonyms WHERE standalone_block='sgs/button'` → ≥1 row (Phase 0 seeded)
  - `SELECT COUNT(*) FROM docs WHERE doc_type='cli-command' AND source='sgs'` → ≥12
  - `SELECT COUNT(*) FROM hooks WHERE source='native_wp'` → ≥7000
  - `SELECT COUNT(*) FROM blocks WHERE source='native_wp'` → ≥100
  - `SELECT COUNT(*) FROM blocks WHERE source='sgs'` → ≥60
  - No duplicates: `SELECT slug, source, COUNT(*) AS n FROM blocks GROUP BY slug, source HAVING n > 1` → 0 rows
- **Files:** CREATE `~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py`
- **Inputs:** sgs-framework.db post-import
- **Outputs:** Script that Phase 3, 4, 5a can also invoke as a regression guard on every deployment
- **Time:** 10 min
- **Tooling:** Python sqlite3; no external deps
- **On-Fail:** If any assertion fails, identify the failing step (1-5) and fix before committing. Do NOT commit a DB state that fails the assertion script.

### Step 1.7 — Performance benchmark

- **Action:** `time python ~/.claude/hooks/wp-blocks.py block sgs/hero`. If >200ms (risk 1 threshold, stricter than 500ms to leave headroom for Phase 3 hot-path): add `CREATE INDEX IF NOT EXISTS idx_blocks_source_slug ON blocks(source, slug)` and re-test. Also add index on `hooks(name, source)` and `docs(doc_type, source)` proactively.
- **Files:** sgs-framework.db (index only — DDL change, no data change)
- **Inputs:** sgs-framework.db post-import + assertion-passing state
- **Outputs:** Hot-path query ≤200ms on Windows; indices documented in a brief comment in sgs-db-assert.py
- **Time:** 5 min
- **Tooling:** Python time; Bash time command; sqlite3 CREATE INDEX
- **On-Fail:** If >200ms even with indexes (Windows AV scanning the entire DB on every open), document the latency in a code comment and flag to Bean — Phase 3 may need a connection-pool approach. Do not block Phase 1 commit for this alone.

---

## Acceptance criteria

- `python sgs-db-assert.py` exits 0 (all 9 assertions pass)
- `SELECT COUNT(*) FROM blocks GROUP BY source` returns at least: `{sgs: ≥60, native_wp: ≥100}`
- `SELECT COUNT(*) FROM hooks` returns ≥7000
- `SELECT COUNT(*) FROM docs WHERE doc_type='cli-command'` returns ≥12
- `indexed_files` has ≥73 rows (one per SGS block.json minimum)
- Hot-path query `wp-blocks.py block sgs/hero` ≤200ms
- Zero duplicate rows on `(slug, source)` composite key
- Phase 0 rows (parent_block='sgs/multi-button', slot_synonyms for button) preserved unchanged

## Subagent cold prompt (for the orchestrator to dispatch)

```
You are implementing Decisions 1, 2, 11 (DB merge) from the SGS architecture programme.

# Plain-English context

We have three databases that should be one. Today every WP-knowledge query checks blocks.db (core WP blocks), hooks.db (WP hooks + docs), and sgs-framework.db (SGS blocks + framework data). After this phase: one DB (sgs-framework.db) holds everything, distinguished by a `source` column ('sgs' / 'native_wp' / 'third_party').

# Read first

- .claude/plans/2026-05-21-architecture-staging.md §3 Phase 1 decisions + §11 Decision 30 (10-source completeness — informs schema choices)
- .claude/reports/strategic-plan-2026-05-21/risk-assessment.md Phase 1 section (3 risks + plan-level risk 1)
- .claude/reports/strategic-plan-2026-05-21/hidden-decisions.md Phase 1 section
- python ~/.claude/hooks/wp-blocks.py dump → run this FIRST to enumerate current schema before any ALTER TABLE

# Source file locations

- blocks.db: `~/.wp-blockmarkup-mcp/blocks.db` (121 core blocks, 475 attributes, 819 supports)
- hooks.db: `~/.wp-devdocs-mcp/hooks.db` (7283 hooks, 1150 docs)
- sgs-framework.db: `~/.agents/skills/sgs-wp-engine/sgs-framework.db` (73 SGS blocks, 1343 attributes)

# What to build — 7 steps

## Step 1: Schema migration
ADD to sgs-framework.db:
- `blocks.source TEXT NOT NULL DEFAULT 'sgs'` (ALTER TABLE + backfill)
- `block_attributes.source TEXT NOT NULL DEFAULT 'sgs'` (ALTER TABLE + backfill)  
- `block_supports.source TEXT NOT NULL DEFAULT 'sgs'` (ALTER TABLE + backfill)
- UNIQUE constraint on (slug, source) for blocks — use CREATE UNIQUE INDEX
- NEW TABLE `indexed_files (file_path TEXT PRIMARY KEY, source TEXT, mtime_ms INTEGER, content_hash TEXT, last_indexed TIMESTAMP)`
- NEW TABLE `hooks (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, name TEXT NOT NULL, type TEXT, php_function TEXT, params TEXT, docblock TEXT, file_path TEXT, UNIQUE(name, source))`
- NEW TABLE `docs (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, file_path TEXT, slug TEXT, title TEXT, doc_type TEXT DEFAULT 'reference', category TEXT, content TEXT, UNIQUE(slug, source))`
Use ALTER TABLE for column adds. NEVER drop or rename existing rows.

## Step 2: Import blocks.db
Source: ~/.wp-blockmarkup-mcp/blocks.db
- Map blocks.block_name → sgs-framework.blocks.slug, set source='native_wp'
- Map attributes, set source='native_wp'
- Map supports, set source='native_wp'
- INSERT OR IGNORE throughout — never REPLACE
- Skip variations (Phase 2) and markup_examples (Phase 6)
Verify: SELECT source, COUNT(*) FROM blocks GROUP BY source → {sgs: ≥60, native_wp: ≥100}

## Step 3: Import hooks.db
Source: ~/.wp-devdocs-mcp/hooks.db
- All hooks → sgs-framework.hooks; source='native_wp' for wp-core/gutenberg origins, 'third_party' for woocommerce, 'sgs' for SGS-prefixed (sgs_*) hooks
- All docs → sgs-framework.docs; source by origin prefix
- INSERT OR IGNORE throughout
If hooks.db absent: create empty tables with correct schema and continue — Phase 3 does not depend on hooks.

## Step 4: Seed cli-command docs
For each command in .claude/specs/19-SGS-CLI-COMMANDS.md (12 `wp sgs` commands), INSERT into docs with:
  source='sgs', doc_type='cli-command', slug=<command>, content=<syntax+examples>
Add 3 pipeline command rows: sgs-clone-orchestrator.py, sgs-db.py, wp-blocks.py dump

## Step 5: Seed indexed_files
Walk plugins/sgs-blocks/src/blocks/*/block.json + theme/sgs-theme/parts/*.html + theme/sgs-theme/theme.json + theme/sgs-theme/style.css + plugins/sgs-blocks/sgs-blocks.php
For each: SHA256 hash + mtime_ms → INSERT into indexed_files with source='sgs'

## Step 6: Schema assertion script (HARD GATE)
Write ~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py with these assertions:
- SELECT * FROM blocks WHERE source='sgs' AND slug='sgs/hero' → 1 row
- SELECT * FROM blocks WHERE source='native_wp' AND slug='core/button' → 1 row
- SELECT * FROM blocks WHERE source='sgs' AND parent_block='sgs/multi-button' → ≥1 row
- SELECT * FROM slot_synonyms WHERE standalone_block='sgs/button' → ≥1 row
- SELECT COUNT(*) FROM docs WHERE doc_type='cli-command' AND source='sgs' → ≥12
- SELECT COUNT(*) FROM hooks WHERE source='native_wp' → ≥7000
- SELECT COUNT(*) FROM blocks WHERE source='native_wp' → ≥100
- Dedup check: SELECT slug, source, COUNT(*) n FROM blocks GROUP BY slug, source HAVING n>1 → 0 rows
Exit 0 only if ALL pass. Exit 1 with the failing assertion printed.

## Step 7: Performance benchmark + indexes
time python ~/.claude/hooks/wp-blocks.py block sgs/hero
If >200ms: CREATE INDEX idx_blocks_source_slug ON blocks(source, slug) + retest
Also add: idx_docs_doctype ON docs(doc_type, source), idx_hooks_source ON hooks(source)

# Verification gate

Run: python ~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py
All 8 assertions must pass.

# Commit gate

Do NOT commit if:
- sgs-db-assert.py exits non-zero
- Query latency >500ms on hot path (blocks lookup)
- Any UNIQUE constraint violation (duplicate rows)
- Phase 0 rows (parent_block='sgs/multi-button', slot_synonyms for sgs/button) missing

Commit message: "feat(phase-1): DB merge — Decisions 1, 2, 11 [qc:phase-1-self-verify]"

# Time budget

60 min realistic. 90 min ceiling. At 90 min, commit work completed so far + report which step stalled.

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

/qc-council Stage 5 (Sonnet + Haiku + Gemini Flash + Cerebras rater panel):

Panel verifies:
1. `sgs-db-assert.py` passes — row counts match expected minimums (Sonnet primary + Haiku cross-check)
2. No duplicate rows on composite key (Gemini Flash dedup query reviewer)
3. Phase 0 rows preserved unchanged — parent_block and slot_synonyms seeded in Phase 0 still present (Cerebras independent check)
4. Hot-path query ≤200ms confirmed with a Bash timing check

If any rater raises a gap, fix before Phase 3 dispatches. Phase 3 reads from this merged DB — incorrect imports become incorrect cv2 lookups.
