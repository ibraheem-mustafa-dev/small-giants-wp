-- ============================================================================
-- sgs-db cloning-pipeline schema migration
-- Date:     2026-05-07
-- Target:   C:\Users\Bean\.claude\skills\sgs-wp-engine\sgs-framework.db
-- Purpose:  Extend the existing `patterns` table with the columns the cloning
--           pipeline needs (fingerprint dedup, classification, content shape,
--           variant relationships). All ALTER TABLE statements are guarded so
--           the migration is idempotent — pattern-register.py can run it on a
--           fresh DB or a partially-migrated DB without errors.
-- Reference: .claude/specs/pattern-dedup-classify-mechanics-2026-05-05.md
-- ============================================================================

-- Run with:
--   sqlite3 "C:\Users\Bean\.claude\skills\sgs-wp-engine\sgs-framework.db" \
--           < scripts/migrations/sgs-db-cloning-2026-05-07.sql
--
-- Idempotency note: SQLite does NOT support `ALTER TABLE ADD COLUMN IF NOT EXISTS`
-- on all versions. The migration uses a feature-detection pattern via
-- pragma_table_info() embedded in pattern-register.py's `apply_migration()`
-- helper. This SQL file is the canonical record of intent; the runtime applies
-- it column-by-column with existence checks.

-- ----------------------------------------------------------------------------
-- patterns: extend with cloning-pipeline columns
-- ----------------------------------------------------------------------------

ALTER TABLE patterns ADD COLUMN content_shape   TEXT;
ALTER TABLE patterns ADD COLUMN mood            TEXT;
ALTER TABLE patterns ADD COLUMN style           TEXT;
ALTER TABLE patterns ADD COLUMN fingerprint     TEXT;          -- dedup key (UNIQUE index added below)
ALTER TABLE patterns ADD COLUMN source          TEXT;          -- 'idea' / 'draft' / '<URL>' only
ALTER TABLE patterns ADD COLUMN block_composition TEXT;        -- JSON array of SGS block slugs
ALTER TABLE patterns ADD COLUMN parent_pattern_id INTEGER;     -- FK to patterns(rowid) for variants
ALTER TABLE patterns ADD COLUMN perceptual_hash TEXT;          -- placeholder, not yet a decision input

-- Indexes for the cloning pipeline's read paths
CREATE UNIQUE INDEX IF NOT EXISTS idx_patterns_fingerprint
    ON patterns(fingerprint)
    WHERE fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patterns_content_shape ON patterns(content_shape);
CREATE INDEX IF NOT EXISTS idx_patterns_mood          ON patterns(mood);
CREATE INDEX IF NOT EXISTS idx_patterns_style         ON patterns(style);
CREATE INDEX IF NOT EXISTS idx_patterns_industry      ON patterns(industry);
CREATE INDEX IF NOT EXISTS idx_patterns_category      ON patterns(category);

-- ----------------------------------------------------------------------------
-- block_compositions: already exists (0 rows), schema is suitable. No change.
-- The cloning pipeline becomes its first writer (pattern-register.py Step 6).
-- ----------------------------------------------------------------------------

-- No DDL change. Documented here for completeness:
--   id, composition_name, block_slugs, frequency, industry, page_type,
--   description, auto_pattern_slug

-- ----------------------------------------------------------------------------
-- Rollback (manual, exploratory only)
-- ----------------------------------------------------------------------------

-- SQLite cannot DROP COLUMN before 3.35; rollback requires a recreate.
-- For local exploration only:
--   1. CREATE TABLE patterns_old AS SELECT slug, title, category, description,
--        blocks_used, file_path, industry, is_auto_generated, created_at
--        FROM patterns;
--   2. DROP TABLE patterns;
--   3. ALTER TABLE patterns_old RENAME TO patterns;
--   4. Re-create the original schema's PRIMARY KEY and indexes.
-- Do NOT run rollback on a populated DB — it loses all classifications.

-- ----------------------------------------------------------------------------
-- Smoke verification (run after migration)
-- ----------------------------------------------------------------------------

-- Confirm new columns exist:
--   SELECT name FROM pragma_table_info('patterns')
--   WHERE name IN ('content_shape','mood','style','fingerprint','source',
--                  'block_composition','parent_pattern_id','perceptual_hash');
-- Expect 8 rows.

-- Confirm fingerprint UNIQUE index:
--   SELECT name FROM sqlite_master WHERE type='index'
--   AND name='idx_patterns_fingerprint';
-- Expect 1 row.
