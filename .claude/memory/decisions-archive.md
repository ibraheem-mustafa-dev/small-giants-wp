# decisions-archive.md — Archived decisions from decisions.md

Entries moved here are no longer active in the main log. They are ordered chronologically (oldest first within each session). D-numbers preserved; none reused.

---

## 2026-05-22 — Session B decisions (D21-D32 Session B)

These are the concrete shipping outcomes of the D27-D36 architecture-staging decisions. The staging decisions are the canonical record; these are the implementation detail. Compressed summaries only.

**D21(Session B) — WP style-variation overlay system retired (commit `43a93df9`).** Per-client snapshots moved to `sites/<client>/theme-snapshot.json`. Three PHP files deleted; `push-theme-snapshot.py` CLI created. `/sgs-clone` Stage 10 replaced REST POST with subprocess call to new CLI. WP theme_json filters hide Browse-styles UI. Archive: implementation detail of D28.

**D22(Session B) — Customiser migration shipped (commit `60220b13`).** Three new Customiser sections (`sgs_header` / `sgs_footer` / `sgs_site_info`). postMessage transport for colour/typography/spacing/sticky; refresh transport for conditional rules. Old admin pages preserved (not redirected). Archive: implementation detail of D35.

**D23(Session B) — Customiser paint targets: `header.wp-block-template-part` / `footer.wp-block-template-part` (commit `0ef032fe`).** Initial `.wp-site-header` / `.wp-site-footer` targeting failed — SGS template parts use `.wp-block-group` wrappers. CSS custom properties moved to `:root` for cascade availability. Archive: implementation detail of D35 (gotcha, captured in mistakes.md).

**D24(Session B) — Button-presets CSS bridge deleted (commit `60220b13`).** WP 6.9+ natively generates 100% of `--wp--custom--button-presets--*` props. `class-button-presets-admin.php` deleted. Archive: implementation detail of D30.

**D25(Session B) — View Transitions wired with WP 7.0 native + WP 6.9 inline fallback (commit `60220b13`).** `function_exists('wp_enqueue_view_transitions_admin_css')` check — calls natively on WP 7.0+, falls back to inline `@view-transition{navigation:auto;}` on WP 6.x. Archive: implementation detail of D35.

**D26(Session B) — Markup examples seeded for 73 SGS blocks (commit `d307c8b0`).** `generate-markup-examples.py` auto-generates ~56 blocks; 13 complex composites hand-authored. 69 rows in `markup_examples`. Archive: one-time seeding, not an ongoing architectural rule.

**D27(Session B) — block_supports audit found ZERO gaps; original 2:1 under-documentation prediction was wrong (commit `d307c8b0`).** Every block.json supports declaration already had a matching DB row. Archive: audit outcome, not architectural rule.

**D28(Session B) — apiVersion 3: all 69 blocks already at v3 (commit `d307c8b0`).** No bulk bump needed. 87 content-bearing attrs now carry `"role": "content"`. `wp_set_script_module_translations()` wired for 25 blocks. Archive: one-time verification outcome.

**D29(Session B) — Lucide REST migration shipped defensively (commit `d307c8b0`).** `class_exists('WP_REST_Icons_Controller')` + `function_exists('wp_register_icon_collection')` guards. `wp_register_icon_collection` does NOT exist on WP 7.0 — registration entry point unknown. `sgs_get_lucide_icon()` shim continues working. Archive: implementation detail (research pending in D34).

**D30(Session B) — Device-visibility coexistence documented (commit `d307c8b0`).** Header comment in `device-visibility.php`: WP-native preferred for simple cases; SGS extension reserved for finer-grained multi-condition controls. Archive: documentation note.

**D31(Session B) — WP 6.9.4 → 7.0 upgrade on sandybrown.** Pre-upgrade mysqldump at `~/domains/sandybrown.../sandybrown-pre-wp7.sql`. Post-upgrade API verification: key WP 7.0 functions exist. Two surprises: `wp_register_icon_collection` absent; `register_block_variation` absent. Archive: one-time ops event.

**D32(Session B) — Two-commit archive-then-delete pattern for safe class retirement.** Phase 5a Commit A moved 3 PHP picker classes to `_retired/`; Commit B (delete) deferred. Archive: process note, captured in mistakes.md.

---

## 2026-05-21 — Decision block entries archived (skill + pipeline administration)

**Decision 22(skill) — `verification-rationalisations.md` shared reference created.** Content extracted from deleted `test-driven-development` + `verification-before-completion` skills. Consumed by `/qc`, `/qc-inline`, `/qc-council`, `/verify-loop`, `/systematic-debugging`. Archive: skill administration detail.

**Decision 23(skill) — Skills only called by others get `user-invocable: false`.** Applied to `/requesting-code-review`, `/subagent-prompt`, `/deploy-check`. blub.db row 277. Archive: skill metadata captured in MEMORY.md.

**Decision 24(skill) — Deletions: source skills absorbed into successors deleted, not archived.** `/test-driven-development` + `/verification-before-completion` deleted; `/review` command stub deleted; `/deploy-check` command stub deleted. Archive: skill administration detail.

---

## 2026-05-21 — Option A cleanup sprint decisions (D10-D20)

**Decision 10 — cv2 is the ONLY converter path (commit `ee8db653`).** `--converter-v2` default flipped True. Legacy extract.py subprocess removed. Non-SGS-BEM boundaries halt with clear error. Files remain on disk (physical deletion deferred — hero.py had ~30 hero-specific lifts not yet matched). Archive: superseded — cv2 is now the only path (captured in active spec).

**Decision 11 — Stage 8 Playwright stub never silently passes (commit `ee8db653`).** Stub now returns `{diff_ratio: None, stage_8_skipped: True}` sentinel; `autonomy_decision` returns `surface-to-operator`. Archive: implementation detail, captured in cloning-pipeline-flow.md.

**Decision 12 — Four documented-but-broken gates enforced (commit `7d713ba0`).** Per-section pixel-diff CaptureContext.selector; `unresolved_slots == 0` deploy gate; `STAGE_2_CONFIDENCE_THRESHOLD = 0.7`; `require_schema=True` default. Archive: implementation detail, captured in pipeline flow.

**Decision 13 — Universal-extraction CSS D3 destination wired (commit `e60fe58e`).** `walk()` emits `attribute_gap_candidate` rows for every CSS property failing D1 AND D2. `seed_gap_context()` at startup for traceable provenance. Archive: superseded by D(spec16-2) and later walker work.

**Decision 14 — `LEGACY_ROLE_LOOKUP` migrated to DB (commit `e60fe58e`).** New `legacy_role_lookup` table in sgs-framework.db (17 entries). Idempotent `seed-legacy-role-lookup.py`. Archive: implementation detail, one-time migration complete.

**Decision 15 — `RETIRED_BLOCK_REMAP` soft-emptied (commit `e60fe58e`).** 7 Indus Files referencing `heritage-strip` migrated to use `brand`. Voter dict emptied to `{}`; consultation branch retained as no-op. Archive: migration complete.

**Decision 16 — Truth-doc layer consolidated to TWO docs (commit `13dc3161`).** `tooling-map.md` + `skills-commands-map.md` + `db-tables-map.md` absorbed into `cloning-pipeline-flow.md`. Three sibling docs replaced with ~9-line redirect stubs. Archive: doc consolidation complete.

**Decision 17 — Spec 15 absorbed into Spec 16 (inline).** Spec 15 content folded into Spec 16 §12 Appendix A. Spec 15 file retained for historical reference. Archive: superseded — canonical spec is now Spec 16.

**Decision 18 — Licensing-rule clarification (Wave 2b revert).** 16-keyword licensing reject in `uimax-write-validator.py` reverted. Bean's "no licensing" rule = don't add licensing-VALIDATION infrastructure at all; the gate was theatre. 3 regression-guard tests added. Archive: superseded by D(step5) which is the canonical record of this decision.

**Decision 19 — Universal extraction is partial-pass defining next session's work.** 4 specific root causes: RC-3 slot_synonyms DB gaps for composite slot names; RC-2 `_SUPPORTS_HANDLED_PROPS` over-exclusion; RC-1 D3 Mode 2 breakpoint coverage; RC-4 `_collect_css_decls_for_element` grouped-selector bug. Archive: diagnosis, superseded by subsequent wave work.

**Decision 20 — Gemini panels untrustworthy for this project's audits.** Every Gemini report fabricated specific line citations. Sonnet panels were grounded. Any Gemini finding must be verified by grep before treatment as fact. Archive: operational lesson, captured in mistakes.md / handoffs.

---

## 2026-05-19 — Phase 9 evidence infrastructure + brand walkdown decisions

**D1(2026-05-18) — Evidence stack triple: trace + expected-rules + split-metric coverage.** Per-section `convert-trace-<boundary>.jsonl` (14 walker_branch_taken labels) + `expected-rules-<boundary>.jsonl` + `attribute_coverage` block in diff.json. Gated behind `--debug-trace`. ~5% runtime overhead OFF in production. Archive: implementation detail captured in cloning-pipeline-flow.md.

**D2(2026-05-18) — 4-rater /qc panel with Cerebras-stall replacement protocol.** When Cerebras stalls 10+ min, kill via TaskStop + dispatch Sonnet with adversarial-lens prompt. Gate's purpose is 4 INDEPENDENT lenses, not 4 specific models. Archive: operational protocol captured in QC skill.

**D3(2026-05-18) — Suffix-anchored attribute-coverage match.** Key must `endswith(suffix)` OR `endswith(suffix + breakpoint_tail)`. SGS attr naming `<slot><Property>[Breakpoint]` — bare endswith too strict; pure substring too permissive. Archive: implementation detail.

**D4(2026-05-18) — Trace lifetime discipline: try/finally reset in `convert_section`.** `finally: v3.set_trace(None, "")` guarantees clean reset. Archive: implementation detail.

**D1(2026-05-19) — Universal core-block CSS lift via `_lift_core_block_style()`.** 26-entry data-driven `_CORE_BLOCK_STYLE_MAP`. Wired into atomic_image / atomic_heading / atomic_paragraph / atomic_text_fallback. Parked for DB migration as P-CORE-STYLE-MAP-DB-MIGRATION. Archive: implementation detail captured in cloning-pipeline-flow.md.

**D2(2026-05-19) — Tag-selector blast-radius guard.** `_lift_core_block_style` skips when node has no `sgs-` class. Emits `css_decl_skipped` trace event. Archive: implementation detail, superseded by D48/D49 walker discipline.

**D3(2026-05-19) — Shallow-merge `attrs["style"]` rather than blind assignment.** `attrs["style"] = {**attrs.get("style", {}), **style_dict}`. Archive: implementation detail.

**D4(2026-05-19) — QC panel rule extension: assert file artefact existence end-to-end.** When QC artefact is a FILE, every rater MUST include "list run-dir + assert file appears + wc -l + head -1". Function-level byte-equality insufficient. Archive: captured in mistakes.md + MEMORY.md.

**D(brand-walkdown-d1) — WP-native alignment + per-client theme.json widths (surfaced 2026-05-17).** Root cause: WP `single.html` post template constrains `.entry-content` to max-width 800px while mockup HTML has no WP wrapper. Hero-clone-poc on `page.html` template with `alignfull` class renders PERFECTLY. Decision: implement widthMode attr system. Archive: implementation shipped as D(width-system); root-cause diagnosis captured.

**D(brand-walkdown-d2) — Three new dynamic SGS blocks shipped (2026-05-17).** `sgs/media` (36 attrs), `sgs/text` (79 attrs), `sgs/quote` (92 attrs). Archive: one-time block shipping event.

**D(brand-walkdown-d3) — Converter atomic-branch SGS-class guard.** `has_sgs_class` guard at top of `_lift_core_block_style`. Also skips `.sgs-brand__body p` parent-qualified selectors (parked as P-PARENT-QUALIFIED-TAG-LIFT). Archive: implementation detail, superseded by D48/D49 walker discipline.

**D(brand-walkdown-d4) — `<tag <?php echo $wrapper_attrs;` leading-space convention.** Without literal space before `<?php echo $wrapper_attrs`, WP's block-supports filter injects style attr producing malformed `<divstyle="..."`. Pattern: `<div <?php echo $wrapper_attrs; ?>>`. Swept across 6 blocks. Archive: implementation gotcha, captured in CLAUDE.md Gotchas section.

**D(brand-walkdown-d5) — `gridTemplateColumns` attr added to sgs/container.** Asymmetric grid tracks (5fr 3fr, etc.) cannot use `columns: N` which only emits `repeat(N, 1fr)`. New attrs `gridTemplateColumns` + tablet + mobile. Archive: one-time block attr addition.

---

## 2026-05-17 — P-PHASE8-NEW-1 — Retired-block remap

**D(retired-remap-a through e) — `RETIRED_BLOCK_REMAP` mechanism for heritage-strip → brand pattern routing.** Voter-level dict maps retired SGS-BEM slug-roots → replacement pattern slug. Voter owns remap (not confidence-matrix); ALL `sgs-` classes scanned before literal-slug match; Mama's mockup source migrated to `sgs-brand*` classes; `sgs/brand` future block would require deleting the remap entry. Archive: superseded by D15 (2026-05-21 — dict soft-emptied) and D42 (hand-authored patterns deleted).

---

## 2026-05-16 — Spec 16 Phase 8 decisions (archived granular entries)

**D(phase8-a) — Walker FR1 precedence above CSS-driven container override.** Swap fixes universally — FR1 fires at every depth where BEM class resolves to registered status='built' block. Commit `a2d58a3d`. Archive: implementation detail, superseded by later walker restructure.

**D(phase8-c) — Composite-element-to-standalone fast path.** `target=sgs/container` + `bem.element` resolves to canonical slot with `standalone_block` + node has element children → emit standalone block. Universal. Archive: implementation detail captured in Spec 16.

**D(phase8-d) — Bucket router gives ACCURATE info, not approximate.** `chrome_skipped` + `cv2_handled_no_top_level_match` buckets added. `severity_totals` dashboard. Archive: implementation detail captured in leftover-bucket-router code.

**D(phase8-e) — All-blocks attribute harvest (was first-block-only).** `_harvest_all_wp_block_attrs()` walks every block comment via brace-depth scanning. Archive: implementation detail.

**D(phase8-f) — `block_attributes.role` populated via slot_synonyms.role + property-suffix-guarded backfill.** text-content count jumped 26 → 78. CRITICAL GUARD: skip rows where a property suffix was peeled. Archive: one-time DB seeding.

**D(phase8-g) — Wrong-block-type plausibility check for cv2-handled sections.** Depth-0 section-root emission checked against BEM root-class via depth-aware traversal. Archive: implementation detail.

**D(phase8-i) — Heritage-strip retired as block; replaced by `theme/sgs-theme/patterns/brand.php`.** Commit this session. Archive: superseded by D42 (2026-05-23 — pattern itself deleted as hand-authored).

**D(phase8-j) — Universal BEM-child array lifter (no per-attr-name pattern dict).** `_lift_bem_child_array(node, parent_slug, attr_name, schema)`. Zero hardcoded class names. Trust-bar items now lift 4 entries. Archive: implementation detail captured in Spec 16.

**D(phase8-k) — All cv2-emittable blocks now dynamic.** 7 static blocks converted via parallel agents (commit `9a32a164`); trust-bar + label (commit `7a2a777d`); heritage-strip retired. `block.json` versions bumped 0.1.0 → 0.2.0. Archive: superseded by D3(2026-05-19) which completed the full conversion.

**D(phase8-l) — Parallel agent dispatch validated for non-shared-file work.** 7 Haiku agents + 1 Sonnet agent, ~15 min wall-time vs ~70 min sequential. Archive: operational pattern, captured in CLAUDE.md.

---

## 2026-05-15 — Spec 16 Phase 7 closure decisions

**D(phase7-a through j) — Phase 7 ships partial; per-section pixel-diff gate; heritage-strip routing interim; extract.py legacy path; SECTION_AS_CONTAINER_OVERRIDES retired; gridTemplateColumns attr; convert_section bug fixed; secrets canonical store; leftover-buckets mandatory diagnostic; multi-model QC panel mandatory.**

All captured as blub.db rows 254-256 + MEMORY.md feedback files. Archive: superseded by subsequent phases; binding rules captured in MEMORY.md/mistakes.md.

---

## 2026-05-14 — Phase 6 v2 Step 4a through 4k (wire-in entries)

Step 4a (token_resolver), 4b (variation_router), 4c (supports_writer + inheritance transitive), 4d (modifier_extractors), 4e (stage1_boundary_hook + lingua_franca transitive), 4f (attribute-gap-writer), 4g (functionality-gap-detector), 4h (gap-review-report), 4i (3 apply modules), 4j (wp_integration), 4k (critical-fix-verification).

All 11 wire-in steps are complete. Canonical state is recorded in `cloning-pipeline-flow.md` (stage-index) and `tooling-map.md`. Individual implementation decisions per step are in git log for the 2026-05-14 session. Archive: implementation details of a completed sequential series.

**D(step4-retrospective) — 6-fix retrospective QC panel covering steps 4b-4k.** 2 ship-blockers + 4 high-severity concerns addressed in one commit. Fixes: path math for gap-review.md; theme_json staleness between sections; per_section_results schema mismatch (7-key vs 13-key); 4b silent suppression on 4a failure; cloning-pipeline-flow.md gap-list stale; truth-doc placement drift for 4i+4j. Archive: retrospective fix, details in git log.

---

## 2026-05-14 — Phase 6 v2 Step 5 and Spec 16 framing (archived details)

**D(spec16-1) — Spec 16 framed as Spec 15 §7 implementation, NOT successor.** Archive: framing decision, captured in spec headers.

**D(spec16-4 through 8) — Phase 4 baseline is WP-rendered mockup-as-post; max-iteration cap = 2; FR8 legacy extract.py retirement gate; sgs/heading composite block added to Phase 2; model-routing patterns.** Archive: planning details, all superseded by completion of Phase 6 and later work.

---

## 2026-05-13 — Spec 15 Phase 5 pre-flight; Phase 5g; Phase numbering refresh

**D(phase5-preflight) — Phase 5 reads/writes canonical sgs-framework.db exclusively; form-instance scope exclusion; non-form NULL backfill; hero baseline re-capture.** Archive: pre-flight decisions, all one-time setup.

**D(phase5g-state) — Phase 5 live E2E exposes recogniser-hallucinates-blocks bug; partial closure accepted; CSS-lift stage shipped; structural gaps 5h.4/5h.5/5h.6 named.** Archive: phase closure notes, all superseded by Phase 6+ work.

**D(phase-renumber) — Phase 7 → Phase 6 renumbering; Phase 5 closure accepted.** Archive: numbering decision, now historical.

**D(phase6-step0) — Spec 15 Phase 6 Step 0: entry-script rewire composes Phase 5 modules; +REGISTER tail wired.** Archive: wire-in detail for a completed phase.

---

## 2026-05-12 — Spec 15 Phase 1: slot vocab scoped to content-identity only

**D(phase1-slots) — Slot vocab is content-identity only; structural attrs legitimately resolve to `canonical_slot = NULL`.** NULL is valid for structural attrs; flagged as gap candidates. Archive: captured in Spec 15 §11 (absorbed into Spec 16 §12 Appendix A).

---

## 2026-05-12 — Spec 15 ratified; Spec 14 FR18 missing-recogniser-script decisions

**D(spec15-ratify) — Specs 12, 13, 14 absorbed into Spec 15; six locked decisions; verification discipline; asset inventory.** Archive: spec administration, superseded — canonical spec is now Spec 16.

**D(spec14-fr18) — Four missing recogniser scripts resolved: `heuristic-fallback-builder.py` RETIRE; `computed-style-passport.py` RETIRE; `recursion-guard.py` BUILD; `critical-fix-verification.py` BUILD.** Archive: planning decisions, all resolved and shipped.

---

## 2026-05-11 — Spec 14 additional decisions

**D(spec14-mockup-slug) — Mockup-migration pattern-slug convention: short form (Option A).** `.sgs-header__inner` not `.sgs-header-mamas-munches__inner`. Archive: captured in Spec 13 / Spec 15 §8.1.

**D(spec14-classes-patterns) — Classes map to PATTERNS not blocks (Spec 13 amendment).** Captured as `feedback_classes_map_to_patterns_not_blocks.md`. Archive: captured in MEMORY.md.

**D(phase4-propagation) — Phase 4 propagation method: hybrid inline + Python helper (Option C).** B2 shipped inline; B3-B9 via idempotent Python helper. Archive: one-time propagation complete.

**D(skill-type-rubric) — Skill-type rubric mismatch is BASELINE, not debt.** Mini-skill / command / agent files below threshold because rubric is wrong tool for file type. Archive: captured in lifecycle skill notes.

**D(phase2-db-cleanup) — No DROPs applied this pass (conservative-keep).** 8 empty tables kept pending cross-reference evidence. Archive: one-time audit outcome, all tables since either populated or explicitly resolved.

---

## 2026-05-10 — Additional archived entries

**D(phase3-css-lift-2026-05-09) — Parallel CSS-lift agents; render.php echo pattern.** Archive: implementation details of completed work.

