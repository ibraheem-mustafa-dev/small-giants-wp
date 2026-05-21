---
doc_type: phase-plan
project: small-giants-wp
phase: 2
phase_name: Block Variations Indexing
session_marker: Step 2.3 (post-Playwright cross-reference) — safe session boundary if time runs out
calibrated_time: ~30-50 min build + 10 min /qc-inline = ~40-60 min total
prerequisites: Phase 1 (merged sgs-framework.db with source column)
parallel_with: Phase 3, Phase 4, Phase 5a, Phase 5b, Phase 6, Phase 7 (all once Phase 1 ships)
qc_gate_after: /qc-inline (variations table row counts + Playwright block-inserter cross-reference)
generated: 2026-05-21
---

# Phase 2 — Block Variations Indexing

## Plain-English goal

Today sgs/button ships 4 registered variations (primary, secondary, outline, custom) but they are indexed nowhere — the DB has no `variations` table and Spec 16's `register_block_variation()` activation path has nothing to consult at runtime. This phase creates a `variations` table in sgs-framework.db, seeds sgs/button's 4 variations from `class-sgs-block-variations.php`, then walks all 73 SGS blocks' `block.json` `styles[]` arrays and any additional `register_block_variation()` calls to capture every block-level style alternative. A Playwright snapshot of the block inserter cross-checks the DB against the editor's actual registered variations to confirm no rows are missing. After this phase the converter and any DB consumer can ask "what variations does block X have?" and get a definitive answer.

## Decisions in scope

- **Decision 7** (§3 Phase 2) — Create `variations` table in sgs-framework.db: `(id, block_slug, name, title, description, attributes_json, inner_blocks_json, scope, markup_example, source)` — leaner than core blocks.db schema; see pre-resolved decisions below for excluded fields
- **Decision 8** (§3 Phase 2) — Seed sgs/button's 4 variations (primary, secondary, outline, custom) from `includes/variations/class-sgs-block-variations.php` + walk all 73 SGS blocks' `block.json` `styles[]` arrays

## Risk mitigations (from risk-assessment.md Phase 2)

| Risk | Mitigation step |
|---|---|
| PHP `register_block_variation()` and `block.json styles[]` may declare different names for the same variation | Step 2.2: `block.json` is authoritative (WP-native source); PHP class is the loader. Diff and report; never silently overwrite. Document any divergences in a warning log. |
| Editor registers variations at runtime that PHP seeding doesn't capture → DB out of sync | Step 2.3: Playwright snapshot of block inserter post-seeding; cross-reference every variation name in DB against the inserter's rendered variation list. Any missing row = seed failure, not "close enough". |
| `inner_blocks_json` seeded incorrectly for composite blocks → Phase 3 emits wrong block structure | Step 2.2: for every variation with non-null `inner_blocks_json`, verify shape against editor render before Phase 2 gate passes |
| Leaner schema omits fields present in blocks.db core variations → Phase 7 skill audit flags under-documentation | Step 2.1: before DDL, enumerate full core schema via `SELECT * FROM ~/.wp-blockmarkup-mcp/blocks.db` variations table. Map every field to "include" or "explicitly exclude with reason"; document exclusions in DDL comment |

## Pre-resolved decisions (from hidden-decisions.md Phase 2)

- **Seed source conflict rule:** `block.json` styles array is WP-native authoritative. PHP class is the runtime loader. If they diverge, the DB row reflects `block.json` canonical value; the divergence is logged as a warning for operator review.
- **Discovery scope:** not just sgs/button — walk ALL `class-sgs-block-variations.php` `register_block_variation()` calls AND all `block.json` `styles[]` arrays across all 73 SGS blocks.
- **Leaner schema rationale:** blocks.db includes `is_active`, `plugin_slug`, `bootstrap_dependencies` — fields specific to core's block-directory system. SGS variations don't have plugin-directory entries or bootstrap dependencies. Excluded with DDL comment explaining omission.
- **`scope` field values:** `block` (variation appears in inserter per-block), `inserter` (full inserter entry), `transform` (transform target only) — per WP `register_block_variation()` API.

---

## Steps

### Step 2.1 — Schema: create `variations` table

- **Action:** Before writing any DDL, enumerate full core blocks.db variations schema via `python -c "import sqlite3; c=sqlite3.connect('~/.wp-blockmarkup-mcp/blocks.db').cursor(); c.execute('.schema variations'); print(c.fetchall())"` (adjust for actual table name). Map every field to include/exclude with reason. Then CREATE TABLE in sgs-framework.db:
  ```sql
  CREATE TABLE IF NOT EXISTS variations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_slug TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT,
    description TEXT,
    attributes_json TEXT,       -- JSON blob; null for style-only variations
    inner_blocks_json TEXT,     -- JSON blob; null when variation has no fixed innerBlocks
    scope TEXT DEFAULT 'block', -- 'block' | 'inserter' | 'transform'
    markup_example TEXT,        -- Phase 6 backfill; null now
    source TEXT NOT NULL DEFAULT 'sgs',
    -- Excluded vs blocks.db: is_active, plugin_slug, bootstrap_dependencies (core block-directory fields; SGS has no block-directory entry)
    UNIQUE(block_slug, name, source)
  );
  ```
  Use `INSERT OR IGNORE` guard from Phase 1 (idempotent re-run safe).
- **Files:** `~/.agents/skills/sgs-wp-engine/sgs-framework.db` (DDL only, no data yet)
- **Inputs:** `~/.wp-blockmarkup-mcp/blocks.db` schema enumeration; staging doc §3 Decision 7 field list
- **Outputs:** `variations` table exists with correct schema; DDL comment documents excluded fields; `UNIQUE(block_slug, name, source)` constraint in place
- **Time:** 10 min
- **Tooling:** Python sqlite3; Bash for schema enumeration
- **On-Fail:** If blocks.db has no variations table (MCP cache doesn't store them), create schema as specified above and document in a code comment that no reference schema was available to compare against

### Step 2.2 — Seed sgs/button's 4 variations + discover all others

- **Action:** Write `~/.agents/skills/sgs-wp-engine/scripts/phase2-seed-variations.py`. Strategy:
  1. **PHP source parse:** Read `plugins/sgs-blocks/includes/variations/class-sgs-block-variations.php`. Grep for `register_block_variation(` calls. Extract block_slug, name, title, attributes_json, inner_blocks_json, scope for each.
  2. **block.json styles[] walk:** For each of the 73 `plugins/sgs-blocks/src/blocks/*/block.json` files, read the `styles` array. Each entry maps to a variation row: name=`is-style-{entry.name}`, title=`{entry.label}`, attributes_json=null, inner_blocks_json=null, scope='block'.
  3. **Conflict resolution:** where the same `(block_slug, name)` appears in BOTH PHP and block.json, `block.json` wins. Log the conflict with both values to `reports/phase2-variation-conflicts.txt` (create if needed).
  4. **Verify composite blocks:** for any row with non-null `inner_blocks_json`, print the JSON to stdout for manual review before committing. Specifically: sgs/button's `primary` + `secondary` + `outline` + `custom` variations (these are attribute overrides, not inner-block changes — expected inner_blocks_json=null for all 4).
  5. INSERT OR IGNORE all rows.
  Minimum expected rows: sgs/button (4) + at minimum 1 per block that has `styles[]` (walk confirms exact count).
- **Files:** CREATE `~/.agents/skills/sgs-wp-engine/scripts/phase2-seed-variations.py`; WRITE `reports/phase2-variation-conflicts.txt` (may be empty if no conflicts)
- **Inputs:** `plugins/sgs-blocks/includes/variations/class-sgs-block-variations.php`; all 73 `block.json` files; sgs-framework.db `variations` table from Step 2.1
- **Outputs:** `variations` table has ≥4 rows for sgs/button + rows for every block with a `styles[]` array; conflict log exists (empty or populated)
- **Time:** 20 min
- **Tooling:** Python sqlite3 + json + glob; Bash for file walk verification
- **On-Fail:** If PHP parse fails to extract variations (PHP isn't parseable by regex), fall back to reading the file and manually transcribing the 4 sgs/button variation definitions — document this fallback in a code comment. The block.json styles[] walk is simpler (JSON) and should not fail.

### Step 2.3 — Playwright cross-reference (RISK MITIGATION GATE)

- **Action:** Launch Playwright. Navigate to `http://palestine-lives.org/wp-admin/post-new.php?post_type=page` (block editor new page). Wait for editor load. Use `browser_evaluate` to query registered block variations:
  ```js
  wp.blocks.getBlockVariations('sgs/button').map(v => v.name)
  ```
  Compare the returned array against DB rows `SELECT name FROM variations WHERE block_slug='sgs/button'`. Any name in the editor that is NOT in the DB = seed failure. Any name in the DB that is NOT in the editor = stale DB row. Repeat for 3 other blocks that have `styles[]` entries (pick the first 3 alphabetically). Log results to `reports/phase2-playwright-cross-reference.txt`.
  
  **Note:** `block.json styles[]` entries register as `core/block` block styles, not as `register_block_variation()` variations — so the Playwright query may need to use `wp.blocks.getBlockStyles('sgs/button')` for style-based entries. Use both queries; document the distinction in the cross-reference log.
- **Files:** CREATE (write) `reports/phase2-playwright-cross-reference.txt`
- **Inputs:** sgs-framework.db `variations` table post-seeding; live block editor on dev site
- **Outputs:** Cross-reference log shows zero missing rows; any discrepancies surfaced before commit
- **Time:** 10 min
- **Tooling:** Playwright MCP `browser_navigate` + `browser_evaluate`; Python for DB query comparison
- **On-Fail:** If Playwright fails to reach dev site (credentials, network), fall back to manually reviewing `class-sgs-block-variations.php` against the DB rows and confirming all named variations are present. Document the fallback — Playwright cross-reference is the gold standard for this gate; manual fallback is acceptable for unblocking commit but should be retried.
- **Session marker:** this step is the safe session boundary — if time runs out after Step 2.2 completes, commit Steps 2.1+2.2 with message `feat(phase-2): variations table schema + seed — playwright cross-ref pending [qc:phase-2-partial]` and resume from Step 2.3 next session

### Step 2.4 — Schema assertion extension

- **Action:** Extend `~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py` (created in Phase 1) with Phase 2 assertions:
  - `SELECT COUNT(*) FROM variations WHERE block_slug='sgs/button' AND source='sgs'` → ≥4
  - `SELECT * FROM variations WHERE block_slug='sgs/button' AND name='primary'` → 1 row
  - `SELECT * FROM variations WHERE block_slug='sgs/button' AND name='secondary'` → 1 row
  - `SELECT * FROM variations WHERE block_slug='sgs/button' AND name='outline'` → 1 row
  - `SELECT COUNT(*) FROM variations WHERE source='sgs'` → ≥4 (will be higher after styles[] walk)
  - No duplicate `(block_slug, name, source)`: `SELECT block_slug, name, source, COUNT(*) n FROM variations GROUP BY block_slug, name, source HAVING n > 1` → 0 rows
- **Files:** MODIFY `~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py`
- **Inputs:** sgs-framework.db post-seeding
- **Outputs:** `sgs-db-assert.py` extended; exits 0 with all Phase 1 + Phase 2 assertions passing
- **Time:** 5 min
- **Tooling:** Python sqlite3
- **On-Fail:** Fix the assertion failure before committing. If assertion finds zero sgs/button rows, re-run phase2-seed-variations.py with verbose output to identify the extraction failure.

---

## Acceptance criteria

- `python sgs-db-assert.py` exits 0 with all Phase 1 + Phase 2 assertions passing
- `SELECT COUNT(*) FROM variations WHERE block_slug='sgs/button'` → 4 (primary, secondary, outline, custom)
- `SELECT COUNT(*) FROM variations WHERE source='sgs'` → ≥4; actual count logged for future reference
- `reports/phase2-playwright-cross-reference.txt` exists; zero "missing from DB" entries for sgs/button
- `reports/phase2-variation-conflicts.txt` exists (may be empty); any conflicts documented and reviewed
- Zero duplicate rows on `(block_slug, name, source)` composite key
- Phase 1 rows unchanged (run `sgs-db-assert.py` full suite, not just Phase 2 assertions)

## Subagent cold prompt (for the orchestrator to dispatch)

```
You are implementing Decisions 7 and 8 (Block Variations Indexing) from the SGS architecture programme.

# Plain-English context

sgs/button ships 4 registered variations (primary, secondary, outline, custom) but they are indexed nowhere.
After this phase: sgs-framework.db has a `variations` table and every SGS block variation is seeded into it.
The Spec 16 register_block_variation() activation path will consult this table instead of having no DB to query.

# Read first (mandatory before any code)

- .claude/plans/2026-05-21-architecture-staging.md §3 Phase 2 decisions + §11 Decision 7 and 8 detail
- .claude/reports/strategic-plan-2026-05-21/risk-assessment.md Phase 2 section (3 risks)
- .claude/reports/strategic-plan-2026-05-21/hidden-decisions.md Phase 2 section (3 pause-points resolved)
- python ~/.claude/hooks/wp-blocks.py dump → enumerate current schema BEFORE any DDL (blub.db 272)
- git log --oneline -20 → check for Phase 1 completion commit before starting (Phase 2 depends on Phase 1's merged DB)

# Prerequisite check

Phase 1 MUST be complete before this phase. Verify:
  python ~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py
  → All assertions must pass (including sgs/hero row, core/button row, hooks count ≥7000)
  → If assertion fails, STOP and surface the failure — do NOT proceed with Phase 2 on a broken DB

# Source file locations

- class-sgs-block-variations.php: plugins/sgs-blocks/includes/variations/class-sgs-block-variations.php
- SGS block.json files: plugins/sgs-blocks/src/blocks/*/block.json (73 blocks)
- sgs-framework.db: ~/.agents/skills/sgs-wp-engine/sgs-framework.db

# What to build — 4 steps

## Step 1: Create variations table
In sgs-framework.db, CREATE TABLE variations:
  (id INTEGER PRIMARY KEY AUTOINCREMENT, block_slug TEXT NOT NULL, name TEXT NOT NULL,
   title TEXT, description TEXT, attributes_json TEXT, inner_blocks_json TEXT,
   scope TEXT DEFAULT 'block', markup_example TEXT, source TEXT NOT NULL DEFAULT 'sgs',
   UNIQUE(block_slug, name, source))

BEFORE creating: check ~/.wp-blockmarkup-mcp/blocks.db for a variations table schema to compare against.
If found, map each field to include or exclude with a DDL comment explaining the decision.
Excluded fields: is_active, plugin_slug, bootstrap_dependencies (core block-directory only; SGS has no block-directory entry).

## Step 2: Seed all variations
Write ~/.agents/skills/sgs-wp-engine/scripts/phase2-seed-variations.py. Two passes:

Pass A — PHP parse:
  Read class-sgs-block-variations.php; extract all register_block_variation() calls.
  Map to: block_slug, name, title, attributes_json (JSON.stringify the attributes object), inner_blocks_json, scope.
  sgs/button expected rows: primary, secondary, outline, custom.

Pass B — block.json styles[] walk:
  For each plugins/sgs-blocks/src/blocks/*/block.json, read the "styles" array if present.
  Each styles[] entry → INSERT with name='is-style-{entry.name}', title=entry.label, attributes_json=null,
  inner_blocks_json=null, scope='block'.

Conflict resolution: (block_slug, name) appears in BOTH → block.json wins. Log the conflict to
  reports/phase2-variation-conflicts.txt (create file even if empty).

INSERT OR IGNORE throughout. Run script and verify output row counts.

## Step 3: Playwright cross-reference
Navigate to http://palestine-lives.org/wp-admin/post-new.php?post_type=page
Query: wp.blocks.getBlockVariations('sgs/button').map(v => v.name)
Also: wp.blocks.getBlockStyles('sgs/button').map(s => s.name)
Compare both against DB rows WHERE block_slug='sgs/button'.
Repeat for 3 additional blocks that have styles[] entries.
Write results to reports/phase2-playwright-cross-reference.txt.
Any name in editor but NOT in DB = seed failure → fix before continuing.

## Step 4: Extend schema assertion script
Extend ~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py with:
- SELECT COUNT(*) FROM variations WHERE block_slug='sgs/button' AND source='sgs' → ≥4
- SELECT * FROM variations WHERE name='primary' AND block_slug='sgs/button' → 1 row
- SELECT * FROM variations WHERE name='secondary' AND block_slug='sgs/button' → 1 row
- SELECT * FROM variations WHERE name='outline' AND block_slug='sgs/button' → 1 row
- SELECT COUNT(*) FROM variations WHERE source='sgs' → ≥4
- Dedup check: SELECT block_slug, name, source, COUNT(*) n FROM variations GROUP BY block_slug, name, source HAVING n>1 → 0 rows

# Verification gate

Run: python ~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py
All Phase 1 AND Phase 2 assertions must pass (full suite, not just new ones).
reports/phase2-playwright-cross-reference.txt must exist with zero "missing from DB" entries.

# Commit gate

Do NOT commit if:
- sgs-db-assert.py exits non-zero
- Phase 1 rows (sgs/hero, core/button, hooks ≥7000) absent (regression check)
- sgs/button variation count < 4
- Any UNIQUE constraint violation (duplicate rows)

Commit message: "feat(phase-2): variations table + seed — Decisions 7, 8 [qc:phase-2-self-verify]"
Stage by exact path. Never git add . or -A.

# Time budget

40 min realistic. 60 min ceiling.
At 60 min: commit Steps 1+2 if complete, note Phase 3 in commit body, resume from Step 3 next session.

# Methodology guardrails (do not skip)
- blub.db 254 — Read pipeline-state/<run>/leftover-buckets.json BEFORE conjecturing
- blub.db 255 — Multi-model /qc panel BEFORE every converter/pipeline/SGS-block commit
- blub.db 256 — Per-section cropped pixel-diff, never full-page
- blub.db 272 — Schema enumeration BEFORE missing-X claims (run wp-blocks.py dump FIRST)
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

/qc-inline (self-check before commit):

1. `sgs-db-assert.py` passes full suite — Phase 1 AND Phase 2 assertions (row-count + dedup)
2. `reports/phase2-playwright-cross-reference.txt` reviewed — zero "missing from DB" rows for sgs/button
3. `reports/phase2-variation-conflicts.txt` reviewed — any conflicts documented with resolution
4. Phase 1 rows preserved — sgs/hero, core/button, hooks ≥7000 still present (regression guard)
5. `inner_blocks_json` for composite variations reviewed manually — correct shape confirmed before commit

If any item fails, fix before Phase 3 or Phase 6 dispatches. Phase 6 authors markup_examples that reference variation names — incorrect variation names become incorrect markup examples.
