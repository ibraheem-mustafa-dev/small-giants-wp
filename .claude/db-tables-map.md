---
doc_type: db-tables-map
project: small-giants-wp
generated: 2026-05-13
generated_by: research-check audit subagent (Sonnet)
last_verified: 2026-05-14
update_triggers:
  - Any table add/remove (CREATE / DROP TABLE)
  - Any column add/remove/rename on an existing table
  - Any script that newly reads or writes a table (R/W matrix updates)
  - Any DB schema change in either sgs-framework.db or ui-ux-pro-max.db
companion_docs:
  - .claude/tooling-map.md - per-script inventory (scripts that R/W tables)
  - .claude/cloning-pipeline-flow.md - per-stage R/W mapping
registry_entry: docs-registry.md row 14
purpose: Schema reference for sgs-framework.db + ui-ux-pro-max.db (uimax) with every table mapped to pipeline stages and scripts that touch it.
---

# Database Tables - SGS Pipeline Reference

## Quick stats

| DB | Tables | Total rows | Path |
|---|---|---|---|
| sgs-framework.db | 29 | ~4,050 | `~/.claude/skills/sgs-wp-engine/sgs-framework.db` |
| ui-ux-pro-max.db | 48 | ~10,353 (self-reported `_meta`) | `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` |

Query sgs-framework.db: `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."`
Query uimax directly: `python -c "import sqlite3; conn = sqlite3.connect(r'...\ui-ux-pro-max.db'); ..."`

---

## Stage-to-tables matrix

The matrix below is built from grep evidence of every script that reads (R) or writes (W) each table.

| Stage | Name | sgs-framework.db tables | uimax tables |
|---|---|---|---|
| 0 | Pre-flight (mutex + build health) | - | - |
| 0.1 | BEM lint | - (reads HTML/CSS files only) | naming_conventions (reference, embedded rules only - no live DB query) |
| 0.5 | Token lint | - (reads theme.json directly) | - |
| 1 | Boundary detection + hook | slot_synonyms (R) | naming_conventions (reference) |
| 2 | Block match / confidence matrix | blocks (R via filesystem discovery) | - |
| 3 | Slot list | block_attributes (R: canonical_slot, role, derived_selector) | - |
| 4 | Extract | block_attributes (R: canonical_slot, output_signature) | - |
| 4.5 | Token snap / variation router | design_tokens (R via theme.json, not DB), style_variations (R) | - |
| 5 | Supports-first write | block_supports (R) | - |
| 6 | Default-inherit check | block_attributes (R), design_tokens (R via theme.json) | - |
| 7 | Compose / staged merge | - (reads artefacts, not DB) | - |
| 8 | Visual QA | - | - |
| 9 | Coverage / gap reporting | attribute_gap_candidates (W: detect.py, assign-canonical.py) | recognition_log (W: orchestrator stage 9), functionality_gap_candidates (W: functionality-gap-detector.py) |
| +REGISTER | Post-clone pattern registration | patterns (W), block_compositions (W) | patterns (W), component_libraries (R+W) |
| /sgs-update Stage 1 | Codebase re-scan | blocks (W), block_attributes (W), block_supports (W), block_selectors (W), block_capabilities (W), design_tokens (W), style_variations (W), patterns (W), theme_parts (W), hooks (W), components (W), plugins (W), deploy_steps (W), gotchas (W), pattern_coverage (W), block_changes (W) | - |
| /sgs-update Stage 2-4 | Behavioural analysis | block_attributes (W: canonical_slot, role, derived_selector), slot_synonyms (W), attribute_gap_candidates (W) | - |
| /sgs-update Stage 3 | uimax sync | blocks (R) | component_libraries (W) |
| /sgs-update Stage 4 | Animation gap report — **RETIRED Step 6b 2026-05-14** | - | ~~animations~~ (table dropped; Stage 4 returns `{"status":"retired"}` gracefully) |

Notes:
- "R via theme.json" means the script loads `theme/sgs-theme/theme.json` directly, NOT the `design_tokens` DB table. The DB table is populated by `/sgs-update` but not read at clone runtime.
- `sections_detected`, `extraction_cache`, `block_opportunities`, `weaknesses`, `animations` — **all RETIRED Step 6b 2026-05-14**: 0 rows confirmed, tables dropped from sgs-framework.db.

---

## sgs-framework.db - per-table detail

### _meta_schema_version

- Row count: 1
- Purpose: Tracks the schema migration version applied to the DB. Single-row sentinel used by migration scripts to know which Spec 15 phase migrations have run.
- Schema:
  - `version` TEXT PK
  - `applied_at` TEXT
- Current value: `spec-15-p1` (applied 2026-05-12 14:00:24)
- Read by: `~/.claude/skills/sgs-wp-engine/scripts/migrate-spec-15-p1.py` (checks version before applying)
- Written by: `migrate-spec-15-p1.py` (INSERT on first migration)
- Key columns: `version` - migration guard
- Pipeline stage: Not read at runtime. Metadata only.
- Notes: Manually bumped by migration scripts. Zero pipeline dependency.

---

### animation_tokens

- Row count: 7
- Purpose: Named CSS keyframe animation definitions reusable across blocks. Stores keyframe CSS, duration, easing, and category (entrance / exit / emphasis / loading).
- Schema:
  - `id` INTEGER PK
  - `name` TEXT NOT NULL
  - `keyframes` TEXT NOT NULL (CSS @keyframes string)
  - `duration` TEXT DEFAULT '300ms'
  - `easing` TEXT DEFAULT 'ease'
  - `description` TEXT
  - `used_by` TEXT
  - `category` TEXT DEFAULT 'entrance'
  - `created_at` TEXT DEFAULT datetime('now')
- Read by: `~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` (via `stats` command)
- Written by: `~/.claude/skills/sgs-wp-engine/scripts/populate-db.py` - no explicit populate function found; rows appear to have been manually seeded
- Key columns: `name`, `keyframes`, `category`
- Pipeline stage: Not read by /sgs-clone pipeline. Reference data for block development.
- Notes: Distinct from uimax.animations (which tracks scraped live-site animations). This table is the SGS canonical animation token catalogue.

---

### animations

- Row count: 0
- Purpose: Scraped live-site animation observations from /uimax-scrape-animation. Would hold per-URL animation captures with gap-candidate flags so /sgs-update Stage 4 can report which captured animations have no SGS equivalent block attribute.
- Schema:
  - `id` INTEGER PK
  - `source_url` TEXT NOT NULL
  - `element_selector` TEXT
  - `animation_type` TEXT
  - `trigger` TEXT
  - `css_properties` TEXT
  - `duration_ms` INTEGER
  - `easing` TEXT
  - `extracted_at` TEXT DEFAULT datetime('now')
  - `extraction_session` TEXT
  - `is_gap_candidate` INTEGER DEFAULT 0
  - `gap_reason` TEXT
  - `sgs_block` TEXT
  - `sgs_animation_attribute` TEXT
  - `equivalent_implementations` TEXT
- Read by: `sgs-update-uimax-sync.py` Stage 4 (line 251: `SELECT id, animation_type, gap_reason, source_url FROM animations WHERE is_gap_candidate=1`)
- Written by: Not populated by any current script. Empty as of audit.
- Pipeline stage: /sgs-update Stage 4 scans for gap candidates but finds nothing (0 rows).
- Notes: Table exists for future /uimax-scrape-animation output. Currently unused.

---

### attribute_gap_candidates

- Row count: 107
- Purpose: Attributes that could not be assigned a canonical_slot during behavioural analysis. Each row represents one (block_slug, attr_name) pair that needs operator review to either extend the slot vocabulary or mark as instance-data.
- Schema:
  - `id` INTEGER PK
  - `block_slug` TEXT NOT NULL
  - `attr_name` TEXT NOT NULL
  - `stem` TEXT (cleaned attr name after suffix stripping)
  - `proposed_action` TEXT (e.g. 'instance-data-not-canonicalisable', 'new-canonical-slot-needed')
  - `created_at` TEXT DEFAULT CURRENT_TIMESTAMP
- Read by:
  - `gap-detection/detect.py` line 111: LEFT JOIN to check for existing gap entries
  - `gap-detection/coverage-ab-mining.py` line 16: `SELECT stem, COUNT(*) c FROM attribute_gap_candidates`
  - `gap-detection/apply-fanout-proposals.py` line 214: count check after clearing
  - `gap-detection/apply-phase-3.5-vocab.py` line 105: before/after count
- Written by:
  - `behavioural-analyser/assign-canonical.py` line 302: `INSERT OR IGNORE INTO attribute_gap_candidates` (Stage 2/4 of /sgs-update)
  - `gap-detection/detect.py` lines 127, 161: INSERT for unresolvable attrs
  - `gap-detection/apply-fanout-proposals.py` line 204: DELETE resolved rows
  - `gap-detection/apply-phase-3.5-vocab.py` line 124: DELETE after vocabulary extension
  - `gap-detection/canonicalise-pass-2.py` line 168: DELETE after pass-2 resolution
  - `gap-detection/canonicalise-slot-only.py` line 84: DELETE after resolution
- Key columns: `proposed_action` (gate for review - 'new-canonical-slot-needed' rows need operator action)
- Pipeline stage: Written in /sgs-update Stage 2+4. Read in Stage 9 gap reporting (via detect.py).
- Relationships: Foreign-keyed to `blocks.slug` via `block_slug`

---

### block_attributes

- Row count: 1,349 (1,343 with canonical_slot populated - 6 unresolved)
- Purpose: Every attribute of every SGS block. Central lookup table for the clone pipeline - the slot list (Stage 3) and extraction dispatcher (Stage 4) read canonical_slot and derived_selector from here.
- Schema:
  - `id` INTEGER PK
  - `block_slug` TEXT NOT NULL
  - `attr_name` TEXT NOT NULL
  - `attr_type` TEXT NOT NULL
  - `default_value` TEXT
  - `enum_values` TEXT (JSON array string)
  - `description` TEXT
  - `is_responsive` INTEGER DEFAULT 0
  - `canonical_slot` TEXT (FK to slot_synonyms.canonical_slot)
  - `role` TEXT (e.g. 'colour-text', 'boolean-visibility', 'colour-bg')
  - `derived_selector` TEXT (CSS selector for this attribute's rendered element)
  - `output_signature` TEXT
  - `equivalent_implementations` TEXT (JSON Rosetta Stone map)
  - `signature_confidence` REAL
- Read by:
  - `behavioural-analyser/extract-signatures.py` line 410: `SELECT slug FROM blocks` then cross-references block_attributes
  - `generate-block-reference.py` line 62+: JOIN with blocks for docs generation
  - `sgs-db.py` lines 80+: `block` command reads all attributes for a slug
  - `drift-validator/validate.py` line 78: reads canonical_slot set for validation
  - `/sgs-clone` Stage 3 slot list: reads `(block_slug, canonical_slot, role)` for matched block
  - `/sgs-clone` Stage 4 extract: reads `derived_selector` for CSS measurement
  - `supports_writer.py`: reads `role` to decide omit-vs-emit
- Written by:
  - `populate-db.py` line 163: `INSERT OR REPLACE INTO block_attributes` (/sgs-update Stage 1)
  - `behavioural-analyser/assign-canonical.py` lines 319+: writes `canonical_slot`, `role`, `derived_selector` (/sgs-update Stage 4)
  - `behavioural-analyser/backfill-coarse-roles.py`: writes coarse `role` values
  - `behavioural-analyser/extract-signatures.py`: writes `output_signature`, `signature_confidence`
- Key columns for pipeline: `canonical_slot` (slot dispatch), `derived_selector` (CSS measurement target), `role` (snap function routing), `output_signature` (supports_writer omit decision)
- Relationships: `block_slug` references `blocks.slug`; `canonical_slot` references `slot_synonyms.canonical_slot`

---

### block_capabilities

- Row count: 88
- Purpose: Named feature capabilities per block (e.g. `animated-numbers` on `sgs/counter`). Used by the `sgs-db.py capabilities` command to surface blocks by feature.
- Schema:
  - `id` INTEGER PK
  - `block_slug` TEXT NOT NULL
  - `capability` TEXT NOT NULL
- Read by:
  - `sgs-db.py` line 101: `SELECT capability FROM block_capabilities WHERE block_slug = ?`
  - `sgs-db.py` line 172: JOIN with blocks for capabilities listing
- Written by: `populate-db.py` line 208: `INSERT OR IGNORE INTO block_capabilities` (/sgs-update Stage 1)
- Key columns: `capability`
- Pipeline stage: /sgs-update Stage 1 (populate). Not read by /sgs-clone pipeline.
- Relationships: `block_slug` references `blocks.slug`

---

### block_changes

- Row count: 1,117
- Purpose: Audit log of all block additions, attribute additions/removals, and other changes detected during /sgs-update runs.
- Schema:
  - `id` INTEGER PK
  - `block_slug` TEXT NOT NULL
  - `change_type` TEXT NOT NULL (e.g. 'created', 'attribute_added', 'attribute_removed', 'modified')
  - `description` TEXT NOT NULL
  - `changed_date` TEXT DEFAULT CURRENT_TIMESTAMP
- Read by: Not read by any pipeline script. Human-facing audit trail only.
- Written by: `update-db.py` line 30: `INSERT INTO block_changes` (every /sgs-update run)
- Pipeline stage: Written by /sgs-update Stage 1 as a side-effect of every change detected.
- Notes: Grows unbounded. No cleanup mechanism currently. 1,117 rows from all update runs to date.

---

### block_compositions

- Row count: 37
- Purpose: Records how blocks are composed together in patterns - which block slugs appear together, frequency of occurrence, and the auto-generated pattern slug. The +REGISTER tail writes here when a new pattern is discovered during a clone run.
- Schema:
  - `id` INTEGER PK
  - `composition_name` TEXT NOT NULL
  - `block_slugs` TEXT NOT NULL (JSON array of block slugs in order)
  - `frequency` INTEGER DEFAULT 1
  - `industry` TEXT
  - `page_type` TEXT
  - `description` TEXT
  - `auto_pattern_slug` TEXT (FK to patterns.slug)
- Read by:
  - `recogniser/confidence-matrix.py`: reads compositions to boost confidence for known combos
  - `sgs-db.py`: `match` command cross-references compositions for context
- Written by:
  - `pattern-register.py` lines 422+: `INSERT INTO block_compositions` (+REGISTER tail, standalone)
  - `orchestrator/register_patterns.py` (called by orchestrator +REGISTER tail): writes new compositions from clone runs
  - `uimax-tools/seed-block-compositions.py` lines 108+: idempotent seed from theme pattern files
- Key columns: `block_slugs` (JSON array used for composition matching), `auto_pattern_slug` (links to patterns table)
- Pipeline stage: Written by +REGISTER tail. Read by Stage 2 (confidence matrix).
- Relationships: `auto_pattern_slug` references `patterns.slug`

---

### block_opportunities

- Row count: 0
- Purpose: Intended to record per-section block match opportunities from a scrape session, linking each detected section to its best candidate block with a confidence score. Part of an older extraction architecture.
- Schema:
  - `id` INTEGER PK
  - `section_id` INTEGER REFERENCES sections_detected(id)
  - `source_url` TEXT NOT NULL
  - `block_slug` TEXT NOT NULL
  - `confidence` REAL NOT NULL DEFAULT 0.0
  - `match_method` TEXT NOT NULL DEFAULT 'dom-heuristic'
  - `attributes_json` TEXT
  - `created_at` TEXT DEFAULT datetime('now')
- Read by: No script reads this table.
- Written by: No script writes this table (0 rows).
- Pipeline stage: Not used.
- Notes: Appears to be a planned table from an earlier extraction architecture that was superseded by the current staged artefact approach (confidence-matrix.py writes JSON artefacts, not DB rows). Effectively dead.
- Relationships: `section_id` references `sections_detected.id`

---

### block_selectors

- Row count: 69
- Purpose: CSS selectors for named elements within each block (e.g. `sgs/accordion` root selector `.wp-block-sgs-accordion`). Used by the Block Selectors API in block.json and by generate-block-reference.py for documentation.
- Schema:
  - `id` INTEGER PK
  - `block_slug` TEXT NOT NULL
  - `element` TEXT NOT NULL (e.g. 'root', 'typography')
  - `selector` TEXT NOT NULL (CSS selector)
- Read by:
  - `generate-block-reference.py` line 80: `SELECT support_name, support_value FROM block_supports` (also reads block_selectors for the full block record)
  - `sgs-db.py` `block` command: includes selectors in block detail output
- Written by: `populate-db.py` lines 191-197: `INSERT INTO block_selectors` with conflict check (/sgs-update Stage 1)
- Key columns: `element`, `selector`
- Pipeline stage: /sgs-update Stage 1 (populate). Not read by /sgs-clone pipeline directly.
- Relationships: `block_slug` references `blocks.slug`

---

### block_supports

- Row count: 347
- Purpose: WordPress block `supports` declarations per block - e.g. `align: ["wide","full"]`, `anchor: true`, `html: false`. Used by `supports_writer.py` in the clone pipeline to decide whether a resolved value matches the native WP default (in which case no explicit override is written).
- Schema:
  - `id` INTEGER PK
  - `block_slug` TEXT NOT NULL
  - `support_name` TEXT NOT NULL
  - `support_value` TEXT NOT NULL (JSON-encoded value)
- Read by:
  - `supports_writer.py`: loads all supports for a block to compare against resolved attribute values
  - `generate-block-reference.py` line 80: `SELECT support_name, support_value FROM block_supports`
  - `sgs-db.py` `block` command: includes supports in block detail output
- Written by: `populate-db.py` line 179: `INSERT OR REPLACE INTO block_supports` (/sgs-update Stage 1)
- Key columns: `support_name`, `support_value`
- Pipeline stage: /sgs-update Stage 1 (W). /sgs-clone Stage 5 supports-first write (R).
- Relationships: `block_slug` references `blocks.slug`

---

### blocks

- Row count: 67
- Purpose: Master block registry. One row per SGS block with metadata: category, type (dynamic/static), status (planned/built/deprecated), grade, whether it has a view script or render.php, and parent block relationship.
- Schema:
  - `slug` TEXT PK (e.g. 'sgs/accordion')
  - `title` TEXT NOT NULL
  - `category` TEXT NOT NULL
  - `type` TEXT NOT NULL (dynamic/static)
  - `status` TEXT DEFAULT 'built'
  - `grade` TEXT
  - `grade_score` INTEGER
  - `description` TEXT
  - `has_view_script` INTEGER DEFAULT 0
  - `has_render_php` INTEGER DEFAULT 0
  - `parent_block` TEXT
  - `created_at` TEXT DEFAULT CURRENT_TIMESTAMP
  - `updated_at` TEXT DEFAULT CURRENT_TIMESTAMP
- Read by:
  - `sgs-db.py` `block`, `stats`, `match`, `list` commands
  - `generate-block-reference.py` line 62: `FROM blocks ORDER BY category, slug`
  - `behavioural-analyser/extract-signatures.py` line 410: `SELECT slug FROM blocks WHERE slug LIKE 'sgs/%'`
  - `sgs-update-uimax-sync.py` line 143: `SELECT slug, title, description FROM blocks` (/sgs-update Stage 3)
  - `update-db.py` line 42: `SELECT slug FROM blocks` (change detection)
- Written by:
  - `populate-db.py` line 137: `INSERT OR REPLACE INTO blocks` (/sgs-update Stage 1)
  - Status for new blocks initially set by `populate-db.py`; manually updated via DB for `planned` blocks
- Key columns: `slug` (all pipeline lookups), `status` (confidence-matrix.py excludes scaffold blocks), `has_render_php` (deployment check)
- Pipeline stage: /sgs-update Stage 1 (W). /sgs-clone Stage 2 match (R). /sgs-update Stage 3 uimax sync (R).
- Notes: `confidence-matrix.py` uses the filesystem `src/blocks/` directory for block discovery, not this table directly - but the table stays in sync via /sgs-update.

---

### components

- Row count: 9
- Purpose: Shared React/JS editor components catalogue (e.g. `DesignTokenPicker`, `AnimationControl`, `useLastUsedAttributes`). Human reference for block development.
- Schema:
  - `name` TEXT PK
  - `component_type` TEXT NOT NULL (editor/frontend)
  - `file_path` TEXT NOT NULL
  - `description` TEXT
  - `props` TEXT (JSON)
- Read by: `sgs-db.py` (via general SQL access). No pipeline script reads this.
- Written by: `populate-db.py` lines 486-519: `INSERT OR REPLACE INTO components` (/sgs-update Stage 1)
- Pipeline stage: /sgs-update Stage 1 (W). Not read by /sgs-clone pipeline.

---

### deploy_steps

- Row count: 9
- Purpose: Ordered deployment commands per component (theme, blocks plugin). Supports the `/deploy-check` skill by providing canonical deploy sequences.
- Schema:
  - `id` INTEGER PK
  - `component` TEXT NOT NULL
  - `step_order` INTEGER NOT NULL
  - `command` TEXT NOT NULL
  - `description` TEXT NOT NULL
  - `is_verification` INTEGER DEFAULT 0
- Read by: `sgs-db.py` `deploy` command
- Written by: `populate-db.py` line 604: `INSERT INTO deploy_steps` (/sgs-update Stage 1)
- Pipeline stage: /sgs-update Stage 1 (W). Not read by /sgs-clone pipeline.

---

### design_tokens

- Row count: 28
- Purpose: SGS framework default design tokens - 14 colour palette entries, spacing scale, shadow scale, font tokens. This is the framework default (teal/orange SGS palette). Client overrides live in style_variations.tokens_json.
- Schema:
  - `slug` TEXT PK (e.g. 'primary', 'accent')
  - `token_type` TEXT NOT NULL (colour/spacing/shadow/font)
  - `default_value` TEXT NOT NULL (e.g. '#1F7A7A')
  - `css_var` TEXT NOT NULL (e.g. 'var(--wp--preset--color--primary)')
  - `description` TEXT
- Read by:
  - `sgs-db.py` `tokens` and `stats` commands
  - `orchestrator/critical-fix-verification.py` line 147: checks this table exists
- Written by: `populate-db.py` lines 234-263: `INSERT OR REPLACE INTO design_tokens` (/sgs-update Stage 1)
- Key columns: `slug`, `css_var`, `default_value`
- Pipeline stage: /sgs-update Stage 1 (W). NOT read by /sgs-clone at runtime - the pipeline reads `theme.json` directly via `token-lint.py` and `token_resolver.py` for performance.
- Notes: Out-of-sync risk exists if theme.json tokens diverge from this table. /sgs-update keeps them in sync but between runs they may drift.

---

### extraction_cache

- Row count: 0
- Purpose: URL-keyed cache of extraction manifests. Intended to avoid re-scraping the same URL within a session window by storing the full extraction result with an expiry timestamp.
- Schema:
  - `url` TEXT PK
  - `extraction_manifest` TEXT NOT NULL (full JSON manifest)
  - `extracted_at` TEXT DEFAULT datetime('now')
  - `expires_at` TEXT NOT NULL
  - `session_id` TEXT
- Read by: No script reads this table.
- Written by: No script writes this table (0 rows).
- Pipeline stage: Not used.
- Notes: Designed for a caching layer that was not implemented in the current pipeline. Cache-busting is currently handled at the artefact file level (run directories).

---

### gotchas

- Row count: 12
- Purpose: Known developer gotchas and workarounds for the SGS framework (e.g. LiteSpeed CSS optimiser bug, SCP nested directory issue). Human reference, surfaced by `sgs-db.py gotchas` command.
- Schema:
  - `id` INTEGER PK
  - `title` TEXT NOT NULL
  - `description` TEXT NOT NULL
  - `severity` TEXT NOT NULL
  - `component` TEXT
  - `workaround` TEXT
  - `discovered_date` TEXT
- Read by: `sgs-db.py` (via general SQL)
- Written by: `populate-db.py` line 647: `INSERT INTO gotchas` (/sgs-update Stage 1, static seed)
- Pipeline stage: Not read by /sgs-clone pipeline.

---

### hooks

- Row count: 6
- Purpose: Registry of SGS-prefixed WordPress action/filter hooks declared in plugin PHP files. Human reference for plugin development.
- Schema:
  - `id` INTEGER PK
  - `name` TEXT NOT NULL
  - `hook_type` TEXT NOT NULL (action/filter)
  - `plugin_slug` TEXT
  - `description` TEXT
  - `parameters` TEXT (JSON)
  - `file_path` TEXT
- Read by: `sgs-db.py` (via general SQL)
- Written by:
  - `populate-db.py` line 466: `INSERT OR IGNORE INTO hooks` (/sgs-update Stage 1 - scans all PHP files for `do_action`/`apply_filters` with `sgs_` prefix)
  - `update-db.py` via `check_hooks()`: detects new hooks between runs
- Pipeline stage: /sgs-update Stage 1 (W). Not read by /sgs-clone pipeline.

---

### modifier_suffixes

- Row count: 19
- Purpose: Vocabulary of BEM-style modifier suffixes used in SGS block attribute naming (e.g. `Mobile`, `Tablet`, `Desktop` for breakpoints; `Top`, `Right`, `Bottom`, `Left` for sides). Consumed by `assign-canonical.py` during behavioural analysis to strip suffixes before resolving canonical_slot.
- Schema:
  - `suffix` TEXT PK
  - `kind` TEXT NOT NULL (breakpoint/side/variant/state)
  - `notes` TEXT
- Read by:
  - `behavioural-analyser/assign-canonical.py` line 51+: `load_slot_synonyms` also loads modifier_suffixes for suffix-stripping during canonical assignment
  - `drift-validator/validate.py`: reads modifier_suffixes to validate suffix usage
- Written by: `~/.claude/skills/sgs-wp-engine/scripts/seed-spec-15-p1-vocab.py` (Spec 15 Phase 1 migration seed)
- Key columns: `suffix`, `kind`
- Pipeline stage: /sgs-update Stage 4 behavioural analysis (R).

---

### pattern_coverage

- Row count: 96
- Purpose: Tracks which industry/section-type combinations have patterns built or are missing. Used by `sgs-db.py coverage` command to show what's still needed.
- Schema:
  - `id` INTEGER PK
  - `industry` TEXT NOT NULL (e.g. 'restaurant', 'healthcare')
  - `section_type` TEXT NOT NULL (e.g. 'hero', 'testimonials')
  - `pattern_slug` TEXT (FK to patterns.slug when built)
  - `status` TEXT DEFAULT 'missing' (missing/complete)
- Read by:
  - `sgs-db.py` lines 148, 484-486: `SELECT section_type, status, pattern_slug FROM pattern_coverage`
- Written by:
  - `populate-db.py` lines 672, 705: `INSERT OR IGNORE` then `UPDATE pattern_coverage` (/sgs-update Stage 1 - seeded from static coverage matrix)
- Key columns: `status`, `industry`, `section_type`
- Pipeline stage: /sgs-update Stage 1 (W). Not read by /sgs-clone pipeline.

---

### patterns

- Row count: 41
- Purpose: Registry of all SGS block patterns - one row per `.php` file in `theme/sgs-theme/patterns/`. Each row records which blocks the pattern uses, the file path, industry target, and metadata for the `/sgs-db.py match` command.
- Schema:
  - `slug` TEXT PK
  - `title` TEXT NOT NULL
  - `category` TEXT NOT NULL
  - `description` TEXT
  - `blocks_used` TEXT NOT NULL (comma-separated or JSON list of block slugs)
  - `file_path` TEXT NOT NULL
  - `industry` TEXT
  - `is_auto_generated` INTEGER DEFAULT 0
  - `created_at` TEXT DEFAULT CURRENT_TIMESTAMP
  - `content_shape` TEXT
  - `mood` TEXT
  - `style` TEXT
  - `fingerprint` TEXT
  - `source` TEXT
  - `block_composition` TEXT
  - `parent_pattern_id` INTEGER
  - `perceptual_hash` TEXT
- Read by:
  - `sgs-db.py` `match` and `context` commands
  - `recogniser/confidence-matrix.py`: reads pattern slugs to boost confidence when a section matches a known pattern
  - `update-db.py` `check_patterns()` line 113: `SELECT slug FROM patterns`
- Written by:
  - `populate-db.py` line 408: `INSERT OR REPLACE INTO patterns` (/sgs-update Stage 1 - walks `theme/sgs-theme/patterns/`)
  - `orchestrator/register_patterns.py` lines 154-160: `INSERT INTO patterns` (+REGISTER tail, clone run)
  - `pattern-register.py` (standalone pattern registration)
  - `update-db.py` `check_patterns()`: detects new patterns (logs count; does not INSERT - defers to populate-db.py full run)
- Key columns: `slug`, `blocks_used`, `is_auto_generated`
- Pipeline stage: /sgs-update Stage 1 (W). /sgs-clone Stage 1 boundary (R). +REGISTER tail (W).
- Relationships: `parent_pattern_id` self-references `patterns.id`

---

### pipeline_corrections

- Row count: 4
- Purpose: Captures lessons learned from failed or corrected clone pipeline runs - e.g. "Cloudflare blocks headless Chrome", "ImageMagick timeout on 50MB file". Human reference for improving the pipeline.
- Schema:
  - `id` INTEGER PK
  - `pipeline` TEXT NOT NULL
  - `stage` TEXT
  - `source_url` TEXT
  - `technique` TEXT
  - `outcome` TEXT
  - `correction` TEXT NOT NULL
  - `created_at` TEXT DEFAULT datetime('now')
- Read by: No pipeline script reads this. Human reference only.
- Written by: Manually or by test seed (`populate-db.py` seeds 4 sample rows)
- Pipeline stage: Not used by /sgs-clone.

---

### plugins

- Row count: 3
- Purpose: Registry of SGS framework plugins (sgs-blocks, sgs-booking, sgs-client-notes) with namespace, text domain, and database tables each plugin owns.
- Schema:
  - `slug` TEXT PK
  - `title` TEXT NOT NULL
  - `namespace` TEXT NOT NULL
  - `text_domain` TEXT NOT NULL
  - `db_tables` TEXT (JSON list of WP DB tables this plugin creates)
  - `status` TEXT DEFAULT 'active'
  - `description` TEXT
- Read by: `sgs-db.py` (general SQL)
- Written by: `populate-db.py` line 547: `INSERT OR REPLACE INTO plugins` (/sgs-update Stage 1)
- Pipeline stage: /sgs-update Stage 1 (W). Not read by /sgs-clone pipeline.

---

### property_suffixes

- Row count: 99
- Purpose: Vocabulary of CSS property name suffixes used in SGS block attributes (e.g. `Colour` -> `color`, `Background` -> `background-color`, `TextColour` -> `color`). `assign-canonical.py` strips these suffixes to get the attribute stem before slot lookup. Also flags whether the property should be matched to a token (`is_token_matched`) and which source provides the token.
- Schema:
  - `suffix` TEXT PK
  - `role` TEXT NOT NULL (color/spacing/typography/shadow)
  - `css_property` TEXT
  - `is_token_matched` INTEGER DEFAULT 1
  - `token_source` TEXT (palette/spacing/shadow/font)
  - `notes` TEXT
- Read by:
  - `behavioural-analyser/assign-canonical.py`: loads full table at startup for suffix classification during role assignment
  - `drift-validator/validate.py`: reads property_suffixes to validate role assignments
- Written by: `~/.claude/skills/sgs-wp-engine/scripts/seed-spec-15-p1-vocab.py` (Spec 15 Phase 1 migration seed)
- Key columns: `suffix`, `role`, `is_token_matched`
- Pipeline stage: /sgs-update Stage 4 behavioural analysis (R). Not written at runtime.

---

### sections_detected

- Row count: 0
- Purpose: Intended to record per-section detections from a scrape session (section type, HTML snippet, viewport width, extraction session ID). Part of an earlier extraction architecture that used DB rows as the primary artefact format.
- Schema:
  - `id` INTEGER PK AUTOINCREMENT
  - `source_url` TEXT NOT NULL
  - `section_type` TEXT NOT NULL
  - `position_order` INTEGER DEFAULT 0
  - `html_snippet` TEXT
  - `viewport_width` INTEGER
  - `detected_at` TEXT DEFAULT datetime('now')
  - `extraction_session` TEXT
- Read by: No script reads this table.
- Written by: No script writes this table (0 rows).
- Pipeline stage: Not used.
- Notes: Superseded by the JSON artefact approach - stage results are written to JSON files in the run directory (`plugins/sgs-blocks/scripts/orchestrator/`) rather than DB rows. Effectively dead alongside `block_opportunities`.

---

### slot_synonyms

- Row count: 82 (last verified 2026-05-16)
- Purpose: The canonical slot vocabulary AND runtime standalone-block routing table. Every named content slot lives here with a canonical_slot name (e.g. 'heading', 'card'), a JSON list of aliases, an optional role, a semantic HTML tag, and (added 2026-05-16) an optional standalone_block slug for slot→standalone-block routing.
- Schema:
  - `canonical_slot` TEXT PK
  - `aliases` TEXT NOT NULL (JSON array)
  - `role` TEXT — content-bearing role (text-content / content / select-from-enum / image-object / visual). Populated 2026-05-16 via `migrations/2026-05-16-slot-synonyms-roles.py`.
  - `description` TEXT
  - `wp_canonical` TEXT
  - `html_semantic_tag` TEXT
  - `standalone_block` TEXT — ADDED 2026-05-16 via `migrations/2026-05-16-slot-synonyms-standalone-block.py`. When a BEM element resolves to this slot AND no parent block owns the slot, walker emits this block. Examples: label→sgs/label, badge→sgs/label, card→sgs/info-box.
  - `created_at` TEXT DEFAULT CURRENT_TIMESTAMP
- Read by:
  - `converter_v2/db_lookup.py:standalone_block_for()` — runtime walker routing (added 2026-05-16)
  - `behavioural-analyser/assign-canonical.py` line 61: `SELECT canonical_slot, aliases, role FROM slot_synonyms` — loaded at startup for every /sgs-update Stage 4 run + the second-pass role backfill (added 2026-05-16)
  - `drift-validator/validate.py` line 78: `SELECT canonical_slot FROM slot_synonyms` — validates block_attributes.canonical_slot values
  - `drift-validator/validate.py` line 85: reads aliases for alias-overlap validation
  - `gap-detection/canonicalise-slot-only.py` line 23: reads full slot_synonyms for canonicalisation pass
- Written by:
  - `~/.claude/skills/sgs-wp-engine/scripts/seed-spec-15-p1-vocab.py` (initial seed, Spec 15 Phase 1)
  - `plugins/sgs-blocks/scripts/migrations/2026-05-16-slot-synonyms-standalone-block.py` (idempotent — adds standalone_block column + populates label/badge/card rows)
  - `plugins/sgs-blocks/scripts/migrations/2026-05-16-slot-synonyms-roles.py` (idempotent — populates role for ~25 canonical content slots)
  - `gap-detection/apply-fanout-proposals.py` line 98: `INSERT INTO slot_synonyms` (extends vocabulary from mining results)
  - `gap-detection/apply-phase-3.5-vocab.py` lines 82-92: INSERT or UPDATE aliases
  - `gap-detection/canonicalise-pass-2.py` lines 79-92: INSERT new slots found during pass-2
- Key columns for pipeline: `canonical_slot` (PK), `aliases` (attribute synonyms), `standalone_block` (cv2 routing), `role` (cv2_emitted_dynamic bucket filter)
- Pipeline stage: /sgs-update Stage 4 behavioural analysis (R). cv2 walker runtime (R via db_lookup). Gap-detection passes (W). Migrations 2026-05-16 (W).

---

### style_variations

- Row count: 8
- Purpose: One row per client style variation (indus-foods, helping-doctors, eye-care-ward-end, etc.). Stores the full token palette as JSON, font choices, deploy SSH target and WP path for that client.
- Schema:
  - `slug` TEXT PK
  - `title` TEXT NOT NULL
  - `client` TEXT
  - `industry` TEXT
  - `tokens_json` TEXT NOT NULL (JSON array of {slug, color, name} objects)
  - `font_heading` TEXT
  - `font_body` TEXT
  - `deploy_target` TEXT
  - `deploy_ssh` TEXT
  - `deploy_wp_path` TEXT
  - `is_active` INTEGER DEFAULT 1
- Read by:
  - `sgs-db.py` `context` command: loads client variation for token overlay
  - `update-db.py` `check_style_variations()` line 135: `SELECT slug FROM style_variations`
- Written by:
  - `populate-db.py` line 362: `INSERT OR REPLACE INTO style_variations` (/sgs-update Stage 1 - reads from `theme/sgs-theme/styles/*.json`)
- Key columns for pipeline: `tokens_json` (client colour palette for token snapping overlay), `deploy_target`, `deploy_ssh`, `deploy_wp_path` (used by deploy scripts)
- Pipeline stage: /sgs-update Stage 1 (W). Not read by /sgs-clone pipeline directly - the pipeline reads the JSON file on disk via `variation_router.py`.
- Notes: `variation_router.py` writes to the JSON file on disk (not this DB table) during /sgs-clone Stage 4.5 token discovery. The DB row is a read-only reflection populated by /sgs-update.

---

### theme_parts

- Row count: 22
- Purpose: Registry of WordPress block theme template parts (header.html, footer.html, etc.) with part type and optional variant list.
- Schema:
  - `name` TEXT PK
  - `part_type` TEXT NOT NULL
  - `file_path` TEXT NOT NULL
  - `description` TEXT
  - `variants` TEXT (JSON array)
- Read by: `sgs-db.py` (general SQL)
- Written by: `populate-db.py` line 431: `INSERT OR REPLACE INTO theme_parts` (/sgs-update Stage 1 - scans `theme/sgs-theme/parts/`)
- Pipeline stage: /sgs-update Stage 1 (W). Not read by /sgs-clone pipeline.

---

### weaknesses

- Row count: 0
- Purpose: Intended to track known block weaknesses or quality gaps with severity and breakpoint context (e.g. a mobile layout flaw on sgs/hero). Currently empty.
- Schema:
  - `id` INTEGER PK
  - `block_slug` TEXT
  - `breakpoint` TEXT
  - `issue` TEXT NOT NULL
  - `severity` TEXT NOT NULL
  - `status` TEXT DEFAULT 'open'
  - `discovered_date` TEXT DEFAULT CURRENT_TIMESTAMP
  - `fixed_date` TEXT
- Read by: No script reads this table.
- Written by: No script writes this table (0 rows).
- Pipeline stage: Not used.
- Notes: Structural placeholder. Possibly intended for a future QA gate that feeds open weaknesses back into the pipeline.

---

## ui-ux-pro-max.db (uimax) - per-table detail

Only tables that the /sgs-clone or /sgs-update pipeline actively reads or writes are detailed fully. Reference-only tables receive a short entry.

---

### _meta

- Row count: 2
- Purpose: Global metadata for the uimax DB - `total_rows` count and `compiled_at` timestamp. Written by `update-db.py regenerate-csvs` each time the DB is rebuilt.
- Schema: `key` TEXT, `value` TEXT
- Current values: `total_rows = 10353`, `compiled_at = 2026-05-09 09:55:28`
- Written by: `~/.agents/skills/ui-ux-pro-max/scripts/update-db.py regenerate-csvs` (called by sgs-update-uimax-sync.py Stage 3)

---

### animations (uimax)

- Row count: 63
- Purpose: Cross-platform animation reference - named animation patterns with Rosetta Stone implementations across SGS, Framer Motion, GSAP, WP Interactivity API, and Tailwind. Also tracks `is_gap_candidate` for SGS block gaps.
- Schema: `slug`, `name`, `category`, `duration_ms`, `easing`, `properties`, `best_for`, `accessibility_notes`, `gpu_safe`, `sgs_block`, `sgs_attribute_name`, `css_implementation`, `framer_motion`, `gsap`, `wapi`, `wp_interactivity`, `is_gap_candidate`, `provenance`, `source_url`, `created_at`
- Read by: `sgs-update-uimax-sync.py` Stage 4 (line 251): `SELECT id, animation_type, gap_reason, source_url FROM animations WHERE is_gap_candidate=1` - generates gap report
- Written by: `/uimax-scrape-animation` (external skill, not in repo). Schema migration added 5 columns on first sgs-update-uimax-sync.py Stage 4 run.
- Pipeline stage: /sgs-update Stage 4 (R for gap report generation).
- Notes: Distinct from sgs-framework.db.animation_tokens (which holds keyframe CSS). This table holds cross-platform translation data.

---

### attribute_gap_candidates (uimax)

- Row count: 0
- Purpose: Uimax-side attribute gap candidate tracking (block attribute gaps with seen_count, confidence, and workflow status). Parallel to sgs-framework.db.attribute_gap_candidates but with additional provenance and status tracking.
- Schema: `id`, `block_slug`, `selector`, `css_property`, `value_seen`, `role_proposed`, `confidence`, `seen_count`, `last_seen`, `staged_at`, `applied_at`, `provenance`, `status`
- Read by: Not read by any current pipeline script.
- Written by: No rows written yet (0 rows). Planned output of `recogniser/attribute-gap-writer.py`.
- Notes: Currently empty. `attribute-gap-writer.py` exists but is not called in the main orchestrator flow.

---

### chart_templates

- Row count: 626
- Purpose: Large reference table of chart templates from the uimax design brain. Contains Vega-Lite-style chart specs across chart types. Referenced in blocks.description for `sgs/data-display` planned block.
- Not read or written by the /sgs-clone or /sgs-update pipeline.

---

### component_libraries

- Row count: 211 (67 from SGS Blocks, remainder from Radix UI Primitives, Headless UI, etc.)
- Purpose: Cross-platform component library reference with Rosetta Stone equivalent_implementations. The SGS Blocks subset (67 rows) is the write target for /sgs-update Stage 3 - every SGS block gets one row here so `/ui-ux-pro-max` can compare SGS blocks against Radix, shadcn, Bootstrap, etc.
- Schema:
  - `library` TEXT
  - `component_name` TEXT
  - `component_key` TEXT
  - `kind` TEXT (block/pattern)
  - `summary` TEXT
  - `wai_aria_url` TEXT
  - `framework` TEXT
  - `license` TEXT
  - `source_url` TEXT
  - `provenance` TEXT
  - `mood` TEXT
  - `style` TEXT
  - `industry` TEXT
  - `equivalent_implementations` TEXT (JSON Rosetta Stone)
  - `is_gap_candidate` INTEGER
- Read by:
  - `sgs-update-uimax-sync.py` line 154: `SELECT component_key FROM component_libraries WHERE library = 'SGS Blocks'` (existence check before INSERT)
  - `uimax-write-validator.py` line 52: validates rows before write
- Written by:
  - `sgs-update-uimax-sync.py` line 186: `INSERT INTO component_libraries` (/sgs-update Stage 3 - new SGS blocks only, skip-if-exists)
- Key columns for pipeline: `component_key` (matches `blocks.slug`), `equivalent_implementations` (Rosetta Stone JSON), `library` (gate for SGS Blocks subset)
- Pipeline stage: /sgs-update Stage 3 (R+W).
- Notes: The `uimax-write-validator.py` hard-rejects rows where `equivalent_implementations.sgs_block` is set to a Rosetta Stone value without proper block mapping (blub.db row 213 anti-pattern guard).

---

### design_tokens (uimax)

- Row count: 5,164
- Purpose: Large cross-system design token reference (Material Design, Tailwind, shadcn, etc.). Used by `/ui-ux-pro-max` skill for design recommendations. Not related to sgs-framework.db.design_tokens.
- Not read or written by the /sgs-clone or /sgs-update pipeline.

---

### functionality_gap_candidates

- Row count: 0
- Purpose: Uimax-side tracking of functionality gaps - CSS signals observed during a clone run that suggest an SGS block is missing a feature (e.g. a block lacks sticky behaviour even though the source site uses it). Written by `functionality-gap-detector.py`.
- Schema: `id`, `block_slug`, `feature_type`, `css_signal`, `role_proposed`, `confidence`, `seen_count`, `last_seen`, `staged_at`, `applied_at`, `provenance`, `status`
- Read by:
  - `functionality-gap-detector.py` lines 222+: `SELECT id, seen_count FROM functionality_gap_candidates` (upsert pattern)
- Written by:
  - `functionality-gap-detector.py` lines 230, 235: UPDATE seen_count or INSERT (/sgs-clone Stage 9 via leftover-bucket-router.py Bucket B)
- Pipeline stage: /sgs-clone Stage 9 gap reporting (W).
- Notes: Currently empty (0 rows) - no clone runs have triggered Bucket B functionality gaps yet.

---

### google_fonts

- Row count: 1,923
- Purpose: Full Google Fonts catalogue with variable axis data, classifications, popularity ranks, and designer metadata. Used by `/ui-ux-pro-max` for font recommendations.
- Not read or written by the /sgs-clone or /sgs-update pipeline.

---

### naming_conventions

- Row count: 16
- Purpose: CSS class naming convention definitions used by `lingua_franca.py` for source-convention classification. Each row describes a convention (BEM, Tailwind, Bootstrap 5, etc.) with regex pattern, anatomy, and extraction rules. The `is_canonical_for_sgs_drafts` column marks SGS-BEM as the canonical target.
- Schema: `convention_name`, `pattern_regex`, `example_class`, `class_anatomy`, `extraction_rule`, `platform_typical`, `notes`, `provenance`, `created_at`, `is_canonical_for_sgs_drafts`
- Read by: `lingua_franca.py` (comment line 12) - however, the current implementation embeds the top-5 convention rules as static data (no live DB query in the hot path). The DB rows are the source of record but are NOT queried at runtime.
- Not actively written by pipeline scripts.
- Notes: `/uimax-classify-naming` (external skill) reads and extends this table. In the pipeline, lingua_franca.py uses its embedded static rules for performance.

---

### patterns (uimax)

- Row count: 5
- Purpose: Uimax pattern registry with Rosetta Stone equivalent_implementations. The +REGISTER tail of /sgs-clone writes new SGS patterns here so `/ui-ux-pro-max` can reference them for cross-platform design recommendations.
- Schema: `slug`, `name`, `category`, `industry`, `mood`, `style`, `content_shape`, `fingerprint`, `source`, `block_composition`, `landing_recipe_ids`, `product_type_ids`, `component_library_keys`, `equivalent_implementations`, `perceptual_hash`, `parent_pattern_slug`, `provenance`, `created_at`
- Read by: `register_patterns.py` lines 199-252: SELECT existence check before INSERT
- Written by:
  - `orchestrator/register_patterns.py` lines 244-257: `INSERT INTO patterns` (+REGISTER tail)
- Key columns for pipeline: `slug`, `equivalent_implementations` (Rosetta Stone map with sgs_block key), `source` (set to 'sgs-clone-pipeline')
- Pipeline stage: +REGISTER tail (W).
- Notes: No UNIQUE constraint on `slug` - the register_patterns.py SELECT-then-INSERT pre-check is the only duplicate guard.

---

### recognition_log

- Row count: 2,779
- Purpose: Learning surface for /sgs-clone pipeline. Each row records one unresolved or problematic element from a clone run (bucket type, selector, surrounding DOM, proposed action). Used by the /ui-ux-pro-max skill to surface patterns across runs and by operators to triage systematic extractor gaps.
- Schema:
  - `id` TEXT (UUID)
  - `clone_run_id` TEXT
  - `bucket_type` TEXT (e.g. 'extraction_failed', 'unrecognised')
  - `selector` TEXT
  - `surrounding_dom` TEXT (JSON)
  - `frequency` TEXT
  - `severity` TEXT
  - `proposed_action` TEXT
  - `operator_decision` TEXT
  - `operator_notes` TEXT
  - `new_pattern_id` TEXT
  - `created_at` TEXT
  - `decided_at` TEXT
- Read by:
  - `gap-detection/detect.py` lines 138-144: `FROM recognition_log rl` - drains extraction_failed events to feed sgs-framework.db.attribute_gap_candidates
- Written by:
  - `sgs-clone-orchestrator.py` lines 941-953: `INSERT INTO recognition_log` (Stage 9, soft-fail - INSERT skipped if uimax DB unreachable)
- Key columns for pipeline: `bucket_type` (routing signal for triage), `proposed_action`, `clone_run_id`
- Pipeline stage: /sgs-clone Stage 9 (W). Gap-detection detect.py (R - cross-DB query).

---

### Reference-only uimax tables (not read/written by pipeline)

| Table | Row count | Purpose |
|---|---|---|
| app_interface | 30 | UI pattern reference for app interfaces |
| chart_templates | 626 | Vega-Lite-style chart specs |
| charts | 25 | Chart type catalogue |
| colors | 269 | Cross-industry colour palette reference |
| ft_chart_vocabulary | 39 | Financial Times chart vocabulary |
| gov_patterns | 68 | Government/public sector UI patterns |
| icon_libraries | 225 | Icon library reference (Lucide, Heroicons, etc.) |
| icons | 105 | Individual icon catalogue |
| interaction_patterns | 30 | Interaction design patterns |
| landing | 34 | Landing page pattern recipes |
| mood_board_items | 0 | Mood board item storage (empty) |
| mood_boards | 0 | Mood board registry (empty) |
| products | 161 | Product type reference for design routing |
| react_performance | 44 | React performance patterns reference |
| stack_angular through stack_wordpress | 0 - 60 each | Per-stack component translation tables (many empty) |
| styles | 84 | Visual style category reference |
| typography | 74 | Font pairing reference |
| ui_reasoning | 161 | UI decision rules by category |
| ux_guidelines | 161 | UX best practice rules |

---

## Cross-DB joins and sync flows

| Source | Target | Sync script | Trigger |
|---|---|---|---|
| sgs-framework.db.blocks | uimax.component_libraries | `plugins/sgs-blocks/scripts/uimax-tools/sgs-update-uimax-sync.py` Stage 3 | `/sgs-update` Stage 3 |
| /sgs-clone Stage 9 artefact | uimax.recognition_log | `sgs-clone-orchestrator.py` lines 941-953 | End of every successful Stage 9 |
| /sgs-clone +REGISTER artefact | sgs-framework.db.patterns | `orchestrator/register_patterns.py` lines 154-160 | +REGISTER tail after clone success |
| /sgs-clone +REGISTER artefact | uimax.patterns | `orchestrator/register_patterns.py` lines 244-257 | +REGISTER tail after clone success |
| uimax DB (all tables) | CSV files at `~/.agents/skills/ui-ux-pro-max/data/` | `~/.agents/skills/ui-ux-pro-max/scripts/update-db.py regenerate-csvs` | Called by sgs-update-uimax-sync.py after Stage 3 writes |
| uimax.recognition_log (extraction_failed rows) | sgs-framework.db.attribute_gap_candidates | `gap-detection/detect.py` lines 138-161 | Manual run of detect.py or /sgs-update Stage 4 gap pass |

---

## Tables not used by the pipeline (catalogue or reference only)

| Table | DB | Purpose | Why not in pipeline |
|---|---|---|---|
| animation_tokens | sgs-framework.db | SGS keyframe animation CSS catalogue | Reference for block development; not queried at clone time |
| ~~animations~~ | ~~sgs-framework.db~~ | ~~Scraped animation observations~~ | **RETIRED Step 6b 2026-05-14** — 0 rows; table dropped |
| block_capabilities | sgs-framework.db | Named features per block | Human-facing query tool; not needed at clone time |
| block_changes | sgs-framework.db | /sgs-update change audit log | Append-only audit trail |
| ~~block_opportunities~~ | ~~sgs-framework.db~~ | ~~Planned section-to-block match store~~ | **RETIRED Step 6b 2026-05-14** — 0 rows; table dropped |
| components | sgs-framework.db | Shared editor component catalogue | Development reference only |
| deploy_steps | sgs-framework.db | Ordered deploy commands | Surfaced by /deploy-check, not clone pipeline |
| ~~extraction_cache~~ | ~~sgs-framework.db~~ | ~~URL extraction result cache~~ | **RETIRED Step 6b 2026-05-14** — 0 rows; table dropped |
| gotchas | sgs-framework.db | Known developer gotchas | Human reference |
| hooks | sgs-framework.db | SGS WordPress hook registry | Development reference only |
| pattern_coverage | sgs-framework.db | Industry section coverage map | Planning/status tool, not clone runtime |
| pipeline_corrections | sgs-framework.db | Lessons from failed runs | Human reference |
| plugins | sgs-framework.db | Framework plugin registry | Human reference |
| ~~sections_detected~~ | ~~sgs-framework.db~~ | ~~Planned section detection store~~ | **RETIRED Step 6b 2026-05-14** — 0 rows; table dropped |
| theme_parts | sgs-framework.db | Template part registry | Development reference only |
| ~~weaknesses~~ | ~~sgs-framework.db~~ | ~~Block quality gap tracker~~ | **RETIRED Step 6b 2026-05-14** — 0 rows; table dropped |
| naming_conventions | uimax | CSS convention definitions | Rules embedded as static data in lingua_franca.py |
| design_tokens (uimax) | uimax | Cross-system token reference | Not SGS-specific; used by /ui-ux-pro-max skill only |
| google_fonts | uimax | Full Google Fonts catalogue | Used by /ui-ux-pro-max for font recommendations |
| All stack_* tables | uimax | Per-framework component translation | Used by /ui-ux-pro-max; not pipeline runtime |
