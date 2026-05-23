---
doc_type: architecture-staging
project: small-giants-wp
session_tag: small-giants-wp-2026-05-21-architecture-staging
status: STAGING — single canonical record of architecture decisions from this session
generated: 2026-05-21
absorbs_to: Specs 01, 02, 11, 16, 17, 18, 19 + common-wp-styling-errors.md (revision plan in §6)
authors: Bean + Claude (Opus 4.7)
wp_target_version: 7.0 (released 2026-05-14)
implementation_status: Phase 0 SHIPPED 2026-05-21 (commit aec54882). 7 of 8 phases pending.
session_rounds: 5 pushback rounds before scope lock
---

# Architecture Staging Doc — 2026-05-21

This document is the **single canonical record** of all architectural decisions made during the 2026-05-21 session that began as a Wave 2 wiring-fix follow-up and expanded into a holistic redesign of: SGS framework DB architecture, style-variation system, button preset wiring, INNER_BLOCK_PATTERNS retirement, CLI commands surface, WP 7.0 alignment, and admin UX migration to the Customiser.

**Purpose:** capture every decision with reasoning + WP 7.0 context + the existing-spec revision plan, BEFORE those existing specs get edited piecemeal. Once specs 01/02/11/16/17/18/19/common-wp-styling-errors are revised in light of this document (Phase C work), this staging doc gets archived to `.claude/plans/archive/`.

**Origin:** session committed `ad706d0d` (Wave 2 wiring fix) then pivoted on Bean's brain-dump challenging the architecture as patchwork. Five rounds of pressure-testing produced this consolidated decision set.

---

## 1. Plain-English summary

Five things change in the framework:

1. **DB consolidation.** Today there are three databases (wp-blockmarkup-mcp's blocks.db, wp-devdocs-mcp's hooks.db, sgs-wp-engine's sgs-framework.db) — each holding part of the WordPress + SGS knowledge surface. We merge the relevant tables into sgs-framework.db with a `source` column distinguishing native_wp / sgs / third_party. After this, every WP + SGS skill consults ONE database.

2. **Kill the per-client WP style-variation overlay system.** Today every SGS site ships with all 9 client variation JSONs accessible via WP's Browse-styles UI — a privacy leak (Indus Foods admin sees HelpingDoctors variation). Replaced with: each site has ONE `theme.json` (gitignored on the server because operators can edit it via Site Editor), and our local repo holds per-client snapshots in `sites/<client>/theme-snapshot.json` that we push to specific sites via a new CLI. Per-client visual differences live in the snapshot, not in the framework theme.

3. **Retire the hardcoded `INNER_BLOCK_PATTERNS` dict.** Currently the converter (cv2) reads a hardcoded dict in convert.py to know which composite blocks emit which inner-blocks shape. Replaced with: DB-backed lookup using `blocks.parent_block` (already exists, partially seeded) + `slot_synonyms.standalone_block` (already exists, mostly unseeded). Plus a pre-Phase-3 research subtask on whether WP 7.0's Pattern Overrides + Block Bindings provides a cleaner alternative.

4. **Move button preset values to native WP 7.0 theme.json.** WP 7.0 (released 2026-05-14) adds native pseudo-element support (`:hover`, `:focus`, etc.) in `theme.json.styles.elements.button`. Our `wp_options.sgs_button_presets` bridge becomes redundant. Operator edits move into theme.json natively. Customiser migration applies to header/footer/site-info admin pages (where live-preview matters), NOT button presets.

5. **Comprehensive `/sgs-update` rebuild.** Currently `/sgs-update` has 4 stages. After this work, it has 9 stages including SGS codebase scan, core/gutenberg cache refresh, WP-CLI handbook refresh, style-variation sync, slot synonym auto-seed, block-replacement mapping, spec doc regen, uimax mirror, and drift gate.

---

## 2. Header/footer distinction (Bean's key correction — Pushback Round 5)

There are THREE separate "variation" concepts in WordPress + SGS. They were conflated in earlier proposals and got correctly disentangled by Bean:

| Concept | What it is | Where it lives | Fate |
|---|---|---|---|
| **WP style variations** | Per-client colour/typography overlay on top of base theme.json (e.g. "Mama's Munches branding") | `theme/sgs-theme/styles/<client>.json` + `set_theme_mod('active_theme_style', ...)` + `class-sgs-variation-picker.php` + REST | **DELETED — Decision 18** |
| **Header/footer template parts** | Brand-agnostic alternative starting templates (centred header, split header, minimal header) | `wp_template_part` CPT + `class-sgs-template-part-seeder.php` + the part HTML files | **100% PRESERVED** |
| **Block-level variations** | `register_block_variation()` for variants within ONE block (e.g. sgs/button primary/secondary/outline) | `includes/variations/class-sgs-block-variations.php` | **PRESERVED — indexed in Decision 7/8** |

This distinction is load-bearing for the spec revisions. The variation-system kill (Decision 18) DELETES exactly 3 PHP files + MODIFIES 1 file. It does NOT touch any of the 10+ header/footer infrastructure files.

---

## 3. Decision list (31 decisions total — 25 in this section + 6 added in §11 from Round 6)

Numbering inherits the debate sequence; primed numbers indicate revisions from earlier proposals. Decisions grouped by phase to clarify dependencies.

### Phase 0 — Data seeding (architecturally independent, ~85 min Sonnet)

| # | Decision | File / table | Cost | Why |
|---|---|---|---|---|
| 3 | Seed `slot_synonyms.standalone_block` for ~30 slots that have 1:1 SGS block equivalents (button, buttonSecondary, card, item, panel, slide, accordion-item, tab-item, form-field-*) | `sgs-framework.slot_synonyms` | ~30 min | Unblocks DB-backed standalone-block lookup. Today only 3/89 rows have this populated; rest is the gap |
| 4 | Seed `blocks.parent_block` for `sgs/button` → `sgs/multi-button` (semantic: "preferred wrapper when emitting standalone"; group adjacent same-slot items) | `sgs-framework.blocks` | ~15 min | Direct replacement of one INNER_BLOCK_PATTERNS entry. 18/73 rows already populated for sgs/form-field-* + sgs/tab + sgs/accordion-item. Add ~7 more rows for button family + slider-item + other composites |
| 5 | Add `blocks.replaces` column + seed ~20 mappings (e.g. `sgs/hero.replaces='core/cover'`, `sgs/card-grid.replaces='core/columns+core/group'`) | `sgs-framework.blocks` | ~20 min | Enables core→SGS routing when mockup uses a core block name |
| 6 | Auto-derive `--client` flag from mockup path in `sgs-clone-orchestrator.py` (e.g. `sites/mamas-munches/` → `--client mamas-munches`) | `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | ~20 min | Fixes the wrong-variation-active bug Bean spotted on sandybrown (eye-care active despite Mama's Munches content) by making Stage 10 always fire |

### Phase 1 — DB merge (~1.5 hr Sonnet)

| # | Decision | File / table | Cost | Why |
|---|---|---|---|---|
| 1 | Add `source` column to `blocks`, `block_attributes`, `block_supports` (values: `sgs`, `native_wp`, `third_party`). Import all blocks.db rows + all wp-devdocs/hooks.db hooks (7283) + docs (1150) rows into sgs-framework.db | `sgs-framework.db` schema migration | ~45 min | One source of truth. Eliminates "fishing across multiple DBs" at runtime |
| 2 | Extend `docs` table with `doc_type='cli-command'`. Seed from: (a) Spec 19 SGS CLI Commands, (b) wp-cli-handbook content already in hooks.db `docs`, (c) hand-curated SGS pipeline commands (`/sgs-clone`, `/sgs-update`, `/wp-blocks dump`, etc.) | `sgs-framework.docs` | ~30 min | Replaces my earlier "new cli_commands table" proposal per Bean's pushback — reuse existing schema, don't proliferate |
| 11 | Add `indexed_files` SGS tracking (mtime + content_hash per SGS block.json + style file) | `sgs-framework.indexed_files` | ~20 min | Enables incremental `/sgs-update` scans instead of full re-walks |

### Phase 2 — Block variations indexing (~1.5 hr Sonnet)

| # | Decision | File / table | Cost | Why |
|---|---|---|---|---|
| 7 | Create SGS `variations` table mirroring (but leaner than) core blocks.db's variations schema: `(id, block_slug, name, title, description, attributes_json, inner_blocks_json, scope, markup_example, source)` | `sgs-framework.variations` | ~45 min | sgs/button has 4 variations indexed nowhere. Spec 16's `register_block_variation()` activation path has no DB to consult |
| 8 | Index sgs/button's 4 variations (primary, secondary, outline, custom) + every other SGS block style alternative. Seed from `includes/variations/class-sgs-block-variations.php` + block.json `styles` arrays | `sgs-framework.variations` | ~1 hr | Concrete data behind the new schema |

### Phase 3 — INNER_BLOCK_PATTERNS retirement (~1 hr Sonnet; preceded by Decision 24 research)

| # | Decision | File | Cost | Why |
|---|---|---|---|---|
| 24 | **PRE-PHASE-3 RESEARCH**: Investigate whether WP 7.0's `block_bindings_supported_attributes` filter + Pattern Overrides is a cleaner alternative to extending `_lift_inner_blocks` to read from DB. WP-native binding might let us replace cv2's nested emit with a bound pattern. | Research subtask | ~30 min | WP 7.0 changes the alternative-space; must decide before committing Phase 3 shape |
| 12 | Rewrite `_lift_inner_blocks(node, pattern)` to take `(node, parent_slug)` and consult `blocks.parent_block` + `slot_synonyms.standalone_block`. Add adjacent-slot grouping logic (when 2+ adjacent siblings need the same parent, wrap them in one parent block, not N). Delete `INNER_BLOCK_PATTERNS` dict from convert.py | `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | ~1 hr | Replaces hardcoded dict with DB-backed lookup. The Wave 2 hardcoded hero entry from commit `ad706d0d` becomes obsolete and gets removed. **NOTE (2026-05-23 fact-check):** Decision 12 implementation (commit `79158da5`) landed step 4 of Spec 16 §15 only (the `_lift_inner_blocks` rewrite + InnerBlocks emit). Steps 1-3 of Spec 16 §15 (walker-entry CSS-class pre-pass: walk every class + assign CSS ownership + record parent-child) were NEVER built. This is why G1+G3+G5 symptoms persist on the live page (5 of 9 sections still fall through to fallback at Stage 2). The walker-entry pre-pass is scoped as Phase 1 of `2026-05-24-strategic-plan.md`. |

### Phase 4 — `/sgs-update` rebuild + Option B port (~4.5 hr Sonnet)

| # | Decision | File | Cost | Why |
|---|---|---|---|---|
| 13 | Port wp-blockmarkup-mcp + wp-devdocs-mcp scraping logic into `/sgs-update --refresh-upstream`. MCPs already deleted; only their cached .db files remain. The new scraper walks the gutenberg + wp-develop + wp-cli handbook repos and re-populates the merged tables. Pin to WP 7.0 tag (not trunk). **Includes** rebuild of `/sgs-update` as a 9-stage holistic refresh: SGS codebase scan, core/gutenberg cache refresh, WP-CLI handbook refresh, style-variation sync, slot synonym auto-seed, block-replacement mapping, spec doc regen, uimax mirror, drift gate. | `plugins/sgs-blocks/scripts/sgs-update.py` (or similar) | ~4.5 hr | Required because MCPs are gone. `--refresh-upstream` becomes the only path to refresh core/gutenberg data. The 9-stage shape (formerly tagged "Decision 5 rebuild" — that was a labelling collision with Phase 0 Decision 5; corrected here per council findings) lives under Decision 13 because they're inseparable work. |

### Phase 5a — Variation system kill + per-site theme.json + push CLI (~2 hr Sonnet)

| # | Decision | File | Cost | Why |
|---|---|---|---|---|
| 18 | DELETE `class-sgs-variation-picker.php`, `class-variation-rest.php`, `class-sgs-legacy-theme-mod-migrator.php`. MODIFY `class-sgs-cli-commands.php` (remove ~3-4 variation sub-commands). Remove the active_theme_style theme_mod logic from `theme/sgs-theme/functions.php`. Remove the variation-CSS-enqueue-by-active-variation logic | Multiple PHP files | ~45 min | Per Bean's simplification — privacy by construction beats privacy by policy. 3 files deleted, 1 modified. Header/footer infrastructure entirely preserved |
| 19 | Move per-client visual snapshots from `theme/sgs-theme/styles/<client>.json` (framework dir) to `sites/<client>/theme-snapshot.json` (per-site dir). Strip `theme/sgs-theme/styles/*.json` from framework deploys | Filesystem reorganisation + deploy script | ~30 min | Per-site snapshots stay in our local repo. Framework deploy contains zero client-specific files. |
| 14′ | New CLI `python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client <slug> --target <ssh-host>` — deploys local `sites/<client>/theme-snapshot.json` to that target's `wp-content/themes/sgs-theme/theme.json` directly. Other sites untouched | `plugins/sgs-blocks/scripts/push-theme-snapshot.py` | ~30 min | Per-site push, no overlay system needed |
| 16′ | `/sgs-clone` Stage 10 invokes push-theme-snapshot via the auto-derived `--client` flag (Decision 6) | `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` Stage 10 | ~15 min | Single deploy flow per clone run |
| 17′ | Hide WP Browse-styles UI on single-stylesheet installs via PHP filter on `wp_theme_json_data_styles` | `theme/sgs-theme/functions.php` | ~10 min | Removes the now-useless picker UI from operator view |

### Phase 5b — Customiser migration of header/footer/site-info admin (~6-10 hr across 1-2 sessions)

| # | Decision | File | Cost | Why |
|---|---|---|---|---|
| 21 | Migrate SGS → Header Rules admin page to WP Customiser section "SGS Header" with `postMessage` live preview (following `Sgs_Floating_UI_Customiser` pattern from Post-Spec-17 decision 13). Same for SGS → Footer Rules, SGS → Site Info. Where live-preview is impractical (rules engines), use `refresh` transport. | New `class-sgs-header-customiser.php`, `class-sgs-footer-customiser.php`, `class-sgs-site-info-customiser.php` + corresponding renderer classes | ~6-10 hr | Live preview for operator UX. Today's save→refresh→navigate cycle is bad UX |
| 22 | Move button preset values into `theme.json.styles.elements.button` (incl. WP 7.0 pseudo-elements `:hover`, `:focus`, `:focus-visible`, `:active`). DELETE `wp_options.sgs_button_presets`. DELETE `class-button-presets-admin.php` settings page. DELETE the CSS-custom-property bridge in button/style.css (or simplify to WP-native CSS generation). Operator edits via WP Site Editor → Styles → Buttons (native) | `theme/sgs-theme/theme.json` + button block files | ~45 min | WP 7.0 makes the entire wp_options bridge redundant. Native is simpler |

### Phase 6 — Markup examples + supports backfill + WP 7.0 audits (~4-5 hr across 1-2 sessions)

| # | Decision | File | Cost | Why |
|---|---|---|---|---|
| 9 | Author `markup_examples` for 69 SGS blocks — one per block minimum, more for variation-heavy blocks. Seed into the merged `markup_examples` table | `sgs-framework.markup_examples` | ~3 hr | SGS has zero markup examples anywhere. Core has 331. Gives cv2 a reference + operators a copy-paste template |
| 10 | Audit + backfill `block_supports` gaps (SGS 404 rows vs core 819 — SGS under-documented 2:1). One pass per block to confirm declared supports match the block.json supports field | `sgs-framework.block_supports` | ~1 hr | Operator-facing controls in editor inspector pick up supports — under-declared supports mean missing UI controls |
| 23 | Audit all 69 SGS block.json files: (a) add `role: content` to every content-bearing attribute (WP 7.0 requirement for `contentOnly` patterns); (b) bump every block to `apiVersion: 3` (WP 7.0 forces iframed editor on v3+ blocks; ensures consistent rendering); (c) every block using `viewScriptModule` needs proper script-module text domain declaration via WP 7.0's `wp_set_script_module_translations()` / `load_script_module_textdomain()` (per §4.15) | All 73 block.json files + each block's PHP enqueue | ~1.25 hr | WP 7.0 alignment |
| 25 | Adopt WP 7.0 native block visibility (toolbar + inspector device-type show/hide) alongside our existing `device-visibility.php` extension. Migration path: WP-native for new uses, existing extension stays for finer-grained controls. Document the precedence | `plugins/sgs-blocks/includes/device-visibility.php` + block.json supports | ~30 min | WP 7.0 partially replaces our custom extension; coexistence rather than retirement |

### Phase 7 — Verification + spec upgrades (Phase C in earlier terminology) (~4 hr across 4 sessions)

Spec-by-spec revision work — see §6 for the impacted-spec inventory and per-spec revision plan.

---

## 4. WP 7.0 audit appendix

Sources (in order added):
- `https://make.wordpress.org/core/2026/05/14/wordpress-7-0-field-guide/` (official field guide, 411 enhancements + 486 bug fixes) — high-level developer content
- `https://developer.wordpress.org/news/2026/05/whats-new-for-developers-may-2026/` (May 2026 dev blog) — high-level developer content
- `https://developer.wordpress.org/reference/since/7.0.0/` (canonical API reference for items added in 7.0.0) — **added 2026-05-21 mid-session after Bean surfaced the URL; previously-missed items recorded in §4.14–4.18 below**
- Released 2026-05-14, ~1 week before this session

**Source distinction matters.** The field guide and dev blog were the initial sources and surfaced the major UI/UX changes (pseudo-elements, role:content, Pattern Overrides). The canonical reference page surfaced API additions that weren't in the high-level content — including the AI Connectors framework, Script Module translations, View Transitions, Icons REST, and Sync Post Meta Storage. Each of these has implications captured in §4.14–4.18.

### Major — affects our spec directly

**4.1 Pseudo-element support for `core/button` at theme.json level.** WP 7.0 lets theme.json declare `styles.elements.button:hover`, `:focus`, `:focus-visible`, `:active` natively. Our entire `wp_options.sgs_button_presets` + custom CSS variable bridge becomes redundant. **Decision 22 absorbs this.**

**4.2 `"role": "content"` block attribute role.** WP 7.0 requires content-bearing attributes to declare `role: content` for blocks to function properly inside `contentOnly` patterns. **Decision 23 absorbs this.**

**4.3 Pattern Overrides + Block Bindings via `block_bindings_supported_attributes` filter.** Patterns can bind sub-block attributes to a source. **Potentially powers slot mapping declaratively as an alternative to extending `_lift_inner_blocks` with DB lookups. Decision 24 (pre-Phase-3 research subtask) investigates this.**

### Moderate — affects one decision each

**4.4 PHP-only block registration.** Blocks can be PHP-only with auto-exposure to JS via globals. **Criterion-gated migration via Decision 29 (Phase 7 wp-skills audit) per §12.5.** Criterion: block has no editor JS surface AND is server-rendered only. Audit identifies candidates.

**4.5 Preset dimensions in theme.json** (width/height/min-height). Affects how per-client snapshots declare hero min-heights. **Decision 19 should adopt this pattern.**

**4.6 Block visibility by device type** (native toolbar/inspector). WP-native equivalent of our `device-visibility.php`. **Decision 25 plans coexistence.**

**4.7 `listView: true` block support.** Adds a dedicated inspector tab. Composite blocks (sgs/hero, sgs/card-grid, sgs/tabs) could opt in. **Criterion-gated revisit:** when operators report editor inspector navigation friction on composite blocks OR when a Customiser-migrated composite needs a list view. Audit folded into Decision 29's wp-block-development skill review (Phase 7).

**4.8 `textIndent` typography support.** New theme.json typography control. **Criterion-gated revisit:** when a client requests text-indent control in editor inspector. Currently zero such requests.

### Low — note for future

**4.9 `@wordpress/grid` package.** Standardised grid utilities. **Criterion-gated revisit:** when sgs/card-grid or sgs/feature-grid hit a layout limitation that the native grid package solves. Audit folded into Decision 29's wp-block-development skill review.

**4.10 Site Identity in Design panel.** Tagline + title now in Design panel. **Criterion-gated revisit:** when Spec 17 Site Info Customiser migration lands (Decision 21 Phase 5b). Evaluate whether the native Design panel integration replaces or complements our Customiser section at that point.

**4.11 Interactivity API `watch()` + `data-wp-watch`.** New reactive primitives. **Criterion-gated revisit:** when sgs/accordion, sgs/tabs, or sgs/testimonial-slider needs reactive state that current `data-wp-bind` + `data-wp-on` can't express. Tracked under Decision 29's wp-interactivity-api skill audit.

**4.12 Iframed editor enforcement when all blocks are API v3.** All SGS blocks should declare `apiVersion: 3` per Decision 23 (which absorbs this finding in Phase 6).

**4.13 Font Library dedicated page.** Enhances our existing `sgs-google-fonts` collection UX. **Criterion-gated revisit:** when an operator reports the font management UX is unclear OR when WP 7.1+ adds new Font Library features. Document the operator path in Decision 29's wp-block-themes skill audit (Phase 7).

### Added 2026-05-21 from canonical reference page

**4.14 AI Connectors framework** (`wp_get_connector()`, `wp_get_connectors()`, `wp_is_connector_registered()`, `_wp_connectors_*` ~14 functions, `wp_connectors_init` hook). **Major new system.** WP 7.0 ships a native AI provider abstraction — API key management, masking, default provider registration, REST integration. **Architectural significance for SGS:** any future AI features (alt-text gen for accessibility, hero-subheadline gen, image-gen for backgrounds, content-gen for empty product descriptions) should use this native layer rather than custom MCP wrappers. **Decision:** parking candidate — adds an open question for future SGS AI roadmap; NOT in current spec scope.

**4.15 Script Module translations** (`wp_set_script_module_translations()`, `load_script_module_textdomain()`, `_load_script_textdomain_from_src()`). Script modules (the `viewScriptModule` we use heavily) now have first-class translation support. **Impact on Decision 23:** the audit scope expands — every SGS block using viewScriptModule needs proper script-module text domain declaration. This is a sub-bullet of Decision 23, not a new decision. ~10-15 min added to Phase 6 audit cost.

**4.16 View Transitions API** (`wp_enqueue_view_transitions_admin_css()`, `wp_get_view_transitions_admin_css()`). Native admin View Transitions support. **Architectural significance:** could improve Customiser navigation UX (Decision 21) — smooth transitions between Customiser panels. **Decision:** parking candidate — not in current scope, opportunistic enhancement for Phase 5b if cheap to wire.

**4.17 `WP_REST_Icons_Controller`.** New REST endpoint for registered icons. **Architectural significance:** our Lucide icon system (`includes/lucide-icons.php`) could benefit from native icons REST endpoint for consistency / cache / API surface. **Decision:** parking candidate — not blocking; future migration opportunity.

**4.18 `WP_Sync_Post_Meta_Storage` + collaborative sync infrastructure.** WP 7.0 lays foundation for real-time multi-operator concurrent editing (CRDTs / sync rooms). **Architectural significance:** Customiser migration (Decision 21) could in principle support concurrent operator edits — but no Bean-controlled site has multi-operator editing as a current scenario. **Decision:** note for future; not in current scope.

**4.19 Abilities API shipped (confirmation).** `WP_REST_Abilities_V1_List_Controller` and `strip_internal_schema_keywords()` confirm the Abilities API targeted by our `/wp-abilities-api` skill landed stable in 7.0. **Decision:** no staging doc change; document for the wp-abilities-api skill that 7.0 is the canonical version.

---

## 5. Phase plan with empirical gates

8 phases. Each phase has a `/qc-council` Stage 5 baseline measurement before subagent dispatch.

| Phase | Decisions | Cost | Gate |
|---|---|---|---|
| **0** — Data seeding | 3, 4, 5, 6 | ~85 min | Pre: query target rows return empty/None. Post: target rows populated; cv2 unit tests pass with new lookup paths used |
| **1** — DB merge | 1, 2, 11 | ~1.5 hr | Pre: 3 DBs separate; queries fail across boundaries. Post: sgs-framework.db has all merged rows; all skills query one DB |
| **2** — Variations indexing | 7, 8 | ~1.5 hr | Pre: variations table doesn't exist. Post: sgs/button + every other variation indexed; register_block_variation activation path consults DB |
| **3** — INNER_BLOCK_PATTERNS retirement | 24 (research first), 12 | ~1.5 hr (incl. research) | Pre: INNER_BLOCK_PATTERNS dict has 2 entries; cv2 reads it. Post: dict deleted; cv2 reads DB; hero CTA emission still works (regression test) |
| **3** — INNER_BLOCK_PATTERNS retirement | 24 (research first), 12 | ~1.5 hr | Pre: dict has 2 entries; cv2 reads it. Post: dict deleted; cv2 reads DB; hero CTAs still render (regression test) |
| **4** — `/sgs-update` rebuild + Option B port + completeness assurance | 13, 30 | ~5.5 hr | Pre: 4-stage version, ~89 hooks indexed. Post: 9-stage version; `--refresh-upstream` re-populates from 10 canonical sources incl. `developer.wordpress.org/reference/since/<version>/`; idempotent re-run produces zero diffs; per-release verification gate active |
| **5a** — Variation system kill | 14′, 16′, 17′, 18, 19 | ~2 hr | Pre: WP variation system active; 9 style files ship to every install. Post: 3 PHP files deleted; theme/sgs-theme/styles/ empty; CLI push works; sandybrown displays Mama's Munches branding |
| **5b** — Customiser migration | 21, 22, 27 | ~6-10 hr | Pre: button presets in wp_options; header/footer admin under SGS top menu. Post: button presets in theme.json native; Customiser has live-preview sections for header/footer/site-info; old admin pages deleted; View Transitions wired |
| **6** — Backfill + WP 7.0 audits + Lucide REST | 9, 10, 23, 25, 28 | ~5 hr | Pre: zero markup examples, supports under-documented, no role:content, Lucide bespoke endpoint. Post: all 69 blocks have markup examples + apiVersion 3 + role:content + script-module text domains; Lucide via WP_REST_Icons_Controller |
| **7** — WP 7.0 alignment | 26, 29 | ~6 hr | Pre: AI Connectors unwired, wp-* skills stale on WP 7.0. Post: Sgs_Ai_Connector registered; 10 wp-* skills audited + updated for WP 7.0 |

**Total: ~28-32 hours / 8-10 sessions** with /qc-council gates between phases.

**Critical paths — two definitions:**

- **Live-correctness critical path** (fixes user-visible bugs ASAP): Phases 0 + 0.5 + 1 + 3 + 5a. **~7 hours / 3 sessions.** Retires INNER_BLOCK_PATTERNS + kills wrong-variation-active bug. After this, the visible failure modes from this session's debugging are closed.

- **Full-programme critical path** (longest dependency chain): Phases 0 + 0.5 + 1 + 4. **~8 hours wall-clock if 4 parallel sessions run.** Defines when the entire programme can finish, not when visible bugs close.

Other phases are quality/UX/automation improvements that can land in any order after live-correctness path.

---

## 6. Impacted-spec revision plan (Phase C — PARTIALLY SHIPPED 2026-05-21 within same session)

**Status update 2026-05-21 (post-strategic-plan session):** Tracks B1 + B2 + C + D dispatched in parallel during the architecture session itself, NOT deferred to future sessions as originally scoped. Per-spec sections below note specifically what landed vs what remains.

Net effect:
- §6.1 Spec 16 — REVISED in-session (§16-§21 added, §15 noted hero entry retirement)
- §6.2 Spec 01 — REVISED in-session (per-site theme.json model section added, retirement tombstones)
- §6.3 Spec 11 — REVISED in-session (Site Editor → Styles → Buttons documented; Phase 5b verification gate documented)
- §6.4 Spec 17 — REVISED in-session (§3 architecture paragraph rewritten; §S5-2, §S6-1, §S7-*, §S8 retired with tombstones; Customiser migration section added)
- §6.5 Spec 18 — REVISED in-session (§8b canonical Customiser pattern reference added)
- §6.6 Spec 19 — REVISED in-session (variation sub-commands removed; §7 Adjacent CLI scripts added)
- §6.7 Spec 02 — REVISED in-session (WP 7.0 alignment notes section added at top)
- §6.8 common-wp-styling-errors.md — REVISED in-session (role:content + pseudo-element sections added; B4 updated)

8 of 8 specs revised in-session. Phase C marked COMPLETE 2026-05-21. Architecture programme remaining = Phases 0.5, 1, 2, 3, 4, 5a, 5b, 6, 7 (implementation work, not spec revisions).

8 existing spec documents needed coordinated revision. Order mattered — biggest revision (Spec 16) anchored the others. Original revision plan retained below for historical reference + implementation detail.

### 6.1 Spec 16 — Deterministic Converter v2 (LIVE, MAJOR REVISION)

**New sections to add:**
- §16 — DB consolidation (decisions 1, 2, 11) — describe merged sgs-framework.db schema with `source` column
- §17 — Variations table + indexing (decisions 7, 8) — register_block_variation activation path now DB-backed
- §18 — INNER_BLOCK_PATTERNS retirement (decision 12) — converter consults blocks.parent_block + slot_synonyms.standalone_block
- §19 — Pre-Phase-3 Pattern Overrides research finding (decision 24) — document the chosen path
- §20 — /sgs-update rebuild + Option B (decisions 5, 13) — 9-stage holistic refresh
- §21 — Backfill audits (decisions 9, 10, 23, 25) — markup_examples + supports + role:content + apiVersion 3

**Sections to modify:**
- §15 (Wave 2 reshape) — note that the hardcoded INNER_BLOCK_PATTERNS hero entry from commit `ad706d0d` is retired by §18
- §12.4–12.5 (DB heat-map) — update row counts post-merge

### 6.2 Spec 01 — SGS Theme (LIVE, MAJOR REVISION)

**Fundamentally changes the theme architecture:**
- New §X — Per-site theme.json model (decisions 18, 19) — kill the per-client overlay; one theme.json per site
- New §X+1 — Local-snapshot workflow (decision 19) — sites/<client>/theme-snapshot.json as canonical
- New §X+2 — push-theme-snapshot CLI (decision 14′)
- DELETE sections describing the active_theme_style theme_mod + style variation activation flow
- Update WP 7.0 alignment section (decision 22 — button presets native + pseudo-elements)

### 6.3 Spec 11 — SGS Button Architecture (SHIPPED 2026-05-04, SIGNIFICANT REVISION)

**Reflects Decision 22:** button preset values move from wp_options to theme.json native. Delete admin page references (`class-button-presets-admin.php`); document Site Editor → Styles → Buttons as the operator surface. Note that the `is-style-primary/secondary/outline` className mechanism stays; the underlying value source changes from wp_options to theme.json.

**Also reflects Decision 18/19:** Spec 11 §4 today documents a third editing path — "developer ships a new client via `theme/sgs-theme/styles/<client>.json`." That path is DELETED by the variation system kill (Decision 18) and replaced by `sites/<client>/theme-snapshot.json` + push CLI (Decision 19). Spec 11 §4 needs the per-client developer path section rewritten to reference the new snapshot location + CLI, NOT the deleted style-variation JSON.

**Critical detail per council finding:** Decision 22 says "delete CSS-custom-property bridge." But the `is-style-primary/secondary/outline` classes RENDER via those custom properties (`var(--wp--custom--button-presets--primary--background)`). The fix is to MOVE the property source from wp_options to theme.json's native `styles.elements.button` + variation overrides; WP 7.0's CSS generation automatically produces equivalent `--wp--` custom properties from theme.json. Confirm WP 7.0's generation covers every property the current bridge emits (background, text, border, border-width, border-radius, padding, font-size, font-weight, min-height, plus the four pseudo-element states) BEFORE deleting the manual bridge. If any property is uncovered by WP 7.0's native generation, keep a slim PHP shim that emits the missing properties from theme.json directly.

### 6.4 Spec 17 — Header/Footer Architecture (SHIPPED 2026-05-18 — Option A CSS-custom-property emission still pending)

**AMENDMENT 2026-05-22 (post /qc-council finding):** Phase 5b paint fix (`0ef032fe`) switched Customiser paint targets to `header.wp-block-template-part` / `footer.wp-block-template-part`, but Rater C found a residual gap: `state.md:68` describes an Option A step where the renderer emits `:root { --sgs-header-bg: ...; --sgs-footer-bg: ...; }` and theme.json consumes the variables. The selector fix landed; the CSS-custom-property emission path has not. ~30-min follow-up parked as `P-PHASE-5B-INERT-CUSTOMISER-OUTPUT` (REOPENED). Spec 17 itself is correctly written; the implementation is "shipped with caveat", not "shipped fully".

**FOLLOW-UP AMENDMENT 2026-05-23 (fact-check finding):** The above "REOPENED" claim is STALE — Option A IS in fact shipped. Empirically verified: `plugins/sgs-blocks/includes/class-sgs-header-renderer.php:73-78` emits `:root { --sgs-header-bg: ...; --sgs-header-text: ...; --sgs-header-link: ...; --sgs-header-width: ...; }` and `class-sgs-footer-renderer.php:67-68` does the same for footer. Both renderers are wired via `Sgs_Header_Renderer::register()` + `Sgs_Footer_Renderer::register()` at `sgs-blocks.php:213+215`, hooked to `wp_head`. The 2026-05-22 amendment was written before the actual implementation was inspected. Parking entry P-PHASE-5B-INERT-CUSTOMISER-OUTPUT is RESOLVED 2026-05-23 (Wave B1). Spec 17 status: shipped fully.

Bean's separate concern about clone-pipeline support for header/footer template-parts is now tracked as `P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER` — the pipeline currently treats h/f the same as page body and needs a dedicated stage. Cross-reference belongs in Spec 17 once the handler is built.



**Reflects Decision 18 + 21 — but the revision is bigger than I first scoped.** The council (Rater B Check 4) flagged: Spec 17 §3 architecture paragraph hardwires variation-triggered template-part seeding as the FUNDAMENTAL mechanism (variation activation → `save_post_wp_global_styles` hook → seeder fires). Decision 18 deletes that trigger, so §3's core mechanism becomes incoherent.

**Revision scope:**
- §3 architecture paragraph — REWRITE to describe NEW seeding trigger: operator-explicit action via `wp sgs seed-template-parts` CLI (already preserved per Decision 18) OR first-install activation via SGS plugin activation hook. Template parts no longer auto-seed on variation switch because variations are gone.
- §S5-2 (Variation Picker) — DELETE entirely; document the kill
- §S6-1 (Legacy Theme Mod Migrator) — DELETE
- §S7-* — DELETE REST endpoint sections related to variations
- New section — Header/footer admin migration to Customiser (decision 21) — patterns from Sgs_Floating_UI_Customiser
- New cross-reference — Spec 18 (SGS Floating UI) as canonical Customiser pattern reference
- Preserved (Bean's three-concept distinction): template-part seeder, resetter, meta, header rules, footer rules, behaviours, sgs_header/sgs_footer CPTs

### 6.5 Spec 18 — SGS Floating UI (LIVE, REFERENCE CROSS-LINK UPDATE)

**Add cross-references** — Spec 17 + Spec 21 (button presets migration) follow this spec's Customiser pattern. Make Spec 18 the canonical "how to register an SGS Customiser section" reference.

### 6.6 Spec 19 — SGS CLI Commands (SHIPPED 2026-05-19, MODERATE REVISION)

**Reflects Decision 18 + 14′ + 16′:**
- DELETE the 3-4 `wp sgs` sub-commands related to variations
- Add `push-theme-snapshot` command (decision 14′) — actually this is a Python script, not a wp-cli command, so add as Section 7 "Adjacent CLI scripts"
- Update §4.5 (`wp sgs seed-template-parts`) — clarify that template parts are brand-agnostic, separate from the variation kill

### 6.7 Spec 02 — SGS Blocks Reference (LIVE, REFERENCE UPDATES)

**Reflects Decision 7, 8, 23, 25:**
- Add variations column to per-block reference
- Add role:content + apiVersion column to confirm WP 7.0 alignment per block
- Note where SGS native blocks coexist with WP 7.0 native block visibility

### 6.8 common-wp-styling-errors.md (LIVE, REFERENCE UPDATES)

- Add §X — `role: content` requirement under WP 7.0
- Add §X+1 — Pseudo-element selectors in theme.json (WP 7.0)
- Update Section B4 (button InnerBlocks) — note Decision 22 changes the value source

---

## 7. Acceptance criteria (whole work programme)

After all 8 phases land:

- **DB**: sgs-framework.db is the single source of truth; blocks.db + hooks.db can be deleted; runtime queries cross-domain (e.g. "what supports does a block declare?") succeed in one query
- **Style variations**: zero per-client variation files in framework; each live site has exactly ONE theme.json; sandybrown's Mama's Munches content displays Mama's Munches branding without manual intervention
- **INNER_BLOCK_PATTERNS**: dict deleted from convert.py; hero CTAs still render correctly on the live page; adjacent-button grouping works for any block declaring parent_block
- **Button presets**: `wp_options.sgs_button_presets` row deleted; values live in theme.json; primary/secondary/outline rendered correctly without the CSS variable bridge
- **Customiser**: header/footer/site-info admin pages migrated; live-preview works for at least colours + typography + spacing controls
- **WP 7.0**: all 69 SGS blocks have `apiVersion: 3` + `role: content` on content attrs; pseudo-element styles in theme.json render correctly; block visibility coexistence documented
- **/sgs-update**: 9-stage version is idempotent; `--refresh-upstream` re-populates core/gutenberg rows from canonical sources; drift gate catches schema mismatches
- **Spec coherence**: Specs 01, 02, 11, 16, 17, 18, 19 + common-wp-styling-errors.md all reflect this architecture; no contradictions

---

## 8. Methodology guardrails (carried forward from prior session)

All work in this programme respects:

- **blub.db 254** — Read `pipeline-state/<run>/leftover-buckets.json` BEFORE conjecturing about converter quality / pixel-diff causes
- **blub.db 255** — Multi-model `/qc` panel BEFORE every commit touching converter / pipeline / SGS block logic
- **blub.db 256** — Per-section cropped pixel-diff via `--selector .sgs-{section}`, NOT full-page
- **blub.db 272** — Schema enumeration BEFORE any "missing column / missing table" claim
- **blub.db 276** — Council fix-shape proposals are hypotheses; Stage 5 empirical baseline gate mandatory before subagent dispatch
- **2026-05-18 OUTCOME vs COMPLETION** — code shipped ≠ outcome achieved; metric-validation gates between phases
- **ADHD Rule 13** — session sprawl prevention; each phase fits one session
- **Verify-rendered-output discipline** — eyes-on Playwright after each phase commits before declaring it done

---

## 9. Open questions to resolve during Phase C (spec revisions)

These don't block Phase 0–6 implementation but need resolution before the specs are upgraded:

1. **Variation files in sites/ — what's the snapshot format?** Full theme.json copy, or just the diff vs framework default? Probably full copy for simplicity.
2. **Push-theme-snapshot — is overwriting theme.json on the server safe?** Operator may have made edits via Site Editor that aren't in the snapshot. Need: pre-push diff + operator confirmation, OR a "push merges with current operator edits" mechanism. Probably the former.
3. **Pattern Overrides as INNER_BLOCK_PATTERNS replacement — RESOLVED 2026-05-21.** Decision 24 research subagent reported back: **keep DB-backed approach (Phase 3 plan unchanged).** Pattern Overrides is orthogonal — operator-facing per-instance editing UX for synced patterns, not converter logic. The N-button problem (fixed named slots vs variable mockup button counts) makes it unsuitable as a replacement. Pattern Overrides is worth adopting as an ADDITIVE operator-UX layer in Phase 6 alongside Decision 23's `role: content` audit — adds per-instance override UI inside synced patterns. Full report: `.claude/reports/2026-05-21-pattern-overrides-research.md`.
4. **Block visibility coexistence (Decision 25)** — operator UX: do we show two device-toggle UIs (WP-native + our extension) until migration completes? Or hide ours when WP-native is sufficient?
5. **WP 7.0 PHP-only block registration** — opportunity to convert some SGS blocks (e.g. the static ones) to PHP-only for simpler stack. Out of scope here, parking candidate.
6. **AI Connectors framework adoption (§4.14)** — when SGS adds AI features (image gen / content gen / alt-text gen), use WP 7.0 native connectors. Open question for future SGS AI roadmap; not in current scope.
7. **Script Module translations (§4.15)** — Decision 23 audit absorbs this; the open question is whether to author translation files now or defer until first non-English client.
8. **View Transitions for Customiser (§4.16)** — opportunistic enhancement for Phase 5b if cheap to wire. Open: assess at Phase 5b dispatch time.
9. **Icons REST controller (§4.17)** — future migration opportunity for our Lucide icon system. Open: assess when next icon-feature lands.
10. **Sync Post Meta Storage / collaborative editing (§4.18)** — foundational for future multi-operator editing; no current scenario. Open: revisit if/when SGS gains multi-operator clients.

---

## 10. Cross-references

- Wave 2 implementation commit: `ad706d0d` (commit retired by Phase 3)
- /qc-council Stage 5 case study that produced the "council predictions need empirical validation" rule: blub.db row 276
- Architectural discussion that produced this doc: this session's 5 pushback rounds documented in `.claude/handoff.md`
- Spec 17 (Header/Footer Architecture) — affected sections in §6.4
- Spec 11 (SGS Button Architecture) — affected sections in §6.3
- Spec 16 (Deterministic Converter v2) §15 — Wave 2 reshape, partly obsoleted by Decision 12
- WP 7.0 Field Guide: https://make.wordpress.org/core/2026/05/14/wordpress-7-0-field-guide/

---

## 11. Round 6 additions — WP 7.0 canonical-reference findings + source-completeness + structural QC enforcement

After this doc's first draft, Bean shared the canonical WP 7.0 added-API reference (`developer.wordpress.org/reference/since/7.0.0/`). Cross-checking that against my initial audit surfaced 6 items I'd missed (§4.14–4.19). Bean explicitly rejected parking them and asked for real architectural resolutions. This section captures the resolutions as Decisions 26–31 + resolves every open question in §9.

### Decision 26 — Adopt WP 7.0 AI Connectors as the canonical SGS AI integration layer

**Decision:** SGS framework adopts WP 7.0's `wp_get_connectors()` / `wp_get_connector()` / `wp_is_connector_registered()` API as the canonical interface for ANY future SGS AI feature. No custom MCP wrappers around AI providers in SGS code — call into the native connector layer.

**Why:** Bean's framing — "I'm trying to go ahead and innovate, I can't be behind on what's publicly accessible." WP 7.0 ships a native AI provider abstraction; building SGS-side wrappers would be reinventing infrastructure WP core now provides. The native layer handles API key management, masking, default provider registration, REST integration — all for free.

**Scope in current programme:**
- Register a `Sgs_Ai_Connector` PHP wrapper class at `plugins/sgs-blocks/includes/class-sgs-ai-connector.php` that exposes SGS-specific call sites (alt-text gen, content gen, image gen) on top of `wp_get_connector()`
- Document supported provider roster as a roadmap (OpenAI, Anthropic, Gemini, Ollama-via-local)
- NO specific AI features built yet — this is infrastructure-only

**Phase:** 7 (new phase — WP 7.0 alignment). Cost: ~30 min code + ~30 min docs.

### Decision 27 — View Transitions wired into Customiser migration

**Decision:** When Decision 21 migrates SGS admin pages to Customiser (Phase 5b), call `wp_enqueue_view_transitions_admin_css()` so navigation between Customiser panels gets WP 7.0's native smooth transitions. Additive to existing Phase 5b scope.

**Verification gate (per Rater C UNCONFIRMABLE finding):** WP 7.0 docs name this function as "for the admin" — Customiser-specific context is NOT explicitly confirmed in the public docs. Phase 5b implementer MUST verify in live testing that view transitions actually fire when navigating between Customiser panels. If they don't (because Customiser runs in a different admin sub-context), fall back to a manual `customize_controls_enqueue_scripts` hook that emits the view-transitions CSS directly. Either way produces the UX outcome; the function call is the cheap-path first attempt.

**Why:** Cheap to wire (~10-15 min on top of existing Customiser work); makes the live-preview UX feel modern; aligns with WP-native pattern.

**Phase:** 5b (additive to existing scope; no new phase).

### Decision 28 — Lucide icons exposed via WP 7.0 Icons REST controller

**AMENDMENT 2026-05-22 (post-Phase-7 reality check):** `WP_REST_Icons_Controller` class exists in WP 7.0, but the plugin-side registration helper `wp_register_icon_collection()` does NOT ship until WP 7.1. Phase 6 cannot complete the refactor as originally scoped; parked as `P-6-LUCIDE-REST-ENTRY-POINT` WAITING on WP 7.1. Defensive guards (`class_exists` + `function_exists`) live in `class-sgs-lucide-icons-rest.php`. The decision-as-written below remains the target shape; only the timeline shifts.

**Decision:** Refactor `plugins/sgs-blocks/includes/lucide-icons.php` to register icons via the native `WP_REST_Icons_Controller` endpoint added in WP 7.0. Consumers (sgs/icon-block, render.php usage, future Customiser icon-picker UI) get a unified REST endpoint instead of bespoke icon resolution code.

**Why:** Standardises the icon delivery surface. Frees future feature work (e.g. icon search in editor inspector) to use the native endpoint rather than scrape lucide-icons.php directly.

**Phase:** 6 (folded into the existing audit phase). Cost: ~45 min.

### Decision 29 — Comprehensive WP-skills WP-7.0-alignment audit

**AMENDMENT 2026-05-22 (Phase 7 implementation reality):** Scope expanded from 10 to 14 targets. Phase 7 Step 7.2 audited the planned 10 WP-family skills plus 4 SGS skills (`sgs-wp-engine`, `wordpress-router`, `sgs-extraction`, `sgs-clone`) plus 9 slash commands (`wp-blocks`, `wp-hook-graph`, `wp-hooks`, `wp-perf-gate`, `wp-perf`, `wp-scaffold`, `wp-theme-check`, `clone-patterns`, `sgs-db`). Cross-skill cohesion findings surfaced: (1) AI Connectors routing dead zone (only `wp-plugin-development` documented `wp_connectors_init`; sgs-wp-engine, wordpress-router, wp-hooks, wp-hook-graph all omitted it); (2) Spec 13 vs Spec 15 §8.1 split — three commands referenced obsolete spec; (3) `apiVersion: 3` absent from `wp-scaffold`, `sgs-clone` Stage 7 COMPOSE, `clone-patterns.md`. All three fixed in the parallel-subagent revision pass (commits `da19374c` + `b26abf56`).


**Decision:** Audit every skill in the WP family (`wp-block-development`, `wp-block-themes`, `wp-interactivity-api`, `wp-plugin-development`, `wp-rest-api`, `wp-wpcli-and-ops`, `wp-performance`, `wp-abilities-api`, `wp-site-extraction`, `wp-project-triage`) for WP 7.0 alignment. Per skill, the audit checks:

- References to deprecated APIs (e.g. `apiVersion: 2` examples → bump to 3)
- Missing new APIs that should be surfaced: Interactivity API `watch()` + `data-wp-watch`, Pattern Overrides, Block Bindings (`block_bindings_supported_attributes` filter), View Transitions, AI Connectors, Icons REST, Abilities API (`WP_REST_Abilities_V1_List_Controller`), Script Module translations, pseudo-elements in theme.json, `role: content` requirement, PHP-only block registration
- Stale code examples (snippets that work on WP 6.x but use deprecated patterns under 7.0)
- WP 7.0 best practices not surfaced

**Why:** Bean's concern about being behind on publicly-accessible WP capabilities. If the skills reference stale guidance, every WP-related task downstream inherits that staleness. Once-off audit + revision; skills update on WP minor releases via Decision 30's source-refresh mechanism.

**Phase:** 7 (paired with Decision 26 AI Connectors registration). Cost: ~30 min × 10 skills = ~5 hrs.

### Decision 30 — WP knowledge DB ingestion completeness assurance plan

**AMENDMENT 2026-05-22 (Phase 4 implementation reality):** Mode B reaches 10/10 sources with three reality-based adjustments not anticipated in this section:

1. **Source 4 floor recalibrated from ≥100 to ≥30.** WP 7.0 genuinely lists only 41 new public API identifiers — a smaller release than the ≥100 minimum assumed here. Floor now catches scraper-health (zero return from selector drift) without false-positiving on small releases. See `plugins/sgs-blocks/scripts/sgs-update-v2.py` (`MINIMUM_SOURCE_4_ITEMS = 30`).
2. **Source 5 URL corrected.** Plan template `make.wordpress.org/core/<release-tag>-field-guide/` returned HTTP 404. Live URL: `make.wordpress.org/core/2026/05/14/wordpress-7-0-field-guide/`. Returns 52 sections.
3. **Source 2 counter rewrite (/qc-council finding).** Initial implementation gated success on `INSERT OR IGNORE` rowcount sum, which silently failed in the day-to-day case where cached hooks.db already populated the rows. Counter now tracks `s2_extracted` (regex matches across all 5 files) as the scraper-health signal; success when extracted > 0. Day-to-day Mode A run reports 161 hooks extracted, 0 newly inserted (idempotent).

Mode B end-to-end with rotated `ghp_*` classic PAT: 10/10 sources succeed (commit verification via `git log d18b7354..HEAD`).

**Decision:** `/sgs-update --refresh-upstream` (the Option B scraper-port from Decision 13 / Phase 4) MUST pull from all 10 canonical sources, not the 4 high-level sources that produced this session's audit gap:

| # | Source | What it gives | Why it matters |
|---|---|---|---|
| 1 | `WordPress/gutenberg` repo (`packages/block-library/src/`) | block.json schemas + variations + supports | Block-level truth |
| 2 | `WordPress/wordpress-develop` repo | PHP API + hooks + classes | Server-side truth |
| 3 | `wp-cli/handbook` repo | CLI commands + flags + examples | Operator-tool truth |
| 4 | `developer.wordpress.org/reference/since/<version>/` | **Canonical added-API list per WP version** | The source THIS session missed — gave 6 items the field guide skipped |
| 5 | `make.wordpress.org/core/<release-tag>-field-guide` | Architectural changes per release | High-level patterns |
| 6 | `developer.wordpress.org/news` (monthly dev blog) | Forward-looking dev changes | Roadmap signal |
| 7 | `developer.wordpress.org/block-editor` | Block API reference | Editor truth |
| 8 | `developer.wordpress.org/themes` | Theme handbook | Theme.json truth |
| 9 | `developer.wordpress.org/plugins` | Plugin handbook | Plugin-side patterns |
| 10 | `developer.wordpress.org/rest-api` | REST handbook | REST surface truth |

**Per-release verification gate:** when WP X.Y releases, `/sgs-update --refresh-upstream` checks that every function / class / hook listed in `developer.wordpress.org/reference/since/<X.Y>/` exists in our merged DB. Missing items → error visibly + name each missing item. This makes "DB completeness" auditable, not trusted on faith.

**Drift-check-dispatcher integration:** the existing hook gains a new Check 6 — when SGS deploys to a site, the hook checks the site's `WP_Version` constant against `sgs-framework.db` schema_metadata `wp_version_indexed`. Mismatch → systemMessage warning "Site is WP X.Y, DB indexed for WP A.B — run /sgs-update --refresh-upstream before deploying knowledge-dependent features."

**Why:** This is the structural answer to Bean's "how can I trust the DB sources are complete?" concern. Trust by verification, not by faith. Catches the failure mode that nearly cost us this session (audit based on field guide alone, missing 6 items).

**Phase:** 4 (absorbs into the Option B scraper port; expands source list + adds verification gate). Cost: ~1 hr on top of existing ~4 hr port.

### Decision 31 — Structural QC enforcement hook (lesson from this session)

**Decision:** New PostToolUse hook at `.claude/hooks/qc-on-converter-edit.py` registered in `.claude/settings.json`. Fires when Write/Edit targets `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` OR `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py`. Behaviour: tracks edits in session state; when a subsequent Bash command matches `git commit` on those paths without a `[qc:<run_id>]` marker in the commit message body, emits systemMessage warning naming the required gate.

**Why:** Binding rule 255 was violated 3 times this session (commits `ad706d0d`, `aec54882`, the lucide-icons untracked state). Bean caught it retroactively each time. Enforcement that depends on me remembering is provably insufficient. Same principle as ADHD Rule 10 (structural enforcement on reliability questions). Pairs with the lesson captured at blub.db row 281.

**Phase:** 0.5 (between Phase 0 and Phase 1 — small, enables compliance for all subsequent phases). Cost: ~20 min.

---

## 12. Open questions — all resolved

Every question in §9 now has a concrete answer:

**12.1 (was §9.1) — Snapshot format.** RESOLVED: **full theme.json copy, not diff-against-default.** A site's theme.json is small (~5-20 KB); the simplicity of a 1:1 file copy outweighs the bandwidth savings of a diff. Push CLI overwrites; pre-push diff handles operator-edit detection (see §12.2).

**12.2 (was §9.2) — Push-theme-snapshot safety with operator edits.** RESOLVED: **pre-push diff + operator confirmation flow.** CLI fetches the server's current theme.json, diffs against the local snapshot, displays the diff to the operator, requires `--yes` flag (or interactive y/N) to proceed. Operator edits via Site Editor write to `wp_global_styles` (separate post type), not theme.json directly — so file-level conflicts are rare. When they DO occur (operator-edited theme.json file directly), the diff surfaces it before any overwrite.

**12.3 (was §9.3) — Pattern Overrides as INNER_BLOCK_PATTERNS replacement.** RESOLVED: keep DB-backed. Pattern Overrides adopted as Phase 6 additive operator UX layer (see §9 in original doc + Decision 24 report).

**12.4 (was §9.4) — Block visibility coexistence (Decision 25).** RESOLVED: **two UIs coexist short-term, retire ours when WP-native reaches feature parity.** Document the precedence: operators should prefer WP-native (toolbar/inspector device toggle) for simple show/hide; reach for our `device-visibility.php` extension only when finer-grained controls (e.g. show-on-mobile-only-AND-only-when-X-condition) are needed. Tracked under "WP capability tracking" — retire ours when its feature surface is fully absorbed by WP-native.

**12.5 (was §9.5) — WP 7.0 PHP-only block registration.** RESOLVED: **opportunity, criteria-gated migration. NOT parked.** Decision: PHP-only block registration is appropriate when a block has (a) no editor JS surface AND (b) is server-rendered only. Candidates: review-schema-related dynamic blocks, possibly post-grid (audit reveals). Audit folded into Decision 29's WP-skills + WP-7.0 alignment pass (Phase 7). No separate phase; ~5 min per candidate inside the audit.

**12.6 (was §9.6) — AI Connectors framework adoption.** RESOLVED: Decision 26. Adopt as canonical SGS AI integration layer. Infrastructure-only in Phase 7; specific AI features built when needed.

**12.7 (was §9.7) — Script Module translations timing.** RESOLVED: **author infrastructure NOW (Phase 6 / Decision 23 sub-bullet c); defer non-English .json files until first non-English client.** Decision 23 audit covers the `wp_set_script_module_translations()` + `load_script_module_textdomain()` wire for every viewScriptModule block. Actual translation .json files are operator-onboarding work, not framework work.

**12.8 (was §9.8) — View Transitions for Customiser.** RESOLVED: Decision 27. Wire into Phase 5b alongside Customiser migration. ~10-15 min additive.

**12.9 (was §9.9) — Icons REST migration.** RESOLVED: Decision 28. Phase 6, ~45 min refactor of lucide-icons.php.

**12.10 (was §9.10) — Sync Post Meta Storage / collaborative editing.** RESOLVED: **explicitly out-of-scope now, criterion-gated revisit.** When SGS gains a client whose team has 2+ concurrent editors of the same site, revisit. No infrastructure work in current programme. Captured in roadmap for visibility, not actioned.

**12.11 (NEW from Bean's Round 6 ask) — How do we maintain WP knowledge DB completeness over time?** RESOLVED: Decision 30. `/sgs-update --refresh-upstream` pulls from 10 canonical sources; per-release verification gate cross-references `since/<version>/` against our DB; drift-check-dispatcher fires when site WP version diverges from indexed version. Trust by verification, not by faith.

---

## 13. Final phase plan (after Round 6 additions)

Updated total: 30 decisions, ~28-32 hours, 8-10 sessions.

| Phase | Decisions | Cost | Can parallelise? | Notes |
|---|---|---|---|---|
| **0** ✅ SHIPPED | 3, 4, 5, 6 | ~85 min | n/a | Commit `aec54882` |
| **0.5** | 31 (structural QC hook) | ~20 min | YES — independent of all other phases | Should ship before anything else, enforces gates for subsequent phases |
| **1** | 1, 2, 11 (DB merge) | ~1.5 hr | NO — foundation for 2, 3, 4 | |
| **2** | 7, 8 (variations indexing) | ~1.5 hr | YES — independent of 3, 4, 5 once Phase 1 lands | Can run in parallel session with Phase 3 |
| **3** | 24 (research first), 12 (INNER_BLOCK_PATTERNS retire) | ~1.5 hr | YES — independent of 2, 4, 5 once Phase 1 lands | Can run in parallel session with Phase 2. Decision 24 was RESOLVED in this session (keep DB-backed) — research subtask retained in scope as a Phase 3 STEP 1 verification gate before Decision 12 dispatches |
| **4** | 13, 30 (`/sgs-update` rebuild + Option B + completeness assurance) | ~5.5 hr | NO — needs Phase 1 done; YES — can run parallel session with Phases 5a, 5b, 6, 7 | Largest single phase. Decision 5 dropped from this row per council finding — Decision 5 shipped in Phase 0; the 9-stage rebuild work is now folded into Decision 13's scope, not a separate Decision 5 entry. |
| **5a** | 14′, 16′, 17′, 18, 19 (variation kill + per-site theme.json) | ~2 hr | YES — independent of 4, 5b, 6 once Phase 1 lands | Can run in parallel session with Phase 4 or 5b |
| **5b** | 21, 22, 27 (Customiser + button presets + view transitions) | ~6-10 hr | YES — independent of 4, 5a, 6 once Phase 1 lands | Can run in parallel session with Phase 4 or 5a |
| **6** | 9, 10, 23, 25, 28 (markup examples + supports backfill + role:content + apiVersion 3 + Lucide REST) | ~5 hr | YES — independent of all others except needs Phase 1, 2 done | |
| **7** | 26, 29 (AI Connectors + WP-skills audit) | ~6 hr | YES — independent | Can run anytime after Phase 1 |

**Parallel-session opportunities (Bean explicit constraint — multiple sessions in parallel where independent):**

- **Session A:** Phase 0.5 → Phase 1 → Phase 4 (DB merge → `/sgs-update` rebuild + completeness assurance)
- **Session B (parallel after Phase 1):** Phase 2 + Phase 3 sequentially (variations indexing + INNER_BLOCK_PATTERNS retire)
- **Session C (parallel after Phase 1):** Phase 5a + 5b sequentially (variation kill + Customiser migration)
- **Session D (parallel after Phase 1):** Phase 6 (audits) + Phase 7 (WP 7.0 alignment) sequentially

If you run 4 parallel sessions after Phase 1 lands, the remaining ~24 hrs of work compresses to ~7-8 hours wall-clock.

**Critical path:** 0.5 → 1 → (longest of the 4 parallel branches, which is Session A's Phase 4 at ~5.5 hr).

**Critical-path total: ~8 hours wall-clock** if 4 parallel sessions run.

---

## End of staging doc

Next action: /qc-council on this doc (multi-rater validation) → /strategic-plan → /phase-planner per phase → /handoff with pre-written subagent prompts.
