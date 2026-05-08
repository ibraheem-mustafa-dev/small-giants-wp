-- ============================================================================
-- uimax cloning-pipeline schema migration
-- Date:     2026-05-07
-- Target:   C:\Users\Bean\.agents\skills\ui-ux-pro-max\scripts\ui-ux-pro-max.db
-- Purpose:  Add the cross-platform translation layer (Rosetta Stone) and the
--           cloning-pipeline support tables. Extends existing classifiable
--           tables with industry / mood / style columns; adds is_emoji flag;
--           creates new tables for patterns, naming_conventions, animations,
--           mood_boards, and 5 stack_* tables.
-- Reference: .claude/specs/pattern-dedup-classify-mechanics-2026-05-05.md
--            .claude/specs/cloning-skill-salvage-matrix-2026-05-05.md
--            blub.db row 213 (Rosetta Stone discipline)
-- ============================================================================

-- Run with:
--   sqlite3 "C:\Users\Bean\.agents\skills\ui-ux-pro-max\scripts\ui-ux-pro-max.db" \
--           < scripts/migrations/uimax-cloning-2026-05-07.sql
--
-- Idempotency: ALTER TABLE statements are intended to be applied via a runtime
-- helper that checks pragma_table_info() before each one. CREATE TABLE
-- statements use IF NOT EXISTS. CREATE INDEX statements use IF NOT EXISTS.

-- ============================================================================
-- PART 1 — Classification columns on existing tables (Rosetta Stone backbone)
-- ============================================================================
-- For each classifiable table, add: industry, mood, style, equivalent_implementations.
-- These tables already have `provenance` (a neutral "where data came from" column —
-- DOES NOT mean licensing per blub.db row 211). New `equivalent_implementations`
-- column is a JSON object holding cross-platform name mappings.

-- landing (page-shape recipes — 34 rows)
ALTER TABLE landing ADD COLUMN industry TEXT;
ALTER TABLE landing ADD COLUMN mood TEXT;
ALTER TABLE landing ADD COLUMN style TEXT;
ALTER TABLE landing ADD COLUMN equivalent_implementations TEXT;  -- JSON

-- colors (curated palette rows — 269 rows)
ALTER TABLE colors ADD COLUMN industry TEXT;
ALTER TABLE colors ADD COLUMN mood TEXT;
ALTER TABLE colors ADD COLUMN style TEXT;

-- icons (curated icon picks — 105 rows)
ALTER TABLE icons ADD COLUMN industry TEXT;
ALTER TABLE icons ADD COLUMN mood TEXT;
ALTER TABLE icons ADD COLUMN style TEXT;

-- icon_libraries (icon set catalog — 225 rows) + Rosetta Stone equivalents + emoji flag
ALTER TABLE icon_libraries ADD COLUMN industry TEXT;
ALTER TABLE icon_libraries ADD COLUMN mood TEXT;
ALTER TABLE icon_libraries ADD COLUMN style TEXT;
ALTER TABLE icon_libraries ADD COLUMN is_emoji INTEGER DEFAULT 0;
ALTER TABLE icon_libraries ADD COLUMN equivalent_implementations TEXT;  -- JSON

-- component_libraries (Radix, USWDS, GCDS — 144 rows; SGS blocks added at Step 7)
ALTER TABLE component_libraries ADD COLUMN industry TEXT;
ALTER TABLE component_libraries ADD COLUMN mood TEXT;
ALTER TABLE component_libraries ADD COLUMN style TEXT;
ALTER TABLE component_libraries ADD COLUMN equivalent_implementations TEXT;  -- JSON

-- ux_guidelines, app_interface (UX rule + issue tables)
ALTER TABLE ux_guidelines ADD COLUMN industry TEXT;
ALTER TABLE ux_guidelines ADD COLUMN mood TEXT;
ALTER TABLE ux_guidelines ADD COLUMN style TEXT;

ALTER TABLE app_interface ADD COLUMN industry TEXT;
ALTER TABLE app_interface ADD COLUMN mood TEXT;
ALTER TABLE app_interface ADD COLUMN style TEXT;

-- products (product-type → style/landing — 161 rows)
ALTER TABLE products ADD COLUMN industry TEXT;
ALTER TABLE products ADD COLUMN mood TEXT;
ALTER TABLE products ADD COLUMN style TEXT;

-- gov_patterns, interaction_patterns (authoritative ARIA + GOV references)
ALTER TABLE gov_patterns ADD COLUMN industry TEXT;
ALTER TABLE gov_patterns ADD COLUMN mood TEXT;
ALTER TABLE gov_patterns ADD COLUMN style TEXT;

ALTER TABLE interaction_patterns ADD COLUMN industry TEXT;
ALTER TABLE interaction_patterns ADD COLUMN mood TEXT;
ALTER TABLE interaction_patterns ADD COLUMN style TEXT;

-- Indexes for read-side filtering by classification
CREATE INDEX IF NOT EXISTS idx_landing_industry ON landing(industry);
CREATE INDEX IF NOT EXISTS idx_landing_mood ON landing(mood);
CREATE INDEX IF NOT EXISTS idx_landing_style ON landing(style);
CREATE INDEX IF NOT EXISTS idx_colors_industry ON colors(industry);
CREATE INDEX IF NOT EXISTS idx_components_industry ON component_libraries(industry);
CREATE INDEX IF NOT EXISTS idx_icon_libraries_is_emoji ON icon_libraries(is_emoji);

-- ============================================================================
-- PART 2 — New tables (cloning-pipeline data products)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- patterns (uimax-side mirror of sgs-db `patterns` with Rosetta Stone columns)
-- ----------------------------------------------------------------------------
-- This is the cross-platform expression of every pattern: same fingerprint as
-- sgs-db, but with per-platform equivalents and FK lists to landing recipes,
-- products, and component_libraries.

CREATE TABLE IF NOT EXISTS patterns (
    slug                       TEXT PRIMARY KEY,
    name                       TEXT NOT NULL,
    category                   TEXT,                  -- Heroes / Pricing / Footers / etc. (semantic)
    industry                   TEXT,
    mood                       TEXT,
    style                      TEXT,
    content_shape              TEXT,
    fingerprint                TEXT NOT NULL UNIQUE,  -- mirrors sgs-db fingerprint
    source                     TEXT,                  -- 'idea' / 'draft' / '<URL>'
    block_composition          TEXT,                  -- JSON array of SGS block slugs
    landing_recipe_ids         TEXT,                  -- JSON array of FKs to landing.no
    product_type_ids           TEXT,                  -- JSON array of FKs to products.no
    component_library_keys     TEXT,                  -- JSON array of FKs to component_libraries.component_key
    equivalent_implementations TEXT,                  -- JSON: {sgs_block, html_css_draft, bootstrap, shadcn, tailwind, react_generic, ai_builder_lovable, ai_builder_v0, ai_builder_bolt}
    perceptual_hash            TEXT,                  -- placeholder, not yet a decision input
    parent_pattern_slug        TEXT REFERENCES patterns(slug),
    provenance                 TEXT,                  -- neutral source attribution (NOT licensing — see row 211)
    created_at                 TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_uimax_patterns_fingerprint ON patterns(fingerprint);
CREATE INDEX IF NOT EXISTS idx_uimax_patterns_category ON patterns(category);
CREATE INDEX IF NOT EXISTS idx_uimax_patterns_industry ON patterns(industry);
CREATE INDEX IF NOT EXISTS idx_uimax_patterns_mood ON patterns(mood);

-- ----------------------------------------------------------------------------
-- naming_conventions (the Rosetta Stone key — convention-aware parser routing)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS naming_conventions (
    convention_name    TEXT PRIMARY KEY,            -- BEM, SGS, WordPress Gutenberg, Tailwind, Bootstrap, etc.
    pattern_regex      TEXT,                        -- regex matching class names
    example_class      TEXT,                        -- ".card__title--featured" for BEM
    class_anatomy      TEXT,                        -- "block__element--modifier" prose
    extraction_rule    TEXT,                        -- how a parser should split / interpret
    platform_typical   TEXT,                        -- WordPress / generic-CSS / utility-framework / specific-builder
    notes              TEXT,
    provenance         TEXT,
    created_at         TEXT DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- animations (cross-platform animation library — Rosetta Stone discipline)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS animations (
    slug               TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    category           TEXT,                        -- entrance / exit / emphasis / loading / hover / scroll-trigger / page-transition / micro-interaction
    duration_ms        INTEGER,
    easing             TEXT,
    properties         TEXT,                        -- JSON array of CSS properties animated
    best_for           TEXT,
    accessibility_notes TEXT,                       -- prefers-reduced-motion fallback
    gpu_safe           INTEGER DEFAULT 1,           -- 1 if only transform/opacity, 0 otherwise
    -- Rosetta Stone equivalents
    sgs_block          TEXT,                        -- SGS block slug or NULL+gap-flag
    sgs_attribute_name TEXT,                        -- e.g. 'hoverEffect' or 'sgsAnimation'
    css_implementation TEXT,                        -- CSS code snippet
    framer_motion      TEXT,                        -- Framer Motion code
    gsap               TEXT,                        -- GSAP code
    wapi               TEXT,                        -- Web Animations API code
    wp_interactivity   TEXT,                        -- data-wp-* directives
    is_gap_candidate   INTEGER DEFAULT 0,           -- 1 if no SGS equivalent exists yet
    provenance         TEXT,
    source_url         TEXT,
    created_at         TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_animations_category ON animations(category);
CREATE INDEX IF NOT EXISTS idx_animations_sgs_block ON animations(sgs_block);
CREATE INDEX IF NOT EXISTS idx_animations_gap_candidate ON animations(is_gap_candidate);

-- ----------------------------------------------------------------------------
-- mood_boards (named collections of intelligence pulled from URLs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mood_boards (
    name           TEXT PRIMARY KEY,
    description    TEXT,
    source_urls    TEXT,                            -- JSON array
    captured_at    TEXT DEFAULT (datetime('now')),
    industry_focus TEXT,
    mood_focus     TEXT,
    style_focus    TEXT,
    notes          TEXT
);

CREATE TABLE IF NOT EXISTS mood_board_items (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    mood_board     TEXT NOT NULL REFERENCES mood_boards(name) ON DELETE CASCADE,
    artefact_type  TEXT NOT NULL,                   -- 'pattern' / 'animation' / 'palette' / 'typography' / 'icon' / 'component'
    artefact_ref   TEXT NOT NULL,                   -- foreign key into the relevant table (slug or composite ref)
    notes          TEXT,
    added_at       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mood_board_items_board ON mood_board_items(mood_board);

-- ============================================================================
-- PART 3 — Stack tables (platform layer)
-- ============================================================================
-- Schema mirrors existing stack_* tables (10 columns) with `version_min` added
-- per Bean's 2026-05-06 follow-up so rules can expire/be deprecated cleanly.

CREATE TABLE IF NOT EXISTS stack_sgs_wordpress (
    no INTEGER, category TEXT, guideline TEXT, description TEXT, do TEXT,
    don_t TEXT, code_good TEXT, code_bad TEXT, severity TEXT, docs_url TEXT,
    version_min TEXT,                              -- e.g. 'sgs-2026.01' or 'wp-6.5'
    provenance TEXT
);

CREATE TABLE IF NOT EXISTS stack_wordpress (
    no INTEGER, category TEXT, guideline TEXT, description TEXT, do TEXT,
    don_t TEXT, code_good TEXT, code_bad TEXT, severity TEXT, docs_url TEXT,
    version_min TEXT, provenance TEXT
);

CREATE TABLE IF NOT EXISTS stack_php (
    no INTEGER, category TEXT, guideline TEXT, description TEXT, do TEXT,
    don_t TEXT, code_good TEXT, code_bad TEXT, severity TEXT, docs_url TEXT,
    version_min TEXT, provenance TEXT
);

CREATE TABLE IF NOT EXISTS stack_html_css (
    no INTEGER, category TEXT, guideline TEXT, description TEXT, do TEXT,
    don_t TEXT, code_good TEXT, code_bad TEXT, severity TEXT, docs_url TEXT,
    version_min TEXT, provenance TEXT
);

CREATE TABLE IF NOT EXISTS stack_bootstrap (
    no INTEGER, category TEXT, guideline TEXT, description TEXT, do TEXT,
    don_t TEXT, code_good TEXT, code_bad TEXT, severity TEXT, docs_url TEXT,
    version_min TEXT, provenance TEXT
);

-- Deferred (not created until UC1 / UC2 lands):
-- stack_eleventy, stack_hugo

-- ============================================================================
-- Smoke verification (run after migration)
-- ============================================================================

-- 1. Classification columns on existing tables — expect ≥3 hits per table:
--    SELECT name FROM pragma_table_info('landing') WHERE name IN ('industry','mood','style');
--
-- 2. New tables exist:
--    SELECT name FROM sqlite_master WHERE type='table' AND name IN
--      ('patterns','naming_conventions','animations','mood_boards','mood_board_items',
--       'stack_sgs_wordpress','stack_wordpress','stack_php','stack_html_css','stack_bootstrap');
--    Expect 10 rows.
--
-- 3. is_emoji flag on icon_libraries:
--    SELECT name FROM pragma_table_info('icon_libraries') WHERE name = 'is_emoji';
--    Expect 1 row.
--
-- 4. Rosetta Stone JSON columns:
--    SELECT name, sql FROM sqlite_master WHERE sql LIKE '%equivalent_implementations%';
--    Expect ≥4 hits (landing, icon_libraries, component_libraries, patterns).
