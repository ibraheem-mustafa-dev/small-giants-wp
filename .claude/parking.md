---
doc_type: parking
project: small-giants-wp
last_updated: 2026-05-16
---

# Parking — deferred work with named triggers

## New 2026-05-16 — Phase 8 in-flight backlog

### P-PHASE8-9 — Slot-synonym expansion: tile / panel / feature / module / item

**What:** The 2026-05-16 walker fix added `card → sgs/info-box` via `slot_synonyms.standalone_block`. Multi-rater /qc panel (fresh-eyes lens) recommended also registering the four next-most-common BEM element names that map to info-box compositions in real-world client mockups: `tile`, `panel`, `feature`, `module`, `item`.

**Trigger:** Next client onboarding hits one of these element names AND surfaces as an unmatched gap in `pipeline-state/<run>/leftover-buckets.json`, OR Phase 8 closure work touches a section with these names.

**Approach:** INSERT rows into `slot_synonyms` (sgs-framework.db) with `canonical_slot` = one of the names, `standalone_block` = `sgs/info-box`. Mirror as aliases on the existing `card` row if structurally equivalent. ~5 min per synonym.

### P-PHASE8-10 — Standalone-block column validation on walker startup

**What:** Multi-rater /qc panel (architecture lens) raised a deferred concern: a bad row in `slot_synonyms.standalone_block` (e.g. `text → sgs/paragraph`, `media → sgs/image`) would route every leaf-text element through the composite path, conflicting with `ATOMIC_TAG_MAP`. No load-time validation today.

**Trigger:** Next time someone proposes adding a synonym for a tag covered by `ATOMIC_TAG_MAP`, OR the converter exhibits unexpected routing under DB extension.

**Approach:** In `db_lookup._slot_to_standalone_block()`, reject any row where the standalone_block matches a value in `ATOMIC_TAG_MAP.values()`. Emit stderr warning + drop the row from the map. ~10 lines.

## New 2026-05-15 — Phase 8 backlog (after Spec 16 Phase 7 architectural close)

### P-PHASE8-1 — Heritage-strip as Brand Story PATTERN (Bean's 2026-05-15 redirect)

**What:** Retire the `sgs/heritage-strip` block entirely. Replace with a registered pattern composing `sgs/container` (2-col grid) + `core/heading` + `core/paragraph` + `sgs/quote` (or sgs/testimonial-slider for the author bit) + `sgs/button`. Image goes in the right column.

**Trigger:** Phase 8 section-by-section closure work reaches the heritage section, OR a new client needs the Brand Story composition.

**Approach:**
- Register pattern at `theme/sgs-theme/patterns/brand-story.php` with placeholder content
- Update Spec 16 §Phase-4 + framework block-build-status table to remove heritage-strip
- Migrate existing posts using sgs/heritage-strip via WP-CLI block-recovery (or accept they stay on the deprecated block until manually re-laid)
- Update converter — remove the `if block_slug == "sgs/heritage-strip":` guard at line 1016 (it's currently dead code since the CSS-driven path catches the section)

**Spec ref:** Bean's 2026-05-15 redirect in conversation; capture in Spec 16 v0.3.

### P-PHASE8-2 — Per-block render.php audits

**What:** Many lifted styling attrs aren't honoured by block render.php. The converter lifts `headlineFontSizeTablet` correctly but the block's render.php doesn't emit a `@media (min-width:768px) { .sgs-Xxx__headline { font-size:N }}` rule for it. Audit 6-8 blocks (hero, product-card, info-box, heritage-strip, testimonial-slider, feature-grid, card-grid, cta-section).

**Trigger:** Phase 8 section-by-section closure — each section's per-section diff above 1% drives an audit of its block's render.php.

**Approach:** for each block:
1. List all *Tablet / *Mobile / *Desktop variant attrs in block.json
2. Confirm render.php emits matching media-query CSS for each
3. Confirm CSS uses `:not([style*="<prop>"])` fallback pattern per SGS standard

**Effort:** ~30 min per block × 6-8 = 3-4 hours.

### P-PHASE8-3 — Remove hyperspecific block_slug guards in `lift_subtree_into_block_attrs`

**What:** `if block_slug == "sgs/hero":` at line 1016 and `if block_slug == "sgs/heritage-strip":` at line 1048 are pre-existing technical debt the multi-model QC panel surfaced as "in scope of NEEDS-REFACTOR but not new". Refactor to BEM-modifier-driven generic lift via a DB-backed `block_image_slots` table (subagent 5's 2026-05-15 design).

**Trigger:** Either Phase 8 closure work hits a non-Mama's hero, OR the heritage-strip pattern refactor (P-PHASE8-1) makes the heritage guard dead code.

**Approach:** see 2026-05-15 subagent 5 report in conversation transcript. ~70-80 lines + DB seed.

### P-PHASE8-4 — `convert_page.py` line 198 still hardcodes `extracted_attributes: {}`

**What:** During the 2026-05-15 styling-lift work, the implementer fixed `convert_section()` in `__init__.py` to populate extracted_attributes via brace-depth extraction. The parallel `convert_page.py` function still has the hardcoded empty dict. If the orchestrator routes through convert_page.py instead of convert_section, Stage 9 sees empty extracted_attributes.

**Trigger:** Next session start (Phase 8 will run convert_page.py at orchestrator invocation; surface this as one of the first investigations).

**Approach:** apply the same brace-depth extractor logic. ~15 lines.

### P-PHASE8-5 — Pack-size pills not rendering on featured-product cards

**What:** Lift code in `_extract_attr_value` and the lift_subtree loop correctly emits `packSizes` array in the converter's WP block markup for Zookies card. Render.php has `if ( ! $is_trial && ! empty( $pack_sizes ) )` gate. Pills don't render visibly on the deployed page. Audit the `$is_trial` computation — likely the variantStyle being lifted as "standard" doesn't quite match what render.php expects.

**Trigger:** Phase 8 section-by-section closure hits `.sgs-featured-product`.

**Approach:** open `plugins/sgs-blocks/src/blocks/product-card/render.php`, trace `$is_trial`, confirm the variantStyle enum mapping. ~15 min.

### P-PHASE8-6 — Section-internal nav mapping

**What:** `<nav>` is in `SKIP_TOP_LEVEL_TAGS` so the top-level header skip works. But nested navs (inside non-header sections) currently pass-through their children as bare `<a>` tags that render as `<p>Shop</p><p>About</p>…` paragraphs. Map nested `<nav>` to `core/navigation` or `sgs/mega-menu`.

**Trigger:** Phase 8 work hits a section with nested nav, OR a new client mockup needs section-internal navigation.

**Approach:** add `<nav>` to ATOMIC_TAG_MAP routing to `core/navigation` with a child-link lifting helper. ~30 lines.

### P-PHASE8-7 — `_BREAKPOINT_SUFFIXES` non-standard breakpoint silent-drop

**What:** The styling-lifter's `_BREAKPOINT_SUFFIXES` table covers 5 industry-standard breakpoints (min-width 768/1024/1280, max-width 767/640). Non-standard breakpoints (e.g. `min-width: 900px` or `min-width: 576px`) are silently ignored — the responsive attr family doesn't get lifted.

**Trigger:** Phase 8 work hits a mockup with non-standard breakpoints, OR a CC/QC reviewer flags this gap.

**Approach:** add a stderr warning when a media-query selector matches a known class but the breakpoint isn't in the table. Long-term: read breakpoints from theme.json or a new config rather than a hardcoded set. ~30 min.

### P-PHASE8-8 — Spec 16 v0.3 — closure gate revision

**What:** Spec 16 §Phase 4 currently says "≤ 1% pixel diff" without specifying per-section vs full-page. 2026-05-15 work proved per-section cropped diff is the honest measurement. Spec needs revision to define:
- Closure unit = section (cropped via `--selector .sgs-X`)
- Threshold = ≤ 1% across 375 / 768 / 1440 viewports per section
- Page-level closure = ALL sections close
- Methodology rule: read leftover-buckets.json BEFORE any pixel-diff conjecture

**Trigger:** First Phase 8 session (this is a 30-min doc update, do it early).

**Approach:** edit `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §Phase 4 closure-gate definition.

## New 2026-05-14 — Phase 6 v2 deferrals

### P-S15-ROLE-TEMPLATES-MIGRATE — Migrate role-templates.json into property_suffixes DB table (~2 hr)

**What:** `tools/recogniser-v2/data/role-templates.json` carries 20 role definitions + cross-platform extraction recipes. Spec 15 §6 Stage 4 + FR2 marks this TO-MIGRATE in Phase 1 - migration was deferred and never completed. The file is currently functioning (read by extract.py at load_role_templates() line 227) but accumulates silent drift versus the DB (every Spec 15 Phase 3/3.5 pass updates the DB but the JSON file might be stale).

**Trigger:** Post-Phase-6 doc-hygiene sweep, OR when an extract.py regression surfaces that traces to JSON-vs-DB divergence, whichever comes first.

**Approach:**
- Write migration script `plugins/sgs-blocks/scripts/migrate-role-templates-to-db.py` that walks role-templates.json + INSERTs/UPDATEs the matching property_suffixes rows
- Update extract.py.load_role_templates() to read from DB instead of file (or retain JSON as fallback during transition)
- Verify byte-parity per-role between JSON values and migrated DB values
- Add the `role-templates-vs-property-suffixes-check.py` drift-check hook (see docs-registry section 7)
- Delete role-templates.json after operator approval

**Spec ref:** Spec 15 §6 Stage 4 + FR2 + Appendix E ("role-templates.json TO-MIGRATE Phase 1").

**Why parked until after Phase 6:** Phase 6 closes the pixel-parity gate via integration work (wiring 14 modules + generalising extract.py CSS-consumption). Adding the role-templates migration to Phase 6 risks the working Stage 4 dispatch path for no parity-gate benefit. Cleaner to land Phase 6 first, then sweep this migration as a focused mini-phase.

**Mitigation while parked:** the new drift-check hook `role-templates-vs-property-suffixes-check.py` (added to docs-registry section 7 as a future hook) would surface drift if built. For now, drift is implicit risk.



Items here have a clear next-step but aren't urgent. Each entry: the work, the trigger to resume, the spec, and rough effort. Resolved items are kept as one-line summaries (no ORIGINAL retention to keep the file scannable).

## New 2026-05-12 (evening) — Spec 15 Phase 4.5 follow-ups

### P-S15-STYLEVAR-GEN — Auto-generate style variations from uimax font_pairings + colour palettes (~60-90 min)

**What:** uimax has 57 font_pairings + 269 colour palettes + UX reasoning rows curated by industry / mood / product type. Build a generator that picks a `font_pairing` + a `palette` from uimax, emits a complete `theme/sgs-theme/styles/<slug>.json` style variation. Used to bulk-create 20+ "starter looks" (e.g. `restaurant-warm`, `legal-conservative`, `tech-minimal`) so new clients pick a starting point rather than starting from blank.

**Trigger (primary, added 2026-05-12 operator framing):** Step 1 of the draft-design process for every new client — generate 3-5 candidate style variations from uimax pairings appropriate to the client's industry/mood, then test draft designs against each. Pick the favoured one to anchor the rest of the work. This converts uimax pairings from a passive reference into an active part of the pipeline.

**Trigger (secondary):** When the operator wants a richer style-variation library OR as a one-off "seed 20 starter looks" task.

**Approach:**
- Script at `plugins/sgs-blocks/scripts/build-style-variations.py`
- Query uimax for a `font_pairings` row + matching `colors` palette row (joined on industry/mood)
- Emit JSON matching the schema of existing variations (`mamas-munches.json` etc.)
- One row pair = one variation. Idempotent on slug.
- Optional: pull recommended typography sizes + UX rule defaults from uimax `ux_guidelines` for the variation's `styles.elements.h1/h2/p` defaults.

**Spec ref:** Not in any spec — captured from operator request 2026-05-12. Sits **after Phase 6** per operator framing 2026-05-12 (cross-platform output extension lands first; the pickers + generator are the operator-facing layer that builds on top).

**Why parked until after Phase 6:** Phase 4.5 ships token-discovery infrastructure (single-draft → single-variation flow). Phase 5 is E2E clone. Phase 6 is cross-platform output. The style-variation generator becomes meaningful when all three are in place — at that point, "pick a style → drop a draft → clone to SGS → optionally emit to other platforms" is a coherent pipeline. Doing the generator earlier would build it before its consumers exist.

### P-S15-PAIRINGS-PICKER — Site Editor SlotFill panel for browsing uimax pairings (~4-6 hr)

**What:** A "Browse Pairings" custom panel inside the WordPress Site Editor's Styles section. Operator browses font_pairings + colour palettes from uimax via REST endpoint backed by the uimax DB. Preview live in the editor; "Apply" writes the selected pair to the active style variation.

**Trigger:** After P-S15-STYLEVAR-GEN ships AND operator has 20+ starter looks to validate the picker UX. Don't build the picker before there's content worth picking.

**Approach:**
- Register a SlotFill via `@wordpress/edit-site` (or `wp.plugins.registerPlugin` if SlotFill API doesn't fit).
- REST endpoint `sgs-blocks/v1/uimax/pairings` reading from the uimax DB.
- Preview component renders font samples + palette swatches.
- Apply writes to `wp_global_styles` via `core/edit-site` data store.

**Spec ref:** Not in any spec yet. Phase 6+ feature.

**Why parked:** Phase 4.5 scope is convention + token discovery. Custom Site Editor UI is a separate cycle of work with its own QA gates.

## New 2026-05-12 — Spec 15 Phase 1 QC panel deferrals

### P-S15-F3 — Decide root-level structural attr handling (~30 min in Phase 2)

**What:** 1023 of 1343 `block_attributes` rows (76.2%) legitimately have `canonical_slot = NULL` because the v1 slot vocabulary is content-identity only. Phase 2 drift validator must rule on: (a) accept NULL as the canonical state for structural attrs, or (b) add a `__root__` pseudo-slot for schema uniformity, or (c) extend slot vocab with structural canonicals (`container`, `wrapper`, `inner`).

**Trigger:** Phase 2 Step 2.3 (drift validator). The validator's behaviour spec must commit to one of the three options before it can flag violations.

**Spec ref:** `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` §11 Phase 1 success criteria (updated 2026-05-12).

**Effort:** ~30 min inline architectural call once Phase 2 Step 2.3 begins.

### P-S15-F4 — Lift output_signature coverage above 90% (~60-90 min in Phase 2)

**What:** Static analyser at 74.1% (995/1343). The 300 NULL attrs are design-shape CSS values that flow through PHP interpolation rather than `esc_*()` calls. Lifting coverage requires a small PHP-AST-light pass (e.g. detect `style=" ... {$attrs['X']} ..."` interpolations or array-keyed style maps).

**Trigger:** Phase 2 Step 2.4 (gap detection). Either accept 74.1% as ceiling and surface the rest as gap candidates, or invest 60-90 min to lift coverage.

**Spec ref:** §11 + §5.3 signature schema. Decision needed: extend the analyser, or accept the gap.

**Effort:** 60-90 min if pursued (Sonnet dispatch + tests).

## New 2026-05-11

### P-RECOG-V3 — Consolidate recogniser scripts to tools/recogniser-v3/ (20-30 min)

**What:** Move the active pipeline code into a single canonical location:
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` -> `tools/recogniser-v3/orchestrator.py`
- `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py` -> `tools/recogniser-v3/voter.py`
- `plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py` -> `tools/recogniser-v3/confidence_matrix.py` (underscore so importable normally)
- `plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py` -> `tools/recogniser-v3/leftover_bucket_router.py`
- `plugins/sgs-blocks/scripts/recogniser/simple_html_review_report.py` -> `tools/recogniser-v3/review_renderer.py`
- `tools/recogniser-v2/extract.py` -> `tools/recogniser-v3/extract.py`

Also write `tools/recogniser-v3/README.md` with pipeline diagram + Spec 12 link.

**Trigger:** After Commit A (orchestrator multi-section patches) lands. Two-commit sequence: Commit B does the move, Commit C deletes `tools/recogniser/` and `tools/recogniser-v2/` once a clean orchestrator run confirms nothing else references them.

**Spec:** All path references in orchestrator (VOTER_SCRIPT, MATRIX_SCRIPT, ROUTER_SCRIPT, REVIEW_SCRIPT, extract.py path) need updating. Skill bodies that mention these paths need updating (/sgs-clone). Spec 12 file inventory section needs refresh. state.md current_step needs path update.

**Effort:** 20-30 min including a smoke-test rerun.

### P-EXTRACT-GENERALISE — extract.py beyond hero (Phase 8 critical-path blocker; was misframed as Phase 9)

**What:** `tools/recogniser-v2/extract.py` currently has hardcoded attribute mappings only for sgs/hero. On the 2026-05-11 multi-section orchestrator run, 8 of 9 sections produced empty `attributes` for this reason. **Phase 8 CANNOT ship a meaningful Mama's clone without this work** -- a deploy with 8 empty sections isn't a clone.

**Reframe (2026-05-11):** Bean caught the misframing. Earlier docs put this as "Phase 9 backlog, no fixed trigger". The honest read: extract.py generalisation IS THE remaining Phase 8 work. Until it lands, the orchestrator produces structurally valid block markup with empty inner content. Phase 8 visual parity validation + live deploy + eyes-on review all depend on this.

**Spec:** Extend `extract.py` in-place (don't build a separate slot-filler.py -- previous planning's misdirection). Needs:
- Convention-driven extractors that match SGS-BEM `__element--modifier` selectors against block.json attribute names (already have Stage 3 schema)
- Per-attribute-type strategies: text from RichText / src from `<img>` / colour from computed style / spacing from CSS custom properties / icon name from SVG / link href from `<a>`
- Playwright cascade resolution for CSS-driven attributes (already in extract.py for hero; generalise the pattern)
- Role-templates catalogue defining selector-strategy + value-extractor + fallback-strategy per attribute type
- Per-platform translation rules for the lingua-franca conversion (Spec 13) when source class names aren't SGS-BEM

**Recommended sequence:** Do a 4-model peer review of the architecture FIRST (per the 2026-05-08 pattern that caught 11 fixes before the first real clone), then build. Estimated 4-6 hours focused + 30 min peer review.

**Trigger:** Next active session that can commit to a 4-6 hour focused window. This unblocks Phase 8 visual parity + deploy + eyes-on review.


## New 2026-05-10 — Phase 6 + audit follow-through

### P-MM-1 — Create 4 gap-candidate patterns for Mama's homepage

**What:** Four mockup sections have no matching pattern yet: `featured-product`, `products` (4× `sgs/product-card` grid), `gift-section` (3 cards: 1 trial + 2 gifts), `social-proof` (containing `sgs/testimonial-slider` + trustpilot bar). Each needs a pattern file under `theme/sgs-theme/patterns/` following the same shape as `ingredients-section.php` and `header-mamas-munches.php`.

**Trigger:** Phase 8 starts. Patterns get created inline as `/sgs-clone` Stage 7 (composition emit) surfaces them — per the "make new blocks inline, never defer with placeholder" rule.

**Spec:** TRUTH-SPEC at `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` documents the slot bindings for each. The renamed mockup HTML at `sites/mamas-munches/mockups/homepage/index.html` is the visual source of truth.

**Effort:** ~10-15 min per pattern (use ingredients-section.php as scaffold; replace inner blocks per slot table).

### P-MM-2 — Decide on sgs/section-heading block

**What:** Mama's mockup has cross-section utility classes `.sgs-section-heading__label`, `.sgs-section-heading__intro`, `.sgs-section-heading__sub` appearing inside 4 different parent sections. Currently a CSS-only convention. Decide whether to formalise as a dedicated `sgs/section-heading` block so the recogniser can match it as a real block, or leave as a utility convention.

**Trigger:** Phase 8 — if the recogniser flags these classes as orphan elements during Stage 6 (CSS classify), promote to a block. Otherwise stay as utility.

**Effort:** ~30-45 min if creating the block (block.json + edit.js + save.js + render.php + style.css). Zero if leaving as utility.

### P-MM-3 — Add cart element to header-mamas-munches pattern

**What:** Current `theme/sgs-theme/patterns/header-mamas-munches.php` uses `core/site-logo` + `core/navigation` + `sgs/mobile-nav-toggle` + `sgs/mobile-nav`. The renamed mockup has cart button + cart badge that the pattern doesn't model. Structural drift between mockup and pattern.

**Trigger:** Phase 8 live-deploy parity check. The cart element needs an SGS block or a core block addition to the pattern.

**Spec:** TRUTH-SPEC documents `.sgs-header__cart` + `.sgs-header__cart-badge` slots. There is no SGS cart block currently — likely a `sgs/cart-link` or similar to create.

**Effort:** ~20-30 min (extend the pattern + new block if needed).

### P-OPS-1 — Skill-type classifier in sgs-skillscore v3

**What:** 24 of 45 Phase 4 surfaces sit below 90% on skillscore because the validator grades commands, agents, mini-skills, and discipline references against full-skill criteria. A `--type` flag or auto-detection (command files in `~/.claude/commands/`, agent files in `~/.claude/agents/`, mini-skills via `user-invocable: false` frontmatter) would lift these scores out of rubric-mismatch baseline.

**Trigger:** Bean explicitly opens scope for a skillscore upgrade, or a pattern emerges where rubric-mismatch is masking a real regression. Not urgent.

**Spec:** Add `type` field detection to `sgs-skillscore.py validate`. Type tiers: full-skill (current rubric), command (CLI shortcut — relaxed), agent (identity file — different criteria), mini-skill (sub-skill routed via parent — minimal rubric), reference (discipline doc — minimal rubric).

**Effort:** ~60-90 min (rubric design + implementation + re-grade all 45 Phase 4 surfaces as regression check).

### P-PH8-1 — Hero parity test file scaffold

**What:** Phase 6 Step 6 specified running `python -m pytest plugins/sgs-blocks/scripts/recogniser/tests/test_slot_filler.py::test_hero_filled_slots_match_baseline_count -v` as a sanity check. The test file doesn't exist yet — Phase 8 deliverable.

**Trigger:** Phase 8 starts. The test verifies that `/sgs-clone`'s slot-filler produces ≥50 attributes on the hero section matching `plugins/sgs-blocks/scripts/recogniser/tests/fixtures/hero-baseline.json` (50-attr baseline).

**Spec:** Test file location is the canonical path. Pytest collects from project root. Baseline fixture already exists at `fixtures/hero-baseline.json` (per Phase 6 plan entry-context list — verify before referencing).

**Effort:** ~30-45 min.

---

## Resolved 2026-05-10
- **P-12** block_compositions seed → 36 rows seeded into sgs-framework.db; seed script at `plugins/sgs-blocks/scripts/uimax-tools/seed-block-compositions.py` is idempotent (re-run preserves count). QC PASS.
- **P-13** uimax-write-validator integration → validator script confirmed already enforcing rows 211 + 213; 5/5 `/uimax-*` skills mandate validator calls; new `plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py` Python helper provides atomic validate-then-write. QC PASS.
- **P-15** `/sgs-update` Stage 3+4 → REWRITTEN late-session per Bean's catch: DB is now canonical, CSVs are regenerated mirrors. New `regenerate-csvs` subcommand on `~/.agents/skills/ui-ux-pro-max/scripts/update-db.py` mirrors all 46 DB tables → CSV. `sgs-update-uimax-sync.py` Stage 3 writes SGS blocks to uimax DB via `uimax_write.py` validate chain (skip-if-exists preserves existing Rosetta Stone), then subprocess-calls `update-db.py regenerate-csvs`. Round-trip safe (regen → compile-sqlite → regen) verified by `/qc` 5/5 PASS. Closes the silent-data-loss vector across all uimax tables.
- **P-4** Trustpilot scrape (Mama's Munches) → 4/4 reviews captured to `sites/mamas-munches/research/trustpilot-reviews.json`. QC PASS.

## Resolved 2026-05-11
- **P-TP-SYNC** → Trustpilot review sync infrastructure shipped. 4 classes under `plugins/sgs-blocks/includes/trustpilot/` (Trustpilot_Sync, Trustpilot_REST, Trustpilot_Cron, Trustpilot_Settings), admin JS at `assets/admin/trustpilot-sync.js`. Settings -> SGS Trustpilot Sync page with Browserless creds (AES-256-CBC encrypted at rest), weekly/daily WP-cron (`sgs_trustpilot_sync_event`), Sync-now button via `POST /wp-json/sgs/v1/trustpilot-sync`. JSON-LD parser harvests standalone Review entities from `@graph` (Trustpilot's reference pattern). Browserless `/content` uses `?token=` not Bearer (HTTP 500 on Bearer — captured as lesson, blub.db row 238). Telegram alerts dropped — settings page activity log + last_sync_status is the operator failure surface. End-to-end proven on sandybrown: 4 Mama's reviews captured (TrustScore 4.0 "Great"), smoke-test-2 page flipped to `dataSource: synced` and renders the live reviews. Commit `06df2807`. Visual diff at `reports/visual-diff/trustpilot-sync-2026-05-11.md`.
- **P-Trustpilot block** → `sgs/trustpilot-reviews` block shipped at `plugins/sgs-blocks/src/blocks/trustpilot-reviews/`. Looping carousel, white pill header, theme-inherited typography, hover scale + theme-primary-coloured border, clickable Trustpilot logo, Schema.org JSON-LD, inline + synced + placeholder data sources. Live on sandybrown at /trustpilot-smoke-test-2/. Commit `c6bd4980`. Visual diff report at `reports/visual-diff/trustpilot-reviews-2026-05-11.md`.
- **P-Orchestrator multi-section walker** → Voter `auto_detect_sections` walks into `<main>`; stage 4-8 loops per-boundary in `--auto-section` mode. End-to-end run on Mama's: 9 sections processed, 212 slots scaffolded, 213 leftover entries persisted to recognition_log. Patches uncommitted but tested -- pending Commit A.
- **P-Style.css enqueue gap (systemic)** → wp-scripts emits `style-index.css` but `register_block_type_from_metadata` looks for `style.css`. New `plugins/sgs-blocks/scripts/copy-built-styles.js` postbuild step copies for all 48 blocks (96 files copied first run). Wired in `package.json`. Resolves the silent CSS-not-enqueued issue affecting every SGS block since the build pipeline was set up.
- **P-image-controls.php namespace fatal** → Line 45 `WP_Block_Type_Registry` was resolving as `SGS\Blocks\WP_Block_Type_Registry`. Added leading backslash. Was fatalling on every block render the first time `inject_image_controls` fired (silent until I created a draft on sandybrown today).
- **Dashboard `/api/learning` POST UPDATE bug** → Subagent D applied COALESCE-based patch to `~/.openclaw/workspace/tools/blub-dashboard-v2/src/app/api/learning/route.ts`; `/rebuild-dashboard` ran (PID 64452 → 16720); patch active; row 69 modernisation re-POSTed and confirmed; test row 219 archived.

---

## Active items (cloning pipeline focus)

### P-11-M9 — REOPENED 2026-05-09 (false-claim ship, milestone never actually validated)

**Status as of 2026-05-09 (this session):** The M9 milestone was claimed shipped by the previous session but was NOT actually validated. The orchestrator extension code shipped (commit dcb185b). The 6521-file foundation committed. But the multi-section orchestrator NEVER RAN on the live site. The wp-sgs-developer subagent was given a brief that contained a fallback ("hero-only deploy is acceptable") and took it; only the M8 hero markup was redeployed to the homepage post. Operator never opened the live URL before claiming success. Live result: hero+footer only, debug WordPress nav, empty footer fields, hero not a clean clone of post 29. Lesson captured as `dont-delegate-the-test-of-unproven-work` (blub.db row 221). M9 must be redone fresh — see next session prompt.

**Critical reframe for the redo:** The end goal is the PIPELINE, not the homepage. The homepage being a perfect clone is the OUTCOME of a working pipeline. When discrepancies are found in the next session, the fix is to identify the failing pipeline component and fix it, then rerun — NEVER patch the artefact directly. Manual SQL edits to fix the WordPress nav menu, manual content fills for the footer, hand-edited block markup are all forbidden. If the pipeline cannot produce a clean clone, the pipeline is incomplete and that is what gets fixed.

**Captured:** 2026-05-09 (M7-M10 session close), reopened 2026-05-09

**Status update 2026-05-09 session:** M7 + M8 COMPLETE.
- M7: 6 sibling skills shipped via /lifecycle Mode A, all >=B grade. Skill scoreboard at evaluation-history.json. Rubric files all carry `bean_signoff: confirmed_via_m7_brief_2026-05-08`.
- M8: minimal orchestrator at plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py. Hero smoke at 100% PoC parity (50/50 attrs match manual baseline). Visual-diff report at reports/visual-diff/hero-2026-05-09.md.
- M9: deferred to next session (this entry).
- M10: handoff + narrow commit (M7/M8 artefacts only) shipped this session. Foundation commit blocked.

**What's left (M9 only):**
- Multi-section orchestrator extension to walk all 9 sections of Mama's homepage in one run (the current orchestrator is single-section)
- Live deploy OVERWRITING the sandybrown homepage (Bean instruction 2026-05-09 — deploy target is the live homepage post, not a sibling post). Snapshot existing `post_content` first for rollback. Post 29 stays preserved as manual hero PoC reference.
- Multi-frame Playwright capture at 0/200/500/1000/3000 ms across 375/768/1440 viewports
- mockup-parity-validator.js per section
- screenshot-diff-helper.js per Q1-Q4 delta flagged
- 13 remaining block visual-diff reports written to reports/visual-diff/<block>-<date>.md (button, container, data-display, icon, icon-block, icon-list, media, mega-menu, mobile-nav, notice-banner, post-grid, process-steps, trust-bar, whatsapp-cta)
- Pre-commit STOP GATE unblocks once all 14 visual-diff reports present (hero + 13 listed)
- 690-file foundation commit lands (currently uncommitted on main since 2026-05-08)
- Bucket-2 session unblocks for Tasks 10-12 dogfood loop

**Source docs (still relevant for M7-M10):**
- `.claude/handoff.md` — 2026-05-08 mega-session digest (M1-M6 completed work + framework state)
- `.claude/reports/rule-stage-coverage-audit-2026-05-07.md` — 97 rules audited; Top-5 closed in Wave 4
- `.claude/reports/fingerprint-design-review-synthesis-2026-05-07.md` — 11 review findings; critical fixes 5/5 PASS
- `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` — canonical 9-stage pipeline spec
- `.claude/specs/cloning-skill-salvage-matrix-2026-05-05.md` REVISIONS section
- `.claude/specs/pattern-dedup-classify-mechanics-2026-05-05.md` REVISIONS section

**Canonical next-session-prompt:** `.claude/next-session-prompt.md` — full M7-M10 task brief with skills/MCP/agents tables.

**Effort:** ~3 hours wall-time remaining (M7 sequential + M8/M9 main-thread + M10 close).

**Resume trigger:** when Bean has a focused window for the M7-M10 build session.

---

### P-12 — `block_compositions` table seed for existing 36 patterns

**Captured:** 2026-05-08

**What:** sgs-db `block_compositions` table is currently empty (0 rows). The schema exists; the cloning pipeline will populate it for new patterns. But the existing 36 patterns in `theme/sgs-theme/patterns/` and `plugins/sgs-blocks/patterns/` need their composition data seeded too — otherwise existing patterns are invisible to the recogniser's pattern-vs-block-composition queries.

**Method:** Walk each existing pattern .php file, parse the block markup (recursive parser per CLAUDE.md gotcha), extract block_slugs JSON list, INSERT one row per pattern.

**Effort:** ~30 min Cerebras script + my QC.

**Resume trigger:** alongside P-11 (cloning-skill build) — runs as part of Milestone 1.

---

### P-13 — Validator on uimax writes (no-licensing + Rosetta Stone discipline)

**Captured:** 2026-05-08 (audit finding from Stage +Register)

**What:** Two captured rules — `no-licensing-talk-in-sgs-cloning-context` (blub.db row 211) and `uimax-is-the-rosetta-stone-of-design` (blub.db row 213) — are embedded in skill bodies and the project CLAUDE.md, but no automated validator on uimax writes prevents reintroduction. New `/uimax-*` tools could still write rows that violate either rule.

**Spec:** Pre-write hook in each `/uimax-*` command that:
1. Greps the row payload for licensing-related keywords (`license`, `provenance_license`, `IP-firewall`) → reject + surface row 211
2. For artefact-shaped rows (patterns / components / animations / naming_conventions), validates `equivalent_implementations` is populated with at minimum `sgs_block` (or explicit `null` + gap-candidate flag) → reject otherwise + surface row 213

**Effort:** ~25 min Sonnet + my QC.

**Resume trigger:** During P-11 Milestone 6 (recognition_log + operator UI) — same surface area.

---


### P-15 — `/sgs-update` Stage 3+4 (uimax sync extension)

**Captured:** 2026-05-08

**What:** `/sgs-update` currently mirrors block.json files into sgs-db. The audit identified two missing stages:
- Stage 3 — Mirror sgs-db blocks → uimax `component_libraries` (one row per SGS block, populated as part of P-11 anyway but the auto-sync is the durable mechanism)
- Stage 4 — Scan uimax `animations.is_gap_candidate=1` rows; if an SGS block has an attribute matching the gap, surface a "gap candidate ready to close" report for operator review

**Why separate from P-11:** Bean may want this independently of the full cloning-skill build, e.g. for solving the "uimax stays stale every block change" problem before full Option A ships.

**Effort:** ~25 min Sonnet + my QC.

**Resume trigger:** Either P-11 Milestone 1 OR a smaller dedicated 30-min session if Bean wants the sync gap fixed before the full build.

---

### P-9 — Bucket 2 new blocks + timeline rework

**Captured:** 2026-05-07

**What:** Three new SGS blocks + one rework of an existing block:

| Item | Source | Effort |
|---|---|---|
| `sgs/empty-state` block | gap candidate `empty-state-float` from animation gap audit | 25-40 min |
| `sgs/toggle` block | gap candidate `toggle-slide` from animation gap audit | 40-60 min |
| `sgs/testimonial-slider` block | gap candidate `swipe-to-dismiss` from animation gap audit | 90-120 min |
| `sgs/timeline` rework | Bean 2026-05-07: "design / lack of variety / animations are pretty awful" | 60-120 min |

Total estimate: 3.5-5.5 hrs.

**Strategic dogfood opportunity:** if `/sgs-clone` is shipped + stable when this session runs, design the static layers as HTML/CSS mockups first, then run `/sgs-clone` on each as a real-world stress test. Manually layer the interactive concerns (slider gestures, toggle state) on top.

**Specialised next-session-prompt:** `.claude/next-session-prompt-bucket-2-blocks-and-timeline.md`.

**Resume trigger:** After P-11 ships.

---

### P-10 — `svg-morph` animation gap candidate (DEFERRED INDEFINITELY)

**Captured:** 2026-05-07

**Why deferred:** Requires GSAP MorphSVGPlugin — paid Club GSAP library. Misaligned with SGS open-source default.

**Resume trigger:** Only if a paid client specifically needs SVG morphing AND they're willing to fund Club GSAP licensing. Otherwise leave the uimax `animations` row flagged `is_gap_candidate=1` with a note pointing here.

**Alternative path:** Anime.js morphing helpers, custom SMIL fallbacks, hand-coded path interpolation. None match GSAP MorphSVG's polish but all are licence-free.

---

## Active items (framework / SGS surface)


### P-2 — Phase 2.5 / G2.5 deferred work

See `.claude/plans/phase-2-rubrics-universe.md` G2.5 section. Triggered by Phase 2 G2 gate close + tooling spec finalisation.

- Track 2 optimiser passes (4 skills): /extract, /harden, /ethics-gate, /interactivity-capture
- Structural debt content fixes (3 agents): design-reviewer, seo-auditor, sgs-extraction
- seo-technical content fixes (3 A-grade rubric gaps + ai-crawler-management opportunity)
- 9 deletion-bound migration notes (Phase 4 design-brain DB schema dependency)

---

### P-4 — Trustpilot 4-review scrape (Mama's Munches)

**Status:** Subagent attempt blocked by Trustpilot anti-bot. Inline Playwright not yet tried.

**Trigger to resume:** Mid-design-clone session, when the testimonials section is reached top-down.

**What:** Capture the 4 real reviews from `https://uk.trustpilot.com/review/mamasmunches.com` — quote, first name, star rating, date — into `sites/mamas-munches/research/trustpilot-reviews.json`. Then either render as static `sgs/testimonial` cards (matching mockup design) and add the free Trustpilot Mini widget for live star count, or skip and use the placeholder testimonials already in `reports/mamas-munches-page-content.html`.

**Method:** Use the inline Playwright MCP browser (already authenticated, no anti-bot has blocked us mid-session). If still blocked, fall back to manual paste from a logged-in browser tab.

**Effort:** 15-20 min once Playwright reaches the page.

---

### P-17 — Shared universal icon picker component (framework-wide upgrade)

**Captured:** 2026-05-08 (during sgs/icon-list expansion review)

**What:** Every SGS block that exposes an icon picker control hardcodes its own ~8-item dropdown. Meanwhile the framework actually supports a much richer icon universe: **Lucide (1,963 SVG icons)** + **emojis treated as icons** (uimax `icon_libraries` has 12 emoji families flagged `is_emoji=1` with full Rosetta Stone equivalents) + any **other icon sets installed** (Heroicons, Phosphor, Tabler, Font Awesome — registerable via a future `sgs_register_icon_set` hook). Operators editing `sgs/icon-list`, `sgs/icon`, `sgs/icon-block`, `sgs/info-box`, `sgs/process-steps`, `sgs/multi-button`, `sgs/whatsapp-cta`, `sgs/notice-banner`, `sgs/trust-bar`, etc. all see different tiny dropdowns and never reach any of the broader universe.

**Why this matters strategically:** every clone we do that uses an icon-rich design (services pages, feature grids, process steps, food/restaurant menus) currently risks the operator picking "the closest of 8" instead of "the right icon out of thousands". Recogniser quality also suffers — it can't propose accurate icon mappings if the editor can't render them. Branded emoji-as-marker is a real client request (food sites, lifestyle brands, kids/education sites) that SGS structurally supports today but no operator can actually reach via the UI.

**Spec — universal `<IconPicker>` component (NOT lucide-specific):**

1. **New shared component:** `plugins/sgs-blocks/src/components/IconPicker.js`
   - **Source-agnostic interface** — accepts a `value` shaped as `{ source: 'lucide' | 'emoji' | 'heroicons' | '<custom>', value: '<icon-id-or-glyph>' }` and emits the same shape via `onChange`
   - **Source switcher tabs** at top: Lucide / Emoji / [other registered sets] / Recent / Favourites
   - **Search field** (debounced ~150ms) — searches across the active source by name + tag list. Cross-source search optional (toggle: "Search all sources").
   - **Virtual-scrolling grid** (`react-window` or equivalent) — only renders visible cells. Critical for Lucide (1,963 icons) and the emoji set (~3,500 standard Unicode emojis).
   - **Category sidebar per source:**
     - Lucide: commerce / food / transport / nature / interface / arrows / weather / health / etc.
     - Emoji: smileys / animals / food / activities / travel / objects / symbols / flags
     - Other sets: whatever taxonomy the set declares
   - **Favourites** — pinned icons saved per-site in `wp_options` (max 36, mixed sources).
   - **Recently used** — last 16 used in this editor session (sessionStorage).
   - **Selected preview** at the top with the source label so operator knows what's picked.
   - **Keyboard navigation** (arrow keys + Enter) and 44×44 touch targets per WCAG.

2. **Icon-set registry** (PHP + JS):
   - PHP-side: `sgs_register_icon_set( $args )` — params: `slug`, `label`, `icons` (array of `{id, name, tags, category, svg_or_glyph}`), `kind` (`'svg'` / `'emoji'` / `'font-icon'`)
   - JS-side: `wp.hooks.applyFilters('sgs.icon-picker.sources', defaultSources)` — third-party plugins can extend
   - Built-in registrations:
     - `lucide` (kind=svg) — sourced from existing `includes/lucide-icons.php` (regenerated with tag/category metadata if missing)
     - `emoji-keycap`, `emoji-people`, `emoji-food`, etc. (12 families, kind=emoji) — sourced from uimax `icon_libraries WHERE is_emoji=1`
     - Future: heroicons / phosphor / tabler — opt-in installs

3. **Render-side handling** — the `value` shape carries `source` so the renderer knows whether to:
   - For `source: 'lucide'` → output inline SVG via `sgs_get_lucide_icon()` (existing path)
   - For `source: 'emoji'` → output the glyph directly (needs `aria-label` from the icon's name for screen readers)
   - For `source: '<custom>'` → look up the registered renderer for that set
   
   Render helper: new `sgs_render_icon( $value )` in `includes/render-helpers.php` that switches on source and returns the right HTML.

4. **Migration path** — every block currently exposing an icon-picker control:
   - `sgs/icon-list` (single icon + per-item icon + pattern entries)
   - `sgs/icon`
   - `sgs/icon-block`
   - `sgs/info-box`
   - `sgs/process-steps`
   - `sgs/multi-button` (icon-before-label / icon-after-label)
   - `sgs/whatsapp-cta` (icon override)
   - `sgs/notice-banner` (state icon)
   - `sgs/trust-bar` (per-item icon)
   - `sgs/social-icons` (already partially solves this for social platforms — keep as-is OR fold in)
   - any block that hardcodes its own icon dropdown
   
   Replace each block's bespoke dropdown with `<IconPicker value={...} onChange={...} />`. **Schema change:** existing string-typed icon attributes (e.g. `icon: 'check'`) need migration to the object shape (`{ source: 'lucide', value: 'check' }`). Each migration carries a deprecation that maps old string values to the lucide source. ~15-20 min per block including build verification + deprecation.

5. **Lucide registry expansion** — `includes/lucide-icons.php` is auto-generated. If the current file doesn't carry tag/category metadata, regenerate with metadata included. Confirm the generator script during work.

6. **Emoji registry** — already in uimax. Build a one-time importer that pulls `uimax.icon_libraries WHERE is_emoji=1` plus the standard Unicode emoji set into a JSON manifest at `includes/emoji-icons.json` for the picker to consume offline.

7. **Performance budget** — virtual-scrolling means only rendered cells eat DOM. The full Lucide SVG payload should NOT be loaded on editor mount; lazy-fetch chunks (e.g. by category) on demand. Emoji glyphs are essentially free (single Unicode characters). Render `<svg>` inline only for visible Lucide cells (~20-40 × ~1KB each = ~30KB DOM at any time).

**Effort:** ~3-4 hrs for the shared component + source-registry + emoji import + Lucide metadata regen. ~15-20 minutes per migrated block × ~10 blocks = ~3-4 hrs migration including deprecations. Total **~6-8 hrs realistic** (revised up from initial 4-6 estimate to reflect the broader scope).

**Resume trigger:** standalone session (not a blocker for any active path). Could run before bucket-2 (so the 3 new bucket-2 blocks land using IconPicker from day one) or after bucket-2 (so existing blocks get the upgrade once and bucket-2 ships without it).

**Why this slipped:** original sgs/icon-list spec asked for 8 icons; nobody widened the universe since. Caught 2026-05-08 when the icon-list expansion subagent reported "Editor icon library limited to 8 editor presets" as a known limitation. Bean immediately surfaced the broader missing-functionality (emoji-as-icons + other registered sets) — captured fully here in this revised entry.

---

### P-19 — Broader saved-defaults system audit + WP-native migration

**Captured:** 2026-05-08 (during icon-list 3-mode design review)

**What:** SGS has a saved-defaults system (`includes/class-block-defaults.php` + `withSaveAsDefault` HOC + the 2026-05-08 unified slot-aware routes added by Fixes-1+2) that lets operators save block-attribute snapshots as site-wide defaults. Bean's insight 2026-05-08: this DUPLICATES WordPress's native Site Editor → Styles → Blocks panel (`wp_global_styles` overlay on theme.json) for visual styling, and the use cases the SGS system covered are mostly handled better by WP-native mechanisms.

The icon-list refactor (2026-05-08) removes saved-defaults usage from icon-list specifically and replaces it with a sessionStorage `useLastUsedAttributes` hook + 5 block patterns. The broader system stays in place because OTHER blocks may still use `withSaveAsDefault` — auditing + migrating each is out of scope for the icon-list refactor.

**Spec:**

1. **Audit (~30 min):**
   - Grep `plugins/sgs-blocks/src/blocks/` for `withSaveAsDefault` usage — list every consumer
   - Grep for `<BlockDefaultsPanel>` direct usage — should be 0 after icon-list refactor
   - For each consumer, classify what's being saved:
     - **Visual only** (colour, typography, spacing, border) → migrate to native WP Site Editor → Styles → Blocks panel; delete saved-defaults usage
     - **Structural** (mode, type, behaviour switches) → replace with `useLastUsedAttributes` sessionStorage hook + canonical block patterns
     - **Mixed** → split: visual goes native, structural goes sessionStorage + patterns

2. **Per-block migration (~10-20 min each):** remove HOC wrap; for visual no further action; for structural, import `useLastUsedAttributes` + register 3-5 patterns; add deprecation if attribute schema changed.

3. **Once all consumers migrated:**
   - Delete `withSaveAsDefault` HOC from `extensions/block-defaults.js`
   - Delete `<BlockDefaultsPanel>` shared component
   - Delete the slot-aware REST routes (`/block-defaults/{block}?slot=...`)
   - Delete the legacy single-slot routes (`/defaults` body-param + `/defaults/{block}` orphan)
   - Drop `class-block-defaults.php` entirely (or keep as a stub for one release cycle if read-time fallback needed)

4. **Documentation:** update CLAUDE.md to capture the model — visual styling = WP Global Styles, structural starting-state = block patterns, per-operator memory = sessionStorage, per-instance customisation = inspector. Project-wide design principle so new blocks don't reintroduce parallel saved-defaults infrastructure.

**Effort:** Audit ~30 min. Per-block migration ~10-20 min × N consumers. Cleanup ~30 min. Total likely 3-6 hours depending on N.

**Resume trigger:** framework polish pass; not blocking any active work; could fold into bucket-2 or its own session.

**Why this matters:** every parallel system the framework maintains is ongoing maintenance cost. WordPress Global Styles is well-understood by operators (it's where they already go) and well-maintained by core. Centralising on it reduces SGS surface area and makes the framework feel native to WordPress rather than "yet another plugin with its own conventions."

---

---


## Resolved items (kept as one-line audit trail)

- **~~P-17 — Universal IconPicker component~~** — COMPLETED 2026-05-08. Source-agnostic `<IconPicker>` shipped (Lucide + emoji + extensible via `sgs_register_icon_set` PHP hook + `sgs.icon-picker.sources` JS filter). 9 blocks migrated via P-17b/c (icon-list, icon, icon-block, info-box, process-steps, button, whatsapp-cta, notice-banner, trust-bar). `sgs_render_icon($value)` PHP helper added.
- **~~P-18 — Nested sub-points for sgs/icon-list~~** — COMPLETED 2026-05-08. Tree-shaped items[] with recursive render, MAX_DEPTH=4, `subMode='inherit'` auto-derives sub-marker from parent (parent ordered numbers → children ordered letters). Indent/outdent buttons + Add sub-item action. v6 deprecation chain wraps existing flat data.
- **~~P-19 — Saved-defaults system audit + WP-native migration~~** — COMPLETED 2026-05-08. System fully retired (was global filter, not per-block). Deleted `extensions/block-defaults.js`, `class-block-defaults.php`, `block-defaults.php`. CLAUDE.md (project + plugin) embeds the four-channel canonical model: Visual = WP Global Styles / Structural = block patterns / Per-operator memory = sessionStorage / Per-instance = inspector. 25 new structural patterns added across 8 high-leverage blocks.

- **~~P-6 — Image controls block extension~~** — COMPLETED 2026-05-08. New extension at `plugins/sgs-blocks/src/blocks/extensions/image-controls.{js,php}` + extensions.css extension. 7 blocks opted in via `supports.sgs.imageControls: true` (decorative-image / gallery / card-grid / hero / info-box / team-member / testimonial). Webpack clean. Project CLAUDE.md updated with Image controls discipline rule.
- **~~P-8 — Reduced-motion rules audit~~** — COMPLETED 2026-05-08. 8 redundant rules removed across 4 files (1 bonus file surfaced). 1 rule kept (header-modes scroll-driven shrink animation — `animation-timeline: scroll()` ignores duration; `animation: none` is the only valid suppression).
- **~~P-14 — `block-name-search-blindspot` grep wrapper~~** — COMPLETED 2026-05-08. `scripts/sgs-block-grep.py` with TRIPLE-term search: literal heading + parenthetical-stripped form + slug-form `sgs/<derived>` (the actual hit-finder for SGS source). Three Haiku-introduced bugs fixed inline: docstring unicode-escape, brace-glob at arg level, Windows-path drive-letter parser collision. Final test: "Hero Block" → 80 hits (71 via slug); "Icon Block (single icon)" → 43 hits.
- **~~P-16 — Embed `diagnose-blub-db-locks-not-park-on-timeout` rule into `/autopilot` + `/handoff`~~** — COMPLETED 2026-05-08. Embedded in BOTH targets per parking entry intent: (a) `~/.claude/skills/autopilot/references/correction-capture.md` Failure handling — full HARD GATE diagnostic sequence + unicode-substitution fallback (row 199); (b) `~/.claude/commands/handoff.md` — Persistence-failure HARD GATE banner at top of Pre-Handoff Gates pointing back to autopilot's diagnostic sequence so /handoff Gate 4 dashboard sync calls inherit the rule.
- **~~P-1 — `/gap-analysis` SKILL.md edits~~** — COMPLETED 2026-04-30. All 4 A-grade edits landed. Skillscore held at 92%.
- **~~P-3~~** — (slot reserved, never used)
- **~~P-5 — `sgs/feature-grid` block~~** — COMPLETED 2026-05-04. Built with auto-flex / fixed-columns layout modes; ingredients pattern uses fixed-columns (4/2/1).
- **~~P-7 — sgs/icon vs sgs/icon-block duplicate cleanup~~** — COMPLETED 2026-05-04. sgs/icon canonical; icon-block hidden via `supports.inserter: false` + deprecated.js for back-compat.
- **~~Old P-9 — Recogniser-v2 generalisation beyond hero~~** — SUPERSEDED 2026-05-08 by P-11 (rule-stage coverage audit + revised Option A path). The work folds into the comprehensive cloning-skill build session.
- **~~H-1 — Hero block inspector reorganise by element~~** — RESOLVED 2026-05-05. 21 panels → 10 element-grouped panels.
- **~~H-2 — `imagePadding` vs `mediaPadding` redundancy~~** — RESOLVED 2026-05-05. Inspector labels clarified ("inner padding" vs "outer wrapper padding") with HelpText. Folded into H-1's element-grouped layout.
- **~~H-3 — Video-everywhere-image feature~~** — RESOLVED 2026-05-05. Shared `MediaPicker.js` + `sgs_render_media()` PHP helper. 9 of 11 blocks migrated; 2 NO-OP. Recipe at `tools/qc-prevention/media-slot-migration.md`.
- **~~H-4 — Brand-source pink shade vs mockup brief~~** — RESOLVED 2026-05-05. Built `scripts/brand-palette-sampler.py` (PIL k-means + ΔE 2000). Finding: `--surface-pink #F5C2C8` is designer-invented (no brand anchor); brand uses `#E68A95` primary pink + warm peach/tan family. Bean approved adding warm tones.
- **~~H-5 — Classifier human-eye gate~~** — RESOLVED 2026-05-05. `screenshot-diff-helper.js` (560 lines) + `requires_screenshot_review` flag in `mockup-parity-validator.js` + Hard Rule 10 baked into visual-qa SKILL.md.
- **~~H-6 — replaceBlock helper packaged~~** — RESOLVED 2026-05-05. `scripts/wp-update-block-attrs.js` (385 lines).
- **~~H-7 — Full-bleed pattern replacement~~** — RESOLVED 2026-05-05. Viewport-aware `var(--viewport-width, 100vw)` calc-based margins + JS measurement helper. Wave 6 deploy verified PASS.
- **~~H-8 — Hero ctaGap attribute + recogniser blind spot~~** — RESOLVED 2026-05-06. 4 attrs added (ctaGap + responsive variants). v5 deprecation. Recogniser fix folded into Section R prevention scripts.
- **~~H-9 — Background shorthand audit~~** — RESOLVED 2026-05-06. 3 of 15 matches required fixing (cta-section + post-grid). `css-pattern-audit.js` extended.
- **~~H-10 — Cascade Section R defects into prevention scripts~~** — RESOLVED 2026-05-06. Background shorthand audit, pseudo-element measurement, parent-chain filter walker — all shipped.

---

## Cross-platform emit pathway (deferred until M9 production-stable)

The Rosetta Stone discipline (Hard Rule 7) + SGS-prefixed BEM convention (Spec 13) make cross-platform output structurally feasible. The parking entries below capture the work without committing to it now. Trigger condition for ALL three: M9 production-stable + at least 3 successful clones banked + a client/market opportunity that justifies the per-platform engineering pass.

### P-CP-1 — `/sgs-emit` (cross-platform component emitter)

**What it does:** Read a `/sgs-clone` result (composition + filled slots + recognised SGS blocks) and emit equivalent component code for non-WP platforms. Targets in priority order: React (web SPA), React Native (mobile), Flutter (mobile), SwiftUI (iOS native), Web Components (framework-agnostic). Emit pathway uses `role-templates.json` direction:generate entries plus uimax `equivalent_implementations` payloads to map SGS blocks to platform-idiomatic components.

**Trigger:** Vague — client request for non-WP platform. Specific named use cases as recognition aids: Bean & Tub mobile app (RN); Indus Foods mobile reskin (RN or Flutter); any SGS Studio v2 mobile component. Soak ~3 months after M9 production-stable.

**Effort estimate:** ~8-12 hours initial scaffold + ~4-6 hours per platform target for first smoke test.

**Source materials:**
- uimax `stack_*` tables (Angular, Astro, Flutter, HTML/Tailwind, Jetpack Compose, Laravel, Next.js, Nuxt, React, React Native, shadcn, Svelte, SwiftUI, Three.js, Vue — 49–60 rows each)
- `role-templates.json` direction:generate entries (post-Phase 4)
- uimax `equivalent_implementations` payloads on every artefact (Rosetta Stone)
- Spec 13 (`.claude/specs/13-DRAFT-NAMING-CONVENTION.md`) — SGS-BEM is what makes cross-platform structural alignment feasible at all

**Dependencies:** M9 production-stable (so the clone pipeline is reliable before we extend it); ≥3 successful clones banked (test data); Phase 4 propagation complete (so `/sgs-clone` body honours Spec 13 lingua-franca rule).

### P-CP-2 — Style translation (theme.json → React/Flutter/SwiftUI styles)

**What it does:** Read `theme.json` palette + spacing + typography tokens (or uimax `design_tokens` table directly) and emit equivalent style objects for: React (CSS-in-JS objects, styled-components ThemeProvider props, Tailwind config), Flutter (`ThemeData` + per-component overrides), SwiftUI (custom modifier extensions on `View`), Web Components (CSS custom property block). Honours DTCG token format already in uimax.

**Trigger:** Vague — P-CP-1 in flight OR client request for style-only port (e.g. design system migration). Specific named: HelpingDoctors EHR app theme port from web to mobile.

**Effort estimate:** ~6-8 hours per target platform.

**Source materials:**
- uimax `design_tokens` table — 5,164 DTCG-format rows as of 2026-05-10
- Rosetta Stone payloads on token rows
- `theme.json` v3 (per-client style variations in `theme/sgs-theme/styles/`)

**Dependencies:** Not strictly required after P-CP-1 but synergistic — emit + translate ship together for full app-component parity. Deferred until M9 production-stable.

### P-CP-3 — Animation translation (uimax animations → React-spring / Flutter / SwiftUI)

**What it does:** Translate CSS keyframe animations captured in uimax `animations` table to: React-spring config (`useSpring` calls + `config` objects), Flutter `AnimationController` + `Tween` setups, SwiftUI `.animation()` and `withAnimation { }` form. Reads via `equivalent_implementations` Rosetta Stone payloads on each animation row.

**Trigger:** Vague — P-CP-1 + P-CP-2 in flight, animation-rich app port requested. Specific named: Bean & Tub mobile splash/transitions; HelpingDoctors EHR loading states.

**Effort estimate:** ~4-6 hours per platform target.

**Source materials:**
- uimax `animations` table — 63 rows (post 2026-05-10 5-column migration: `is_gap_candidate`, `gap_reason`, `sgs_block`, `sgs_animation_attribute`, `equivalent_implementations`)
- Rosetta Stone payloads on animation rows

**Dependencies:** `animations` table needs ≥30 cross-platform-mapped rows (current 63 rows, but mapping coverage to verify before emit work begins). M9 will surface more animations via `/uimax-scrape-animation` runs. Cross-link to P-CP-1 and P-CP-2.

---

## Retired (spec 14 FR18, 2026-05-11)

Navigation aid: when a future session greps for these script names, this entry points back to the decisions log.

- `heuristic-fallback-builder.py` — RETIRED. Function absorbed by Layer 2 role-templates per-attribute strategies (spec 14 FR2). See `.claude/decisions.md` 2026-05-11 entry.
- `computed-style-passport.py` — RETIRED. Replaced by Playwright runtime probe in spec 14 FR3. See `.claude/decisions.md` 2026-05-11 entry.

NOT retired (built per spec 14 — listed here so future greps don't mistakenly retire them):

- `recursion-guard.py` — built in P2 as ~50-LOC standalone module. Original "RETIRE" framing was a fabrication caught by Bean 2026-05-11; reverted to BUILD.
- `critical-fix-verification.py` — built in P10 as ~45-min lightweight acceptance harness (5 canonical-mutation-boundary checks).

## Planned blocks — design intent captured 2026-05-11

These blocks were registered in sgs-framework.db on 2026-05-08 with the wrong status (`built` instead of `planned`) and zero implementation. They are NOT ghost rows — they're future features Bean wants. Restored 2026-05-11 with `status='planned'`.

### sgs/media (planned)

Single content block for placing an image OR video with Schema.org markup and alt text.

- Supports image (Media Library + external URL) and video (local upload + embed code + external URL).
- Schema.org: emits `ImageObject` for images, `VideoObject` (with `thumbnailUrl`, `uploadDate`, `duration`, `contentUrl`) for videos.
- Alt text + caption + credit fields.
- Replaces ad-hoc `<img>` + `<video>` placement across multiple existing blocks (hero, gallery, decorative-image) — over time those would consume `sgs/media` as an inner block.

### sgs/data-display (planned, parent container)

Parent block + sub-block roster for data visualisation. Same parent/child pattern as `core/buttons` → `core/button`.

- Data source on PARENT: choose between internal source (WP custom post type, ACF repeater, REST endpoint, CSV upload) or external (URL to JSON / CSV).
- Each sub-block selects which subset of the parent's data to render + per-sub-block styling.

**Sub-block roster (to be split out):**

| Slug | Type |
|---|---|
| `sgs/data-table-basic` | Basic data table |
| `sgs/data-table-comparison` | Comparison / feature matrix |
| `sgs/data-table-pricing` | (NOTE: `sgs/pricing-table` already exists — decide if this merges or stays separate) |
| `sgs/chart-bar` | Bar chart |
| `sgs/chart-column` | Column chart |
| `sgs/chart-line` | Line chart |
| `sgs/chart-area` | Area chart |
| `sgs/chart-pie` | Pie chart |
| `sgs/chart-donut` | Donut chart |
| `sgs/chart-scatter` | Scatter plot |
| `sgs/chart-bubble` | Bubble chart |
| `sgs/chart-radar` | Radar / spider chart |
| `sgs/chart-radial-bar` | Radial bar |
| `sgs/chart-treemap` | Treemap |
| `sgs/chart-heatmap` | Heatmap |
| `sgs/chart-candlestick` | Candlestick (finance) |
| `sgs/chart-boxplot` | Box plot |
| `sgs/chart-funnel` | Funnel |
| `sgs/chart-waterfall` | Waterfall |
| `sgs/chart-gauge` | Gauge |
| `sgs/chart-sankey` | Sankey diagram |
| `sgs/chart-sparkline` | Sparkline (inline mini chart) |

Bean said "all 20+ chart types" — list above is the typical taxonomy, pruned to the most useful. Confirm before building.

**Open questions before implementation can start:**

1. **Chart library** — likely Vega-Lite (the uimax DB already has 626 Vega-Lite chart templates, which aligns with Bean's "20+ chart types" comment). Chart.js / Apache ECharts / Recharts are alternatives. Vega-Lite is the strongest pick: declarative, theme-able, accessible.
2. **Internal data sources** — preferred mechanism? Custom post type, ACF repeater, REST endpoint, or CSV upload? Probably need all four with adapters.
3. **Table vs pricing-table** — does `sgs/pricing-table` (already built) become a sub-block of `sgs/data-display`, or stay separate as a special-case block?
4. **Schema.org for charts** — emit `Dataset` markup on parent + `MeasureValue` per data point? (Important for SEO.)

These blocks remain `status='planned'` in sgs-framework.db until implementation begins. They appear in the Layer 3 catalogue with `block_json_path: null` and a `block-json-missing` gap entry — that's correct, the catalogue accurately reflects "registered but not built".

### Process correction captured

Lesson logged for autopilot/episodic memory: **Don't delete DB rows based on a "ghost row" verdict without first asking the operator.** Zero references in commits/handoffs/specs is necessary but NOT sufficient evidence — the operator may be holding the design intent in their head with no written trail yet. Future "ghost row" investigations must surface to operator with the deletion proposal before executing.

---

## 2026-05-14 parked items (Spec 16 session)

### P-S16-1: sgs/label `source: "html"` selector breadth
Source binding selector on text attr is `.wp-block-sgs-label` (the root). If save.js is ever modified to wrap content in a child element, round-trip break. Revisit when adding sgs/heading composite block (Phase 2) — same RichText shape, same potential trap.
Source: Sonnet QC 2026-05-14

### P-S16-2: `attr(data-X)` CSS responsive font-size pattern is systemic
Used in sgs/label + sgs/hero + sgs/info-box. Near-zero browser support for `attr()` outside `content:`. Switch all three to inline CSS custom properties at save time in a future cleanup pass.
Source: Sonnet QC 2026-05-14

### P-S16-3: variantStyle enum hardcoded in converter
`["standard","trial","gift"]` hardcoded in convert.py:lift_subtree_into_block_attrs. Move to live DB read via block_attributes.enum_values when wiring as Phase 3.

### P-S16-4: Pre-emit JSON serialisation validation
Source text with newlines / unescaped quotes / control chars could break the JSON serialisation in block markup. Currently no pre-emit validator. Add in Phase 3.
Source: Gemini Flash QC 2026-05-14

### P-S16-5: Nested block-roots edge case (block inside block)
sgs-product-card inside sgs-featured-product would trigger lift_subtree on the outer block but its descendant walk would consume the inner block's slots into outer attrs. Add recursion guard in Phase 3.
Source: Sonnet QC architectural review 2026-05-14

### P-S16-6: Indus Foods + helping-doctors converter validation
Spec 16 §9 item 7 (closure criterion): run converter on second client without code changes. Indus Foods and helping-doctors mockups exist but haven't been tested yet. Schedule after Mama's Phase 4 closes.

