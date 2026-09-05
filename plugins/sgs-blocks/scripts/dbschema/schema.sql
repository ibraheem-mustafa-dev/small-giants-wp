-- SGS framework knowledge-base schema
-- GENERATED VERBATIM from the live DB's sqlite_master. Regenerated 2026-09-06
-- by: python dbschema/check_schema_drift.py --regenerate
-- Do NOT hand-edit: byte-fidelity to the live schema is the entire point.
-- Regenerate rather than patch, then run: python dbschema/check_schema_drift.py --check
--
-- EXCLUDED: SQLite-internal objects (sqlite_*) — SQLite creates these itself and
-- REFUSES an explicit CREATE ('object name reserved for internal use').
-- Present in the live DB: sqlite_autoindex_blocks_1, sqlite_autoindex_block_attributes_1, sqlite_sequence, sqlite_autoindex_block_supports_1, sqlite_autoindex_block_capabilities_1, sqlite_autoindex_style_variations_1, sqlite_autoindex_patterns_1, sqlite_autoindex_theme_parts_1, sqlite_autoindex_plugins_1, sqlite_autoindex_hooks_1, sqlite_autoindex_pattern_coverage_1, sqlite_autoindex_animation_tokens_1, sqlite_autoindex_property_suffixes_1, sqlite_autoindex_modifier_suffixes_1, sqlite_autoindex_indexed_files_1, sqlite_autoindex_docs_1, sqlite_autoindex_schema_metadata_1, sqlite_autoindex_design_tokens_1, sqlite_autoindex_html_tag_to_core_block_1, sqlite_autoindex_slots_1, sqlite_autoindex_roles_1, sqlite_autoindex_block_composition_1, sqlite_autoindex_variant_slots_1, sqlite_autoindex_excluded_properties_1, sqlite_autoindex_array_item_schema_1, sqlite_autoindex_preset_implications_1, sqlite_autoindex_fx_effects_1, sqlite_autoindex_schema_migrations_1, sqlite_autoindex_components_1, sqlite_autoindex_variant_composition_slots_1, sqlite_autoindex_variant_composition_attr_slots_1

-- table: animation_tokens
CREATE TABLE animation_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        keyframes TEXT NOT NULL,
        duration TEXT DEFAULT '300ms',
        easing TEXT DEFAULT 'ease',
        description TEXT,
        used_by TEXT,
        category TEXT DEFAULT 'entrance',
        created_at TEXT DEFAULT (datetime('now'))
    );

-- table: array_item_schema
CREATE TABLE array_item_schema (
                block_slug   TEXT NOT NULL,
                array_attr   TEXT NOT NULL,
                field_key    TEXT NOT NULL,
                field_order  INTEGER, role TEXT,
                PRIMARY KEY (block_slug, array_attr, field_key)
            );

-- table: block_attributes
CREATE TABLE block_attributes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        block_slug TEXT NOT NULL,
        attr_name TEXT NOT NULL,
        attr_type TEXT NOT NULL,
        default_value TEXT,
        enum_values TEXT,
        description TEXT,
        is_responsive INTEGER DEFAULT 0, canonical_slot TEXT, role TEXT, derived_selector TEXT, output_signature TEXT, equivalent_implementations TEXT, inspector_control_type TEXT, source TEXT NOT NULL DEFAULT 'sgs', emit_shape TEXT, alt_companion_attr TEXT, css_layer TEXT, css_property TEXT, box_family TEXT, css_element TEXT, css_state TEXT, css_tier TEXT, canonical_slot_aliases TEXT,
        FOREIGN KEY (block_slug) REFERENCES blocks(slug),
        UNIQUE(block_slug, attr_name)
    );

-- table: block_capabilities
CREATE TABLE block_capabilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        block_slug TEXT NOT NULL,
        capability TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'functional',
        FOREIGN KEY (block_slug) REFERENCES blocks(slug),
        UNIQUE(block_slug, capability)
    );

-- table: block_composition
CREATE TABLE block_composition (
  block_slug TEXT PRIMARY KEY,
  wraps_block TEXT,
  composition_role TEXT NOT NULL CHECK(composition_role IN
    ('section-root', 'wrapper-shell', 'content-block', 'leaf')),
  accepts_allowed_blocks TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, container_kind TEXT CHECK (container_kind IN ('section', 'layout', 'content')),
  FOREIGN KEY (block_slug) REFERENCES blocks(slug)
);

-- table: block_selectors
CREATE TABLE block_selectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        block_slug TEXT NOT NULL,
        element TEXT NOT NULL,
        selector TEXT NOT NULL,
        FOREIGN KEY (block_slug) REFERENCES blocks(slug)
    );

-- table: block_supports
CREATE TABLE block_supports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        block_slug TEXT NOT NULL,
        support_name TEXT NOT NULL,
        support_value TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'sgs', is_stale INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (block_slug) REFERENCES blocks(slug),
        UNIQUE(block_slug, support_name)
    );

-- table: blocks
CREATE TABLE blocks (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('static', 'dynamic')),
        status TEXT NOT NULL DEFAULT 'built',
        description TEXT,
        has_view_script INTEGER DEFAULT 0,
        has_render_php INTEGER DEFAULT 0,
        parent_block TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    , replaces TEXT, source TEXT NOT NULL DEFAULT 'sgs', is_stale INTEGER DEFAULT 0, tier TEXT CHECK (tier IN ('block', 'class-section', 'pattern')) DEFAULT 'block', variant_attr TEXT);

-- table: components
CREATE TABLE "components" (
    "name" TEXT PRIMARY KEY,
    "component_type" TEXT NOT NULL CHECK("component_type" IN ('editor', 'util', 'extension', 'helper-function')),
    "file_path" TEXT NOT NULL,
    "description" TEXT,
    "props" TEXT,
    "family" TEXT,
    "functionality" TEXT,
    "adopters" INTEGER,
    "adopter_list" TEXT
);

-- table: deploy_steps
CREATE TABLE deploy_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        component TEXT NOT NULL,
        step_order INTEGER NOT NULL,
        command TEXT NOT NULL,
        description TEXT NOT NULL,
        is_verification INTEGER DEFAULT 0
    );

-- table: design_tokens
CREATE TABLE "design_tokens" (
                slug          TEXT PRIMARY KEY,
                token_type    TEXT NOT NULL CHECK(token_type IN ('colour', 'font', 'spacing', 'size', 'shadow')),
                default_value TEXT NOT NULL,
                css_var       TEXT NOT NULL,
                description   TEXT
            );

-- table: docs
CREATE TABLE docs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            source      TEXT NOT NULL DEFAULT 'sgs',
            file_path   TEXT,
            slug        TEXT NOT NULL,
            title       TEXT,
            doc_type    TEXT NOT NULL DEFAULT 'reference',
            category    TEXT,
            content     TEXT,
            UNIQUE(slug, source)
        );

-- table: excluded_properties
CREATE TABLE excluded_properties (  css_property TEXT NOT NULL,  reason       TEXT NOT NULL,  decided_by   TEXT NOT NULL,  date         TEXT NOT NULL,  UNIQUE(css_property));

-- table: fx_effects
CREATE TABLE fx_effects (
            effect                  TEXT PRIMARY KEY,
            tier                    TEXT NOT NULL,
            plugin_set              TEXT NOT NULL,
            owns_scroll_transform   INTEGER NOT NULL DEFAULT 0,
            reduced_motion          TEXT NOT NULL,
            editor_story            TEXT NOT NULL,
            created_at              TEXT DEFAULT (datetime('now'))
        , scope TEXT NOT NULL DEFAULT 'block', requires TEXT NOT NULL DEFAULT 'none', pins INTEGER NOT NULL DEFAULT 0, triggers TEXT NOT NULL DEFAULT 'scroll', creates_panel INTEGER NOT NULL DEFAULT 1, in_picker INTEGER NOT NULL DEFAULT 0);

-- table: gotchas
CREATE TABLE gotchas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL CHECK(severity IN ('critical', 'major', 'minor', 'info')),
        component TEXT,
        workaround TEXT,
        discovered_date TEXT
    );

-- table: hooks
CREATE TABLE hooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        hook_type TEXT NOT NULL CHECK(hook_type IN ('action', 'filter')),
        plugin_slug TEXT,
        description TEXT,
        parameters TEXT,
        file_path TEXT, source TEXT NOT NULL DEFAULT 'sgs', docblock TEXT, type TEXT,
        UNIQUE(name, hook_type)
    );

-- table: html_tag_to_core_block
CREATE TABLE html_tag_to_core_block (  html_tag TEXT PRIMARY KEY,  core_block_slug TEXT NOT NULL,  note TEXT,  created_at TEXT DEFAULT CURRENT_TIMESTAMP);

-- table: indexed_files
CREATE TABLE indexed_files (
            file_path   TEXT PRIMARY KEY,
            source      TEXT NOT NULL DEFAULT 'sgs',
            mtime_ms    INTEGER,
            content_hash TEXT,
            last_indexed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

-- table: markup_examples
CREATE TABLE markup_examples (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    block_slug       TEXT    NOT NULL,
    title            TEXT    NOT NULL,
    description      TEXT,
    markup_html      TEXT    NOT NULL,
    attributes_json  TEXT,
    is_hand_authored INTEGER NOT NULL DEFAULT 0,
    generated_from   TEXT,
    source           TEXT    NOT NULL DEFAULT 'sgs',
    validation_status TEXT   NOT NULL DEFAULT 'unverified',
    created_at       TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- table: modifier_suffixes
CREATE TABLE modifier_suffixes (
                suffix TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                notes TEXT
            );

-- table: pattern_coverage
CREATE TABLE pattern_coverage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        industry TEXT NOT NULL,
        section_type TEXT NOT NULL,
        pattern_slug TEXT,
        status TEXT NOT NULL DEFAULT 'missing' CHECK(status IN ('complete', 'partial', 'missing')),
        UNIQUE(industry, section_type)
    );

-- table: patterns
CREATE TABLE patterns (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        blocks_used TEXT NOT NULL,
        file_path TEXT NOT NULL,
        industry TEXT,
        is_auto_generated INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    , content_shape   TEXT, mood            TEXT, style           TEXT, fingerprint     TEXT, source          TEXT, block_composition TEXT, parent_pattern_id INTEGER, perceptual_hash TEXT);

-- table: plugins
CREATE TABLE plugins (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        namespace TEXT NOT NULL,
        text_domain TEXT NOT NULL,
        db_tables TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        description TEXT
    );

-- table: preset_implications
CREATE TABLE preset_implications (
          block_slug        TEXT NOT NULL,
          preset_attr       TEXT NOT NULL,
          enum_value        TEXT NOT NULL,
          implied_property  TEXT NOT NULL DEFAULT '',
          presence          TEXT NOT NULL DEFAULT 'present',
          is_neutral        INTEGER NOT NULL DEFAULT 0,
          created_at        TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (block_slug, preset_attr, enum_value)
        );

-- table: property_suffixes
CREATE TABLE property_suffixes (
                suffix TEXT PRIMARY KEY,
                role TEXT NOT NULL,
                css_property TEXT,
                is_token_matched INTEGER DEFAULT 1,
                token_source TEXT,
                notes TEXT
            , kind_override TEXT);

-- table: roles
CREATE TABLE roles (
          role_name      TEXT PRIMARY KEY,
          classification TEXT NOT NULL CHECK (classification IN
                         ('content-bearing','styling-behaviour','unclassified')),
          description    TEXT,
          created_at     TEXT DEFAULT CURRENT_TIMESTAMP
        );

-- table: schema_metadata
CREATE TABLE schema_metadata (
            key   TEXT PRIMARY KEY,
            value TEXT
        );

-- table: schema_migrations
CREATE TABLE schema_migrations (filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL);

-- table: slots
CREATE TABLE slots (
          slot_name        TEXT NOT NULL,
          scope            TEXT NOT NULL CHECK (scope IN ('section','element')),
          aliases          TEXT,
          standalone_block TEXT,
          notes            TEXT,
          created_at       TEXT DEFAULT CURRENT_TIMESTAMP, standalone_block_default_attrs TEXT, resolves_whole_instance TEXT,
          PRIMARY KEY (slot_name, scope)
        );

-- table: style_variations
CREATE TABLE style_variations (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        client TEXT,
        industry TEXT,
        tokens_json TEXT NOT NULL,
        font_heading TEXT,
        font_body TEXT,
        deploy_target TEXT,
        deploy_ssh TEXT,
        deploy_wp_path TEXT,
        is_active INTEGER DEFAULT 1
    , source_path TEXT, last_modified TEXT);

-- table: theme_parts
CREATE TABLE theme_parts (
        name TEXT PRIMARY KEY,
        part_type TEXT NOT NULL CHECK(part_type IN ('template', 'part', 'pattern')),
        file_path TEXT NOT NULL,
        description TEXT,
        variants TEXT
    );

-- table: variant_composition_attr_slots
CREATE TABLE variant_composition_attr_slots (
                block_slug TEXT NOT NULL,
                variant_value TEXT NOT NULL,
                child_slug TEXT NOT NULL,
                child_attr_name TEXT NOT NULL,
                child_attr_value TEXT NOT NULL,
                PRIMARY KEY (block_slug, variant_value, child_slug, child_attr_name, child_attr_value)
            );

-- table: variant_composition_slots
CREATE TABLE variant_composition_slots (
            block_slug TEXT NOT NULL,
            variant_value TEXT NOT NULL,
            unique_child_slug TEXT NOT NULL,
            PRIMARY KEY (block_slug, variant_value, unique_child_slug)
        );

-- table: variant_slots
CREATE TABLE variant_slots (
              block_slug    TEXT NOT NULL,
              variant_value TEXT NOT NULL,
              unique_slot   TEXT NOT NULL,
              created_at    TEXT DEFAULT CURRENT_TIMESTAMP, slot_value TEXT,
              PRIMARY KEY (block_slug, variant_value, unique_slot)
            );

-- index: idx_block_attributes_slug_name_source
CREATE UNIQUE INDEX idx_block_attributes_slug_name_source
        ON block_attributes(block_slug, attr_name, source);

-- index: idx_block_attrs_slug
CREATE INDEX idx_block_attrs_slug ON block_attributes(block_slug);

-- index: idx_block_caps_slug
CREATE INDEX idx_block_caps_slug ON block_capabilities(block_slug);

-- index: idx_block_supports_slug
CREATE INDEX idx_block_supports_slug ON block_supports(block_slug);

-- index: idx_block_supports_slug_name_source
CREATE UNIQUE INDEX idx_block_supports_slug_name_source
        ON block_supports(block_slug, support_name, source);

-- index: idx_blocks_slug_source
CREATE UNIQUE INDEX idx_blocks_slug_source
        ON blocks(slug, source);

-- index: idx_blocks_source_slug
CREATE INDEX idx_blocks_source_slug ON blocks(source, slug);

-- index: idx_docs_doctype_source
CREATE INDEX idx_docs_doctype_source ON docs(doc_type, source);

-- index: idx_hooks_name
CREATE INDEX idx_hooks_name ON hooks(name);

-- index: idx_hooks_name_source
CREATE UNIQUE INDEX idx_hooks_name_source
            ON hooks(name, source);

-- index: idx_hooks_source
CREATE INDEX idx_hooks_source ON hooks(source);

-- index: idx_hooks_type
CREATE INDEX idx_hooks_type ON hooks(hook_type);

-- index: idx_pattern_coverage_industry
CREATE INDEX idx_pattern_coverage_industry ON pattern_coverage(industry);

-- index: idx_patterns_category
CREATE INDEX idx_patterns_category      ON patterns(category);

-- index: idx_patterns_content_shape
CREATE INDEX idx_patterns_content_shape ON patterns(content_shape);

-- index: idx_patterns_fingerprint
CREATE UNIQUE INDEX idx_patterns_fingerprint
    ON patterns(fingerprint)
    WHERE fingerprint IS NOT NULL;

-- index: idx_patterns_industry
CREATE INDEX idx_patterns_industry      ON patterns(industry);

-- index: idx_patterns_mood
CREATE INDEX idx_patterns_mood          ON patterns(mood);

-- index: idx_patterns_style
CREATE INDEX idx_patterns_style         ON patterns(style);
